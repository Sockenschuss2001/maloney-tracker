# Maloney Tracker V6 – Backblaze + Vercel Integration

Dieses Paket ist ein **Update** für dein bestehendes `maloney-tracker`-Repository.
`episodes.json` ist absichtlich NICHT enthalten, damit deine 407 Folgen nicht überschrieben werden.

## Upload nach GitHub

Diese Dateien/Ordner ins Root von `maloney-tracker` hochladen und vorhandene Dateien ersetzen:

- `index.html`
- `app.js`
- `config.js`
- `styles.css`
- `sw.js`
- `private-audio.json`
- `tools/build_private_audio_manifest.py`

Danach GitHub Pages den neuen Stand deployen lassen.

## Bereits eingetragen

Das getestete Gateway ist bereits gesetzt:

`https://maloney-audio-gateway.vercel.app`

Die erste private Datei ist ebenfalls eingetragen:

- Folge 103
- `maloney/103 - Dunkle Geschäfte.mp3`

## Verhalten

Quellen-Priorität:
1. SRF
2. Privates Backblaze-B2-Audio
3. YouTube

Beim ersten privaten Audiozugriff fragt die PWA nach `AUDIO_PASSWORD`.
Das Passwort wird nur im `sessionStorage` der aktuellen Browser-/PWA-Sitzung gespeichert.
Die B2-Zugangsdaten befinden sich weiterhin ausschließlich bei Vercel.

## Weitere MP3s

Wenn deine lokalen MP3-Dateien nach dem Schema `103 - Titel.mp3` usw. benannt sind:

```powershell
python tools\build_private_audio_manifest.py `
  --audio-dir "D:\Audio\Maloney" `
  --episodes episodes.json `
  --output private-audio.json `
  --b2-prefix "maloney/"
```

Danach `private-audio.json` erneut nach GitHub committen.

Wichtig: Die Objekt-Keys in B2 müssen denselben relativen Dateinamen besitzen wie die lokalen Dateien.
