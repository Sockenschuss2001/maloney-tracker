# Philip Maloney – Hörtracker V3

GitHub-Pages-PWA mit mehreren Audioquellen und lokal gespeichertem Hörfortschritt.

## Quellen-Priorität

Die App verwendet standardmässig:

1. **SRF** – direkter HTML5-Audioplayer, solange SRF die Folge bereitstellt.
2. **Privates Audio** – eigene Audiodatei von einem separaten HTTPS-Audioserver.
3. **YouTube** – offizieller eingebetteter YouTube-Player als Fallback.

Die Reihenfolge steht in `config.js` und kann geändert werden.

## Update auf GitHub Pages

Alle Dateien dieses Pakets in den Root deines bestehenden `maloney-tracker`-Repositories hochladen und vorhandene Dateien ersetzen. Die Ordner `.github/workflows` und `tools` müssen erhalten bleiben.

Danach unter **Actions → Maloney-Folgen aktualisieren → Run workflow** einmal manuell starten. Der Workflow aktualisiert weiterhin nur `episodes.json`; deine privaten und YouTube-Zuordnungen bleiben davon unberührt.

## Private Audiodateien

**Audiodateien nicht in das öffentliche GitHub-Repository legen.** Lege sie auf einen separaten HTTPS-Server, z. B. eigenen Nginx, NAS/Reverse Proxy oder privaten Object Storage.

Die App liest `private-audio.json`. Beispiel:

```json
{
  "baseUrl": "https://audio.example.ch/maloney/",
  "entries": {
    "pm-001-beispiel": {
      "url": "https://audio.example.ch/maloney/001-beispiel.mp3",
      "label": "Privates Audio"
    }
  }
}
```

### Manifest automatisch aus einem Audio-Ordner erzeugen

Auf einem PC mit Python 3 im Repository-Ordner:

```bash
python tools/build_private_audio_manifest.py \
  --audio-dir "/pfad/zu/deinen/Maloney-Dateien" \
  --base-url "https://audio.example.ch/maloney/" \
  --episodes episodes.json \
  --output private-audio.json
```

Unter Windows z. B.:

```powershell
python tools\build_private_audio_manifest.py --audio-dir "D:\Audio\Maloney" --base-url "https://audio.example.ch/maloney/" --episodes episodes.json --output private-audio.json
```

Das Tool kopiert **keine Audiodateien**. Es erzeugt nur die Zuordnung. Es versucht zuerst eine Folgennummer im Dateinamen und danach einen konservativen Titelvergleich. Unsichere bzw. nicht zugeordnete Dateien werden im Terminal ausgegeben und sollten kontrolliert werden.

### Wichtiger Punkt bei einem privaten Audioserver

Der Browser muss die MP3/M4A-Datei direkt per HTTPS abrufen dürfen. Bei einer anderen Domain sollte der Audioserver CORS für deine GitHub-Pages-Domain erlauben. Für öffentliche URLs genügt typischerweise:

```nginx
add_header Access-Control-Allow-Origin "https://DEINNAME.github.io" always;
```

Wenn du den Audioserver mit Login schützt, ist cookie-/sessionbasierte Authentifizierung meist praktischer als ein Geheimnis in `config.js`: Alles, was im öffentlichen GitHub-Repository steht, ist öffentlich lesbar.

## YouTube

`youtube.json` enthält nur manuell geprüfte Zuordnungen. Beispiel:

```json
{
  "entries": {
    "pm-001-beispiel": {
      "videoId": "dQw4w9WgXcQ",
      "label": "YouTube"
    }
  }
}
```

Die App verwendet den offiziellen eingebetteten Player (`youtube-nocookie.com`). Sie extrahiert **keinen** Audio-Stream aus YouTube.

Für viele geprüfte Links kannst du eine CSV verwenden:

```csv
episode_id,number,youtube_url,label
,1,https://www.youtube.com/watch?v=XXXXXXXXXXX,YouTube
pm-002-...,2,https://youtu.be/YYYYYYYYYYY,Offizieller Upload
```

Dann:

```bash
python tools/import_youtube_csv.py --csv youtube.csv --episodes episodes.json --output youtube.json
```

## Hörfortschritt

Gehört-Status, Datum, Bewertung, Favoriten und Notizen liegen weiterhin nur im `localStorage` des jeweiligen Browsers. **Export** erzeugt ein Backup als JSON; **Import** stellt es wieder her.

## Dateien

- `episodes.json` – automatisch gepflegter Folgenkatalog + aktuelle SRF-Audios
- `private-audio.json` – deine privaten Audio-Zuordnungen
- `youtube.json` – geprüfte YouTube-Zuordnungen
- `config.js` – Quellenpriorität und Manifestpfade
- `tools/update_episodes.py` – Roger-Graf/SRF-Importer
- `tools/build_private_audio_manifest.py` – lokale Audiodateien zuordnen
- `tools/import_youtube_csv.py` – YouTube-CSV importieren
