#!/usr/bin/env python3

import json
import re
import time
import unicodedata

from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'episodes.json'

GRAF_URL = 'https://www.rogergraf.ch/hoerspiele'
SRF_LIST = 'https://www.srf.ch/aron/api/audio/shows/A00361/latestEpisodes?page={page}'
SRF_ASSET = 'https://il.srf.ch/integrationlayer/2.0/mediaComposition/byUrn/urn:srf:audio:{asset_id}.json'

UA = 'Maloney-Hoertracker/2.0 (+GitHub Pages; personal tracker)'

S = requests.Session()
S.headers.update({'User-Agent': UA})


def norm(s):
    s = unicodedata.normalize(
        'NFKD', s or ''
    ).encode(
        'ascii', 'ignore'
    ).decode().lower()

    return re.sub(r'[^a-z0-9]+', '', s)


def slug(s):
    s = unicodedata.normalize(
        'NFKD', s
    ).encode(
        'ascii', 'ignore'
    ).decode().lower()

    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def iso_date(d):
    if not d:
        return None

    d = d.strip()

    for fmt in ('%d.%m.%Y', '%d.%m.%y', '%Y-%m-%d'):
        try:
            return datetime.strptime(d, fmt).date().isoformat()
        except ValueError:
            pass

    m = re.search(
        r'(\d{1,2})\.(\d{1,2})\.(\d{4})',
        d
    )

    if m:
        return (
            f'{int(m.group(3)):04d}-'
            f'{int(m.group(2)):02d}-'
            f'{int(m.group(1)):02d}'
        )

    return None


# ------------------------------------------------------------
# Roger-Graf-Fallback
# ------------------------------------------------------------

def load_existing_catalog():
    """
    Lädt den zuletzt erfolgreichen Roger-Graf-Katalog aus
    episodes.json.

    SRF-spezifische Einträge werden dabei nicht als Bestandteil
    des Roger-Graf-Katalogs übernommen.
    """

    if not OUT.exists():
        raise RuntimeError(
            f'Roger Graf ist nicht erreichbar und '
            f'{OUT} existiert nicht.'
        )

    print(f'Fallback: lese bestehenden Katalog aus {OUT}')

    with OUT.open('r', encoding='utf-8') as f:
        data = json.load(f)

    if isinstance(data, dict):
        old_episodes = data.get('episodes', [])
    elif isinstance(data, list):
        old_episodes = data
    else:
        old_episodes = []

    catalog = []

    for old in old_episodes:

        # Reine SRF-Zusatzeinträge werden später erneut aus SRF erzeugt.
        if str(old.get('id', '')).startswith('srf-'):
            continue

        # Nur Felder übernehmen, die zum eigentlichen
        # Roger-Graf-Katalog gehören.
        episode = {
            'title': old.get('title'),
            'firstDate': old.get('firstDate'),
            'firstYear': old.get('firstYear'),
            'archiveUrl': old.get('archiveUrl') or GRAF_URL,
            'number': old.get('number'),
            'id': old.get('id'),
        }

        if not episode['title']:
            continue

        catalog.append(episode)

    if len(catalog) < 350:
        raise RuntimeError(
            'Fallback-Katalog enthält weniger als 350 '
            f'Roger-Graf-Folgen ({len(catalog)} gefunden).'
        )

    print(
        f'Fallback erfolgreich: '
        f'{len(catalog)} Roger-Graf-Folgen geladen.'
    )

    return catalog


# ------------------------------------------------------------
# Roger-Graf-Webseite parsen
# ------------------------------------------------------------

