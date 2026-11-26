# Legacy-of-Olympus-Server (Mehrspieler & Datenbank)

Cloudflare Worker mit
- **Durable Object `World`**: eine Lobby mit bis zu 30 Helden (Positionen, Chat, gemeinsame Städte, die man gründen, erobern und denen man beitreten kann)
- **Durable Object `Directory`**: Liste der aktiven Lobbys
- **Durable Object `Store`** (SQLite-Datenbank): Konten (Name + Passwort, PBKDF2-gehasht), Sitzungen, Cloud-Spielstände, Bann-Status und Rangliste

**Live:** https://hellas-server.cedrikve.workers.dev

## Einrichten (einmalig)

Benötigt wird ein Cloudflare-API-Token mit dem Recht **Workers Scripts: Edit** (oder `npx wrangler login` im Browser).

```bash
cd server
npm install
npx wrangler deploy        # gibt die Adresse aus, z. B. https://hellas-server.NAME.workers.dev
```

Admin-Konto: Der Name steht in `wrangler.toml` (`ADMIN_NAME`). Das Passwort wird **nur als SHA-256-Hash** als Secret hinterlegt und steht nirgends im Code:

```bash
printf '%s' 'DAS-ADMIN-PASSWORT' | sha256sum | cut -d' ' -f1 | tr -d '\n' | npx wrangler secret put ADMIN_PW_HASH
```

Für `wrangler dev` dieselbe Zeile als `ADMIN_PW_HASH=...` in `server/.dev.vars` (wird nicht eingecheckt).

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
| `POST /api/account` | Konto: register, login, session, logout, save |
| `POST /api/admin` | Admin: list, ban, unban (bannen wirft den Spieler sofort aus allen Lobbys) |
| `GET /api/leaderboard` | Top 10 |
