// Hellas – Multiplayer- und Datenbank-Server (Cloudflare Worker)
// POST /api/account   Konto: register | login | session | logout | save
// POST /api/admin     Admin: list | ban | unban | promote
// GET  /api/leaderboard, /api/lobbies
// GET  /ws?room=lobby-N  WebSocket in eine Lobby (max. 30 Helden)

const MAX_PLAYERS = 30;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß_\-]{3,20}$/;
const SITES = {
  heimat: null, eleusis: null, lebadeia: null, chalkis: null,
  megara: { owner: 'npc', ownerName: 'Megarer', name: 'Megara', lvl: 2 },
  argos: { owner: 'npc', ownerName: 'Argiver', name: 'Argos', lvl: 3 },
  korinth: { owner: 'npc', ownerName: 'Korinther', name: 'Korinth', lvl: 4 },
};
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
async function sha256(text) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }
async function pwHash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 4000 }, key, 256));
}
function cleanName(n, max = 20) { return String(n || 'Held').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max) || 'Held'; }
function scoreOf(d) {
  try {
    const p = d.p || {}, S = d.S || {};
    const towns = Object.values(S.towns || {}).filter(t => t && t.owner === 'me').reduce((a, t) => a + (t.lvl || 0), 0);
    return (S.stage || 0) * 100 + (p.relics || []).length * 150 + (p.gear || []).length * 300 + towns * 120 + (S.amph || []).length * 10 + (S.bossDead || []).length * 200 + (S.quiz || []).length * 40 + Math.min(5000, Math.floor((p.money || 0) / 10));
  } catch { return 0; }
}
function roomName(r) { const m = /^lobby-(\d{1,3})$/.exec(r || ''); return m ? 'lobby-' + (+m[1]) : 'lobby-1'; }
const store = (env, body) => env.STORE.get(env.STORE.idFromName('store')).fetch('https://store/', { method: 'POST', body: JSON.stringify(body) });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'WebSocket erwartet' }, 426);
      const room = roomName(url.searchParams.get('room'));
      const u = new URL(req.url); u.searchParams.set('room', room);
      return env.WORLD.get(env.WORLD.idFromName(room)).fetch(new Request(u.toString(), req));
    }
    if (url.pathname === '/api/lobbies') return json(await (await env.DIR.get(env.DIR.idFromName('dir')).fetch('https://dir/list')).json());
    if (url.pathname === '/api/leaderboard') { const r = await store(env, { op: 'top' }); return json(await r.json(), r.status); }
    if ((url.pathname === '/api/account' || url.pathname === '/api/admin') && req.method === 'POST') {
      let body; try { body = await req.json(); } catch { return json({ error: 'Ungültige Anfrage' }, 400); }
      if (url.pathname === '/api/admin') body.op = 'admin_' + String(body.op || '');
      const r = await store(env, body);
      const res = await r.json();
      if (res.kick) {
        const { lobbies } = await (await env.DIR.get(env.DIR.idFromName('dir')).fetch('https://dir/list')).json();
        await Promise.all(lobbies.map(l => env.WORLD.get(env.WORLD.idFromName(l.room)).fetch('https://world/kick', { method: 'POST', body: JSON.stringify({ name_lc: res.kick }) }).catch(() => { })));
        delete res.kick;
      }
      return json(res, r.status);
    }
    if (url.pathname === '/') return json({ ok: true, game: 'Hellas – Pfad der Helden', maxPlayers: MAX_PLAYERS });
    return json({ error: 'Nicht gefunden' }, 404);
  },
};

