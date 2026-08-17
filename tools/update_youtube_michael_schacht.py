#!/usr/bin/env python3
import argparse
import json
import os
import re
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import requests

API = "https://www.googleapis.com/youtube/v3"
DEFAULT_CHANNEL = "UCfUBvjRrSvAwanMNA5bGB8Q"  # Michael Schacht - Topic

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode().lower()
    s = s.replace("&", " und ")
    s = re.sub(r"\b(philip\s+maloney|maloney|roger\s+graf|michael\s+schacht|hoerspiel|horspiel)\b", " ", s)
    s = re.sub(r"\b(vol(?:ume)?\.?\s*\d+|album)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "", s)

def scene_info(title):
    # "Ein Funken Verstand: Szene 2", "Ein Funken Verstand - Szene 2"
    m = re.match(r"^(.*?)\s*[:\-–]\s*Szene\s*(\d+)\s*$", title, re.I)
    if not m:
        return None
    return m.group(1).strip(), int(m.group(2))

def similarity(a, b):
    if not a or not b: return 0.0
    if a == b: return 1.0
    return SequenceMatcher(None, a, b).ratio()

def get_json(path, params):
    r = requests.get(API + path, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def uploads_playlist(api_key, channel_id):
    data = get_json("/channels", {
        "part":"contentDetails,snippet",
        "id":channel_id,
        "key":api_key
    })
    items = data.get("items") or []
    if not items:
        raise SystemExit("YouTube-Kanal nicht gefunden.")
    return (
        items[0]["contentDetails"]["relatedPlaylists"]["uploads"],
        items[0]["snippet"].get("title") or "Michael Schacht - Topic"
    )

def all_uploads(api_key, playlist_id):
    token = None
    videos = []
    while True:
        params = {
            "part":"snippet,contentDetails",
            "playlistId":playlist_id,
            "maxResults":50,
            "key":api_key,
        }
        if token:
            params["pageToken"] = token
        data = get_json("/playlistItems", params)
        for item in data.get("items") or []:
            sn = item.get("snippet") or {}
            cd = item.get("contentDetails") or {}
            vid = cd.get("videoId") or ((sn.get("resourceId") or {}).get("videoId"))
            title = sn.get("title")
            if vid and title and title not in ("Deleted video","Private video"):
                videos.append({
                    "videoId":vid,
                    "title":title,
                    "publishedAt":cd.get("videoPublishedAt") or sn.get("publishedAt"),
                })
        token = data.get("nextPageToken")
        if not token:
            break
    return videos

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episodes", default="episodes.json")
    ap.add_argument("--output", default="youtube.json")
    ap.add_argument("--channel-id", default=DEFAULT_CHANNEL)
    ap.add_argument("--threshold", type=float, default=0.88)
    args = ap.parse_args()

    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise SystemExit("YOUTUBE_API_KEY fehlt.")

    episodes = json.loads(Path(args.episodes).read_text(encoding="utf-8")).get("episodes", [])
    by_norm = defaultdict(list)
    for e in episodes:
        by_norm[norm(e.get("title",""))].append(e)

    upload_list, channel_title = uploads_playlist(api_key, args.channel_id)
    videos = all_uploads(api_key, upload_list)
    print(f"YouTube: {len(videos)} Uploads aus {channel_title}")

    full = defaultdict(list)
    scenes = defaultdict(list)

    for v in videos:
        title = v["title"].strip()
        si = scene_info(title)
        if si:
            base, no = si
            scenes[norm(base)].append((no, v))
        else:
            full[norm(title)].append(v)

    entries = {}
    by_number = {}
    unmatched = []

    for e in episodes:
        eid = e.get("id")
        n = e.get("number")
        key = norm(e.get("title",""))
        if not key:
            continue

        source = None

        # 1) exact normalized full-title match
        if full.get(key):
            v = full[key][0]
            source = {
                "videoId":v["videoId"],
                "label":"YouTube · Michael Schacht",
                "channel":channel_title,
                "channelId":args.channel_id,
                "kind":"full_episode",
                "matchedTitle":v["title"]
            }

        # 2) exact scene-base match -> embed playlist of scene tracks
        elif scenes.get(key):
            ordered = [v for _, v in sorted(scenes[key], key=lambda x:x[0])]
            source = {
                "videoId":ordered[0]["videoId"],
                "playlistVideoIds":[v["videoId"] for v in ordered[1:]],
                "label":"YouTube · Michael Schacht · Szenen",
                "channel":channel_title,
                "channelId":args.channel_id,
                "kind":"scenes",
                "sceneCount":len(ordered),
                "matchedTitle":ordered[0]["title"]
            }

        # 3) conservative fuzzy match against all upload titles / scene bases
        else:
            candidates = []
            for k, vs in full.items():
                score = similarity(key, k)
                if score >= args.threshold:
                    candidates.append((score, "full", k, vs))
            for k, vs in scenes.items():
                score = similarity(key, k)
                if score >= args.threshold:
                    candidates.append((score, "scenes", k, vs))
            candidates.sort(key=lambda x:x[0], reverse=True)
            if candidates and (len(candidates)==1 or candidates[0][0]-candidates[1][0] >= 0.04):
                score, kind, _, vs = candidates[0]
                if kind == "full":
                    v = vs[0]
                    source = {
                        "videoId":v["videoId"],
                        "label":"YouTube · Michael Schacht",
                        "channel":channel_title,
                        "channelId":args.channel_id,
                        "kind":"full_episode",
                        "confidence":round(score,3),
                        "matchedTitle":v["title"]
                    }
                else:
                    ordered = [v for _,v in sorted(vs,key=lambda x:x[0])]
                    source = {
                        "videoId":ordered[0]["videoId"],
                        "playlistVideoIds":[v["videoId"] for v in ordered[1:]],
                        "label":"YouTube · Michael Schacht · Szenen",
                        "channel":channel_title,
                        "channelId":args.channel_id,
                        "kind":"scenes",
                        "sceneCount":len(ordered),
                        "confidence":round(score,3),
                        "matchedTitle":ordered[0]["title"]
                    }

        if source:
            if eid: entries[eid] = source
            if n is not None: by_number[str(n)] = source
        else:
            unmatched.append({"number":n,"id":eid,"title":e.get("title")})

    payload = {
        "provider":"youtube-data-api",
        "channel":channel_title,
        "channelId":args.channel_id,
        "sourceUploadCount":len(videos),
        "matchCount":len(by_number) or len(entries),
        "entries":entries,
        "byNumber":by_number,
        "unmatched":unmatched
    }
    Path(args.output).write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"YouTube: {payload['matchCount']} Folgen zugeordnet -> {args.output}")
    print(f"Nicht zugeordnet: {len(unmatched)}")

if __name__ == "__main__":
    main()
