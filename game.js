/* Legacy of Olympus
 * Ein Open-World-Spiel im antiken Griechenland. Three.js (r160), alles prozedural.
 */
'use strict';
(() => {
const V3 = THREE.Vector3;
const $ = (id) => document.getElementById(id);

// ============================================================
// Hilfsfunktionen, Zufall, Rauschen
// ============================================================
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = mulberry32(20260425);
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); f *= 2; a *= 0.5; } return s; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }

// ============================================================
// Welt-Definition
// ============================================================
// Echte Geografie: Längen-/Breitengrad -> Welt (Athen = Ursprung, 1 Einheit ≈ 300 m)
const WORLD = 2800, SEG = 440, CELL = WORLD / SEG, N = SEG + 1, HALF = WORLD / 2;
const GEO = { lon0: 23.727, lat0: 37.972, kx: 285, kz: 370 };
const ll = (lon, lat) => [(lon - GEO.lon0) * GEO.kx, -(lat - GEO.lat0) * GEO.kz];
const COAST = {
  festland: [[19.0, 41.9], [29.0, 41.9], [29.0, 41.0], [28.0, 40.98], [27.5, 40.98], [27.0, 40.75], [26.7, 40.45], [26.4, 40.2], [26.18, 40.05], [26.25, 40.25], [26.55, 40.5], [26.78, 40.62], [26.3, 40.72], [25.95, 40.82], [25.4, 40.88], [24.9, 40.93], [24.4, 40.93], [24.0, 40.8], [23.85, 40.75], [23.95, 40.4], [24.2, 40.3], [24.42, 40.15], [24.1, 40.25], [23.95, 40.15], [23.95, 39.98], [23.75, 40.15], [23.6, 40.22], [23.6, 40.05], [23.4, 39.95], [23.35, 40.15], [23.0, 40.45], [22.95, 40.62], [22.75, 40.55], [22.6, 40.4], [22.6, 40.25], [22.6, 40.05], [22.75, 39.9], [23.0, 39.65], [23.25, 39.45], [23.35, 39.17], [23.05, 39.03], [22.85, 38.95], [22.55, 38.85], [22.7, 38.8], [23.0, 38.7], [23.25, 38.55], [23.55, 38.45], [23.75, 38.32], [23.98, 38.15], [24.02, 38.0], [24.05, 37.75], [24.02, 37.65], [23.85, 37.78], [23.7, 37.9], [23.62, 37.93], [23.55, 38.02], [23.4, 37.98], [23.15, 37.93], [23.0, 37.92], [23.05, 37.82], [23.15, 37.63], [23.4, 37.6], [23.45, 37.45], [23.2, 37.35], [23.05, 37.45], [22.85, 37.5], [22.8, 37.58], [22.72, 37.5], [22.75, 37.2], [22.95, 36.95], [23.05, 36.7], [23.18, 36.45], [22.95, 36.5], [22.8, 36.65], [22.6, 36.78], [22.5, 36.6], [22.48, 36.39], [22.38, 36.6], [22.25, 36.85], [22.12, 37.02], [21.98, 36.85], [21.9, 36.78], [21.7, 36.8], [21.68, 36.92], [21.65, 37.1], [21.67, 37.25], [21.5, 37.5], [21.32, 37.65], [21.15, 37.85], [21.35, 38.15], [21.72, 38.25], [21.8, 38.3], [22.1, 38.23], [22.5, 38.1], [22.75, 38.02], [22.95, 37.95], [22.98, 37.99], [22.9, 38.05], [22.6, 38.2], [22.42, 38.43], [22.2, 38.35], [21.95, 38.38], [21.83, 38.39], [21.77, 38.33], [21.45, 38.35], [21.1, 38.5], [20.95, 38.75], [20.75, 38.95], [20.55, 39.15], [20.27, 39.5], [20.0, 39.85], [19.75, 40.1], [19.4, 40.4], [19.48, 40.6], [19.45, 41.3], [19.0, 41.4]],
  kleinasien: [[29.0, 40.4], [28.0, 40.38], [27.5, 40.32], [26.7, 40.38], [26.4, 40.15], [26.2, 40.0], [26.15, 39.85], [26.07, 39.48], [26.4, 39.5], [26.85, 39.55], [26.7, 39.3], [26.9, 39.05], [26.75, 38.7], [27.05, 38.45], [26.65, 38.45], [26.38, 38.62], [26.3, 38.32], [26.65, 38.2], [26.95, 38.05], [27.25, 37.85], [27.3, 37.6], [27.25, 37.37], [27.45, 37.2], [27.35, 37.03], [27.7, 36.95], [27.4, 36.68], [28.1, 36.8], [28.3, 36.75], [28.6, 36.6], [29.0, 36.6]],
  euboea: [[22.85, 39.03], [23.2, 39.02], [23.45, 38.95], [23.65, 38.75], [24.1, 38.62], [24.35, 38.45], [24.58, 38.15], [24.58, 38.0], [24.45, 37.98], [24.25, 38.15], [24.0, 38.25], [23.75, 38.35], [23.6, 38.47], [23.4, 38.6], [23.15, 38.78], [22.9, 38.92]],
  kreta: [[23.52, 35.3], [23.6, 35.58], [23.75, 35.55], [24.05, 35.52], [24.2, 35.58], [24.3, 35.38], [24.5, 35.37], [24.95, 35.42], [25.15, 35.34], [25.45, 35.3], [25.72, 35.25], [26.1, 35.22], [26.3, 35.3], [26.25, 35.05], [26.1, 35.02], [25.75, 35.0], [25.4, 34.98], [25.0, 34.93], [24.75, 34.92], [24.5, 35.1], [24.2, 35.2], [23.85, 35.23], [23.55, 35.22]],
};
// Inseln als Ellipsen: [Länge, Breite, Radius Länge°, Radius Breite°, Drehung°]
const ISLES = [
  [19.88, 39.62, 0.12, 0.33, -35], [20.55, 38.22, 0.22, 0.13, -20], [20.67, 38.4, 0.09, 0.14, 10], [20.82, 37.78, 0.13, 0.12, 0], [20.65, 38.72, 0.08, 0.12, 0],
  [22.98, 36.24, 0.09, 0.13, 0], [23.48, 37.74, 0.07, 0.05, 0], [23.47, 37.93, 0.08, 0.05, 0], [24.85, 37.83, 0.15, 0.07, -35], [25.12, 37.6, 0.11, 0.05, -30],
  [25.36, 37.45, 0.07, 0.04, 0], [25.27, 37.4, 0.06, 0.06, 0], [25.47, 37.07, 0.12, 0.14, 0], [25.15, 37.07, 0.08, 0.08, 0], [24.42, 36.71, 0.13, 0.06, 0],
  [24.48, 37.15, 0.12, 0.1, 0], [24.7, 36.97, 0.04, 0.06, 0], [25.43, 36.4, 0.13, 0.12, 0], [25.3, 36.72, 0.05, 0.05, 0], [25.9, 36.85, 0.13, 0.04, -30],
  [27.15, 36.83, 0.22, 0.06, -15], [28.0, 36.2, 0.22, 0.38, -35], [27.15, 35.65, 0.06, 0.2, 0], [26.78, 37.73, 0.2, 0.07, -10], [26.15, 37.62, 0.15, 0.05, -20],
  [26.0, 38.38, 0.12, 0.25, 0], [26.25, 39.17, 0.33, 0.2, -15], [25.25, 39.88, 0.15, 0.12, 0], [25.85, 40.18, 0.1, 0.06, 0], [24.7, 40.68, 0.12, 0.11, 0],
  [25.55, 40.47, 0.08, 0.05, 0], [24.55, 38.88, 0.14, 0.07, -30], [23.45, 39.16, 0.06, 0.04, 0], [23.65, 39.12, 0.06, 0.05, 0], [24.33, 37.62, 0.06, 0.08, 0],
  [24.93, 37.44, 0.05, 0.07, 0], [24.43, 37.4, 0.05, 0.07, 0], [21.0, 37.2, 0.08, 0.07, 0],
];
const POLYS = Object.values(COAST).map(pts => { const p = pts.map(([lo, la]) => ll(lo, la)); const xs = p.map(q => q[0]), zs = p.map(q => q[1]); return { p, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; });
const ELL = ISLES.map(([lo, la, rlo, rla, rot]) => { const [x, z] = ll(lo, la); return { x, z, rx: Math.max(10, rlo * GEO.kx), rz: Math.max(10, rla * GEO.kz), c: Math.cos(rot * Math.PI / 180), s: Math.sin(rot * Math.PI / 180) }; });
function coastDist(x, z) {
  // vorzeichenbehafteter Abstand zur Küste (positiv = Land)
  let best = -1e9;
  for (const P of POLYS) {
    if (x < P.minX - 150 || x > P.maxX + 150 || z < P.minZ - 150 || z > P.maxZ + 150) continue;
    const p = P.p; let inside = false, md = 1e9;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, zi] = p[i], [xj, zj] = p[j];
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
      const d = segDist(x, z, xi, zi, xj, zj); if (d < md) md = d;
    }
    const sd = inside ? md : -md; if (sd > best) best = sd;
  }
  for (const E of ELL) {
    const dx = x - E.x, dz = z - E.z, u = (dx * E.c + dz * E.s) / E.rx, v = (-dx * E.s + dz * E.c) / E.rz;
    const sd = (1 - Math.hypot(u, v)) * Math.min(E.rx, E.rz); if (sd > best) best = sd;
  }
  return best;
}
const PEAKS = [
  [22.35, 40.08, 175, 70], [22.6, 38.53, 85, 50], [22.35, 36.95, 70, 40], [24.77, 35.23, 80, 40], [21.2, 39.7, 80, 85], [21.5, 39.2, 65, 75], [21.9, 38.85, 60, 65],
  [23.05, 39.42, 45, 35], [24.33, 40.16, 60, 20], [22.4, 37.95, 55, 40], [21.8, 37.97, 50, 40], [22.6, 37.25, 45, 35], [22.85, 38.35, 40, 35], [23.3, 38.18, 30, 30],
  [23.8, 37.95, 22, 18], [22.7, 39.8, 50, 30], [25.39, 36.43, 40, 14], [26.85, 39.7, 70, 55], [21.4, 40.5, 70, 90], [27.8, 38.3, 60, 80], [22.15, 37.45, 45, 35],
].map(([lo, la, h, s]) => { const [x, z] = ll(lo, la); return { x, z, h, s }; });
// Orte an ihren echten Positionen
const L_ = (lon, lat, o) => { const [x, z] = ll(lon, lat); return Object.assign({ x, z, h: null }, o); };
const LOCS = {
  athen:     { name: 'Athen', sub: 'Stadt der Athene', x: 0, z: 0, r: 60, h: 6, city: true },
  akropolis: { name: 'Akropolis', x: 0, z: -35, r: 30, h: 22, hidden: true },
  piraeus:   { name: 'Piräus', sub: 'Hafen von Athen', x: -30, z: 82, r: 34, h: 2, city: true },
  theben:    L_(23.32, 38.32, { name: 'Theben', sub: 'Stadt des Kadmos', r: 40, h: 12, city: true }),
  delphi:    L_(22.50, 38.48, { name: 'Delphi', sub: 'Heiligtum des Apollon', r: 46, h: 38, city: true }),
  olympia:   L_(21.63, 37.64, { name: 'Olympia', sub: 'Heiligtum des Zeus', r: 78, h: 5, city: true }),
  sparta:    L_(22.43, 37.07, { name: 'Sparta', sub: 'Stadt der Krieger', r: 62, h: 8, city: true }),
  banditen:  L_(22.75, 37.22, { name: 'Banditenlager', sub: 'Vorsicht, Wanderer', r: 26 }),
  olymp:     L_(22.35, 40.08, { name: 'Gipfel des Olymp', sub: 'Thron der Götter', r: 14 }),
  kreta:     L_(25.16, 35.28, { name: 'Knossos', sub: 'Insel Kreta', r: 62, h: 6, city: true }),
  thera:     L_(25.47, 36.37, { name: 'Thera', sub: 'Die Vulkaninsel', r: 26, city: true }),
  seriphos:  L_(24.48, 37.15, { name: 'Seriphos', sub: 'Insel der Medusa', r: 26, city: true }),
  sirenen:   L_(21.0, 37.2, { name: 'Sireneninsel', sub: 'Hüte dich vor ihrem Gesang', r: 16 }),
  ithaka:    L_(20.69, 38.38, { name: 'Ithaka', sub: 'Heimat des Odysseus', r: 30, city: true }),
  hadesTor:  L_(22.47, 36.45, { name: 'Tor zur Unterwelt', sub: 'Kap Tainaron – Eingang zum Hades', r: 9, hidden: true }),
  hephTor:   L_(25.40, 36.42, { name: 'Schmiede des Hephaistos', r: 8, hidden: true }),
  poseidonTor: L_(21.05, 37.17, { name: 'Grotte des Poseidon', r: 7, hidden: true }),
  medusaTor: L_(24.53, 37.11, { name: 'Hort der Medusa', r: 8, hidden: true }),
  typhonTor: L_(22.45, 40.03, { name: 'Gipfel der Stürme', r: 8, hidden: true }),
  polyphemTor: L_(20.64, 38.44, { name: 'Höhle des Polyphem', r: 8, hidden: true }),
  heimat:    L_(21.80, 37.05, { name: 'Siedlungsplatz', sub: 'Freier Bauplatz bei Pylos', r: 45 }),
  eleusis:   L_(22.42, 39.64, { name: 'Siedlungsplatz', sub: 'Freier Bauplatz bei Larissa', r: 45 }),
  lebadeia:  L_(22.52, 40.76, { name: 'Siedlungsplatz', sub: 'Freier Bauplatz bei Pella', r: 45 }),
  chalkis:   L_(26.25, 39.2, { name: 'Siedlungsplatz', sub: 'Freier Bauplatz auf Lesbos', r: 45 }),
  megara:    L_(23.35, 38.0, { name: 'Megara', r: 45 }),
  argos:     L_(22.73, 37.63, { name: 'Argos', r: 45 }),
  korinth:   L_(22.88, 37.91, { name: 'Korinth', r: 45 }),
  troja:     L_(26.24, 39.96, { name: 'Troja', sub: 'Die Stadt des Priamos', r: 55, city: true }),
  marathon:  L_(23.97, 38.15, { name: 'Marathon', sub: 'Schlachtfeld von 490 v. Chr.', r: 18 }),
  thermopylen: L_(22.53, 38.8, { name: 'Thermopylen', sub: 'Hier standen die 300', r: 18 }),
  dodona:    L_(20.79, 39.55, { name: 'Dodona', sub: 'Orakel des Zeus', r: 20 }),
  rhodos:    L_(28.22, 36.44, { name: 'Rhodos', sub: 'Stadt des Koloss', r: 38, city: true }),
  delos:     L_(25.27, 37.40, { name: 'Delos', sub: 'Heilige Insel des Apollon', r: 18 }),
  ephesos:   L_(27.34, 37.94, { name: 'Ephesos', sub: 'Tempel der Artemis', r: 40, city: true }),
  milet:     L_(27.28, 37.53, { name: 'Milet', sub: 'Stadt des Thales', r: 30, city: true }),
  halikarnassos: L_(27.43, 37.04, { name: 'Halikarnassos', sub: 'Das Mausoleum', r: 30, city: true }),
  samos:     L_(26.85, 37.70, { name: 'Samos', sub: 'Heimat des Pythagoras', r: 24, city: true }),
  kos:       L_(27.18, 36.85, { name: 'Kos', sub: 'Insel des Hippokrates', r: 24, city: true }),
  chios:     L_(26.1, 38.37, { name: 'Chios', sub: 'Insel Homers', r: 22, city: true }),
  stagira:   L_(23.75, 40.53, { name: 'Stagira', sub: 'Geburtsort des Aristoteles', r: 22, city: true }),
  korkyra:   L_(19.92, 39.6, { name: 'Korkyra', sub: 'Die Insel Korfu', r: 25, city: true }),
};
const LOC_LIST = Object.values(LOCS);
const RP = (k, dx = 0, dz = 0) => [LOCS[k].x + dx, LOCS[k].z + dz];
const ROADS = [
  [RP('athen'), RP('megara'), RP('korinth'), RP('argos'), RP('sparta'), RP('hadesTor')],
  [RP('athen'), RP('piraeus')],
  [RP('athen'), RP('marathon')],
  [RP('athen'), RP('theben'), RP('delphi')],
  [RP('theben'), RP('thermopylen'), RP('eleusis'), RP('typhonTor', -60, 90), RP('lebadeia'), RP('stagira')],
  [RP('korinth'), ll(22.3, 38.05), RP('olympia'), RP('heimat'), RP('sparta')],
  [RP('sparta'), RP('banditen')],
  [RP('delphi'), ll(21.6, 38.9), RP('dodona')],
  [RP('kreta'), ll(25.16, 35.34)],
  [RP('troja'), ll(26.8, 39.3), ll(27.15, 38.6), RP('ephesos'), RP('milet'), RP('halikarnassos')],
];
const ROAD_SEGS = [];
for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) ROAD_SEGS.push([r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]]);
function roadDist(x, z) { let m = 1e9; for (const s of ROAD_SEGS) { const d = segDist(x, z, s[0], s[1], s[2], s[3]); if (d < m) m = d; } return m; }
const FORESTS = [
  [21.9, 37.3, 80], [21.4, 39.5, 90], [22.9, 39.3, 70], [22.9, 38.3, 60], [22.2, 40.4, 90], [27.2, 38.8, 90],
].map(([lo, la, r]) => { const [x, z] = ll(lo, la); return { x, z, r }; });
const MYTH_SPOTS = { dryaden: ll(20.95, 39.25), nemea: ll(22.25, 37.8), kalydon: ll(21.5, 38.45) };
for (const k in MYTH_SPOTS) FORESTS.push({ x: MYTH_SPOTS[k][0], z: MYTH_SPOTS[k][1], r: 80, myth: true });

function rawHeight(x, z) {
  const sd = coastDist(x, z) + fbm(x * 0.012 + 11, z * 0.012 - 7, 3) * 7;
  let h;
  if (sd < 0) h = Math.max(-38, sd * 0.9);
  else {
    const land = Math.min(1, sd / 90);
    const hills = fbm(x * 0.008, z * 0.008, 5) * 0.5 + 0.5;
    h = Math.min(sd * 0.25, 4) + land * 10 + hills * hills * 40 * smooth(0, 0.5, land);
  }
  const onLand = smooth(-4, 30, sd);
  if (onLand > 0) for (const p of PEAKS) { const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; if (d2 < 9 * p.s * p.s) h += p.h * Math.exp(-d2 / (2 * p.s * p.s)) * onLand; }
  return h;
}
for (const L of LOC_LIST) if (L.h === null) L.h = Math.max(3, rawHeight(L.x, L.z));
function shapedHeight(x, z) {
  let h = rawHeight(x, z);
  for (const L of LOC_LIST) {
    const d = Math.hypot(x - L.x, z - L.z);
    const w = smooth(L.r * 1.7, L.r, d);
    if (w > 0) h = lerp(h, L.h, w);
  }
  return h;
}

const HGT = new Float32Array(N * N);
function heightAt(x, z) {
  const gx = (x + HALF) / CELL, gz = (z + HALF) / CELL;
  if (gx < 0 || gz < 0 || gx >= SEG || gz >= SEG) return -38;
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const a = HGT[iz * N + ix], b = HGT[(iz + 1) * N + ix], d = HGT[iz * N + ix + 1], c = HGT[(iz + 1) * N + ix + 1];
  if (fx + fz <= 1) return a + (d - a) * fx + (b - a) * fz;
  return c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
}
function slopeAt(x, z) { const e = 2; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); }
function inCity(x, z, pad = 1.1) { for (const L of LOC_LIST) if (Math.hypot(x - L.x, z - L.z) < L.r * pad) return L; return null; }

function terrainColor(x, z, h, slope) {
  let c;
  if (h < -0.4) c = mixc([0.30, 0.42, 0.40], [0.80, 0.72, 0.52], smooth(-22, -0.4, h));
  else {
    const n = fbm(x * 0.02, z * 0.02, 3) * 0.5 + 0.5;
    const n2 = fbm(x * 0.07 + 3, z * 0.07, 2) * 0.5 + 0.5;
    c = mixc([0.40, 0.49, 0.21], [0.69, 0.62, 0.34], smooth(0.3, 0.75, n));
    c = mixc(c, [0.33, 0.42, 0.18], smooth(0.55, 0.8, n2) * 0.5);
    for (const F of FORESTS) { const d = Math.hypot(x - F.x, z - F.z); if (d < F.r * 1.2) c = mixc(c, [0.27, 0.36, 0.16], smooth(F.r * 1.2, F.r * 0.5, d) * 0.7); }
    c = mixc(c, [0.56, 0.53, 0.48], Math.max(smooth(0.6, 1.0, slope), smooth(62, 100, h)));
    c = mixc(c, [0.95, 0.96, 0.98], smooth(118, 136, h + n * 10));
    c = mixc([0.87, 0.79, 0.57], c, smooth(1.4, 3.2, h));
    const rd = roadDist(x, z);
    if (rd < 4.5 && h > 0.3) c = mixc([0.62, 0.52, 0.38], c, smooth(2.4, 4.5, rd));
    for (const L of LOC_LIST) {
      if (!L.city) continue;
      const d = Math.hypot(x - L.x, z - L.z);
      if (d < L.r) c = mixc(c, [0.72, 0.67, 0.56], smooth(L.r * 0.95, L.r * 0.55, d) * 0.6 * (1 - smooth(0.25, 0.6, slope)));
    }
  }
  return c;
}

// ============================================================
// Renderer, Szene, Licht, Himmel
// ============================================================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 4200);
scene.fog = new THREE.Fog(0xbfd9ef, 220, 1300);

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a55, 1.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const SC = sun.shadow.camera; SC.left = -75; SC.right = 75; SC.top = 75; SC.bottom = -75; SC.near = 1; SC.far = 600;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color(0x3d7fd0) }, bottom: { value: new THREE.Color(0xcfe3f2) }, sunDir: { value: new V3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff0d0) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;' +
    'void main(){ vec3 d = normalize(vP); float h = max(d.y, 0.0); vec3 c = mix(bottom, top, pow(h, 0.55));' +
    'float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 10.0) * 0.22);' +
    'if (d.y < 0.0) c = bottom; gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), skyMat);
sky.renderOrder = -10;
scene.add(sky);
const starGeo = new THREE.BufferGeometry();
{ const p = []; for (let i = 0; i < 1600; i++) { const u = rand() * 2 - 1, t = rand() * Math.PI * 2, y = Math.abs(u); const r = Math.sqrt(1 - y * y); p.push(Math.cos(t) * r * 3300, y * 3300 + 50, Math.sin(t) * r * 3300); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// Wasser
const waterMat = new THREE.MeshPhongMaterial({ color: 0x1f6f9a, specular: 0x99bbcc, shininess: 90, transparent: true, opacity: 0.86 });
const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), waterMat);
water.rotation.x = -Math.PI / 2;
water.receiveShadow = true;
scene.add(water);

// ============================================================
// Materialien & statische Geometrie (zusammengefasst pro Region)
// ============================================================
const matCache = {};
function lam(hex, emissive) {
  const k = hex + '|' + (emissive || 0);
  if (!matCache[k]) matCache[k] = new THREE.MeshLambertMaterial({ color: hex, emissive: emissive || 0 });
  return matCache[k];
}
const M = {
  marble: lam(0xf1ece1), marble2: lam(0xdcd3c1), white: lam(0xefe8da), terracotta: lam(0xb5553a), roof2: lam(0x9c4a32),
  wood: lam(0x7a5230), darkwood: lam(0x4a321e), stone: lam(0xb8ab92), stone2: lam(0x9a8f7c), dark: lam(0x2b2218),
  bronze: lam(0xb98d3a), red: lam(0x9b1c1c), blue: lam(0x2a4d8f), cloth: lam(0xe7dcc3), minoan: lam(0xa8302a),
  black: lam(0x1a1a1a), gold: lam(0xe8c46a, 0x3a2a00), fire: lam(0xff9a2a, 0xff6a00), water: lam(0x3f8fc0, 0x0a2030),
  tent: lam(0x8a6a44), sail: lam(0xf2ead6), olive: lam(0x7d8c4a),
};
const STATIC = new Map();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _pv = new V3(), _sv = new V3();
function addStatic(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _eu.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_eu); _pv.set(x, y, z); _sv.set(sx, sy, sz); _m4.compose(_pv, _q, _sv);
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  g.applyMatrix4(_m4);
  const key = mat.uuid + '|' + Math.floor(x / 220) + ',' + Math.floor(z / 220);
  if (!STATIC.has(key)) STATIC.set(key, { mat, list: [] });
  STATIC.get(key).list.push(g);
}
function finalizeStatic() {
  for (const { mat, list } of STATIC.values()) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; g.dispose(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
  }
  STATIC.clear();
}
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  col: new THREE.CylinderGeometry(0.46, 0.55, 1, 14, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  sphere: new THREE.SphereGeometry(0.5, 12, 8),
  minoanCol: new THREE.CylinderGeometry(0.6, 0.42, 1, 12, 1),
};
{ const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath(); G.prism = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); G.prism.translate(0, 0, -0.5); }

// Kollision
const CGRID = 16, cgrid = new Map();
const ckey = (cx, cz) => cx * 100003 + cz;
function addCollider(c) {
  let minX, maxX, minZ, maxZ;
  if (c.t === 'c') { minX = c.x - c.r; maxX = c.x + c.r; minZ = c.z - c.r; maxZ = c.z + c.r; }
  else { minX = c.minX; maxX = c.maxX; minZ = c.minZ; maxZ = c.maxZ; }
  const m = 1.5;
  for (let cx = Math.floor((minX - m) / CGRID); cx <= Math.floor((maxX + m) / CGRID); cx++)
    for (let cz = Math.floor((minZ - m) / CGRID); cz <= Math.floor((maxZ + m) / CGRID); cz++) {
      const k = ckey(cx, cz); if (!cgrid.has(k)) cgrid.set(k, []); cgrid.get(k).push(c);
    }
}
function circleCol(x, z, r) { addCollider({ t: 'c', x, z, r }); }
function boxCol(minX, maxX, minZ, maxZ, top = 1e9) { addCollider({ t: 'b', minX, maxX, minZ, maxZ, top }); }
function resolveCollisions(p, r) {
  const list = cgrid.get(ckey(Math.floor(p.x / CGRID), Math.floor(p.z / CGRID)));
  if (!list) return false;
  let hit = false;
  for (const c of list) {
    if (c.t === 'c') {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), R = c.r + r;
      if (d < R && d > 1e-6) { p.x = c.x + dx / d * R; p.z = c.z + dz / d * R; hit = true; }
    } else {
      if (p.y !== undefined && p.y >= c.top - 0.25) continue;
      if (p.x > c.minX - r && p.x < c.maxX + r && p.z > c.minZ - r && p.z < c.maxZ + r) {
        const a = p.x - (c.minX - r), b = (c.maxX + r) - p.x, cc = p.z - (c.minZ - r), d = (c.maxZ + r) - p.z;
        const m = Math.min(a, b, cc, d);
        if (m === a) p.x = c.minX - r; else if (m === b) p.x = c.maxX + r; else if (m === cc) p.z = c.minZ - r; else p.z = c.maxZ + r;
        hit = true;
      }
    }
  }
  return hit;
}
const platforms = [];
function addPlatform(minX, maxX, minZ, maxZ, top) { platforms.push({ minX, maxX, minZ, maxZ, top }); }
function groundAt(x, z) {
  let h = heightAt(x, z);
  for (const p of platforms) if (x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && p.top > h) h = p.top;
  return h;
}

const RES = [];
let FORCE_BUILD = false;
function reserve(x, z, r) { RES.push([x, z, r]); }
function isFree(x, z, r) { for (const q of RES) if (Math.hypot(x - q[0], z - q[1]) < r + q[2]) return false; return true; }
// Lokales Koordinatensystem für Gebäude
class Frame {
  constructor(x, z, rot = 0, y = null) { this.x = x; this.z = z; this.rot = rot; this.y = y === null ? heightAt(x, z) : y; this.c = Math.cos(rot); this.s = Math.sin(rot); }
  w(lx, lz) { return [this.x + lx * this.c + lz * this.s, this.z - lx * this.s + lz * this.c]; }
  put(geo, mat, lx, ly, lz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { const [x, z] = this.w(lx, lz); addStatic(geo, mat, x, this.y + ly, z, rx, this.rot + ry, rz, sx, sy, sz); }
  box(mat, lx, ly, lz, w, h, d, collide = false, top = null) {
    this.put(G.box, mat, lx, ly + h / 2, lz, 0, 0, 0, w, h, d);
    if (collide) this.colBox(lx, lz, w, d, top === null ? 1e9 : this.y + top);
  }
  colBox(lx, lz, w, d, top = 1e9) {
    const pts = [this.w(lx - w / 2, lz - d / 2), this.w(lx + w / 2, lz - d / 2), this.w(lx - w / 2, lz + d / 2), this.w(lx + w / 2, lz + d / 2)];
    boxCol(Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1])), top);
  }
  platform(lx, lz, w, d, top) {
    const pts = [this.w(lx - w / 2, lz - d / 2), this.w(lx + w / 2, lz + d / 2), this.w(lx - w / 2, lz + d / 2), this.w(lx + w / 2, lz - d / 2)];
    addPlatform(Math.min(...pts.map(q => q[0])), Math.max(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[1])), this.y + top);
  }
}

// ============================================================
// Gebäude-Bausteine
// ============================================================
function temple(f, W, L, nx, nz, colH, opt = {}) {
  const cm = opt.colMat || M.marble, base = opt.baseMat || M.marble2;
  reserve(f.x, f.z, Math.hypot(W, L) / 2 + 2);
  // Stufen (Krepis)
  for (let i = 0; i < 3; i++) { const inset = i * 0.7; f.box(base, 0, -2 + 0, 0, W + 2.8 - inset * 2, 2 + 0.4 * (i + 1) - 0.0, L + 2.8 - inset * 2); }
  const top = 1.2;
  f.platform(0, 0, W + 2.8, L + 2.8, top);
  const sx = (W - 1.2) / (nx - 1), sz = (L - 1.2) / (nz - 1);
  const ring = [];
  for (let i = 0; i < nx; i++) { ring.push([-W / 2 + 0.6 + i * sx, -L / 2 + 0.6]); ring.push([-W / 2 + 0.6 + i * sx, L / 2 - 0.6]); }
  for (let j = 1; j < nz - 1; j++) { ring.push([-W / 2 + 0.6, -L / 2 + 0.6 + j * sz]); ring.push([W / 2 - 0.6, -L / 2 + 0.6 + j * sz]); }
  for (const [x, z] of ring) {
    f.put(opt.colGeo || G.col, cm, x, top + colH / 2, z, 0, 0, 0, 1, colH, 1);
    f.box(cm, x, top + colH, z, 1.35, 0.3, 1.35);
    f.box(cm, x, top - 0.05, z, 1.3, 0.2, 1.3);
    const [wx, wz] = f.w(x, z); circleCol(wx, wz, 0.62);
  }
  const eY = top + colH + 0.3;
  f.box(cm, 0, eY, 0, W + 0.4, 0.8, L + 0.4);
  f.box(opt.friezeMat || M.marble2, 0, eY + 0.8, 0, W + 0.5, 0.6, L + 0.5);
  const pY = eY + 1.4, pH = W * 0.2;
  f.put(G.prism, cm, 0, pY, 0, 0, 0, 0, W + 0.5, pH, L + 0.5);
  const ang = Math.atan2(pH, W / 2), slab = Math.hypot(W / 2, pH) + 0.5;
  for (const s of [-1, 1]) f.put(G.box, opt.roofMat || M.terracotta, s * W / 4, pY + pH / 2 + 0.12, 0, 0, 0, -s * ang, slab, 0.22, L + 1.0);
  // Cella
  if (!opt.noCella) {
    const cw = W - 5, cl = L - 7.5;
    f.box(opt.cellaMat || M.marble2, 0, top, 0, cw, colH + 0.3, cl, true);
    f.box(M.dark, 0, top, cl / 2 + 0.01, 2.2, 4, 0.1);
  }
  if (opt.chest !== false) { const [cx, cz] = f.w(0, opt.noCella ? 0 : (L - 7.5) / 2 + 1.5); opt.chestRef = addChest(cx, f.y + top, cz, f.rot, opt.tier || 1); }
  if (opt.guards !== false && W >= 7) for (const s of [-1, 1]) { const [gx, gz] = f.w(s * (W / 2 - 1.2), L / 2 + 2.6); TEMPLE_GUARDS.push([gx, gz, f.rot]); }
}
function tholos(f, R, n, colH) {
  reserve(f.x, f.z, R + 3);
  for (let i = 0; i < 3; i++) f.put(G.cyl, M.marble2, 0, -0.8 + i * 0.4, 0, 0, 0, 0, (R + 2.4 - i * 0.7) * 2, 2.4, (R + 2.4 - i * 0.7) * 2);
  f.platform(0, 0, R * 2 + 3, R * 2 + 3, 1.2);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
    f.put(G.col, M.marble, x, 1.2 + colH / 2, z, 0, 0, 0, 0.9, colH, 0.9);
    const [wx, wz] = f.w(x, z); circleCol(wx, wz, 0.55);
  }
  f.put(G.cyl, M.marble, 0, 1.2 + colH + 0.35, 0, 0, 0, 0, R * 2 + 1.4, 0.7, R * 2 + 1.4);
  f.put(G.cone, M.terracotta, 0, 1.2 + colH + 0.7 + 1.2, 0, 0, 0, 0, R * 2 + 1.8, 2.4, R * 2 + 1.8);
}
function house(x, z, rot, w, d, h, opt = {}) {
  if (!FORCE_BUILD && !isFree(x, z, Math.max(w, d) * 0.62)) return null;
  reserve(x, z, Math.max(w, d) * 0.62);
  const f = new Frame(x, z, rot);
  const y0 = Math.min(heightAt(...f.w(-w / 2, -d / 2)), heightAt(...f.w(w / 2, d / 2)), heightAt(...f.w(-w / 2, d / 2)), heightAt(...f.w(w / 2, -d / 2)));
  f.y = y0;
  const wallM = opt.wall || M.white;
  f.box(M.stone2, 0, -3, 0, w + 0.3, 3.3, d + 0.3);
  f.box(wallM, 0, 0, 0, w, h, d, true);
  f.put(G.prism, opt.roof || M.terracotta, 0, h, 0, 0, Math.PI / 2, 0, d + 0.8, 1.7, w + 0.8);
  f.box(M.darkwood, 0, 0, d / 2 + 0.03, 1.0, 1.9, 0.08);
  for (const sx of [-1, 1]) if (w > 4.5) f.box(M.dark, sx * w * 0.3, h * 0.55, d / 2 + 0.03, 0.6, 0.6, 0.06);
  return f;
}
function statue(x, z, rot, s = 1, mat = M.marble, y = null) {
  reserve(x, z, 1.5 * s);
  const f = new Frame(x, z, rot, y);
  f.box(M.marble2, 0, 0, 0, 1.6 * s, 1.4 * s, 1.6 * s, true);
  const b = 1.4 * s;
  f.put(G.cyl, mat, 0, b + 0.9 * s, 0, 0, 0, 0, 0.8 * s, 1.8 * s, 0.6 * s);
  f.box(mat, 0, b + 1.8 * s, 0, 0.9 * s, 0.9 * s, 0.45 * s);
  f.put(G.sphere, mat, 0, b + 2.95 * s, 0, 0, 0, 0, 0.5 * s, 0.55 * s, 0.5 * s);
  f.put(G.cyl8, mat, 0.6 * s, b + 1.6 * s, 0, 0, 0, 0, 0.18 * s, 1.4 * s, 0.18 * s);
  f.put(G.cyl8, mat, -0.6 * s, b + 2.6 * s, 0.2 * s, 0, 0, 0, 0.1 * s, 4.2 * s, 0.1 * s);
  f.put(G.cone, mat, -0.6 * s, b + 4.9 * s, 0.2 * s, 0, 0, 0, 0.2 * s, 0.5 * s, 0.2 * s);
  f.put(G.cyl, mat, 0.65 * s, b + 1.3 * s, 0.25 * s, Math.PI / 2, 0, 0, 1.1 * s, 0.1 * s, 1.1 * s);
  f.put(G.sphere, mat, 0, b + 3.25 * s, 0, 0, 0, 0, 0.55 * s, 0.35 * s, 0.6 * s);
  return f;
}
const fires = [];
function brazier(x, z, y = null) {
  const f = new Frame(x, z, 0, y);
  f.put(G.cyl8, M.bronze, 0, 0.6, 0, 0, 0, 0, 0.25, 1.2, 0.25);
  f.put(G.cyl, M.bronze, 0, 1.3, 0, 0, 0, 0, 1.0, 0.3, 1.0);
  const fm = new THREE.Mesh(G.cone, M.fire); fm.position.set(x, f.y + 1.85, z); fm.scale.set(0.7, 1.0, 0.7); scene.add(fm); fires.push(fm);
  circleCol(x, z, 0.5);
}
function campfire(x, z) {
  const f = new Frame(x, z, 0);
  for (let i = 0; i < 4; i++) f.put(G.cyl8, M.darkwood, 0, 0.15, 0, 0, i * Math.PI / 4, Math.PI / 2, 0.18, 1.6, 0.18);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; f.put(G.sphere, M.stone2, Math.cos(a) * 1.0, 0.1, Math.sin(a) * 1.0, 0, 0, 0, 0.45, 0.35, 0.45); }
  const fm = new THREE.Mesh(G.cone, M.fire); fm.position.set(x, f.y + 0.75, z); fm.scale.set(0.9, 1.2, 0.9); scene.add(fm); fires.push(fm);
}
function fountain(x, z) {
  reserve(x, z, 3.5);
  const f = new Frame(x, z, 0);
  f.put(G.cyl, M.marble2, 0, 0.35, 0, 0, 0, 0, 5, 0.7, 5);
  f.put(G.cyl, M.water, 0, 0.62, 0, 0, 0, 0, 4.4, 0.1, 4.4);
  f.put(G.cyl, M.marble, 0, 1.3, 0, 0, 0, 0, 0.6, 2, 0.6);
  f.put(G.cyl, M.marble, 0, 2.3, 0, 0, 0, 0, 1.8, 0.3, 1.8);
  circleCol(x, z, 2.6);
  return f;
}
function stoa(f, W, D, n, colH) {
  reserve(f.x, f.z, W / 2 + 1);
  f.box(M.marble2, 0, -2, 0, W + 1, 2.5, D + 1);
  f.platform(0, 0, W + 1, D + 1, 0.5);
  f.box(M.white, 0, 0.5, -D / 2 + 0.3, W, colH + 0.4, 0.6, true);
  for (const s of [-1, 1]) f.box(M.white, s * (W / 2 - 0.3), 0.5, 0, 0.6, colH + 0.4, D, true);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 1 + i * (W - 2) / (n - 1);
    f.put(G.col, M.marble, x, 0.5 + colH / 2, D / 2 - 0.6, 0, 0, 0, 0.8, colH, 0.8);
    const [wx, wz] = f.w(x, D / 2 - 0.6); circleCol(wx, wz, 0.5);
  }
  f.box(M.marble, 0, 0.5 + colH, 0, W + 0.4, 0.6, D + 0.4);
  f.put(G.prism, M.terracotta, 0, 1.1 + colH, 0, 0, Math.PI / 2, 0, D + 0.8, 1.8, W + 0.8);
}
function theatre(f, R, rows) {
  reserve(f.x, f.z, R + rows * 1.6);
  for (let i = 0; i < rows; i++) {
    const r = R + i * 1.6;
    const segs = 14;
    for (let s = 0; s <= segs; s++) {
      const a = Math.PI * (s / segs), x = Math.cos(a) * r, z = -Math.sin(a) * r;
      f.put(G.box, M.stone, x, i * 0.55 + 0.3, z, 0, -a + Math.PI / 2, 0, 2 * r * Math.PI / segs + 0.3, 0.6 + i * 0.55 * 2, 1.6);
    }
  }
  f.put(G.cyl, M.marble2, 0, 0.1, 0, 0, 0, 0, R * 1.5, 0.2, R * 1.5);
}
function tree(x, z, kind) { TREES.push({ x, z, kind, s: rr(0.8, 1.3), r: rand() * 6.28 }); }
const TREES = [];

// ============================================================
// Schatztruhen, Relikte, Ruinen-Tempel
// ============================================================
const CHESTS = [], TEMPLE_GUARDS = [], RUINS = [];
const RELICS = {
  perseus: { name: 'Schwert des Perseus', desc: '+8 Schaden' },
  achilles: { name: 'Helm des Achilles', desc: 'Du erleidest 20 % weniger Schaden' },
  hermes: { name: 'Sandalen des Hermes', desc: '+20 % Laufgeschwindigkeit' },
  apollon: { name: 'Amulett des Apollon', desc: '+40 maximales Leben' },
  athene: { name: 'Schild der Athene', desc: 'Dein Schild hält fast jeden Schlag ab' },
  herakles: { name: 'Gürtel des Herakles', desc: 'Sprinten kostet nur halb so viel Ausdauer' },
};
function makeChestMesh(tier) {
  const g = new THREE.Group();
  const wood = lam(tier === 3 ? 0xe8c46a : tier === 2 ? 0x5a2e1a : 0x7a5230, tier === 3 ? 0x4a3000 : 0), trim = tier >= 2 ? M.gold : M.bronze;
  const add = (geo, mat, x, y, z, p = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  add(new THREE.BoxGeometry(1.1, 0.6, 0.7), wood, 0, 0.3, 0);
  for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.1, 0.62, 0.72), trim, x, 0.3, 0);
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.35); g.add(lid);
  add(new THREE.BoxGeometry(1.12, 0.24, 0.72), wood, 0, 0.12, 0.36, lid);
  for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.1, 0.26, 0.74), trim, x, 0.12, 0.36, lid);
  add(new THREE.BoxGeometry(0.18, 0.2, 0.06), trim, 0, -0.05, 0.73, lid);
  const glow = add(new THREE.TorusGeometry(0.95, 0.04, 6, 28), new THREE.MeshBasicMaterial({ color: tier === 3 ? 0xffffff : tier === 2 ? 0xffd24a : 0xe8c46a, transparent: true, opacity: 0.8 }), 0, 0.05, 0);
  glow.rotation.x = Math.PI / 2; glow.castShadow = false;
  return { root: g, lid, glow };
}
function addChest(x, y, z, rot, tier = 1, ruin) {
  const m = makeChestMesh(tier);
  m.root.position.set(x, y, z); m.root.rotation.y = rot; scene.add(m.root);
  const ch = { id: CHESTS.length, x, y, z, tier, m, opened: false, ruin };
  CHESTS.push(ch);
  interactables.push({ pos: () => new V3(ch.x, ch.y, ch.z), label: tier === 3 ? 'Göttlichen Schatz öffnen' : tier === 2 ? 'Schatz öffnen' : 'Truhe öffnen', r: 2.6, active: () => !ch.opened, fn: () => tryOpenChest(ch) });
  return ch;
}
function markChestOpened(ch) { ch.opened = true; ch.m.lid.rotation.x = -1.9; ch.m.glow.visible = false; }
function tryOpenChest(ch) {
  if (ch.opened) return;
  if (ch.dungeon !== undefined) {
    const boss = enemies.find(e => e.dungeon === ch.dungeon && e.def.boss && !e.dead);
    if (boss) { toast('Besiege zuerst ' + boss.def.name + '!'); sfx('block'); return; }
  }
  if (ch.ruin !== undefined) {
    const alive = enemies.filter(e => e.ruin === ch.ruin && !e.dead).length;
    if (alive) { toast('Die Tempelwächter bewachen den Schatz! (' + alive + ' übrig)'); sfx('block'); return; }
  }
  markChestOpened(ch); if (!S.chests.includes(ch.id)) S.chests.push(ch.id);
  if (ch.tier === 3) { addMoney(Math.round(rr(150, 250))); const dd = DUNGEONS[ch.dungeon]; if (dd && dd.reward) gainGear(dd.reward); player.potions += 3; sfx('quest'); save(); return; }
  addMoney(Math.round(ch.tier === 2 ? rr(45, 95) : ch.bonus ? rr(25, 60) : rr(12, 35)));
  if (rand() < (ch.tier === 2 ? 0.75 : ch.bonus ? 0.6 : 0.35)) { const n = ch.tier === 2 ? 2 : 1; player.potions += n; toast('+' + n + ' Ambrosia', 'gold'); }
  if (ch.tier === 2) {
    const left = Object.keys(RELICS).filter(k => !player.relics.includes(k));
    if (left.length) gainRelic(pick(left)); else { addMoney(60); }
  }
  sfx('quest'); save();
}
function gainRelic(k) {
  player.relics.push(k);
  const R = RELICS[k];
  if (k === 'perseus') player.dmg += 8;
  if (k === 'apollon') { player.maxHp += 40; player.hp += 40; }
  banner(R.name, R.desc);
  toast('Relikt gefunden: ' + R.name + ' (' + player.relics.length + '/6)', 'gold');
}
const RUIN_NAMES = ['Tempel des Hermes', 'Tempel des Poseidon', 'Tempel der Artemis', 'Tempel des Ares', 'Tempel der Hera', 'Tempel des Dionysos', 'Tempel des Hephaistos', 'Tempel der Demeter'];
function buildRuins() {
  let tries = 0;
  while (RUINS.length < 8 && tries < 4000) {
    tries++;
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z);
    if (h < 4 || h > 90) continue;
    if (inCity(x, z, 1.8) || roadDist(x, z) < 25 || !isFree(x, z, 22)) continue;
    let ok = true;
    for (const [dx, dz] of [[-10, -12], [10, -12], [-10, 12], [10, 12]]) if (Math.abs(heightAt(x + dx, z + dz) - h) > 3.5 || heightAt(x + dx, z + dz) < 2) ok = false;
    if (!ok || RUINS.some(r => Math.hypot(r.x - x, r.z - z) < 170)) continue;
    buildRuin(x, z, RUIN_NAMES[RUINS.length]);
  }
}
function buildRuin(x, z, name) {
  const rot = Math.floor(rand() * 4) * Math.PI / 2;
  let y0 = 1e9; for (const [dx, dz] of [[-8, -10], [8, -10], [-8, 10], [8, 10], [0, 0]]) y0 = Math.min(y0, heightAt(x + dx, z + dz));
  const f = new Frame(x, z, rot, y0);
  reserve(x, z, 16);
  const W = 10, L = 15, top = 1.2, colH = 5.5, rm = lam(0xd9d0bc), moss = lam(0x9fa884);
  for (let i = 0; i < 3; i++) f.box(i === 0 ? moss : M.marble2, 0, -4, 0, W + 2.8 - i * 1.4, 4 + 0.4 * (i + 1), L + 2.8 - i * 1.4);
  f.platform(0, 0, W + 2.8, L + 2.8, top);
  const ring = [], nx = 4, nz = 6, sx = (W - 1.2) / (nx - 1), sz = (L - 1.2) / (nz - 1);
  for (let i = 0; i < nx; i++) { ring.push([-W / 2 + 0.6 + i * sx, -L / 2 + 0.6]); ring.push([-W / 2 + 0.6 + i * sx, L / 2 - 0.6]); }
  for (let j = 1; j < nz - 1; j++) { ring.push([-W / 2 + 0.6, -L / 2 + 0.6 + j * sz]); ring.push([W / 2 - 0.6, -L / 2 + 0.6 + j * sz]); }
  for (const [cx, cz] of ring) {
    const r = rand();
    if (r < 0.18) continue;
    const h = r < 0.55 ? colH : rr(1, colH * 0.7);
    f.put(G.col, rand() < 0.3 ? moss : rm, cx, top + h / 2, cz, 0, 0, 0, 1, h, 1);
    f.box(rm, cx, top - 0.05, cz, 1.3, 0.2, 1.3);
    if (h === colH) f.box(rm, cx, top + colH, cz, 1.35, 0.3, 1.35);
    const [wx, wz] = f.w(cx, cz); circleCol(wx, wz, 0.62);
  }
  for (let i = 0; i < 5; i++) {
    const s = rand() < 0.5 ? -1 : 1, lx = s * rr(W / 2 + 2, W / 2 + 5), lz = rr(-L / 2, L / 2), len = rr(1.5, 3.2);
    f.put(G.col, moss, lx, 0.5, lz, Math.PI / 2, rand() * 6, 0, 1, len, 1);
    const [wx, wz] = f.w(lx, lz); circleCol(wx, wz, 0.8);
  }
  f.box(rm, -W / 2 - 3, 0, L / 2 - 2, 3, 0.8, 1.2, true);
  f.box(rm, 2, top, -L / 2 + 1.5, 4.5, 0.8, 1.0, true, top + 0.8);
  // Zerbrochene Götterstatue
  f.box(M.marble2, 0, top, -L / 2 + 3.5, 1.6, 1.2, 1.6, true);
  f.put(G.cyl, rm, 0, top + 2.0, -L / 2 + 3.5, 0, 0, 0, 0.8, 1.6, 0.6);
  f.put(G.sphere, rm, 1.6, top + 0.3, -L / 2 + 4.5, 0, 0, 0, 0.55, 0.6, 0.55);
  const [cx, cz] = f.w(0, 1);
  const idx = RUINS.length;
  const chest = addChest(cx, f.y + top, cz, rot, 2, idx);
  RUINS.push({ x, z, name, chest, y: f.y + top, guards: [f.w(-2.5, 4.5), f.w(2.5, 4.5), f.w(0, -2.5)] });
}

// ============================================================
// Eigene Stadt (Polis) gründen und ausbauen
// ============================================================
const TOWN_LEVELS = [
  { name: 'Siedlungsplatz', income: 0 },
  { name: 'Siedlung', cost: 50, income: 4, desc: 'drei Häuser, ein Lagerfeuer und die ersten Siedler' },
  { name: 'Dorf', cost: 150, income: 10, desc: 'mehr Häuser, einen Brunnen und einen Marktstand' },
  { name: 'Kleinstadt', cost: 300, income: 18, desc: 'einen eigenen Tempel mit Wachen und eine Palisade' },
  { name: 'Polis', cost: 600, income: 30, desc: 'Wachtürme, eine Säulenhalle und deine goldene Heldenstatue' },
];
const TOWN_LINES = ['Willkommen in {S}!', 'Die Felder hier sind fruchtbar. Bald wird {S} wachsen.', 'Wenn wir mehr Drachmen hätten, könnten wir einen Tempel bauen …', 'Die Steuern liegen in der Schatzkammer beim Grenzstein bereit.', '{S} wird eines Tages größer als Athen!', 'Ich hoffe, niemand erobert uns …'];
// Stadtplätze: freie Bauplätze und feindliche Poleis (Schlüssel müssen mit server/src/index.js übereinstimmen)
const TOWN_SITES = [
  { key: 'heimat' }, { key: 'eleusis' }, { key: 'lebadeia' }, { key: 'chalkis' },
  { key: 'megara', def: { owner: 'npc', ownerName: 'Megarer', name: 'Megara', lvl: 2 }, col: 0x2a5a9a },
  { key: 'argos', def: { owner: 'npc', ownerName: 'Argiver', name: 'Argos', lvl: 3 }, col: 0x2a7a3a },
  { key: 'korinth', def: { owner: 'npc', ownerName: 'Korinther', name: 'Korinth', lvl: 4 }, col: 0x7a2a7a },
];
const SITE = Object.fromEntries(TOWN_SITES.map(s => [s.key, s]));
const builtLvl = {};
function defaultTowns() { const o = {}; for (const s of TOWN_SITES) o[s.key] = s.def ? Object.assign({ collected: Date.now() }, s.def) : null; return o; }
function myCid() { return NET.account ? 'acc:' + NET.account.name.toLowerCase() : 'me'; }
function townsState() { return NET.towns || S.towns; }
function isMine(T) { return !!T && (T.owner === 'me' || T.owner === myCid()); }
function isMember(T) { return !!T && (T.members || []).some(m => m.cid === myCid()); }
const townCap = (T) => TOWN_LEVELS[T.lvl].income * 25;
const townTreasury = (T) => Math.floor(Math.min(townCap(T), TOWN_LEVELS[T.lvl].income * Math.max(0, Date.now() - (T.collected || Date.now())) / 60000));
function townNPC(site, name, dx, dz, look, wander = 10) {
  const L = LOCS[site];
  return addNPC(name, L.x + dx, L.z + dz, look, function () { const T = townsState()[site]; talk([{ who: this.name, text: pick(TOWN_LINES).replace('{S}', T ? T.name : 'unsere Stadt') }]); }, wander);
}
function buildTownBases() {
  for (const s of TOWN_SITES) {
    const L = LOCS[s.key];
    reserve(L.x, L.z, 52);
    const f = new Frame(L.x, L.z, 0);
    f.box(M.stone2, 0, -0.5, 0, 1.2, 2.6, 0.7, true);
    f.box(M.gold, 0, 2.05, 0, 1.25, 0.15, 0.75);
    interactables.push({ pos: () => new V3(L.x, heightAt(L.x, L.z), L.z), label: () => { const T = townsState()[s.key]; return !T ? 'Stadt gründen' : isMine(T) ? 'Deine Stadt verwalten' : 'Grenzstein von ' + T.name; }, r: 3.6, fn: () => talkTown(s.key) });
    builtLvl[s.key] = 0;
  }
}
function buildTownLevel(site, l) {
  const L = LOCS[site], X = L.x, Z = L.z;
  const vil = { tunic: 0x6a7a4a, pants: 0x3a3024, beard: true };
  FORCE_BUILD = true;
  if (l === 1) {
    house(X - 14, Z + 6, Math.PI / 2, 6, 6, 3.8); house(X + 14, Z + 8, -Math.PI / 2, 6, 6, 3.8); house(X - 4, Z - 14, 0, 7, 6, 4);
    campfire(X + 7, Z - 5);
    townNPC(site, 'Siedler Kostas', 4, 6, vil); townNPC(site, 'Siedlerin Melina', -6, -4, { tunic: 0x9b3b2b, pants: 0x4a2a2a, veil: 0xe8dcc0 });
  }
  if (l === 2) {
    house(X - 24, Z - 8, Math.PI / 2, 6, 6, 4); house(X + 24, Z - 6, -Math.PI / 2, 6, 6, 4); house(X - 16, Z + 22, 0, 7, 6, 4); house(X + 16, Z + 22, 0, 6, 6, 4);
    fountain(X, Z + 14);
    interactables.push({ pos: () => new V3(X, heightAt(X, Z + 14), Z + 14), label: 'Aus dem Brunnen trinken', r: 4.2, fn: () => { player.hp = player.maxHp; player.stamina = 100; toast('Das Wasser erfrischt dich.'); sfx('drink'); } });
    const m = new Frame(X + 12, Z - 20, 0); m.box(M.wood, 0, 0, 0, 4, 1, 1.6, true); for (const [x, z] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) m.box(M.wood, x, 0, z, 0.15, 2.8, 0.15); m.put(G.box, M.blue, 0, 2.9, 0, 0.18, 0, 0, 4.6, 0.1, 2.6);
    townNPC(site, 'Händlerin Eirene', 12, -17.5, { tunic: 0x2f6a5a, pants: 0x2a3a30, veil: 0x3a5a8a }, 0).talkFn = function () { talkMerchant(); };
    townNPC(site, 'Bauer Stavros', -10, 18, vil); townNPC(site, 'Fischer Alexios', 18, 10, { tunic: 0x3a5a8a, pants: 0x2a2a3a });
  }
  if (l === 3) {
    const tf = new Frame(X, Z - 32, 0);
    temple(tf, 8, 12, 4, 6, 4.6, { guards: false });
    house(X - 30, Z + 10, Math.PI / 2, 6, 6, 4); house(X + 30, Z + 16, -Math.PI / 2, 6, 6, 4); house(X - 28, Z - 20, Math.PI / 2, 6, 6, 4);
    for (let i = 0; i < 140; i++) {
      const a = i / 140 * Math.PI * 2;
      if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.13 || Math.abs(a - Math.PI) < 0.13) continue; // Tore im Osten und Westen
      const f = new Frame(X + Math.cos(a) * 48, Z + Math.sin(a) * 48, 0);
      f.put(G.cone, M.darkwood, 0, 1.6, 0, 0, 0, 0, 0.6, 3.2, 0.6); circleCol(f.x, f.z, 0.4);
    }
    townNPC(site, 'Priesterin Phoibe', 3, -20, { tunic: 0xf4f0e6, pants: 0xd8d0c0, veil: 0xf4f0e6, wreath: true }, 4);
  }
  if (l === 4) {
    statue(X, Z - 17, 0, 1.4, M.gold);
    stoa(new Frame(X, Z + 34, Math.PI), 24, 6, 9, 4.2);
    for (const [dx, dz] of [[48, 8], [48, -8], [-48, 8], [-48, -8], [0, -48], [0, 48]]) {
      const f = new Frame(X + dx, Z + dz, 0);
      f.box(M.stone, 0, -1, 0, 3.4, 8, 3.4, true); f.box(M.stone2, 0, 7, 0, 4, 0.6, 4);
      for (const [cx, cz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) f.box(M.stone2, cx, 7.6, cz, 0.7, 0.9, 0.7);
      f.put(G.cone4, M.roof2, 0, 9.2, 0, 0, Math.PI / 4, 0, 4.6, 2.4, 4.6);
    }
    house(X + 30, Z - 24, -Math.PI / 2, 7, 7, 4.5); house(X - 32, Z + 26, Math.PI / 2, 7, 7, 4.5);
    townNPC(site, 'Schatzmeister Theodoros', -4, 4, { tunic: 0x6b2f7a, pants: 0x3a1a4a, beard: true, hair: 0x9a9080 }, 3);
    townNPC(site, 'Bürger Nikolaos', 10, 26, vil); townNPC(site, 'Bürgerin Thalia', -12, 28, { tunic: 0xb08a5a, pants: 0x5a4a3a, veil: 0x7a3a5a });
  }
  FORCE_BUILD = false;
  finalizeStatic();
}
// Gebäude, Namen und Garnisonen an den aktuellen Zustand anpassen
function syncTowns() {
  const TS = townsState();
  for (const s of TOWN_SITES) {
    const T = TS[s.key], L = LOCS[s.key];
    const target = T ? T.lvl : 0;
    while (builtLvl[s.key] < target) buildTownLevel(s.key, ++builtLvl[s.key]);
    if (!T) { L.name = 'Siedlungsplatz'; L.sub = 'Freier Bauplatz – gründe hier deine Stadt'; }
    else if (isMine(T)) { L.name = T.name; L.sub = TOWN_LEVELS[T.lvl].name + ' – deine Stadt'; }
    else if (isMember(T)) { L.name = T.name; L.sub = 'Verbündete Stadt – du bist Bürger'; }
    else { L.name = T.name; L.sub = (T.owner === 'npc' ? 'Polis der ' : 'Stadt von ') + T.ownerName + ' – eroberbar'; }
    syncGarrison(s.key, T);
  }
}
function garrison(site) { return enemies.filter(e => e.site === site); }
function syncGarrison(site, T) {
  const want = T && !isMine(T) && !isMember(T) && T.lvl > 0 ? Math.min(18, 2 + T.lvl * 2 + (T.def || 0)) : 0;
  const cur = garrison(site);
  const owner = T ? T.ownerName : '';
  if (cur.length && (cur.length !== want || cur[0].owner !== owner) && !(cur.some(e => e.dead) && cur.length === want)) { for (const e of cur) removeEnemy(e); }
  if (want && garrison(site).length === 0) {
    const L = LOCS[site], col = SITE[site].col || 0x8a1a1a;
    for (let i = 0; i < want; i++) {
      const a = i / want * Math.PI * 2, r = 8 + (i % 3) * 6;
      const e = spawnEnemy('soldat', L.x + Math.cos(a) * r, L.z + Math.sin(a) * r, { name: 'Soldat von ' + T.name, col });
      e.site = site; e.owner = owner;
    }
  }
}
function removeEnemy(e) { scene.remove(e.m.root); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); }
function townAction(site, action, extra = {}) {
  if (NET.towns) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(Object.assign({ t: 'town', site, action }, extra))); else toast('Keine Verbindung zum Server – Aktion nicht möglich.'); return; }
  const T = S.towns[site], now = Date.now();
  if (action === 'found') S.towns[site] = { owner: 'me', ownerName: heroName(), name: extra.name, lvl: 1, collected: now };
  if (action === 'upgrade') T.lvl++;
  if (action === 'collect') T.collected = now;
  if (action === 'conquer') { T.owner = 'me'; T.ownerName = heroName(); T.collected = now; T.def = 0; T.members = []; }
  if (action === 'train') T.def = Math.min(10, (T.def || 0) + 2);
  if (action === 'join') T.members = (T.members || []).concat([{ cid: 'me', name: heroName() }]);
  if (action === 'leave') T.members = (T.members || []).filter(m => m.cid !== 'me');
  if (action === 'kick') T.members = (T.members || []).filter(m => m.cid !== extra.member);
  syncTowns(); save();
}
function talkTown(site) {
  const T = townsState()[site], L = TOWN_LEVELS;
  if (!T) {
    talk([{ who: 'Grenzstein', text: 'Fruchtbares Land mit einer Quelle. Hier könntest du eine eigene Stadt gründen! Kosten: 50 Drachmen.', opts: [
      { label: 'Stadt gründen (50 Drachmen)', fn: () => foundTown(site) }, { label: 'Später', fn: () => { } }] }]);
    return;
  }
  const ownerTxt = (T.owner === 'npc' ? 'den ' : '') + T.ownerName;
  if (isMember(T)) {
    const next = L[T.lvl + 1], opts = [];
    if (next) opts.push({ label: 'Beim Ausbau helfen: ' + next.name + ' (' + next.cost + ' Drachmen)', fn: () => upgradeTown(site) });
    opts.push({ label: 'Als Soldat ausbilden lassen (60 Drachmen) – Gefolge ' + allies.length + '/' + MAX_ALLIES, fn: () => { if (allies.length >= MAX_ALLIES) { toast('Dein Gefolge ist voll.'); return; } if (spend(60)) { spawnAlly('buerger'); toast('Ein Bürgersoldat aus ' + T.name + ' folgt dir!', 'gold'); save(); } } });
    if ((T.def || 0) < 10) opts.push({ label: 'Stadtwache mitfinanzieren (100 Drachmen) – Verteidiger ' + (T.def || 0) + '/10', fn: () => { if (spend(100)) { townAction(site, 'train'); toast('Die Stadtwache von ' + T.name + ' wird stärker!', 'gold'); } } });
    opts.push({ label: 'Die Stadt verlassen', fn: () => { townAction(site, 'leave'); toast('Du bist kein Bürger von ' + T.name + ' mehr.'); } }, { label: 'Zurück', fn: () => { } });
    talk([{ who: T.name, text: 'Willkommen zurück, Bürger! ' + T.name + ' gehört ' + ownerTxt + ' (' + L[T.lvl].name + '). Bürger: ' + (T.members || []).map(m => m.name).join(', ') + '. Die Soldaten der Stadt sind deine Verbündeten.', opts }]);
    return;
  }
  if (!isMine(T)) {
    const alive = garrison(site).filter(e => !e.dead).length;
    const loot = townTreasury(T) + (T.owner === 'npc' ? T.lvl * 60 : 0);
    const join = { label: '🤝 ' + T.name + ' beitreten – Bürger werden (50 Drachmen Tribut)', fn: () => { if (spend(50)) { townAction(site, 'join'); banner('Bürger von ' + T.name, 'Die Soldaten der Stadt sind jetzt deine Verbündeten.'); sfx('quest'); } } };
    if (alive) { talk([{ who: 'Grenzstein von ' + T.name, text: T.name + ' gehört ' + ownerTxt + ' (' + L[T.lvl].name + ', ' + (T.members || []).length + ' Bürger). ' + alive + ' Soldaten verteidigen die Stadt. Schließ dich ihr an – oder besiege die Garnison und erobere sie!', opts: [join, { label: 'Später', fn: () => { } }] }]); return; }
    talk([{ who: 'Grenzstein von ' + T.name, text: 'Die Garnison ist geschlagen! ' + T.name + ' liegt dir zu Füßen. In der Schatzkammer liegen ' + loot + ' Drachmen.', opts: [
      { label: '⚔ ' + T.name + ' erobern!', fn: () => { if (loot) addMoney(loot); townAction(site, 'conquer'); addCrime(2); banner(T.name + ' erobert!', 'Die Stadt gehört jetzt dir – baue sie aus und sammle Steuern ein.'); sfx('quest'); } },
      join, { label: 'Noch nicht', fn: () => { } }] }]);
    return;
  }
  const next = L[T.lvl + 1], opts = [], tr = townTreasury(T);
  if (tr >= 1) opts.push({ label: 'Steuern einsammeln (' + tr + ' Drachmen)', fn: () => { addMoney(tr); townAction(site, 'collect'); } });
  if (next) opts.push({ label: 'Ausbauen zur ' + next.name + ' (' + next.cost + ' Drachmen)', fn: () => upgradeTown(site) });
  opts.push({ label: 'Bürger zu Soldaten ausbilden (60 Drachmen) – Gefolge ' + allies.length + '/' + MAX_ALLIES, fn: () => { if (allies.length >= MAX_ALLIES) { toast('Dein Gefolge ist voll (' + MAX_ALLIES + ').'); return; } if (spend(60)) { spawnAlly('buerger'); toast('Ein Bürgersoldat aus ' + T.name + ' folgt dir!', 'gold'); save(); } } });
  if ((T.def || 0) < 10) opts.push({ label: 'Stadtwache trainieren (100 Drachmen) – Verteidiger ' + (T.def || 0) + '/10', fn: () => { if (spend(100)) { townAction(site, 'train'); toast('Die Stadtwache von ' + T.name + ' wird stärker!', 'gold'); } } });
  if ((T.members || []).length) opts.push({ label: 'Bürger verwalten (' + T.members.length + ')', fn: () => talk([{ who: T.name, text: 'Bürger von ' + T.name + ': ' + T.members.map(m => m.name).join(', ') + '. Wen willst du verbannen?', opts: T.members.slice(0, 8).map(m => ({ label: 'Verbannen: ' + m.name, fn: () => townAction(site, 'kick', { member: m.cid }) })).concat([{ label: 'Zurück', fn: () => talkTown(site) }]) }]) });
  opts.push({ label: 'Zurück', fn: () => { } });
  const all = Object.values(townsState()).filter(isMine);
  talk([{ who: T.name, text: T.name + ' – ' + L[T.lvl].name + ' (Stufe ' + T.lvl + '/4). Einnahmen: ' + L[T.lvl].income + ' Drachmen pro Minute. Schatzkammer: ' + tr + ' / ' + townCap(T) + '.' + (next ? ' Ausbau bringt: ' + next.desc + '.' : ' Deine Polis ist vollendet!') + (all.length > 1 ? ' Du herrschst über ' + all.length + ' Städte.' : '') + ' Vorsicht: Andere Helden können deine Stadt erobern!', opts }]);
}
function foundTown(site) {
  if (!spend(TOWN_LEVELS[1].cost)) return;
  let nm = null;
  try { if (document.pointerLockElement) document.exitPointerLock(); nm = window.prompt('Wie soll deine Stadt heißen?', 'Neu-Hellas'); } catch (e) { }
  for (const k in keys) keys[k] = false;
  const name = (nm && nm.trim().slice(0, 24)) || 'Neu-Hellas';
  townAction(site, 'found', { name });
  banner(name + ' gegründet!', 'Baue deine Stadt am Grenzstein aus und sammle Steuern ein.');
  sfx('quest');
}
function upgradeTown(site) {
  const T = townsState()[site], next = TOWN_LEVELS[T.lvl + 1];
  if (!next || !spend(next.cost)) return;
  fadeTo(() => townAction(site, 'upgrade'));
  banner(T.name + ' wird zur ' + next.name + '!', 'Neu: ' + next.desc);
  sfx('quest');
}
const GUARD_LINES = ['Halt! Dies ist heiliger Boden. Benimm dich, Fremder.', 'Die Opfertruhe gehört den Göttern – doch sie belohnen die Mutigen.', 'Man sagt, in vergessenen Tempeln in der Wildnis liegen Relikte der Helden. Aber sie werden bewacht …', 'Ich halte hier Wache, Tag und Nacht.', 'Ruhig bleiben. Keine Waffen im Tempel ziehen.'];
function addGuardNPC(x, z, rot) {
  const n = addNPC('Tempelwache', x, z, { tunic: 0x8e1717, armor: 0xb98d3a, helmet: true, crest: 0x1a1a1a, shield: true, shieldEmblem: 0x1a1a1a, weapon: 'spear', greaves: true, pants: 0x3a1a14 }, function () { talk([{ who: 'Tempelwache', text: pick(GUARD_LINES) }]); }, 0);
  n.yaw = rot;
  return n;
}

// ============================================================
// Gelände erzeugen
// ============================================================
let terrainColorsSRGB = null;
function buildTerrain() {
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) HGT[iz * N + ix] = shapedHeight(-HALF + ix * CELL, -HALF + iz * CELL);
  const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  terrainColorsSRGB = new Uint8ClampedArray(N * N * 3);
  const tc = new THREE.Color();
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const i = iz * N + ix, x = -HALF + ix * CELL, z = -HALF + iz * CELL, h = HGT[i];
    pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
    const hx = HGT[iz * N + Math.min(SEG, ix + 1)] - HGT[iz * N + Math.max(0, ix - 1)];
    const hz = HGT[Math.min(SEG, iz + 1) * N + ix] - HGT[Math.max(0, iz - 1) * N + ix];
    const slope = Math.hypot(hx, hz) / (2 * CELL);
    const c = terrainColor(x, z, h, slope);
    const v = 0.94 + hash(ix, iz) * 0.12;
    tc.setRGB(c[0] * v, c[1] * v, c[2] * v, THREE.SRGBColorSpace);
    col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
    terrainColorsSRGB[i * 3] = c[0] * 255; terrainColorsSRGB[i * 3 + 1] = c[1] * 255; terrainColorsSRGB[i * 3 + 2] = c[2] * 255;
  }
  const idx = new Uint32Array(SEG * SEG * 6);
  let k = 0;
  for (let iz = 0; iz < SEG; iz++) for (let ix = 0; ix < SEG; ix++) {
    const a = iz * N + ix, b = (iz + 1) * N + ix, c = (iz + 1) * N + ix + 1, d = iz * N + ix + 1;
    idx[k++] = a; idx[k++] = b; idx[k++] = d; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}
function findShore(x, z, dx, dz, maxD = 200) {
  const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  let lx = x, lz = z;
  for (let d = 0; d < maxD; d += 1) { const px = x + dx * d, pz = z + dz * d; if (heightAt(px, pz) < -1.6) return { land: [lx, lz], water: [px, pz], dir: [dx, dz] }; if (heightAt(px, pz) > 0.3) { lx = px; lz = pz; } }
  return null;
}

// ============================================================
// Orte bauen
// ============================================================
const SPOTS = {}; // wichtige Positionen
function buildAthens() {
  const A = LOCS.athen;
  // Akropolis
  const pf = new Frame(-4, -42, 0, 22);
  temple(pf, 14, 30, 8, 15, 7.2, { friezeMat: lam(0xc9bda5) });
  statue(-7, -18, Math.PI, 1.6, M.bronze, 22);
  const er = new Frame(14, -36, Math.PI / 2, 22);
  temple(er, 7, 11, 4, 5, 5);
  for (const [x, z] of [[-16, -30], [14, -44], [-18, -46]]) brazier(x, z, 22);
  // Propyläen-Treppe (nach Süden)
  for (let i = 0; i < 9; i++) { const f = new Frame(4, -5 + i * 2.2, 0, 22 - i * 1.8 - 1.8); f.box(M.marble2, 0, -4, 0, 7, 5.8, 2.4); f.platform(0, 0, 7, 2.4, 1.8); }
  reserve(4, 4, 6);
  // Agora
  stoa(new Frame(0, 58, Math.PI), 44, 9, 14, 5);
  SPOTS.agora = [0, 34];
  SPOTS.respawn = [0, 47];
  SPOTS.fountain = [-12, 32];
  fountain(-12, 32);
  statue(12, 40, 0, 1.1);
  for (const [x, z] of [[-20, 22], [20, 22], [-20, 46], [20, 46]]) brazier(x, z);
  // Marktstand
  { const f = new Frame(13, 27, 0); f.box(M.wood, 0, 0, 0, 4, 1, 1.6, true); for (const [x, z] of [[-1.9, -0.7], [1.9, -0.7], [-1.9, 0.7], [1.9, 0.7]]) f.box(M.wood, x, 0, z, 0.15, 2.8, 0.15); f.put(G.box, M.red, 0, 2.9, 0, 0.18, 0, 0, 4.6, 0.1, 2.6); SPOTS.merchant = [13, 29.2]; for (let i = 0; i < 4; i++) f.put(G.sphere, M.terracotta, -1.4 + i * 0.9, 1.3, 0, 0, 0, 0, 0.5, 0.7, 0.5); }
  // Häuser
  for (let gx = -66; gx <= 66; gx += 11) for (let gz = -66; gz <= 72; gz += 11) {
    const x = gx + rr(-2, 2), z = gz + rr(-2, 2);
    if (Math.hypot(x, z + 35) < 55) continue;
    if (Math.abs(x) < 28 && z > 12 && z < 66) continue;
    if (Math.hypot(x, z) > A.r - 4) continue;
    if (roadDist(x, z) < 6) continue;
    if (rand() < 0.22) continue;
    house(x, z, Math.floor(rand() * 4) * Math.PI / 2, rr(5, 7.5), rr(5, 7.5), rr(3.2, 4.6));
  }
  // Olivenhain östlich
  for (let i = 0; i < 60; i++) { const a = rand() * 6.28, d = rr(90, 150); const x = 40 + Math.cos(a) * d * 0.6, z = -90 + Math.sin(a) * d * 0.5; if (heightAt(x, z) > 1.5 && !inCity(x, z)) tree(x, z, 'olive'); }
}
function buildDelphi() {
  const L = LOCS.delphi;
  temple(new Frame(L.x, L.z - 14, 0, L.h), 12, 26, 6, 13, 6.5);
  theatre(new Frame(L.x - 22, L.z - 20, Math.PI / 2, L.h), 8, 7);
  SPOTS.pythia = [L.x, L.z + 4];
  // Dreifuß + Feuer
  brazier(L.x - 3, L.z + 2, L.h); brazier(L.x + 3, L.z + 2, L.h);
  for (const [dx, dz] of [[18, 10], [22, -4], [-14, 18]]) { const f = new Frame(L.x + dx, L.z + dz, Math.PI / 2, L.h); temple(f, 5, 7, 2, 2, 3.5, { noCella: false }); }
  for (let i = 0; i < 5; i++) house(L.x + rr(-35, 35), L.z + rr(14, 38), 0, 5, 5, 3.5);
  statue(L.x + 8, L.z + 14, Math.PI, 1.2);
}
function buildOlympia() {
  const L = LOCS.olympia;
  temple(new Frame(L.x, L.z - 30, 0, L.h), 13, 28, 6, 13, 7, { friezeMat: lam(0xb9a888) });
  statue(L.x + 14, L.z - 18, 0, 1.4, M.gold);
  // Stadion
  const sf = new Frame(L.x, L.z + 26, 0, L.h);
  sf.box(lam(0xc9a978), 0, 0.02, 0, 150, 0.06, 22);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) sf.box(M.stone, 0, 0, s * (12.5 + i * 1.6), 154, 0.6 + i * 0.6, 1.6, true, 0.6 + i * 0.6);
  sf.box(M.white, -68, 0.05, 0, 0.6, 0.08, 21);
  sf.box(M.white, 68, 0.05, 0, 0.6, 0.08, 21);
  for (const z of [-10.5, 10.5]) { sf.box(M.marble, -68, 0, z, 0.5, 1.6, 0.5); sf.box(M.marble, 68, 0, z, 0.5, 1.6, 0.5); }
  SPOTS.raceStart = [L.x - 68, L.z + 26]; SPOTS.raceEnd = [L.x + 68, L.z + 26];
  SPOTS.judge = [L.x - 72, L.z + 20];
  stoa(new Frame(L.x - 30, L.z - 4, Math.PI / 2, L.h), 24, 7, 9, 4.5);
  for (let i = 0; i < 6; i++) house(L.x + rr(20, 55), L.z + rr(-50, 0), Math.floor(rand() * 4) * Math.PI / 2, 6, 6, 4);
  brazier(L.x - 4, L.z - 10); brazier(L.x + 4, L.z - 10);
  for (let i = 0; i < 25; i++) tree(L.x + rr(-70, 70), L.z + rr(-70, -45), rand() < 0.5 ? 'olive' : 'cypress');
}
function buildSparta() {
  const L = LOCS.sparta;
  temple(new Frame(L.x - 30, L.z - 25, Math.PI / 2, L.h), 8, 14, 4, 6, 5, { colMat: M.stone, baseMat: M.stone2, cellaMat: M.stone2 });
  // Kaserne
  const bf = new Frame(L.x + 22, L.z - 18, 0, L.h);
  reserve(bf.x, bf.z, 15);
  bf.box(M.stone, 0, 0, 0, 26, 4, 8, true); bf.put(G.prism, M.roof2, 0, 4, 0, 0, Math.PI / 2, 0, 9, 2, 27);
  SPOTS.leonidas = [L.x, L.z + 2];
  statue(L.x, L.z - 8, 0, 1.4, M.bronze);
  // Übungspuppen
  for (let i = 0; i < 5; i++) { const f = new Frame(L.x + 10 + i * 3.5, L.z + 12, 0, L.h); f.put(G.cyl8, M.wood, 0, 1, 0, 0, 0, 0, 0.25, 2, 0.25); f.box(M.cloth, 0, 1.2, 0, 0.7, 0.8, 0.4); f.put(G.cyl, M.bronze, 0, 1.4, 0.3, Math.PI / 2, 0, 0, 1.0, 0.1, 1.0); circleCol(f.x, f.z, 0.5); }
  for (let gx = -60; gx <= 60; gx += 12) for (let gz = -60; gz <= 60; gz += 12) {
    const x = L.x + gx + rr(-2, 2), z = L.z + gz + rr(-2, 2);
    if (Math.hypot(gx, gz) < 30 || Math.hypot(gx, gz) > L.r - 5 || rand() < 0.35 || roadDist(x, z) < 6) continue;
    house(x, z, Math.floor(rand() * 4) * Math.PI / 2, rr(5, 7), rr(5, 7), rr(3, 4), { wall: lam(0xd9c7a5), roof: M.roof2 });
  }
  brazier(L.x - 5, L.z + 6); brazier(L.x + 5, L.z + 6);
}
let piraeusDock = null, kretaDock = null;
function dock(L, dirx, dirz) {
  const s = findShore(L.x, L.z, dirx, dirz, 260);
  if (!s) return null;
  const [lx, lz] = s.land, [dx, dz] = s.dir;
  const len = 26, rot = Math.atan2(dx, dz);
  const cx = lx + dx * (len / 2 - 2), cz = lz + dz * (len / 2 - 2);
  const f = new Frame(cx, cz, rot, 0);
  reserve(lx, lz, 8);
  f.box(M.wood, 0, 1.0, 0, 4, 0.35, len);
  f.platform(0, 0, 4, len, 1.35);
  for (let i = 0; i < 6; i++) for (const sx of [-1.8, 1.8]) f.put(G.cyl8, M.darkwood, sx, -1.5, -len / 2 + 2 + i * 4.4, 0, 0, 0, 0.35, 5, 0.35);
  // Trireme
  const bx = 5.5;
  const tf = new Frame(...f.w(bx, 3), rot, 0);
  tf.box(M.darkwood, 0, -0.6, 0, 3.4, 1.6, 20);
  tf.put(G.prism, M.darkwood, 0, -0.6, 0, Math.PI, 0, 0, 3.4, 1.2, 20);
  tf.box(M.red, 0, 0.8, 0, 3.5, 0.25, 20.2);
  tf.put(G.cone4, M.bronze, 0, 0, 11, Math.PI / 2, 0, 0, 0.8, 2.4, 0.8);
  tf.put(G.cyl8, M.wood, 0, 5, 0, 0, 0, 0, 0.3, 9, 0.3);
  tf.box(M.sail, 0, 3.2, 0.3, 7, 5, 0.08);
  tf.box(M.red, 0, 5.2, 0.32, 7.05, 0.7, 0.08);
  tf.box(M.wood, 0, 8.6, 0.2, 8, 0.25, 0.25);
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) tf.put(G.cyl8, M.wood, s * 2.6, 0.1, -7 + i * 2, 0, 0, s * 1.2, 0.12, 3.2, 0.12);
  tf.colBox(0, 0, 3.6, 20.5);
  return { land: [lx + dx * 1.5, lz + dz * 1.5], end: f.w(0, len / 2 - 2), boatman: f.w(-1.2, -len / 2 + 3.5), rot };
}
function buildPiraeus() {
  const L = LOCS.piraeus;
  piraeusDock = dock(L, 0, 1);
  for (let i = 0; i < 12; i++) {
    const x = L.x + rr(-34, 10), z = L.z + rr(-30, 30);
    if (roadDist(x, z) < 6 || heightAt(x, z) < 1.2) continue;
    house(x, z, Math.floor(rand() * 4) * Math.PI / 2, rr(5, 7), rr(5, 7), rr(3, 4));
  }
  for (let i = 0; i < 10; i++) { const f = new Frame(L.x + rr(-8, 8), L.z + rr(-14, 14), rand() * 6); if (f.y < 1) continue; f.box(M.wood, 0, 0, 0, 1.2, 1.0, 1.2, true); }
  for (let i = 0; i < 6; i++) { const f = new Frame(L.x + rr(-10, 10), L.z + rr(-14, 14), 0); if (f.y < 1) continue; f.put(G.sphere, M.terracotta, 0, 0.6, 0, 0, 0, 0, 0.8, 1.3, 0.8); }
}
const MAZE = { n: 9, cell: 6, x0: 0, z0: 0 };
function buildKreta() {
  const L = LOCS.kreta;
  kretaDock = dock(L, 0, -1);
  const n = MAZE.n, C = MAZE.cell, x0 = L.x - n * C / 2, z0 = L.z + 4 - n * C / 2;
  MAZE.x0 = x0; MAZE.z0 = z0;
  const hW = [], vW = [];
  for (let r = 0; r <= n; r++) { hW.push(Array(n).fill(true)); }
  for (let r = 0; r < n; r++) { vW.push(Array(n + 1).fill(true)); }
  const vis = Array.from({ length: n }, () => Array(n).fill(false));
  const stack = [[0, n - 1]]; vis[n - 1][0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const nb = [];
    if (r > 0 && !vis[r - 1][c]) nb.push([c, r - 1, 'n']);
    if (r < n - 1 && !vis[r + 1][c]) nb.push([c, r + 1, 's']);
    if (c > 0 && !vis[r][c - 1]) nb.push([c - 1, r, 'w']);
    if (c < n - 1 && !vis[r][c + 1]) nb.push([c + 1, r, 'e']);
    if (!nb.length) { stack.pop(); continue; }
    const [nc, nr, d] = pick(nb);
    if (d === 'n') hW[r][c] = false; if (d === 's') hW[r + 1][c] = false;
    if (d === 'w') vW[r][c] = false; if (d === 'e') vW[r][c + 1] = false;
    vis[nr][nc] = true; stack.push([nc, nr]);
  }
  // Zentralkammer öffnen
  for (let r = 3; r <= 5; r++) for (let c = 3; c <= 5; c++) { if (r > 3) hW[r][c] = false; if (c > 3) vW[r][c] = false; }
  hW[n][4] = false; // Eingang Süden
  const f = new Frame(x0, z0, 0, L.h);
  const wm = lam(0xc4a676), H = 4.5;
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (hW[r][c]) f.box(wm, c * C + C / 2, 0, r * C, C + 0.8, H, 0.8, true);
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (vW[r][c]) f.box(wm, c * C, 0, r * C + C / 2, 0.8, H, C + 0.8, true);
  for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) f.box(M.minoan, c * C, H - 0.4, r * C, 1.0, 0.5, 1.0);
  SPOTS.mazeCenter = [x0 + 4.5 * C, z0 + 4.5 * C];
  reserve(L.x, L.z + 4, 42);
  SPOTS.mazeEntrance = [x0 + 4.5 * C, z0 + n * C + 4];
  // Minoische Säulen am Eingang
  for (const s of [-1, 1]) { const cf = new Frame(SPOTS.mazeEntrance[0] + s * 4, SPOTS.mazeEntrance[1] + 2, 0, L.h); cf.put(G.minoanCol, M.minoan, 0, 2.5, 0, 0, 0, 0, 1, 5, 1); cf.box(M.dark, 0, 5, 0, 1.6, 0.6, 1.6); circleCol(cf.x, cf.z, 0.7); }
  { const gf = new Frame(SPOTS.mazeEntrance[0], SPOTS.mazeEntrance[1] + 2, 0, L.h); gf.box(M.minoan, 0, 5.5, 0, 10, 0.8, 1.4); for (const s of [-1, 1]) gf.put(G.cone, M.white, s * 2.5, 6.6, 0, 0, 0, s * 0.5, 0.5, 1.6, 0.5); }
  for (let i = 0; i < 6; i++) house(L.x + rr(-50, 50), L.z + rr(32, 55) * (rand() < 0.5 ? 1 : -1), 0, 6, 6, 4, { wall: lam(0xe9d9b8), roof: M.minoan });
}
function buildMisc() {
  // Theben
  const T = LOCS.theben;
  for (let i = 0; i < 14; i++) { const x = T.x + rr(-36, 36), z = T.z + rr(-36, 36); if (roadDist(x, z) < 6 || Math.hypot(x - T.x, z - T.z) < 10) continue; house(x, z, Math.floor(rand() * 4) * Math.PI / 2, rr(5, 7), rr(5, 7), rr(3, 4.2)); }
  temple(new Frame(T.x + 6, T.z - 18, Math.PI / 2), 7, 12, 4, 6, 4.5);
  fountain(T.x - 4, T.z + 4);
  SPOTS.thebenFountain = [T.x - 4, T.z + 4];
  // Olymp-Gipfel
  const O = LOCS.olymp;
  tholos(new Frame(O.x, O.z, 0, O.h), 5, 10, 5);
  SPOTS.shrine = [O.x, O.z];
  { const f = new Frame(O.x, O.z, 0, O.h + 1.2); f.box(M.marble2, 0, 0, 0, 1.6, 1.1, 1.6, true); const fm = new THREE.Mesh(G.cone, lam(0x8fd0ff, 0x4aa0ff)); fm.position.set(O.x, O.h + 3.0, O.z); fm.scale.set(0.8, 1.4, 0.8); scene.add(fm); fires.push(fm); }
  // Banditenlager
  const B = LOCS.banditen;
  campfire(B.x, B.z);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const f = new Frame(B.x + Math.cos(a) * 11, B.z + Math.sin(a) * 11, a); f.put(G.cone4, M.tent, 0, 1.6, 0, 0, Math.PI / 4, 0, 4.5, 3.2, 4.5); circleCol(f.x, f.z, 1.8); }
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.abs(a - 1.2) < 0.25) continue; const f = new Frame(B.x + Math.cos(a) * 20, B.z + Math.sin(a) * 20, 0); f.put(G.cone, M.darkwood, 0, 1.3, 0, 0, 0, 0, 0.45, 2.6, 0.45); circleCol(f.x, f.z, 0.35); }
  for (let i = 0; i < 6; i++) { const f = new Frame(B.x + rr(-8, 8), B.z + rr(-8, 8), rand()); f.box(M.wood, 0, 0, 0, 1.1, 0.9, 1.1, true); }
  // Bauernhöfe
  let farms = 0;
  for (let i = 0; i < 400 && farms < 18; i++) {
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z);
    if (h < 3 || h > 40 || slopeAt(x, z) > 0.25 || inCity(x, z, 1.8) || roadDist(x, z) < 10 || roadDist(x, z) > 50) continue;
    house(x, z, rand() * 6.28, 6, 5, 3.5);
    for (let k = 0; k < 14; k++) tree(x + rr(-25, 25), z + rr(-25, 25), 'olive');
    farms++;
  }
}

// ============================================================
// Vegetation (InstancedMesh)
// ============================================================
function buildVegetation() {
  // zufällige Verteilung
  for (let i = 0; i < 44000; i++) {
    const x = rr(-HALF + 20, HALF - 20), z = rr(-HALF + 20, HALF - 20);
    const h = heightAt(x, z);
    if (h < 2 || h > 115) continue;
    if (inCity(x, z, 1.15) || roadDist(x, z) < 5) continue;
    const sl = slopeAt(x, z);
    let dens = fbm(x * 0.006 + 40, z * 0.006, 3) * 0.5 + 0.5;
    let inF = false;
    for (const F of FORESTS) if (Math.hypot(x - F.x, z - F.z) < F.r) { dens += 0.6; inF = true; }
    if (rand() > dens * 0.55) continue;
    if (!isFree(x, z, 0.5)) continue;
    if (sl > 0.9) { if (rand() < 0.5) tree(x, z, 'rock'); continue; }
    const r = rand();
    if (h > 70) tree(x, z, r < 0.6 ? 'pine' : 'rock');
    else if (inF) tree(x, z, r < 0.55 ? 'pine' : r < 0.85 ? 'cypress' : 'bush');
    else tree(x, z, r < 0.35 ? 'olive' : r < 0.55 ? 'cypress' : r < 0.7 ? 'pine' : r < 0.88 ? 'bush' : 'rock');
  }
  const kinds = {
    olive: [{ g: new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6), m: lam(0x6b5236), y: 1.1, s: [1, 1, 1] }, { g: new THREE.IcosahedronGeometry(1.6, 1), m: lam(0x7b8a4c), y: 2.8, s: [1.25, 0.8, 1.25] }],
    cypress: [{ g: new THREE.CylinderGeometry(0.15, 0.22, 1.5, 5), m: lam(0x5a4430), y: 0.75, s: [1, 1, 1] }, { g: new THREE.ConeGeometry(1.0, 8, 8), m: lam(0x2f4b29), y: 5.2, s: [1, 1, 1] }],
    pine: [{ g: new THREE.CylinderGeometry(0.2, 0.32, 5, 6), m: lam(0x6a4a30), y: 2.5, s: [1, 1, 1] }, { g: new THREE.IcosahedronGeometry(2.4, 1), m: lam(0x3f5f2f), y: 5.6, s: [1.4, 0.55, 1.4] }],
    bush: [{ g: new THREE.IcosahedronGeometry(0.9, 0), m: lam(0x5d7036), y: 0.5, s: [1.2, 0.8, 1.2] }],
    rock: [{ g: new THREE.DodecahedronGeometry(1.2, 0), m: lam(0x9c968a), y: 0.4, s: [1.3, 0.8, 1.1] }],
  };
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  for (const [kind, parts] of Object.entries(kinds)) {
    const list = TREES.filter(t => t.kind === kind);
    if (!list.length) continue;
    for (const p of parts) {
      const im = new THREE.InstancedMesh(p.g, p.m, list.length);
      im.castShadow = true; im.receiveShadow = true;
      list.forEach((t, i) => {
        const y = heightAt(t.x, t.z);
        const sc = kind === 'rock' ? t.s * 1.4 : t.s;
        dummy.position.set(t.x, y + p.y * sc - (kind === 'rock' ? 0.3 : 0.05), t.z);
        dummy.rotation.set(kind === 'rock' ? t.r : 0, t.r, 0);
        dummy.scale.set(p.s[0] * sc, p.s[1] * sc, p.s[2] * sc);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        const v = 0.85 + hash(Math.floor(t.x * 10), Math.floor(t.z * 10)) * 0.3;
        col.setRGB(v, v, v); im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
    for (const t of list) if (kind !== 'bush') circleCol(t.x, t.z, kind === 'rock' ? 1.1 * t.s * 1.4 : 0.45);
  }
}

// Wolken
const clouds = [];
function buildClouds() {
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x555555, transparent: true, opacity: 0.92, fog: false });
  for (let i = 0; i < 40; i++) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(rand() * 5);
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(G.sphere, cm); m.position.set(rr(-25, 25), rr(-3, 5), rr(-12, 12)); const s = rr(14, 28); m.scale.set(s * 1.4, s * 0.6, s); g.add(m); }
    g.position.set(rr(-1600, 1600), rr(230, 320), rr(-1600, 1600));
    scene.add(g); clouds.push(g);
  }
}

// ============================================================
// Figuren
// ============================================================
function makeHumanoid(o = {}) {
  const g = new THREE.Group();
  const skin = lam(o.skin ?? 0xc98f5e, o.glow), tunic = lam(o.tunic ?? 0xe8e0cc), belt = lam(o.belt ?? 0x5a3a1a);
  const mesh = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const limb = (w, h, d, mat, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); const m = mesh(new THREE.BoxGeometry(w, h, d), mat, 0, -h / 2, 0, p); return p; };
  const pants = lam(o.pants ?? 0x4a3a2a);
  const legL = limb(0.2, 0.88, 0.22, skin, -0.13, 0.92), legR = limb(0.2, 0.88, 0.22, skin, 0.13, 0.92);
  for (const lg of [legL, legR]) mesh(new THREE.BoxGeometry(0.22, 0.08, 0.32), lam(0x5a3a1a), 0, -0.86, 0.04, lg);
  for (const lg of [legL, legR]) mesh(new THREE.BoxGeometry(0.23, 0.52, 0.25), pants, 0, -0.25, 0, lg);
  if (o.greaves) for (const lg of [legL, legR]) mesh(new THREE.BoxGeometry(0.23, 0.42, 0.24), M.bronze, 0, -0.55, 0.01, lg);
  mesh(new THREE.BoxGeometry(0.5, 0.28, 0.3), pants, 0, 0.98, 0);
  mesh(new THREE.BoxGeometry(0.56, 0.62, 0.32), o.armor ? lam(o.armor) : tunic, 0, 1.39, 0);
  mesh(new THREE.BoxGeometry(0.58, 0.1, 0.34), belt, 0, 1.12, 0);
  if (o.cape) { const c = mesh(new THREE.BoxGeometry(0.62, 1.05, 0.05), lam(o.cape), 0, 1.15, -0.2); c.rotation.x = 0.12; }
  const head = new THREE.Group(); head.position.set(0, 1.88, 0); g.add(head);
  mesh(new THREE.SphereGeometry(0.19, 12, 10), skin, 0, 0, 0, head);
  mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), lam(o.hair ?? 0x2a1a0e), 0, 0.02, -0.02, head);
  if (o.beard) mesh(new THREE.BoxGeometry(0.26, 0.18, 0.12), lam(o.beardCol ?? o.hair ?? 0x2a1a0e), 0, -0.13, 0.12, head);
  if (o.eyes) for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), lam(o.eyes, o.eyes), sx * 0.07, 0.03, 0.18, head);
  if (o.horns) for (const sx of [-1, 1]) { const hn = mesh(new THREE.ConeGeometry(0.05, 0.28, 6), lam(0xe8dcc0), sx * 0.13, 0.2, -0.02, head); hn.rotation.z = -sx * 0.5; }
  if (o.cyclops) { mesh(new THREE.SphereGeometry(0.08, 10, 8), lam(0xffffff), 0, 0.04, 0.16, head); mesh(new THREE.SphereGeometry(0.04, 8, 6), lam(0x101010), 0, 0.04, 0.23, head); }
  if (o.snakes) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const sn = mesh(new THREE.ConeGeometry(0.035, 0.3, 5), lam(0x3a7a2a), Math.cos(a) * 0.17, 0.12, Math.sin(a) * 0.17 - 0.02, head); sn.rotation.z = -Math.cos(a) * 1.0; sn.rotation.x = Math.sin(a) * 1.0; }
  if (o.helmet) {
    mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), o.helmetCol ? lam(o.helmetCol) : M.bronze, 0, 0.0, 0, head);
    mesh(new THREE.BoxGeometry(0.06, 0.24, 0.52), lam(o.crest ?? 0xa01818), 0, 0.27, -0.02, head);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 0.2, 0.16), M.bronze, s * 0.18, -0.1, 0.08, head);
  }
  if (o.veil) mesh(new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), lam(o.veil), 0, 0.02, -0.03, head);
  if (o.wreath) mesh(new THREE.TorusGeometry(0.19, 0.03, 5, 14), lam(0x5a7a2a), 0, 0.1, 0, head).rotation.x = Math.PI / 2;
  if (o.bull) {
    head.scale.set(1.3, 1.3, 1.3);
    mesh(new THREE.BoxGeometry(0.34, 0.3, 0.42), skin, 0, -0.03, 0.12, head);
    mesh(new THREE.BoxGeometry(0.26, 0.18, 0.12), lam(0x2a1a10), 0, -0.1, 0.36, head);
    for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.06, 0.45, 6), lam(0xeee6d0), s * 0.3, 0.16, 0.05, head); h.rotation.z = -s * 1.1; }
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.03, 6, 4), lam(0xff3010, 0xff2000), s * 0.1, 0.04, 0.33, head);
  }
  const armL = limb(0.15, 0.64, 0.15, skin, -0.37, 1.66), armR = limb(0.15, 0.64, 0.15, skin, 0.37, 1.66);
  let weapon = null, shield = null;
  if (o.shield && o.weapon !== 'bow') { shield = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 18), lam(o.shieldCol ?? 0xb98d3a), -0.05, -0.42, 0.16, armL); shield.rotation.z = Math.PI / 2; shield.rotation.y = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), lam(o.shieldEmblem ?? 0x8a1a1a), 0, 0.04, 0, shield); }
  if (o.weapon === 'dagger') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); mesh(new THREE.BoxGeometry(0.05, 0.03, 0.38), lam(0xd8d8d0), 0, 0, 0.28, weapon); mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), M.bronze, 0, 0, 0.07, weapon); }
  if (o.weapon === 'sword') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); mesh(new THREE.BoxGeometry(0.07, 0.04, 0.85), lam(0xd8d8d0), 0, 0, 0.5, weapon); mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), M.bronze, 0, 0, 0.08, weapon); }
  if (o.weapon === 'spear') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), M.wood, 0, 0, 0.6, weapon).rotation.x = Math.PI / 2; mesh(new THREE.ConeGeometry(0.07, 0.3, 6), lam(0xd8d8d0), 0, 0, 2.0, weapon).rotation.x = Math.PI / 2; }
  if (o.weapon === 'axe') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M.wood, 0, 0, 0.5, weapon).rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.42, 0.3), lam(0x9a9a9a), 0, s * 0.2, 1.05, weapon); }
  if (o.weapon === 'fireSword') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); mesh(new THREE.BoxGeometry(0.1, 0.05, 1.15), lam(0xff8a30, 0xff4a00), 0, 0, 0.65, weapon); mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), M.gold, 0, 0, 0.08, weapon); }
  if (o.weapon === 'trident') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), lam(0x2a8a8a), 0, 0, 0.6, weapon).rotation.x = Math.PI / 2; for (const sx of [-0.12, 0, 0.12]) mesh(new THREE.ConeGeometry(0.04, 0.4, 5), M.gold, sx, 0, 2.05, weapon).rotation.x = Math.PI / 2; mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), M.gold, 0, 0, 1.85, weapon); }
  if (o.weapon === 'bow') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armL.add(weapon); const R = 0.55, arcG = new THREE.TorusGeometry(R, 0.035, 6, 18, Math.PI); arcG.rotateZ(Math.PI); arcG.rotateY(Math.PI / 2); const arc = mesh(arcG, M.darkwood, 0, R * 0.55, 0, weapon); arc.scale.set(1, 0.55, 1); mesh(new THREE.BoxGeometry(0.012, 0.012, R * 2), lam(0xf2ecdc), 0, R * 0.55, 0, weapon); mesh(new THREE.BoxGeometry(0.09, 0.14, 0.09), lam(0x3a2a1a), 0, 0, 0, weapon); }
  if (o.weapon === 'keraunos') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); const bm = lam(0xfff6a0, 0xffd020); [[0, 0.2, 0.5], [0.1, 0.55, -0.6], [0, 0.95, 0.5]].forEach(([x, z, r]) => { const m = mesh(new THREE.BoxGeometry(0.09, 0.09, 0.45), bm, x, 0, z, weapon); m.rotation.y = r; }); }
  if (o.weapon === 'club') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.16, 0.06, 1.3, 7), M.darkwood, 0, 0, 0.55, weapon).rotation.x = Math.PI / 2; }
  if (o.weapon === 'staff') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), M.darkwood, 0, 0.3, 0.05, weapon); }
  if (o.scale) g.scale.setScalar(o.scale);
  return { root: g, legL, legR, armL, armR, head, weapon, shield, phase: rand() * 6 };
}
function animateHumanoid(h, speed, dt, opt = {}) {
  h.phase += dt * (speed > 0.1 ? 2.2 + speed * 0.75 : 0);
  const amp = Math.min(1, speed / 6) * 0.75;
  const s = Math.sin(h.phase) * amp;
  if (!opt.sitting) { h.legL.rotation.x = s; h.legR.rotation.x = -s; h.legL.rotation.z = 0; h.legR.rotation.z = 0; }
  else { h.legL.rotation.x = -1.3; h.legR.rotation.x = -1.3; h.legL.rotation.z = -0.35; h.legR.rotation.z = 0.35; }
  h.armL.rotation.x = opt.block ? -1.35 : (opt.sitting ? -0.5 : -s * 0.8);
  h.armL.rotation.z = opt.block ? 0.5 : 0;
  if (opt.attack !== undefined && opt.attack > 0) { const t = 1 - opt.attack; h.armR.rotation.x = t < 0.35 ? lerp(-0.3, -2.7, t / 0.35) : lerp(-2.7, -0.4, (t - 0.35) / 0.65); }
  else h.armR.rotation.x = opt.sitting ? -0.6 : s * 0.8 - (h.weapon ? 0.25 : 0);
  if (opt.idleTalk) h.armR.rotation.x = -0.6 + Math.sin(performance.now() / 300) * 0.25;
  if (opt.bow) { h.armL.rotation.x = -1.5; h.armL.rotation.z = 0; h.armR.rotation.x = -1.35; h.armR.rotation.z = -0.55 + (opt.attack > 0 ? opt.attack * 0.4 : 0); }
}
function makeWolf(col = 0x6e6a64, heads = 1) {
  const g = new THREE.Group(), m = lam(col), d = lam(0x3c3a36);
  const add = (geo, mat, x, y, z, p = g) => { const mm = new THREE.Mesh(geo, mat); mm.position.set(x, y, z); mm.castShadow = true; p.add(mm); return mm; };
  add(new THREE.BoxGeometry(0.5, 0.5, 1.25), m, 0, 0.8, 0);
  add(new THREE.BoxGeometry(0.55, 0.58, 0.5), m, 0, 0.88, 0.42);
  const headsArr = [];
  for (let hi = 0; hi < heads; hi++) {
    const off = heads === 1 ? 0 : (hi - 1) * 0.34;
    const head = new THREE.Group(); head.position.set(off, 1.0, 0.78 - Math.abs(off) * 0.3); head.rotation.y = -off * 0.8; g.add(head);
    add(new THREE.BoxGeometry(0.36, 0.34, 0.38), m, 0, 0, 0, head);
    add(new THREE.BoxGeometry(0.2, 0.17, 0.32), d, 0, -0.07, 0.32, head);
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.07, 0.18, 4), d, s * 0.12, 0.24, -0.05, head);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.035, 6, 4), heads > 1 ? lam(0xff3010, 0xff2000) : lam(0xffd040, 0x806000), s * 0.1, 0.05, 0.19, head);
    headsArr.push(head);
  }
  const head = headsArr[heads === 1 ? 0 : 1];
  const tail = add(new THREE.BoxGeometry(0.12, 0.12, 0.6), m, 0, 0.9, -0.85); tail.rotation.x = 0.6;
  const legs = [];
  for (const [x, z] of [[-0.17, 0.45], [0.17, 0.45], [-0.17, -0.45], [0.17, -0.45]]) { const p = new THREE.Group(); p.position.set(x, 0.6, z); g.add(p); add(new THREE.BoxGeometry(0.13, 0.6, 0.13), m, 0, -0.3, 0, p); legs.push(p); }
  return { root: g, legs, head, heads: headsArr, tail, phase: 0 };
}
function makeHorse(col = 0x6b4325, saddle = true) {
  const g = new THREE.Group(), m = lam(col), d = lam(col === 0x6b4325 ? 0x2a1a10 : 0xd8d0c0);
  const add = (geo, mat, x, y, z, p = g) => { const mm = new THREE.Mesh(geo, mat); mm.position.set(x, y, z); mm.castShadow = true; p.add(mm); return mm; };
  add(new THREE.BoxGeometry(0.75, 0.75, 1.9), m, 0, 1.4, 0);
  const neck = add(new THREE.BoxGeometry(0.38, 0.95, 0.45), m, 0, 2.0, 0.9); neck.rotation.x = 0.55;
  add(new THREE.BoxGeometry(0.34, 0.36, 0.72), m, 0, 2.38, 1.38);
  add(new THREE.BoxGeometry(0.1, 0.7, 0.5), d, 0, 2.2, 0.9).rotation.x = 0.55;
  if (saddle) add(new THREE.BoxGeometry(0.8, 0.12, 0.8), M.red, 0, 1.82, -0.05);
  const tail = add(new THREE.BoxGeometry(0.15, 0.8, 0.15), d, 0, 1.3, -1.05); tail.rotation.x = 0.35;
  const legs = [];
  for (const [x, z] of [[-0.25, 0.75], [0.25, 0.75], [-0.25, -0.75], [0.25, -0.75]]) { const p = new THREE.Group(); p.position.set(x, 1.1, z); g.add(p); add(new THREE.BoxGeometry(0.16, 1.1, 0.16), m, 0, -0.55, 0, p); add(new THREE.BoxGeometry(0.18, 0.12, 0.2), d, 0, -1.06, 0.01, p); legs.push(p); }
  return { root: g, legs, tail, phase: 0 };
}
function animateQuad(q, speed, dt, k = 2.2) {
  q.phase += dt * (speed > 0.1 ? 3 + speed * 0.5 : 0);
  const a = Math.min(1, speed / 8) * 0.8, s = Math.sin(q.phase) * a;
  q.legs[0].rotation.x = s; q.legs[3].rotation.x = s; q.legs[1].rotation.x = -s; q.legs[2].rotation.x = -s;
  if (q.tail) q.tail.rotation.z = Math.sin(performance.now() / 250) * 0.2;
}

// ============================================================
// Spielzustand
// ============================================================
const player = {
  pos: new V3(0, 10, 26), vy: 0, yaw: Math.PI, onGround: false, hp: 100, maxHp: 100, stamina: 100,
  money: 20, potions: 1, dmg: 14, blessed: false, mounted: false, blocking: false, atkCd: 0, atkAnim: 0,
  lastHurt: -99, swimming: false, dead: false, zapCd: 0, speedNow: 0, hasArmor: false, hasBlade: false, shieldTier: 0, relics: [], gear: [], hasShip: false, chiron: false, wTier: 0, aTier: 0, horse: 'gaul', horses: ['gaul'], shipTier: 0, wanted: 0, adminFly: false, up: {}, skins: ['standard'], skin: 'standard', bowMode: false, flying: false, sailing: false, stoned: 0, medCd: 0,
};
const S = { stage: 0, olives: 0, wolves: 0, bandits: 0, amph: [], raceBest: null, time: 0.32, played: 0, chests: [], found: [], towns: defaultTowns(), bossDead: [], foundD: [], quiz: [], bounty: null, olympia: {}, zeus: 0, zeusKills: 0, altars: [] };
let hero, horse;
const npcs = [], enemies = [], pickups = [], floaters = [], bolts = [];
let race = null, dialog = null, started = false, paused = false, mapOpen = false;
const keys = {};
let camYaw = 0, camPitch = 0.32, camZoom = 1;
const mouse = { left: false, right: false };

// ---------- UI ----------
function toast(msg, cls = '') { const d = document.createElement('div'); d.className = 'toast panel ' + cls; d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = 0; setTimeout(() => d.remove(), 500); }, 3200); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
let locTimer = 0;
function showLoc(L) { $('locName').innerHTML = L.name + (L.sub ? '<small>' + L.sub + '</small>' : ''); $('locName').style.opacity = 1; locTimer = 3.2; }
let bannerTimer = 0;
function banner(title, sub) { $('banner').querySelector('h2').textContent = title; $('banner').querySelector('div').textContent = sub; $('banner').style.opacity = 1; bannerTimer = 4.5; }
function fadeTo(fn) { $('fade').style.opacity = 1; setTimeout(() => { fn(); setTimeout(() => { $('fade').style.opacity = 0; }, 250); }, 650); }
function floatText(x, y, z, text, color = '#fff', big = false) { floaters.push({ p: new V3(x, y, z), text, color, t: 1.2, big }); }

// ---------- Audio ----------
let actx = null;
function sfx(type) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const P = { hit: [200, 60, 0.15, 'sawtooth', 0.12], swing: [500, 140, 0.12, 'triangle', 0.05], coin: [880, 1400, 0.14, 'square', 0.035], quest: [523, 1046, 0.7, 'triangle', 0.1], hurt: [140, 50, 0.25, 'square', 0.08], zap: [1800, 60, 0.6, 'sawtooth', 0.12], block: [900, 700, 0.08, 'square', 0.05], drink: [300, 700, 0.3, 'sine', 0.1] }[type];
    if (!P) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
    g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.0008, t + P[2]);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + P[2] + 0.05);
  } catch (e) { /* kein Audio */ }
}

// ---------- Dialog ----------
// Ein Dialog ist eine Liste von Seiten: { who, text, opts:[{label, fn}] }
function talk(pages) { dialog = { pages, i: 0 }; renderDialog(); }
function renderDialog() {
  if (!dialog) { $('dialog').classList.add('hidden'); return; }
  const p = dialog.pages[dialog.i];
  $('dialog').classList.remove('hidden');
  $('dlgName').textContent = p.who || '';
  $('dlgText').textContent = p.text;
  const o = $('dlgOpts'); o.innerHTML = '';
  if (p.opts) {
    p.opts.forEach((op, i) => { const b = document.createElement('button'); b.textContent = (i + 1) + '. ' + op.label; b.onclick = (e) => { e.stopPropagation(); chooseOpt(i); }; o.appendChild(b); });
    $('dlgHint').textContent = 'Wähle mit 1–' + p.opts.length + ' · Esc schließen';
  } else $('dlgHint').textContent = '[E] Weiter';
}
function advanceDialog() {
  if (!dialog) return;
  const p = dialog.pages[dialog.i];
  if (p.opts) return;
  if (p.fn) p.fn();
  if (!dialog || dialog.pages[dialog.i] !== p) return; // fn hat neuen Dialog gestartet
  dialog.i++;
  if (dialog.i >= dialog.pages.length) dialog = null;
  renderDialog();
}
function chooseOpt(i) {
  if (!dialog) return;
  const p = dialog.pages[dialog.i];
  if (!p.opts || !p.opts[i]) return;
  const before = dialog;
  dialog = null;
  p.opts[i].fn && p.opts[i].fn();
  if (dialog === null && before) renderDialog();
}

// ---------- Quests ----------
const STAGES = [
  () => 'Sprich mit dem Ältesten Perikles auf der Agora von Athen.',
  () => `Sammle heilige Oliven im Hain nordöstlich von Athen (${S.olives}/5).`,
  () => 'Bringe die Oliven zu Perikles auf der Agora.',
  () => 'Reise nach Delphi (Nordwesten) und befrage die Pythia.',
  () => `Besiege Wölfe in den Wäldern (${S.wolves}/5).`,
  () => 'Kehre zur Pythia in Delphi zurück.',
  () => 'Reise nach Sparta (Süden) und sprich mit Leonidas.',
  () => `Vertreibe die Banditen aus ihrem Lager östlich von Sparta (${S.bandits}/4).`,
  () => 'Berichte Leonidas in Sparta von deinem Sieg.',
  () => 'Erklimme den Olymp (Norden) und bete am Schrein des Zeus.',
  () => 'Segle von Piräus nach Kreta und besiege den Minotauros im Labyrinth.',
  () => 'Kehre als Held zu Perikles nach Athen zurück.',
  () => 'Hellas gehört dir. Erkunde die Welt, sammle Amphoren und lauf in Olympia um die Wette!',
];
function setStage(s) { S.stage = s; $('questText').textContent = STAGES[s](); sfx('quest'); if (s === 1) spawnOlives(); save(); }
function updateQuestText() { $('questText').textContent = STAGES[S.stage](); }
function questTarget() {
  if (curD) return null;
  const nearestOf = (arr) => { let b = null, bd = 1e9; for (const a of arr) { const d = Math.hypot(a.x - player.pos.x, a.z - player.pos.z); if (d < bd) { bd = d; b = a; } } return b; };
  switch (S.stage) {
    case 0: case 2: case 11: return { x: SPOTS.agora[0], z: SPOTS.agora[1] };
    case 1: { const o = nearestOf(pickups.filter(p => p.kind === 'olive' && !p.taken)); return o ? { x: o.x, z: o.z } : null; }
    case 3: case 5: return { x: SPOTS.pythia[0], z: SPOTS.pythia[1] };
    case 4: { const w = nearestOf(enemies.filter(e => e.type === 'wolf' && !e.dead)); return w ? { x: w.x, z: w.z } : null; }
    case 6: case 8: return { x: SPOTS.leonidas[0], z: SPOTS.leonidas[1] };
    case 7: return { x: LOCS.banditen.x, z: LOCS.banditen.z };
    case 9: return { x: SPOTS.shrine[0], z: SPOTS.shrine[1] };
    case 10: {
      const onCrete = Math.hypot(player.pos.x - LOCS.kreta.x, player.pos.z - LOCS.kreta.z) < 260;
      if (!onCrete) return piraeusDock ? { x: piraeusDock.boatman[0], z: piraeusDock.boatman[1] } : null;
      const inMaze = player.pos.x > MAZE.x0 - 2 && player.pos.x < MAZE.x0 + 56 && player.pos.z > MAZE.z0 - 2 && player.pos.z < MAZE.z0 + 56;
      return inMaze ? { x: SPOTS.mazeCenter[0], z: SPOTS.mazeCenter[1] } : { x: SPOTS.mazeEntrance[0], z: SPOTS.mazeEntrance[1] };
    }
  }
  return null;
}

// ---------- Speichern ----------
function saveData() {
    const sp = curD ? { x: curD.out[0], z: curD.out[1] } : player.pos;
  return ({ v: 3, S, p: { x: sp.x, z: sp.z, hp: player.hp, maxHp: player.maxHp, money: player.money, potions: player.potions, dmg: player.dmg, blessed: player.blessed, hasArmor: player.hasArmor, hasBlade: player.hasBlade, relics: player.relics, shieldTier: player.shieldTier, gear: player.gear, hasShip: player.hasShip, chiron: player.chiron, wTier: player.wTier, aTier: player.aTier, horse: player.horse, horses: player.horses, shipTier: player.shipTier, wanted: player.wanted, allies: allies.map(a => ({ type: a.type, hp: Math.round(a.hp) })), up: player.up, skins: player.skins, skin: player.skin } });
}
function save() {
  try { localStorage.setItem(saveKey(), JSON.stringify(saveData())); } catch (e) { /* ignorieren */ }
  cloudSave(false);
}
function loadSave() { try { const s = localStorage.getItem(saveKey()); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

// ============================================================
// NPCs
// ============================================================
const VILLAGER_LINES = [
  'Chaire, Fremder! Die Götter seien mit dir.', 'Hast du die neue Statue der Athene gesehen? Ganz aus Bronze!',
  'Man sagt, auf Kreta haust ein Ungeheuer, halb Mensch, halb Stier.', 'Die Oliven sind dieses Jahr prächtig.',
  'Pass auf in den Wäldern – die Wölfe sind hungrig geworden.', 'In Olympia laufen die schnellsten Männer von Hellas.',
  'Sokrates stellt schon wieder allen Leuten Fragen …', 'Nimm die Straße, Wanderer. Abseits lauern Banditen.',
  'Zeus wohnt auf dem Olymp, ganz im Norden. Kein Sterblicher hat den Gipfel erklommen.',
  'Ein Schluck aus dem Brunnen erfrischt Körper und Geist.', 'Die Spartaner? Harte Leute. Sie essen schwarze Suppe!',
  'Ich hätte gern ein Pferd wie deins. Pfeif einfach, und es kommt.',
];
function addNPC(name, x, z, look, talkFn, wander = 0) {
  const h = look.model || makeHumanoid(look);
  h.root.position.set(x, groundAt(x, z), z);
  scene.add(h.root);
  const n = { name, h, x, z, home: [x, z], wander, tx: x, tz: z, wt: rr(1, 5), talkFn, yaw: rand() * 6.28, talking: 0 };
  npcs.push(n);
  interactables.push({ pos: () => n.h.root.position, label: 'Sprechen: ' + name.split(',')[0], fn: () => { n.talking = 2.5; n.talkFn.call(n); }, npc: n });
  return n;
}
function buildNPCs() {
  for (const [gx, gz, gr] of TEMPLE_GUARDS) addGuardNPC(gx, gz, gr);
  TEMPLE_GUARDS.length = 0;
  const [ax, az] = SPOTS.agora;
  addNPC('Perikles, der Älteste', ax, az, { tunic: 0xf2ecdc, beard: true, hair: 0xb8b0a0, cape: 0x6b2f7a, weapon: 'staff' }, talkPerikles);
  addNPC('Kleon, der Händler', SPOTS.merchant[0], SPOTS.merchant[1], { tunic: 0x2f6a5a, beard: true, hair: 0x2a1a0e }, talkMerchant);
  addNPC('Pythia, das Orakel', SPOTS.pythia[0], SPOTS.pythia[1], { tunic: 0xf4f0e6, veil: 0xf4f0e6, skin: 0xe0b08a, wreath: true }, talkPythia);
  addNPC('Leonidas', SPOTS.leonidas[0], SPOTS.leonidas[1], { tunic: 0x8e1717, armor: 0xb98d3a, helmet: true, crest: 0xa01818, beard: true, shield: true, shieldEmblem: 0x8a1a1a, weapon: 'spear', cape: 0x8e1717, greaves: true, pants: 0x4a1414, scale: 1.08 }, talkLeonidas);
  addNPC('Kampfrichter', SPOTS.judge[0], SPOTS.judge[1], { tunic: 0x3a5a9a, beard: true, hair: 0x6a5a4a, wreath: true, weapon: 'staff' }, talkJudge);
  if (piraeusDock) addNPC('Fährmann Nikias', piraeusDock.boatman[0], piraeusDock.boatman[1], { tunic: 0x6a5a3a, beard: true, hair: 0x3a2a1a }, () => talkFerry('piraeus'));
  if (kretaDock) addNPC('Fährmann Minos', kretaDock.boatman[0], kretaDock.boatman[1], { tunic: 0xa8302a, beard: true }, () => talkFerry('kreta'));
  const tunics = [0xe8e0cc, 0x9b3b2b, 0x3a5a8a, 0x7a6a3a, 0xcfc4a8, 0x5a7a4a, 0xb08a5a];
  for (const [key, n] of [['athen', 9], ['sparta', 4], ['delphi', 3], ['piraeus', 4], ['olympia', 4], ['theben', 4], ['kreta', 3]]) {
    const L = LOCS[key];
    for (let i = 0; i < n; i++) {
      let x, z, t = 0; do { x = L.x + rr(-L.r * 0.6, L.r * 0.6); z = L.z + rr(-L.r * 0.6, L.r * 0.6); t++; } while (t < 20 && (heightAt(x, z) < 1 || (key === 'athen' && Math.hypot(x, z + 35) < 30)));
      const female = rand() < 0.45;
      const line = pick(VILLAGER_LINES);
      addNPC(female ? pick(['Ariadne', 'Phoibe', 'Kalliope', 'Thalia', 'Eirene', 'Melina']) : pick(['Demetrios', 'Nikolaos', 'Alexios', 'Kostas', 'Theodoros', 'Stavros']),
        x, z, { tunic: pick(tunics), hair: pick([0x2a1a0e, 0x4a2a1a, 0x1a1008, 0x6a4a2a]), beard: !female && rand() < 0.6, veil: female && rand() < 0.5 ? pick([0xe8dcc0, 0x7a3a5a, 0x3a5a8a]) : null, skin: pick([0xc98f5e, 0xb57a4c, 0xd9a577]) },
        function () { talk([{ who: this.name, text: line }]); }, 14);
    }
  }
}
function talkPerikles() {
  const W = 'Perikles';
  if (S.stage === 0) talk([
    { who: W, text: 'Chaire, junger Held! Endlich bist du da. Hellas braucht jemanden mit Mut und starkem Arm.' },
    { who: W, text: 'Die Götter sind unruhig. Bevor wir sie um Rat fragen, müssen wir ihnen ein Opfer bringen.' },
    { who: W, text: 'Sammle fünf heilige Oliven im Hain nordöstlich der Akropolis. Sie leuchten golden im Licht der Athene.', fn: () => setStage(1) },
  ]);
  else if (S.stage === 1) talk([{ who: W, text: `Du hast ${S.olives} von 5 Oliven. Der Hain liegt nordöstlich – folge dem goldenen Zeichen.` }]);
  else if (S.stage === 2) talk([
    { who: W, text: 'Wunderbar! Athene wird zufrieden sein. Hier, nimm diese Drachmen für deine Mühe.', fn: () => { addMoney(30); player.potions += 1; toast('+1 Ambrosia', 'gold'); } },
    { who: W, text: 'Nun reise nach Delphi im Nordwesten, hinter Theben. Die Pythia wird dir sagen, was die Götter verlangen.' },
    { who: W, text: 'Tipp: Drücke R, um dein Pferd zu rufen. Mit deinem kleinen Dolch kommst du nicht weit – der Schmied verkauft Schwerter, Schilde und Rüstungen. Und die Gelehrten belohnen kluge Köpfe mit Geschenken!' },
    { who: W, text: 'Noch etwas: Überall in Hellas gibt es freie Siedlungsplätze – zum Beispiel bei Pylos, Larissa, Pella und auf Lesbos. Dort kannst du am Grenzstein deine eigene Stadt gründen. Und in den Tempeln von Hellas warten Opfergaben auf Helden!', fn: () => setStage(3) },
  ]);
  else if (S.stage === 11) talk([
    { who: W, text: 'Bei Zeus! Der Minotauros ist tot? Ganz Athen wird deinen Namen besingen!' },
    { who: W, text: 'Du bist nun ein wahrer Held von Hellas. Nimm diesen Lorbeerkranz – und diese Truhe voller Drachmen.', fn: () => { addMoney(200); setStage(12); banner('HELD VON HELLAS', 'Die Sage ist vollbracht – doch die Welt wartet auf dich.'); } },
  ]);
  else talk([{ who: W, text: pick(['Die Götter beobachten dich, Held.', 'Vergiss nicht: Mut ohne Weisheit ist wie ein Schiff ohne Steuer.', 'Athen ist stolz auf dich.']) }]);
}
function talkMerchant() {
  const W = 'Kleon';
  const opts = [
    { label: 'Ambrosia-Trank kaufen (15 Drachmen)', fn: () => { if (spend(15)) { player.potions++; toast('+1 Ambrosia', 'gold'); } talkMerchant(); } },
    { label: player.hasArmor ? 'Bronzepanzer (bereits gekauft)' : 'Bronzepanzer: +50 Leben (80 Drachmen)', fn: () => { if (!player.hasArmor && spend(80)) { player.hasArmor = true; player.maxHp += 50; player.hp = player.maxHp; toast('Bronzepanzer angelegt! Max. Leben +50', 'gold'); refreshHeroLook(); } talkMerchant(); } },
    { label: player.hasBlade ? 'Geschliffene Klinge (bereits gekauft)' : 'Geschliffene Klinge: +6 Schaden (60 Drachmen)', fn: () => { if (!player.hasBlade && spend(60)) { player.hasBlade = true; player.dmg += 6; toast('Deine Klinge ist schärfer! Schaden +6', 'gold'); } talkMerchant(); } },
    { label: 'Auf Wiedersehen', fn: () => { } },
  ];
  talk([{ who: W, text: `Willkommen an meinem Stand! Du hast ${player.money} Drachmen. Was darf es sein?`, opts }]);
}
function talkPythia() {
  const W = 'Pythia';
  if (S.stage === 3) talk([
    { who: W, text: '… Die Dämpfe sprechen … Ich sehe dich, Wanderer aus Athen.' },
    { who: W, text: 'Apollon verlangt einen Beweis deiner Stärke. Die Wölfe in den dunklen Wäldern bedrohen die Pilger.' },
    { who: W, text: 'Besiege fünf von ihnen. Dann kehre zurück, und ich werde dir dein Schicksal enthüllen.', fn: () => setStage(4) },
  ]);
  else if (S.stage === 4) talk([{ who: W, text: `Noch streifen Wölfe umher … (${S.wolves}/5). Die Wälder um Delphi und im Westen sind voll von ihnen.` }]);
  else if (S.stage === 5) talk([
    { who: W, text: 'Apollon ist zufrieden. Höre nun die Prophezeiung:' },
    { who: W, text: '„Wo Bronze singt und Männer nicht weichen, dort lernst du Mut. Wo der Göttervater thront, empfängst du Macht. Wo der Stier im Dunkeln brüllt, wirst du zum Helden.“' },
    { who: W, text: 'Geh zuerst nach Sparta im Süden. Leonidas wird dich prüfen.', fn: () => { addMoney(40); setStage(6); } },
  ]);
  else talk([{ who: W, text: pick(['Erkenne dich selbst.', 'Nichts im Übermaß.', 'Die Zukunft ist wie Rauch – sie zeigt sich nur dem, der geduldig ist.']) }]);
}
function talkLeonidas() {
  const W = 'Leonidas';
  if (S.stage === 6) talk([
    { who: W, text: 'Ein Athener? Hier in Sparta zählen keine Worte, nur Taten.' },
    { who: W, text: 'Östlich der Stadt haben sich Banditen verschanzt. Sie überfallen unsere Händler.' },
    { who: W, text: 'Vertreibe vier von ihnen, und ich nenne dich einen Krieger. Halte dein Schild hoch – rechte Maustaste!', fn: () => { S.bandits = 0; setStage(7); } },
  ]);
  else if (S.stage === 7) talk([{ who: W, text: `Ich höre noch keine Siegesrufe. (${S.bandits}/4)` }]);
  else if (S.stage === 8) talk([
    { who: W, text: 'Ha! Du kämpfst wie ein Spartaner. Nimm diesen Speerschliff – deine Waffe wird tödlicher sein.', fn: () => { player.dmg += 8; toast('Spartanische Ausbildung: Schaden +8', 'gold'); addMoney(50); } },
    { who: W, text: 'Doch gegen das Ungeheuer auf Kreta brauchst du mehr als Stahl. Erklimme den Olymp im fernen Norden und bitte Zeus um seinen Segen.', fn: () => setStage(9) },
  ]);
  else talk([{ who: W, text: pick(['Komm mit deinem Schild zurück – oder auf ihm.', 'Ein Spartaner fragt nicht, wie viele Feinde es sind, sondern wo sie sind.', 'Trainiere hart. Der Kampf verzeiht keine Schwäche.']) }]);
}
function prayShrine() {
  if (S.zeus === 4) { zeusShrine(); return; }
  if (S.stage === 9) talk([
    { who: 'Stimme des Zeus', text: 'STERBLICHER. Du hast den Gipfel erklommen, den nur Götter betreten.' },
    { who: 'Stimme des Zeus', text: 'Deine Taten sind mir nicht verborgen geblieben. Nimm meinen Blitz – drücke Q, und der Himmel wird für dich sprechen.', fn: () => { player.blessed = true; player.maxHp += 30; player.hp = player.maxHp; flash = 1; sfx('zap'); toast('Segen des Zeus: Blitz (Q) & +30 Leben', 'gold'); } },
    { who: 'Stimme des Zeus', text: 'Nun geh nach Kreta. Der Fährmann in Piräus bringt dich hin. Töte das Ungeheuer, das Minos im Labyrinth verbirgt.', fn: () => setStage(10) },
  ]);
  else if (player.blessed) talk([{ who: 'Schrein des Zeus', text: 'Die blaue Flamme brennt ewig. Du fühlst dich gestärkt.', fn: () => { player.hp = player.maxHp; } }]);
  else talk([{ who: 'Schrein des Zeus', text: 'Eine blaue Flamme brennt auf dem Altar. Du spürst eine gewaltige Macht … doch die Götter schweigen noch.' }]);
}
function addMoney(n) { player.money += n; toast('+' + n + ' Drachmen', 'gold'); sfx('coin'); }
function spend(n) { if (player.money < n) { toast('Nicht genug Drachmen!'); return false; } player.money -= n; sfx('coin'); return true; }

const interactables = [];
function buildInteractables() {
  interactables.push({ pos: () => new V3(SPOTS.shrine[0], LOCS.olymp.h + 1.2, SPOTS.shrine[1] + 0.0), label: 'Am Schrein beten', fn: prayShrine, r: 4.5 });
  for (const f of [SPOTS.fountain, SPOTS.thebenFountain]) interactables.push({ pos: () => new V3(f[0], heightAt(f[0], f[1]), f[1]), label: 'Aus dem Brunnen trinken', r: 4.2, fn: () => { player.hp = player.maxHp; player.stamina = 100; toast('Du fühlst dich erfrischt. Leben voll.'); sfx('drink'); } });
}

// ============================================================
// Gegner
// ============================================================
const EDEF = {
  wolf: { hp: 38, dmg: 7, speed: 9.5, range: 1.9, aggro: 26, cd: 1.2, name: 'Wolf', money: [0, 3], r: 0.6 },
  bandit: { hp: 65, dmg: 11, speed: 6.5, range: 2.1, aggro: 24, cd: 1.4, name: 'Bandit', money: [6, 16], r: 0.5 },
  guard: { hp: 110, dmg: 14, speed: 6.2, range: 2.6, aggro: 22, cd: 1.5, name: 'Tempelwächter', money: [12, 25], r: 0.5 },
  minotaur: { hp: 650, dmg: 26, speed: 6.5, range: 3.6, aggro: 21, cd: 1.8, name: 'Minotauros', money: [150, 150], r: 1.0, hitR: 1.4, top: 4.4, charge: true, bossLike: true },
  gigant: { hp: 800, dmg: 32, speed: 6, range: 4.2, aggro: 32, cd: 2.0, name: 'Gigant', money: [120, 120], r: 1.4, hitR: 1.8, top: 7.2, charge: true, bossLike: true },
  typhon: { hp: 3600, dmg: 42, speed: 6.5, range: 5.2, aggro: 45, cd: 1.6, name: 'Typhon, Vater der Ungeheuer', money: [500, 500], r: 2.0, hitR: 2.6, top: 9.5, charge: true, boss: true, storm: true },
  athlet: { hp: 220, dmg: 11, speed: 7.5, range: 2.0, aggro: 80, cd: 1.0, name: 'Champion Milon', money: [0, 0], r: 0.5, bossLike: true },
  satyr: { hp: 70, dmg: 12, speed: 8.5, range: 2.2, aggro: 24, cd: 1.2, name: 'Satyr', money: [5, 12], r: 0.5 },
  dryade: { hp: 60, dmg: 14, speed: 7, range: 2.4, aggro: 22, cd: 1.5, name: 'Dryade', money: [6, 14], r: 0.45 },
  eber: { hp: 90, dmg: 14, speed: 10, range: 2.0, aggro: 24, cd: 1.3, name: 'Wildeber', money: [4, 10], r: 0.8, top: 2.0 },
  eber_boss: { hp: 650, dmg: 26, speed: 9, range: 3.2, aggro: 26, cd: 1.6, name: 'Kalydonischer Eber', money: [180, 180], r: 1.6, hitR: 1.8, top: 4.0, charge: true, bossLike: true },
  loewe: { hp: 700, dmg: 28, speed: 9, range: 3.2, aggro: 26, cd: 1.5, name: 'Nemeischer Löwe', money: [200, 200], r: 1.4, hitR: 1.6, top: 3.4, charge: true, bossLike: true },
  kopfgeld: { hp: 170, dmg: 16, speed: 7, range: 2.4, aggro: 30, cd: 1.2, name: 'Gesetzloser', money: [20, 40], r: 0.55, bossLike: true },
  jaeger: { hp: 95, dmg: 13, speed: 8.5, range: 2.5, aggro: 400, cd: 1.4, name: 'Stadtwache', money: [5, 10], r: 0.5, hunter: true },
  soldat: { hp: 90, dmg: 13, speed: 6.5, range: 2.6, aggro: 26, cd: 1.4, name: 'Soldat', money: [8, 18], r: 0.5 },
  skelett: { hp: 55, dmg: 10, speed: 6.5, range: 2.1, aggro: 22, cd: 1.3, name: 'Skelettkrieger', money: [3, 10], r: 0.45 },
  schatten: { hp: 50, dmg: 13, speed: 8.5, range: 2.0, aggro: 24, cd: 1.1, name: 'Schatten', money: [4, 12], r: 0.45 },
  feuergeist: { hp: 70, dmg: 14, speed: 7, range: 2.1, aggro: 24, cd: 1.3, name: 'Feuergeist', money: [5, 14], r: 0.45 },
  triton: { hp: 80, dmg: 13, speed: 6.5, range: 2.7, aggro: 24, cd: 1.4, name: 'Triton', money: [6, 14], r: 0.5 },
  schlangenkrieger: { hp: 75, dmg: 13, speed: 7, range: 2.2, aggro: 24, cd: 1.3, name: 'Schlangenkrieger', money: [6, 14], r: 0.5 },
  zentaur: { hp: 110, dmg: 15, speed: 11, range: 2.7, aggro: 28, cd: 1.4, name: 'Wilder Zentaur', money: [10, 25], r: 0.9, hitR: 0.8, top: 3.1 },
  harpyie: { hp: 45, dmg: 9, speed: 10, range: 2.4, aggro: 26, cd: 1.3, name: 'Harpyie', money: [3, 9], r: 0.5, fly: true, top: 4.2 },
  zyklop: { hp: 420, dmg: 26, speed: 5.5, range: 3.8, aggro: 24, cd: 2.0, name: 'Zyklop', money: [60, 90], r: 1.1, hitR: 1.6, top: 5.4, charge: true },
  kerberos: { hp: 1100, dmg: 30, speed: 8, range: 3.9, aggro: 30, cd: 1.6, name: 'Kerberos', money: [250, 250], r: 1.6, hitR: 2.2, top: 4.6, charge: true, boss: true },
  talos: { hp: 1400, dmg: 36, speed: 5.5, range: 4.3, aggro: 30, cd: 2.0, name: 'Talos, der Bronzeriese', money: [300, 300], r: 1.4, hitR: 2.0, top: 6.6, charge: true, boss: true },
  skylla: { hp: 1200, dmg: 28, speed: 2.5, range: 6.5, aggro: 32, cd: 1.3, name: 'Skylla', money: [280, 280], r: 2.4, hitR: 2.8, top: 6.6, boss: true },
  medusa: { hp: 950, dmg: 24, speed: 6, range: 2.6, aggro: 30, cd: 1.4, name: 'Medusa', money: [260, 260], r: 0.6, hitR: 0.6, top: 2.8, boss: true, gaze: true },
};
function spawnEnemy(type, x, z, over) {
  let model;
  if (type === 'wolf') model = makeWolf(pick([0x6e6a64, 0x5a5550, 0x7d7468]));
  else if (type === 'bandit') model = makeHumanoid({ tunic: pick([0x3a2a1a, 0x4a3a2a, 0x2a2a2a]), hair: 0x1a1008, beard: true, weapon: 'sword', armor: 0x5a4a3a, veil: 0x3a2a1a });
  else if (type === 'guard') model = makeHumanoid({ tunic: 0x2a2a3a, armor: 0x8a7a5a, helmet: true, crest: 0x2a2a2a, shield: true, shieldCol: 0x6a5a3a, shieldEmblem: 0x2a2a2a, weapon: 'spear', greaves: true, pants: 0x1e1e26, scale: 1.12 });
  else if (type === 'soldat') model = makeHumanoid({ tunic: (over && over.col) || 0x8a1a1a, armor: 0x9a8a5a, helmet: true, crest: (over && over.col) || 0x8a1a1a, shield: true, shieldCol: 0xb98d3a, shieldEmblem: (over && over.col) || 0x8a1a1a, cape: (over && over.col) || 0x8a1a1a, weapon: 'spear', greaves: true, pants: 0x2a2a2a });
  else if (type === 'gigant') model = makeHumanoid({ skin: 0x8a7a6a, tunic: 0x5a4a3a, pants: 0x4a3a2a, armor: 0x6a6a5a, hair: 0x3a2a1a, beard: true, weapon: 'club', eyes: 0xffa040, scale: 3.0 });
  else if (type === 'typhon') model = makeHumanoid({ skin: 0x2a4a2a, tunic: 0x1a2a1a, pants: 0x1a2a1a, armor: 0x2a3a2a, hair: 0x1a3a1a, snakes: true, eyes: 0xff2010, cape: 0x111111, weapon: 'axe', scale: 3.6 });
  else if (type === 'athlet') model = makeHumanoid({ skin: 0xc98f5e, tunic: 0xc98f5e, pants: 0xf2ecdc, belt: 0xf2ecdc, beard: true, hair: 0x2a1a0e, wreath: true, scale: 1.1 });
  else if (type === 'satyr') model = makeHumanoid({ skin: 0xc99a6e, tunic: 0xc99a6e, pants: 0x5a3a22, hair: 0x3a2a1a, beard: true, horns: true, weapon: 'club' });
  else if (type === 'dryade') model = makeHumanoid({ skin: 0x7aa060, glow: 0x1a3a10, tunic: 0x4a7a3a, pants: 0x3a6a2a, hair: 0x2a6a1a, wreath: true, eyes: 0xb0ff80, weapon: 'staff' });
  else if (type === 'eber') model = makeBoar(0x4a3424, false);
  else if (type === 'eber_boss') model = makeBoar(0x3a2418, true);
  else if (type === 'loewe') model = makeLion();
  else if (type === 'kopfgeld') model = makeHumanoid({ tunic: 0x2a1a1a, armor: 0x4a3a2a, helmet: true, helmetCol: 0x3a3a3a, crest: 0x111111, weapon: 'axe', cape: 0x3a0a0a, beard: true, pants: 0x1a1a1a, scale: 1.15 });
  else if (type === 'jaeger') model = makeHumanoid({ tunic: 0x2a3a6a, armor: 0x9a8a5a, helmet: true, crest: 0x2a3a6a, shield: true, shieldEmblem: 0x2a3a6a, weapon: 'spear', cape: 0x2a3a6a, greaves: true, pants: 0x1a1a2a });
  else if (type === 'skelett') model = makeHumanoid({ skin: 0xe6dfc8, tunic: 0xd8d0b8, pants: 0xcfc6ac, hair: 0xe6dfc8, belt: 0x6a5a4a, weapon: 'sword', eyes: 0x101010, shield: rand() < 0.5, shieldCol: 0x6a5a4a });
  else if (type === 'schatten') model = makeHumanoid({ skin: 0x1a1a26, tunic: 0x14141c, pants: 0x101018, hair: 0x0a0a10, veil: 0x14141c, weapon: 'sword', eyes: 0x60ffd0 });
  else if (type === 'feuergeist') model = makeHumanoid({ skin: 0xff6a20, glow: 0xb02a00, tunic: 0x3a1a10, pants: 0x2a1008, hair: 0xffb040, weapon: 'fireSword', eyes: 0xffff80 });
  else if (type === 'triton') model = makeHumanoid({ skin: 0x4a8a8a, tunic: 0x2a5a6a, pants: 0x1a4a5a, hair: 0x1a3a3a, beard: true, weapon: 'trident' });
  else if (type === 'schlangenkrieger') model = makeHumanoid({ skin: 0x6a8a4a, armor: 0x4a5a3a, tunic: 0x3a4a2a, pants: 0x2a3a1a, helmet: true, crest: 0x2a4a1a, weapon: 'sword', shield: true, shieldCol: 0x4a5a3a, eyes: 0xffd000 });
  else if (type === 'zentaur') model = makeCentaur({ tunic: 0x5a3a2a, hair: 0x2a1a0e, beard: true, weapon: 'spear', body: pick([0x5a3a22, 0x7a5230, 0x3a2a1a]) });
  else if (type === 'harpyie') model = makeHarpy();
  else if (type === 'zyklop') model = makeHumanoid({ skin: 0x9a8a6a, tunic: 0x5a4a3a, pants: 0x4a3a2a, hair: 0x3a2a1a, cyclops: true, beard: true, weapon: 'club', scale: 2.4 });
  else if (type === 'kerberos') { model = makeWolf(0x1e1818, 3); model.root.scale.setScalar(3.2); }
  else if (type === 'talos') model = makeHumanoid({ skin: 0xb98d3a, tunic: 0xa07a30, pants: 0x8a6a2a, armor: 0xc99a42, hair: 0xb98d3a, helmet: true, crest: 0xb98d3a, weapon: 'sword', eyes: 0xff6a20, scale: 2.8 });
  else if (type === 'skylla') model = makeSkylla();
  else if (type === 'medusa') model = makeHumanoid({ skin: 0x7aa06a, tunic: 0x4a2a5a, pants: 0x3a2a4a, hair: 0x2a5a1a, snakes: true, eyes: 0xffee40, weapon: 'sword', scale: 1.1 });
  else model = makeHumanoid({ skin: 0x5a3b25, tunic: 0x2a1a10, belt: 0xb98d3a, weapon: 'axe', bull: true, scale: 1.75, hair: 0x2a1a10 });
  scene.add(model.root);
  const def = over ? Object.assign({}, EDEF[type], over) : EDEF[type];
  const e = { type, def, m: model, baseScale: model.root.scale.x, x, z, home: [x, z], hp: def.hp, maxHp: def.hp, state: 'idle', cd: 0, wind: 0, wt: rr(0, 4), tx: x, tz: z, yaw: rand() * 6.28, dead: false, respawn: 0, flashT: 0, atkAnim: 0, chargeT: 0, chargeCd: 4, speedNow: 0, y: groundAt(x, z), deadT: 0 };
  model.root.position.set(x, e.y, z);
  enemies.push(e);
  return e;
}
function buildEnemies() {
  for (const F of FORESTS) {
    if (F.myth) continue;
    const n = 4;
    for (let i = 0; i < n; i++) { let x, z, t = 0; do { x = F.x + rr(-F.r * 0.6, F.r * 0.6); z = F.z + rr(-F.r * 0.6, F.r * 0.6); t++; } while (t < 30 && heightAt(x, z) < 1.5); spawnEnemy('wolf', x, z); }
  }
  const B = LOCS.banditen;
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; spawnEnemy('bandit', B.x + Math.cos(a) * 6, B.z + Math.sin(a) * 6); }
  for (const [a, b2, t] of [['korinth', 'olympia', 0.4], ['korinth', 'olympia', 0.42], ['athen', 'theben', 0.55], ['athen', 'theben', 0.57], ['argos', 'sparta', 0.5]]) { const A = LOCS[a], B = LOCS[b2]; spawnEnemy('bandit', lerp(A.x, B.x, t) + rr(-8, 8), lerp(A.z, B.z, t) + rr(-8, 8)); }
  spawnEnemy('minotaur', SPOTS.mazeCenter[0], SPOTS.mazeCenter[1]);
  RUINS.forEach((r, i) => { r.guards.forEach(([gx, gz], k) => { const e = spawnEnemy(r.kind === 'old' ? 'skelett' : r.kind === 'forest' ? r.guardTypes[k] : 'guard', gx, gz); e.ruin = i; }); });
}
function hurtPlayer(dmg, from) {
  if (player.dead || player.adminFly) return;
  if (player.blocking) {
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    const dx = from.x - player.pos.x, dz = from.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
    if ((dx * fx + dz * fz) / d > -0.1) {
      if (clock.elapsedTime - (player.blockStart || 0) < 0.35 || player.gear.includes('aigis')) {
        sfx('block'); floatText(player.pos.x, player.pos.y + 2.6, player.pos.z, 'Parade!', '#ffd24a', true);
        if (from.def && !from.def.boss) { from.stunT = 1.5; floatText(from.x, from.y + 2.6, from.z, 'Betäubt', '#9ad0ff'); }
        return;
      }
      if (player.stamina < 5) { dmg *= 0.6; floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, 'Schild durchbrochen!', '#ff9a7a'); }
      else { dmg *= Math.max(0.02, (player.relics.includes('athene') ? 0.05 : player.shieldTier >= 2 ? 0.2 : 0.35) - 0.03 * upLvl('shield')); sfx('block'); floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, 'Geblockt', '#e8c46a'); player.stamina = Math.max(0, player.stamina - 10 * (1 - 0.12 * upLvl('shield'))); }
    }
  }
  if (player.hasArmor) dmg *= 0.85;
  if (player.relics.includes('achilles')) dmg *= 0.8;
  if (player.gear.includes('hadeshelm')) dmg *= 0.7;
  if (player.gear.includes('aigis')) dmg *= 0.6;
  dmg *= 1 - ARMORS[player.aTier || 0].red;
  dmg = Math.round(dmg);
  if (OLY && OLY.ev === 'ringen' && player.hp - dmg < player.maxHp * 0.1) { player.hp = player.maxHp * 0.5; olyCleanup(); banner('Pankration verloren', 'Der Champion war heute stärker. Versuch es noch einmal!'); return; }
  player.hp -= dmg; player.lastHurt = clock.elapsedTime;
  $('damageFlash').style.opacity = 1; setTimeout(() => $('damageFlash').style.opacity = 0, 120);
  sfx('hurt');
  if (player.hp <= 0) die();
}
function die() {
  player.hp = 0; player.dead = true; race = null;
  if (player.mounted) dismount();
  banner('Du bist gefallen', 'Hermes geleitet dich zurück nach Athen …');
  setTimeout(() => fadeTo(() => {
    const lost = Math.floor(player.money * 0.2); player.money -= lost;
    curD = null; player.flying = false; player.sailing = false; player.stoned = 0; setWanted(Math.floor((player.wanted || 0) / 2));
    player.pos.set(SPOTS.respawn[0], groundAt(SPOTS.respawn[0], SPOTS.respawn[1]) + 0.5, SPOTS.respawn[1]);
    player.hp = player.maxHp; player.dead = false; player.vy = 0;
    for (const e of enemies) if (!e.dead) { e.state = 'idle'; e.hp = e.maxHp; }
    if (lost) toast('-' + lost + ' Drachmen verloren');
  }), 1800);
}
function damageEnemy(e, dmg, crit = false) {
  e.hp -= dmg; e.flashT = 0.15; e.state = 'chase';
  floatText(e.x, e.y + (e.def.top || (e.type === 'wolf' ? 1.7 : 2.4)), e.z, String(Math.round(dmg)) + (crit ? '!' : ''), crit ? '#ffd24a' : '#ffffff', crit);
  sfx('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  setTimeout(checkLegends, 100);
  e.dead = true; e.deadT = 0; e.respawn = 100;
  if (e.site && !isMine(townsState()[e.site]) && !isMember(townsState()[e.site])) { player.crimeKills = (player.crimeKills || 0) + 1; if (player.crimeKills % 2 === 0) addCrime(1); }
  if (e.def.hunter) { player.hunterKills = (player.hunterKills || 0) + 1; if (player.hunterKills % 3 === 0) addCrime(1); setTimeout(() => removeEnemy(e), 6000); }
  if (OLY && e === OLY.foe) { const hpf = player.hp / player.maxHp; OLY.foe = null; olyCleanup(); olyResult('ringen', hpf, 'Sieg mit ' + Math.round(hpf * 100) + ' % Leben'); }
  if (e.isBountyBoss && S.bounty) { const rw = S.bounty.reward; banner('Kopfgeld kassiert!', e.def.name + ' ist erledigt – ' + rw + ' Drachmen'); addMoney(rw); S.bounty = null; updateQuestText(); save(); }
  const [a, b] = e.def.money; const m = Math.round(rr(a, b));
  if (m > 0) { player.money += m; floatText(e.x, e.y + 1.5, e.z, '+' + m + ' Dr', '#e8c46a'); sfx('coin'); }
  if (e.type === 'wolf' && S.stage === 4) { S.wolves++; updateQuestText(); if (S.wolves >= 5) { toast('Genug Wölfe besiegt! Zurück zur Pythia.', 'gold'); setStage(5); } }
  if (e.type === 'bandit' && S.stage === 7 && Math.hypot(e.home[0] - LOCS.banditen.x, e.home[1] - LOCS.banditen.z) < 40) { S.bandits++; updateQuestText(); if (S.bandits >= 4) { toast('Das Lager ist befreit! Zurück zu Leonidas.', 'gold'); setStage(8); } }
  if (e.type === 'minotaur') { banner('DER MINOTAUROS IST BESIEGT', 'Kehre nach Athen zurück, Held!'); if (S.stage === 10) setStage(11); S.minoDead = true; save(); }
  if (e.type === 'gigant' && S.zeus === 2) { S.zeusKills = (S.zeusKills || 0) + 1; updateZeusText(); toast('Gigant gefallen (' + S.zeusKills + '/3)', 'gold'); if (S.zeusKills >= 3) setZeus(3); else save(); }
  if (e.type === 'typhon' && S.zeus === 5) setTimeout(() => setZeus(6), 4500);
  noteLegend(e.type);
  if (e.def.boss && e.key) { banner(e.def.name + ' ist besiegt!', 'Öffne den Schatz am Ende der Halle.'); if (!S.bossDead.includes(e.key)) S.bossDead.push(e.key); sfx('quest'); save(); }
}
function updateEnemy(e, dt) {
  const P = player.pos;
  let tgtAlly = null;
  if (allies.length && !e.dead && e.state === 'chase') { let best = Math.hypot(P.x - e.x, P.z - e.z); for (const a of allies) { const da = Math.hypot(a.x - e.x, a.z - e.z); if (da < best - 1 && da < 25) { best = da; tgtAlly = a; } } }
  const dx = (tgtAlly ? tgtAlly.x : P.x) - e.x, dz = (tgtAlly ? tgtAlly.z : P.z) - e.z, d = Math.hypot(dx, dz);
  if (d > 320) { e.m.root.visible = false; if (e.dead) { e.respawn -= dt; if (e.respawn <= 0 && canRevive(e)) revive(e); } return; }
  e.m.root.visible = true;
  if (e.dead) {
    e.deadT += dt;
    e.m.root.rotation.z = Math.min(Math.PI / 2, e.deadT * 4) * (e.type === 'wolf' ? 1 : 1);
    e.m.root.position.y = e.y - Math.max(0, e.deadT - 2) * 0.5;
    if (e.deadT > 6) e.m.root.visible = false;
    e.respawn -= dt;
    if (e.respawn <= 0 && d > 120 && canRevive(e)) revive(e);
    return;
  }
  const D = e.def;
  let mvx = 0, mvz = 0, spd = 0;
  e.cd -= dt; e.atkAnim = Math.max(0, e.atkAnim - dt * 2.5);
  if (e.stoned > 0) { e.stoned -= dt; e.state = 'chase'; e.m.root.position.set(e.x, e.y, e.z); return; }
  if (e.stunT > 0) { e.stunT -= dt; e.state = 'chase'; e.m.root.rotation.z = Math.sin(clock.elapsedTime * 20) * 0.08; return; }
  if (e.state === 'idle') {
    e.wt -= dt;
    if (e.wt <= 0) { e.wt = rr(3, 8); const a = rand() * 6.28, r = rand() * (D.charge || D.boss ? 5 : 14); e.tx = e.home[0] + Math.cos(a) * r; e.tz = e.home[1] + Math.sin(a) * r; }
    const tx = e.tx - e.x, tz = e.tz - e.z, td = Math.hypot(tx, tz);
    if (td > 0.8) { mvx = tx / td; mvz = tz / td; spd = D.speed * 0.3; }
    const homeD = Math.hypot(e.x - e.home[0], e.z - e.home[1]);
    if (d < D.aggro && !player.dead && !player.flying && !player.adminFly && !player.bird && !player.sailing && !(player.swimming && !D.fly) && homeD < 90 && Math.abs(P.y - e.y) < 12) e.state = 'chase';
  } else if (e.state === 'chase') {
    const homeD = Math.hypot(e.x - e.home[0], e.z - e.home[1]);
    if (player.dead || player.flying || player.adminFly || player.bird || player.sailing || d > D.aggro * 2.5 || homeD > (D.hunter ? 1e9 : D.boss ? 40 : D.charge ? 30 : 110)) { e.state = 'idle'; e.tx = e.home[0]; e.tz = e.home[1]; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5); }
    else {
      if (D.charge) {
        e.chargeCd -= dt;
        if (e.chargeT > 0) { e.chargeT -= dt; mvx = Math.sin(e.yaw); mvz = Math.cos(e.yaw); spd = 17; if (d < 2.6 && !e.chargeHit) { e.chargeHit = true; if (tgtAlly) hurtAlly(tgtAlly, D.dmg * 1.2); else hurtPlayer(D.dmg * 1.2, e); player.knock = { x: mvx * 18, z: mvz * 18, t: 0.25 }; } }
        else if (e.chargeCd <= 0 && d > 7 && d < 20) { e.chargeT = 1.0; e.chargeCd = 6; e.chargeHit = false; e.yaw = Math.atan2(dx, dz); floatText(e.x, e.y + (D.top || 4) + 0.3, e.z, 'BRÜLL!', '#ff7050', true); }
      }
      if (D.storm) {
        e.stormCd = (e.stormCd ?? 4) - dt; e.summonCd = (e.summonCd ?? 15) - dt;
        if (e.stormCd <= 0 && d < 45) { e.stormCd = e.hp < e.maxHp * 0.4 ? 3.5 : 5.5; stormStrike(e); }
        if (e.summonCd <= 0) { e.summonCd = 22; for (let k = 0; k < 2; k++) { const h = spawnEnemy('harpyie', e.x + rr(-6, 6), e.z + rr(-6, 6)); h.dungeon = e.dungeon; h.state = 'chase'; } floatText(e.x, e.y + 10, e.z, 'Kommt, meine Kinder!', '#ff9a7a', true); }
      }
      if (D.gaze) {
        e.gazeCd = (e.gazeCd ?? 5) - dt;
        if (e.gazeT > 0) {
          e.gazeT -= dt;
          if (e.gazeT <= 0) {
            const cf = new V3(); camera.getWorldDirection(cf);
            const tv = new V3(e.x - camera.position.x, e.y + 2 - camera.position.y, e.z - camera.position.z).normalize();
            if (cf.dot(tv) > 0.5) { player.stoned = 2.5; hurtPlayer(14, e); floatText(P.x, P.y + 2.6, P.z, 'Versteinert!', '#c8c8c0', true); }
            else floatText(P.x, P.y + 2.6, P.z, 'Ausgewichen!', '#b0ff60');
          }
        } else if (e.gazeCd <= 0 && d < 28) { e.gazeCd = 7; e.gazeT = 1.4; floatText(e.x, e.y + 3.4, e.z, 'SCHAU WEG!', '#b0ff60', true); }
      }
      if (e.chargeT <= 0 && !(e.gazeT > 0)) {
        e.yaw = angLerp(e.yaw, Math.atan2(dx, dz), Math.min(1, dt * 8));
        if (d > D.range * 0.85) { mvx = dx / d; mvz = dz / d; spd = D.speed; }
        else if (e.cd <= 0 && e.wind <= 0) { e.wind = 0.42; e.atkAnim = 1; }
        if (e.wind > 0) { e.wind -= dt; spd *= 0.3; if (e.wind <= 0) { e.cd = D.cd; if (d < D.range * 1.35) { if (tgtAlly && allies.includes(tgtAlly)) hurtAlly(tgtAlly, D.dmg * rr(0.85, 1.15)); else hurtPlayer(D.dmg * rr(0.85, 1.15), e); } } }
      }
    }
  }
  if (spd > 0) {
    const ox = e.x, oz = e.z;
    const nx = e.x + mvx * spd * dt, nz = e.z + mvz * spd * dt;
    if (D.fly || groundAt(nx, nz) > -0.6) {
      const p = { x: nx, z: nz }; resolveCollisions(p, D.r); e.x = p.x; e.z = p.z;
    }
    if (e.state === 'idle') e.yaw = angLerp(e.yaw, Math.atan2(mvx, mvz), Math.min(1, dt * 5));
    e.speedNow = Math.hypot(e.x - ox, e.z - oz) / dt;
  } else e.speedNow = 0;
  e.y = Math.max(groundAt(e.x, e.z), D.fly ? 0 : -99) + (D.fly ? 2.2 + Math.sin(clock.elapsedTime * 2 + e.x) * 0.4 - (e.wind > 0 ? 1.2 : 0) : 0);
  const r = e.m.root; r.position.set(e.x, e.y, e.z); r.rotation.y = e.yaw;
  const fs = e.flashT > 0 ? 1.12 : 1; e.flashT -= dt;
  r.scale.setScalar(e.baseScale * fs); r.rotation.z = 0;
  const m = e.m, t = clock.elapsedTime;
  if (m.centaur) { animateQuad(m, e.speedNow, dt); if (e.atkAnim > 0) { const k = 1 - e.atkAnim; m.armR.rotation.x = k < 0.35 ? lerp(-0.3, -2.7, k / 0.35) : lerp(-2.7, -0.4, (k - 0.35) / 0.65); } else m.armR.rotation.x = -0.5; }
  else if (m.wings) { const f = Math.sin(t * 12 + e.x) * 0.7; m.wings[0].rotation.z = f; m.wings[1].rotation.z = -f; }
  else if (m.necks) m.necks.forEach((n, i) => { n.rotation.x = Math.sin(t * 1.5 + i) * 0.25 + (e.atkAnim > 0 ? Math.sin(e.atkAnim * Math.PI) * 0.9 : 0); n.rotation.z = Math.cos(t * 1.2 + i * 2) * 0.2; });
  else if (m.legs) { animateQuad(m, e.speedNow, dt); for (const h of (m.heads || [m.head])) h.rotation.x = e.atkAnim > 0 ? -Math.sin(e.atkAnim * Math.PI) * 0.6 : 0; }
  else animateHumanoid(m, e.speedNow, dt, { attack: e.atkAnim });
}
function canRevive(e) { return e.type !== 'minotaur' && e.type !== 'gigant' && !e.def.boss && !e.def.hunter && !e.bountyOf && !(e.site && isMine(townsState()[e.site])) && !(e.ruin !== undefined && RUINS[e.ruin].chest.opened); }
function revive(e) { e.dead = false; e.hp = e.maxHp; e.x = e.home[0]; e.z = e.home[1]; e.state = 'idle'; e.m.root.rotation.z = 0; e.m.root.visible = true; }

// ---------- Spieler-Angriffe ----------
function playerAttack() {
  if (sirenTap()) return;
  if (dialog || heroOpen || player.dead || (player.swimming && !player.gear.includes('poseidon') && !player.bird && player.form !== 'siren') || player.stoned > 0 || player.sailing) return;
  if (OLY && OLY.ev === 'speer') { throwJavelin(); return; }
  if (player.blocking) { shieldBash(); return; }
  if (player.bird) { throwBlitz(true); return; }
  if (player.form === 'siren') { sirenSong(); return; }
  if (player.blitzMode) { blitzStrike(); return; }
  if (player.bowMode) { shootArrow(); return; }
  if (player.atkCd > 0) return;
  player.atkCd = 0.55; player.atkAnim = 1;
  let fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const reach = (player.form === 'centaur' ? 4.2 : player.mounted ? (HORSES[player.horse].war ? 4.6 : 3.8) : 3.0) + (player.gear.includes('poseidon') ? 1.2 : 0);
  // Sanftes Auto-Zielen: nächsten Gegner im weiten Kegel vor der Kamera anvisieren
  let tgt = null, best = 1e9;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.pos.x, dz = e.z - player.pos.z, d = Math.hypot(dx, dz);
    const er = e.def.hitR || 0.3;
    if (d < reach + er + 1.2 && (d < 1 || (dx * fx + dz * fz) / d > -0.15) && d < best) { best = d; tgt = e; }
  }
  if (tgt) { const d = Math.hypot(tgt.x - player.pos.x, tgt.z - player.pos.z) || 1; fx = (tgt.x - player.pos.x) / d; fz = (tgt.z - player.pos.z) / d; }
  player.yaw = Math.atan2(fx, fz);
  sfx('swing');
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.pos.x, dz = e.z - player.pos.z, d = Math.hypot(dx, dz);
    const er = e.def.hitR || 0.3;
    if (d < reach + er && Math.abs(e.y - player.pos.y) < (player.flying ? 6 : 3.5) && (d < 1 || (dx * fx + dz * fz) / d > 0.4)) {
      const crit = rand() < 0.15;
      damageEnemy(e, playerDamage() * rr(0.85, 1.15) * (crit ? 2 : 1) * (player.form === 'centaur' ? 1.3 : 1), crit);
      if (!e.dead && !e.def.charge && !e.def.boss) { const k = 1.2 / (d || 1); const p = { x: e.x + dx * k, z: e.z + dz * k }; if (e.def.fly || groundAt(p.x, p.z) > -0.5) { resolveCollisions(p, e.def.r); e.x = p.x; e.z = p.z; } }
    }
  }
}
let flash = 0;
function zeusBolt() {
  if (!player.blessed) { toast('Du hast den Segen des Zeus noch nicht.'); return; }
  if (player.zapCd > 0) { toast('Der Blitz lädt noch … (' + Math.ceil(player.zapCd) + ' s)'); return; }
  const targets = enemies.filter(e => !e.dead && Math.hypot(e.x - player.pos.x, e.z - player.pos.z) < 30);
  player.zapCd = 9; flash = 1; sfx('zap');
  if (!targets.length) { makeBolt(player.pos.x - Math.sin(camYaw) * 12, player.pos.z - Math.cos(camYaw) * 12); return; }
  for (const e of targets) { makeBolt(e.x, e.z); damageEnemy(e, 85 + player.dmg, false); }
}
function makeBolt(x, z) {
  const y0 = groundAt(x, z); const pts = []; let px = x, pz = z;
  for (let i = 0; i <= 12; i++) { pts.push(new V3(px, y0 + 60 - i * 5, pz)); px = x + rr(-2.5, 2.5) * (12 - i) / 12; pz = z + rr(-2.5, 2.5) * (12 - i) / 12; }
  pts[pts.length - 1].set(x, y0, z);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, fog: false }));
  scene.add(line); bolts.push({ line, t: 0.35 });
  const glow = new THREE.PointLight(0x9fd0ff, 60, 40, 2); glow.position.set(x, y0 + 3, z); scene.add(glow); bolts.push({ line: glow, t: 0.35 });
}

// ---------- Pferd ----------
function mount() {
  if (player.form) { toast('Verwandle dich zuerst zurück.'); return; }
  if (curD) { toast('Hier unten kann dein Pferd nicht hin.'); return; }
  if (player.flying || player.sailing) return;
  if (player.swimming || (race && !race.mount)) { toast(race ? 'Beim Wettlauf kein Pferd!' : 'Im Wasser kann dein Pferd nicht kommen.'); return; }
  player.mounted = true; horse.root.visible = true; toast('Dein Pferd ist da. (R zum Absteigen)'); sfx('coin');
}
function dismount() { player.mounted = false; horse.root.visible = false; }
function refreshHeroLook() {
  const p = hero.root.position.clone(), r = hero.root.rotation.y;
  scene.remove(hero.root);
  hero = makeHumanoid(heroLook());
  hero.root.position.copy(p); hero.root.rotation.y = r; scene.add(hero.root);
  netSendLook();
}
function heroLook() { const gr = player.gear || []; const sk = (SKINS.find(k => k.id === player.skin) || SKINS[0]).look; return Object.assign({ tunic: 0x9b1c1c, armor: (player.aTier ? ARMORS[player.aTier].col : null) || (player.hasArmor ? 0xb98d3a : null), helmet: player.aTier >= 2 || player.hasArmor || gr.includes('hadeshelm'), helmetCol: gr.includes('hadeshelm') ? 0x2a2a34 : null, crest: gr.includes('hadeshelm') ? 0x3a80ff : 0xe8c46a, shield: player.shieldTier > 0 || gr.includes('aigis'), shieldCol: player.shieldTier >= 2 ? 0xb98d3a : 0x8a6a3a, shieldEmblem: 0x1c3a7a, weapon: gr.includes('hephklinge') ? 'fireSword' : gr.includes('poseidon') ? 'trident' : (WEAPONS[player.wTier || 0].model || 'sword'), cape: CAPE_COLORS[nameHash(heroName()) % CAPE_COLORS.length], pants: 0x3a2a1e, greaves: player.hasArmor || player.aTier >= 2, hair: 0x2a1a0e }, sk, player.bowMode ? { weapon: 'bow' } : player.blitzMode ? { weapon: 'keraunos' } : {}); }

// ---------- Sammelobjekte ----------
const ampGeo = (() => { const pts = []; const prof = [[0, 0], [0.18, 0.02], [0.3, 0.25], [0.36, 0.55], [0.3, 0.85], [0.14, 1.0], [0.1, 1.15], [0.16, 1.22], [0.0, 1.22]]; for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 12); })();
const ampMat = new THREE.MeshLambertMaterial({ color: 0xb5553a, emissive: 0x2a0a00 });
const oliveMat = new THREE.MeshLambertMaterial({ color: 0xe8c46a, emissive: 0xb08020 });
function buildPickups() {
  let n = 0, tries = 0;
  rand = mulberry32(777);
  while (n < 40 && tries < 5000) {
    tries++;
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z);
    if (h < 2 || h > 120 || inCity(x, z, 0.5)) continue;
    const m = new THREE.Mesh(ampGeo, ampMat); m.scale.setScalar(1.4); m.position.set(x, h, z); m.castShadow = true; scene.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 24), oliveMat); ring.rotation.x = Math.PI / 2; ring.position.set(x, h + 0.1, z); scene.add(ring);
    pickups.push({ kind: 'amph', id: n, x, z, y: h, mesh: m, ring, taken: S.amph.includes(n) });
    if (S.amph.includes(n)) { m.visible = false; ring.visible = false; }
    n++;
  }
}
function spawnOlives() {
  for (const p of pickups.filter(p => p.kind === 'olive')) { scene.remove(p.mesh); }
  for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].kind === 'olive') pickups.splice(i, 1);
  const spots = TREES.filter(t => t.kind === 'olive' && Math.hypot(t.x - 40, t.z + 90) < 110 && Math.hypot(t.x, t.z) > 60);
  for (let i = 0; i < 5; i++) {
    const t = spots.length ? spots[Math.floor(rand() * spots.length)] : { x: 40 + rr(-40, 40), z: -90 + rr(-40, 40) };
    const x = t.x + 1.4, z = t.z + 1.4, y = heightAt(x, z) + 1.2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), oliveMat); m.scale.set(1, 1.3, 1); m.position.set(x, y, z); scene.add(m);
    pickups.push({ kind: 'olive', x, z, y, mesh: m, taken: false });
  }
}
function updatePickups(dt, t) {
  for (const p of pickups) {
    if (p.taken) continue;
    if (p.kind === 'olive') { p.mesh.position.y = p.y + Math.sin(t * 3 + p.x) * 0.2; p.mesh.rotation.y += dt * 2; }
    else p.ring.scale.setScalar(1 + Math.sin(t * 3 + p.x) * 0.12);
    const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d < (player.mounted ? 2.8 : 1.8) && Math.abs(player.pos.y - p.y) < 3) {
      p.taken = true; p.mesh.visible = false; if (p.ring) p.ring.visible = false;
      if (p.kind === 'amph') { S.amph.push(p.id); const m = Math.round(rr(8, 20)); addMoney(m); toast('Amphore gefunden! (' + S.amph.length + '/40)'); if (rand() < 0.3) { player.potions++; toast('+1 Ambrosia', 'gold'); } save(); }
      else if (S.stage === 1) { S.olives++; sfx('coin'); toast('Heilige Olive (' + S.olives + '/5)', 'gold'); updateQuestText(); if (S.olives >= 5) setStage(2); }
    }
  }
}

// ============================================================
// Karte
// ============================================================
let mapCanvas;
function buildMapCanvas() {
  mapCanvas = document.createElement('canvas'); mapCanvas.width = N; mapCanvas.height = N;
  const ctx = mapCanvas.getContext('2d'), img = ctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const h = HGT[i];
    let r = terrainColorsSRGB[i * 3], g = terrainColorsSRGB[i * 3 + 1], b = terrainColorsSRGB[i * 3 + 2];
    if (h < 0) { const t = clamp(-h / 30, 0, 1); r = lerp(70, 22, t); g = lerp(140, 70, t); b = lerp(170, 120, t); }
    else { const sh = clamp(h / 150, 0, 1) * 30; r += sh; g += sh; b += sh; }
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
const w2m = (x) => (x + HALF) / CELL; // Welt -> Kartenpixel
function drawMinimap() {
  const c = $('minimap'), ctx = c.getContext('2d'), S2 = c.width;
  if (curD) {
    const P = player.pos, sc = 2.4, rel = (x, z) => [S2 / 2 + (x - P.x) * sc, S2 / 2 + (z - P.z) * sc];
    ctx.fillStyle = '#0e0b08'; ctx.fillRect(0, 0, S2, S2);
    ctx.fillStyle = '#3e342a';
    for (const r of curD.R) { const [x, y] = rel(r.x - r.W / 2, r.z - r.L / 2); ctx.fillRect(x, y, r.W * sc, r.L * sc); }
    for (let i = 0; i < curD.R.length - 1; i++) { const a = curD.R[i], b = curD.R[i + 1], g = (a.x + b.x) / 2; const [x, y] = rel(g - 3, a.z + a.L / 2); ctx.fillRect(x, y, 6 * sc, (b.z - b.L / 2 - a.z - a.L / 2) * sc); }
    if (curD.chest && !curD.chest.opened) { const [x, y] = rel(curD.chest.x, curD.chest.z); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    for (const e of enemies) { if (e.dead || e.dungeon !== curD.idx) continue; const [x, y] = rel(e.x, e.z); ctx.fillStyle = e.def.boss ? '#ff3a1a' : '#c0392b'; ctx.beginPath(); ctx.arc(x, y, e.def.boss ? 5 : 2.5, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(S2 / 2, S2 / 2); ctx.rotate(-player.yaw + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    return;
  }
  const range = 320, scale = S2 / (range / CELL);
  const px = w2m(player.pos.x), pz = w2m(player.pos.z);
  ctx.fillStyle = '#16465e'; ctx.fillRect(0, 0, S2, S2);
  ctx.save(); ctx.translate(S2 / 2, S2 / 2); ctx.scale(scale, scale); ctx.translate(-px, -pz);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(mapCanvas, 0, 0);
  ctx.restore();
  const toMini = (x, z) => [S2 / 2 + (w2m(x) - px) * scale, S2 / 2 + (w2m(z) - pz) * scale];
  ctx.font = '600 10px Alegreya Sans, sans-serif'; ctx.textAlign = 'center';
  for (const L of LOC_LIST) { if (L.hidden) continue; const [mx, my] = toMini(L.x, L.z); if (mx < -40 || my < -20 || mx > S2 + 40 || my > S2 + 20) continue; ctx.fillStyle = '#1b140c'; ctx.fillRect(mx - 2.5, my - 2.5, 5, 5); ctx.fillStyle = '#fff3d0'; ctx.fillText(L.name, mx, my - 6); }
  const q = questTarget();
  if (q) {
    let [mx, my] = toMini(q.x, q.z);
    const dx = mx - S2 / 2, dy = my - S2 / 2, dd = Math.hypot(dx, dy), maxR = S2 / 2 - 10;
    if (dd > maxR) { mx = S2 / 2 + dx / dd * maxR; my = S2 / 2 + dy / dd * maxR; }
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 5, my); ctx.lineTo(mx, my + 7); ctx.lineTo(mx - 5, my); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.font = '700 12px Alegreya Sans, sans-serif'; ctx.textAlign = 'center';
  for (const q2 of QUIZZERS) { if (S.quiz.includes(q2.id)) continue; const [mx, my] = toMini(q2.x, q2.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 6) continue; ctx.fillStyle = '#1a3a5a'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#8fe0ff'; ctx.fillText('?', mx, my + 4); }
  for (const tv of TAVERNS) { const [mx, my] = toMini(tv.x, tv.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 6) continue; ctx.fillStyle = '#c08040'; ctx.fillText('🍺', mx, my + 4); }
  { const zt = zeusTarget(); if (zt) { let [mx, my] = toMini(zt.x, zt.z); const ddx = mx - S2 / 2, ddy = my - S2 / 2, dd = Math.hypot(ddx, ddy), mr = S2 / 2 - 10; if (dd > mr) { mx = S2 / 2 + ddx / dd * mr; my = S2 / 2 + ddy / dd * mr; } ctx.fillStyle = '#b07aff'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); } }
  if (S.bounty) { let [mx, my] = toMini(S.bounty.x, S.bounty.z); const ddx = mx - S2 / 2, ddy = my - S2 / 2, dd = Math.hypot(ddx, ddy), mr = S2 / 2 - 10; if (dd > mr) { mx = S2 / 2 + ddx / dd * mr; my = S2 / 2 + ddy / dd * mr; } ctx.fillStyle = '#e0402a'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
  for (const ch of CHESTS) { if (ch.opened) continue; const [mx, my] = toMini(ch.x, ch.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 6) continue; ctx.fillStyle = ch.tier === 2 ? '#ffd24a' : '#d8b860'; ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 1; ctx.fillRect(mx - 3, my - 2.5, 6, 5); ctx.strokeRect(mx - 3, my - 2.5, 6, 5); }
  for (const e of enemies) { if (e.dead) continue; const [mx, my] = toMini(e.x, e.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 4) continue; ctx.fillStyle = e.type === 'minotaur' ? '#ff3a1a' : '#c0392b'; ctx.beginPath(); ctx.arc(mx, my, e.type === 'minotaur' ? 4 : 2.2, 0, 7); ctx.fill(); }
  for (const r of NET.others.values()) { if (!r.st) continue; const [mx, my] = toMini(r.pos.x, r.pos.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 5) continue; ctx.fillStyle = '#4ab0ff'; ctx.strokeStyle = '#002'; ctx.beginPath(); ctx.arc(mx, my, 4, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.save(); ctx.translate(S2 / 2, S2 / 2); ctx.rotate(-player.yaw + Math.PI);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
const MAPV = { z: 1, cx: 450, cy: 450 };
function clampMapView(W) { const h = W / (2 * MAPV.z); MAPV.cx = clamp(MAPV.cx, h, W - h); MAPV.cy = clamp(MAPV.cy, h, W - h); }
function mapZoomAt(sx, sy, nz, W) {
  nz = clamp(nz, 1, 8);
  const wx = (sx - W / 2) / MAPV.z + MAPV.cx, wy = (sy - W / 2) / MAPV.z + MAPV.cy;
  MAPV.z = nz; MAPV.cx = wx - (sx - W / 2) / nz; MAPV.cy = wy - (sy - W / 2) / nz; clampMapView(W);
}
function setupMapZoom() {
  const c = $('bigmapCanvas'), pts = new Map(); let pinch = 0;
  const toCanvas = (e) => { const r = c.getBoundingClientRect(), f = c.width / r.width; return [(e.clientX - r.left) * f, (e.clientY - r.top) * f]; };
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); pts.set(e.pointerId, toCanvas(e)); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  c.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), now = toCanvas(e); pts.set(e.pointerId, now);
    if (pts.size === 1) { MAPV.cx -= (now[0] - prev[0]) / MAPV.z; MAPV.cy -= (now[1] - prev[1]) / MAPV.z; clampMapView(c.width); }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (pinch) mapZoomAt(mx, my, MAPV.z * d / pinch, c.width);
      pinch = d;
    }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = toCanvas(e); mapZoomAt(x, y, MAPV.z * (e.deltaY > 0 ? 0.85 : 1.18), c.width); }, { passive: false });
  c.addEventListener('dblclick', (e) => { e.preventDefault(); const [x, y] = toCanvas(e); mapZoomAt(x, y, MAPV.z > 3 ? 1 : MAPV.z * 2.2, c.width); });
  $('mapClose').addEventListener('click', (e) => { e.stopPropagation(); if (mapOpen) pressKey('KeyM', true); });
  $('mapCenter').addEventListener('click', (e) => { e.stopPropagation(); const k = c.width / N; MAPV.cx = w2m(player.pos.x) * k; MAPV.cy = w2m(player.pos.z) * k; if (MAPV.z < 2.5) MAPV.z = 2.5; clampMapView(c.width); });
}
function drawBigMap() {
  const c = $('bigmapCanvas'), ctx = c.getContext('2d'), W = c.width, k = W / N, Z = MAPV.z;
  clampMapView(W);
  const MP = (wx, wz) => [(w2m(wx) * k - MAPV.cx) * Z + W / 2, (w2m(wz) * k - MAPV.cy) * Z + W / 2];
  ctx.fillStyle = '#16465e'; ctx.fillRect(0, 0, W, W);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mapCanvas, (0 - MAPV.cx) * Z + W / 2, (0 - MAPV.cy) * Z + W / 2, W * Z, W * Z);
  ctx.strokeStyle = 'rgba(232,196,106,.5)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, W - 2);
  ctx.textAlign = 'center';
  for (const L of LOC_LIST) {
    if (L.hidden) continue;
    const [x, y] = MP(L.x, L.z);
    if (x < -60 || y < -30 || x > W + 60 || y > W + 30) continue;
    ctx.fillStyle = '#1b140c'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8c46a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    ctx.font = '700 17px Cinzel, serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(L.name, x, y - 10); ctx.fillStyle = '#fff3d0'; ctx.fillText(L.name, x, y - 10);
  }
  const q = questTarget();
  if (q) { const [x, y] = MP(q.x, q.z); ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const [x, y] = MP(player.pos.x, player.pos.z);
  ctx.save(); ctx.translate(x, y); ctx.rotate(-player.yaw + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.font = '700 22px Cinzel, serif'; ctx.fillStyle = '#e8c46a'; ctx.textAlign = 'left'; ctx.fillText('LEGACY OF OLYMPUS', 20, 36);
  ctx.font = '15px Alegreya Sans, sans-serif'; ctx.fillStyle = '#fff3d0'; ctx.fillText('Rätsel: ' + S.quiz.length + '/' + QUIZZERS.length + '   ·   Amphoren: ' + S.amph.length + '/40   ·   Relikte: ' + player.relics.length + '/6   ·   Tempel entdeckt: ' + S.found.length + '/' + RUINS.length + '   ·   [M] schließen   ·   Zoom: zwei Finger / Mausrad', 20, 58);
  ctx.textAlign = 'center';
  ctx.textAlign = 'center'; ctx.font = '700 14px Alegreya Sans, sans-serif';
  for (const q2 of QUIZZERS) { const [x, y] = MP(q2.x, q2.z); ctx.fillStyle = S.quiz.includes(q2.id) ? '#4a5a6a' : '#1a3a5a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = S.quiz.includes(q2.id) ? '#9aa' : '#8fe0ff'; ctx.fillText(S.quiz.includes(q2.id) ? '✓' : '?', x, y + 5); }
  for (const tv of TAVERNS) { const [x, y] = MP(tv.x, tv.z); ctx.fillText('🍺', x + 12, y + 14); }
  if (S.bounty) { const [x, y] = MP(S.bounty.x, S.bounty.z); ctx.fillStyle = '#e0402a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('☠', x, y + 5); }
  for (const st of TOWN_SITES) { const L = LOCS[st.key], T = townsState()[st.key], [x, y] = MP(L.x, L.z); ctx.strokeStyle = !T ? '#ffffff' : isMine(T) ? '#ffd24a' : isMember(T) ? '#4ab0ff' : '#ff4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); }
  DUNGEONS.forEach(d => { if (!d.reward && !S.foundD.includes(d.idx)) return; const [x, y] = MP(d.at[0], d.at[1]); ctx.fillStyle = S.bossDead.includes(d.key) || (d.chest && d.chest.opened) ? '#6a5a70' : '#b05aff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = '600 13px Alegreya Sans, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(d.name, x, y - 10); ctx.fillStyle = '#e8d0ff'; ctx.fillText(d.name, x, y - 10); });
  S.found.forEach(i => { const r = RUINS[i]; if (!r) return; const [x, y] = MP(r.x, r.z); ctx.fillStyle = r.chest.opened ? '#8a8070' : '#ffd24a'; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 5, y - 5, 10, 10); ctx.font = '600 13px Alegreya Sans, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(r.name, x, y + 20); ctx.fillStyle = '#fff3d0'; ctx.fillText(r.name, x, y + 20); });
  ctx.textAlign = 'center'; ctx.font = '700 18px Cinzel, serif'; ctx.fillText('N', W / 2, 24);
}

// ============================================================
// Overlay: Lebensbalken, Namen, Schadenszahlen, Questmarker
// ============================================================
const overlay = $('overlay'), octx = overlay.getContext('2d');
function resizeOverlay() { overlay.width = innerWidth * devicePixelRatio; overlay.height = innerHeight * devicePixelRatio; octx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
const _v = new V3();
function project(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, behind: _v.z > 1 }; }
function drawOverlay(dt) {
  octx.clearRect(0, 0, innerWidth, innerHeight);
  if (!started) return;
  octx.textAlign = 'center';
  for (const e of enemies) {
    if (e.dead || !e.m.root.visible) continue;
    const d = Math.hypot(e.x - player.pos.x, e.z - player.pos.z);
    if (d > 38 || (e.state !== 'chase' && e.hp >= e.maxHp && d > 14)) continue;
    const top = e.def.top || (e.type === 'wolf' ? 1.6 : 2.4);
    const s = project(e.x, e.y + top, e.z); if (s.behind) continue;
    const big = e.def.boss || e.def.bossLike; const w = big ? 110 : 46;
    octx.fillStyle = 'rgba(0,0,0,.6)'; octx.fillRect(s.x - w / 2 - 1, s.y - 1, w + 2, 7);
    octx.fillStyle = '#c0392b'; octx.fillRect(s.x - w / 2, s.y, w * Math.max(0, e.hp / e.maxHp), 5);
    if (big || d < 14) { octx.font = '600 12px Alegreya Sans, sans-serif'; octx.fillStyle = '#ffdcd0'; octx.fillText(e.def.name, s.x, s.y - 4); }
  }
  for (const n of npcs) {
    const p = n.h.root.position, d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d > 18) continue;
    const s = project(p.x, p.y + 2.45 * n.h.root.scale.y, p.z); if (s.behind) continue;
    octx.font = '600 13px Alegreya Sans, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.6)';
    const nm = n.name.split(',')[0];
    octx.strokeText(nm, s.x, s.y); octx.fillStyle = n.wander ? '#efe2c2' : '#ffd24a'; octx.fillText(nm, s.x, s.y);
  }
  for (const r of NET.others.values()) {
    if (!r.h.root.visible) continue;
    const p = r.h.root.position, d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d > 120) continue;
    const s = project(p.x, p.y + 2.6, p.z); if (s.behind) continue;
    octx.font = '700 14px Alegreya Sans, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.7)';
    octx.strokeText(r.name, s.x, s.y); octx.fillStyle = '#8fd0ff'; octx.fillText(r.name, s.x, s.y);
    if (r.bubble) { octx.font = '600 14px Alegreya Sans, sans-serif'; const w = Math.min(260, octx.measureText(r.bubble.text).width + 16); octx.fillStyle = 'rgba(28,20,12,.85)'; octx.fillRect(s.x - w / 2, s.y - 38, w, 22); octx.fillStyle = '#f3e9d2'; octx.fillText(r.bubble.text.slice(0, 40), s.x, s.y - 22); }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t -= dt; f.p.y += dt * 1.4;
    if (f.t <= 0) { floaters.splice(i, 1); continue; }
    const s = project(f.p.x, f.p.y, f.p.z); if (s.behind) continue;
    octx.globalAlpha = Math.min(1, f.t * 2); octx.font = (f.big ? '700 24px' : '700 17px') + ' Cinzel, serif';
    octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.7)'; octx.strokeText(f.text, s.x, s.y); octx.fillStyle = f.color; octx.fillText(f.text, s.x, s.y);
    octx.globalAlpha = 1;
  }
  // Zeus-Marker
  const zt = zeusTarget();
  if (zt && !mapOpen) {
    const s3 = project(zt.x, groundAt(zt.x, zt.z) + 5, zt.z), m3 = 40;
    let x = s3.behind ? innerWidth - s3.x : s3.x, y = s3.behind ? innerHeight - m3 : s3.y;
    x = clamp(x, m3, innerWidth - m3); y = clamp(y, m3, innerHeight - m3);
    octx.fillStyle = '#b07aff'; octx.strokeStyle = '#1a0030'; octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(x, y - 11); octx.lineTo(x + 8, y); octx.lineTo(x, y + 11); octx.lineTo(x - 8, y); octx.closePath(); octx.fill(); octx.stroke();
    octx.font = '600 12px Alegreya Sans, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.6)'; const lb = '⚡ ' + Math.round(Math.hypot(zt.x - player.pos.x, zt.z - player.pos.z)) + ' m';
    octx.strokeText(lb, x, y + 26); octx.fillStyle = '#e0c8ff'; octx.fillText(lb, x, y + 26);
  }
  // Kopfgeld-Marker
  if (S.bounty && !curD && !mapOpen) {
    const b = S.bounty, s2 = project(b.x, groundAt(b.x, b.z) + 4, b.z), m2 = 40;
    let x = s2.behind ? innerWidth - s2.x : s2.x, y = s2.behind ? innerHeight - m2 : s2.y;
    x = clamp(x, m2, innerWidth - m2); y = clamp(y, m2, innerHeight - m2);
    const d = Math.hypot(b.x - player.pos.x, b.z - player.pos.z);
    octx.fillStyle = '#e0402a'; octx.strokeStyle = '#2a0000'; octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(x, y - 11); octx.lineTo(x + 8, y); octx.lineTo(x, y + 11); octx.lineTo(x - 8, y); octx.closePath(); octx.fill(); octx.stroke();
    octx.font = '600 12px Alegreya Sans, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.6)'; const lb = '☠ ' + Math.round(d) + ' m';
    octx.strokeText(lb, x, y + 26); octx.fillStyle = '#ffb0a0'; octx.fillText(lb, x, y + 26);
  }
  // Questmarker
  const q = questTarget();
  if (q && !mapOpen) {
    const qy = groundAt(q.x, q.z) + 3.5;
    const s = project(q.x, qy, q.z);
    let x = s.x, y = s.y; const m = 40;
    if (s.behind) { x = innerWidth - x; y = innerHeight - m; }
    const off = x < m || x > innerWidth - m || y < m || y > innerHeight - m || s.behind;
    x = clamp(x, m, innerWidth - m); y = clamp(y, m, innerHeight - m);
    const d = Math.hypot(q.x - player.pos.x, q.z - player.pos.z);
    if (d > 4) {
      octx.globalAlpha = off ? 0.75 : 1;
      octx.fillStyle = '#ffd24a'; octx.strokeStyle = '#2a1a00'; octx.lineWidth = 2;
      octx.beginPath(); octx.moveTo(x, y - 11); octx.lineTo(x + 8, y); octx.lineTo(x, y + 11); octx.lineTo(x - 8, y); octx.closePath(); octx.fill(); octx.stroke();
      octx.font = '600 13px Alegreya Sans, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(0,0,0,.6)';
      const t = Math.round(d) + ' m'; octx.strokeText(t, x, y + 26); octx.fillStyle = '#fff3d0'; octx.fillText(t, x, y + 26);
      octx.globalAlpha = 1;
    }
  }
}

// ============================================================
// Inseln, Schiffe, Dungeons, Höhlen, alte Ruinen, Mythen
// ============================================================
const DOCKS = {};
const DOCK_TITLES = { piraeus: 'Piräus', kreta: 'Kreta', thera: 'Thera', seriphos: 'Seriphos', ithaka: 'Ithaka', troja: 'Troja', rhodos: 'Rhodos', ephesos: 'Ephesos', sirenen: 'die Sireneninsel' };
const DOCK_PRICE = { piraeus: 10, kreta: 10, thera: 15, seriphos: 15, sirenen: 12, ithaka: 20, troja: 25, rhodos: 25, ephesos: 22 };
const GEAR = {
  hephklinge: { name: 'Klinge des Hephaistos', desc: 'Eine glühende Götterklinge: +25 Schaden' },
  hadeshelm: { name: 'Helm des Hades', desc: 'Du erleidest 30 % weniger Schaden' },
  poseidon: { name: 'Dreizack des Poseidon & Hippokamp', desc: '+15 Schaden, mehr Reichweite – und im Wasser reitest du ein Seepferd!' },
  pegasus: { name: 'Pegasus & Haupt der Medusa', desc: 'T: Auf Pegasus fliegen  ·  G: Feinde versteinern' },
};
const THEMES = {
  hades: { wall: 0x37323f, floor: 0x26222c, col: 0x4a4452, fire: 0x40ff90, light: 0x70ffb8, H: 9, pool: 0x1a3a7a },
  fire: { wall: 0x4a2a22, floor: 0x33241e, col: 0x5a3a2a, fire: 0xff7a20, light: 0xffa050, H: 9, pool: 0xff5a10 },
  sea: { wall: 0x2f5a5e, floor: 0x3a6a6a, col: 0x5a8a8a, fire: 0x60d0ff, light: 0x90d8ff, H: 9, pool: 0x2080b0 },
  stone: { wall: 0x8a8478, floor: 0x6a665c, col: 0xa8a294, fire: 0xb0ff60, light: 0xd8ffb0, H: 9, pool: 0x3a5a2a },
  cave: { wall: 0x5a4a3a, floor: 0x4a3e30, col: 0x6a5a48, fire: 0xffa040, light: 0xffc070, H: 6.5, pool: 0x2a4a6a },
};
const DUNGEONS = [];
let curD = null;
G.rock = new THREE.DodecahedronGeometry(1, 0);

function downhillRot(x, z) { const e = 3; const gx = heightAt(x + e, z) - heightAt(x - e, z), gz = heightAt(x, z + e) - heightAt(x, z - e); return Math.atan2(-gx, -gz); }
function buildEntrance(def) {
  const [x, z] = def.at;
  const rot = downhillRot(x, z);
  const f = new Frame(x, z, rot);
  f.y = Math.min(heightAt(...f.w(-3, 0)), heightAt(...f.w(3, 0)), f.y);
  const cave = def.theme === 'cave';
  const rockM = lam(cave ? 0x6a5a48 : 0x4e4a50);
  for (const s of [-1, 1]) { f.put(G.rock, rockM, s * 3, 1.6, 0, rand(), rand(), 0, 2.2, 3.6, 2.2); const [wx, wz] = f.w(s * 3, 0); circleCol(wx, wz, 2); }
  f.put(G.rock, rockM, 0, 5.0, 0, 0.3, 0.5, 0, 4.6, 1.9, 2.6);
  f.put(G.rock, rockM, 0, 2.5, -2.2, 0, 0, 0, 4, 4, 2.5);
  f.box(lam(0x030303), 0, -0.2, -0.9, 3.6, 4.6, 0.6);
  const fireM = lam(THEMES[def.theme].fire, THEMES[def.theme].fire);
  if (!cave || def.boss) for (const s of [-1, 1]) {
    const [bx, bz] = f.w(s * 5, 2);
    const bf = new Frame(bx, bz, 0); bf.put(G.cyl8, M.bronze, 0, 0.6, 0, 0, 0, 0, 0.25, 1.2, 0.25); bf.put(G.cyl, M.bronze, 0, 1.3, 0, 0, 0, 0, 1.0, 0.3, 1.0);
    const fm = new THREE.Mesh(G.cone, fireM); fm.position.set(bx, bf.y + 1.85, bz); fm.scale.set(0.7, 1.0, 0.7); scene.add(fm); fires.push(fm); circleCol(bx, bz, 0.5);
  }
  def.out = f.w(0, 5);
  reserve(x, z, 9);
  const [ix, iz] = f.w(0, 1.5);
  interactables.push({ pos: () => new V3(ix, heightAt(ix, iz), iz), label: (cave ? 'Höhle betreten: ' : 'Betreten: ') + def.name, r: 4, fn: () => enterDungeon(def) });
}
function buildDungeonInterior(def) {
  const idx = DUNGEONS.length; def.idx = idx; DUNGEONS.push(def);
  const O = { x: 6500 + (idx % 4) * 450, y: 240, z: -6000 + Math.floor(idx / 4) * 450 };
  const T = THEMES[def.theme], H = T.H;
  const wm = lam(T.wall), fm = lam(T.floor), cm = lam(T.col), fireM = lam(T.fire, T.fire), poolM = lam(T.pool, (T.pool >> 1) & 0x7f7f7f);
  const rooms = []; let cz = 0, cx = 0;
  for (let i = 0; i < def.rooms; i++) {
    const boss = !!def.boss && i === def.rooms - 1;
    const W = boss ? 34 : Math.round(rr(16, 22)), L = boss ? 32 : Math.round(rr(16, 22));
    if (i > 0) cx += rr(-5, 5);
    rooms.push({ x: O.x + cx, z: O.z + cz + L / 2, W, L, boss, H: boss ? H + 3 : H });
    cz += L + 10;
  }
  def.O = O; def.R = rooms; def.H = H;
  const links = []; for (let i = 0; i < rooms.length - 1; i++) links.push((rooms[i].x + rooms[i + 1].x) / 2);
  const F = new Frame(0, 0, 0, O.y);
  const wallX = (xa, xb, z, h) => { if (xb - xa > 0.2) F.box(wm, (xa + xb) / 2, -0.5, z, xb - xa, h + 0.5, 1.2, true); };
  const wallZ = (x, za, zb, h) => { if (zb - za > 0.2) F.box(wm, x, -0.5, (za + zb) / 2, 1.2, h + 0.5, zb - za, true); };
  const dfire = (x, z) => {
    F.put(G.cyl8, cm, x, 0.7, z, 0, 0, 0, 0.3, 1.4, 0.3); F.put(G.cyl, cm, x, 1.5, z, 0, 0, 0, 1.0, 0.3, 1.0); circleCol(x, z, 0.5);
    const m = new THREE.Mesh(G.cone, fireM); m.position.set(x, O.y + 2.05, z); m.scale.set(0.7, 1.0, 0.7); scene.add(m); fires.push(m);
  };
  rooms.forEach((r, i) => {
    const x0 = r.x - r.W / 2, x1 = r.x + r.W / 2, z0 = r.z - r.L / 2, z1 = r.z + r.L / 2;
    F.box(fm, r.x, -1, r.z, r.W + 2.4, 1, r.L + 2.4); F.platform(r.x, r.z, r.W + 2.4, r.L + 2.4, 0);
    F.box(wm, r.x, r.H, r.z, r.W + 2.4, 1, r.L + 2.4);
    wallZ(x0 - 0.6, z0 - 1.2, z1 + 1.2, r.H); wallZ(x1 + 0.6, z0 - 1.2, z1 + 1.2, r.H);
    if (i > 0) { const g = links[i - 1]; wallX(x0 - 1.2, g - 3, z0 - 0.6, r.H); wallX(g + 3, x1 + 1.2, z0 - 0.6, r.H); F.box(wm, g, H, z0 - 0.6, 6, r.H - H + 0.01, 1.2); }
    else wallX(x0 - 1.2, x1 + 1.2, z0 - 0.6, r.H);
    if (i < rooms.length - 1) { const g = links[i]; wallX(x0 - 1.2, g - 3, z1 + 0.6, r.H); wallX(g + 3, x1 + 1.2, z1 + 0.6, r.H); F.box(wm, g, H, z1 + 0.6, 6, r.H - H + 0.01, 1.2); }
    else wallX(x0 - 1.2, x1 + 1.2, z1 + 0.6, r.H);
    // Säulen & Feuer
    const px = r.W / 3.3, pz = r.L / 3.3;
    if (def.theme === 'cave') {
      for (let k = 0; k < 9; k++) { const sx = rr(x0 + 1.5, x1 - 1.5), sz = rr(z0 + 1.5, z1 - 1.5); if (i === 0 && Math.abs(sx - r.x) < 3) continue; const h = rr(1, 3.2); F.put(G.cone, cm, sx, h / 2, sz, 0, 0, 0, rr(0.6, 1.2), h, rr(0.6, 1.2)); circleCol(sx, sz, 0.5); F.put(G.cone, cm, sx + rr(-1, 1), r.H - 0.8, sz + rr(-1, 1), Math.PI, 0, 0, 0.7, rr(1, 2), 0.7); }
      for (let k = 0; k < 14; k++) { const side = k % 4, t = rand(); const sx = side < 2 ? (side ? x0 : x1) : lerp(x0, x1, t), sz = side < 2 ? lerp(z0, z1, t) : (side === 2 ? z0 : z1); F.put(G.rock, wm, sx, rr(0.5, r.H - 1), sz, rand(), rand(), 0, rr(1.4, 2.6), rr(1.4, 2.6), rr(1.4, 2.6)); }
    } else {
      for (const [sx, sz] of [[-px, -pz], [px, -pz], [-px, pz], [px, pz]]) { F.put(G.col, cm, r.x + sx, r.H / 2, r.z + sz, 0, 0, 0, 1.5, r.H, 1.5); circleCol(r.x + sx, r.z + sz, 0.9); }
    }
    for (const [fx, fz] of [[x0 + 1.6, z0 + 1.6], [x1 - 1.6, z0 + 1.6], [x0 + 1.6, z1 - 1.6], [x1 - 1.6, z1 - 1.6]]) dfire(fx, fz);
    // Thema
    if (def.theme === 'fire') for (const s of [-1, 1]) F.box(poolM, r.x + s * (r.W / 2 - 0.9), 0.01, r.z, 1.2, 0.05, r.L - 4);
    if (def.theme === 'hades') { F.box(poolM, r.x, 0.01, r.z, r.W * 0.25, 0.04, r.L - 6); for (let k = 0; k < 8; k++) F.put(G.sphere, lam(0xe6dfc8), rr(x0 + 1, x1 - 1), 0.15, rr(z0 + 1, z1 - 1), 0, 0, 0, 0.35, 0.3, 0.4); }
    if (def.theme === 'sea') { for (const [sx, sz] of [[-px, 0], [px, 0]]) F.put(G.cyl, poolM, r.x + sx, 0.02, r.z + sz, 0, 0, 0, 5, 0.05, 5); for (let k = 0; k < 6; k++) F.put(G.cone, lam(0xd06a6a), rr(x0 + 1, x1 - 1), 0.6, rand() < 0.5 ? z0 + 1 : z1 - 1, 0, 0, 0, 0.5, 1.2, 0.5); }
    if (def.theme === 'stone' && !r.boss) for (let k = 0; k < 3; k++) statue(rr(x0 + 3, x1 - 3), rr(z0 + 3, z1 - 3), rand() * 6.28, 1, lam(0x8e8a80), O.y);
    if (def.theme === 'stone' && r.boss) for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; statue(r.x + Math.cos(a) * 11, r.z + Math.sin(a) * 10, a + Math.PI, 1, lam(0x8e8a80), O.y); }
  });
  links.forEach((g, i) => {
    const za = rooms[i].z + rooms[i].L / 2 + 1.2, zb = rooms[i + 1].z - rooms[i + 1].L / 2 - 1.2;
    F.box(fm, g, -1, (za + zb) / 2, 6.4, 1, zb - za + 0.2); F.platform(g, (za + zb) / 2, 6.4, zb - za + 0.4, 0);
    F.box(wm, g, H, (za + zb) / 2, 8.6, 1, zb - za);
    wallZ(g - 3.6, za, zb, H); wallZ(g + 3.6, za, zb, H);
  });
  const r0 = rooms[0];
  def.start = [r0.x, r0.z - r0.L / 2 + 5];
  // Portal nach draußen
  const pm = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.22, 8, 30), new THREE.MeshBasicMaterial({ color: T.light }));
  pm.position.set(r0.x, O.y + 2.2, r0.z - r0.L / 2 + 0.9); scene.add(pm); fires.push(pm);
  interactables.push({ pos: () => new V3(r0.x, O.y, r0.z - r0.L / 2 + 1.8), label: 'Zurück an die Oberfläche', r: 3.2, fn: exitDungeon });
  // Schatz
  const rl = rooms[rooms.length - 1];
  const ch = addChest(rl.x, O.y, rl.z + rl.L / 2 - 4, Math.PI, def.reward ? 3 : 2);
  ch.dungeon = idx; def.chest = ch;
}
function spawnDungeonEnemies() {
  for (const def of DUNGEONS) {
    def.R.forEach((r, i) => {
      if (i === 0) return;
      if (r.boss) { const e = spawnEnemy(def.boss, r.x, r.z, def.bossOver); e.dungeon = def.idx; e.key = def.key; return; }
      const n = 2 + Math.floor(rand() * 2) + (i === def.R.length - 1 ? 1 : 0);
      for (let k = 0; k < n; k++) { const e = spawnEnemy(pick(def.enemies), r.x + rr(-r.W / 3, r.W / 3), r.z + rr(-r.L / 3, r.L / 3)); e.dungeon = def.idx; }
    });
  }
}
function enterDungeon(def) {
  if (def.req && !def.req()) { toast(def.reqMsg); return; }
  if (player.mounted) dismount();
  fadeTo(() => {
    curD = def;
    player.pos.set(def.start[0], def.O.y + 0.2, def.start[1]); player.vy = 0;
    camYaw = Math.PI; camPitch = 0.25;
    showLoc({ name: def.name, sub: def.sub });
    if (!S.foundD.includes(def.idx)) S.foundD.push(def.idx);
  });
}
function exitDungeon() {
  const def = curD; if (!def) return;
  fadeTo(() => {
    curD = null;
    player.pos.set(def.out[0], groundAt(def.out[0], def.out[1]) + 0.3, def.out[1]); player.vy = 0;
    camYaw = downhillRot(def.at[0], def.at[1]) + Math.PI;
    for (const e of enemies) if (e.dungeon === def.idx && !e.dead) { e.state = 'idle'; e.x = e.home[0]; e.z = e.home[1]; }
    save();
  });
}
function buildDungeons() {
  const L = LOCS;
  const defs = [
    { key: 'hades', name: 'Unterwelt des Hades', sub: 'Reich der Toten – bewacht von Kerberos', at: [L.hadesTor.x, L.hadesTor.z], theme: 'hades', rooms: 4, enemies: ['skelett', 'schatten'], boss: 'kerberos', reward: 'hadeshelm' },
    { key: 'hephaistos', name: 'Schmiede des Hephaistos', sub: 'Im glühenden Herzen des Vulkans', at: [L.hephTor.x, L.hephTor.z], theme: 'fire', rooms: 4, enemies: ['feuergeist', 'skelett'], boss: 'talos', reward: 'hephklinge' },
    { key: 'poseidon', name: 'Grotte des Poseidon', sub: 'Wo die Skylla lauert', at: [L.poseidonTor.x, L.poseidonTor.z], theme: 'sea', rooms: 4, enemies: ['triton'], boss: 'skylla', reward: 'poseidon' },
    { key: 'medusa', name: 'Hort der Medusa', sub: 'Schau ihr niemals in die Augen', at: [L.medusaTor.x, L.medusaTor.z], theme: 'stone', rooms: 4, enemies: ['schlangenkrieger', 'skelett'], boss: 'medusa', reward: 'pegasus' },
    { key: 'typhon', name: 'Gipfel der Stürme', sub: 'Typhon, der Vater der Ungeheuer, erwartet dich', at: [L.typhonTor.x, L.typhonTor.z], theme: 'storm', rooms: 3, enemies: ['harpyie', 'schatten'], boss: 'typhon', reward: 'blitzvogel', req: () => S.zeus >= 5, reqMsg: 'Ein gewaltiger Sturm versperrt den Eingang. (Prüfungen des Zeus – frag Hermes in Olympia)' },
    { key: 'polyphem', name: 'Höhle des Polyphem', sub: 'Hier haust der Zyklop', at: [L.polyphemTor.x, L.polyphemTor.z], theme: 'cave', rooms: 3, enemies: ['wolf'], boss: 'zyklop', bossOver: { name: 'Polyphem', hp: 900, boss: true, money: [150, 150] } },
  ];
  for (const d of defs) { buildDungeonInterior(d); buildEntrance(d); }
  const names = ['Höhle der Nymphen', 'Bärenhöhle', 'Grotte des Pan', 'Höhle der Schatten', 'Kristallhöhle', 'Fledermaushöhle', 'Höhle des Echos'];
  let tries = 0, n = 0;
  const placed = [];
  while (n < names.length && tries < 6000) {
    tries++;
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z), sl = slopeAt(x, z);
    if (h < 8 || h > 95 || sl < 0.28 || sl > 1.2 || inCity(x, z, 1.6) || roadDist(x, z) < 14 || !isFree(x, z, 20)) continue;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 160) || RUINS.some(r => Math.hypot(r.x - x, r.z - z) < 60)) continue;
    const r = downhillRot(x, z), ox = x + Math.sin(r) * 6, oz = z + Math.cos(r) * 6;
    if (heightAt(ox, oz) < 1.5) continue;
    placed.push([x, z]);
    const d = { key: 'cave' + n, name: names[n], sub: 'Eine dunkle Höhle', at: [x, z], theme: 'cave', rooms: 2 + (rand() < 0.5 ? 1 : 0), enemies: ['wolf', 'skelett', 'schatten'] };
    buildDungeonInterior(d); buildEntrance(d); n++;
  }
}

// ---------- Alte Ruinen ----------
const OLD_RUIN_NAMES = ['Ruinen von Mykene', 'Alte Festung', 'Verlassenes Dorf', 'Ruinen von Tiryns', 'Turm der Wächter', 'Grab des Agamemnon', 'Altes Heroon', 'Ruinen von Argos', 'Verfallene Wachstation'];
function buildOldRuins() {
  let tries = 0, n = 0;
  while (n < OLD_RUIN_NAMES.length && tries < 5000) {
    tries++;
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z);
    if (h < 3 || h > 85 || slopeAt(x, z) > 0.35 || inCity(x, z, 1.7) || roadDist(x, z) < 18 || !isFree(x, z, 18)) continue;
    if (RUINS.some(r => Math.hypot(r.x - x, r.z - z) < 140)) continue;
    buildOldRuin(x, z, OLD_RUIN_NAMES[n]); n++;
  }
}
function buildOldRuin(x, z, name) {
  const rot = rand() * 6.28, f = new Frame(x, z, rot);
  reserve(x, z, 14);
  const sm = lam(0xb8ab92), moss = lam(0x8f9870);
  for (const [wx, wz, len, alongX] of [[-7, 0, 10, false], [7, 0, 10, false], [0, -5, 14, true], [0, 5, 14, true]]) {
    for (let k = 0; k < 3; k++) {
      if (rand() < 0.28) continue;
      const seg = len / 3, off = -len / 2 + seg * (k + 0.5), h = rr(0.8, 3.8);
      const px = alongX ? wx + off : wx, pz = alongX ? wz : wz + off;
      f.box(rand() < 0.4 ? moss : sm, px, -0.8, pz, alongX ? seg : 0.9, h + 0.8, alongX ? 0.9 : seg, true);
    }
  }
  for (const s of [-1, 1]) f.box(sm, s * 2, -0.5, 8, 0.9, 4.5, 0.9, true);
  f.box(sm, 0, 4, 8, 5, 0.8, 1);
  for (let k = 0; k < 9; k++) f.put(G.rock, rand() < 0.5 ? moss : sm, rr(-10, 10), 0.2, rr(-8, 10), rand(), rand(), 0, rr(0.5, 1.1), rr(0.4, 0.8), rr(0.5, 1.1));
  for (let k = 0; k < 3; k++) { const [cx, cz] = [rr(-5, 5), rr(-3, 3)]; const h = rr(0.6, 2); f.put(G.col, sm, cx, h / 2, cz, 0, 0, 0, 1, h, 1); const [wx, wz] = f.w(cx, cz); circleCol(wx, wz, 0.6); }
  const [cx, cz] = f.w(rr(-2, 2), rr(-1.5, 1.5));
  const ch = addChest(cx, heightAt(cx, cz), cz, rot, 1, RUINS.length); ch.bonus = true;
  RUINS.push({ x, z, name, chest: ch, y: f.y, kind: 'old', guards: [f.w(-3, 2), f.w(3, -2)] });
}

// ---------- Inseln ----------
function buildIslands() {
  const toP = (L) => [LOCS.piraeus.x - L.x, LOCS.piraeus.z - L.z];
  const T = LOCS.thera, Se = LOCS.seriphos, Si = LOCS.sirenen, I = LOCS.ithaka;
  DOCKS.piraeus = piraeusDock; DOCKS.kreta = kretaDock;
  DOCKS.thera = dock(T, ...toP(T)); DOCKS.seriphos = dock(Se, ...toP(Se)); DOCKS.sirenen = dock(Si, ...toP(Si)); DOCKS.ithaka = dock(I, 1, 0.2);
  for (const k of ['troja', 'rhodos', 'ephesos']) { const L = LOCS[k]; DOCKS[k] = dock(L, ...toP(L)); }
  // Thera: weiße Häuser mit blauen Dächern, kleiner Tempel des Hephaistos, Vulkan
  for (let i = 0; i < 9; i++) house(T.x + rr(-24, 24), T.z + rr(-24, 24), Math.floor(rand() * 4) * Math.PI / 2, rr(4.5, 6), rr(4.5, 6), rr(3, 4), { wall: lam(0xf6f2ea), roof: M.blue });
  temple(new Frame(T.x - 4, T.z + 26, Math.PI), 7, 11, 4, 5, 4.5, { tier: 1 });
  { const px = T.x - 25, pz = T.z + 18, py = heightAt(px, pz); const lava = new THREE.Mesh(G.cyl, lam(0xff5a10, 0xff3a00)); lava.position.set(px, py - 1.2, pz); lava.scale.set(14, 1, 14); scene.add(lava); const lava2 = new THREE.Mesh(G.cone, lam(0xff8a20, 0xff5000)); lava2.position.set(px, py + 1, pz); lava2.scale.set(5, 3, 5); scene.add(lava2); fires.push(lava2); }
  // Seriphos: versteinerte Helden
  for (let i = 0; i < 6; i++) house(Se.x + rr(-22, 22), Se.z + rr(-22, 22), Math.floor(rand() * 4) * Math.PI / 2, rr(5, 6.5), rr(5, 6.5), 3.6);
  let st = 0;
  for (let i = 0; i < 200 && st < 12; i++) { const a = rand() * 6.28, d = rr(35, 95); const x = Se.x + Math.cos(a) * d * 0.6, z = Se.z + Math.sin(a) * d * 0.6; if (heightAt(x, z) < 2 || !isFree(x, z, 3)) continue; statue(x, z, rand() * 6.28, rr(0.9, 1.15), lam(0x8e8a80)); st++; }
  // Sireneninsel: Felsen
  for (let i = 0; i < 16; i++) { const x = Si.x + rr(-50, 50), z = Si.z + rr(-50, 50); if (heightAt(x, z) < 0.5) continue; addStatic(G.rock, lam(0x7a746a), x, heightAt(x, z) + 0.5, z, rand(), rand(), 0, rr(1.5, 4), rr(1.5, 5), rr(1.5, 4)); circleCol(x, z, 2); }
  // Ithaka: Palast des Odysseus
  stoa(new Frame(I.x + 4, I.z - 18, 0), 22, 7, 8, 4.5);
  for (let i = 0; i < 7; i++) house(I.x + rr(-28, 28), I.z + rr(-5, 28), Math.floor(rand() * 4) * Math.PI / 2, rr(5, 6.5), rr(5, 6.5), 3.8);
  fountain(I.x - 8, I.z + 2);
}
function buildIslandNPCs() {
  const names = { thera: 'Fährmann Iason', seriphos: 'Fährmann Glaukos', sirenen: 'Fährmann Nereus', ithaka: 'Fährmann Eumaios', troja: 'Fährmann Aineias', rhodos: 'Fährmann Helios', ephesos: 'Fährmann Kroisos' };
  for (const [k, nm] of Object.entries(names)) { const d = DOCKS[k]; if (d) addNPC(nm, d.boatman[0], d.boatman[1], { tunic: 0x6a5a3a, beard: true, pants: 0x3a3024 }, () => talkFerry(k)); }
  const vl = (L, n) => { for (let i = 0; i < n; i++) { let x, z, t = 0; do { x = L.x + rr(-L.r, L.r); z = L.z + rr(-L.r, L.r); t++; } while (t < 20 && heightAt(x, z) < 1); const line = pick(ISLAND_LINES[L === LOCS.thera ? 'thera' : L === LOCS.seriphos ? 'seriphos' : 'ithaka']); addNPC(pick(['Ariadne', 'Phoibe', 'Demetrios', 'Nikolaos', 'Kostas', 'Eirene']), x, z, { tunic: pick([0xe8e0cc, 0x3a5a8a, 0x9b3b2b]), pants: 0x3a3024, beard: rand() < 0.5 }, function () { talk([{ who: this.name, text: line }]); }, 10); } };
  vl(LOCS.thera, 3); vl(LOCS.seriphos, 3); vl(LOCS.ithaka, 3);
  const Si = LOCS.sirenen;
  for (let i = 0; i < 2; i++) { let x, z, t = 0; do { x = Si.x + rr(-12, 12); z = Si.z + rr(-12, 12); t++; } while (t < 20 && heightAt(x, z) < 1); addNPC('Sirene', x, z, { tunic: 0xbfe6f0, pants: 0x8fbcc8, veil: 0xe0f4ff, skin: 0xe8c8b0, wreath: true }, function () { talk([{ who: 'Sirene', text: pick(['♪ Komm näher, Held … bleib bei uns für immer … ♪', '♪ Wir kennen alle Geheimnisse des Meeres … in der Grotte des Poseidon wartet die Skylla … ♪', '♪ Odysseus band sich an den Mast, um uns zu hören. Und du? ♪']) }]); }, 4); }
  const I = LOCS.ithaka;
  addNPC('Penelope', I.x + 4, I.z - 10, { tunic: 0xe8dcc0, pants: 0xc8bca0, veil: 0x6b2f7a, skin: 0xd9a577 }, function () { talk([{ who: 'Penelope', text: 'Seit zwanzig Jahren webe ich und warte auf Odysseus. Er hat den Zyklopen Polyphem geblendet – nun haust das Ungeheuer in einer Höhle im Westen der Insel. Nimm dich in Acht!' }]); });
  addNPC('Chiron, der Kentaur', ...ll(23.1, 39.33), { model: makeCentaur({ tunic: 0xe8e0cc, beard: true, hair: 0xb8b0a0, body: 0x8a6a4a, weapon: 'staff' }) }, talkChiron);
}
const ISLAND_LINES = {
  thera: ['Der Vulkan grollt jede Nacht. Man sagt, Hephaistos schmiedet darin.', 'Am Hang des Vulkans gibt es einen Eingang – aber nur Narren gehen hinein.', 'Ein bronzener Riese bewacht die Schmiede. Talos heißt er.'],
  seriphos: ['Siehst du die Statuen? Das waren einmal Helden … Medusa hat sie versteinert.', 'Perseus? Ach, der ist lange fort. Und Medusa lebt wieder im Hort im Osten.', 'Wer Medusa besiegt, dem schenken die Götter Pegasus, sagt man.'],
  ithaka: ['Willkommen auf Ithaka! Unser König Odysseus irrt noch immer übers Meer.', 'Hör nicht auf die Sirenen, wenn du nach Osten segelst!', 'In der Höhle im Westen brüllt Polyphem. Ein Riese mit nur einem Auge.'],
};
function talkChiron() {
  const W = 'Chiron';
  const opts = [
    { label: 'Erzähl mir von den Göttern und ihren Schätzen.', fn: () => talk([
      { who: W, text: 'Vier Götter haben ihre Schätze tief unter der Erde verborgen.' },
      { who: W, text: 'Hades: Das Tor zur Unterwelt liegt im Gebirge südlich von Sparta. Kerberos bewacht dort den Helm des Hades.' },
      { who: W, text: 'Hephaistos: Seine Schmiede liegt im Vulkan von Thera. Der Bronzeriese Talos hütet die Flammenklinge.' },
      { who: W, text: 'Poseidon: Auf der Sireneninsel führt eine Grotte hinab zur Skylla. Wer sie besiegt, erhält den Dreizack – und ein Seepferd.' },
      { who: W, text: 'Und auf Seriphos haust Medusa. Aus ihrem Blut wird Pegasus geboren, das geflügelte Pferd. Doch schau ihr nie in die Augen!' },
      { who: W, text: 'Die Fährleute in Piräus bringen dich zu allen Inseln. Oder kauf dir ein eigenes Schiff.' } ]) },
    { label: player.chiron ? 'Training (bereits abgeschlossen)' : 'Trainiere mich (80 Drachmen): +5 Schaden', fn: () => { if (!player.chiron && spend(80)) { player.chiron = true; player.dmg += 5; toast('Chirons Training: Schaden +5', 'gold'); } } },
    { label: 'Leb wohl.', fn: () => { } },
  ];
  if (legendCount() === LEGENDS.length && !player.gear.includes('kentaur')) { talk([
    { who: W, text: 'Du hast es geschafft! Kerberos, Talos, Skylla, Medusa, Polyphem, der Nemeische Löwe und der Kalydonische Eber – alle sieben Ungeheuer sind besiegt!' },
    { who: W, text: 'Kein Sterblicher vor dir hat das vollbracht. Darum gebe ich dir ein Geschenk, das nur ein Kentaur geben kann: unsere Gestalt. Drücke K – und lauf schneller als der Wind!', fn: () => { gainGear('kentaur'); banner('Gestalt des Kentauren', 'K: Verwandle dich und galoppiere durch ganz Hellas!'); } }]); return; }
  opts.unshift({ label: 'Die Prüfung der Kentauren (' + legendCount() + '/7 Ungeheuer)', fn: () => talk([{ who: W, text: 'Besiege die sieben legendären Ungeheuer, dann schenke ich dir die Gestalt der Kentauren. Bisher: ' + LEGENDS.map(([k, n]) => (legendDone(k) ? '✔ ' : '✘ ') + n).join(', ') + '.' }]) });
  talk([{ who: W, text: 'Sei gegrüßt, junger Held. Ich bin Chiron, Lehrer des Achilles und des Herakles. Meine wilden Brüder im Wald östlich von hier sind weniger freundlich …', opts }]);
}

// ---------- Reittiere & Schiff ----------
function makePegasus() {
  const p = makeHorse(0xf4f0ea, false);
  p.wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.4, 1.75, 0.2); p.root.add(w);
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.0), lam(0xffffff)); m.position.set(s * 1.2, 0, 0); m.castShadow = true; w.add(m);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), lam(0xe8eef8)); m2.position.set(s * 2.6, 0, -0.1); w.add(m2);
    p.wings.push(w);
  }
  return p;
}
function makeHippo() {
  const p = makeHorse(0x3a9a9a, false);
  p.legs[2].visible = false; p.legs[3].visible = false; p.tail.visible = false;
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 6), lam(0x2a7a8a)); fin.position.set(0, 1.2, -1.6); fin.rotation.x = -Math.PI / 2; p.root.add(fin);
  const fin2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.6), lam(0x5ac0c0)); fin2.position.set(0, 1.25, -2.5); p.root.add(fin2);
  return p;
}
function makeShip() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(3.6, 1.6, 15), M.darkwood, 0, 0.2, 0);
  add(new THREE.BoxGeometry(3.7, 0.25, 15.2), M.red, 0, 1.0, 0);
  add(new THREE.ConeGeometry(0.5, 2.4, 4), M.bronze, 0, 0.0, 8.4, Math.PI / 2);
  add(new THREE.BoxGeometry(1.2, 2.2, 1.2), M.darkwood, 0, 1.6, -7.2, 0.4);
  add(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), M.wood, 0, 4.8, 0.5);
  add(new THREE.BoxGeometry(6, 4.2, 0.08), M.sail, 0, 5.0, 0.7);
  add(new THREE.BoxGeometry(6.05, 0.6, 0.1), M.red, 0, 6.6, 0.72);
  add(new THREE.BoxGeometry(7, 0.2, 0.2), M.wood, 0, 7.2, 0.6);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.08, 0.08, 3, 5), M.wood, s * 2.5, 0.3, -5 + i * 2, 0, 0, s * 1.2);
  return { root: g };
}
let pegasus, hippo, ship, torch;
function toggleShip() {
  if (curD) return;
  if (player.sailing) {
    const P = player.pos;
    for (let r = 4; r <= 18; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (heightAt(x, z) > 0.4) { player.sailing = false; ship.root.visible = false; player.pos.set(x, groundAt(x, z) + 0.3, z); player.vy = 0; toast('Du gehst an Land.'); return; } }
    toast('Kein Land in der Nähe zum Anlegen.'); return;
  }
  if (!player.hasShip) { toast('Du hast noch kein Schiff. Der Schiffsbauer in Piräus verkauft welche.'); return; }
  const P = player.pos;
  for (let r = 0; r <= 14; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (heightAt(x, z) < -2.2) {
    if (player.mounted) dismount(); if (player.flying) stopFlying(true);
    player.sailing = true; player.shipSpeed = 0; player.pos.set(x, 0.9, z); ship.root.visible = true; toast('An Bord! WASD steuern, B zum Anlegen.'); sfx('quest'); return; } }
  toast('Stell dich ans Ufer, um dein Schiff zu rufen.');
}
function buyShip() { talkShipwright(); }
function sailTo(k, price) {
  if (!spend(price)) return;
  fadeTo(() => { const d = DOCKS[k]; if (player.mounted) dismount(); player.sailing = false; ship.root.visible = false; player.pos.set(d.land[0], groundAt(d.land[0], d.land[1]) + 0.5, d.land[1]); player.vy = 0; camYaw = d.rot + Math.PI; toast('Du erreichst ' + DOCK_TITLES[k] + '.'); });
}
function talkFerry(from) {
  const D = DOCKS[from]; if (!D) return;
  const opts = [];
  for (const k of Object.keys(DOCK_TITLES)) { if (k === from || !DOCKS[k] || (k === 'sirenen' && from === 'piraeus')) continue; opts.push({ label: 'Nach ' + DOCK_TITLES[k] + ' segeln (' + DOCK_PRICE[k] + ' Drachmen)', fn: () => sailTo(k, DOCK_PRICE[k]) }); }
  if (!player.hasShip) opts.push({ label: 'Eigenes Schiff kaufen (Schiffsbauer)', fn: buyShip });
  opts.push({ label: 'Nein danke.', fn: () => { } });
  talk([{ who: 'Fährmann', text: from === 'piraeus' ? 'Meine Schiffe fahren durch die ganze Ägäis: Kreta, Thera, Seriphos, Ithaka, Troja, Rhodos und Ephesos. Zur Sireneninsel fährt niemand freiwillig – dafür brauchst du ein eigenes Schiff!' : 'Wohin soll ich dich bringen, Wanderer?', opts }]);
}
function toggleFly() {
  if (!player.gear.includes('pegasus')) { toast('Besiege Medusa auf Seriphos, um Pegasus zu erhalten.'); return; }
  if (curD) { toast('Unter der Erde kann Pegasus nicht fliegen.'); return; }
  if (player.flying) { stopFlying(false); return; }
  if (player.mounted) dismount(); if (player.sailing) return;
  player.flying = true; pegasus.root.visible = true; player.vy = 0; player.pos.y += 1;
  toast('Pegasus! Leertaste: steigen · C: sinken · T: landen'); sfx('quest');
}
function stopFlying(force) {
  const g = Math.max(groundAt(player.pos.x, player.pos.z), -0.5);
  if (!force && player.pos.y - g > 4) { toast('Lande zuerst (C gedrückt halten).'); return; }
  player.flying = false; pegasus.root.visible = false; player.vy = 0;
}
function medusaHead() {
  if (!player.gear.includes('pegasus')) return;
  if (player.medCd > 0) { toast('Das Haupt der Medusa ruht noch … (' + Math.ceil(player.medCd) + ' s)'); return; }
  player.medCd = 20; flash = 0.6; sfx('zap');
  let n = 0;
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - player.pos.x, e.z - player.pos.z) < 22) { e.stoned = e.def.boss ? 2.5 : 7; n++; floatText(e.x, e.y + 2.6, e.z, 'Versteinert', '#c8c8c0'); }
  toast(n ? n + ' Feinde versteinert!' : 'Kein Feind in der Nähe.');
}
function gainGear(k) {
  if (player.gear.includes(k)) return;
  player.gear.push(k);
  if (k === 'hephklinge') player.dmg += 25;
  if (k === 'poseidon') player.dmg += 15;
  banner(GEAR[k].name, GEAR[k].desc);
  toast('Göttlicher Schatz: ' + GEAR[k].name, 'gold');
  refreshHeroLook(); save();
}

// ---------- Mythische Kreaturen (Modelle) ----------
function makeCentaur(o) {
  const hz = makeHorse(o.body ?? 0x7a5230, false);
  const hu = makeHumanoid(Object.assign({}, o, { scale: undefined }));
  hu.legL.visible = false; hu.legR.visible = false;
  hu.root.position.set(0, 0.85, 0.75); hz.root.add(hu.root);
  return { root: hz.root, legs: hz.legs, tail: hz.tail, phase: 0, legL: hu.legL, legR: hu.legR, armL: hu.armL, armR: hu.armR, head: hu.head, weapon: hu.weapon, centaur: true };
}
function makeHarpy() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, p = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const fe = lam(0x6a4a3a);
  add(new THREE.BoxGeometry(0.5, 0.8, 0.4), fe, 0, 1.2, 0);
  add(new THREE.SphereGeometry(0.2, 10, 8), lam(0xc9a080), 0, 1.8, 0.05);
  add(new THREE.SphereGeometry(0.22, 10, 8, 0, 6.3, 0, 1.8), lam(0x1a1008), 0, 1.84, -0.02);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.03, 6, 4), lam(0xff3020, 0xff2000), s * 0.07, 1.83, 0.2);
  for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.06, 0.4, 4), lam(0xd0c080), s * 0.12, 0.65, 0.05).rotation.x = Math.PI;
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.25, 1.5, -0.05); g.add(w); add(new THREE.BoxGeometry(1.6, 0.06, 0.7), fe, s * 0.8, 0, 0, w); wings.push(w); }
  return { root: g, wings, phase: 0 };
}
function makeSkylla() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, p = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const sk = lam(0x2f6a6a), dk = lam(0x1a3a3a);
  add(new THREE.SphereGeometry(1, 16, 12), sk, 0, 1.4, 0).scale.set(2.2, 1.5, 2.2);
  const necks = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const n = new THREE.Group(); n.position.set(Math.cos(a) * 1.2, 2.4, Math.sin(a) * 1.2 + 0.6); n.rotation.y = a; g.add(n);
    const neck = add(new THREE.CylinderGeometry(0.22, 0.32, 3, 8), sk, 0, 1.5, 0, n);
    const head = add(new THREE.BoxGeometry(0.5, 0.45, 0.8), dk, 0, 3.1, 0.25, n);
    add(new THREE.BoxGeometry(0.42, 0.08, 0.5), lam(0xf0f0e0), 0, -0.2, 0.25, head);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 6, 4), lam(0xffee40, 0xffcc00), s * 0.16, 0.12, 0.3, head);
    necks.push(n);
  }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const t = add(new THREE.ConeGeometry(0.3, 2.6, 6), dk, Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2); t.rotation.z = Math.cos(a) * 1.3; t.rotation.x = -Math.sin(a) * 1.3; }
  return { root: g, necks, phase: 0 };
}

// ============================================================
// Mehrspieler & Cloud-Speicher (Cloudflare Worker, siehe /server)
// ============================================================
const NET = { ws: null, id: null, others: new Map(), sendT: 0, retry: 2, lastCloud: 0, chatOpen: false, online: false, room: 'lobby-1', max: 30, towns: null, lobbies: [] };
const CAPE_COLORS = [0x1c3a7a, 0x7a1c1c, 0x1c6a3a, 0x6a1c6a, 0x8a6a1c, 0x1c6a7a, 0x3a3a3a, 0xb04a1a];
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function serverBase() { return (lsGet('hellas-server') || window.HELLAS_SERVER || '').trim().replace(/\/$/, ''); }
function mpEnabled() { return !!serverBase() && !!NET.account && !NET.banned; }
function heroName() { return NET.account ? NET.account.name : (lsGet('hellas-name') || 'Held').slice(0, 20); }
function nameHash(n) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function lookForNet() { const l = heroLook(); return { tunic: l.tunic, cape: l.cape, crest: l.crest, armor: l.armor, helmetCol: l.helmetCol || undefined, shieldEmblem: l.shieldEmblem, weapon: l.weapon }; }
function netConnect() {
  if (!mpEnabled() || NET.ws) return;
  let ws;
  try { ws = new WebSocket(serverBase().replace(/^http/, 'ws') + '/ws?room=' + encodeURIComponent(NET.room)); } catch (e) { return; }
  NET.ws = ws;
  ws.onopen = () => { NET.online = true; NET.retry = 2; ws.send(JSON.stringify({ t: 'hello', token: NET.account.token, look: lookForNet() })); updateOnlineBadge(); };
  ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } netHandle(m); };
  ws.onclose = () => {
    const was = NET.online; NET.ws = null; NET.online = false; NET.id = null;
    for (const id of [...NET.others.keys()]) removeRemote(id);
    updateOnlineBadge();
    if (NET.banned || NET.noRetry) return;
    if (was) toast('Verbindung zum Server verloren – versuche erneut …');
    if (NET.fullHop) { NET.fullHop = false; NET.retry = 0.5; } else NET.retry = Math.min(60, NET.retry * 2);
    setTimeout(netConnect, NET.retry * 1000);
  };
  ws.onerror = () => { };
}
function netHandle(m) {
  if (m.t === 'welcome') {
    NET.id = m.id; NET.room = m.room; NET.max = m.max || 10;
    for (const p of m.players) addRemote(p);
    NET.towns = m.towns; syncTowns();
    toast(lobbyLabel(NET.room) + ': ' + (m.players.length ? m.players.length + ' weitere Helden' : 'du bist der erste Held hier'), 'gold');
  }
  else if (m.t === 'denied' || m.t === 'banned') { NET.noRetry = true; if (m.t === 'banned') { NET.banned = true; banner('Du wurdest gebannt', 'Ein Admin hat dein Konto gesperrt.'); } else toast('Verbindung abgelehnt: ' + m.reason); }
  else if (m.t === 'full') { toast(lobbyLabel(NET.room) + ' ist voll (' + m.max + '/' + m.max + ') – wechsle in die nächste Lobby …'); NET.room = 'lobby-' + (+NET.room.split('-')[1] + 1); NET.fullHop = true; }
  else if (m.t === 'towns') {
    const before = NET.towns || {};
    NET.towns = m.towns;
    for (const [k, T] of Object.entries(m.towns)) { const B = before[k]; if (B && isMine(B) && T && !isMine(T)) banner('Deine Stadt ' + T.name + ' wurde erobert!', 'Von ' + T.ownerName + ' – hol sie dir zurück!'); }
    syncTowns();
    if (m.event) { chatLine('Herold', m.event, false); if (m.by !== NET.id) toast(m.event); }
  }
  else if (m.t === 'join') { addRemote(m); toast(m.name + ' hat Hellas betreten.'); }
  else if (m.t === 'leave') { removeRemote(m.id); toast(m.name + ' hat Hellas verlassen.'); }
  else if (m.t === 'st') { const r = NET.others.get(m.id); if (r) { r.st = m; if (!r.seen) { r.seen = true; r.pos.set(m.x, m.y, m.z); r.yaw = m.yaw; } } }
  else if (m.t === 'look') { const r = NET.others.get(m.id); if (r) { r.look = m.look; rebuildRemote(r); } }
  else if (m.t === 'chat') { chatLine((m.admin ? '★ ' : '') + m.name, m.text, m.id === NET.id); const r = NET.others.get(m.id); if (r) r.bubble = { text: m.text, t: 6 }; }
  updateOnlineBadge();
}
function remoteLook(look) { return Object.assign({ tunic: 0x9b1c1c, armor: 0x7a5a3a, helmet: true, crest: 0xe8c46a, shield: true, shieldCol: 0xb98d3a, shieldEmblem: 0x1c3a7a, weapon: 'sword', cape: 0x1c3a7a, pants: 0x3a2a1e, hair: 0x2a1a0e }, look || {}); }
function addRemote(p) {
  if (!p || p.id === NET.id || NET.others.has(p.id)) return;
  const r = { id: p.id, name: p.name, look: p.look, h: null, pos: new V3(0, -500, 0), yaw: 0, st: p.st || null, seen: false, mounts: {}, atkT: 0, lastAtk: false, bubble: null };
  if (p.st) { r.pos.set(p.st.x, p.st.y, p.st.z); r.seen = true; }
  rebuildRemote(r);
  NET.others.set(p.id, r);
}
function rebuildRemote(r) { if (r.h) scene.remove(r.h.root); r.h = makeHumanoid(remoteLook(r.look)); scene.add(r.h.root); }
function removeRemote(id) { const r = NET.others.get(id); if (!r) return; scene.remove(r.h.root); for (const m of Object.values(r.mounts)) scene.remove(m.root); NET.others.delete(id); }
function remoteMount(r, kind) {
  if (!r.mounts[kind]) { r.mounts[kind] = kind === 'h' ? makeHorse() : kind === 'p' ? makePegasus() : kind === 'k' ? makeHippo() : makeShip(); scene.add(r.mounts[kind].root); }
  return r.mounts[kind];
}
function updateRemotes(dt) {
  const t = clock.elapsedTime;
  for (const r of NET.others.values()) {
    const s = r.st;
    if (!s) { r.h.root.visible = false; continue; }
    const k = Math.min(1, dt * 10);
    const jump = Math.hypot(s.x - r.pos.x, s.z - r.pos.z) > 60;
    if (jump) r.pos.set(s.x, s.y, s.z); else { r.pos.x = lerp(r.pos.x, s.x, k); r.pos.y = lerp(r.pos.y, s.y, k); r.pos.z = lerp(r.pos.z, s.z, k); }
    r.yaw = angLerp(r.yaw, s.yaw, k);
    const vis = Math.hypot(r.pos.x - player.pos.x, r.pos.z - player.pos.z) < 450;
    r.h.root.visible = vis;
    for (const [kind, m] of Object.entries(r.mounts)) m.root.visible = vis && s.m === kind;
    if (!vis) continue;
    if (s.atk && !r.lastAtk) r.atkT = 1; r.lastAtk = s.atk; r.atkT = Math.max(0, r.atkT - dt * 2.6);
    const P = r.pos; let hy = 0, sitting = false;
    if (s.m === 'h' || s.m === 'p') { hy = 1.3; sitting = true; const m = remoteMount(r, s.m); m.root.position.copy(P); m.root.rotation.y = r.yaw; animateQuad(m, s.m === 'h' ? s.sp * 0.6 : 0, dt); if (m.wings) { const f = Math.sin(t * 8) * 0.7; m.wings[0].rotation.z = 0.3 + f; m.wings[1].rotation.z = -0.3 - f; } }
    if (s.m === 'k') { hy = 1.0; sitting = true; const m = remoteMount(r, 'k'); m.root.position.set(P.x, P.y - 0.4, P.z); m.root.rotation.y = r.yaw; }
    if (s.m === 's') { const m = remoteMount(r, 's'); m.root.position.set(P.x, -0.2, P.z); m.root.rotation.y = r.yaw; r.h.root.position.set(P.x - Math.sin(r.yaw) * 5.5, P.y + 0.3, P.z - Math.cos(r.yaw) * 5.5); }
    else r.h.root.position.set(P.x, P.y + hy, P.z);
    r.h.root.rotation.y = r.yaw;
    animateHumanoid(r.h, sitting ? 0 : s.sp, dt, { attack: r.atkT, sitting });
    if (r.bubble) { r.bubble.t -= dt; if (r.bubble.t <= 0) r.bubble = null; }
  }
}
function netSend(dt) {
  if (!NET.ws || NET.ws.readyState !== 1 || !NET.id) return;
  NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = 0.12;
  const P = player.pos;
  const m = player.sailing ? 's' : (player.flying || player.bird) ? 'p' : player.form === 'centaur' ? 'h' : player.form === 'siren' ? 'k' : player.mounted ? 'h' : (player.swimming && player.gear.includes('poseidon')) ? 'k' : '';
  const st = { t: 'st', x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yaw: +player.yaw.toFixed(2), sp: +Math.min(60, player.speedNow).toFixed(1), m, atk: player.atkAnim > 0.5, d: curD ? curD.idx : -1 };
  const key = JSON.stringify(st), now = performance.now();
  if (key === NET.lastSt && now - (NET.lastStT || 0) < 1000) return;
  NET.lastSt = key; NET.lastStT = now;
  NET.ws.send(key);
}
function netSendLook() { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify({ t: 'look', look: lookForNet() })); }
function lobbyLabel(r) { return 'Lobby ' + String(r || '').split('-')[1]; }
function updateOnlineBadge() {
  const b = $('online'); if (!b) return;
  if (!serverBase()) { b.textContent = ''; return; }
  b.textContent = NET.online ? '🌐 ' + lobbyLabel(NET.room) + ' · ' + (NET.others.size + 1) + '/' + NET.max + ' Helden' : (mpEnabled() ? '🌐 Verbinde …' : '');
}
// ---------- Chat ----------
function chatLine(name, text, mine) {
  const box = $('chatLog'); if (!box) return;
  const d = document.createElement('div'); d.className = 'chatline';
  const b = document.createElement('b'); b.textContent = name + ': '; if (mine) b.style.color = '#ffd24a';
  d.appendChild(b); d.appendChild(document.createTextNode(text));
  box.appendChild(d); while (box.children.length > 8) box.firstChild.remove();
  setTimeout(() => d.classList.add('old'), 15000);
}
function openChat() {
  if (!NET.online) { toast('Der Chat ist nur online verfügbar.'); return; }
  NET.chatOpen = true; for (const k in keys) keys[k] = false;
  const inp = $('chatInput'); inp.classList.remove('hidden'); inp.value = ''; inp.focus();
}
function closeChat(send) {
  const inp = $('chatInput'); const text = inp.value.trim();
  if (send && text && NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify({ t: 'chat', text: text.slice(0, 160) }));
  inp.blur(); inp.classList.add('hidden'); NET.chatOpen = false;
}
async function loadLobbies() {
  const sel = $('lobbySel'); sel.classList.remove('hidden');
  try { const j = await (await fetch(serverBase() + '/api/lobbies')).json(); NET.lobbies = j.lobbies || []; NET.max = j.max || 10; } catch (e) { NET.lobbies = []; }
  sel.innerHTML = '';
  const add = (v, t, dis) => { const o = document.createElement('option'); o.value = v; o.textContent = t; o.disabled = !!dis; sel.appendChild(o); };
  add('auto', 'Automatisch – freie Lobby beitreten');
  for (const l of NET.lobbies) add(l.room, lobbyLabel(l.room) + '  (' + l.count + '/' + l.max + ' Helden)' + (l.count >= l.max ? ' – voll' : ''), l.count >= l.max);
  add('new', 'Neue Lobby eröffnen');
}
function chooseRoom() {
  const v = $('lobbySel').value || 'auto';
  const nums = NET.lobbies.map(l => +l.room.split('-')[1]);
  const fresh = () => { let n = 1; while (nums.includes(n)) n++; return 'lobby-' + n; };
  if (v === 'new') return fresh();
  if (v === 'auto') { const free = NET.lobbies.find(l => l.count < l.max); return free ? free.room : fresh(); }
  return v;
}
// ---------- Konto (Name + Passwort), Cloud-Spielstand & Rangliste ----------
function saveKey() { return 'hellas-save' + (NET.account ? '-' + NET.account.name.toLowerCase() : ''); }
async function accCall(body, path = '/api/account') {
  const r = await fetch(serverBase() + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: 'Serverfehler' }));
  if (!r.ok || j.error) { const e = new Error(j.error || 'Fehler'); e.banned = j.banned; throw e; }
  return j;
}
function grantAdminGear() {
  if (!NET.account || !NET.account.admin) return;
  let got = false;
  for (const k of ['keraunos', 'blitzvogel']) if (!player.gear.includes(k)) { player.gear.push(k); got = true; }
  if (got && started) setTimeout(() => toast('⚡ Admin: Keraunos (X/V) und Blitzadler (U) freigeschaltet', 'gold'), 2500);
}
function setAccount(j) {
  NET.account = { name: j.name, token: j.token, admin: !!j.admin };
  lsSet('hellas-session', JSON.stringify(NET.account));
  if (j.data) lsSet(saveKey(), JSON.stringify(j.data));
  updateMenuAccount();
  if (started) grantAdminGear();
}
function logout() {
  if (NET.account) accCall({ op: 'logout', token: NET.account.token }).catch(() => { });
  NET.account = null; try { localStorage.removeItem('hellas-session'); } catch (e) { }
  updateMenuAccount();
}
function updateMenuAccount() {
  const acc = NET.account, has = !!serverBase();
  $('loginBox').classList.toggle('hidden', !!acc || !has);
  $('accInfo').classList.toggle('hidden', !acc);
  $('lobbySel').classList.toggle('hidden', !acc);
  if (acc) $('accLabel').textContent = acc.name + (acc.admin ? ' (Admin)' : '');
  $('btnLoad').classList.toggle('hidden', !loadSave());
  $('btnNew').textContent = acc ? 'Neues Spiel (online)' : 'Neues Spiel (offline)';
  $('mpStatus').textContent = !has ? 'Einzelspieler (kein Server eingerichtet)' : acc ? '🌐 Angemeldet – Mehrspieler, Cloud-Speicher und Rangliste aktiv' : 'Melde dich an, um online zu spielen – oder spiel offline.';
  if (acc) loadLobbies();
}
function cloudSave(force) {
  if (!NET.account || !serverBase()) return;
  const now = Date.now(); if (!force && now - NET.lastCloud < 30000) return; NET.lastCloud = now;
  accCall({ op: 'save', token: NET.account.token, data: saveData() }).catch(() => { });
}
async function showLeaderboard() {
  const el = $('leader'); if (!el) return;
  if (!serverBase()) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); el.textContent = 'Lade …';
  try {
    const j = await (await fetch(serverBase() + '/api/leaderboard')).json();
    el.textContent = '';
    const h = document.createElement('h3'); h.textContent = 'Heldenrangliste'; el.appendChild(h);
    const ol = document.createElement('ol');
    for (const row of j.top || []) { const li = document.createElement('li'); li.textContent = row.name + ' – ' + row.score; ol.appendChild(li); }
    if (!(j.top || []).length) ol.textContent = 'Noch keine Helden eingetragen.';
    el.appendChild(ol);
    const c = document.createElement('div'); c.className = 'code'; c.textContent = NET.account ? 'Angemeldet als ' + NET.account.name + ' – dein Spielstand wird automatisch in der Cloud gespeichert.' : 'Offline – melde dich an, um in die Rangliste zu kommen.'; el.appendChild(c);
  } catch (e) { el.textContent = 'Server nicht erreichbar.'; }
}
// ---------- Automatische Updates ----------
const UPD = { tags: null, pending: false };
async function fileTags() {
  const out = {};
  for (const f of ['game.js', 'index.html', 'config.js']) {
    const r = await fetch(f + '?check=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    out[f] = r.headers.get('etag') || r.headers.get('last-modified') || String(r.headers.get('content-length'));
  }
  return out;
}
async function checkForUpdate() {
  if (UPD.pending || location.protocol === 'file:') return;
  try {
    const t = await fileTags();
    if (!UPD.tags) { UPD.tags = t; return; }
    if (Object.keys(t).some(k => t[k] && UPD.tags[k] && t[k] !== UPD.tags[k])) applyUpdate();
  } catch (e) { /* offline – später erneut */ }
}
function applyUpdate() {
  UPD.pending = true;
  if (!started) { location.reload(); return; }
  let n = 10;
  banner('✨ Neue Version verfügbar!', 'Dein Spielstand wird gespeichert – das Spiel aktualisiert sich in 10 Sekunden.');
  const tick = setInterval(() => {
    n--;
    if (n > 0) { if (n <= 5) toast('Update in ' + n + ' …'); return; }
    clearInterval(tick);
    if (curD) { toast('Update wartet, bis du den Dungeon verlässt.'); UPD.pending = false; return; }
    save(); cloudSave(true);
    try { sessionStorage.setItem('hellas-autocontinue', '1'); } catch (e) { }
    setTimeout(() => location.reload(), 400);
  }, 1000);
}
function autoContinueAfterUpdate() {
  let flag = null; try { flag = sessionStorage.getItem('hellas-autocontinue'); sessionStorage.removeItem('hellas-autocontinue'); } catch (e) { }
  if (!flag) return;
  const t0 = Date.now();
  const go = () => {
    if (started) return;
    const waitingForLogin = lsGet('hellas-session') && !NET.account && Date.now() - t0 < 5000;
    if (waitingForLogin) { setTimeout(go, 250); return; }
    startGame(!!loadSave());
    setTimeout(() => toast('✨ Spiel aktualisiert – viel Spaß mit der neuen Version!', 'gold'), 1500);
  };
  setTimeout(go, 300);
}
function setupMenuNet() {
  const q = new URLSearchParams(location.search);
  if (q.get('server') !== null) lsSet('hellas-server', q.get('server'));
  const has = !!serverBase();
  $('accName').value = lsGet('hellas-name') || '';
  const doAcc = async (register) => {
    const name = $('accName').value.trim(), password = $('accPw').value;
    if (!name || !password) { $('mpStatus').textContent = '⚠ Bitte Name und Passwort eingeben.'; return; }
    $('mpStatus').textContent = register ? 'Registriere …' : 'Melde an …';
    try { setAccount(await accCall({ op: register ? 'register' : 'login', name, password })); lsSet('hellas-name', name); $('accPw').value = ''; }
    catch (e) { $('mpStatus').textContent = '⚠ ' + e.message; }
  };
  $('btnLogin').onclick = () => doAcc(false);
  $('btnRegister').onclick = () => doAcc(true);
  $('accPw').onkeydown = (e) => { if (e.key === 'Enter') doAcc(false); };
  $('accName').oninput = () => lsSet('hellas-name', $('accName').value.trim().slice(0, 20));
  $('btnLogout').onclick = (e) => { e.preventDefault(); logout(); };
  updateMenuAccount();
  if (!has) return;
  fetch(serverBase() + '/').then(r => r.json()).then(() => {
    let s = null; try { s = JSON.parse(lsGet('hellas-session') || 'null'); } catch (e) { }
    if (s && s.token) accCall({ op: 'session', token: s.token }).then(j => setAccount(Object.assign(j, { token: s.token }))).catch(() => { try { localStorage.removeItem('hellas-session'); } catch (e) { } updateMenuAccount(); });
  }).catch(() => { $('loginBox').classList.add('hidden'); $('mpStatus').textContent = '⚠ Server nicht erreichbar – Einzelspieler'; });
}

// ---------- Admin-Menü ----------
let adminOpen = false;
function toggleAdmin() {
  if (!NET.account || !NET.account.admin) return;
  adminOpen = !adminOpen;
  $('adminPanel').classList.toggle('hidden', !adminOpen);
  if (adminOpen) { for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); renderAdmin(); }
}
function adminBtn(label, fn, cls = '') { const b = document.createElement('button'); b.textContent = label; b.className = 'abtn ' + cls; b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; }
async function adminPromote(name) {
  try { const j = await accCall({ op: 'promote', token: NET.account.token, name }, '/api/admin'); toast(j.name + ' ist jetzt Admin (nach neuem Anmelden).', 'gold'); }
  catch (e) { toast('⚠ ' + e.message); }
  renderAdmin();
}
async function adminBan(name, ban) {
  try { const j = await accCall({ op: ban ? 'ban' : 'unban', token: NET.account.token, name }, '/api/admin'); toast((ban ? 'Gebannt: ' : 'Entbannt: ') + j.name, 'gold'); }
  catch (e) { toast('⚠ ' + e.message); }
  renderAdmin();
}
async function renderAdmin() {
  const body = $('adminBody'); body.textContent = '';
  const sec = (t) => { const h = document.createElement('h4'); h.textContent = t; body.appendChild(h); };
  sec('Bewegung');
  body.appendChild(adminBtn(player.adminFly ? '✈ Fliegen: AN (klicken zum Ausschalten)' : '✈ Fliegen: AUS (klicken zum Einschalten)', () => { player.adminFly = !player.adminFly; if (player.adminFly) { if (player.mounted) dismount(); player.flying = false; player.sailing = false; toast('Admin-Flug: WASD, Leertaste hoch, C runter, Shift schnell'); } else player.vy = 0; renderAdmin(); }, player.adminFly ? 'on' : ''));
  const hint = document.createElement('div'); hint.className = 'ahint'; hint.textContent = 'Im Flug: Leertaste = hoch, C = runter, Shift = schnell. Du bist unverwundbar und unsichtbar für Gegner.'; body.appendChild(hint);
  sec('Geld');
  { const row = document.createElement('div'); row.className = 'arow';
    const inp = document.createElement('input'); inp.className = 'ainp'; inp.type = 'number'; inp.value = '1000'; inp.min = '1'; row.appendChild(inp);
    row.appendChild(adminBtn('Mir geben', () => { const n = Math.max(0, Math.min(1000000, Math.floor(+inp.value || 0))); if (n) { addMoney(n); save(); renderAdmin(); } }));
    body.appendChild(row); }
  sec('Spieler in dieser Lobby');
  if (!NET.others.size) { const d = document.createElement('div'); d.className = 'ahint'; d.textContent = NET.online ? 'Niemand sonst online.' : 'Nicht verbunden.'; body.appendChild(d); }
  for (const r of NET.others.values()) {
    const row = document.createElement('div'); row.className = 'arow';
    const n = document.createElement('span'); n.textContent = r.name; row.appendChild(n);
    row.appendChild(adminBtn('Hin teleportieren', () => { if (r.st) { player.pos.set(r.pos.x + 2, r.pos.y + 1, r.pos.z); toast('Teleportiert zu ' + r.name); } }));
    row.appendChild(adminBtn('Bannen', () => { if (confirm(r.name + ' wirklich bannen?')) adminBan(r.name, true); }, 'danger'));
    body.appendChild(row);
  }
  sec('Spieler suchen');
  const row = document.createElement('div'); row.className = 'arow';
  const inp = document.createElement('input'); inp.placeholder = 'Spielername'; inp.className = 'ainp'; row.appendChild(inp);
  row.appendChild(adminBtn('Bannen', () => inp.value.trim() && adminBan(inp.value.trim(), true), 'danger'));
  row.appendChild(adminBtn('Entbannen', () => inp.value.trim() && adminBan(inp.value.trim(), false)));
  row.appendChild(adminBtn('Zum Admin', () => inp.value.trim() && confirm(inp.value.trim() + ' zum Admin machen?') && adminPromote(inp.value.trim())));
  body.appendChild(row);
  sec('Alle Konten');
  const list = document.createElement('div'); list.className = 'alist'; list.textContent = 'Lade …'; body.appendChild(list);
  try {
    const j = await accCall({ op: 'list', token: NET.account.token }, '/api/admin');
    list.textContent = '';
    for (const a of j.accounts) {
      const r = document.createElement('div'); r.className = 'arow';
      const n = document.createElement('span'); n.textContent = a.name + (a.admin ? ' ★ Admin' : '') + (a.banned ? ' – GEBANNT' : ''); if (a.banned) n.style.color = '#ff7a6a'; r.appendChild(n);
      if (!a.admin) { r.appendChild(adminBtn('Zum Admin', () => { if (confirm(a.name + ' wirklich zum Admin machen?')) adminPromote(a.name); })); r.appendChild(a.banned ? adminBtn('Entbannen', () => adminBan(a.name, false)) : adminBtn('Bannen', () => { if (confirm(a.name + ' wirklich bannen?')) adminBan(a.name, true); }, 'danger')); }
      list.appendChild(r);
    }
  } catch (e) { list.textContent = '⚠ ' + e.message; }
}
function updateAdminFly(dt, moving, sprint, canMove) {
  const P = player.pos, sp = sprint ? 160 : 55;
  if (moving) { P.x += _mv.x * sp * dt; P.z += _mv.z * sp * dt; player.yaw = angLerp(player.yaw, Math.atan2(_mv.x, _mv.z), Math.min(1, dt * 8)); }
  if (canMove && keys.Space) P.y += sp * 0.6 * dt;
  if (canMove && (keys.KeyC || keys.ControlLeft)) P.y -= sp * 0.6 * dt;
  P.y = Math.max(P.y, curD ? curD.O.y : -30);
  player.speedNow = 0; player.swimming = false; player.vy = 0; player.hp = player.maxHp;
  hero.root.position.set(P.x, P.y, P.z); hero.root.rotation.y = player.yaw;
  animateHumanoid(hero, 0, dt, {});
  pegasus.root.visible = false; hippo.root.visible = false; ship.root.visible = false; horse.root.visible = false;
}

// ============================================================
// Tavernen, Söldner, Kopfgelder, Fahndung, Ställe, Schmiede, Schiffsbauer,
// Mythenwälder und Quiz-Nebenmissionen
// ============================================================
const HORSES = {
  gaul: { name: 'Brauner Ackergaul', cost: 0, speed: [19, 30], col: 0x6b4325 },
  rappe: { name: 'Thessalischer Rappe', cost: 150, speed: [24, 37], col: 0x1e1a18 },
  schimmel: { name: 'Arabischer Schimmel', cost: 300, speed: [28, 43], col: 0xece6dc },
  karren: { name: 'Bauernkarren', cost: 90, speed: [22, 32], col: 0x6b4325, chariot: true, style: 'karren' },
  reisewagen: { name: 'Reisewagen mit Dach', cost: 220, speed: [27, 40], col: 0x8a6a4a, chariot: true, style: 'reise' },
  wagen: { name: 'Streitwagen', cost: 450, speed: [30, 46], col: 0xece6dc, chariot: true, war: true, style: 'streit' },
  prunkwagen: { name: 'Goldener Prunkwagen', cost: 900, speed: [34, 52], col: 0xf4f0ea, chariot: true, war: true, style: 'prunk' },
};
const WEAPONS = [
  { name: 'Kleiner Dolch', cost: 0, dmg: -6, model: 'dagger' }, { name: 'Bronzeschwert', cost: 40, dmg: 0 }, { name: 'Eisenschwert', cost: 80, dmg: 6 },
  { name: 'Kopis (Hiebschwert)', cost: 180, dmg: 12 }, { name: 'Xiphos des Champions', cost: 350, dmg: 20 },
];
const ARMORS = [
  { name: 'Keine Rüstung (Tunika)', cost: 0, red: 0, hp: 0 }, { name: 'Leinenpanzer', cost: 70, red: 0.1, hp: 20, col: 0xe8e0cc },
  { name: 'Schuppenpanzer', cost: 160, red: 0.2, hp: 40, col: 0x8a7a5a }, { name: 'Hoplitenrüstung', cost: 320, red: 0.3, hp: 70, col: 0xd8b050 },
];
const SHIPS = [
  null, { name: 'Fischerboot', cost: 80, speed: [16, 22], scale: 0.6, sail: 0xd8d0b8 },
  { name: 'Handelsschiff', cost: 200, speed: [22, 30], scale: 0.85, sail: 0xf2ead6 },
  { name: 'Trireme', cost: 400, speed: [28, 40], scale: 1.0, sail: 0xb02020 },
];
const MERCS = {
  speer: { name: 'Speerträger', cost: 40, hp: 80, dmg: 9, look: { tunic: 0x6a5a3a, pants: 0x3a3024, weapon: 'spear', shield: true, shieldCol: 0x8a6a3a, hair: 0x2a1a0e, beard: true } },
  hoplit: { name: 'Hoplit', cost: 90, hp: 140, dmg: 13, look: { tunic: 0x1c3a7a, armor: 0xb98d3a, helmet: true, crest: 0x1c3a7a, shield: true, shieldEmblem: 0x1c3a7a, weapon: 'spear', greaves: true, pants: 0x2a2a2a } },
  veteran: { name: 'Spartanischer Veteran', cost: 160, hp: 200, dmg: 19, look: { tunic: 0x8e1717, armor: 0xc99a42, helmet: true, crest: 0xa01818, shield: true, shieldEmblem: 0x8a1a1a, weapon: 'sword', cape: 0x8e1717, greaves: true, pants: 0x3a1414, beard: true } },
  buerger: { name: 'Bürgersoldat', cost: 0, hp: 100, dmg: 11, look: { tunic: 0x5a7a4a, armor: 0x8a7a5a, helmet: true, crest: 0x5a7a4a, shield: true, weapon: 'spear', pants: 0x3a3024 } },
};
const MAX_ALLIES = 4;
const allies = [];
const playerDamage = () => (player.dmg + WEAPONS[player.wTier || 0].dmg + upLvl('dmg') * 3) * (player.mounted && HORSES[player.horse || 'gaul'].war ? 1.3 : 1) * (clock.elapsedTime < (player.powerUntil || 0) ? 1.2 : 1);

function findSpotNear(L, rMin, rMax, rad) {
  for (let i = 0; i < 400; i++) {
    const a = rand() * 6.283, r = rr(rMin, rMax), x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r;
    if (heightAt(x, z) > 1.2 && isFree(x, z, rad) && roadDist(x, z) > 5 && slopeAt(x, z) < 0.35) return [x, z];
  }
  return null;
}
const TAVERN_NAMES = ['Zum Trojanischen Pferd', 'Zur Sirene', 'Zum Koloss', 'Zur Eule der Athene', 'Zum Goldenen Widder', 'Zum Durstigen Zyklopen', 'Die Lachende Amphore', 'Zum Einäugigen Polyphem', 'Zur Weinrebe des Dionysos', 'Zum Fliegenden Pegasus', 'Die Rostige Lanze', 'Zum Schlafenden Kentauren', 'Die Salzige Möwe', 'Zum Bronzenen Stier'];
const KEEPERS = ['Wirt Glaukos', 'Wirtin Thalia', 'Wirt Nikias', 'Wirtin Eudora', 'Wirt Lysandros', 'Wirtin Agathe', 'Wirt Dorkas', 'Wirtin Myrto', 'Wirt Bion', 'Wirtin Korinna', 'Wirt Phaidon', 'Wirtin Ismene', 'Wirt Kallias', 'Wirtin Nausikaa'];
const RUMORS = [
  'Man sagt, im Hain der Dryaden ganz im Norden liegt ein Schatz – aber die Baumgeister verteidigen ihn.',
  'Im Wald von Nemea haust ein Löwe, dessen Fell kein Schwert durchdringt … fast keines.',
  'Ein riesiger Eber verwüstet die Felder bei Kalydon im Westen.',
  'Die Gelehrten im ganzen Land stellen Fragen. Wer klug antwortet, wird belohnt!',
  'Wenn du zu viele Soldaten erschlägst, schicken die Städte Wachen hinter dir her.',
  'Der Wagenbauer Pelops baut Karren, Reisewagen, Streitwagen und sogar einen goldenen Prunkwagen!',
  'Der Schiffsbauer in Piräus baut die besten Triremen der Ägäis.',
  'In deiner eigenen Stadt kannst du Bürger zu Soldaten ausbilden lassen.',
];
const TAVERNS = [];
function buildServices() {
  const tavernAt = ['athen', 'sparta', 'theben', 'piraeus', 'olympia', 'delphi', 'kreta', 'thera', 'ithaka', 'seriphos', 'troja', 'rhodos', 'ephesos', 'korkyra'];
  tavernAt.forEach((k, i) => {
    const tv = { name: 'Taverne „' + TAVERN_NAMES[i % TAVERN_NAMES.length] + '“', keeper: KEEPERS[i % KEEPERS.length], loc: k };
    if (buildTavernHall(LOCS[k], i, tv)) TAVERNS.push(tv);
  });
  for (const k of ['athen', 'theben', 'sparta', 'ephesos', 'troja']) {
    const L = LOCS[k]; const sp = findSpotNear(L, 15, L.r * 1.3, 8); if (!sp) continue;
    reserve(sp[0], sp[1], 8);
    const f = new Frame(sp[0], sp[1], Math.round(Math.atan2(L.x - sp[0], L.z - sp[1]) / (Math.PI / 2)) * Math.PI / 2);
    for (const [px, pz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) f.box(M.wood, px, 0, pz, 0.3, 3.4, 0.3, true);
    f.put(G.prism, M.terracotta, 0, 3.4, 0, 0, Math.PI / 2, 0, 6, 1.3, 8);
    for (let i = 0; i < 3; i++) f.put(G.cyl, M.darkwood, -2.6 + i * 1.3, 0.75, -2.2, 0.25, 0, Math.PI / 2, 1.5, 0.14, 1.5);
    f.box(M.wood, 1.6, 0, -1.6, 2.4, 0.9, 1.2, true);
    const show = makeChariot(['karren', 'reise', 'streit', 'prunk'][Math.floor(rand() * 4)]); const [sx2, sz2] = f.w(0.5, 0.8); show.root.position.set(sx2, heightAt(sx2, sz2), sz2); show.root.rotation.y = f.rot + Math.PI / 2; scene.add(show.root);
    const [nx, nz] = f.w(-2, 3.6);
    addNPC('Wagenbauer Pelops', nx, nz, { tunic: 0x7a5a2a, pants: 0x3a2a1a, beard: true, hair: 0x5a4a3a, belt: 0x2a1a0e }, () => talkStable(true)).yaw = f.rot;
  }
  for (const k of ['athen', 'sparta', 'olympia', 'theben', 'delphi']) {
    const L = LOCS[k]; const sp = findSpotNear(L, 15, L.r * 1.3, 9); if (!sp) continue;
    reserve(sp[0], sp[1], 9);
    const f = new Frame(sp[0], sp[1], Math.atan2(L.x - sp[0], L.z - sp[1]));
    for (const [px, pz] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) f.box(M.wood, px, 0, pz, 0.3, 3.2, 0.3, true);
    f.put(G.prism, M.roof2, 0, 3.2, 0, 0, 0, 0, 9, 1.4, 6);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; f.box(M.wood, Math.cos(a) * 7, 0.6, Math.sin(a) * 7 + 0.5, 3.4, 0.15, 0.12); }
    ['rappe', 'schimmel', 'gaul'].forEach((h, i) => { const hm = makeHorse(HORSES[h].col); const [hx, hz] = f.w(-3 + i * 3, 0); hm.root.position.set(hx, heightAt(hx, hz), hz); hm.root.rotation.y = f.rot + Math.PI / 2; scene.add(hm.root); });
    const [nx, nz] = f.w(0, 4.5);
    addNPC('Stallmeister', nx, nz, { tunic: 0x6a4a2a, pants: 0x3a2a1a, beard: true, hair: 0x4a3a2a }, () => talkStable(false)).yaw = f.rot;
  }
  for (const k of ['athen', 'sparta', 'theben', 'thera', 'olympia']) {
    const L = LOCS[k]; const sp = findSpotNear(L, 12, L.r * 1.2, 6); if (!sp) continue;
    reserve(sp[0], sp[1], 6);
    const f = new Frame(sp[0], sp[1], Math.atan2(L.x - sp[0], L.z - sp[1]));
    f.box(M.stone2, 0, 0, -1.5, 4, 2.4, 2.6, true); f.box(M.stone, 1.2, 2.4, -2.2, 0.9, 2.5, 0.9);
    f.box(M.dark, 0, 0.9, -0.15, 1.6, 1.0, 0.1);
    const fm = new THREE.Mesh(G.cone, M.fire); const [fx, fz] = f.w(0, -0.4); fm.position.set(fx, f.y + 1.2, fz); fm.scale.set(0.6, 0.7, 0.6); scene.add(fm); fires.push(fm);
    f.box(M.black, 1.8, 0, 1.2, 0.6, 0.8, 0.4, true); f.box(M.black, 1.8, 0.8, 1.2, 1.0, 0.2, 0.4);
    for (let i = 0; i < 4; i++) f.put(G.box, lam(0xc8c8c0), -2.4 + i * 0.35, 1.2, 1.2, 0, 0, 0.1, 0.06, 1.6, 0.04);
    const [nx, nz] = f.w(0.2, 2.6);
    addNPC('Schmied Hephaistion', nx, nz, { tunic: 0x4a3a2a, pants: 0x2a2018, beard: true, hair: 0x1a1008, armor: 0x5a4030 }, talkSmith).yaw = f.rot;
  }
  for (const k of ['piraeus', 'kreta', 'ithaka']) {
    const d = DOCKS[k]; if (!d) continue;
    const [dx, dz] = [Math.sin(d.rot), Math.cos(d.rot)];
    const x = d.land[0] - dx * 6 - dz * 4, z = d.land[1] - dz * 6 + dx * 4;
    addNPC('Schiffsbauer Argos', x, z, { tunic: 0x3a5a7a, pants: 0x2a3a4a, beard: true, hair: 0x6a5a4a }, talkShipwright);
  }
}
function talkTavern(tv) {
  const W = tv.keeper, opts = [
    { label: 'Essen und ein Bett (10 Drachmen) – volle Heilung', fn: () => { if (spend(10)) { player.hp = player.maxHp; player.stamina = 100; for (const a of allies) a.hp = a.maxHp; toast('Gut gegessen und geschlafen – Leben voll!', 'gold'); sfx('drink'); } } },
    { label: '🍲 Speisekarte – antikes griechisches Essen', fn: () => talkFood(tv) },
    { label: 'Söldner anheuern (' + allies.length + '/' + MAX_ALLIES + ')', fn: () => talkHire(tv) },
    { label: 'Kopfgeldbrett ansehen', fn: () => talkBounties(tv) },
  ];
  if (player.wanted > 0) opts.push({ label: 'Das Kopfgeld auf dich bezahlen (' + wantedCost() + ' Drachmen)', fn: () => { if (spend(wantedCost())) { setWanted(0); toast('Die Wachen suchen dich nicht mehr.', 'gold'); } } });
  opts.push({ label: 'Gerüchte hören', fn: () => talk([{ who: W, text: pick(RUMORS) }]) }, { label: 'Tschüss', fn: () => { } });
  talk([{ who: W, text: 'Willkommen in der ' + tv.name + '! Ein Krug Wein, ein warmes Bett – oder suchst du Arbeit?', opts }]);
}
function talkHire(tv) {
  const opts = Object.entries(MERCS).filter(([k]) => k !== 'buerger').map(([k, m]) => ({ label: m.name + ' anheuern (' + m.cost + ' Drachmen) – ' + m.hp + ' Leben, ' + m.dmg + ' Schaden', fn: () => {
    if (allies.length >= MAX_ALLIES) { toast('Mehr als ' + MAX_ALLIES + ' Söldner kannst du nicht führen.'); return; }
    if (spend(m.cost)) { spawnAlly(k); toast(m.name + ' folgt dir jetzt!', 'gold'); save(); }
  } }));
  if (allies.length) opts.push({ label: 'Alle Söldner entlassen', fn: () => { while (allies.length) removeAlly(allies[0]); toast('Deine Söldner ziehen weiter.'); save(); } });
  opts.push({ label: 'Zurück', fn: () => talkTavern(tv) });
  talk([{ who: tv.keeper, text: 'Ein paar Kämpfer sitzen hier herum und suchen Arbeit. Sie folgen dir und kämpfen an deiner Seite.', opts }]);
}

// ---------- Söldner / Gefolge ----------
function spawnAlly(type, hp) {
  const M2 = MERCS[type], h = makeHumanoid(M2.look);
  const a = Math.random() * 6.28, x = player.pos.x + Math.cos(a) * 3, z = player.pos.z + Math.sin(a) * 3;
  h.root.position.set(x, groundAt(x, z), z); scene.add(h.root);
  const al = { type, def: M2, m: h, x, z, y: groundAt(x, z), yaw: 0, hp: hp || M2.hp, maxHp: M2.hp, cd: 0, atk: 0, speedNow: 0, lastHit: -99 };
  allies.push(al); return al;
}
function removeAlly(a) { scene.remove(a.m.root); const i = allies.indexOf(a); if (i >= 0) allies.splice(i, 1); }
function hurtAlly(a, dmg) {
  a.hp -= dmg; a.lastHit = clock.elapsedTime;
  floatText(a.x, a.y + 2.4, a.z, String(Math.round(dmg)), '#ff9a7a');
  if (a.hp <= 0) { toast(a.def.name + ' ist gefallen.'); removeAlly(a); save(); }
}
function updateAllies(dt) {
  const P = player.pos, t = clock.elapsedTime;
  const hidden = player.sailing || player.flying || player.adminFly || player.bird;
  allies.forEach((a, i) => {
    a.m.root.visible = !hidden;
    if (hidden) return;
    a.cd -= dt; a.atk = Math.max(0, a.atk - dt * 2.6);
    if (t - a.lastHit > 6) a.hp = Math.min(a.maxHp, a.hp + dt * 3);
    let tgt = null, best = 18;
    for (const e of enemies) { if (e.dead || e.stoned > 0 || e.oly) continue; const d = Math.hypot(e.x - a.x, e.z - a.z); if (d < best && Math.hypot(e.x - P.x, e.z - P.z) < 30) { best = d; tgt = e; } }
    let tx, tz, spd = 0;
    if (tgt) {
      tx = tgt.x; tz = tgt.z;
      const reach = 2.2 + (tgt.def.hitR || 0.3);
      if (best > reach) spd = 8;
      else if (a.cd <= 0) { a.cd = 1.2; a.atk = 1; damageEnemy(tgt, a.def.dmg * rr(0.85, 1.15)); }
    } else {
      const ang = player.yaw + Math.PI + (i - (allies.length - 1) / 2) * 0.7;
      tx = P.x + Math.sin(ang) * (3 + i * 0.6); tz = P.z + Math.cos(ang) * (3 + i * 0.6);
      const d = Math.hypot(tx - a.x, tz - a.z);
      if (d > 1.2) spd = Math.min(player.mounted ? 26 : 13, 4 + d * 1.5);
    }
    const dd = Math.hypot(tx - a.x, tz - a.z);
    if (Math.hypot(P.x - a.x, P.z - a.z) > 60) { a.x = P.x - Math.sin(player.yaw) * 3 + (i - 1.5); a.z = P.z - Math.cos(player.yaw) * 3; }
    else if (spd > 0 && dd > 0.01) {
      const q = { x: a.x + (tx - a.x) / dd * spd * dt, z: a.z + (tz - a.z) / dd * spd * dt };
      resolveCollisions(q, 0.45); a.speedNow = Math.hypot(q.x - a.x, q.z - a.z) / dt; a.x = q.x; a.z = q.z;
    } else a.speedNow = 0;
    a.yaw = angLerp(a.yaw, Math.atan2(tx - a.x, tz - a.z), Math.min(1, dt * 8));
    const g = groundAt(a.x, a.z);
    a.y = g < -1.4 ? -1.35 - 0.85 : g;
    a.m.root.position.set(a.x, a.y, a.z); a.m.root.rotation.y = a.yaw;
    animateHumanoid(a.m, a.speedNow, dt, { attack: a.atk });
  });
}

// ---------- Fahndung ----------
function wantedCost() { return player.wanted * 60; }
function setWanted(n) {
  const old = player.wanted || 0;
  player.wanted = clamp(n, 0, 5); player.wantedT = 0;
  if (player.wanted > old) { toast('Du wirst gesucht! ' + '★'.repeat(player.wanted), 'gold'); sfx('hurt'); }
  if (player.wanted === 0) for (const e of enemies.filter(e => e.def.hunter)) removeEnemy(e);
}
function addCrime(n) { setWanted((player.wanted || 0) + n); player.lastCrime = clock.elapsedTime; }
let hunterT = 20;
function updateWanted(dt) {
  if (!player.wanted || curD || player.dead) return;
  player.wantedT = (player.wantedT || 0) + dt;
  const hunters = enemies.filter(e => e.def.hunter && !e.dead);
  const near = hunters.some(e => Math.hypot(e.x - player.pos.x, e.z - player.pos.z) < 60);
  if (player.wantedT > 100 && !near) { player.wanted--; player.wantedT = 0; toast(player.wanted ? 'Die Fahndung lässt nach: ' + '★'.repeat(player.wanted) : 'Niemand sucht mehr nach dir.'); if (!player.wanted) setWanted(0); }
  hunterT -= dt;
  if (hunterT <= 0 && hunters.length < 8 && !player.sailing) {
    hunterT = Math.max(25, 70 - player.wanted * 9);
    const n = Math.min(1 + player.wanted, 8 - hunters.length);
    for (let tries = 0; tries < 30; tries++) {
      const a = player.yaw + Math.PI + rr(-1, 1), r = rr(55, 75), x = player.pos.x + Math.sin(a) * r, z = player.pos.z + Math.cos(a) * r;
      if (heightAt(x, z) < 1) continue;
      for (let k = 0; k < n; k++) { const e = spawnEnemy('jaeger', x + rr(-4, 4), z + rr(-4, 4), { name: player.wanted >= 3 ? 'Elite-Kopfgeldjäger' : 'Stadtwache', hp: 85 + player.wanted * 15 }); e.state = 'chase'; }
      toast('Wachen sind hinter dir her!'); break;
    }
  }
  for (const e of hunters) if (Math.hypot(e.x - player.pos.x, e.z - player.pos.z) > 260) removeEnemy(e);
}

// ---------- Kopfgelder ----------
const BOUNTY_NAMES = ['Lykos der Schlächter', 'Drakon der Grausame', 'Kleitos Einauge', 'Phobos der Brandstifter', 'Nikandros der Verräter', 'Agrios der Wilde', 'Thrasos Blutbart', 'Melas der Schwarze', 'Kerkyon der Ringer', 'Skiron vom Felsen', 'Prokrustes der Strecker', 'Sinis der Fichtenbeuger'];
function talkBounties(tv) {
  if (S.bounty) { talk([{ who: tv.keeper, text: 'Du jagst schon ' + S.bounty.name + '. Bring das erst zu Ende! (Rotes Zeichen auf der Karte)', opts: [{ label: 'Auftrag aufgeben', fn: () => { cancelBounty(); toast('Kopfgeld aufgegeben.'); } }, { label: 'Zurück', fn: () => talkTavern(tv) }] }]); return; }
  const offers = [];
  for (let i = 0; i < 40 && offers.length < 3; i++) {
    const a = Math.random() * 6.28, r = 120 + Math.random() * 320, x = tv.x + Math.cos(a) * r, z = tv.z + Math.sin(a) * r;
    if (Math.abs(x) > 950 || Math.abs(z) > 950 || heightAt(x, z) < 2 || inCity(x, z, 1.3)) continue;
    const name = BOUNTY_NAMES[Math.floor(Math.random() * BOUNTY_NAMES.length)];
    if (offers.some(o => o.name === name)) continue;
    offers.push({ name, x, z, reward: Math.round(60 + r * 0.45 + Math.random() * 40) });
  }
  talk([{ who: 'Kopfgeldbrett', text: 'Gesucht – tot oder lebendig! Wähle ein Ziel:', opts: offers.map(o => ({ label: o.name + ' – ' + o.reward + ' Drachmen (' + Math.round(Math.hypot(o.x - player.pos.x, o.z - player.pos.z)) + ' m)', fn: () => acceptBounty(o) })).concat([{ label: 'Zurück', fn: () => talkTavern(tv) }]) }]);
}
function acceptBounty(o) { S.bounty = o; spawnBounty(); toast('Kopfgeld angenommen: ' + o.name, 'gold'); sfx('quest'); updateQuestText(); save(); }
function spawnBounty() {
  const o = S.bounty; if (!o) return;
  for (const e of enemies.filter(e => e.bountyOf)) removeEnemy(e);
  const boss = spawnEnemy('kopfgeld', o.x, o.z, { name: o.name }); boss.bountyOf = o.name; boss.isBountyBoss = true;
  for (let i = 0; i < 3; i++) { const e = spawnEnemy('bandit', o.x + rr(-6, 6), o.z + rr(-6, 6)); e.bountyOf = o.name; }
}
function cancelBounty() { S.bounty = null; for (const e of enemies.filter(e => e.bountyOf)) removeEnemy(e); updateQuestText(); save(); }

// ---------- Stall, Schmied, Schiffsbauer ----------
function talkStable(wagons) {
  const opts = Object.entries(HORSES).filter(([, h]) => !!h.chariot === !!wagons).map(([k, h]) => {
    const own = player.horses.includes(k);
    return { label: (own ? (player.horse === k ? '✔ ' : 'Reiten: ') : 'Kaufen: ') + h.name + ' – Tempo ' + h.speed[1] + (own ? '' : ' (' + h.cost + ' Drachmen)'), fn: () => {
      if (!own) { if (!spend(h.cost)) return; player.horses.push(k); toast(h.name + ' gehört jetzt dir!', 'gold'); }
      player.horse = k; setHorseModel(); save(); talkStable(wagons);
    } };
  });
  opts.push({ label: 'Auf Wiedersehen', fn: () => { } });
  talk([{ who: wagons ? 'Wagenbauer Pelops' : 'Stallmeister', text: (wagons ? 'Räder, Achsen, Pferde – ich baue die schnellsten Wagen von Hellas! Streit- und Prunkwagen geben dir im Kampf +30 % Schaden.' : 'Die besten Pferde von Hellas!') + ' Dein aktuelles Gefährt: ' + HORSES[player.horse].name + '. (R zum Rufen)', opts }]);
}
function makeChariot(style = 'streit') {
  const g = new THREE.Group(), horsesM = [];
  const one = style === 'karren', hc = style === 'prunk' ? 0xf4f0ea : style === 'streit' ? 0xece6dc : style === 'reise' ? 0x3a2a1a : 0x6b4325;
  for (const s of (one ? [0] : [-0.5, 0.5])) { const h = makeHorse(hc, false); h.root.position.set(s, 0, 1.6); g.add(h.root); horsesM.push(h); }
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  const trim = style === 'prunk' ? lam(0xffd24a, 0x5a3a00) : style === 'streit' ? M.gold : M.wood;
  add(new THREE.BoxGeometry(1.6, 0.15, 1.4), style === 'prunk' ? M.gold : M.wood, 0, 0.95, -1.3);
  add(new THREE.BoxGeometry(1.6, 0.8, 0.12), trim, 0, 1.4, -0.65);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.6, 1.4), trim, s * 0.8, 1.25, -1.3);
  if (style === 'reise') { for (const [x, z] of [[-0.75, -0.65], [0.75, -0.65], [-0.75, -1.95], [0.75, -1.95]]) add(new THREE.BoxGeometry(0.08, 1.8, 0.08), M.wood, x, 1.9, z); add(new THREE.BoxGeometry(1.8, 0.1, 1.6), M.red, 0, 2.85, -1.3); }
  if (style === 'karren') { for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.22, 8, 6), M.terracotta, -0.4 + k * 0.4, 1.25, -1.6); }
  if (style === 'prunk') { add(new THREE.ConeGeometry(0.25, 0.6, 8), trim, -0.8, 1.9, -0.65); add(new THREE.ConeGeometry(0.25, 0.6, 8), trim, 0.8, 1.9, -0.65); }
  const wheels = [];
  for (const s of [-1, 1]) wheels.push(add(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 14), style === 'prunk' ? trim : M.darkwood, s * 0.95, 0.65, -1.3, 0, 0, Math.PI / 2));
  add(new THREE.BoxGeometry(0.1, 0.1, 2.6), M.wood, 0, 1.0, 0.4);
  return { root: g, legs: horsesM[0].legs, horses: horsesM, wheels, tail: horsesM[0].tail, phase: 0, chariot: true };
}
function setHorseModel() {
  const vis = horse ? horse.root.visible : false;
  if (horse) scene.remove(horse.root);
  const H = HORSES[player.horse || 'gaul'];
  horse = H.chariot ? makeChariot(H.style) : makeHorse(H.col);
  horse.root.visible = vis; scene.add(horse.root);
}
function talkSmith() {
  const opts = [];
  WEAPONS.forEach((w, i) => { if (i > (player.wTier || 0)) opts.push({ label: 'Waffe: ' + w.name + ' (' + (player.dmg + w.dmg) + ' Schaden statt ' + (player.dmg + WEAPONS[player.wTier || 0].dmg) + ') – ' + w.cost + ' Drachmen', fn: () => { if (spend(w.cost)) { player.wTier = i; toast('Neue Waffe: ' + w.name, 'gold'); save(); } talkSmith(); } }); });
  if ((player.shieldTier || 0) < 1) opts.push({ label: 'Schild: Holzschild (Blocken möglich) – 40 Drachmen', fn: () => { if (spend(40)) { player.shieldTier = 1; toast('Holzschild! Rechte Maustaste / 🛡 zum Blocken', 'gold'); refreshHeroLook(); save(); } talkSmith(); } });
  if ((player.shieldTier || 0) < 2) opts.push({ label: 'Schild: Bronzeschild (blockt deutlich mehr) – 150 Drachmen', fn: () => { if (spend(150)) { player.shieldTier = 2; toast('Bronzeschild angelegt!', 'gold'); refreshHeroLook(); save(); } talkSmith(); } });
  ARMORS.forEach((a, i) => { if (i > (player.aTier || 0)) opts.push({ label: 'Rüstung: ' + a.name + ' (−' + Math.round(a.red * 100) + ' % Schaden, +' + a.hp + ' Leben) – ' + a.cost + ' Drachmen', fn: () => { if (spend(a.cost)) { player.maxHp += a.hp - ARMORS[player.aTier || 0].hp; player.aTier = i; player.hp = player.maxHp; toast('Neue Rüstung: ' + a.name, 'gold'); refreshHeroLook(); save(); } talkSmith(); } }); });
  opts.push({ label: 'Auf Wiedersehen', fn: () => { } });
  talk([{ who: 'Schmied Hephaistion', text: 'Klirr, klirr! Deine Waffe: ' + WEAPONS[player.wTier || 0].name + ', deine Rüstung: ' + ARMORS[player.aTier || 0].name + ', dein Schild: ' + ['keiner', 'Holzschild', 'Bronzeschild'][player.shieldTier || 0] + '.' + (opts.length === 1 ? ' Du trägst schon das Beste, was ich schmieden kann!' : ' Was soll ich dir schmieden?'), opts }]);
}
function talkShipwright() {
  const opts = [];
  SHIPS.forEach((s, i) => { if (s && i !== player.shipTier) opts.push({ label: (i < player.shipTier ? 'Tauschen gegen: ' : 'Kaufen: ') + s.name + ' – Tempo ' + s.speed[1] + ' (' + s.cost + ' Drachmen)', fn: () => { if (spend(s.cost)) { player.shipTier = i; player.hasShip = true; setShipModel(); banner('Dein neues Schiff: ' + s.name, 'Drücke B am Ufer, um damit in See zu stechen.'); save(); } } }); });
  opts.push({ label: 'Auf Wiedersehen', fn: () => { } });
  talk([{ who: 'Schiffsbauer Argos', text: player.shipTier ? 'Dein Schiff: ' + SHIPS[player.shipTier].name + '. Willst du ein anderes?' : 'Ein eigenes Schiff gefällig? Damit segelst du, wohin du willst! (Taste B am Ufer)', opts }]);
}
function setShipModel() {
  const vis = ship ? ship.root.visible : false;
  if (ship) scene.remove(ship.root);
  ship = makeShip(); const T = SHIPS[player.shipTier || 2];
  ship.root.scale.setScalar(T.scale);
  ship.root.traverse(o => { if (o.isMesh && o.material === M.sail) o.material = lam(T.sail); });
  ship.root.visible = vis; scene.add(ship.root);
}

// ---------- Mythenwälder ----------
const MYTH_FORESTS = [
  { name: 'Hain der Dryaden', x: MYTH_SPOTS.dryaden[0], z: MYTH_SPOTS.dryaden[1], r: 80, guards: ['dryade', 'dryade', 'satyr', 'dryade'], roam: ['satyr', 'dryade', 'satyr', 'dryade'] },
  { name: 'Wald von Nemea', x: MYTH_SPOTS.nemea[0], z: MYTH_SPOTS.nemea[1], r: 80, guards: ['loewe', 'satyr', 'satyr'], roam: ['satyr', 'eber', 'satyr'] },
  { name: 'Kalydonischer Wald', x: MYTH_SPOTS.kalydon[0], z: MYTH_SPOTS.kalydon[1], r: 80, guards: ['eber_boss', 'eber', 'eber'], roam: ['eber', 'satyr', 'eber'] },
];
function buildMythForests() {
  for (const F of MYTH_FORESTS) {
    const f = new Frame(F.x, F.z, 0);
    reserve(F.x, F.z, 9);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; f.put(G.rock, lam(0x8a8478), Math.cos(a) * 7, 0.8, Math.sin(a) * 7, rand(), rand(), 0, 0.9, 1.8, 0.9); }
    f.put(G.cyl, lam(0x6a8a5a), 0, 0.2, 0, 0, 0, 0, 5, 0.4, 5);
    const glow = new THREE.Mesh(G.sphere, lam(0x9aff9a, 0x40a040)); glow.position.set(F.x, f.y + 3.5, F.z); glow.scale.setScalar(0.8); scene.add(glow); fires.push(glow);
    const ch = addChest(F.x, f.y + 0.4, F.z + 1.5, 0, 2, RUINS.length);
    RUINS.push({ x: F.x, z: F.z, name: F.name, chest: ch, y: f.y, kind: 'forest', discR: F.r * 0.8, guards: F.guards.map((t, i) => { const a = i / F.guards.length * 6.28; return [F.x + Math.cos(a) * 5, F.z + Math.sin(a) * 5]; }), guardTypes: F.guards });
  }
}
function makeBoar(col, big) {
  const w = makeWolf(col);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), lam(0xf0ead8)); t.position.set(s * 0.12, -0.08, 0.45); t.rotation.x = -0.9; w.head.add(t); }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 1.1), lam(0x2a1a10)); mane.position.set(0, 1.1, 0); w.root.add(mane);
  w.root.scale.setScalar(big ? 2.6 : 1.25);
  return w;
}
function makeLion() {
  const w = makeWolf(0xc9a050);
  const mane = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), lam(0x7a4a1a)); mane.position.set(0, 0, -0.05); mane.scale.set(1.2, 1.2, 0.8); w.head.add(mane);
  w.root.scale.setScalar(2.2);
  return w;
}

// ---------- Quiz-Nebenmissionen ----------
const QUIZ = [
  ['Wie heißt die Hauptstadt von Griechenland?', 'Athen', 'Sparta', 'Rom'],
  ['Wer ist der Göttervater?', 'Zeus', 'Hermes', 'Ares'],
  ['Wie heißt der höchste Berg Griechenlands?', 'Olymp', 'Vesuv', 'Matterhorn'],
  ['Wo fanden die ersten Olympischen Spiele statt?', 'In Olympia', 'In Paris', 'In Troja'],
  ['Welches Meer liegt östlich von Griechenland?', 'Die Ägäis', 'Die Nordsee', 'Die Ostsee'],
  ['Wer ist die Göttin der Weisheit?', 'Athene', 'Aphrodite', 'Hera'],
  ['Wer ist der Gott des Meeres?', 'Poseidon', 'Hades', 'Apollon'],
  ['Welcher berühmte Tempel steht auf der Akropolis?', 'Der Parthenon', 'Das Kolosseum', 'Die Pyramide'],
  ['Auf welcher Insel war das Labyrinth des Minotauros?', 'Kreta', 'Sizilien', 'Island'],
  ['Welcher Held irrte zehn Jahre lang heim nach Ithaka?', 'Odysseus', 'Herakles', 'Perseus'],
  ['Was ist eine Amphore?', 'Ein Krug', 'Ein Schild', 'Ein Helm'],
  ['Welche Stadt war berühmt für ihre harten Krieger?', 'Sparta', 'Delphi', 'Olympia'],
  ['Was ist Pegasus?', 'Ein geflügeltes Pferd', 'Eine Schlange', 'Ein Löwe'],
  ['Wie viele Köpfe hat Kerberos?', 'Drei', 'Zwei', 'Sieben'],
  ['Welche Frucht wächst in Griechenland besonders viel?', 'Oliven', 'Bananen', 'Ananas'],
  ['Welche Sprache sprachen die alten Griechen?', 'Griechisch', 'Latein', 'Englisch'],
  ['Wo saß das berühmte Orakel?', 'In Delphi', 'In Sparta', 'In Rom'],
  ['Wer ist der Gott der Unterwelt?', 'Hades', 'Zeus', 'Dionysos'],
  ['Wer ist die Göttin der Liebe?', 'Aphrodite', 'Artemis', 'Athene'],
  ['Wer verwandelte Menschen mit ihrem Blick zu Stein?', 'Medusa', 'Eine Sirene', 'Ein Zyklop'],
  ['Wie viele Augen hat ein Zyklop?', 'Eins', 'Zwei', 'Drei'],
  ['Was ist ein Hoplit?', 'Ein Soldat', 'Ein Tempel', 'Ein Fisch'],
  ['Wie gelangten die Griechen heimlich in die Stadt Troja?', 'Mit einem hölzernen Pferd', 'Mit einem Tunnel', 'Mit einem Ballon'],
  ['Wer war ein berühmter Philosoph aus Athen?', 'Sokrates', 'Caesar', 'Napoleon'],
  ['Wie hieß das Geld im alten Griechenland?', 'Drachme', 'Euro', 'Dollar'],
  ['Was ist eine Polis?', 'Ein Stadtstaat', 'Ein Schiff', 'Ein Tier'],
  ['Welcher Gott schleudert Blitze?', 'Zeus', 'Poseidon', 'Hermes'],
  ['Wie heißt der erste Buchstabe des griechischen Alphabets?', 'Alpha', 'Omega', 'Zeta'],
  ['Welche Farbe haben die Häuser auf griechischen Inseln oft?', 'Weiß', 'Schwarz', 'Lila'],
  ['Wo wohnen die griechischen Götter?', 'Auf dem Olymp', 'Auf dem Mond', 'Im Wald'],
  ['Wer ist der Götterbote mit Flügelschuhen?', 'Hermes', 'Ares', 'Hades'],
  ['Wer ist der Gott des Krieges?', 'Ares', 'Apollon', 'Hermes'],
  ['Wer ist der Gott des Weines?', 'Dionysos', 'Poseidon', 'Zeus'],
  ['Wer ist die Göttin der Jagd?', 'Artemis', 'Hera', 'Demeter'],
  ['Wer ist die Frau von Zeus?', 'Hera', 'Athene', 'Medusa'],
  ['Welcher Held war unglaublich stark und vollbrachte zwölf Taten?', 'Herakles', 'Odysseus', 'Ikarus'],
  ['Wer flog mit Flügeln aus Wachs zu nah an die Sonne?', 'Ikarus', 'Achilles', 'Perseus'],
  ['Welche Körperstelle war bei Achilles verwundbar?', 'Die Ferse', 'Die Nase', 'Das Ohr'],
  ['Wer besiegte Medusa?', 'Perseus', 'Theseus', 'Jason'],
  ['Wer besiegte den Minotauros?', 'Theseus', 'Herakles', 'Odysseus'],
  ['Wie hieß der berühmte Dichter der Ilias?', 'Homer', 'Goethe', 'Shakespeare'],
  ['Welcher Gott ist der Schmied der Götter?', 'Hephaistos', 'Hermes', 'Apollon'],
  ['Was trugen Sieger in Olympia auf dem Kopf?', 'Einen Olivenkranz', 'Eine Krone aus Gold', 'Einen Helm'],
  ['Wofür war ein griechisches Theater da?', 'Für Schauspiele', 'Ein Hafen', 'Ein Gefängnis'],
  ['Welches Tier ist ein Symbol der Göttin Athene?', 'Die Eule', 'Der Hai', 'Das Krokodil'],
  ['Auf welchem Kontinent liegt Griechenland?', 'Europa', 'Asien', 'Afrika'],
  ['Welches Getränk mischten die Griechen gern mit Wasser?', 'Wein', 'Kaffee', 'Cola'],
  ['Woraus bestanden viele griechische Tempel?', 'Aus Marmor', 'Aus Plastik', 'Aus Glas'],
  ['Wer sang so schön, dass Seeleute ins Verderben fuhren?', 'Die Sirenen', 'Die Zyklopen', 'Die Kentauren'],
  ['Was ist ein Kentaur?', 'Halb Mensch, halb Pferd', 'Halb Fisch, halb Vogel', 'Ein Drache'],
  ['Wie hieß der Gott der Sonne und Musik?', 'Apollon', 'Hades', 'Ares'],
  ['Wer brachte den Menschen das Feuer?', 'Prometheus', 'Zeus', 'Hermes'],
  ['Wie viele Götter wohnten auf dem Olymp?', 'Zwölf', 'Zwei', 'Hundert'],
  ['Wer war der Lehrer von Alexander dem Großen?', 'Aristoteles', 'Odysseus', 'Herakles'],
  ['Welches Schiff hatte die Argonauten an Bord?', 'Die Argo', 'Die Titanic', 'Die Arche'],
  ['Was suchten Jason und die Argonauten?', 'Das Goldene Vlies', 'Einen Schatz aus Silber', 'Ein Einhorn'],
  ['Wie heißt ein Ruderkriegsschiff der Griechen?', 'Trireme', 'U-Boot', 'Floß'],
  ['Wie heißt der Marktplatz einer griechischen Stadt?', 'Agora', 'Arena', 'Basar'],
  ['Wer ist die Göttin der Ernte und des Getreides?', 'Demeter', 'Aphrodite', 'Athene'],
  ['Wie hieß der dreiköpfige Hund der Unterwelt?', 'Kerberos', 'Bello', 'Pegasus'],
];
QUIZ.push(
  ['Wie heißt die griechische Hauptstadt der Insel Kreta in der Antike?', 'Knossos', 'Sparta', 'Rom'],
  ['Wer schrieb den Satz des Pythagoras auf?', 'Pythagoras', 'Homer', 'Zeus'],
  ['Wie lautet der Satz des Pythagoras?', 'a² + b² = c²', 'a + b = c', 'a · b = 1'],
  ['Welcher Arzt gilt als Vater der Medizin?', 'Hippokrates', 'Sokrates', 'Leonidas'],
  ['Wer rief „Heureka!“ in der Badewanne?', 'Archimedes', 'Platon', 'Hermes'],
  ['Wie viele Spartaner kämpften bei den Thermopylen?', '300', '3', '3000000'],
  ['Wie lang ist ein Marathonlauf ungefähr?', 'Etwa 42 Kilometer', 'Etwa 1 Kilometer', 'Etwa 500 Kilometer'],
  ['Welche Stadt belagerten die Griechen zehn Jahre lang?', 'Troja', 'Athen', 'Delphi'],
  ['Wer schrieb die Odyssee?', 'Homer', 'Platon', 'Hermes'],
  ['Was war der Koloss von Rhodos?', 'Eine riesige Statue', 'Ein Schiff', 'Ein Berg'],
  ['Zu den sieben Weltwundern gehörte der Tempel der …', 'Artemis in Ephesos', 'Medusa in Paris', 'Hera in London'],
  ['Wer war der Lehrer von Platon?', 'Sokrates', 'Herakles', 'Zeus'],
  ['Was bedeutet das griechische Wort „Demokratie“?', 'Herrschaft des Volkes', 'Herrschaft der Tiere', 'Herrschaft des Meeres'],
  ['In welcher Stadt entstand die Demokratie?', 'Athen', 'Sparta', 'Troja'],
  ['Was bedeutet das griechische Wort „auto“?', 'Selbst', 'Pferd', 'Rad'],
  ['Was ist ein Mosaik?', 'Ein Bild aus kleinen Steinchen', 'Ein Lied', 'Ein Schwert'],
  ['Welcher Gott trägt einen Dreizack?', 'Poseidon', 'Apollon', 'Hermes'],
  ['Wer ist die Göttin des Herdfeuers?', 'Hestia', 'Medusa', 'Nike'],
  ['Wer ist die Siegesgöttin, nach der heute Turnschuhe heißen?', 'Nike', 'Hera', 'Gaia'],
  ['Wie hieß der Sohn des Zeus mit großer Kraft (römisch: Herkules)?', 'Herakles', 'Ares', 'Hades'],
  ['Wer öffnete die Büchse mit allen Übeln der Welt?', 'Pandora', 'Penelope', 'Sappho'],
  ['Wie hieß die treue Frau von Odysseus?', 'Penelope', 'Medusa', 'Helena'],
  ['Wegen welcher schönen Frau begann der Trojanische Krieg?', 'Helena', 'Athene', 'Kassandra'],
  ['Wie hieß der griechische Held mit der verwundbaren Ferse?', 'Achilles', 'Odysseus', 'Perseus'],
  ['Wie heißt der letzte Buchstabe des griechischen Alphabets?', 'Omega', 'Alpha', 'Gamma'],
  ['Welche Zahl schrieben die Griechen als Π (Pi) berühmt?', 'Etwa 3,14', 'Genau 10', 'Etwa 100'],
  ['Wie nennt man ein griechisches Gefäß für Wein und Öl mit zwei Henkeln?', 'Amphore', 'Helm', 'Amulett'],
  ['Welches Tier zog den Wagen des Sonnengottes?', 'Pferde', 'Hühner', 'Katzen'],
  ['Wo lebte der Philosoph Diogenes angeblich?', 'In einer Tonne', 'In einem Palast', 'Auf dem Mond'],
  ['Welches Getreide aßen die Griechen sehr oft?', 'Gerste', 'Reis', 'Mais'],
  ['Wer war Alexander der Große?', 'Ein König aus Makedonien', 'Ein Gott des Meeres', 'Ein Fisch'],
  ['Welches Meer liegt westlich von Griechenland?', 'Das Ionische Meer', 'Die Nordsee', 'Der Pazifik'],
  ['Auf welcher Insel lebte die Dichterin Sappho?', 'Lesbos', 'Kreta', 'Rhodos'],
  ['Was ist ein Orakel?', 'Ein Ort für Weissagungen', 'Ein Kriegsschiff', 'Ein Kuchen'],
  ['Wer half Theseus mit einem Faden aus dem Labyrinth?', 'Ariadne', 'Medusa', 'Hera'],
  ['Welcher Bote der Götter hat einen geflügelten Helm?', 'Hermes', 'Hades', 'Ares'],
  ['Was trugen griechische Soldaten am Arm, um sich zu schützen?', 'Einen Schild', 'Ein Kissen', 'Eine Amphore'],
  ['Was ist die Akropolis?', 'Ein Burgberg mit Tempeln', 'Ein Fluss', 'Ein Gericht'],
  ['Woher kommt das Wort „Olympiade“?', 'Von Olympia', 'Von Oliven', 'Von Omega'],
  ['Welches Tier ist Pegasus’ Mutter Medusa NICHT?', 'Ein Pferd', 'Eine Gorgone', 'Ein Ungeheuer'],
  ['Welcher Berg war das Zuhause der Musen?', 'Der Helikon', 'Der Mount Everest', 'Der Vesuv'],
  ['Was ist eine Trireme?', 'Ein Schiff mit drei Ruderreihen', 'Ein Tempel mit drei Säulen', 'Ein Pferd mit drei Beinen'],
  ['Was bedeutet das griechische Wort „Philosophie“?', 'Liebe zur Weisheit', 'Liebe zum Essen', 'Angst vor Spinnen'],
  ['Wer erfand der Sage nach die Flügel für sich und Ikarus?', 'Dädalus', 'Zeus', 'Perikles'],
  ['Welches Insekt machte den Honig, den die Griechen liebten?', 'Die Biene', 'Die Ameise', 'Die Mücke'],
);
const QUIZ_SPECIAL = [
  ['Sokrates', 'athen', 'Ich weiß, dass ich nichts weiß! Aber DU weißt vielleicht etwas …'],
  ['Platon', 'athen', 'Willkommen an meiner Akademie! Lass uns denken.'],
  ['Pythagoras', 'samos', 'a² + b² = c²! Alles ist Zahl, mein Freund!'],
  ['Thales', 'milet', 'Ich habe eine Sonnenfinsternis vorhergesagt. Kannst du meine Fragen vorhersagen?'],
  ['Heraklit', 'ephesos', 'Alles fließt! Auch diese Fragen.'],
  ['Hippokrates', 'kos', 'Ich bin Arzt. Ein kluger Kopf ist die beste Medizin!'],
  ['Sappho', 'chalkis', 'Ich dichte Lieder hier auf Lesbos. Kennst du die Antworten?'],
  ['Homer', 'chios', 'Ich habe die Ilias und die Odyssee gedichtet. Hör gut zu!'],
  ['Herodot', 'halikarnassos', 'Ich bin der Vater der Geschichtsschreibung. Prüfe dein Wissen!'],
  ['Aristoteles', 'stagira', 'Ich bin der Lehrer Alexanders des Großen. Und jetzt deiner!'],
  ['Alexander', 'lebadeia', 'Ich bin Alexander von Makedonien! Eines Tages erobere ich die Welt. Aber erst: Fragen!'],
  ['Diogenes', 'korinth', 'Geh mir aus der Sonne! … Na gut, ein paar Fragen.'],
  ['Archimedes', 'rhodos', 'Heureka! Ich hab’s! Hast du es auch?'],
  ['Pindar', 'theben', 'Ich besinge die Sieger von Olympia. Wirst du auch ein Sieger?'],
  ['Hesiod', 'theben', 'Ich habe aufgeschrieben, wie die Götter entstanden sind.'],
  ['Xenophon', 'sparta', 'Ich habe bei den Spartanern gelebt. Sie reden wenig – du hoffentlich mehr.'],
  ['Solon', 'piraeus', 'Ich habe Athen gute Gesetze gegeben. Kennst du dich aus?'],
  ['Phidias', 'olympia', 'Ich habe die große Zeusstatue in Olympia gebaut!'],
  ['Aspasia', 'milet', 'Selbst Perikles fragt mich um Rat. Nun frage ich dich.'],
  ['Demokrit', 'stagira', 'Alles besteht aus winzigen Teilchen – Atomen! Und aus Fragen.'],
  ['Euklid', 'kreta', 'Geometrie ist schön! Und Geschichte auch.'],
  ['Sophokles', 'athen', 'Ich schreibe Theaterstücke. Bist du bereit für deinen Auftritt?'],
  ['Äsop', 'samos', 'Kennst du die Fabel vom Fuchs und den Trauben? Ich habe sie erfunden!'],
  ['Thukydides', 'korkyra', 'Ich beschreibe den großen Krieg zwischen Athen und Sparta.'],
];
const QUIZ_MORE = ['Platon', 'Aristoteles', 'Thales', 'Pythagoras', 'Heraklit', 'Demokrit', 'Hypatia', 'Sappho', 'Herodot', 'Thukydides', 'Euklid', 'Archimedes', 'Hippokrates', 'Diogenes', 'Anaxagoras', 'Zenon', 'Epikur', 'Empedokles', 'Parmenides', 'Aspasia', 'Theano', 'Äsop', 'Homer', 'Hesiod', 'Pindar', 'Solon', 'Kleisthenes', 'Xenophon', 'Protagoras', 'Euripides', 'Aischylos', 'Aristophanes', 'Menander', 'Demosthenes', 'Theophrast', 'Eratosthenes', 'Aristarch', 'Hipparch', 'Anaximander', 'Anaximenes', 'Xenophanes', 'Gorgias', 'Prodikos', 'Antisthenes', 'Praxiteles', 'Myron', 'Iktinos', 'Kallikrates', 'Apelles', 'Lykurg', 'Pittakos', 'Bias', 'Chilon', 'Kleobulos', 'Periander', 'Theognis', 'Simonides', 'Bakchylides', 'Korinna', 'Telesilla'];
const QUIZ_TOTAL = 64;

const QUIZ_NAMES = ['Sokrates', 'Platon', 'Aristoteles', 'Thales', 'Pythagoras', 'Heraklit', 'Demokrit', 'Hypatia', 'Sappho', 'Herodot', 'Thukydides', 'Euklid', 'Archimedes', 'Hippokrates', 'Diogenes', 'Anaxagoras', 'Zenon', 'Epikur', 'Empedokles', 'Parmenides', 'Aspasia', 'Theano', 'Äsop', 'Homer', 'Hesiod', 'Pindar', 'Solon', 'Kleisthenes', 'Xenophon', 'Protagoras'];
const QUIZZERS = [];
function buildQuizNPCs() {
  const makeQ = (x, z, name, intro) => {
    const id = QUIZZERS.length, qr = mulberry32(5000 + id * 97), qs = [];
    while (qs.length < 5) { const k = Math.floor(qr() * QUIZ.length); if (!qs.includes(k)) qs.push(k); }
    const q = { id, x, z, name, qs, intro };
    reserve(x, z, 2);
    const f = new Frame(x, z, rand() * 6.28); f.box(M.marble2, 0, -0.3, -1.2, 1.4, 0.8, 0.5, true);
    q.npc = addNPC(name + ', der Gelehrte', x, z, { tunic: 0xf2ecdc, pants: 0xd8d0c0, beard: !['Sappho', 'Hypatia', 'Aspasia', 'Theano', 'Korinna', 'Telesilla'].includes(name), hair: pick([0xb8b0a0, 0x6a5a4a, 0x2a1a0e]), cape: pick([0x3a5a8a, 0x6b2f7a, 0x2a6a4a]), weapon: 'staff', wreath: id % 2 === 0 }, () => talkQuiz(q));
    QUIZZERS.push(q);
  };
  for (const [name, loc, intro] of QUIZ_SPECIAL) { const L = LOCS[loc]; const sp = findSpotNear(L, 10, L.r + 35, 2.5); if (sp) makeQ(sp[0], sp[1], name, intro); }
  const used = new Set(QUIZZERS.map(q => q.name));
  const names = QUIZ_MORE.filter(n => !used.has(n));
  let tries = 0, ni = 0;
  while (QUIZZERS.length < QUIZ_TOTAL && tries < 40000) {
    tries++;
    const x = rr(-HALF + 70, HALF - 70), z = rr(-HALF + 70, HALF - 70), h = heightAt(x, z);
    if (h < 2 || h > 90 || slopeAt(x, z) > 0.45 || !isFree(x, z, 3) || inCity(x, z, 0.9)) continue;
    if (QUIZZERS.some(q => Math.hypot(q.x - x, q.z - z) < (tries < 20000 ? 120 : 70))) continue;
    makeQ(x, z, names[ni++ % names.length] + (ni > names.length ? ' der Jüngere' : ''), null);
  }
}
GEAR.aigis = { name: 'Aigis der Athene', desc: '+100 Leben, 40 % weniger Schaden, jeder Block wird zur Parade' };
function athenaReward() {
  if (player.gear.includes('aigis') && player.gear.includes('sirene')) return;
  if (player.gear.includes('aigis')) { gainGear('sirene'); return; }
  flash = 1.2; sfx('zap');
  talk([
    { who: 'Athene, Göttin der Weisheit', text: 'Ich habe dich beobachtet, Sterblicher. Du hast ALLE Gelehrten von Hellas überzeugt – kein Held vor dir war so klug!' },
    { who: 'Athene, Göttin der Weisheit', text: 'Nimm meine Aigis, den Schild der Götter. Kein Schwert, kein Pfeil, kein Ungeheuer wird dich mehr leicht verletzen.', fn: () => { player.maxHp += 100; player.hp = player.maxHp; gainGear('aigis'); } },
    { who: 'Athene, Göttin der Weisheit', text: 'Und weil Wissen wie das Meer ist – tief und weit –, schenke ich dir die Gestalt der Sirene. Drücke J, und das Meer gehört dir!', fn: () => { gainGear('sirene'); banner('Gestalt der Sirene', 'J: Verwandle dich und schwimme schneller als jedes Schiff!'); } }]);
}
function quizItemReward(correct) {
  const n = S.quiz.length + 1, r = [];
  const give = (txt) => { r.push(txt); };
  if ((player.wTier || 0) < 2 && n % 3 === 1) { player.wTier = (player.wTier || 0) + 1; give('Waffe: ' + WEAPONS[player.wTier].name); }
  else if ((player.shieldTier || 0) < 1 && n % 3 === 2) { player.shieldTier = 1; give('Holzschild'); }
  else if ((player.aTier || 0) < 1 && n % 3 === 0) { player.maxHp += ARMORS[1].hp; player.hp = player.maxHp; player.aTier = 1; give('Rüstung: Leinenpanzer'); }
  else {
    const pool = [
      () => { player.potions += 2; give('2 × Ambrosia'); },
      () => { const ks = Object.keys(UPGRADES).filter(k => upLvl(k) < 5); if (!ks.length) return false; const k = pick(ks); player.up[k] = upLvl(k) + 1; if (k === 'hp') { player.maxHp += 15; player.hp += 15; } give('Schriftrolle: ' + UPGRADES[k].name + ' Stufe ' + player.up[k]); },
      () => { const sk = SKINS.filter(x => x.cost && !player.skins.includes(x.id)); if (!sk.length || n % 5) return false; const x = pick(sk); player.skins.push(x.id); give('Skin: ' + x.name); },
      () => { const ws = player.wTier || 0; if (ws >= WEAPONS.length - 1 || n % 6) return false; player.wTier = ws + 1; give('Waffe: ' + WEAPONS[player.wTier].name); },
      () => { player.dmg += 1; give('Amulett der Stärke (+1 Schaden)'); },
      () => { player.maxHp += 8; player.hp += 8; give('Lorbeerkranz (+8 Leben)'); },
    ];
    for (let t = 0; t < 10 && !r.length; t++) pick(pool)();
    if (!r.length) { player.potions += 2; give('2 × Ambrosia'); }
  }
  if (correct === 5) { player.potions += 1; }
  refreshHeroLook();
  setTimeout(() => toast('🎁 Belohnung: ' + r.join(', '), 'gold'), 600);
}
function talkQuiz(q) {
  const W = q.name;
  if (S.quiz.includes(q.id)) { talk([{ who: W, text: 'Du hast meine Fragen schon gelöst. ' + (QUIZZERS.length - S.quiz.length > 0 ? 'Es gibt noch ' + (QUIZZERS.length - S.quiz.length) + ' andere Gelehrte in Hellas!' : 'Du hast ALLE Gelehrten überzeugt!') }]); return; }
  talk([{ who: W, text: (q.intro ? q.intro + ' ' : '') + 'Chaire! Ich bin ' + W + '. Beantworte mir 5 Fragen über Griechenland – für jede richtige Antwort gibt es Drachmen, und wer mindestens 3 schafft, bekommt ein Geschenk!', opts: [
    { label: 'Ich bin bereit!', fn: () => askQuiz(q, 0, 0) }, { label: 'Später', fn: () => { } }] }]);
}
function askQuiz(q, i, correct) {
  const W = q.name;
  if (i >= 5) {
    const reward = correct * 12 + (correct === 5 ? 40 : 0);
    const pages = [{ who: W, text: correct + ' von 5 richtig! ' + (correct === 5 ? 'Perfekt – du bist ein wahrer Weiser!' : correct >= 3 ? 'Gut gemacht!' : 'Komm wieder, wenn du mehr weißt.'), fn: () => {
      if (reward) addMoney(reward);
      if (correct === 5) { player.potions++; toast('+1 Ambrosia', 'gold'); }
      if (correct >= 3) quizItemReward(correct);
      if (correct >= 3) { S.quiz.push(q.id); toast('Rätsel gelöst: ' + S.quiz.length + '/' + QUIZZERS.length + ' Gelehrte', 'gold'); if (S.quiz.length >= QUIZZERS.length) setTimeout(athenaReward, 1500); }
      save();
    } }];
    talk(pages); return;
  }
  const [question, right, w1, w2] = QUIZ[q.qs[i]];
  const opts = [right, w1, w2].map(v => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map(o => o.v);
  talk([{ who: W + ' – Frage ' + (i + 1) + '/5', text: question, opts: opts.map(o => ({ label: o, fn: () => {
    const ok = o === right; sfx(ok ? 'coin' : 'block');
    talk([{ who: W, text: ok ? 'Richtig! ✔' : 'Leider falsch. Richtig ist: ' + right + '.', fn: () => askQuiz(q, i + 1, correct + (ok ? 1 : 0)) }]);
  } })) }]);
}

function spawnMythCreatures() {
  const put = (type, x, z) => { if (heightAt(x, z) > 1.2) spawnEnemy(type, x, z); };
  for (const [lo, la] of [[23.0, 39.45], [23.05, 39.38], [22.98, 39.4], [22.1, 37.6], [22.15, 37.55], [21.5, 39.45]]) put('zentaur', ...ll(lo, la));
  for (const [lo, la] of [[20.62, 38.36], [22.95, 36.27], [26.9, 39.5]]) put('zyklop', ...ll(lo, la));
  const Si = LOCS.sirenen;
  for (let i = 0; i < 4; i++) put('harpyie', Si.x + rr(-35, 35), Si.z + rr(-35, 35));
  for (let i = 0; i < 3; i++) put('harpyie', LOCS.delphi.x - 40 + rr(-30, 30), LOCS.delphi.z - 60 + rr(-30, 30));
  for (let i = 0; i < 3; i++) put('skelett', LOCS.seriphos.x + rr(20, 60), LOCS.seriphos.z + rr(-60, -20));
  for (const F of MYTH_FORESTS) for (const t of F.roam) put(t, F.x + rr(-F.r * 0.7, F.r * 0.7), F.z + rr(-F.r * 0.7, F.r * 0.7));
}

// ============================================================
// Eingabe
// ============================================================
addEventListener('keydown', (e) => {
  if (!started) return;
  const k = e.code;
  if (NET.chatOpen) { if (k === 'Enter' || e.key === 'Enter') closeChat(true); if (k === 'Escape' || e.key === 'Escape') closeChat(false); return; }
  if (k === 'Enter' && !dialog) { e.preventDefault(); openChat(); return; }
  keys[k] = true;
  if (k === 'KeyE') { if (dialog) advanceDialog(); else interact(); }
  if (dialog && k === 'Escape') { dialog = null; renderDialog(); return; }
  if (dialog && /^Digit[1-9]$/.test(k)) chooseOpt(+k.slice(5) - 1);
  if (dialog) return;
  if (k === 'KeyR' && !player.flying && !player.sailing) { player.mounted ? dismount() : mount(); }
  if (k === 'KeyF') { if (player.potions > 0 && player.hp < player.maxHp) { player.potions--; player.hp = Math.min(player.maxHp, player.hp + 60); sfx('drink'); floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, '+60', '#7aff8a'); } else if (player.potions <= 0) toast('Keine Ambrosia mehr. Kleon in Athen verkauft welche.'); }
  if (k === 'KeyQ') zeusBolt();
  if (k === 'KeyP') toggleAdmin();
  if (k === 'KeyI' || (k === 'Escape' && heroOpen)) { toggleHero(); return; }
  if (adminOpen || heroOpen) return;
  if (k === 'KeyX') cycleWeapon();
  if (k === 'KeyV') throwBlitz(false);
  if (k === 'KeyU') toggleBird();
  if (k === 'KeyJ') setForm('siren');
  if (k === 'KeyK') setForm('centaur');
  if (k === 'KeyT') toggleFly();
  if (k === 'KeyB') toggleShip();
  if (k === 'KeyG') medusaHead();
  if (k === 'KeyM') { mapOpen = !mapOpen; $('bigmap').classList.toggle('hidden', !mapOpen); if (mapOpen) showLeaderboard(); }
  if (k === 'Space') { e.preventDefault(); sirenTap(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', (e) => {
  if (!started) return;
  if (TOUCH.on && e.pointerType === 'touch') return;
  if (document.pointerLockElement !== canvas) { canvas.requestPointerLock && canvas.requestPointerLock(); }
  if (e.button === 0) { mouse.left = true; if (dialog) { if (!dialog.pages[dialog.i].opts) advanceDialog(); } else playerAttack(); }
  if (e.button === 2) mouse.right = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousemove', (e) => {
  if (!started) return;
  const locked = document.pointerLockElement === canvas;
  if (locked || mouse.left) { const mx = e.movementX || 0, my = e.movementY || 0; if (Math.abs(mx) > 300 || Math.abs(my) > 300) return; camYaw -= mx * 0.0026; camPitch = clamp(camPitch + my * 0.0022, -0.35, 1.25); }
});
addEventListener('wheel', (e) => { camZoom = clamp(camZoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.45, 2.2); }, { passive: true });
document.addEventListener('pointerlockchange', () => { paused = started && document.pointerLockElement !== canvas && !dialog && !mapOpen && !adminOpen && !heroOpen && !NET.chatOpen && !TOUCH.on; $('pause').classList.toggle('hidden', !paused); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); resizeOverlay(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; });

// ============================================================
// Heldenmenü (Upgrades, Skins, Ausrüstung), Bogen, Schild, Olympische Spiele
// ============================================================
const UPGRADES = {
  hp: { name: 'Lebenskraft', desc: '+15 maximales Leben', base: 60 },
  dmg: { name: 'Stärke', desc: '+3 Nahkampfschaden', base: 70 },
  st: { name: 'Ausdauer', desc: '−10 % Ausdauerverbrauch beim Sprinten', base: 50 },
  spd: { name: 'Schnelligkeit', desc: '+4 % Laufgeschwindigkeit', base: 60 },
  bow: { name: 'Bogenschießen', desc: '+5 Pfeilschaden', base: 60 },
  shield: { name: 'Schildkunde', desc: 'Blocken hält mehr ab und kostet weniger Ausdauer', base: 50 },
};
const SKINS = [
  { id: 'standard', name: 'Held von Athen', cost: 0, look: {} },
  { id: 'athen', name: 'Athener Blau', cost: 120, look: { tunic: 0x1c3a7a, cape: 0xe8e0cc, crest: 0x1c3a7a, shieldEmblem: 0xe8e0cc } },
  { id: 'sparta', name: 'Spartaner', cost: 120, look: { tunic: 0x8e1717, cape: 0x8e1717, crest: 0xa01818, shieldEmblem: 0x8a1a1a, beard: true } },
  { id: 'meer', name: 'Meereswächter', cost: 250, look: { tunic: 0x1a6a7a, armor: 0x3a9a9a, cape: 0x1a4a6a, crest: 0x60d0ff, shieldCol: 0x3a9a9a, shieldEmblem: 0x1a4a6a } },
  { id: 'schatten', name: 'Schattenkrieger', cost: 300, look: { tunic: 0x1a1a22, armor: 0x2a2a34, helmetCol: 0x1a1a22, cape: 0x0a0a10, crest: 0x6a1a8a, shieldCol: 0x2a2a34, shieldEmblem: 0x6a1a8a, pants: 0x101014 } },
  { id: 'gold', name: 'Goldener Held', cost: 450, look: { tunic: 0xf2ecdc, armor: 0xe8c46a, helmetCol: 0xe8c46a, cape: 0xe8c46a, crest: 0xffffff, shieldCol: 0xe8c46a, shieldEmblem: 0xffffff } },
  { id: 'olympia', name: 'Olympiasieger', unlock: 'Gewinne in Olympia alle 5 Goldmedaillen', look: { tunic: 0xffffff, cape: 0xe8c46a, crest: 0x5a7a2a, armor: 0xf2ecdc, shieldEmblem: 0x5a7a2a } },
  { id: 'hades', name: 'Herr der Unterwelt', unlock: 'Besiege Kerberos in der Unterwelt', look: { tunic: 0x1a1a1a, armor: 0x2a2a34, helmetCol: 0x2a2a34, cape: 0x1a3a2a, crest: 0x40ff90, shieldEmblem: 0x40ff90 } },
];
function skinUnlocked(sk) { if (sk.id === 'olympia') return OLY_EVENTS.every(e => (S.olympia[e.id] || 0) === 3); if (sk.id === 'hades') return player.gear.includes('hadeshelm'); return true; }
const upLvl = (k) => (player.up && player.up[k]) || 0;
const bowDamage = () => 12 + upLvl('bow') * 5 + WEAPONS[player.wTier || 0].dmg * 0.5;

let heroOpen = false, heroTab = 'gear';
function toggleHero() {
  heroOpen = !heroOpen;
  $('heroPanel').classList.toggle('hidden', !heroOpen);
  if (heroOpen) { for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); renderHero(); }
}
function renderHero() {
  const body = $('heroBody'); body.textContent = '';
  const tabs = document.createElement('div'); tabs.className = 'htabs';
  for (const [id, lab] of [['gear', 'Inventar & Waffen'], ['up', 'Upgrades'], ['skin', 'Skins'], ['oly', 'Olympia']]) tabs.appendChild(adminBtn(lab, () => { heroTab = id; renderHero(); }, heroTab === id ? 'on' : ''));
  body.appendChild(tabs);
  const info = document.createElement('div'); info.className = 'ahint'; info.textContent = '⚱ ' + player.money + ' Drachmen'; body.appendChild(info);
  const row = (label, btn) => { const r = document.createElement('div'); r.className = 'arow'; const s = document.createElement('span'); s.textContent = label; r.appendChild(s); if (btn) r.appendChild(btn); body.appendChild(r); };
  if (heroTab === 'up') {
    for (const [k, u] of Object.entries(UPGRADES)) {
      const l = upLvl(k), cost = u.base * (l + 1);
      row(u.name + ' ' + '▰'.repeat(l) + '▱'.repeat(5 - l) + ' – ' + u.desc, l >= 5 ? null : adminBtn('Stufe ' + (l + 1) + ': ' + cost + ' Dr', () => {
        if (!spend(cost)) return;
        player.up[k] = l + 1;
        if (k === 'hp') { player.maxHp += 15; player.hp += 15; }
        toast(u.name + ' Stufe ' + (l + 1) + '!', 'gold'); save(); renderHero();
      }));
    }
  } else if (heroTab === 'skin') {
    for (const sk of SKINS) {
      const own = player.skins.includes(sk.id), unl = skinUnlocked(sk), active = player.skin === sk.id;
      let btn;
      if (active) btn = adminBtn('✔ Angelegt', () => { }, 'on');
      else if (own || (sk.unlock && unl)) btn = adminBtn('Anlegen', () => { if (!player.skins.includes(sk.id)) player.skins.push(sk.id); player.skin = sk.id; refreshHeroLook(); save(); renderHero(); });
      else if (sk.unlock) btn = adminBtn('🔒 gesperrt', () => toast(sk.unlock));
      else btn = adminBtn('Kaufen: ' + sk.cost + ' Dr', () => { if (spend(sk.cost)) { player.skins.push(sk.id); player.skin = sk.id; refreshHeroLook(); toast('Neuer Skin: ' + sk.name, 'gold'); save(); renderHero(); } });
      row(sk.name + (sk.unlock && !unl ? ' – ' + sk.unlock : ''), btn);
    }
  } else if (heroTab === 'gear') {
    const cur = player.bowMode ? 'bow' : player.blitzMode ? 'blitz' : 'sword';
    const wr = document.createElement('div'); wr.className = 'htabs';
    for (const [w, lab] of [['sword', '⚔ Schwert'], ['bow', '🏹 Bogen'], ['blitz', '⚡ Keraunos']]) { if (w === 'blitz' && !player.gear.includes('keraunos')) continue; wr.appendChild(adminBtn(lab + (cur === w ? ' ✔' : ''), () => { setWeapon(w); renderHero(); }, cur === w ? 'on' : '')); }
    const wl = document.createElement('div'); wl.className = 'ahint'; wl.textContent = 'Waffe ausrüsten:'; body.appendChild(wl); body.appendChild(wr);
    row('Waffe: ' + WEAPONS[player.wTier || 0].name + ' (' + Math.round(playerDamage()) + ' Schaden)');
    row('Bogen: ' + Math.round(bowDamage()) + ' Schaden pro Pfeil – Taste X / 🏹 zum Wechseln');
    row('Rüstung: ' + ARMORS[player.aTier || 0].name + ' (−' + Math.round(ARMORS[player.aTier || 0].red * 100) + ' % Schaden)');
    row('Leben: ' + Math.ceil(player.hp) + ' / ' + player.maxHp);
    row('Reittier: ' + HORSES[player.horse || 'gaul'].name + (player.shipTier ? ' · Schiff: ' + SHIPS[player.shipTier].name : ''));
    row('Relikte: ' + (player.relics.length ? player.relics.map(k => RELICS[k].name).join(', ') : 'keine'));
    row('Göttliche Schätze: ' + (player.gear.length ? player.gear.map(k => GEAR[k].name).join(', ') : 'keine'));
    row('Gefolge: ' + (allies.length ? allies.map(a => a.def.name).join(', ') : 'niemand'));
  } else {
    for (const ev of OLY_EVENTS) row(ev.name + ': ' + MEDALS[S.olympia[ev.id] || 0] + ' – ' + ev.goal);
    row('Alle 5 Gold schalten den Skin „Olympiasieger“ frei. Melde dich beim Kampfrichter im Stadion von Olympia.');
  }
}

// ---------- Bogen ----------
const arrows = [];
const ARROW_GEO = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5); ARROW_GEO.rotateX(Math.PI / 2);
const ARROW_TIP = new THREE.ConeGeometry(0.06, 0.18, 5); ARROW_TIP.rotateX(Math.PI / 2); ARROW_TIP.translate(0, 0, 0.5);
function toggleBow() {
  if (player.sailing) return;
  player.bowMode = !player.bowMode; if (player.bowMode) player.blitzMode = false; refreshHeroLook();
  document.body.classList.toggle('bow', player.bowMode);
  toast(player.bowMode ? '🏹 Bogen bereit – zielen mit der Kamera, Angriff zum Schießen' : '⚔ Schwert gezogen');
}
const _cdir = new V3(), _cr = new V3();
function shootArrow() {
  if (player.atkCd > 0) return;
  if (OLY && OLY.ev === 'bogen') { if (OLY.arrows <= 0) return; OLY.arrows--; }
  player.atkCd = 0.6; player.atkAnim = 1; sfx('swing');
  camera.getWorldDirection(_cdir);
  _cr.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const o = new V3(player.pos.x, player.pos.y + (player.mounted ? 2.9 : 1.6), player.pos.z).addScaledVector(_cr, 0.3);
  let target = camera.position.clone().addScaledVector(_cdir, 80);
  let best = 0.087;
  for (const e of enemies) {
    if (e.dead || e.oly === false) continue;
    const c = new V3(e.x, e.y + (e.def.top || 2) * 0.6, e.z), v = c.clone().sub(camera.position), d = v.length();
    if (d > 70) continue;
    const ang = Math.acos(clamp(v.normalize().dot(_cdir), -1, 1));
    if (ang < best) { best = ang; target = c; }
  }
  if (OLY && OLY.ev === 'bogen') { let bt = 0.05; for (const tg of OLY.targets) { const c = new V3(tg.x, tg.y, tg.z), v = c.clone().sub(camera.position); const ang = Math.acos(clamp(v.normalize().dot(_cdir), -1, 1)); if (ang < bt) { bt = ang; target = c.add(new V3(0, (c.x - o.x) * (c.x - o.x) * 9.8 / (2 * 58 * 58), 0)); } } }
  const vel = target.sub(o).normalize().multiplyScalar(58);
  player.yaw = Math.atan2(vel.x, vel.z);
  const g = new THREE.Group(); g.add(new THREE.Mesh(ARROW_GEO, M.wood)); g.add(new THREE.Mesh(ARROW_TIP, lam(0xd8d8d0)));
  g.position.copy(o); scene.add(g);
  arrows.push({ g, vel, t: 4, stuck: 0, dmg: bowDamage() });
}
const _ap = new V3();
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (a.stuck > 0) { a.stuck -= dt; if (a.stuck <= 0) { scene.remove(a.g); arrows.splice(i, 1); } continue; }
    a.t -= dt; _ap.copy(a.g.position);
    if (!a.blitz) a.vel.y -= 9.8 * dt; a.g.position.addScaledVector(a.vel, dt);
    a.g.quaternion.setFromUnitVectors(new V3(0, 0, 1), a.vel.clone().normalize());
    const p = a.g.position;
    let hit = false;
    if (OLY && OLY.ev === 'bogen') for (const tg of OLY.targets) {
      if (_ap.x < tg.x && p.x >= tg.x) {
        const k = (tg.x - _ap.x) / (p.x - _ap.x), yy = _ap.y + (p.y - _ap.y) * k, zz = _ap.z + (p.z - _ap.z) * k;
        const off = Math.hypot(yy - tg.y, zz - tg.z);
        if (off < 1.3) { const pts = Math.round((off < 0.35 ? 10 : off < 0.8 ? 6 : 3) * tg.mul); OLY.score += pts; floatText(tg.x, tg.y + 1.8, tg.z, '+' + pts, off < 0.35 ? '#ffd24a' : '#fff', off < 0.35); sfx('coin'); p.set(tg.x - 0.1, yy, zz); hit = true; }
      }
    }
    if (!hit) for (const e of enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) < (e.def.hitR || 0.3) + (a.blitz ? 1 : 0.45) && p.y > e.y - 0.2 && p.y < e.y + (e.def.top || 2.2)) { if (a.blitz) blitzExplode(p); else damageEnemy(e, a.dmg * rr(0.9, 1.1)); hit = true; scene.remove(a.g); arrows.splice(i, 1); break; }
    }
    if (hit && arrows[i] === a) { a.stuck = 3; continue; }
    if (hit) continue;
    if (p.y < groundAt(p.x, p.z) || a.t <= 0) { if (a.blitz) { if (a.t > 0) blitzExplode(p); scene.remove(a.g); arrows.splice(i, 1); continue; } a.stuck = 4; }
  }
}

// ---------- Schild ----------
function shieldBash() {
  if (player.atkCd > 0 || player.stamina < 12) return;
  player.atkCd = 0.9; player.stamina -= 12; sfx('block');
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  let n = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.pos.x, dz = e.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.8 + (e.def.hitR || 0.3) || (d > 0.8 && (dx * fx + dz * fz) / d < 0.3)) continue;
    damageEnemy(e, 4 + upLvl('shield') * 2); n++;
    if (!e.def.boss) { e.stunT = 1.3; floatText(e.x, e.y + 2.6, e.z, 'Betäubt', '#9ad0ff'); const k = 3 / (d || 1); const q = { x: e.x + dx * k, z: e.z + dz * k }; if (groundAt(q.x, q.z) > -0.5) { resolveCollisions(q, e.def.r); e.x = q.x; e.z = q.z; } }
  }
  floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, n ? 'Schildstoß!' : 'Schildstoß', '#e8c46a');
}

// ---------- Olympische Spiele ----------
const MEDALS = ['–', '🥉 Bronze', '🥈 Silber', '🥇 Gold'];
const OLY_EVENTS = [
  { id: 'lauf', name: 'Stadionlauf', goal: 'Hin und zurück: Gold unter 25 s, Silber unter 28 s, Bronze unter 32 s', medal: (t) => t <= 25 ? 3 : t <= 28 ? 2 : t <= 32 ? 1 : 0 },
  { id: 'wagen', name: 'Wagenrennen', goal: '2 Runden im Streitwagen: Gold unter 17 s, Silber unter 21 s, Bronze unter 26 s', medal: (t) => t <= 17 ? 3 : t <= 21 ? 2 : t <= 26 ? 1 : 0 },
  { id: 'speer', name: 'Speerwurf', goal: '3 Würfe: Gold ab 85 m, Silber ab 70 m, Bronze ab 50 m', medal: (d) => d >= 85 ? 3 : d >= 70 ? 2 : d >= 50 ? 1 : 0 },
  { id: 'bogen', name: 'Bogenschießen', goal: '8 Pfeile auf 3 Scheiben: Gold ab 100, Silber ab 65, Bronze ab 35 Punkten', medal: (p) => p >= 100 ? 3 : p >= 65 ? 2 : p >= 35 ? 1 : 0 },
  { id: 'ringen', name: 'Pankration', goal: 'Besiege den Champion: Gold mit über 60 % Leben, Silber über 30 %', medal: (h) => h >= 0.6 ? 3 : h >= 0.3 ? 2 : 1 },
];
let OLY = null;
function stadium() { const [sx, sz] = SPOTS.raceStart, [ex] = SPOTS.raceEnd; return { sx, sz, ex, cx: (sx + ex) / 2 }; }
function talkJudge() {
  const W = 'Kampfrichter';
  if (race || OLY) { talk([{ who: W, text: 'Ein Wettkampf läuft gerade! Gib alles!', opts: [{ label: 'Wettkampf abbrechen', fn: () => olyAbort('Abgebrochen.') }, { label: 'Weiter', fn: () => { } }] }]); return; }
  talk([{ who: W, text: 'Willkommen bei den Olympischen Spielen! Zeig, was in dir steckt – für jede Medaille gibt es Drachmen und Ruhm. Gesamt: ' + OLY_EVENTS.filter(e => S.olympia[e.id] === 3).length + '/5 Gold.', opts: OLY_EVENTS.map(ev => ({ label: ev.name + ' – ' + MEDALS[S.olympia[ev.id] || 0], fn: () => talk([{ who: W, text: ev.name + ': ' + ev.goal + '.', opts: [{ label: 'Los geht\'s!', fn: () => olyStart(ev.id) }, { label: 'Zurück', fn: talkJudge }] }]) })).concat([{ label: 'Auf Wiedersehen', fn: () => { } }]) }]);
}
function olyStart(id) {
  const st = stadium();
  if (player.flying) stopFlying(true);
  if (id !== 'wagen' && player.mounted) dismount();
  player.pos.set(st.sx + 1, groundAt(st.sx + 1, st.sz), st.sz); player.vy = 0; player.yaw = Math.PI / 2; camYaw = -Math.PI / 2; camPitch = 0.2;
  player.stamina = 100; player.hp = player.maxHp;
  if (id === 'lauf' || id === 'wagen') {
    const legs = id === 'lauf' ? [SPOTS.raceEnd, SPOTS.raceStart] : [SPOTS.raceEnd, SPOTS.raceStart, SPOTS.raceEnd, SPOTS.raceStart];
    race = { t: 0, legs, leg: 0, limit: id === 'lauf' ? 40 : 35, ev: id, mount: id === 'wagen' };
    if (id === 'wagen') { race.prevHorse = player.horse; player.horse = 'wagen'; setHorseModel(); mount(); }
    toast(id === 'lauf' ? 'Los! Zum Ostende und zurück!' : 'Los! Zwei Runden – Ostende, Start, Ostende, Start!', 'gold'); sfx('quest');
    return;
  }
  OLY = { ev: id, t: 0 };
  if (id === 'speer') { Object.assign(OLY, { tries: 3, best: 0, m: 0, dir: 1, jav: null, lock: true }); toast('Tippe/klicke Angriff, wenn die Kraftanzeige voll ist!', 'gold'); }
  if (id === 'bogen') {
    Object.assign(OLY, { arrows: 8, score: 0, lock: true, targets: [] });
    if (!player.bowMode) toggleBow();
    [[20, -4, 1], [35, 3, 1.5], [50, -2, 2]].forEach(([dx, dz, mul]) => {
      const x = st.sx + dx, z = st.sz + dz, y = groundAt(x, z) + 1.6, g = new THREE.Group();
      const disc = (r, col, off) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 24), lam(col)); m.rotation.z = Math.PI / 2; m.position.x = off; g.add(m); };
      disc(1.3, 0xf2ecdc, 0); disc(0.8, 0xb02020, -0.03); disc(0.35, 0xe8c46a, -0.06);
      const post = new THREE.Mesh(G.cyl8, M.wood); post.scale.set(0.15, 1.6, 0.15); post.position.set(0.1, -0.8, 0); g.add(post);
      g.position.set(x, y, z); scene.add(g);
      OLY.targets.push({ x: x - 0.06, y, z, mul, g });
    });
    toast('8 Pfeile, 3 Scheiben – weiter entfernte bringen mehr Punkte!', 'gold');
  }
  if (id === 'ringen') {
    player.pos.set(st.cx - 4, groundAt(st.cx - 4, st.sz), st.sz); camYaw = -Math.PI / 2;
    if (player.bowMode) toggleBow();
    const foe = spawnEnemy('athlet', st.cx + 4, st.sz); foe.oly = true; foe.state = 'chase'; OLY.foe = foe;
    toast('Pankration! Besiege den Champion – ohne zu fallen!', 'gold');
  }
  sfx('quest');
}
function olyCleanup() {
  if (!OLY) return;
  if (OLY.targets) for (const t of OLY.targets) scene.remove(t.g);
  if (OLY.jav) scene.remove(OLY.jav.m);
  if (OLY.foe && enemies.includes(OLY.foe)) removeEnemy(OLY.foe);
  OLY = null;
}
function olyAbort(msg) {
  if (race) { if (race.mount) { dismount(); player.horse = race.prevHorse || 'gaul'; setHorseModel(); } race = null; }
  olyCleanup(); toast(msg);
}
function olyResult(id, value, text) {
  const ev = OLY_EVENTS.find(e => e.id === id), medal = ev.medal(value), prev = S.olympia[id] || 0;
  banner(medal ? MEDALS[medal] + ' – ' + ev.name : ev.name + ': keine Medaille', text);
  if (medal > prev) {
    const prize = [0, 25, 45, 80], gain = prize[medal] - prize[prev];
    S.olympia[id] = medal; addMoney(gain); sfx('quest');
    if (OLY_EVENTS.every(e => S.olympia[e.id] === 3) && S.zeus === 1) setTimeout(() => setZeus(2), 9000);
    if (OLY_EVENTS.every(e => S.olympia[e.id] === 3)) setTimeout(() => banner('OLYMPIASIEGER!', 'Alle 5 Goldmedaillen – der Skin „Olympiasieger“ ist freigeschaltet!'), 4500);
  }
  save();
}
function updateOly(dt) {
  const hud = $('olyHud');
  if (race && race.ev) {
    hud.textContent = (race.ev === 'lauf' ? '🏃 Stadionlauf' : '🐎 Wagenrennen') + ' · ' + race.t.toFixed(1) + ' s · Etappe ' + Math.min(race.leg + 1, race.legs.length) + '/' + race.legs.length;
    return;
  }
  if (!OLY) { if (hud.textContent) hud.textContent = ''; return; }
  OLY.t += dt;
  if (OLY.ev === 'speer') {
    if (!OLY.jav) { OLY.m += OLY.dir * dt * 1.5; if (OLY.m > 1) { OLY.m = 1; OLY.dir = -1; } if (OLY.m < 0) { OLY.m = 0; OLY.dir = 1; } }
    else {
      const j = OLY.jav; j.v.y -= 9.8 * dt; j.m.position.addScaledVector(j.v, dt); j.m.quaternion.setFromUnitVectors(new V3(0, 0, 1), j.v.clone().normalize());
      if (j.m.position.y <= groundAt(j.m.position.x, j.m.position.z)) {
        const d = j.m.position.x - stadium().sx;
        OLY.best = Math.max(OLY.best, d); floatText(j.m.position.x, j.m.position.y + 1.5, j.m.position.z, d.toFixed(1) + ' m', '#ffd24a', true);
        OLY.tries--; const m = j.m; setTimeout(() => scene.remove(m), 2500); OLY.jav = null;
        if (OLY.tries <= 0) { const b = OLY.best; olyCleanup(); olyResult('speer', b, 'Bester Wurf: ' + b.toFixed(1) + ' m'); return; }
      }
    }
    const n = 20, f = Math.round(OLY.m * n);
    hud.textContent = '🗡 Speerwurf · Würfe: ' + OLY.tries + ' · Bester: ' + OLY.best.toFixed(1) + ' m · Kraft ' + '█'.repeat(f) + '░'.repeat(n - f);
  } else if (OLY.ev === 'bogen') {
    hud.textContent = '🏹 Bogenschießen · Pfeile: ' + OLY.arrows + ' · Punkte: ' + OLY.score;
    if (OLY.arrows <= 0 && !arrows.some(a => a.stuck <= 0)) { OLY.endT = (OLY.endT || 0) + dt; if (OLY.endT > 1) { const sc = OLY.score; olyCleanup(); olyResult('bogen', sc, sc + ' Punkte'); } }
  } else if (OLY.ev === 'ringen') {
    hud.textContent = '🤼 Pankration · Champion: ' + Math.max(0, Math.ceil(OLY.foe.hp)) + ' · Du: ' + Math.ceil(player.hp) + '/' + player.maxHp;
  }
}
function throwJavelin() {
  if (!OLY || OLY.jav || OLY.tries <= 0) return;
  player.atkAnim = 1; sfx('swing');
  const q = OLY.m, v = 14 + q * 18, a = 40 * Math.PI / 180;
  const m = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), M.wood); shaft.rotation.x = Math.PI / 2; m.add(shaft);
  const tip = new THREE.Mesh(G.cone, lam(0xd8d8d0)); tip.scale.set(0.1, 0.3, 0.1); tip.rotation.x = Math.PI / 2; tip.position.z = 1.4; m.add(tip);
  m.position.set(player.pos.x + 0.5, player.pos.y + 1.8, player.pos.z); scene.add(m);
  OLY.jav = { m, v: new V3(Math.cos(a) * v, Math.sin(a) * v, 0) };
  floatText(player.pos.x, player.pos.y + 2.6, player.pos.z, Math.round(q * 100) + ' % Kraft', q > 0.9 ? '#ffd24a' : '#fff');
}

// ============================================================
// Nebenquest-Reihe: Die Prüfungen des Zeus – Keraunos & Blitzadler
// ============================================================
GEAR.keraunos = { name: 'Keraunos – Blitz des Zeus', desc: 'X: Blitzwaffe wählen (Schlag mit Kettenblitz) · V: Blitz werfen' };
GEAR.blitzvogel = { name: 'Gestalt des Blitzadlers', desc: 'U: Verwandle dich in den Blitzadler – fliege und schleudere Blitze' };
THEMES.storm = { wall: 0x2a2e3a, floor: 0x22252e, col: 0x4a5060, fire: 0x9ad0ff, light: 0xa8ccff, H: 10, pool: 0x3a6aff };
const ZEUS_ALTARS = [
  { name: 'Altar von Dodona', x: LOCS.dodona.x + 12, z: LOCS.dodona.z - 6 },
  { name: 'Altar auf dem Lykaion', x: ll(22.0, 37.45)[0], z: ll(22.0, 37.45)[1] },
  { name: 'Altar im Ida-Gebirge', x: ll(24.77, 35.25)[0], z: ll(24.77, 35.25)[1] },
];
const ZEUS_STEPS = [
  () => 'Sprich mit Hermes beim Zeustempel in Olympia.',
  () => 'Gewinne bei den Olympischen Spielen alle 5 Goldmedaillen (' + OLY_EVENTS.filter(e => S.olympia[e.id] === 3).length + '/5).',
  () => 'Besiege die 3 Giganten am Fuß des Olymp (' + (S.zeusKills || 0) + '/3).',
  () => 'Entzünde die drei Altäre des Zeus: Dodona, Lykaion und Ida (' + (S.altars || []).length + '/3).',
  () => 'Kehre zum Schrein des Zeus auf dem Gipfel des Olymp zurück.',
  () => 'Letzte Prüfung: Besiege Typhon im Gipfel der Stürme (Eingang am Hang des Olymp). Sehr schwer!',
  () => 'Du bist Champion des Zeus! (U: Blitzadler · V: Blitz werfen)',
];
let hermesNPC = null;
function buildZeusQuest() {
  const L = LOCS.olympia, sp = findSpotNear(L, 18, 45, 2.5) || [L.x - 14, L.z - 12];
  hermesNPC = addNPC('Hermes, der Götterbote', sp[0], sp[1], { tunic: 0xf2ecdc, pants: 0xe8e0cc, helmet: true, helmetCol: 0xe8c46a, crest: 0xffffff, cape: 0xe8c46a, weapon: 'staff', skin: 0xe0b08a }, talkHermes);
  ZEUS_ALTARS.forEach((A, i) => {
    let x = A.x, z = A.z;
    for (let k = 0; k < 200 && heightAt(x, z) < 3; k++) { x = A.x + rr(-60, 60); z = A.z + rr(-60, 60); }
    A.x = x; A.z = z; reserve(x, z, 4);
    const f = new Frame(x, z, 0);
    f.box(M.marble2, 0, -1, 0, 2.6, 2.1, 2.6, true); f.box(M.marble, 0, 1.1, 0, 2.9, 0.3, 2.9);
    f.put(G.cyl, M.bronze, 0, 1.45, 0, 0, 0, 0, 1.6, 0.4, 1.6);
    for (let c = 0; c < 4; c++) { const a = c / 4 * 6.28 + 0.78; f.put(G.col, M.marble, Math.cos(a) * 3, 2.2, Math.sin(a) * 3, 0, 0, 0, 0.7, 4.4, 0.7); circleCol(x + Math.cos(a) * 3, z + Math.sin(a) * 3, 0.45); }
    A.fire = new THREE.Mesh(G.cone, lam(0x9ad0ff, 0x4aa0ff)); A.fire.position.set(x, f.y + 2.4, z); A.fire.scale.set(0.9, 1.6, 0.9); A.fire.visible = false; scene.add(A.fire); fires.push(A.fire);
    interactables.push({ pos: () => new V3(x, heightAt(x, z), z), label: 'Altar des Zeus entzünden', r: 3.6, active: () => S.zeus === 3 && !S.altars.includes(i), fn: () => {
      S.altars.push(i); A.fire.visible = true; flash = 0.8; sfx('zap'); makeBolt(x, z);
      toast(A.name + ' brennt! (' + S.altars.length + '/3)', 'gold');
      if (S.altars.length >= 3) setZeus(4); else { updateZeusText(); save(); }
    } });
  });
}
function setZeus(n) {
  S.zeus = n; sfx('quest');
  const msg = { 1: 'Die Prüfungen des Zeus beginnen!', 2: 'Hermes: „Zeus ist beeindruckt. Nun bezwinge die Giganten!“', 3: 'Die Giganten sind gefallen. Entzünde die heiligen Altäre!', 4: 'Die Altäre brennen. Zeus erwartet dich auf dem Olymp!', 5: 'Zeus gab dir den Keraunos. Nur noch Typhon steht dir im Weg …', 6: 'CHAMPION DES ZEUS' };
  if (msg[n]) banner('⚡ Prüfungen des Zeus', msg[n]);
  if (n === 2) spawnGiants();
  updateZeusText(); save();
}
function spawnGiants() {
  for (const e of enemies.filter(e => e.type === 'gigant')) removeEnemy(e);
  const left = 3 - (S.zeusKills || 0);
  const O = LOCS.olymp, spots = [[O.x - 60, O.z + 90], [O.x + 70, O.z + 80], [O.x + 10, O.z + 120]];
  for (let i = 0; i < left; i++) { let [x, z] = spots[i]; for (let k = 0; k < 50 && heightAt(x, z) < 3; k++) { x = spots[i][0] + rr(-40, 40); z = spots[i][1] + rr(-40, 40); } spawnEnemy('gigant', x, z); }
}
function updateZeusText() { const el = $('zeusText'); if (el) el.textContent = S.zeus > 0 && S.zeus < 6 ? '⚡ ' + ZEUS_STEPS[S.zeus]() : ''; }
function zeusTarget() {
  if (!S.zeus || S.zeus >= 6 || curD) return null;
  const P = player.pos, near = (arr) => arr.reduce((b, a) => (!b || Math.hypot(a.x - P.x, a.z - P.z) < Math.hypot(b.x - P.x, b.z - P.z) ? a : b), null);
  if (S.zeus === 1) return { x: SPOTS.judge[0], z: SPOTS.judge[1] };
  if (S.zeus === 2) { const g = near(enemies.filter(e => e.type === 'gigant' && !e.dead)); return g ? { x: g.x, z: g.z } : null; }
  if (S.zeus === 3) return near(ZEUS_ALTARS.filter((A, i) => !S.altars.includes(i)));
  if (S.zeus === 4) return { x: SPOTS.shrine[0], z: SPOTS.shrine[1] };
  if (S.zeus === 5) { const d = DUNGEONS.find(d => d.key === 'typhon'); return d ? { x: d.at[0], z: d.at[1] } : null; }
  return null;
}
function talkHermes() {
  const W = 'Hermes';
  if (!S.zeus) talk([
    { who: W, text: 'Ah, da bist du ja! Ich bin Hermes, der Bote der Götter. Mein Vater Zeus sucht einen Champion.' },
    { who: W, text: 'Doch nur der Würdigste erhält den Keraunos – den Blitz des Zeus. Und wer alle Prüfungen besteht, dem schenkt er die Gestalt des Blitzadlers …' },
    { who: W, text: 'Erste Prüfung: Gewinne bei den Olympischen Spielen hier in Olympia alle fünf Goldmedaillen!', fn: () => { setZeus(1); if (OLY_EVENTS.every(e => S.olympia[e.id] === 3)) setZeus(2); } },
  ]);
  else if (S.zeus >= 6) talk([{ who: W, text: 'Champion des Zeus! Selbst die Götter flüstern deinen Namen.' }]);
  else talk([{ who: W, text: 'Deine Aufgabe: ' + ZEUS_STEPS[S.zeus]() + (S.zeus === 5 ? ' Typhon ist der Vater aller Ungeheuer – weiche seinen Blitzen aus, wenn der Boden rot leuchtet!' : '') }]);
}
function zeusShrine() {
  talk([
    { who: 'Stimme des Zeus', text: 'Du hast die Spiele gewonnen, die Giganten gestürzt und meine Altäre entzündet. Du bist würdig.' },
    { who: 'Stimme des Zeus', text: 'Nimm den Keraunos, meinen Blitz! Schlage damit zu – oder schleudere ihn auf deine Feinde.', fn: () => { flash = 1.5; sfx('zap'); makeBolt(player.pos.x + 2, player.pos.z); gainGear('keraunos'); } },
    { who: 'Stimme des Zeus', text: 'Doch eine letzte Prüfung bleibt: Typhon, der Vater der Ungeheuer, erhebt sich im Gipfel der Stürme. Besiege ihn, und du wirst zum Blitzadler!', fn: () => setZeus(5) },
  ]);
}

// ---------- Keraunos: Schlagen & Werfen ----------
function setWeapon(w) {
  if (w === 'blitz' && !player.gear.includes('keraunos')) { toast('Den Keraunos gibt dir nur Zeus.'); return; }
  player.bowMode = w === 'bow'; player.blitzMode = w === 'blitz';
  document.body.classList.toggle('bow', player.bowMode || player.blitzMode);
  refreshHeroLook();
  toast(w === 'bow' ? '🏹 Bogen ausgerüstet – zielen und Angriff drücken' : w === 'blitz' ? '⚡ Keraunos ausgerüstet' : '⚔ Schwert ausgerüstet');
}
function cycleWeapon() {
  if (player.sailing || player.bird) return;
  const has = player.gear.includes('keraunos');
  if (!player.bowMode && !player.blitzMode) player.bowMode = true;
  else if (player.bowMode) { player.bowMode = false; player.blitzMode = has; }
  else player.blitzMode = false;
  document.body.classList.toggle('bow', player.bowMode || player.blitzMode);
  refreshHeroLook();
  toast(player.bowMode ? '🏹 Bogen bereit' : player.blitzMode ? '⚡ Keraunos bereit – Angriff = Blitzschlag, V = Blitz werfen' : '⚔ Schwert gezogen');
}
function blitzStrike() {
  if (player.atkCd > 0) return;
  player.atkCd = 0.65; player.atkAnim = 1; sfx('zap');
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  let tgt = null, best = 4.6;
  for (const e of enemies) { if (e.dead) continue; const dx = e.x - player.pos.x, dz = e.z - player.pos.z, d = Math.hypot(dx, dz) - (e.def.hitR || 0.3); if (d < best && (d < 1 || (dx * fx + dz * fz) / Math.hypot(dx, dz) > -0.1)) { best = d; tgt = e; } }
  if (!tgt) { makeBolt(player.pos.x + fx * 3, player.pos.z + fz * 3); return; }
  player.yaw = Math.atan2(tgt.x - player.pos.x, tgt.z - player.pos.z);
  const base = playerDamage() * 1.6 + 15;
  damageEnemy(tgt, base * rr(0.9, 1.1), rand() < 0.2); makeBolt(tgt.x, tgt.z);
  let from = tgt, hit = [tgt];
  for (let c = 0; c < 2; c++) {
    let nx = null, nd = 9;
    for (const e of enemies) { if (e.dead || hit.includes(e)) continue; const d = Math.hypot(e.x - from.x, e.z - from.z); if (d < nd) { nd = d; nx = e; } }
    if (!nx) break;
    boltLine(from, nx); damageEnemy(nx, base * 0.55); hit.push(nx); from = nx;
  }
}
function boltLine(a, b) {
  const pts = [], n = 8;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new V3(lerp(a.x, b.x, t) + (i % n ? rr(-0.6, 0.6) : 0), lerp(a.y + 1.5, b.y + 1.5, t) + (i % n ? rr(-0.6, 0.6) : 0), lerp(a.z, b.z, t) + (i % n ? rr(-0.6, 0.6) : 0))); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, fog: false }));
  scene.add(line); bolts.push({ line, t: 0.35 });
}
function throwBlitz(fromBird) {
  if (!player.gear.includes('keraunos') && !fromBird) { toast('Diese Macht gewährt nur Zeus. (Prüfungen des Zeus bei Hermes in Olympia)'); return; }
  if ((player.blitzCd || 0) > 0) { if (!fromBird) toast('Der Blitz lädt … (' + player.blitzCd.toFixed(1) + ' s)'); return; }
  player.blitzCd = fromBird ? 0.8 : 2.2; player.atkAnim = 1; sfx('zap');
  camera.getWorldDirection(_cdir);
  const o = new V3(player.pos.x, player.pos.y + (player.bird ? 0.5 : 1.8), player.pos.z);
  let target = camera.position.clone().addScaledVector(_cdir, 90), best = 0.1;
  for (const e of enemies) { if (e.dead) continue; const c = new V3(e.x, e.y + (e.def.top || 2) * 0.5, e.z), v = c.clone().sub(camera.position); if (v.length() > 100) continue; const ang = Math.acos(clamp(v.normalize().dot(_cdir), -1, 1)); if (ang < best) { best = ang; target = c; } }
  const vel = target.sub(o).normalize().multiplyScalar(80);
  if (!player.bird) player.yaw = Math.atan2(vel.x, vel.z);
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), lam(0xfff6a0, 0xffe040)); m.position.set(i % 2 ? 0.12 : -0.12, 0, -0.5 + i * 0.5); m.rotation.y = i % 2 ? 0.5 : -0.5; g.add(m); }
  g.position.copy(o); scene.add(g);
  arrows.push({ g, vel, t: 2, stuck: 0, dmg: 0, blitz: true });
}
function blitzExplode(p) {
  makeBolt(p.x, p.z); flash = Math.max(flash, 0.5);
  const dmg = 70 + playerDamage() * 0.8;
  for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < 6.5 + (e.def.hitR || 0)) { damageEnemy(e, dmg * (1 - d / 10)); if (!e.def.boss && !e.dead) e.stunT = 1.2; } }
}

// ---------- Blitzadler ----------
let birdM = null;
function makeBird() {
  const g = new THREE.Group(), glow = lam(0xbfe0ff, 0x3a7aff), gold = lam(0xffd24a, 0xa07000);
  const add = (geo, mat, x, y, z, p = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); return m; };
  add(new THREE.SphereGeometry(0.7, 12, 8), glow, 0, 0, 0).scale.set(0.8, 0.7, 1.6);
  add(new THREE.SphereGeometry(0.4, 10, 8), glow, 0, 0.35, 1.1);
  add(new THREE.ConeGeometry(0.14, 0.45, 6), gold, 0, 0.3, 1.55).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 6, 4), lam(0xffffff, 0xffffff), s * 0.18, 0.45, 1.4);
  const tail = add(new THREE.BoxGeometry(1.2, 0.08, 1.0), glow, 0, 0, -1.4); tail.rotation.x = 0.1;
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.45, 0.15, 0.1); g.add(w);
    add(new THREE.BoxGeometry(2.6, 0.08, 1.3), glow, s * 1.3, 0, 0, w);
    add(new THREE.BoxGeometry(1.8, 0.06, 0.9), lam(0xffffff, 0x6aa0ff), s * 3.4, 0, -0.2, w);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.06, 0.06, 1.2), gold, s * (1 + k * 1.1), 0.05, -0.1, w);
    wings.push(w);
  }
  return { root: g, wings };
}
function toggleBird() {
  if (player.form && !player.bird) setForm(null);
  if (!player.gear.includes('blitzvogel')) { toast('Nur wer Typhon besiegt, erhält die Gestalt des Blitzadlers.'); return; }
  if (curD) { toast('Unter der Erde kannst du dich nicht verwandeln.'); return; }
  if (player.bird) {
    const floor = Math.max(groundAt(player.pos.x, player.pos.z), -0.5);
    if (player.pos.y - floor > 6) { toast('Flieg tiefer, um dich zurückzuverwandeln (C).'); return; }
    player.bird = false; birdM.root.visible = false; hero.root.visible = true; player.vy = 0; flash = 0.6; sfx('zap'); return;
  }
  if (player.mounted) dismount(); if (player.flying) stopFlying(true); if (player.sailing) return;
  player.bird = true; birdM.root.visible = true; hero.root.visible = false; player.pos.y += 2; flash = 1; sfx('zap'); makeBolt(player.pos.x, player.pos.z);
  toast('⚡ Blitzadler! Leertaste steigen · C sinken · Angriff = Blitze · U zurückverwandeln', 'gold');
}
function updateBird(dt, moving, sprint, canMove) {
  const P = player.pos, t = clock.elapsedTime, sp = sprint ? 120 : 60;
  if (moving) { P.x += _mv.x * sp * dt; P.z += _mv.z * sp * dt; player.yaw = angLerp(player.yaw, Math.atan2(_mv.x, _mv.z), Math.min(1, dt * 5)); }
  if (canMove && keys.Space) P.y += 25 * dt; if (canMove && (keys.KeyC || keys.ControlLeft)) P.y -= 30 * dt;
  P.x = clamp(P.x, -HALF + 10, HALF - 10); P.z = clamp(P.z, -HALF + 10, HALF - 10);
  const floor = Math.max(groundAt(P.x, P.z), -0.5) + 1.2; if (P.y < floor) P.y = floor; if (P.y > 420) P.y = 420;
  player.speedNow = moving ? sp : 0; player.swimming = false; player.vy = 0;
  if (!player.dead && t - player.lastHurt > 4 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + dt * 8);
  birdM.root.position.set(P.x, P.y, P.z); birdM.root.rotation.set(moving ? 0.15 : 0, player.yaw, Math.sin(t * 1.3) * 0.1);
  const f = Math.sin(t * (moving ? 7 : 3.5)) * 0.6; birdM.wings[0].rotation.z = f; birdM.wings[1].rotation.z = -f;
  pegasus.root.visible = false; hippo.root.visible = false; ship.root.visible = false; horse.root.visible = false;
  if (Math.random() < dt * 3) { const sx = P.x + rr(-3, 3), sz = P.z + rr(-3, 3); boltLine({ x: P.x, y: P.y - 1.5, z: P.z }, { x: sx, y: P.y - 3, z: sz }); }
}

// ---------- Typhons Sturmangriff ----------
const STRIKES = [];
function stormStrike(e) {
  const P = player.pos;
  for (let i = 0; i < 3; i++) {
    const x = P.x + (i ? rr(-7, 7) : 0), z = P.z + (i ? rr(-7, 7) : 0);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 28), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, groundAt(x, z) + 0.1, z); scene.add(ring);
    STRIKES.push({ x, z, t: 1.3, ring, dmg: e.def.dmg * 1.3 });
  }
  floatText(e.x, e.y + 9.5, e.z, 'STURM!', '#9ad0ff', true);
}
function updateStrikes(dt) {
  for (let i = STRIKES.length - 1; i >= 0; i--) {
    const s = STRIKES[i]; s.t -= dt; s.ring.material.opacity = 0.4 + Math.sin(s.t * 20) * 0.4;
    if (s.t <= 0) { scene.remove(s.ring); STRIKES.splice(i, 1); makeBolt(s.x, s.z); sfx('zap'); if (Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < 3.4) hurtPlayer(s.dmg, { x: s.x, z: s.z }); }
  }
}

// ============================================================
// Orte der Antike: Troja, Koloss, Artemision, Mausoleum, Marathon, Thermopylen, Dodona, Delos …
// Besondere Figuren: Odysseus, Erfinder Heron, Herr Mara, UFO; Sirenenfelsen mit Minispiel
// ============================================================
function buildPolis(key, n, opt = {}) {
  const L = LOCS[key];
  for (let i = 0; i < n; i++) { const a = rand() * 6.28, r = rr(12, L.r * 0.9); house(L.x + Math.cos(a) * r, L.z + Math.sin(a) * r, Math.floor(rand() * 4) * Math.PI / 2, rr(5, 7), rr(5, 7), rr(3.4, 4.5), opt); }
}
function woodenHorse(x, z, rot, s = 1) {
  const f = new Frame(x, z, rot), w = lam(0x8a5a30), d = lam(0x5a3a1e);
  reserve(x, z, 9 * s);
  f.box(d, 0, 0, 0, 5 * s, 0.6 * s, 11 * s, true);
  for (const [wx, wz] of [[-2.6, -4], [2.6, -4], [-2.6, 4], [2.6, 4]]) f.put(G.cyl, d, wx * s, 0.7 * s, wz * s, 0, 0, Math.PI / 2, 1.4 * s, 0.5 * s, 1.4 * s);
  for (const [lx, lz] of [[-1.4, -3.4], [1.4, -3.4], [-1.4, 3.4], [1.4, 3.4]]) f.box(w, lx * s, 0.6 * s, lz * s, 1.2 * s, 5 * s, 1.2 * s);
  f.box(w, 0, 5.4 * s, 0, 4.2 * s, 4 * s, 10 * s, true, 9.4 * s);
  f.put(G.box, w, 0, 10 * s, 5.6 * s, -0.6, 0, 0, 2.4 * s, 6 * s, 2.6 * s);
  f.box(w, 0, 12.2 * s, 8.4 * s, 2.2 * s, 2.2 * s, 4.2 * s);
  f.box(d, 0, 12.6 * s, 6.6 * s, 0.6 * s, 3 * s, 3.2 * s);
  for (const e of [-1, 1]) f.box(d, e * 0.6 * s, 14.4 * s, 7.4 * s, 0.35 * s, 1 * s, 0.4 * s);
  f.put(G.box, d, 0, 8 * s, -5.6 * s, 0.5, 0, 0, 0.7 * s, 5 * s, 0.7 * s);
  f.box(d, 2.15 * s, 6 * s, 0, 0.1 * s, 1.4 * s, 1.6 * s);
}
function buildAncientWorld() {
  // Troja: Mauern, Türme, Skäisches Tor und das Trojanische Pferd
  const T = LOCS.troja, wm = lam(0xb8a07a);
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2; if (Math.abs(a - Math.PI * 0.5) < 0.1) continue;
    const f = new Frame(T.x + Math.cos(a) * 46, T.z + Math.sin(a) * 46, -a);
    f.box(wm, 0, -1, 0, 1.6, 8, 6.4, true);
    if (i % 6 === 0) { f.box(wm, 0, -1, 0, 4.5, 11, 4.5, true); f.box(lam(0x9a8460), 0, 10, 0, 5, 0.6, 5); }
  }
  temple(new Frame(T.x, T.z - 22, 0), 9, 14, 4, 6, 5, { tier: 1 });
  buildPolis('troja', 12, { wall: lam(0xe0cfa8), roof: M.roof2 });
  woodenHorse(T.x, T.z + 60, 0, 1);
  SPOTS.trojanHorse = [T.x, T.z + 60];
  addNPC('Kassandra', T.x + 6, T.z + 50, { tunic: 0x6a2a6a, pants: 0x3a1a3a, veil: 0xf4f0e6, skin: 0xe0b08a, wreath: true }, () => talk([{ who: 'Kassandra', text: 'Holt das Pferd nicht in die Stadt! Fürchtet die Griechen, auch wenn sie Geschenke bringen! … Ach, mir glaubt ja doch niemand.' }]));
  addNPC('Wache von Troja', T.x - 6, T.z + 48, { tunic: 0x7a4a1a, armor: 0xb98d3a, helmet: true, crest: 0x1a4a8a, shield: true, weapon: 'spear', pants: 0x3a2a1a }, () => talk([{ who: 'Wache', text: 'Die Griechen sind abgezogen und haben uns dieses schöne Pferd geschenkt. Was soll da schon schiefgehen?' }]));
  // Rhodos: Koloss am Hafen
  const R = LOCS.rhodos;
  buildPolis('rhodos', 10);
  { const s = findShore(R.x, R.z, ...toPiraeus(R), 200); const [cx, cz] = s ? s.land : [R.x + 20, R.z]; const f = new Frame(cx, cz, Math.atan2(R.x - cx, R.z - cz) + Math.PI);
    f.box(M.marble2, 0, -2, 0, 7, 6, 7, true);
    const b = lam(0xb98d3a, 0x201000);
    for (const sx of [-1, 1]) f.put(G.cyl8, b, sx * 1.6, 4 + 6, 0, 0, 0, sx * 0.12, 1.3, 12, 1.3);
    f.put(G.cyl, b, 0, 4 + 14, 0, 0, 0, 0, 4.2, 6, 2.6); f.put(G.sphere, b, 0, 4 + 19, 0, 0, 0, 0, 2.6, 2.8, 2.6);
    f.put(G.cyl8, b, 2.6, 4 + 21, 0, 0, 0, -0.3, 0.9, 7, 0.9); f.put(G.cone, lam(0xff9a2a, 0xff6a00), 3.6, 4 + 25.5, 0, 0, 0, 0, 1.4, 2.6, 1.4);
    f.put(G.cyl8, b, -2.6, 4 + 13, 0, 0, 0, 0.4, 0.8, 6, 0.8);
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; f.put(G.cone, b, Math.cos(a) * 1.4, 4 + 21.6, Math.sin(a) * 1.4, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6, 0.5, 1.6, 0.5); }
    SPOTS.koloss = [cx, cz]; }
  // Ephesos: Tempel der Artemis (Artemision)
  const E = LOCS.ephesos; temple(new Frame(E.x, E.z - 10, 0), 18, 34, 8, 14, 9, { tier: 1, friezeMat: lam(0xc9bda5) }); buildPolis('ephesos', 9);
  // Halikarnassos: Mausoleum
  { const H2 = LOCS.halikarnassos, f = new Frame(H2.x, H2.z - 6, 0); reserve(f.x, f.z, 14);
    f.box(M.marble2, 0, -2, 0, 16, 9, 16, true); f.platform(0, 0, 16, 16, 7);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; f.put(G.col, M.marble, Math.cos(a) * 6.2, 7 + 3, Math.sin(a) * 6.2, 0, 0, 0, 1, 6, 1); }
    for (let k = 0; k < 6; k++) f.box(M.marble, 0, 13 + k * 0.8, 0, 14 - k * 2, 0.8, 14 - k * 2);
    statue(H2.x, H2.z - 6, 0, 1.2, M.bronze, f.y + 17.8); buildPolis('halikarnassos', 7); }
  // Marathon: Grabhügel und Gedenkstein
  { const Mr = LOCS.marathon, f = new Frame(Mr.x, Mr.z, 0); f.put(G.sphere, lam(0x7a8a4a), 0, -2, 0, 0, 0, 0, 22, 12, 22); circleCol(Mr.x, Mr.z, 9); f.box(M.marble, 13, 0, 0, 1.2, 3, 0.6, true); reserve(Mr.x, Mr.z, 14);
    interactables.push({ pos: () => new V3(Mr.x + 13, heightAt(Mr.x + 13, Mr.z), Mr.z), label: 'Gedenkstein lesen', r: 3, fn: () => talk([{ who: 'Gedenkstein von Marathon', text: 'Hier besiegten 490 v. Chr. die Athener die Perser. Der Läufer Pheidippides rannte bis nach Athen, rief „Wir haben gesiegt!“ – und brach zusammen. Daher kommt der Marathonlauf.' }]) }); }
  // Thermopylen: Leonidas-Denkmal und Mauer
  { const Th = LOCS.thermopylen; statue(Th.x, Th.z, 0, 2.2, M.bronze); const f = new Frame(Th.x, Th.z + 10, 0); f.box(M.stone2, 0, -0.5, 0, 20, 2.4, 1.2, true);
    interactables.push({ pos: () => new V3(Th.x, heightAt(Th.x, Th.z), Th.z + 3), label: 'Inschrift lesen', r: 3.5, fn: () => talk([{ who: 'Inschrift', text: '„Wanderer, kommst du nach Sparta, verkündige dorten, du habest uns hier liegen gesehn, wie das Gesetz es befahl.“ – Für die 300 Spartaner des Leonidas, 480 v. Chr.' }]) }); }
  // Dodona: heilige Eiche des Zeus
  { const D = LOCS.dodona, f = new Frame(D.x, D.z, 0); reserve(D.x, D.z, 10);
    f.put(G.cyl, lam(0x5a4028), 0, 4, 0, 0, 0, 0, 2.2, 8, 2.2); circleCol(D.x, D.z, 1.3);
    for (const [dx, dy, dz, sc] of [[0, 11, 0, 9], [3, 9.5, 2, 6], [-3, 9.5, -2, 6], [2, 10, -3, 5.5]]) f.put(G.sphere, lam(0x4a6a2a), dx, dy, dz, 0, 0, 0, sc, sc * 0.75, sc);
    temple(new Frame(D.x + 18, D.z + 6, Math.PI / 2), 6, 9, 3, 4, 4, { tier: 1, guards: false });
    addNPC('Priesterin von Dodona', D.x - 3, D.z + 5, { tunic: 0xf4f0e6, pants: 0xe8e0cc, veil: 0xf4f0e6, wreath: true }, () => talk([{ who: 'Priesterin', text: 'Hör, wie die Blätter der heiligen Eiche rauschen … Zeus spricht durch sie. Er sagt: „Wer alle Prüfungen besteht, wird zum Blitz.“' }])); }
  // Delos: Löwenterrasse und Apollontempel
  { const Dl = LOCS.delos; temple(new Frame(Dl.x, Dl.z - 8, 0), 7, 12, 4, 6, 4.6, { tier: 1, guards: false });
    for (let i = 0; i < 5; i++) { const f = new Frame(Dl.x - 10 + i * 5, Dl.z + 10, 0); f.box(M.marble2, 0, 0, 0, 1.6, 1, 2.6, true); f.box(M.marble, 0, 1, 0, 1, 1.3, 2.2); f.put(G.sphere, M.marble, 0, 2.6, 1, 0, 0, 0, 1, 1.1, 1); } }
  // weitere Poleis
  for (const [k, n] of [['milet', 7], ['samos', 6], ['kos', 6], ['chios', 5], ['stagira', 5], ['korkyra', 7]]) { buildPolis(k, n); const L = LOCS[k]; temple(new Frame(L.x + 4, L.z - 14, 0), 7, 11, 4, 5, 4.5, { tier: 1, guards: false }); }
  // Athen: Werkstatt des Erfinders mit Holzauto
  { const A = LOCS.athen, sp = findSpotNear(A, 30, 58, 6) || [30, 30]; reserve(sp[0], sp[1], 6);
    const f = new Frame(sp[0], sp[1], Math.round(Math.atan2(-sp[0], -sp[1]) / (Math.PI / 2)) * Math.PI / 2);
    for (const [px, pz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) f.box(M.wood, px, 0, pz, 0.3, 3.2, 0.3, true);
    f.put(G.prism, M.terracotta, 0, 3.2, 0, 0, Math.PI / 2, 0, 6, 1.2, 8);
    f.box(M.wood, -2, 0, -2, 3, 1, 1, true);
    const car = lam(0xa0703a); f.box(car, 0.8, 0.7, 0.5, 2.2, 0.6, 3.6); f.box(car, 0.8, 1.3, -0.2, 1.8, 0.6, 1.2);
    for (const [wx, wz] of [[-0.35, -0.9], [1.95, -0.9], [-0.35, 1.9], [1.95, 1.9]]) f.put(G.cyl, M.darkwood, wx, 0.55, wz, 0, 0, Math.PI / 2, 1.1, 0.25, 1.1);
    f.put(G.cyl, M.darkwood, 0.8, 1.9, 0.8, 0.6, 0, 0, 0.7, 0.08, 0.7);
    const [nx, nz] = f.w(-1.5, 1.8);
    addNPC('Erfinder Heron', nx, nz, { tunic: 0x6a5a3a, pants: 0x3a3024, beard: true, hair: 0x8a7a6a, belt: 0x2a1a0e }, () => talk([
      { who: 'Erfinder Heron', text: 'Psst, schau dir das an! Ich baue ein „Auto“ – auf Griechisch heißt das „selbst“! Ein Wagen, der SELBST fährt. Ganz ohne Pferd!' },
      { who: 'Erfinder Heron', text: 'Glaub mir: Eines Tages wird jeder so einen fahren. Es fehlt nur noch … äh … irgendetwas, das ihn antreibt. Dampf vielleicht?' },
      { who: 'Erfinder Heron', text: 'Die anderen lachen mich aus. Aber wart\'s nur ab – in zweitausend Jahren reden alle vom Auto!' }])); }
  // Athen: Herr Mara
  { const A = LOCS.athen, sp = findSpotNear(A, 18, 45, 2) || [8, 20];
    addNPC('Herr Mara', sp[0], sp[1], { tunic: 0x3a6a4a, pants: 0x2a3a2a, beard: true, hair: 0x2a1a0e }, () => talk([{ who: 'Herr Mara', text: pick([
      'Chaire! Ich bin Herr Mara. Später will ich Lehrer werden – oder Soldat. Ich kann mich einfach nicht entscheiden!',
      'Als Lehrer könnte ich den Kindern das Alphabet beibringen: Alpha, Beta, Gamma … Aber als Soldat bekäme ich einen glänzenden Helm!',
      'Lehrer oder Soldat … Sokrates sagt, ich soll mich selbst erkennen. Leichter gesagt als getan!',
      'Wenn ich Lehrer werde, gibt es bei mir jeden Tag Mathe. Und wenn ich Soldat werde … auch. Man muss ja die Pfeile zählen.']) }]), 6); }
  // Odysseus am Strand mit gestrandetem Schiff
  { const O = LOCS.olympia, s = findShore(O.x, O.z + 60, -1, 0.1, 260);
    if (s) { const [lx, lz] = s.land, [dx, dz] = s.dir, rot = Math.atan2(dx, dz);
      const f = new Frame(lx + dx * 4, lz + dz * 4, rot + 0.6, heightAt(lx, lz) - 0.6);
      f.put(G.box, M.darkwood, 0, 0.4, 0, 0, 0, 0.35, 3.2, 1.6, 13); f.put(G.cyl8, M.wood, 0, 3, 1, 0.5, 0, 0.35, 0.25, 6, 0.25);
      f.put(G.box, lam(0xd8ccb0), 1.5, 2.2, 1.5, 0.3, 0.4, 0.9, 3.5, 0.06, 2.8); circleCol(f.x, f.z, 3);
      SPOTS.odysseus = [lx - dx * 3, lz - dz * 3];
      addNPC('Odysseus (angeblich)', lx - dx * 3, lz - dz * 3, { tunic: 0x8a7a5a, pants: 0x4a3a2a, beard: true, hair: 0x4a3a2a, beardCol: 0x6a5a4a, weapon: 'staff' }, () => talk([
        { who: 'Odysseus', text: 'Fremder! Weißt du, wer ich bin? Ich bin ODYSSEUS! Der Listenreiche! Ich habe Troja besiegt – mit einem hölzernen Pferd!' },
        { who: 'Odysseus', text: 'Seit zehn Jahren irre ich übers Meer: Zyklopen, Sirenen, eine Zauberin, die Männer in Schweine verwandelt … und jetzt ist auch noch mein Schiff gestrandet.' },
        { who: 'Odysseus', text: 'Ithaka liegt da drüben im Westen. Meine Penelope wartet auf mich! … Glaube ich. Hoffe ich. Hast du zufällig ein Schiff?', fn: () => { if (!S.odyssey) { S.odyssey = true; addMoney(25); toast('Odysseus schenkt dir eine Münze „für die Geschichte“.'); } } }])); } }
  // UFO am Strand (südlich von Kreta)
  { const K = LOCS.kreta, s = findShore(K.x - 60, K.z + 20, 0, 1, 260);
    if (s) { const [ux, uz] = s.land; const y = heightAt(ux, uz); reserve(ux, uz, 8);
      const g = new THREE.Group(); g.position.set(ux, y + 0.6, uz); g.rotation.set(0.25, rand() * 6, 0.12); scene.add(g);
      const metal = new THREE.MeshPhongMaterial({ color: 0xc8ccd4, specular: 0xffffff, shininess: 90 });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.2, 0.9, 32), metal); g.add(disc);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 3.5, 0.6, 32), metal); rim.position.y = -0.7; g.add(rim);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 12, 0, 6.3, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.55, emissive: 0x104050 })); dome.position.y = 0.45; g.add(dome);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lam(i % 2 ? 0x7aff7a : 0xff5a5a, i % 2 ? 0x3aff3a : 0xff2a2a)); l.position.set(Math.cos(a) * 4.9, -0.1, Math.sin(a) * 4.9); g.add(l); fires.push(l); }
      circleCol(ux, uz, 5);
      interactables.push({ pos: () => new V3(ux, y, uz), label: 'Das seltsame Metallding untersuchen', r: 7, fn: () => talk([
        { who: '???', text: 'Ein riesiger glänzender Teller aus Metall liegt halb im Sand. Er summt leise. Durch die Glaskuppel siehst du blinkende Lichter.' },
        { who: 'Kleines grünes Wesen', text: 'Bliep! Bloop! … Ähm, hallo. Wir wollten eigentlich nur die Akropolis fotografieren. Dann sind wir hier gelandet. Unsanft.' },
        { who: 'Kleines grünes Wesen', text: 'Bitte erzähl Zeus nichts davon. Hier, nimm diese komischen Münzen, die hier überall herumliegen.', fn: () => { if (!S.ufo) { S.ufo = true; addMoney(77); } else toast('Das Wesen winkt dir zu. Bliep.'); } }]) });
      SPOTS.ufo = [ux, uz]; } }
}
function toPiraeus(L) { return [LOCS.piraeus.x - L.x, LOCS.piraeus.z - L.z]; }

// ---------- Sirenenfelsen & Minispiel ----------
const SIREN_ROCKS = [];
let SIRENMG = null;
function buildSirenRocks() {
  const C = LOCS.sirenen;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.3; let x = C.x + Math.cos(a) * 85, z = C.z + Math.sin(a) * 75;
    if (heightAt(x, z) > -3) continue;
    const top = 3.2;
    addStatic(G.rock, lam(0x6a645a), x, 0.8, z, rand(), rand(), 0, 4.5, 4.5, 4.5); addPlatform(x - 3, x + 3, z - 3, z + 3, top); circleCol(x, z, 3.5);
    SIREN_ROCKS.push({ x, z });
    addNPC('Sirene', x, z, { tunic: 0xbfe6f0, pants: 0x8fbcc8, veil: 0xe0f4ff, skin: 0xe8c8b0, wreath: true }, () => talk([{ who: 'Sirene', text: pick(['♪ Komm zu uns, Held … nur ein kleines Stück näher … ♪', '♪ Lass das Ruder los … hör uns zu … für immer … ♪', '♪ Odysseus hat sich die Ohren nicht zugehalten, er ließ sich nur festbinden … ♪']) }]));
  }
}
function updateSirens(dt) {
  const C = LOCS.sirenen, P = player.pos, d = Math.hypot(P.x - C.x, P.z - C.z), hud = $('sirenHud');
  if (!SIRENMG) {
    if (hud.style.display !== 'none') hud.style.display = 'none';
    const exposed = player.form !== 'siren' && (player.sailing || player.swimming) && d < 130 && d > 25 && clock.elapsedTime > (player.sirenSafe || 0) && !curD;
    if (exposed) { SIRENMG = { t: 0, res: 35 }; for (const k in keys) keys[k] = false; sfx('quest'); }
    return;
  }
  SIRENMG.t += dt; SIRENMG.res -= dt * 16;
  if (d > 4) { const pull = 6 * dt; P.x += (C.x - P.x) / d * pull; P.z += (C.z - P.z) / d * pull; if (player.sailing) player.shipSpeed = 0; }
  hud.style.display = 'block';
  const f = Math.round(clamp(SIRENMG.res, 0, 100) / 5);
  hud.innerHTML = '<b>♪ Die Sirenen singen! ♪</b><br>Halte dir die Ohren zu – tippe schnell auf ⚔ (oder Leertaste)!<br>' + '█'.repeat(f) + '░'.repeat(20 - f) + '<br><small>' + Math.max(0, 10 - SIRENMG.t).toFixed(1) + ' s</small>';
  if (SIRENMG.res >= 100) { SIRENMG = null; player.sirenSafe = clock.elapsedTime + 120; banner('Widerstanden!', 'Du hast dem Gesang der Sirenen getrotzt – für eine Weile bist du sicher.'); sfx('quest'); }
  else if (SIRENMG.res <= 0 || SIRENMG.t > 10) {
    SIRENMG = null; player.sirenSafe = clock.elapsedTime + 45;
    const D = DOCKS.sirenen;
    if (player.sailing) { player.sailing = false; ship.root.visible = false; }
    if (D) player.pos.set(D.land[0], groundAt(D.land[0], D.land[1]) + 0.5, D.land[1]);
    hurtPlayer(25, { x: C.x, z: C.z });
    banner('Betört von den Sirenen!', 'Dein Schiff ist an den Felsen zerschellt – du wurdest auf die Insel gespült.');
  }
}
function sirenTap() { if (SIRENMG) { SIRENMG.res = Math.min(100, SIRENMG.res + 8); sfx('block'); return true; } return false; }

// ---------- Begehbare Tavernen ----------
const FOODS = [
  { name: 'Gerstenbrot mit Oliven', cost: 4, hp: 20, text: 'Knuspriges Gerstenbrot (Maza) mit schwarzen Oliven.' },
  { name: 'Linsensuppe (Phakē)', cost: 6, hp: 30, text: 'Eine dampfende Schale Linsensuppe – das Leibgericht der Philosophen.' },
  { name: 'Ziegenkäse mit Honig', cost: 8, hp: 40, text: 'Würziger Ziegenkäse, übergossen mit Thymianhonig vom Hymettos.' },
  { name: 'Feigen und Datteln', cost: 5, hp: 25, st: true, text: 'Süße Feigen – sie geben dir neue Ausdauer!' },
  { name: 'Gegrillter Fisch', cost: 12, hp: 60, text: 'Frischer Thunfisch vom Grill, mit Salz und Oregano.' },
  { name: 'Kykeon (Gerstentrank)', cost: 9, hp: 10, regen: true, text: 'Ein Trank aus Gerste, Wasser und Minze. Du regenerierst eine Weile schneller.' },
  { name: 'Krasis (Wein mit Wasser)', cost: 3, hp: 5, st: true, text: 'Verdünnter Wein, wie es sich gehört. Pur trinken nur Barbaren!' },
  { name: 'Schwarze Suppe (spartanisch)', cost: 10, hp: 45, power: true, sparta: true, text: 'Blutsuppe mit Essig. Schmeckt furchtbar – aber du fühlst dich stark wie ein Spartaner! (+20 % Schaden für 60 s)' },
];
function talkFood(tv) {
  const list = FOODS.filter(f => !f.sparta || tv.loc === 'sparta');
  talk([{ who: tv.keeper, text: 'Was darf es sein? Alles frisch – so wie man es in Hellas isst!', opts: list.map(f => ({ label: f.name + ' – ' + f.cost + ' Dr', fn: () => {
    if (!spend(f.cost)) return;
    player.hp = Math.min(player.maxHp, player.hp + f.hp); if (f.st) player.stamina = 100;
    if (f.regen) player.regenUntil = clock.elapsedTime + 60; if (f.power) player.powerUntil = clock.elapsedTime + 60;
    sfx('drink'); floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, '+' + f.hp, '#7aff8a');
    talk([{ who: tv.keeper, text: f.text, fn: () => talkFood(tv) }]);
  } })).concat([{ label: 'Zurück', fn: () => talkTavern(tv) }]) }]);
}
function buildTavernHall(L, i, tv) {
  const sp = findSpotNear(L, 14, L.r * 1.2, 9); if (!sp) return false;
  const rot = Math.round(Math.atan2(L.x - sp[0], L.z - sp[1]) / (Math.PI / 2)) * Math.PI / 2;
  reserve(sp[0], sp[1], 9);
  const f = new Frame(sp[0], sp[1], rot);
  f.y = Math.max(f.y, heightAt(...f.w(-6, -5)), heightAt(...f.w(6, 5)), heightAt(...f.w(-6, 5)), heightAt(...f.w(6, -5)));
  const W = 12, D = 10, H = 4.6, wall = lam(0xd8c4a0);
  f.box(M.stone2, 0, -3, 0, W + 0.6, 3.2, D + 0.6); f.platform(0, 0, W, D, 0.2); f.box(M.wood, 0, 0, 0, W - 0.4, 0.2, D - 0.4);
  f.box(wall, 0, 0, -D / 2, W, H, 0.5, true); f.box(wall, -W / 2, 0, 0, 0.5, H, D, true); f.box(wall, W / 2, 0, 0, 0.5, H, D, true);
  f.box(wall, -3.6, 0, D / 2, W / 2 - 1.2, H, 0.5, true); f.box(wall, 3.6, 0, D / 2, W / 2 - 1.2, H, 0.5, true); f.box(wall, 0, 3, D / 2, 2.6, H - 3, 0.5);
  f.put(G.prism, M.roof2, 0, H, 0, 0, Math.PI / 2, 0, D + 0.8, 1.8, W + 0.8);
  f.box(M.wood, 0, H, 0, W, 0.15, D);
  f.box(M.wood, 1.8, 2.6, D / 2 + 0.3, 2.2, 0.9, 0.12); f.box(M.red, 1.8, 2.75, D / 2 + 0.38, 1.8, 0.55, 0.05);
  f.box(M.darkwood, 0, 0.2, -D / 2 + 2.4, 6, 1.1, 0.8, true);
  for (let k = 0; k < 4; k++) f.put(G.sphere, M.terracotta, -2.2 + k * 1.4, 1.6, -D / 2 + 2.4, 0, 0, 0, 0.35, 0.55, 0.35);
  for (const [tx, tz] of [[-3.5, 0.8], [3.5, 0.8], [-3.5, 3.2]]) { f.box(M.wood, tx, 0.2, tz, 1.6, 0.8, 1.1, true); for (const sx of [-1.2, 1.2]) f.box(M.darkwood, tx + sx, 0.2, tz, 0.5, 0.5, 0.5); f.put(G.sphere, M.terracotta, tx, 1.2, tz, 0, 0, 0, 0.2, 0.3, 0.2); }
  f.box(M.stone, W / 2 - 1.3, 0.2, -D / 2 + 1.3, 1.6, 0.5, 1.6, true);
  const [hx, hz] = f.w(W / 2 - 1.3, -D / 2 + 1.3); const fm = new THREE.Mesh(G.cone, M.fire); fm.position.set(hx, f.y + 1.2, hz); fm.scale.set(0.6, 0.8, 0.6); scene.add(fm); fires.push(fm);
  const [kx, kz] = f.w(0, -D / 2 + 1.2);
  const n = addNPC(tv.keeper, kx, kz, { tunic: 0x8a5a2a, pants: 0x3a2a1a, beard: i % 2 === 0, veil: i % 2 ? 0xc8b090 : null, hair: 0x3a2a1a }, () => talkTavern(tv));
  n.yaw = rot; tv.x = kx; tv.z = kz;
  const pts = [f.w(-W / 2, -D / 2), f.w(W / 2, D / 2)];
  tv.box = { minX: Math.min(pts[0][0], pts[1][0]), maxX: Math.max(pts[0][0], pts[1][0]), minZ: Math.min(pts[0][1], pts[1][1]), maxZ: Math.max(pts[0][1], pts[1][1]), y: f.y };
  return true;
}
function insideTavern(P) { for (const tv of TAVERNS) { const b = tv.box; if (b && P.x > b.minX && P.x < b.maxX && P.z > b.minZ && P.z < b.maxZ) return tv; } return null; }

// ============================================================
// Verwandlungen: Sirene (Wasser) & Kentaur (Land)
// ============================================================
GEAR.sirene = { name: 'Gestalt der Sirene', desc: 'J: Verwandle dich in eine Sirene – blitzschnell schwimmen, Angriff = betörender Gesang' };
GEAR.kentaur = { name: 'Gestalt des Kentauren', desc: 'K: Verwandle dich in einen Kentauren – rasend schnell an Land, starke Speerstöße' };
const LEGENDS = [['hades', 'Kerberos'], ['hephaistos', 'Talos'], ['poseidon', 'Skylla'], ['medusa', 'Medusa'], ['polyphem', 'Polyphem'], ['loewe', 'Nemeischer Löwe'], ['eber_boss', 'Kalydonischer Eber']];
const legendDone = (k) => (S.bossDead || []).includes(k) || (S.legends || []).includes(k);
const legendCount = () => LEGENDS.filter(([k]) => legendDone(k)).length;
function noteLegend(type) {
  if (!['loewe', 'eber_boss'].includes(type)) return;
  S.legends = S.legends || []; if (!S.legends.includes(type)) S.legends.push(type);
}
function checkLegends() {
  if (legendCount() === LEGENDS.length && !player.gear.includes('kentaur') && !S.legendHint) { S.legendHint = true; setTimeout(() => banner('Alle 7 Ungeheuer besiegt!', 'Chiron, der Kentaur am Pelion, möchte dich sprechen.'), 5000); save(); }
}
let sirenM = null, centM = null;
function makeSirenForm() {
  const h = makeHumanoid({ skin: 0xe8c8b0, tunic: 0x3aa0b0, pants: 0x2a7a8a, hair: 0x1a5a6a, veil: 0x8fe0f0, wreath: true, eyes: 0x7af0ff });
  h.legL.visible = false; h.legR.visible = false;
  const tailM = lam(0x2aa0a0, 0x063030), finM = lam(0x8fe0f0, 0x104040);
  const tail = new THREE.Group(); tail.position.set(0, 0.95, 0); h.root.add(tail);
  const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.6, 10), tailM); t1.rotation.x = Math.PI; t1.position.y = -0.7; tail.add(t1);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.5), finM); fin.position.set(0, -1.5, -0.1); tail.add(fin);
  h.tail = tail; return h;
}
function makeCentaurForm() {
  const L = heroLook();
  return makeCentaur(Object.assign({}, L, { body: 0x6b4325, weapon: 'spear', shield: false, cape: undefined }));
}
function setForm(form) {
  if (curD) { toast('Unter der Erde kannst du dich nicht verwandeln.'); return; }
  const key = form === 'siren' ? 'sirene' : 'kentaur';
  if (form && !player.gear.includes(key)) { toast(form === 'siren' ? 'Die Gestalt der Sirene schenkt Athene dem, der alle 64 Gelehrten überzeugt.' : 'Die Gestalt des Kentauren gibt Chiron nur dem, der alle 7 legendären Ungeheuer besiegt.'); return; }
  if (player.form === form) form = null;
  if (form) { if (player.mounted) dismount(); if (player.flying) stopFlying(true); if (player.bird) { player.bird = false; birdM.root.visible = false; } if (player.sailing) { toast('Erst an Land gehen!'); return; } }
  player.form = form;
  if (sirenM) sirenM.root.visible = form === 'siren';
  if (form === 'centaur') { if (centM) scene.remove(centM.root); centM = makeCentaurForm(); scene.add(centM.root); } else if (centM) centM.root.visible = false;
  hero.root.visible = !form;
  flash = 0.6; sfx('zap');
  if (form) toast(form === 'siren' ? '🧜 Sirene! Im Wasser bist du blitzschnell. Angriff = Gesang. J zurückverwandeln' : '♐ Kentaur! Rasend schnell an Land. K zurückverwandeln', 'gold');
}
let songCd = 0;
function sirenSong() {
  if (songCd > 0) return; songCd = 2; player.atkAnim = 1; sfx('quest');
  floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, '♪ ♫ ♪', '#8fe0ff', true);
  for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - player.pos.x, e.z - player.pos.z); if (d < 12) { damageEnemy(e, 28 + playerDamage() * 0.5); if (!e.def.boss && !e.dead) { e.stunT = 2.5; } } }
}
function updateForms(dt) {
  songCd = Math.max(0, songCd - dt);
  const P = player.pos, t = clock.elapsedTime;
  if (player.form === 'siren') {
    if (player.swimming) player.sirenSafe = t + 5;
    const y = player.swimming ? -1.35 + Math.sin(t * 2) * 0.1 : P.y;
    sirenM.root.position.set(P.x, y + (player.swimming ? -0.6 : 0), P.z); sirenM.root.rotation.y = player.yaw;
    sirenM.root.rotation.x = player.swimming && player.speedNow > 5 ? 0.9 : 0;
    animateHumanoid(sirenM, 0, dt, { attack: player.atkAnim });
    if (player.swimming && player.speedNow > 5) { sirenM.armL.rotation.x = -2.8; sirenM.armR.rotation.x = -2.8; }
    sirenM.tail.rotation.x = Math.sin(t * (player.speedNow > 5 ? 10 : 3)) * 0.35;
  } else if (player.form === 'centaur' && centM) {
    centM.root.visible = true; centM.root.position.set(P.x, P.y, P.z); centM.root.rotation.y = player.yaw;
    animateQuad(centM, player.speedNow * 0.5, dt);
    if (player.atkAnim > 0) { const k = 1 - player.atkAnim; centM.armR.rotation.x = k < 0.35 ? lerp(-0.3, -2.7, k / 0.35) : lerp(-2.7, -0.4, (k - 0.35) / 0.65); } else centM.armR.rotation.x = -0.5;
  }
}

// ============================================================
// Touch-Steuerung (iPad / Handy)
// ============================================================
const TOUCH = { on: false, jx: 0, jy: 0, sprint: false, btns: {} };
function isTouchDevice() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; }
// Kein Zoomen durch Doppeltippen oder Zwei-Finger-Geste
(function noZoom() {
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastEnd < 350 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') e.preventDefault(); lastEnd = now; }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (started && e.target.tagName !== 'INPUT' && !e.target.closest('#adminPanel, #heroPanel, #dialog, #bigmap, #menu'))) e.preventDefault(); }, { passive: false });
})();
function pressKey(code, down) { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code })); }
function setupTouch() {
  if (!isTouchDevice()) return;
  TOUCH.on = true;
  document.body.classList.add('touch');
  const ui = document.createElement('div'); ui.id = 'touchUI'; ui.style.display = 'none'; document.body.appendChild(ui);
  // Joystick
  const base = document.createElement('div'); base.id = 'joyBase'; const knob = document.createElement('div'); knob.id = 'joyKnob'; base.appendChild(knob); ui.appendChild(base);
  let joyId = null;
  const joyMove = (e) => {
    const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    TOUCH.jx = dx; TOUCH.jy = dy; TOUCH.sprint = l > 0.95;
    knob.style.transform = 'translate(' + dx * R * 0.6 + 'px,' + dy * R * 0.6 + 'px)';
  };
  base.addEventListener('pointerdown', (e) => { e.preventDefault(); joyId = e.pointerId; base.setPointerCapture(e.pointerId); joyMove(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; TOUCH.jx = TOUCH.jy = 0; TOUCH.sprint = false; knob.style.transform = ''; };
  base.addEventListener('pointerup', joyEnd); base.addEventListener('pointercancel', joyEnd);
  // Knöpfe: [id, Symbol, Klasse, gedrückt-Funktion, losgelassen-Funktion]
  const row = document.createElement('div'); row.id = 'tRow'; ui.appendChild(row);
  const mk = (id, label, cls, down, up, parent = ui) => {
    const b = document.createElement('button'); b.id = 'tb_' + id; b.className = 'tbtn ' + cls; b.innerHTML = label; parent.appendChild(b); TOUCH.btns[id] = b;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('down'); b.setPointerCapture(e.pointerId); down && down(); });
    const rel = (e) => { b.classList.remove('down'); up && up(); };
    b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  mk('atk', '⚔', 'big', () => { if (dialog) { if (!dialog.pages[dialog.i].opts) advanceDialog(); } else playerAttack(); });
  mk('blk', '🛡', 'mid', () => { mouse.right = true; }, () => { mouse.right = false; });
  mk('jmp', '⤒', 'mid', () => pressKey('Space', true), () => pressKey('Space', false));
  mk('use', 'E', 'mid gold', () => pressKey('KeyE', true), () => pressKey('KeyE', false));
  mk('dn', '⤓', 'mid', () => pressKey('KeyC', true), () => pressKey('KeyC', false));
  mk('wpn', '🏹', 'mid', () => pressKey('KeyX', true), () => pressKey('KeyX', false));
  const side = [['I', '🎒', 'KeyI'], ['V', '⚡↗', 'KeyV'], ['U', '🦅', 'KeyU'], ['J', '🧜', 'KeyJ'], ['K', '♐', 'KeyK'], ['R', '🐎', 'KeyR'], ['F', '✚', 'KeyF'], ['Q', '⚡', 'KeyQ'], ['T', '🪽', 'KeyT'], ['B', '⛵', 'KeyB'], ['G', '🐍', 'KeyG'], ['M', '🗺', 'KeyM'], ['C', '💬', null], ['P', '⚙', 'KeyP']];
  for (const [id, lab, code] of side) mk('s' + id, lab, 'small', () => { if (id === 'C') openChat(); else pressKey(code, true); }, () => { if (code) pressKey(code, false); }, ['R', 'M', 'U', 'J', 'K'].includes(id) ? ui : row);
  // Kamera: mit dem Finger über das Bild wischen, zwei Finger = Zoom
  const pts = new Map(); let pinch = 0;
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || !pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId);
    if (pts.size === 1) { camYaw -= (e.clientX - p.x) * 0.006; camPitch = clamp(camPitch + (e.clientY - p.y) * 0.005, -0.35, 1.25); }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) camZoom = clamp(camZoom * pinch / d, 0.45, 2.2); pinch = d; }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  // Gespräche per Antippen weiterklicken
  $('dialog').addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON' && dialog && !dialog.pages[dialog.i].opts) advanceDialog(); });
  $('bigmap').addEventListener('click', (e) => { if (mapOpen && e.target.id === 'bigmap') pressKey('KeyM', true); });
}
function updateTouchUI() {
  if (!TOUCH.on) return;
  const show = (id, v) => { v = !!v; const b = TOUCH.btns[id]; if (b && (b.style.display === 'none') === v) b.style.display = v ? '' : 'none'; };
  const fly = player.flying || player.adminFly || player.bird;
  show('dn', fly); show('sQ', player.blessed); show('sT', player.gear.includes('pegasus')); show('sG', player.gear.includes('pegasus'));
  show('sB', player.hasShip); show('sV', player.gear.includes('keraunos')); show('sU', player.gear.includes('blitzvogel')); show('sJ', player.gear.includes('sirene')); show('sK', player.gear.includes('kentaur')); show('sC', NET.online); show('sP', !!(NET.account && NET.account.admin));
  show('use', !!nearInter || !!dialog);
  const u = $('touchUI'); if (u) { const d = started && !mapOpen ? '' : 'none'; if (u.style.display !== d) u.style.display = d; }
}

let nearInter = null;
function interact() { if (nearInter && !player.dead) nearInter.fn(); }
function findInteractable() {
  let best = null, bd = 1e9;
  for (const it of interactables) {
    if (it.active && !it.active()) continue;
    const p = it.pos(); const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d < (it.r || 3.4) && Math.abs(p.y - player.pos.y) < 4 && d < bd) { bd = d; best = it; }
  }
  return best;
}

// ============================================================
// Update
// ============================================================
const clock = new THREE.Clock();
const _fwd = new V3(), _right = new V3(), _mv = new V3();
function updatePlayer(dt) {
  const P = player.pos;
  player.atkCd -= dt; player.atkAnim = Math.max(0, player.atkAnim - dt * 2.6); player.zapCd = Math.max(0, player.zapCd - dt); player.medCd = Math.max(0, player.medCd - dt);
  if (player.stoned > 0) player.stoned -= dt;
  const flt = player.stoned > 0 ? 'grayscale(1) brightness(0.8)' : ''; if (canvas.style.filter !== flt) canvas.style.filter = flt;
  _fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)); _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
  _mv.set(0, 0, 0);
  const canMove = !dialog && !player.dead && !mapOpen && !adminOpen && !heroOpen && !NET.chatOpen && !(player.stoned > 0) && !(OLY && OLY.lock);
  if (canMove) {
    if (keys.KeyW || keys.ArrowUp) _mv.add(_fwd);
    if (keys.KeyS || keys.ArrowDown) _mv.sub(_fwd);
    if (keys.KeyD || keys.ArrowRight) _mv.add(_right);
    if (keys.KeyA || keys.ArrowLeft) _mv.sub(_right);
    if (TOUCH.jx || TOUCH.jy) { _mv.addScaledVector(_right, TOUCH.jx); _mv.addScaledVector(_fwd, -TOUCH.jy); }
  }
  const wasBlocking = player.blocking;
  if (canMove && mouse.right && !(player.shieldTier > 0 || player.gear.includes('aigis')) && !player._noShieldT) { player._noShieldT = 1; toast('Du hast noch keinen Schild – der Schmied verkauft einen.'); setTimeout(() => player._noShieldT = 0, 4000); }
  player.blocking = canMove && mouse.right && !player.mounted && !player.swimming && (player.shieldTier > 0 || player.gear.includes('aigis'));
  if (player.blocking && !wasBlocking) player.blockStart = clock.elapsedTime;
  const moving = _mv.lengthSq() > 0;
  if (moving) _mv.normalize();
  const sprint = (keys.ShiftLeft || keys.ShiftRight || TOUCH.sprint) && moving && player.stamina > 1 && !player.blocking;
  player.blitzCd = Math.max(0, (player.blitzCd || 0) - dt);
  if (player.adminFly) { updateAdminFly(dt, moving, sprint, canMove); return; }
  if (player.bird) { updateBird(dt, moving, sprint, canMove); return; }
  if (player.sailing) { updateSailing(dt, moving, sprint); return; }
  if (player.flying) { updateFlying(dt, moving, sprint, canMove); return; }
  const hasHippo = player.gear.includes('poseidon');
  const HS = HORSES[player.horse || 'gaul'].speed;
  let speed = player.mounted ? (sprint ? HS[1] : HS[0]) : (sprint ? 12.5 : 7);
  if (player.swimming) speed = hasHippo ? (sprint ? 36 : 26) : (sprint ? 6 : 4);
  if (player.blocking) speed = 3.2;
  if (player.relics.includes('hermes')) speed *= 1.2;
  if (!player.mounted && !player.swimming) speed *= 1 + 0.04 * upLvl('spd');
  if (player.form === 'siren') speed = player.swimming ? (sprint ? 75 : 45) : 4;
  if (player.form === 'centaur') speed = player.swimming ? 5 : (sprint ? 55 : 34);
  const stMul = (player.relics.includes('herakles') ? 0.5 : 1) * (race ? 0.5 : 1) * (1 - 0.1 * upLvl('st'));
  if (sprint && !player.mounted && !player.form) player.stamina = Math.max(0, player.stamina - dt * 22 * stMul);
  else if (sprint && player.form) player.stamina = Math.max(0, player.stamina - dt * 6);
  else if (sprint && player.mounted) player.stamina = Math.max(0, player.stamina - dt * 10 * stMul);
  else player.stamina = Math.min(100, player.stamina + dt * 16);
  const ox = P.x, oz = P.z;
  if (moving) {
    P.x += _mv.x * speed * dt; P.z += _mv.z * speed * dt;
    if (player.atkAnim <= 0 && !player.blocking) player.yaw = angLerp(player.yaw, Math.atan2(_mv.x, _mv.z), Math.min(1, dt * 12));
  }
  if (player.blocking) player.yaw = angLerp(player.yaw, Math.atan2(_fwd.x, _fwd.z), Math.min(1, dt * 12));
  if (player.knock && player.knock.t > 0) { P.x += player.knock.x * dt; P.z += player.knock.z * dt; player.knock.t -= dt; }
  if (!curD) { P.x = clamp(P.x, -HALF + 10, HALF - 10); P.z = clamp(P.z, -HALF + 10, HALF - 10); }
  resolveCollisions(P, player.mounted ? 0.9 : 0.45);
  player.speedNow = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
  // Vertikal
  const g = groundAt(P.x, P.z);
  const SWIM_Y = -1.35;
  player.swimming = g < SWIM_Y - 0.05 && P.y <= SWIM_Y + 0.4;
  if (player.swimming) {
    if (player.mounted) { dismount(); toast('Dein Pferd schwimmt zurück ans Ufer.'); }
    P.y = lerp(P.y, SWIM_Y + Math.sin(clock.elapsedTime * 2) * 0.08, Math.min(1, dt * 6)); player.vy = 0; player.onGround = false;
    if (keys.Space) P.y = SWIM_Y + 0.15;
  } else {
    player.vy -= 32 * dt; P.y += player.vy * dt;
    if (P.y <= g) {
      // Stufen: kleine Höhen automatisch hochsteigen
      P.y = g; if (player.vy < -28) { hurtPlayer(Math.round((-player.vy - 28) * 2.5), { x: P.x, z: P.z }); }
      player.vy = 0; player.onGround = true;
    } else if (player.onGround && player.vy <= 0 && P.y - g < (player.mounted ? 1.4 : 0.8)) { P.y = g; player.vy = 0; }
    else player.onGround = false;
    if (canMove && keys.Space && player.onGround) { player.vy = player.mounted || player.form === 'centaur' ? 13 : 10.5; player.onGround = false; }
  }
  // Regeneration
  if (!player.dead && clock.elapsedTime - player.lastHurt > 6 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + dt * (clock.elapsedTime < (player.regenUntil || 0) ? 14 : 4));
  // Modell
  const hy = player.mounted ? 1.3 : 0;
  const riding = player.swimming && hasHippo;
  hero.root.position.set(P.x, P.y + hy + (riding ? 1.0 : player.swimming ? -0.85 : 0), P.z);
  hero.root.rotation.y = player.yaw;
  animateHumanoid(hero, player.mounted || riding ? 0 : player.speedNow, dt, { attack: player.atkAnim, block: player.blocking, sitting: player.mounted || riding, bow: player.bowMode });
  if (player.form) hero.root.visible = false;
  hippo.root.visible = riding; if (riding) { hippo.root.position.set(P.x, P.y - 0.4, P.z); hippo.root.rotation.y = player.yaw; animateQuad(hippo, player.speedNow * 0.4, dt); }
  pegasus.root.visible = false; ship.root.visible = false;
  if (player.swimming && !riding) { hero.armL.rotation.x = -2.6 + Math.sin(clock.elapsedTime * 4) * 0.6; hero.armR.rotation.x = -2.6 - Math.sin(clock.elapsedTime * 4) * 0.6; }
  if (player.mounted) {
    horse.root.position.set(P.x, P.y, P.z); horse.root.rotation.y = player.yaw;
    if (horse.horses) { for (const hh of horse.horses) animateQuad(hh, player.speedNow * 0.6, dt); for (const w of horse.wheels) w.rotation.x += player.speedNow * dt / 0.65; hero.root.position.set(P.x - Math.sin(player.yaw) * 1.3, P.y + 1.0, P.z - Math.cos(player.yaw) * 1.3); animateHumanoid(hero, 0, dt, { attack: player.atkAnim }); }
    else animateQuad(horse, player.speedNow * 0.6, dt);
  }
  // Wettrennen (Olympia)
  if (race) {
    race.t += dt;
    const [tx, tz] = race.legs[race.leg];
    if (Math.abs(P.x - tx) < 3 && Math.abs(P.z - tz) < 11) { race.leg++; if (race.leg < race.legs.length) { toast('Wende! Weiter!', 'gold'); sfx('coin'); } }
    if (race.leg >= race.legs.length) {
      const t = race.t, ev = race.ev, rr2 = race; race = null;
      if (rr2.mount) { dismount(); player.horse = rr2.prevHorse || 'gaul'; setHorseModel(); }
      olyResult(ev, t, 'Deine Zeit: ' + t.toFixed(1) + ' Sekunden');
    } else if (race.t > race.limit) olyAbort('Zu langsam! Sprich erneut mit dem Kampfrichter.');
    else if (!race.mount && player.mounted) olyAbort('Disqualifiziert – kein Pferd beim Lauf!');
    else if (race.mount && !player.mounted) olyAbort('Vom Wagen gestiegen – disqualifiziert!');
  }
}
function updateSailing(dt, moving, sprint) {
  const P = player.pos, t = clock.elapsedTime;
  const SS = SHIPS[player.shipTier || 2].speed;
  player.shipSpeed = lerp(player.shipSpeed || 0, moving ? (sprint ? SS[1] : SS[0]) : 0, Math.min(1, dt * 1.2));
  if (moving) player.yaw = angLerp(player.yaw, Math.atan2(_mv.x, _mv.z), Math.min(1, dt * 1.8));
  const nx = P.x + Math.sin(player.yaw) * player.shipSpeed * dt, nz = P.z + Math.cos(player.yaw) * player.shipSpeed * dt;
  const fx = nx + Math.sin(player.yaw) * 7, fz = nz + Math.cos(player.yaw) * 7;
  if (heightAt(fx, fz) < -1.8 && heightAt(nx, nz) < -1.8 && Math.abs(fx) < HALF - 15 && Math.abs(fz) < HALF - 15) { P.x = nx; P.z = nz; }
  else { player.shipSpeed *= 0.2; if (!player._shoreT || t - player._shoreT > 4) { player._shoreT = t; toast('Land in Sicht – drücke B zum Anlegen.'); } }
  P.y = 0.9 + Math.sin(t * 1.3) * 0.15; player.vy = 0; player.swimming = false;
  player.speedNow = player.shipSpeed;
  ship.root.visible = true; ship.root.position.set(P.x, Math.sin(t * 1.3) * 0.15 - 0.2, P.z); ship.root.rotation.set(0, player.yaw, Math.sin(t * 0.9) * 0.04);
  hero.root.position.set(P.x - Math.sin(player.yaw) * 5.5, P.y + 0.3, P.z - Math.cos(player.yaw) * 5.5); hero.root.rotation.y = player.yaw;
  animateHumanoid(hero, 0, dt, {});
  pegasus.root.visible = false; hippo.root.visible = false;
}
function updateFlying(dt, moving, sprint, canMove) {
  const P = player.pos, t = clock.elapsedTime, sp = sprint ? 50 : 32;
  if (moving) { P.x += _mv.x * sp * dt; P.z += _mv.z * sp * dt; player.yaw = angLerp(player.yaw, Math.atan2(_mv.x, _mv.z), Math.min(1, dt * 6)); }
  let vy = 0; if (canMove && keys.Space) vy = 15; if (canMove && (keys.KeyC || keys.ControlLeft)) vy = -18;
  P.y += vy * dt;
  P.x = clamp(P.x, -HALF + 10, HALF - 10); P.z = clamp(P.z, -HALF + 10, HALF - 10);
  const floor = Math.max(groundAt(P.x, P.z), -0.5);
  if (P.y < floor) P.y = floor;
  if (P.y > 340) P.y = 340;
  if (P.y - floor < 3) resolveCollisions(P, 0.9);
  player.speedNow = moving ? sp : 0; player.swimming = false; player.vy = 0;
  pegasus.root.visible = true; pegasus.root.position.set(P.x, P.y, P.z); pegasus.root.rotation.set(moving ? 0.1 : 0, player.yaw, 0);
  const fl = Math.sin(t * (moving ? 9 : 4)) * 0.7; pegasus.wings[0].rotation.z = 0.3 + fl; pegasus.wings[1].rotation.z = -0.3 - fl;
  animateQuad(pegasus, P.y - floor < 0.3 ? player.speedNow * 0.4 : 0, dt);
  hero.root.position.set(P.x, P.y + 1.3, P.z); hero.root.rotation.y = player.yaw;
  animateHumanoid(hero, 0, dt, { attack: player.atkAnim, sitting: true });
  hippo.root.visible = false; ship.root.visible = false;
  if (!player.dead && clock.elapsedTime - player.lastHurt > 6 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + dt * 4);
}
function updateNPCs(dt) {
  for (const n of npcs) {
    const p = n.h.root.position;
    const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d > 220) { n.h.root.visible = false; continue; }
    n.h.root.visible = true;
    let spd = 0;
    n.talking -= dt;
    if (d < 5 || n.talking > 0) n.yaw = angLerp(n.yaw, Math.atan2(player.pos.x - p.x, player.pos.z - p.z), Math.min(1, dt * 4));
    else if (n.wander) {
      n.wt -= dt;
      if (n.wt <= 0) { n.wt = rr(4, 10); const a = rand() * 6.28, r = rand() * n.wander; n.tx = n.home[0] + Math.cos(a) * r; n.tz = n.home[1] + Math.sin(a) * r; if (heightAt(n.tx, n.tz) < 1) { n.tx = n.home[0]; n.tz = n.home[1]; } }
      const dx = n.tx - p.x, dz = n.tz - p.z, dd = Math.hypot(dx, dz);
      if (dd > 0.6) {
        spd = 1.8; const q = { x: p.x + dx / dd * spd * dt, z: p.z + dz / dd * spd * dt };
        if (resolveCollisions(q, 0.4)) { n.wt = Math.min(n.wt, 0.5); }
        p.x = q.x; p.z = q.z; n.yaw = angLerp(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 5));
      }
    }
    p.y = groundAt(p.x, p.z);
    n.h.root.rotation.y = n.yaw;
    animateHumanoid(n.h, spd, dt, { idleTalk: n.talking > 0 && dialog });
  }
}
const SKY = {
  day: { top: new THREE.Color(0x3d7fd0), bottom: new THREE.Color(0xcfe3f2) },
  dusk: { top: new THREE.Color(0x3a4a8a), bottom: new THREE.Color(0xf0a060) },
  night: { top: new THREE.Color(0x040a1c), bottom: new THREE.Color(0x14203a) },
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _sunDir = new V3();
function updateSky(dt) {
  S.time = (S.time + dt / 480) % 1; // 8 Minuten pro Tag
  if (curD) {
    const T = THEMES[curD.theme], P = player.pos;
    sky.visible = false; stars.visible = false; water.visible = false; for (const c of clouds) c.visible = false;
    scene.fog.color.setHex(0x0a0806); scene.fog.near = 14; scene.fog.far = 95;
    sun.intensity = 0; hemi.intensity = 0.55 + flash * 3; hemi.color.setHex(T.light); hemi.groundColor.setHex(0x30241a);
    torch.intensity = 45; torch.color.setHex(T.light); torch.position.set(P.x, P.y + 3.2, P.z);
    flash = Math.max(0, flash - dt * 3);
    $('clock').textContent = '⛰ Unter der Erde';
    return;
  }
  sky.visible = true; stars.visible = true; water.visible = true; for (const c of clouds) c.visible = true;
  scene.fog.near = 220; scene.fog.far = 1300; if (torch) torch.intensity = 0;
  const a = (S.time - 0.25) * Math.PI * 2;
  const elev = Math.sin(a);
  _sunDir.set(Math.cos(a) * 0.8, elev, 0.35).normalize();
  const dayT = smooth(-0.12, 0.25, elev), duskT = Math.max(0, 1 - Math.abs(elev) / 0.3) * smooth(-0.25, 0.0, elev);
  _c1.copy(SKY.night.top).lerp(SKY.day.top, dayT); _c2.copy(SKY.night.bottom).lerp(SKY.day.bottom, dayT);
  _c1.lerp(SKY.dusk.top, duskT * 0.5); _c2.lerp(SKY.dusk.bottom, duskT * 0.8);
  skyMat.uniforms.top.value.copy(_c1); skyMat.uniforms.bottom.value.copy(_c2);
  skyMat.uniforms.sunDir.value.copy(_sunDir);
  skyMat.uniforms.sunCol.value.setRGB(1, 0.85 + 0.1 * dayT, 0.6 + 0.3 * dayT).multiplyScalar(smooth(-0.1, 0.05, elev));
  scene.fog.color.copy(_c2);
  starMat.opacity = smooth(0.0, -0.2, elev);
  const P = player.pos;
  if (elev > -0.05) { sun.position.set(P.x + _sunDir.x * 250, P.y + _sunDir.y * 250, P.z + _sunDir.z * 250); sun.intensity = 2.2 * smooth(-0.05, 0.2, elev); sun.color.setRGB(1, 0.8 + 0.15 * dayT, 0.6 + 0.3 * dayT); }
  else { sun.position.set(P.x - _sunDir.x * 250, P.y - _sunDir.y * 250, P.z - _sunDir.z * 250); sun.intensity = 0.45 * smooth(-0.05, -0.3, elev); sun.color.setRGB(0.6, 0.7, 1.0); }
  sun.target.position.set(P.x, P.y, P.z);
  hemi.intensity = 0.3 + 0.75 * dayT + flash * 3;
  hemi.color.setRGB(0.6 + 0.2 * dayT, 0.7 + 0.2 * dayT, 1.0);
  hemi.groundColor.setRGB(0.35 * dayT + 0.08, 0.3 * dayT + 0.08, 0.2 * dayT + 0.12);
  flash = Math.max(0, flash - dt * 3);
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  const hrs = (S.time * 24 + 0) % 24;
  $('clock').textContent = (elev > 0 ? '☀ ' : '☾ ') + String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
}
function camBlocked(x, y, z) {
  const list = cgrid.get(ckey(Math.floor(x / CGRID), Math.floor(z / CGRID)));
  if (!list) return false;
  for (const c of list) if (c.t === 'b' && c.top > 1e8 && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  return false;
}
function updateCamera(dt) {
  const P = player.pos;
  const tgt = new V3(P.x, P.y + (player.form === 'centaur' ? 2.8 : player.bird ? 1.5 : player.sailing ? 3.5 : player.mounted || player.flying ? 3.0 : 1.75) + (player.swimming && !player.gear.includes('poseidon') ? -0.6 : 0), P.z);
  if (player.bowMode && !player.sailing) { tgt.x += Math.cos(camYaw) * 0.8; tgt.z -= Math.sin(camYaw) * 0.8; tgt.y += 0.2; }
  const inTav = !curD && insideTavern(P);
  let dist = (inTav ? 4 : player.bird ? 12 : player.sailing ? 17 : player.flying ? 11 : player.mounted ? 9 : 6.5) * camZoom * (player.bowMode && !player.sailing ? 0.7 : 1);
  const dx = Math.sin(camYaw) * Math.cos(camPitch), dy = Math.sin(camPitch), dz = Math.cos(camYaw) * Math.cos(camPitch);
  for (let k = 0.12; k <= 1.0001; k += 0.08) { if (camBlocked(tgt.x + dx * dist * k, tgt.y + dy * dist * k, tgt.z + dz * dist * k)) { dist *= Math.max(0.12, k - 0.1); break; } }
  const cx = tgt.x + dx * dist, cz = tgt.z + dz * dist;
  let cy = tgt.y + dy * dist;
  if (curD) cy = Math.min(cy, curD.O.y + curD.H - 0.8);
  else { cy = Math.max(cy, heightAt(cx, cz) + 0.6, 0.4); const tv = insideTavern(P); if (tv) cy = Math.min(cy, tv.box.y + 3.9); }
  camera.position.set(cx, cy, cz);
  camera.lookAt(tgt);
}
let lastLoc = null, saveT = 0;
function updateHUD() {
  $('hpFill').style.width = (player.hp / player.maxHp * 100) + '%';
  $('hpText').textContent = Math.ceil(player.hp) + ' / ' + player.maxHp;
  $('stFill').style.width = player.stamina + '%';
  $('money').textContent = player.money; $('potions').textContent = player.potions;
  const ab = [];
  ab.push(player.mounted ? '[R] Absteigen' : '[R] ' + HORSES[player.horse || 'gaul'].name);
  ab.push('[X] ' + (player.bowMode ? (player.gear.includes('keraunos') ? 'Keraunos' : 'Schwert') : player.blitzMode ? 'Schwert' : 'Bogen'), '[I] Held');
  if (player.gear.includes('keraunos')) ab.push(player.blitzCd > 0 ? 'Blitz ' + player.blitzCd.toFixed(1) + ' s' : '[V] Blitz werfen');
  if (player.gear.includes('blitzvogel')) ab.push(player.bird ? '[U] Zurückverwandeln' : '[U] Blitzadler');
  if (player.gear.includes('sirene')) ab.push(player.form === 'siren' ? '[J] Zurückverwandeln' : '[J] Sirene');
  if (player.gear.includes('kentaur')) ab.push(player.form === 'centaur' ? '[K] Zurückverwandeln' : '[K] Kentaur');
  if (NET.account && NET.account.admin) ab.push('[P] Admin');
  if (player.hasShip) ab.push(player.sailing ? '[B] Anlegen' : '[B] Schiff');
  if (player.gear.includes('pegasus')) { ab.push(player.flying ? '[T] Landen' : '[T] Pegasus'); ab.push(player.medCd > 0 ? 'Medusa: ' + Math.ceil(player.medCd) + ' s' : '[G] Medusenhaupt'); }
  if (player.relics.length) ab.push('Relikte ' + player.relics.length + '/6');
  if (player.blessed) ab.push(player.zapCd > 0 ? 'Blitz: ' + Math.ceil(player.zapCd) + ' s' : '[Q] Blitz des Zeus bereit');
  $('abilities').textContent = ab.join('  ·  ');
  $('wanted').textContent = player.wanted ? 'GESUCHT  ' + '★'.repeat(player.wanted) + '☆'.repeat(5 - player.wanted) : '';
  $('bountyText').textContent = S.bounty ? '☠ Kopfgeld: ' + S.bounty.name + ' – ' + S.bounty.reward + ' Drachmen' : '';
  $('allyText').textContent = allies.length ? '⚔ Gefolge: ' + allies.map(a => a.def.name.split(' ').pop() + ' ' + Math.ceil(a.hp)).join(', ') : '';
  nearInter = dialog ? null : findInteractable();
  updateTouchUI();
  $('prompt').innerHTML = nearInter ? '<b>E</b>' + (typeof nearInter.label === 'function' ? nearInter.label() : nearInter.label) : '';
  // Ortsnamen
  let cur = null;
  for (const L of LOC_LIST) if (!L.hidden && Math.hypot(player.pos.x - L.x, player.pos.z - L.z) < L.r + 10) cur = L;
  RUINS.forEach((r, i) => { if (Math.hypot(player.pos.x - r.x, player.pos.z - r.z) < (r.discR || 26)) { cur = r; if (!S.found.includes(i)) { S.found.push(i); toast('Entdeckt: ' + r.name, 'gold'); } } });
  if (!curD) for (const d of DUNGEONS) if (Math.hypot(player.pos.x - d.at[0], player.pos.z - d.at[1]) < 22) { cur = d; if (!S.foundD.includes(d.idx)) { S.foundD.push(d.idx); toast('Entdeckt: ' + d.name, 'gold'); } }
  if (cur && cur !== lastLoc) showLoc(cur.sub ? cur : { name: cur.name, sub: cur.chest && cur.chest.opened ? 'Geplündert' : cur.kind === 'forest' ? 'Mythenwald – Fabelwesen hüten einen Schatz' : cur.kind === 'old' ? 'Alte Ruinen – von Skeletten bewacht' : 'Vergessener Tempel – bewacht' });
  lastLoc = cur;
}

function animateWorld(dt, t) {
  for (const f of fires) { f.scale.y = (f.userData.base || (f.userData.base = f.scale.y)) * (1 + Math.sin(t * 13 + f.position.x) * 0.15 + Math.sin(t * 7.3) * 0.08); f.rotation.y += dt * 2; }
  for (const c of clouds) { c.position.x += dt * 4; if (c.position.x > player.pos.x + 1700) c.position.x -= 3400; }
  water.position.set(player.pos.x, Math.sin(t * 0.6) * 0.08, player.pos.z);
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t -= dt; if (b.line.material) b.line.material.opacity = Math.max(0, b.t / 0.35); else b.line.intensity = 60 * Math.max(0, b.t / 0.35); if (b.t <= 0) { scene.remove(b.line); bolts.splice(i, 1); } }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (started && !paused) {
    updatePlayer(dt);
    for (const e of enemies) updateEnemy(e, dt);
    updateNPCs(dt);
    updateRemotes(dt); netSend(dt); updateAllies(dt); updateWanted(dt); updateArrows(dt); updateOly(dt); updateStrikes(dt); updateSirens(dt); updateForms(dt);
    updatePickups(dt, t);
    updateSky(dt);
    animateWorld(dt, t);
    S.played += dt;
    saveT += dt; if (saveT > 15) { saveT = 0; save(); }
    if (locTimer > 0) { locTimer -= dt; if (locTimer <= 0) $('locName').style.opacity = 0; }
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').style.opacity = 0; }
  } else if (!started) {
    // Menü: langsamer Kameraflug um die Akropolis
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 90, 55, -35 + Math.cos(a) * 90); camera.lookAt(0, 22, -35);
    updateSky(0); sky.position.copy(camera.position); stars.position.copy(camera.position);
    sun.position.set(camera.position.x + _sunDir.x * 250, 22 + _sunDir.y * 250, -35 + _sunDir.z * 250); sun.target.position.set(0, 22, -35);
    animateWorld(dt, t);
  }
  if (started) { updateCamera(dt); updateHUD(); if (!paused) drawMinimap(); if (mapOpen) drawBigMap(); }
  renderer.render(scene, camera);
  drawOverlay(started && !paused ? dt : 0);
}

// ============================================================
// Start
// ============================================================
function startGame(fromSave) {
  const sv = fromSave ? loadSave() : null;
  if (sv) {
    Object.assign(S, sv.S);
    Object.assign(player, sv.p);
    player.pos.set(sv.p.x, groundAt(sv.p.x, sv.p.z) + 0.5, sv.p.z);
    if ((sv.v || 0) < 3) { player.wTier = (player.wTier || 0) + 1; if (player.shieldTier === undefined || player.shieldTier === 0) player.shieldTier = 2; }
    if ((sv.v || 0) < 2 || groundAt(sv.p.x, sv.p.z) < -0.5) player.pos.set(SPOTS.respawn[0], groundAt(SPOTS.respawn[0], SPOTS.respawn[1]) + 0.5, SPOTS.respawn[1]);
    for (const p of pickups) if (p.kind === 'amph' && S.amph.includes(p.id)) { p.taken = true; p.mesh.visible = false; p.ring.visible = false; }
    if (S.stage === 1) { S.olives = 0; spawnOlives(); }
    if (S.minoDead) { const m = enemies.find(e => e.type === 'minotaur'); if (m) { m.dead = true; m.respawn = 1e9; m.m.root.visible = false; m.deadT = 99; } }
    if (player.hasArmor) refreshHeroLook();
    if (!player.relics) player.relics = [];
    S.chests = S.chests || []; S.found = S.found || [];
    S.towns = Object.assign(defaultTowns(), S.towns || {});
    if (S.town && S.town.lvl > 0 && !S.towns.heimat) S.towns.heimat = { owner: 'me', ownerName: heroName(), name: S.town.name, lvl: S.town.lvl, collected: Date.now() };
    delete S.town;
    for (const ch of CHESTS) if (S.chests.includes(ch.id)) markChestOpened(ch);
    for (const e of enemies) if ((e.ruin !== undefined && RUINS[e.ruin].chest.opened) || (e.key && (S.bossDead || []).includes(e.key))) { e.dead = true; e.respawn = 1e9; e.deadT = 99; e.m.root.visible = false; }
    S.bossDead = S.bossDead || []; S.foundD = S.foundD || []; player.gear = player.gear || [];
    S.quiz = S.quiz || []; S.olympia = S.olympia || {}; player.up = player.up || {}; player.skins = player.skins || ['standard']; player.skin = player.skin || 'standard';
    player.horses = player.horses || ['gaul']; player.horse = player.horse || 'gaul';
    if (player.hasShip && !player.shipTier) player.shipTier = 2;
    for (const a of (sv.p.allies || [])) if (MERCS[a.type]) spawnAlly(a.type, a.hp);
    delete player.allies;
    if (S.bounty) spawnBounty();
    refreshHeroLook();
  } else {
    try { localStorage.removeItem(saveKey()); } catch (e) { }
    player.pos.set(SPOTS.respawn[0], groundAt(SPOTS.respawn[0], SPOTS.respawn[1]), SPOTS.respawn[1]);
  }
  if (!sv) S.towns = defaultTowns();
  if (mpEnabled()) setTimeout(() => { if (!NET.towns) syncTowns(); }, 6000); else syncTowns();
  setHorseModel(); setShipModel();
  grantAdminGear();
  S.altars = S.altars || []; S.zeus = S.zeus || 0; ZEUS_ALTARS.forEach((A, i) => { A.fire.visible = S.altars.includes(i); }); if (S.zeus === 2) spawnGiants(); updateZeusText();
  started = true;
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  updateQuestText();
  camYaw = 0; camPitch = 0.3; if (!sv) player.yaw = Math.PI;
  if (sv) for (const d of DUNGEONS) if (Math.hypot(player.pos.x - d.at[0], player.pos.z - d.at[1]) < 12) { const r = downhillRot(d.at[0], d.at[1]); camYaw = r + Math.PI; player.yaw = r; }
  if (!TOUCH.on) canvas.requestPointerLock && canvas.requestPointerLock();
  showLoc(LOCS.athen);
  refreshHeroLook();
  if (mpEnabled()) NET.room = chooseRoom();
  netConnect(); updateOnlineBadge(); cloudSave(true);
  if (!sv) setTimeout(() => toast('Folge dem goldenen Zeichen zu deiner ersten Aufgabe.'), 1500);
  clock.getDelta();
}

function init() {
  const t0 = performance.now();
  buildTerrain();
  buildAthens(); buildDelphi(); buildOlympia(); buildSparta(); buildPiraeus(); buildKreta(); buildMisc();
  buildIslands();
  buildTownBases(); buildRuins(); buildOldRuins(); buildDungeons(); buildMythForests(); buildAncientWorld(); buildSirenRocks(); buildServices(); buildQuizNPCs(); buildZeusQuest();
  buildVegetation();
  finalizeStatic();
  buildClouds();
  hero = makeHumanoid(heroLook()); scene.add(hero.root);
  horse = makeHorse(); horse.root.visible = false; scene.add(horse.root);
  birdM = makeBird(); birdM.root.visible = false; scene.add(birdM.root);
  sirenM = makeSirenForm(); sirenM.root.visible = false; scene.add(sirenM.root);
  pegasus = makePegasus(); pegasus.root.visible = false; scene.add(pegasus.root);
  hippo = makeHippo(); hippo.root.visible = false; scene.add(hippo.root);
  ship = makeShip(); ship.root.visible = false; scene.add(ship.root);
  torch = new THREE.PointLight(0xffa050, 0, 32, 1.6); scene.add(torch);
  buildNPCs(); buildIslandNPCs(); buildInteractables(); buildEnemies(); spawnMythCreatures(); spawnDungeonEnemies();
  buildPickups();
  buildMapCanvas();
  resizeOverlay();
  console.log('Welt erschaffen in ' + Math.round(performance.now() - t0) + ' ms');
  $('loading').textContent = '';
  $('btnNew').disabled = false;
  if (loadSave()) $('btnLoad').classList.remove('hidden');
  setupMenuNet(); setupTouch(); setupMapZoom();
  checkForUpdate(); setInterval(checkForUpdate, 60000);
  autoContinueAfterUpdate();
  $('dlgClose').onclick = (e) => { e.stopPropagation(); dialog = null; renderDialog(); };
  $('heroClose').onclick = (e) => { e.stopPropagation(); if (heroOpen) toggleHero(); };
  $('btnNew').onclick = () => startGame(false);
  $('btnLoad').onclick = () => startGame(true);
  window.__hellas = { quizReward: (c) => quizItemReward(c), checkForUpdate, athena: () => athenaReward(), setForm, legendCount, form: () => player.form, siren: () => SIRENMG && { ...SIRENMG }, setZeus, gainGear2: (k) => gainGear(k), toggleBird, throwBlitz, cycleWeapon, ZEUS_ALTARS, setCam: (y, pt) => { camYaw = y; camPitch = pt; }, olyStart, toggleBow, toggleHero, OLY: () => OLY, race: () => race, arrows, allies, TAVERNS, QUIZZERS, MYTH_FORESTS, setWanted, addCrime, spawnAlly, acceptBounty, toggleAdmin, renderAdmin, setAccount, roadDist, NET, DUNGEONS, DOCKS, enterDungeon, exitDungeon, gainGear, toggleShip, toggleFly, curD: () => curD, CHESTS, RUINS, talkTown, foundTown, upgradeTown, townsState, syncTowns, cam: () => [camYaw, camPitch], renderer, player, S, enemies, npcs, LOCS, SPOTS, heightAt, setStage, startGame, pickups, docks: () => [piraeusDock, kretaDock] };
  loop();
}
setTimeout(init, 30);
})();
