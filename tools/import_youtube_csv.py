#!/usr/bin/env python3
import argparse
import csv
import json
import re
from pathlib import Path


def video_id(value: str):
    value = (value or '').strip()
    if re.fullmatch(r'[A-Za-z0-9_-]{11}', value):
        return value
    for pat in (r'[?&]v=([A-Za-z0-9_-]{11})', r'youtu\.be/([A-Za-z0-9_-]{11})', r'/shorts/([A-Za-z0-9_-]{11})', r'/embed/([A-Za-z0-9_-]{11})'):
        m = re.search(pat, value)
        if m:
            return m.group(1)
    return None


def main():
    ap = argparse.ArgumentParser(description='Importiert manuell geprüfte YouTube-Zuordnungen aus CSV.')
    ap.add_argument('--csv', required=True, help='CSV mit episode_id oder number und youtube_url/video_id')
    ap.add_argument('--episodes', default='episodes.json')
    ap.add_argument('--output', default='youtube.json')
    args = ap.parse_args()

    eps = json.loads(Path(args.episodes).read_text(encoding='utf-8')).get('episodes', [])
    by_num = {str(e.get('number')): e for e in eps if e.get('number') is not None}
    valid_ids = {e.get('id') for e in eps}
    entries = {}
    with open(args.csv, newline='', encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh):
            eid = (row.get('episode_id') or '').strip()
            if not eid and (row.get('number') or '').strip() in by_num:
                eid = by_num[(row.get('number') or '').strip()]['id']
            vid = video_id(row.get('youtube_url') or row.get('video_id') or '')
            if eid not in valid_ids or not vid:
                print('Übersprungen:', row)
                continue
            entries[eid] = {'videoId': vid, 'label': (row.get('label') or 'YouTube').strip()}
    Path(args.output).write_text(json.dumps({'entries': entries}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(entries)} YouTube-Zuordnungen -> {args.output}')


if __name__ == '__main__':
    main()
