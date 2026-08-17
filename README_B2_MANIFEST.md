# B2 als Quelle für `private-audio.json`

Dieses Update ersetzt den lokalen Audio-Ordner als Quelle. Der GitHub-Workflow liest
direkt den privaten Backblaze-Bucket `maloney-audio`, Prefix `maloney/`, und erzeugt
daraus `private-audio.json`.

## Einmalige Einrichtung in GitHub

Im öffentlichen Repository `maloney-tracker`:

**Settings → Secrets and variables → Actions → New repository secret**

Zwei Secrets anlegen:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`

Dafür den bereits erstellten **Read-Only Backblaze Application Key** verwenden.

Die Secrets werden nicht in `private-audio.json` geschrieben und nicht an die PWA
ausgeliefert.

## Dateien hochladen

Audiodateien nur noch nach Backblaze hochladen, z. B.:

```text
maloney/103 - Dunkle Geschäfte.mp3
maloney/104 - Titel.mp3
...
```

Die Folgennummer am Anfang wird bevorzugt für die Zuordnung verwendet. Falls keine
Nummer vorhanden ist, versucht das Skript einen Titelvergleich.

## Workflow

Nach dem Upload:

**GitHub → maloney-tracker → Actions → Private Audios aktualisieren → Run workflow**

Zusätzlich läuft er einmal täglich automatisch.

Das Ergebnis wird als `private-audio.json` committed. Durch die Network-first-Logik
der PWA wird das neue Manifest anschließend ohne manuelles Cache-Löschen geladen.

## Nicht zugeordnete Dateien

`private-audio.json` enthält zusätzlich die Bereiche:

- `unmatched`
- `ambiguous`
- `duplicates`

Dadurch gehen problematische Dateinamen nicht still verloren.
