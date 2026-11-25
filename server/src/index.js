// Hellas – Multiplayer- und Datenbank-Server (Cloudflare Worker)
// /ws?room=lobby-N  WebSocket in eine Lobby (max. 10 Helden, Durable Object "World")
// /api/lobbies      Liste der aktiven Lobbys
// /api/save         Cloud-Spielstand speichern (POST) / laden (GET)
// /api/leaderboard  Heldenrangliste

const MAX_PLAYERS = 10;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const ID_RE = /^[a-z0-9]{8,40}$/;
// Stadtplätze: freie Bauplätze und feindliche Poleis (müssen mit game.js übereinstimmen)
const SITES = {
  heimat: null, eleusis: null, lebadeia: null, chalkis: null,
  megara: { owner: 'npc', ownerName: 'Megarer', name: 'Megara', lvl: 2 },
  argos: { owner: 'npc', ownerName: 'Argiver', name: 'Argos', lvl: 3 },
  korinth: { owner: 'npc', ownerName: 'Korinther', name: 'Korinth', lvl: 4 },
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function cleanName(n, max = 20) { return String(n || 'Held').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max) || 'Held'; }
function scoreOf(d) {
  try {
    const p = d.p || {}, S = d.S || {};
    const towns = Object.values(S.towns || {}).filter(t => t && t.owner === 'me').reduce((a, t) => a + (t.lvl || 0), 0);
    return (S.stage || 0) * 100 + (p.relics || []).length * 150 + (p.gear || []).length * 300 + towns * 120 + (S.amph || []).length * 10 + (S.bossDead || []).length * 200 + Math.min(5000, Math.floor((p.money || 0) / 10));
  } catch { return 0; }
}
function roomName(r) { const m = /^lobby-(\d{1,3})$/.exec(r || ''); return m ? 'lobby-' + (+m[1]) : 'lobby-1'; }

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
    if (url.pathname === '/api/lobbies') {
      const r = await env.DIR.get(env.DIR.idFromName('dir')).fetch('https://dir/list');
      return json(await r.json());
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {
      let body; try { body = await req.json(); } catch { return json({ error: 'Ungültiges JSON' }, 400); }
      const { id, secret, name, data } = body || {};
      if (!ID_RE.test(id || '') || typeof secret !== 'string' || secret.length < 16 || !data) return json({ error: 'Ungültige Daten' }, 400);
      const raw = JSON.stringify(data);
      if (raw.length > 60000) return json({ error: 'Spielstand zu groß' }, 413);
      const hash = await sha256(secret);
      const row = await env.DB.prepare('SELECT secret_hash FROM saves WHERE id = ?').bind(id).first();
      if (row && row.secret_hash !== hash) return json({ error: 'Falscher Schlüssel' }, 403);
      const score = scoreOf(data);
      await env.DB.prepare('INSERT INTO saves (id, secret_hash, name, data, score, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(id) DO UPDATE SET name = ?3, data = ?4, score = ?5, updated = ?6')
        .bind(id, hash, cleanName(name), raw, score, Date.now()).run();
      return json({ ok: true, score });
    }
    if (url.pathname === '/api/save' && req.method === 'GET') {
      const id = url.searchParams.get('id') || '', secret = url.searchParams.get('secret') || '';
      if (!ID_RE.test(id)) return json({ error: 'Ungültige ID' }, 400);
      const row = await env.DB.prepare('SELECT secret_hash, name, data, score FROM saves WHERE id = ?').bind(id).first();
      if (!row) return json({ error: 'Kein Spielstand gefunden' }, 404);
      if (row.secret_hash !== await sha256(secret)) return json({ error: 'Falscher Schlüssel' }, 403);
      return json({ name: row.name, score: row.score, data: JSON.parse(row.data) });
    }
    if (url.pathname === '/api/leaderboard') {
      const { results } = await env.DB.prepare('SELECT name, score, updated FROM saves ORDER BY score DESC LIMIT 10').all();
      return json({ top: results });
    }
    if (url.pathname === '/') return json({ ok: true, game: 'Hellas – Pfad der Helden', maxPlayers: MAX_PLAYERS });
    return json({ error: 'Nicht gefunden' }, 404);
  },
};

