# Hellas-Server (Mehrspieler & Datenbank)

Cloudflare Worker mit
- **Durable Object `World`**: eine Lobby mit bis zu 10 Helden (Positionen, Chat, gemeinsame Städte, die man gründen und erobern kann)
- **Durable Object `Directory`**: Liste der aktiven Lobbys
- **Durable Object `Store`** (SQLite-Datenbank): Cloud-Spielstände und Heldenrangliste

**Live:** https://hellas-server.cedrikve.workers.dev

## Einrichten (einmalig)

Benötigt wird ein Cloudflare-API-Token mit dem Recht **Workers Scripts: Edit** (oder `npx wrangler login` im Browser).

```bash
cd server
npm install
npx wrangler deploy        # gibt die Adresse aus, z. B. https://hellas-server.NAME.workers.dev
```

Danach die Adresse in `../config.js` eintragen:

```js
window.HELLAS_SERVER = 'https://hellas-server.NAME.workers.dev';
```

## Lokal testen

```bash
npx wrangler dev
```

Dann das Spiel mit `index.html?server=http://localhost:8787` öffnen (zwei Browserfenster = zwei Spieler).

## Schnittstellen

| Pfad | Zweck |
|---|---|
| `GET /ws?room=lobby-N` | WebSocket in Lobby N (max. 10 Spieler) |
| `GET /api/lobbies` | aktive Lobbys mit Spielerzahl |
| `POST /api/save` / `GET /api/save?id=&secret=` | Cloud-Spielstand |
| `GET /api/leaderboard` | Top 10 |