// Datenbank: Konten, Sitzungen, Spielstände (SQLite im Durable Object)
export class Store {
  constructor(ctx, env) {
    this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS accounts (name_lc TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, banned INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, data TEXT, score INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, name_lc TEXT NOT NULL, created INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS acc_score ON accounts (score DESC)');
  }
  isAdminLogin(name_lc, pw) { return this.env.ADMIN_NAME && this.env.ADMIN_PW_HASH && name_lc === String(this.env.ADMIN_NAME).toLowerCase() ? sha256(pw).then(h => h === this.env.ADMIN_PW_HASH) : Promise.resolve(false); }
  acc(name_lc) { return this.sql.exec('SELECT * FROM accounts WHERE name_lc = ?', name_lc).toArray()[0]; }
  bySession(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    const s = this.sql.exec('SELECT name_lc, created FROM sessions WHERE token = ?', token).toArray()[0];
    if (!s || Date.now() - s.created > 30 * 86400000) return null;
    const a = this.acc(s.name_lc);
    return a && !a.banned ? a : null;
  }
  newSession(name_lc) { const token = randHex(24); this.sql.exec('INSERT INTO sessions (token, name_lc, created) VALUES (?, ?, ?)', token, name_lc, Date.now()); return token; }
  async fetch(req) {
    const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
    const b = await req.json();
    const pubAcc = (a, token) => ({ name: a.name, admin: !!a.admin, token, data: a.data ? JSON.parse(a.data) : null });
    switch (b.op) {
      case 'top': return out({ top: this.sql.exec('SELECT name, score, updated FROM accounts WHERE banned = 0 AND data IS NOT NULL ORDER BY score DESC LIMIT 10').toArray() });
      case 'register': {
        const name = String(b.name || '').trim(), pw = String(b.password || '');
        if (!NAME_RE.test(name)) return out({ error: 'Name: 3–20 Zeichen (Buchstaben, Zahlen, _ und -)' }, 400);
        if (pw.length < 4 || pw.length > 100) return out({ error: 'Passwort: mindestens 4 Zeichen' }, 400);
        const lc = name.toLowerCase();
        if (this.acc(lc)) return out({ error: 'Dieser Name ist schon vergeben' }, 409);
        const isAdmin = await this.isAdminLogin(lc, pw);
        if (this.env.ADMIN_NAME && lc === String(this.env.ADMIN_NAME).toLowerCase() && !isAdmin) return out({ error: 'Dieser Name ist reserviert' }, 403);
        const salt = randHex(12), hash = await pwHash(pw, salt);
        this.sql.exec('INSERT INTO accounts (name_lc, name, salt, hash, admin, created) VALUES (?, ?, ?, ?, ?, ?)', lc, name, salt, hash, isAdmin ? 1 : 0, Date.now());
        return out(pubAcc(this.acc(lc), this.newSession(lc)));
      }
      case 'login': {
        const lc = String(b.name || '').trim().toLowerCase(), pw = String(b.password || '');
        const a = this.acc(lc);
        if (!a || (await pwHash(pw, a.salt)) !== a.hash) return out({ error: 'Name oder Passwort falsch' }, 403);
        if (a.banned) return out({ error: 'Dieses Konto wurde gebannt', banned: true }, 403);
        if (!a.admin && await this.isAdminLogin(lc, pw)) this.sql.exec('UPDATE accounts SET admin = 1 WHERE name_lc = ?', lc);
        return out(pubAcc(this.acc(lc), this.newSession(lc)));
      }
      case 'session': {
        const a = this.bySession(b.token);
        if (!a) return out({ error: 'Sitzung abgelaufen – bitte neu anmelden' }, 403);
        return out(Object.assign(pubAcc(a, b.token), { name_lc: a.name_lc }));
      }
      case 'logout': this.sql.exec('DELETE FROM sessions WHERE token = ?', String(b.token || '')); return out({ ok: true });
      case 'save': {
        const a = this.bySession(b.token);
        if (!a) return out({ error: 'Nicht angemeldet' }, 403);
        const raw = JSON.stringify(b.data || null);
        if (raw.length > 80000) return out({ error: 'Spielstand zu groß' }, 413);
        this.sql.exec('UPDATE accounts SET data = ?, score = ?, updated = ? WHERE name_lc = ?', raw, scoreOf(b.data || {}), Date.now(), a.name_lc);
        return out({ ok: true });
      }
      case 'admin_list': case 'admin_ban': case 'admin_unban': case 'admin_promote': {
        const me = this.bySession(b.token);
        if (!me || !me.admin) return out({ error: 'Nur für Admins' }, 403);
        if (b.op === 'admin_list') return out({ accounts: this.sql.exec('SELECT name, admin, banned, updated, created FROM accounts ORDER BY (updated > created) DESC, updated DESC, created DESC LIMIT 300').toArray() });
        const lc = String(b.name || '').trim().toLowerCase();
        const t = this.acc(lc);
        if (!t) return out({ error: 'Spieler nicht gefunden' }, 404);
        if (b.op === 'admin_promote') { this.sql.exec('UPDATE accounts SET admin = 1, banned = 0 WHERE name_lc = ?', lc); return out({ ok: true, name: t.name, admin: true }); }
        if (t.admin) return out({ error: 'Admins können nicht gebannt werden' }, 403);
        const ban = b.op === 'admin_ban';
        this.sql.exec('UPDATE accounts SET banned = ? WHERE name_lc = ?', ban ? 1 : 0, lc);
        if (ban) this.sql.exec('DELETE FROM sessions WHERE name_lc = ?', lc);
        return out({ ok: true, name: t.name, banned: ban, kick: ban ? lc : undefined });
      }
    }
    return out({ error: 'Unbekannte Aktion' }, 400);
  }
}

// Verzeichnis aller Lobbys mit Spielerzahl
export class Directory {
  constructor(ctx) { this.ctx = ctx; this.rooms = null; }
  async fetch(req) {
    if (!this.rooms) this.rooms = (await this.ctx.storage.get('rooms')) || {};
    const url = new URL(req.url);
    if (url.pathname === '/update') {
      const { room, count } = await req.json();
      if (count > 0) this.rooms[room] = { count, t: Date.now() }; else delete this.rooms[room];
      await this.ctx.storage.put('rooms', this.rooms);
      return new Response('ok');
    }
    const now = Date.now();
    const list = Object.entries(this.rooms).filter(([, v]) => now - v.t < 30 * 60 * 1000).map(([room, v]) => ({ room, count: v.count, max: MAX_PLAYERS }))
      .sort((a, b) => +a.room.split('-')[1] - +b.room.split('-')[1]);
    return new Response(JSON.stringify({ lobbies: list, max: MAX_PLAYERS }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// Eine Lobby: Positionen, Chat und die Städte dieser Lobby.
export class World {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.towns = null; this.room = null; }
  async loadTowns() {
    if (this.towns) return;
    this.towns = (await this.ctx.storage.get('towns')) || {};
    for (const [k, def] of Object.entries(SITES)) if (!(k in this.towns)) this.towns[k] = def ? { ...def, collected: Date.now() } : null;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/kick') {
      const { name_lc } = await req.json();
      for (const s of this.ctx.getWebSockets()) { let a; try { a = s.deserializeAttachment(); } catch { continue; } if (a && a.name_lc === name_lc) { this.send(s, { t: 'banned' }); await this.leave(s); } }
      return new Response('ok');
    }
    this.room = url.searchParams.get('room') || this.room || 'lobby-1';
    await this.ctx.storage.put('room', this.room);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: null, msgs: 0, win: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }
  named() { return this.ctx.getWebSockets().filter(s => { try { return !!s.deserializeAttachment().name; } catch { return false; } }); }
  others(ws) { return this.ctx.getWebSockets().filter(s => s !== ws); }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { } }
  broadcast(from, obj) { const m = JSON.stringify(obj); for (const s of this.others(from)) { try { s.send(m); } catch { } } }
  all(obj) { const m = JSON.stringify(obj); for (const s of this.ctx.getWebSockets()) { try { s.send(m); } catch { } } }
  async reportCount() {
    if (!this.room) this.room = (await this.ctx.storage.get('room')) || 'lobby-1';
    try { await this.env.DIR.get(this.env.DIR.idFromName('dir')).fetch('https://dir/update', { method: 'POST', body: JSON.stringify({ room: this.room, count: this.named().length }) }); } catch { }
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment();
    const now = Date.now();
    if (now - a.win > 1000) { a.win = now; a.msgs = 0; }
    if (++a.msgs > 40) return;
    if (msg.t === 'hello') {
      const r = await store(this.env, { op: 'session', token: msg.token });
      const acc = await r.json();
      if (!r.ok) { this.send(ws, { t: 'denied', reason: acc.error || 'Nicht angemeldet' }); try { ws.close(4001, 'denied'); } catch { } return; }
      for (const s of this.named()) { if (s === ws) continue; const o = s.deserializeAttachment(); if (o.name_lc === acc.name_lc) { this.send(s, { t: 'denied', reason: 'Du hast dich an einem anderen Ort angemeldet.' }); await this.leave(s); } }
      if (this.named().filter(s => s !== ws).length >= MAX_PLAYERS) { this.send(ws, { t: 'full', max: MAX_PLAYERS }); try { ws.close(4000, 'full'); } catch { } return; }
      await this.loadTowns();
      a.name = acc.name; a.name_lc = acc.name_lc; a.cid = 'acc:' + acc.name_lc; a.admin = acc.admin;
      a.look = sanitizeLook(msg.look);
      ws.serializeAttachment(a);
      const players = [];
      for (const s of this.others(ws)) { const o = s.deserializeAttachment(); if (o.name) players.push({ id: o.id, name: o.name, look: o.look, st: o.st, admin: o.admin }); }
      this.send(ws, { t: 'welcome', id: a.id, room: this.room, max: MAX_PLAYERS, players, towns: this.towns });
      this.broadcast(ws, { t: 'join', id: a.id, name: a.name, look: a.look, admin: a.admin });
      await this.reportCount();
      return;
    }
    if (!a.name) return;
    if (msg.t === 'st') {
      const n = (v, lim) => (typeof v === 'number' && isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
      a.st = { x: n(msg.x, 1e4), y: n(msg.y, 1e4), z: n(msg.z, 1e4), yaw: n(msg.yaw, 10), sp: n(msg.sp, 100), m: typeof msg.m === 'string' ? msg.m.slice(0, 2) : '', atk: !!msg.atk, d: n(msg.d, 99) };
      ws.serializeAttachment(a);
      this.broadcast(ws, { t: 'st', id: a.id, ...a.st });
    } else if (msg.t === 'chat') {
      const text = String(msg.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 160);
      if (text) this.all({ t: 'chat', id: a.id, name: a.name, text, admin: a.admin });
    } else if (msg.t === 'look') {
      a.look = sanitizeLook(msg.look); ws.serializeAttachment(a);
      this.broadcast(ws, { t: 'look', id: a.id, look: a.look });
    } else if (msg.t === 'town') {
      await this.loadTowns();
      const site = String(msg.site || '');
      if (!(site in this.towns)) return;
      const T = this.towns[site];
      let event = null;
      if (msg.action === 'found' && !T) { this.towns[site] = { owner: a.cid, ownerName: a.name, name: cleanName(msg.name, 24), lvl: 1, def: 0, collected: now }; event = a.name + ' hat die Stadt ' + this.towns[site].name + ' gegründet.'; }
      else if (msg.action === 'upgrade' && T && (T.owner === a.cid || isMember(T, a.cid)) && T.lvl < 4) { T.lvl++; event = a.name + ' hat ' + T.name + ' auf Stufe ' + T.lvl + ' ausgebaut.'; }
      else if (msg.action === 'train' && T && (T.owner === a.cid || isMember(T, a.cid)) && (T.def || 0) < 10) { T.def = Math.min(10, (T.def || 0) + 2); }
      else if (msg.action === 'conquer' && T && T.owner !== a.cid && !isMember(T, a.cid)) { const prev = T.ownerName; T.owner = a.cid; T.ownerName = a.name; T.collected = now; T.def = 0; T.members = []; event = '⚔ ' + a.name + ' hat ' + T.name + ' von ' + prev + ' erobert!'; }
      else if (msg.action === 'join' && T && T.owner !== a.cid && !isMember(T, a.cid) && (T.members || []).length < 30) { T.members = (T.members || []).concat([{ cid: a.cid, name: a.name }]); event = a.name + ' ist jetzt Bürger von ' + T.name + '.'; }
      else if (msg.action === 'leave' && T && isMember(T, a.cid)) { T.members = T.members.filter(m => m.cid !== a.cid); event = a.name + ' hat ' + T.name + ' verlassen.'; }
      else if (msg.action === 'kick' && T && T.owner === a.cid && isMember(T, String(msg.member || ''))) { const m = T.members.find(m => m.cid === msg.member); T.members = T.members.filter(x => x.cid !== msg.member); event = m.name + ' wurde aus ' + T.name + ' verbannt.'; }
      else if (msg.action === 'collect' && T && T.owner === a.cid) { T.collected = now; }
      else return;
      await this.ctx.storage.put('towns', this.towns);
      this.all({ t: 'towns', towns: this.towns, event, site, by: a.id });
    }
  }
  async webSocketClose(ws) { await this.leave(ws); }
  async webSocketError(ws) { await this.leave(ws); }
  async leave(ws) {
    let a = null; try { a = ws.deserializeAttachment(); } catch { }
    if (a && a.name) { a.name = null; try { ws.serializeAttachment(a); } catch { } this.broadcast(ws, { t: 'leave', id: a.id }); }
    try { ws.close(); } catch { }
    await this.reportCount();
  }
}
function isMember(T, cid) { return !!T && (T.members || []).some(m => m.cid === cid); }
function sanitizeLook(l) {
  const out = {};
  if (l && typeof l === 'object') for (const k of ['tunic', 'cape', 'crest', 'armor', 'helmetCol', 'shieldEmblem']) { const v = l[k]; if (typeof v === 'number' && v >= 0 && v <= 0xffffff) out[k] = v; }
  if (l && typeof l.weapon === 'string') out.weapon = ['sword', 'fireSword', 'trident'].includes(l.weapon) ? l.weapon : 'sword';
  return out;
}