// Verzeichnis aller Lobbys mit Spielerzahl
export class Directory {
  constructor(ctx) { this.ctx = ctx; this.rooms = null; }
  async load() { if (!this.rooms) this.rooms = (await this.ctx.storage.get('rooms')) || {}; }
  async fetch(req) {
    await this.load();
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

// Eine Lobby: verteilt Positionen und Chat, verwaltet die Städte dieser Lobby.
export class World {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.towns = null; this.room = null; }

  async loadTowns() {
    if (this.towns) return;
    this.towns = (await this.ctx.storage.get('towns')) || {};
    for (const [k, def] of Object.entries(SITES)) if (!(k in this.towns)) this.towns[k] = def ? { ...def, collected: Date.now() } : null;
  }
  async fetch(req) {
    const url = new URL(req.url);
    this.room = url.searchParams.get('room') || this.room || 'lobby-1';
    await this.ctx.storage.put('room', this.room);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    server.serializeAttachment({ id, name: null, cid: null, look: null, st: null, msgs: 0, win: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  named() { return this.ctx.getWebSockets().filter(s => { try { return !!s.deserializeAttachment().name; } catch { return false; } }); }
  others(ws) { return this.ctx.getWebSockets().filter(s => s !== ws); }
  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { } }
  broadcast(from, obj) { const m = JSON.stringify(obj); for (const s of this.others(from)) { try { s.send(m); } catch { } } }
  all(obj) { const m = JSON.stringify(obj); for (const s of this.ctx.getWebSockets()) { try { s.send(m); } catch { } } }
  async reportCount(extra = 0) {
    if (!this.room) this.room = (await this.ctx.storage.get('room')) || 'lobby-1';
    const count = Math.max(0, this.named().length + extra);
    try { await this.env.DIR.get(this.env.DIR.idFromName('dir')).fetch('https://dir/update', { method: 'POST', body: JSON.stringify({ room: this.room, count }) }); } catch { }
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment();
    const now = Date.now();
    if (now - a.win > 1000) { a.win = now; a.msgs = 0; }
    if (++a.msgs > 40) return;
    if (msg.t === 'hello') {
      if (this.named().filter(s => s !== ws).length >= MAX_PLAYERS) { this.send(ws, { t: 'full', max: MAX_PLAYERS }); try { ws.close(4000, 'full'); } catch { } return; }
      await this.loadTowns();
      a.name = cleanName(msg.name);
      a.cid = typeof msg.cid === 'string' ? msg.cid.slice(0, 40) : a.id;
      a.look = sanitizeLook(msg.look);
      ws.serializeAttachment(a);
      const players = [];
      for (const s of this.others(ws)) { const o = s.deserializeAttachment(); if (o.name) players.push({ id: o.id, name: o.name, look: o.look, st: o.st }); }
      this.send(ws, { t: 'welcome', id: a.id, room: this.room, max: MAX_PLAYERS, players, towns: this.towns });
      this.broadcast(ws, { t: 'join', id: a.id, name: a.name, look: a.look });
      await this.reportCount();
      return;
    }
    if (!a.name) return;
    if (msg.t === 'st') {
      const n = (v, lim) => (typeof v === 'number' && isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
      a.st = { x: n(msg.x, 1e4), y: n(msg.y, 1e3), z: n(msg.z, 1e4), yaw: n(msg.yaw, 10), sp: n(msg.sp, 100), m: typeof msg.m === 'string' ? msg.m.slice(0, 2) : '', atk: !!msg.atk, d: n(msg.d, 99) };
      ws.serializeAttachment(a);
      this.broadcast(ws, { t: 'st', id: a.id, ...a.st });
    } else if (msg.t === 'chat') {
      const text = String(msg.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 160);
      if (!text) return;
      this.all({ t: 'chat', id: a.id, name: a.name, text });
    } else if (msg.t === 'look') {
      a.look = sanitizeLook(msg.look); ws.serializeAttachment(a);
      this.broadcast(ws, { t: 'look', id: a.id, look: a.look });
    } else if (msg.t === 'town') {
      await this.loadTowns();
      const site = String(msg.site || '');
      if (!(site in this.towns)) return;
      const T = this.towns[site];
      let event = null;
      if (msg.action === 'found' && !T) {
        this.towns[site] = { owner: a.cid, ownerName: a.name, name: cleanName(msg.name, 24), lvl: 1, collected: now };
        event = a.name + ' hat die Stadt ' + this.towns[site].name + ' gegründet.';
      } else if (msg.action === 'upgrade' && T && T.owner === a.cid && T.lvl < 4) {
        T.lvl++; event = a.name + ' hat ' + T.name + ' auf Stufe ' + T.lvl + ' ausgebaut.';
      } else if (msg.action === 'conquer' && T && T.owner !== a.cid) {
        const prev = T.ownerName;
        T.owner = a.cid; T.ownerName = a.name; T.collected = now;
        event = '⚔ ' + a.name + ' hat ' + T.name + ' von ' + prev + ' erobert!';
      } else if (msg.action === 'collect' && T && T.owner === a.cid) {
        T.collected = now;
      } else return;
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
function sanitizeLook(l) {
  const out = {};
  if (l && typeof l === 'object') for (const k of ['tunic', 'cape', 'crest', 'armor', 'helmetCol', 'shieldEmblem']) { const v = l[k]; if (typeof v === 'number' && v >= 0 && v <= 0xffffff) out[k] = v; }
  if (l && typeof l.weapon === 'string') out.weapon = ['sword', 'fireSword', 'trident'].includes(l.weapon) ? l.weapon : 'sword';
  return out;
}
