# Philip Maloney – Hörtracker (PWA)

Diese Dateien sind für **GitHub Pages** vorbereitet. Die App läuft vollständig statisch und speichert Hörstatus, Datum, Bewertung, Favoriten und Notizen lokal im Browser des Geräts.

## GitHub Pages veröffentlichen

1. Auf GitHub ein neues Repository anlegen, z. B. `maloney-tracker`.
2. **Den Inhalt dieses Ordners** in die oberste Ebene des Repositorys hochladen – also `index.html`, `app.js`, `styles.css` usw. direkt ins Repository, nicht den übergeordneten ZIP-Ordner.
3. Auf GitHub im Repository **Settings → Pages** öffnen.
4. Unter **Build and deployment** als Source **Deploy from a branch** wählen.
5. Branch **main** und Ordner **/(root)** wählen und speichern.
6. GitHub zeigt danach die Pages-Adresse an, typischerweise `https://DEINNAME.github.io/maloney-tracker/`.
7. Die Adresse auf dem iPhone in **Safari** öffnen.
8. Teilen → **Zum Home-Bildschirm** → Hinzufügen.

## Aktualisieren

Wenn Dateien im Repository ersetzt werden, aktualisiert der Service Worker den App-Cache. Bei bereits installierter App ggf. einmal komplett schließen und erneut öffnen.

## Daten / Backup

Der Hörfortschritt wird in `localStorage` gespeichert und bleibt auf dem jeweiligen Browser/Gerät. Mit **Export** wird eine JSON-Backup-Datei erzeugt; über **Import** kann sie wieder eingelesen werden.

## Wichtig

Die aktuell enthaltene Folgenliste ist die bisherige Startliste. Neue oder weitere Folgen können später in `app.js` im Array `SEED` ergänzt werden.
