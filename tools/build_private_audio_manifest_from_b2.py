#!/usr/bin/env python3
import argparse
import json
import os
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import boto3
from botocore.config import Config

AUDIO_EXTS = {".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".flac"}

def norm(value: str) -> str:
    s = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\.[a-z0-9]{2,5}$", "", s)
    s = re.sub(r"\b(philip|maloney|folge|episode|hoerspiel|horspiel|audio)\b", " ", s)
    s = re.sub(r"\b\d{1,3}\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "", s)

def file_number(name: str):
    stem = Path(name).stem
    for pattern in (
        r"^\s*(\d{1,3})\s*(?:[-_. ]|$)",
        r"\b(?:folge|episode)[ _.-]*(\d{1,3})\b",
    ):
        m = re.search(pattern, stem, re.I)
        if m:
            return int(m.group(1))
    return None

def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()

def list_b2_objects(client, bucket: str, prefix: str):
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj.get("Key") or ""
            if not key or key.endswith("/"):
                continue
            if Path(key).suffix.lower() not in AUDIO_EXTS:
                continue
            yield {
                "key": key,
                "size": int(obj.get("Size", 0)),
                "etag": str(obj.get("ETag", "")).strip('"'),
                "lastModified": obj.get("LastModified").isoformat() if obj.get("LastModified") else None,
            }

def main():
    ap = argparse.ArgumentParser(
        description="Erzeugt private-audio.json direkt aus einem privaten Backblaze-B2-Bucket."
    )
    ap.add_argument("--episodes", default="episodes.json")
    ap.add_argument("--output", default="private-audio.json")
    ap.add_argument("--bucket", default=os.getenv("B2_BUCKET_NAME", "maloney-audio"))
    ap.add_argument("--prefix", default=os.getenv("B2_FILE_PREFIX", "maloney/"))
    ap.add_argument("--endpoint", default=os.getenv("B2_ENDPOINT"))
    ap.add_argument("--region", default=os.getenv("B2_REGION"))
    ap.add_argument("--key-id", default=os.getenv("B2_KEY_ID"))
    ap.add_argument("--application-key", default=os.getenv("B2_APPLICATION_KEY"))
    ap.add_argument("--threshold", type=float, default=0.72)
    args = ap.parse_args()

    missing = [
        name for name, value in {
            "B2_ENDPOINT": args.endpoint,
            "B2_REGION": args.region,
            "B2_KEY_ID": args.key_id,
            "B2_APPLICATION_KEY": args.application_key,
        }.items() if not value
    ]
    if missing:
        raise SystemExit("Fehlende Konfiguration: " + ", ".join(missing))

    prefix = args.prefix or ""
    if prefix and not prefix.endswith("/"):
        prefix += "/"

    episode_payload = json.loads(Path(args.episodes).read_text(encoding="utf-8"))
    episodes = episode_payload.get("episodes", [])
    by_number = {int(e["number"]): e for e in episodes if e.get("number") is not None}
    candidates = [(e, norm(e.get("title", ""))) for e in episodes]

    client = boto3.client(
        "s3",
        endpoint_url=args.endpoint,
        region_name=args.region,
        aws_access_key_id=args.key_id,
        aws_secret_access_key=args.application_key,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 5, "mode": "standard"},
        ),
    )

    objects = list(list_b2_objects(client, args.bucket, prefix))
    print(f"B2: {len(objects)} Audiodateien unter {args.bucket}/{prefix} gefunden")

    entries = {}
    by_num_out = {}
    unmatched = []
    ambiguous = []
    duplicates = []

    for obj in objects:
        key = obj["key"]
        filename = key[len(prefix):] if prefix and key.startswith(prefix) else key
        chosen = None
        confidence = 0.0
        n = file_number(filename)

        # Bevorzugt die Nummer im Dateinamen: "103 - Dunkle Geschäfte.mp3"
        if n in by_number:
            chosen = by_number[n]
            confidence = 1.0
        else:
            fn = norm(filename)
            scored = sorted(
                ((similarity(fn, en), e) for e, en in candidates),
                key=lambda x: x[0],
                reverse=True,
            )
            if scored:
                confidence, chosen = scored[0]
                if len(scored) > 1 and confidence - scored[1][0] < 0.04:
                    ambiguous.append({
                        "file": filename,
                        "best": chosen.get("title"),
                        "bestScore": round(confidence, 3),
                        "alternative": scored[1][1].get("title"),
                        "alternativeScore": round(scored[1][0], 3),
                    })

        if not chosen or confidence < args.threshold:
            unmatched.append({
                "file": filename,
                "objectKey": key,
                "score": round(confidence, 3),
                "candidate": chosen.get("title") if chosen else None,
            })
            continue

        item = {
            "objectKey": key,
            "filename": filename,
            "label": "Privates Audio",
            "confidence": round(confidence, 3),
            "size": obj["size"],
        }
        if obj["lastModified"]:
            item["lastModified"] = obj["lastModified"]

        ep_id = chosen.get("id")
        ep_num = chosen.get("number")

        # Doppelte Nummern nicht still überschreiben.
        if ep_num is not None and str(ep_num) in by_num_out:
            duplicates.append({
                "number": ep_num,
                "kept": by_num_out[str(ep_num)]["objectKey"],
                "ignored": key,
            })
            continue

        if ep_id:
            entries[ep_id] = item
        if ep_num is not None:
            by_num_out[str(ep_num)] = item

    payload = {
        "provider": "backblaze-b2-via-vercel",
        "bucket": args.bucket,
        "b2Prefix": prefix,
        "count": len(by_num_out) or len(entries),
        "sourceObjectCount": len(objects),
        "entries": entries,
        "byNumber": by_num_out,
        "unmatched": unmatched,
        "ambiguous": ambiguous,
        "duplicates": duplicates,
    }

    Path(args.output).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Manifest: {payload['count']} Folgen zugeordnet -> {args.output}")
    if unmatched:
        print(f"Nicht zugeordnet: {len(unmatched)}")
        for row in unmatched[:20]:
            print(f"  - {row['file']} ({row['score']:.2f}) -> {row['candidate'] or '-'}")
    if ambiguous:
        print(f"Unsichere Zuordnungen: {len(ambiguous)}")
    if duplicates:
        print(f"Doppelte Folgennummern: {len(duplicates)}")

if __name__ == "__main__":
    main()