def parse_catalog_html(html):
    soup = BeautifulSoup(html, 'html.parser')

    episodes = []
    seen = set()

    # --------------------------------------------------------
    # Preferred: structured table rows
    # --------------------------------------------------------

    for tr in soup.find_all('tr'):

        cells = tr.find_all(['td', 'th'])

        if len(cells) < 2:
            continue

        text = ' '.join(cells[0].stripped_strings)
        date_text = ' '.join(cells[-1].stripped_strings)

        m = re.search(
            r'^(.*?)\s*,?\s*(\d{1,2}\.\d{1,2}\.\d{4})\b',
            text
        )

        if m:
            title = m.group(1).strip(' ,')
            d = m.group(2)
        else:
            title = text.strip()
            d = date_text

        date = iso_date(d)

        if not title or not date or title.lower() == 'titel':
            continue

        key = (norm(title), date)

        if key in seen:
            continue

        seen.add(key)

        a = cells[0].find('a', href=True)

        detail = (
            urljoin(GRAF_URL, a['href'])
            if a
            else GRAF_URL
        )

        episodes.append({
            'title': title,
            'firstDate': date,
            'firstYear': int(date[:4]),
            'archiveUrl': detail
        })

    # --------------------------------------------------------
    # Fallback: links / text blocks
    # --------------------------------------------------------

    if len(episodes) < 350:

        episodes = []
        seen = set()

        for tag in soup.find_all(
            ['a', 'div', 'p', 'span', 'td']
        ):

            text = ' '.join(tag.stripped_strings)

            m = re.match(
                r'^(.{2,120}?),\s*'
                r'(\d{1,2}\.\d{1,2}\.\d{4})\b',
                text
            )

            if not m:
                continue

            title = m.group(1).strip()
            date = iso_date(m.group(2))

            if (
                not date
                or 'Länge:' in title
                or title.lower() == 'titel'
            ):
                continue

            key = (norm(title), date)

            if key in seen:
                continue

            seen.add(key)

            if tag.name == 'a' and tag.get('href'):
                a = tag
            else:
                a = tag.find('a', href=True)

            detail = (
                urljoin(GRAF_URL, a['href'])
                if a
                else GRAF_URL
            )

            episodes.append({
                'title': title,
                'firstDate': date,
                'firstYear': int(date[:4]),
                'archiveUrl': detail
            })

    # --------------------------------------------------------
    # Last resort: Regex über sichtbaren Text
    # --------------------------------------------------------

    if len(episodes) < 350:

        text = '\n'.join(soup.stripped_strings)

        episodes = []
        seen = set()

        pat = re.compile(
            r'(?:^|\n)'
            r'([^\n]{2,100}?),\s*'
            r'(\d{1,2}\.\d{1,2}\.\d{4})'
            r'(?:\s|\n)'
        )

        for m in pat.finditer(text):

            title = m.group(1).strip()
            date = iso_date(m.group(2))

            if (
                not date
                or any(
                    x in title
                    for x in ('Länge:', ' | ')
                )
            ):
                continue

            key = (norm(title), date)

            if key in seen:
                continue

            seen.add(key)

            episodes.append({
                'title': title,
                'firstDate': date,
                'firstYear': int(date[:4]),
                'archiveUrl': GRAF_URL
            })

    # --------------------------------------------------------
    # Nummer + ID
    # --------------------------------------------------------

    for i, e in enumerate(episodes, 1):

        e['number'] = i

        e['id'] = (
            f"pm-{i:03d}-"
            f"{slug(e['title'])[:48]}"
        )

    return episodes


def fetch_catalog():
    """
    Versucht Roger Graf dreimal abzurufen.

    Falls die Seite aus GitHub Actions nicht erreichbar ist,
    wird der zuletzt erfolgreiche Katalog aus episodes.json
    verwendet.
    """

    last_error = None

    for attempt in range(1, 4):

        try:

            print(
                f'Roger Graf: Abruf Versuch '
                f'{attempt}/3 ...'
            )

            r = S.get(
                GRAF_URL,
                timeout=(15, 45)
            )

            r.raise_for_status()

            episodes = parse_catalog_html(r.text)

            if len(episodes) < 350:
                raise RuntimeError(
                    'Roger-Graf-Seite erreichbar, aber nur '
                    f'{len(episodes)} Folgen erkannt.'
                )

            print(
                f'Roger Graf: '
                f'{len(episodes)} Folgen gefunden.'
            )

            return episodes

        except (
            requests.RequestException,
            RuntimeError
        ) as exc:

            last_error = exc

            print(
                f'WARNUNG: Roger Graf Versuch '
                f'{attempt}/3 fehlgeschlagen: {exc}'
            )

            if attempt < 3:

                wait = attempt * 10

                print(
                    f'Neuer Versuch in '
                    f'{wait} Sekunden ...'
                )

                time.sleep(wait)

    print()
    print(
        'WARNUNG: Roger Graf konnte nach '
        '3 Versuchen nicht abgerufen werden.'
    )

    print(
        f'Letzter Fehler: {last_error}'
    )

    print(
        'Der bestehende episodes.json-Katalog '
        'wird als Fallback verwendet.'
    )

    return load_existing_catalog()


# ------------------------------------------------------------
# SRF
# ------------------------------------------------------------

