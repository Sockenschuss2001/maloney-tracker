#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

AUDIO_EXTS = {'.mp3', '.m4a', '.aac', '.ogg', '.opus', '.wav', '.flac'}

def norm(value: str) -> str:
    s = unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\.[a-z0-9]{2,5}$', '', s)
    s = re.sub(r'\b(philip|maloney|folge|episode|hoerspiel|horspiel|audio)\b', ' ', s)
    s = re.sub(r'\b\d{1,3}\b', ' ', s)
    return re.sub(r'[^a-z0-9]+', '', s)

def file_number(name: str):
    stem = Path(name).stem
    for pattern in (r'^\s*(\d{1,3})\b', r'\b(?:folge|episode)[ _.-]*(\d{1,3})\b'):
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

def main():
    ap = argparse.ArgumentParser(description='Erzeugt private-audio.json für Backblaze B2.')
    ap.add_argument('--audio-dir', required=True)
    ap.add_argument('--episodes', default='episodes.json')
    ap.add_argument('--output', default='private-audio.json')
    ap.add_argument('--b2-prefix', default='maloney/')
    ap.add_argument('--threshold', type=float, default=0.72)
    args = ap.parse_args()

    prefix = args.b2_prefix.strip('/')
    if prefix:
        prefix += '/'

    audio_dir = Path(args.audio_dir)
    episodes = json.loads(Path(args.episodes).read_text(encoding='utf-8')).get('episodes', [])
    by_number = {int(e['number']): e for e in episodes if e.get('number') is not None}
    candidates = [(e, norm(e.get('title', ''))) for e in episodes]

    entries = {}
    by_num_out = {}
    unmatched = []
    ambiguous = []

    for f in sorted(audio_dir.rglob('*')):
        if not f.is_file() or f.suffix.lower() not in AUDIO_EXTS:
            continue

        chosen = None
        confidence = 0.0
        n = file_number(f.name)

        if n in by_number:
            chosen = by_number[n]
            confidence = 1.0
        else:
            fn = norm(f.name)
            scored = sorted(
                ((similarity(fn, en), e) for e, en in candidates),
                key=lambda x: x[0],
                reverse=True
            )
            if scored:
                confidence, chosen = scored[0]
                if len(scored) > 1 and confidence - scored[1][0] < 0.04:
                    ambiguous.append(
                        (f.name, chosen.get('title'), confidence,
                         scored[1][1].get('title'), scored[1][0])
                    )

        if not chosen or confidence < args.threshold:
            unmatched.append((f.name, confidence, chosen.get('title') if chosen else ''))
            continue

        rel = f.relative_to(audio_dir).as_posix()
        item = {
            'objectKey': prefix + rel,
            'filename': rel,
            'label': 'Privates Audio',
            'confidence': round(confidence, 3)
        }

        if chosen.get('id'):
            entries[chosen['id']] = item
        if chosen.get('number') is not None:
            by_num_out[str(chosen['number'])] = item

    payload = {
        'provider': 'backblaze-b2-via-vercel',
        'b2Prefix': prefix,
        'entries': entries,
        'byNumber': by_num_out
    }
    Path(args.output).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    print(f'{len(by_num_out) or len(entries)} Audiodateien zugeordnet -> {args.output}')
    if unmatched:
        print(f'Nicht zugeordnet: {len(unmatched)}')
        for name, score, title in unmatched[:30]:
            print(f'  - {name} ({score:.2f}) {title}')
    if ambiguous:
        print(f'Unsichere Zuordnungen: {len(ambiguous)}')
        for row in ambiguous[:20]:
            print(f'  - {row[0]} -> {row[1]} ({row[2]:.2f}), Alternative: {row[3]} ({row[4]:.2f})')

if __name__ == '__main__':
    main()
