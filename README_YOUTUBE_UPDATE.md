# YouTube-Erweiterung: Michael Schacht - Topic

Der Workflow liest den YouTube-Kanal über die offizielle YouTube Data API aus und
aktualisiert `youtube.json`.

Kanal-ID:

`UCfUBvjRrSvAwanMNA5bGB8Q`

## Einmalig: YouTube API-Key

In Google Cloud eine YouTube Data API v3 API aktivieren und einen API-Key erzeugen.
Den Key danach im Repository `maloney-tracker` speichern unter:

Settings → Secrets and variables → Actions → New repository secret

Name:

`YOUTUBE_API_KEY`

Der API-Key gehört nicht in `app.js`, `youtube.json` oder das Workflow-YAML.

## Dateien hochladen

Ins Root des bestehenden `maloney-tracker`:

- `app.js` ersetzen
- `index.html` ersetzen
- `sw.js` ersetzen
- `tools/update_youtube_michael_schacht.py`
- `.github/workflows/update-youtube.yml`

`episodes.json`, `private-audio.json` und die restlichen PWA-Dateien werden nicht ersetzt.

## Workflow starten

Actions → YouTube Maloney aktualisieren → Run workflow

Der Workflow läuft außerdem montags automatisch.

## Matching

- Vollständige Videos mit passendem Titel werden bevorzugt.
- Titel wie `Ein Funken Verstand: Szene 1`, `Szene 2`, ... werden zusammen gruppiert.
- Die PWA übergibt die Szenen als YouTube-Playlist an den eingebetteten Player.
- Unsichere Treffer werden nicht still übernommen.

`youtube.json` enthält außerdem `unmatched`, damit nicht gefundene Folgen kontrolliert
werden können.