def find_audio(asset):

    for chapter in asset.get('chapterList') or []:

        valid_to = chapter.get('validTo')
        resources = chapter.get('resourceList') or []

        # MP3 bevorzugen
        for res in resources:

            u = res.get('url', '')

            if u.lower().split('?')[0].endswith('.mp3'):
                return u, valid_to

        # andere browserfähige Audioformate akzeptieren
        for res in resources:

            u = res.get('url', '')

            if (
                u.startswith('https://')
                and any(
                    x in u.lower()
                    for x in (
                        'audio',
                        'stream',
                        '.m4a',
                        '.aac'
                    )
                )
            ):
                return u, valid_to

    return None, None


def guess_air_date(item, asset):

    for key in (
        'publishedDate',
        'publicationDate',
        'date',
        'startDate',
        'createdAt'
    ):

        v = item.get(key)

        if isinstance(v, str):

            m = re.search(
                r'(20\d{2})-(\d{2})-(\d{2})',
                v
            )

            if m:
                return m.group(0)

    for ch in asset.get('chapterList') or []:

        for key in (
            'date',
            'start',
            'publishedDate',
            'validFrom'
        ):

            v = ch.get(key)

            if isinstance(v, str):

                m = re.search(
                    r'(20\d{2})-(\d{2})-(\d{2})',
                    v
                )

                if m:
                    return m.group(0)

    return None


def fetch_srf_current(max_pages=12):

    out = []

    for page in range(1, max_pages + 1):

        r = S.get(
            SRF_LIST.format(page=page),
            timeout=30
        )

        r.raise_for_status()

        items = r.json()

        if not items:
            break

        for item in items:

            aid = item.get('assetId')
            title = item.get('title')

            if not aid or not title:
                continue

            try:

                ar = S.get(
                    SRF_ASSET.format(asset_id=aid),
                    timeout=30
                )

                ar.raise_for_status()

                asset = ar.json()

            except Exception:
                asset = {}

            audio, valid_to = find_audio(asset)

            air = guess_air_date(
                item,
                asset
            )

            out.append({
                'title': title,
                'assetId': aid,
                'airDate': air,
                'audioUrl': audio,
                'validTo': valid_to,
                'srfUrl':
                    'https://www.srf.ch/audio/'
                    f'maloney/{slug(title)}?id={aid}'
            })

    return out


# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------

def main():

    print('=== Maloney-Katalog aktualisieren ===')
    print()

    catalog = fetch_catalog()

    print()
    print('SRF: aktuelle Folgen abrufen ...')

    current = fetch_srf_current()

    print(
        f'SRF: {len(current)} Einträge gefunden.'
    )

    by_title = {
        norm(e['title']): e
        for e in catalog
    }

    for cur in current:

        e = by_title.get(
            norm(cur['title'])
        )

        if e:

            e.update({
                k: v
                for k, v in cur.items()
                if k != 'title' and v is not None
            })

            e['audioAvailable'] = bool(
                cur.get('audioUrl')
            )

        else:

            # SRF-Folge behalten, auch wenn Schreibweise
            # vom Roger-Graf-Katalog abweicht.

            e = {
                'number': None,
                'id': 'srf-' + cur['assetId'],
                'title': cur['title'],
                'firstDate': None,
                'firstYear': None,
                'archiveUrl': GRAF_URL
            }

            e.update({
                k: v
                for k, v in cur.items()
                if k != 'title' and v is not None
            })

            e['audioAvailable'] = bool(
                cur.get('audioUrl')
            )

            catalog.insert(0, e)

    payload = {

        'generatedAt':
            datetime.now(
                timezone.utc
            ).isoformat(),

        'catalogSource':
            GRAF_URL,

        'srfSource':
            'https://www.srf.ch/audio/maloney',

        'count':
            len(catalog),

        'audioCount':
            sum(
                1
                for e in catalog
                if e.get('audioUrl')
            ),

        'episodes':
            catalog
    }

    if len(catalog) < 350:

        raise SystemExit(
            'Catalog unexpectedly returned fewer '
            'than 350 episodes; existing '
            'episodes.json remains untouched.'
        )

    OUT.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2
        ),
        encoding='utf-8'
    )

    print()
    print(
        f'Wrote {len(catalog)} episodes '
        f'({payload["audioCount"]} with audio) '
        f'to {OUT}'
    )


if __name__ == '__main__':
    main()
