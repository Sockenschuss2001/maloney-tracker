PHILIP MALONEY – HÖRTRACKER (PWA)

Installation auf iPhone/iPad:
1. Den gesamten Ordner auf einen Webserver mit HTTPS hochladen.
2. Die URL in Safari öffnen.
3. Teilen -> "Zum Home-Bildschirm".
4. Die App startet danach als eigenständige Web-App.

Geeignete Hosts:
- GitHub Pages
- eigener Webserver/Nginx/Apache
- Cloudflare Pages / Netlify / ähnliche statische Hosts

Wichtig:
- Der Hörfortschritt wird im LocalStorage des Browsers gespeichert.
- Über "Export" kann ein JSON-Backup erstellt und später wieder importiert werden.
- Die mitgelieferte Folgenliste ist eine Startversion und kann in app.js (SEED) erweitert werden.
- SRF-Audio wird nicht kopiert; die App öffnet nur die jeweilige offizielle SRF-Seite.
