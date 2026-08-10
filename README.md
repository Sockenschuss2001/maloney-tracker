# Philip Maloney – Hörtracker (PWA)

Statische GitHub-Pages-PWA mit lokalem Hörfortschritt und direktem SRF-Audio für aktuell verfügbare Folgen.

## Einmaliges Update nach dem Upload

1. Alle Dateien dieses Pakets in den Root des Repositories hochladen; die Ordner `.github/workflows` und `tools` müssen erhalten bleiben.
2. GitHub: **Actions** → **Maloney-Folgen aktualisieren** → **Run workflow**.
3. Der Workflow liest die offizielle Folgenübersicht von Roger Graf und die aktuell bei SRF verfügbaren Maloney-Episoden aus und erzeugt `episodes.json`.
4. Nach dem Commit durch den Workflow veröffentlicht GitHub Pages die aktualisierte Datei automatisch. Falls GitHub den Push des Workflows blockiert: **Settings → Actions → General → Workflow permissions → Read and write permissions** aktivieren.

Der Workflow läuft zusätzlich jeden Montagmorgen automatisch. Damit werden neue SRF-Ausstrahlungen und auslaufende/verfügbare Audio-Links nachgeführt.

## Audio

Für aktuell bei SRF verfügbare Folgen wird die öffentliche SRF-Media-Composition aufgelöst. Der Audioplayer streamt die Mediendatei direkt vom SRF-Server; im Repository werden keine Audiodateien gespeichert. Ist eine Folge nicht mehr online verfügbar, zeigt die App keinen Player und bietet stattdessen den Archiv-/SRF-Link an.

## Datenschutz / Daten

`Gehört`, Datum, Bewertung, Favorit und Notizen liegen ausschließlich im LocalStorage des verwendeten Browsers. Über **Export** kann ein JSON-Backup erstellt und mit **Import** wieder eingelesen werden.
