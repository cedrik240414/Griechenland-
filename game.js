/* Hellas – Pfad der Helden
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
const WORLD = 2000, SEG = 400, CELL = WORLD / SEG, N = SEG + 1, HALF = WORLD / 2;
const BLOBS = [
  { x: -300, z: -80, r: 480 },   // Attika / Mittelgriechenland
  { x: 0, z: -560, r: 340 },     // Thessalien / Olymp
  { x: -350, z: 360, r: 330 },   // Peloponnes
  { x: -650, z: -300, r: 250 },  // Westen
  { x: 480, z: 660, r: 170 },    // Kreta
  { x: 650, z: 255, r: 110 },    // Thera
  { x: 620, z: -365, r: 115 },   // Seriphos
  { x: 375, z: -222, r: 66 },    // Sireneninsel
  { x: -875, z: 330, r: 95 },    // Ithaka
];
const PEAKS = [
  { x: 100, z: -680, h: 175, s: 80 },  // Olymp
  { x: -480, z: -430, h: 80, s: 70 },  // Parnass
  { x: -400, z: 560, h: 60, s: 55 },   // Taygetos
  { x: 540, z: 620, h: 30, s: 45 },    // Ida (Kreta)
  { x: 665, z: 235, h: 85, s: 30 },    // Vulkan von Thera
  { x: 660, z: -400, h: 30, s: 40 },   // Seriphos
  { x: -905, z: 300, h: 38, s: 35 },   // Ithaka
];
const LOCS = {
  athen:     { name: 'Athen', sub: 'Stadt der Athene', x: 0, z: 0, r: 78, h: 6, city: true },
  akropolis: { name: 'Akropolis', x: 0, z: -35, r: 30, h: 22, hidden: true },
  piraeus:   { name: 'Piräus', sub: 'Hafen von Athen', x: 140, z: 70, r: 36, h: 2, city: true },
  theben:    { name: 'Theben', sub: 'Stadt des Kadmos', x: -170, z: -260, r: 40, h: 12, city: true },
  delphi:    { name: 'Delphi', sub: 'Heiligtum des Apollon', x: -420, z: -330, r: 46, h: 38, city: true },
  olympia:   { name: 'Olympia', sub: 'Heiligtum des Zeus', x: -560, z: 130, r: 78, h: 5, city: true },
  sparta:    { name: 'Sparta', sub: 'Stadt der Krieger', x: -260, z: 520, r: 70, h: 8, city: true },
  banditen:  { name: 'Banditenlager', sub: 'Vorsicht, Wanderer', x: -120, z: 430, r: 26, h: null },
  olymp:     { name: 'Gipfel des Olymp', sub: 'Thron der Götter', x: 100, z: -680, r: 14, h: null },
  kreta:     { name: 'Knossos', sub: 'Insel Kreta', x: 460, z: 690, r: 62, h: 6, city: true },
  thera:     { name: 'Thera', sub: 'Die Vulkaninsel', x: 590, z: 300, r: 26, h: null, city: true },
  seriphos:  { name: 'Seriphos', sub: 'Insel der Medusa', x: 595, z: -330, r: 26, h: null, city: true },
  sirenen:   { name: 'Sireneninsel', sub: 'Hüte dich vor ihrem Gesang', x: 372, z: -218, r: 16, h: null },
  ithaka:    { name: 'Ithaka', sub: 'Heimat des Odysseus', x: -860, z: 340, r: 30, h: null, city: true },
  hadesTor:  { name: 'Tor zur Unterwelt', sub: 'Reich des Hades', x: -330, z: 615, r: 9, h: null, hidden: true },
  hephTor:   { name: 'Schmiede des Hephaistos', x: 640, z: 262, r: 8, h: null, hidden: true },
  poseidonTor: { name: 'Grotte des Poseidon', x: 392, z: -238, r: 7, h: null, hidden: true },
  medusaTor: { name: 'Hort der Medusa', x: 650, z: -395, r: 8, h: null, hidden: true },
  polyphemTor: { name: 'Höhle des Polyphem', x: -905, z: 310, r: 8, h: null, hidden: true },
  heimat:    { name: 'Siedlungsplatz', sub: 'Gründe hier deine eigene Stadt', x: -120, z: 120, r: 45, h: null },
  eleusis:   { name: 'Siedlungsplatz', x: 20, z: -240, r: 45, h: null },
  lebadeia:  { name: 'Siedlungsplatz', x: -260, z: -400, r: 45, h: null },
  chalkis:   { name: 'Siedlungsplatz', x: 0, z: -460, r: 45, h: null },
  megara:    { name: 'Megara', x: -200, z: -100, r: 45, h: null },
  argos:     { name: 'Argos', x: -380, z: 340, r: 45, h: null },
  korinth:   { name: 'Korinth', x: -300, z: 100, r: 45, h: null },
};
const LOC_LIST = Object.values(LOCS);
const ROADS = [
  [[0, 0], [-80, -120], [-170, -260], [-300, -300], [-420, -330]],
  [[0, 0], [70, 40], [140, 70]],
  [[0, 0], [-150, 40], [-330, 80], [-560, 130]],
  [[-560, 130], [-450, 300], [-260, 520]],
  [[0, 0], [-60, 180], [-150, 350], [-260, 520]],
  [[-170, -260], [-60, -420], [40, -560], [90, -660]],
  [[-260, 520], [-120, 430]],
  [[460, 690], [400, 600]],
  [[-48, 144], [-72, 120], [-120, 120]],
];
const ROAD_SEGS = [];
for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) ROAD_SEGS.push([r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]]);
function roadDist(x, z) { let m = 1e9; for (const s of ROAD_SEGS) { const d = segDist(x, z, s[0], s[1], s[2], s[3]); if (d < m) m = d; } return m; }
const FORESTS = [
  { x: -250, z: -150, r: 85 }, { x: -540, z: -170, r: 90 }, { x: -60, z: -380, r: 80 },
  { x: -430, z: 330, r: 80 }, { x: -680, z: -360, r: 90 }, { x: 160, z: -470, r: 70 },
  { x: -220, z: -680, r: 85, myth: true }, { x: -580, z: 420, r: 80, myth: true }, { x: -740, z: -140, r: 85, myth: true },
];

function rawHeight(x, z) {
  let land = -9;
  for (const b of BLOBS) { const d = Math.hypot(x - b.x, z - b.z) / b.r; land = Math.max(land, 1 - d); }
  land += fbm(x * 0.0035 + 11, z * 0.0035 - 7, 4) * 0.28;
  let h;
  if (land < 0) h = Math.max(-38, land * 110);
  else {
    const hills = fbm(x * 0.009, z * 0.009, 5) * 0.5 + 0.5;
    h = Math.min(land, 0.5) * 14 + hills * hills * 42 * smooth(0.0, 0.3, land);
  }
  for (const p of PEAKS) { const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; h += p.h * Math.exp(-d2 / (2 * p.s * p.s)); }
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
    const x = rr(-850, 480), z = rr(-850, 820), h = heightAt(x, z);
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
    else { L.name = T.name; L.sub = (T.owner === 'npc' ? 'Polis der ' : 'Stadt von ') + T.ownerName + ' – eroberbar'; }
    syncGarrison(s.key, T);
  }
}
function garrison(site) { return enemies.filter(e => e.site === site); }
function syncGarrison(site, T) {
  const want = T && !isMine(T) && T.lvl > 0 ? Math.min(18, 2 + T.lvl * 2 + (T.def || 0)) : 0;
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
  if (action === 'conquer') { T.owner = 'me'; T.ownerName = heroName(); T.collected = now; T.def = 0; }
  if (action === 'train') T.def = Math.min(10, (T.def || 0) + 2);
  syncTowns(); save();
}
function talkTown(site) {
  const T = townsState()[site], L = TOWN_LEVELS;
  if (!T) {
    talk([{ who: 'Grenzstein', text: 'Fruchtbares Land mit einer Quelle. Hier könntest du eine eigene Stadt gründen! Kosten: 50 Drachmen.', opts: [
      { label: 'Stadt gründen (50 Drachmen)', fn: () => foundTown(site) }, { label: 'Später', fn: () => { } }] }]);
    return;
  }
  if (!isMine(T)) {
    const alive = garrison(site).filter(e => !e.dead).length;
    const loot = townTreasury(T) + (T.owner === 'npc' ? T.lvl * 60 : 0);
    if (alive) { talk([{ who: 'Grenzstein von ' + T.name, text: T.name + ' gehört ' + (T.owner === 'npc' ? 'den ' : '') + T.ownerName + ' (' + L[T.lvl].name + '). Noch verteidigen ' + alive + ' Soldaten die Stadt. Besiege die Garnison, dann kannst du ' + T.name + ' erobern!' }]); return; }
    talk([{ who: 'Grenzstein von ' + T.name, text: 'Die Garnison ist geschlagen! ' + T.name + ' liegt dir zu Füßen. In der Schatzkammer liegen ' + loot + ' Drachmen.', opts: [
      { label: '⚔ ' + T.name + ' erobern!', fn: () => { if (loot) addMoney(loot); townAction(site, 'conquer'); addCrime(2); banner(T.name + ' erobert!', 'Die Stadt gehört jetzt dir – baue sie aus und sammle Steuern ein.'); sfx('quest'); } },
      { label: 'Noch nicht', fn: () => { } }] }]);
    return;
  }
  const next = L[T.lvl + 1], opts = [], tr = townTreasury(T);
  if (tr >= 1) opts.push({ label: 'Steuern einsammeln (' + tr + ' Drachmen)', fn: () => { addMoney(tr); townAction(site, 'collect'); } });
  if (next) opts.push({ label: 'Ausbauen zur ' + next.name + ' (' + next.cost + ' Drachmen)', fn: () => upgradeTown(site) });
  opts.push({ label: 'Bürger zu Soldaten ausbilden (60 Drachmen) – Gefolge ' + allies.length + '/' + MAX_ALLIES, fn: () => { if (allies.length >= MAX_ALLIES) { toast('Dein Gefolge ist voll (' + MAX_ALLIES + ').'); return; } if (spend(60)) { spawnAlly('buerger'); toast('Ein Bürgersoldat aus ' + T.name + ' folgt dir!', 'gold'); save(); } } });
  if ((T.def || 0) < 10) opts.push({ label: 'Stadtwache trainieren (100 Drachmen) – Verteidiger ' + (T.def || 0) + '/10', fn: () => { if (spend(100)) { townAction(site, 'train'); toast('Die Stadtwache von ' + T.name + ' wird stärker!', 'gold'); } } });
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
  piraeusDock = dock(L, 1, 0.15);
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
  kretaDock = dock(L, -0.7, -0.9);
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
    const x = rr(-800, 300), z = rr(-700, 650), h = heightAt(x, z);
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
  for (let i = 0; i < 26000; i++) {
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
  if (o.shield) { shield = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 18), lam(o.shieldCol ?? 0xb98d3a), -0.05, -0.42, 0.16, armL); shield.rotation.z = Math.PI / 2; shield.rotation.y = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), lam(o.shieldEmblem ?? 0x8a1a1a), 0, 0.04, 0, shield); }
  if (o.weapon === 'sword') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); mesh(new THREE.BoxGeometry(0.07, 0.04, 0.85), lam(0xd8d8d0), 0, 0, 0.5, weapon); mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), M.bronze, 0, 0, 0.08, weapon); }
  if (o.weapon === 'spear') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), M.wood, 0, 0, 0.6, weapon).rotation.x = Math.PI / 2; mesh(new THREE.ConeGeometry(0.07, 0.3, 6), lam(0xd8d8d0), 0, 0, 2.0, weapon).rotation.x = Math.PI / 2; }
  if (o.weapon === 'axe') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M.wood, 0, 0, 0.5, weapon).rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.42, 0.3), lam(0x9a9a9a), 0, s * 0.2, 1.05, weapon); }
  if (o.weapon === 'fireSword') { weapon = new THREE.Group(); weapon.position.set(0, -0.62, 0.05); armR.add(weapon); mesh(new THREE.BoxGeometry(0.1, 0.05, 1.15), lam(0xff8a30, 0xff4a00), 0, 0, 0.65, weapon); mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), M.gold, 0, 0, 0.08, weapon); }
  if (o.weapon === 'trident') { weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0); armR.add(weapon); mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), lam(0x2a8a8a), 0, 0, 0.6, weapon).rotation.x = Math.PI / 2; for (const sx of [-0.12, 0, 0.12]) mesh(new THREE.ConeGeometry(0.04, 0.4, 5), M.gold, sx, 0, 2.05, weapon).rotation.x = Math.PI / 2; mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), M.gold, 0, 0, 1.85, weapon); }
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
  lastHurt: -99, swimming: false, dead: false, zapCd: 0, speedNow: 0, hasArmor: false, hasBlade: false, relics: [], gear: [], hasShip: false, chiron: false, wTier: 0, aTier: 0, horse: 'gaul', horses: ['gaul'], shipTier: 0, wanted: 0, adminFly: false, flying: false, sailing: false, stoned: 0, medCd: 0,
};
const S = { stage: 0, olives: 0, wolves: 0, bandits: 0, amph: [], raceBest: null, time: 0.32, played: 0, chests: [], found: [], towns: defaultTowns(), bossDead: [], foundD: [], quiz: [], bounty: null };
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
  return ({ S, p: { x: sp.x, z: sp.z, hp: player.hp, maxHp: player.maxHp, money: player.money, potions: player.potions, dmg: player.dmg, blessed: player.blessed, hasArmor: player.hasArmor, hasBlade: player.hasBlade, relics: player.relics, gear: player.gear, hasShip: player.hasShip, chiron: player.chiron, wTier: player.wTier, aTier: player.aTier, horse: player.horse, horses: player.horses, shipTier: player.shipTier, wanted: player.wanted, allies: allies.map(a => ({ type: a.type, hp: Math.round(a.hp) })) } });
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
    { who: W, text: 'Tipp: Drücke R, um dein Pferd zu rufen. Und Kleon dort am Markt verkauft nützliche Dinge.' },
    { who: W, text: 'Noch etwas: Südwestlich von Athen liegt freies Land. Dort kannst du am Grenzstein deine eigene Stadt gründen. Und in den Tempeln von Hellas warten Opfergaben auf Helden!', fn: () => setStage(3) },
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
function talkJudge() {
  const W = 'Kampfrichter';
  if (race) { talk([{ who: W, text: 'Lauf! Die Zeit läuft!' }]); return; }
  talk([{ who: W, text: `Willkommen im Stadion von Olympia! Lauf zum Ziel am anderen Ende und wieder zurück – in unter 32 Sekunden. Zu Fuß, versteht sich!${S.raceBest ? ' Deine Bestzeit: ' + S.raceBest.toFixed(1) + ' s.' : ''}`, opts: [
    { label: 'Ich bin bereit!', fn: startRace },
    { label: 'Vielleicht später.', fn: () => { } },
  ] }]);
}
function startRace() {
  if (player.mounted) dismount();
  player.pos.set(SPOTS.raceStart[0] + 1, groundAt(SPOTS.raceStart[0], SPOTS.raceStart[1]), SPOTS.raceStart[1]);
  race = { t: 0, half: false, limit: 32 };
  player.stamina = 100;
  toast('Los! Lauf zum Ziel am Ostende!', 'gold'); sfx('quest');
}
function prayShrine() {
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
  for (const [x, z] of [[-430, 190], [-440, 205], [-100, 255], [-85, 262], [-480, 270]]) spawnEnemy('bandit', x, z);
  spawnEnemy('minotaur', SPOTS.mazeCenter[0], SPOTS.mazeCenter[1]);
  RUINS.forEach((r, i) => { r.guards.forEach(([gx, gz], k) => { const e = spawnEnemy(r.kind === 'old' ? 'skelett' : r.kind === 'forest' ? r.guardTypes[k] : 'guard', gx, gz); e.ruin = i; }); });
}
function hurtPlayer(dmg, from) {
  if (player.dead || player.adminFly) return;
  if (player.blocking) {
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    const dx = from.x - player.pos.x, dz = from.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
    if ((dx * fx + dz * fz) / d > 0.3) { dmg *= player.relics.includes('athene') ? 0.05 : 0.2; sfx('block'); floatText(player.pos.x, player.pos.y + 2.4, player.pos.z, 'Geblockt', '#e8c46a'); if (player.stamina > 10) player.stamina -= 10; }
  }
  if (player.hasArmor) dmg *= 0.85;
  if (player.relics.includes('achilles')) dmg *= 0.8;
  if (player.gear.includes('hadeshelm')) dmg *= 0.7;
  dmg *= 1 - ARMORS[player.aTier || 0].red;
  dmg = Math.round(dmg);
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
  e.dead = true; e.deadT = 0; e.respawn = 100;
  if (e.site && !isMine(townsState()[e.site])) { player.crimeKills = (player.crimeKills || 0) + 1; if (player.crimeKills % 2 === 0) addCrime(1); }
  if (e.def.hunter) { player.hunterKills = (player.hunterKills || 0) + 1; if (player.hunterKills % 3 === 0) addCrime(1); setTimeout(() => removeEnemy(e), 6000); }
  if (e.isBountyBoss && S.bounty) { const rw = S.bounty.reward; banner('Kopfgeld kassiert!', e.def.name + ' ist erledigt – ' + rw + ' Drachmen'); addMoney(rw); S.bounty = null; updateQuestText(); save(); }
  const [a, b] = e.def.money; const m = Math.round(rr(a, b));
  if (m > 0) { player.money += m; floatText(e.x, e.y + 1.5, e.z, '+' + m + ' Dr', '#e8c46a'); sfx('coin'); }
  if (e.type === 'wolf' && S.stage === 4) { S.wolves++; updateQuestText(); if (S.wolves >= 5) { toast('Genug Wölfe besiegt! Zurück zur Pythia.', 'gold'); setStage(5); } }
  if (e.type === 'bandit' && S.stage === 7 && Math.hypot(e.home[0] - LOCS.banditen.x, e.home[1] - LOCS.banditen.z) < 40) { S.bandits++; updateQuestText(); if (S.bandits >= 4) { toast('Das Lager ist befreit! Zurück zu Leonidas.', 'gold'); setStage(8); } }
  if (e.type === 'minotaur') { banner('DER MINOTAUROS IST BESIEGT', 'Kehre nach Athen zurück, Held!'); if (S.stage === 10) setStage(11); S.minoDead = true; save(); }
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
  if (e.state === 'idle') {
    e.wt -= dt;
    if (e.wt <= 0) { e.wt = rr(3, 8); const a = rand() * 6.28, r = rand() * (D.charge || D.boss ? 5 : 14); e.tx = e.home[0] + Math.cos(a) * r; e.tz = e.home[1] + Math.sin(a) * r; }
    const tx = e.tx - e.x, tz = e.tz - e.z, td = Math.hypot(tx, tz);
    if (td > 0.8) { mvx = tx / td; mvz = tz / td; spd = D.speed * 0.3; }
    const homeD = Math.hypot(e.x - e.home[0], e.z - e.home[1]);
    if (d < D.aggro && !player.dead && !player.flying && !player.adminFly && !player.sailing && !(player.swimming && !D.fly) && homeD < 90 && Math.abs(P.y - e.y) < 12) e.state = 'chase';
  } else if (e.state === 'chase') {
    const homeD = Math.hypot(e.x - e.home[0], e.z - e.home[1]);
    if (player.dead || player.flying || player.adminFly || player.sailing || d > D.aggro * 2.5 || homeD > (D.hunter ? 1e9 : D.boss ? 40 : D.charge ? 30 : 110)) { e.state = 'idle'; e.tx = e.home[0]; e.tz = e.home[1]; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5); }
    else {
      if (D.charge) {
        e.chargeCd -= dt;
        if (e.chargeT > 0) { e.chargeT -= dt; mvx = Math.sin(e.yaw); mvz = Math.cos(e.yaw); spd = 17; if (d < 2.6 && !e.chargeHit) { e.chargeHit = true; if (tgtAlly) hurtAlly(tgtAlly, D.dmg * 1.2); else hurtPlayer(D.dmg * 1.2, e); player.knock = { x: mvx * 18, z: mvz * 18, t: 0.25 }; } }
        else if (e.chargeCd <= 0 && d > 7 && d < 20) { e.chargeT = 1.0; e.chargeCd = 6; e.chargeHit = false; e.yaw = Math.atan2(dx, dz); floatText(e.x, e.y + (D.top || 4) + 0.3, e.z, 'BRÜLL!', '#ff7050', true); }
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
  r.scale.setScalar(e.baseScale * fs);
  const m = e.m, t = clock.elapsedTime;
  if (m.centaur) { animateQuad(m, e.speedNow, dt); if (e.atkAnim > 0) { const k = 1 - e.atkAnim; m.armR.rotation.x = k < 0.35 ? lerp(-0.3, -2.7, k / 0.35) : lerp(-2.7, -0.4, (k - 0.35) / 0.65); } else m.armR.rotation.x = -0.5; }
  else if (m.wings) { const f = Math.sin(t * 12 + e.x) * 0.7; m.wings[0].rotation.z = f; m.wings[1].rotation.z = -f; }
  else if (m.necks) m.necks.forEach((n, i) => { n.rotation.x = Math.sin(t * 1.5 + i) * 0.25 + (e.atkAnim > 0 ? Math.sin(e.atkAnim * Math.PI) * 0.9 : 0); n.rotation.z = Math.cos(t * 1.2 + i * 2) * 0.2; });
  else if (m.legs) { animateQuad(m, e.speedNow, dt); for (const h of (m.heads || [m.head])) h.rotation.x = e.atkAnim > 0 ? -Math.sin(e.atkAnim * Math.PI) * 0.6 : 0; }
  else animateHumanoid(m, e.speedNow, dt, { attack: e.atkAnim });
}
function canRevive(e) { return e.type !== 'minotaur' && !e.def.boss && !e.def.hunter && !e.bountyOf && !(e.site && isMine(townsState()[e.site])) && !(e.ruin !== undefined && RUINS[e.ruin].chest.opened); }
function revive(e) { e.dead = false; e.hp = e.maxHp; e.x = e.home[0]; e.z = e.home[1]; e.state = 'idle'; e.m.root.rotation.z = 0; e.m.root.visible = true; }

// ---------- Spieler-Angriffe ----------
function playerAttack() {
  if (player.atkCd > 0 || dialog || player.dead || (player.swimming && !player.gear.includes('poseidon')) || player.blocking || player.stoned > 0 || player.sailing) return;
  player.atkCd = 0.55; player.atkAnim = 1;
  let fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const reach = (player.mounted ? (HORSES[player.horse].chariot ? 4.6 : 3.8) : 3.0) + (player.gear.includes('poseidon') ? 1.2 : 0);
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
      damageEnemy(e, playerDamage() * rr(0.85, 1.15) * (crit ? 2 : 1), crit);
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
  if (curD) { toast('Hier unten kann dein Pferd nicht hin.'); return; }
  if (player.flying || player.sailing) return;
  if (player.swimming || race) { toast(race ? 'Beim Wettlauf kein Pferd!' : 'Im Wasser kann dein Pferd nicht kommen.'); return; }
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
function heroLook() { const gr = player.gear || []; return { tunic: 0x9b1c1c, armor: (player.aTier ? ARMORS[player.aTier].col : null) || (player.hasArmor ? 0xb98d3a : 0x7a5a3a), helmet: true, helmetCol: gr.includes('hadeshelm') ? 0x2a2a34 : null, crest: gr.includes('hadeshelm') ? 0x3a80ff : 0xe8c46a, shield: true, shieldCol: 0xb98d3a, shieldEmblem: 0x1c3a7a, weapon: gr.includes('hephklinge') ? 'fireSword' : gr.includes('poseidon') ? 'trident' : 'sword', cape: CAPE_COLORS[nameHash(heroName()) % CAPE_COLORS.length], pants: 0x3a2a1e, greaves: player.hasArmor || player.aTier >= 2, hair: 0x2a1a0e }; }

// ---------- Sammelobjekte ----------
const ampGeo = (() => { const pts = []; const prof = [[0, 0], [0.18, 0.02], [0.3, 0.25], [0.36, 0.55], [0.3, 0.85], [0.14, 1.0], [0.1, 1.15], [0.16, 1.22], [0.0, 1.22]]; for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 12); })();
const ampMat = new THREE.MeshLambertMaterial({ color: 0xb5553a, emissive: 0x2a0a00 });
const oliveMat = new THREE.MeshLambertMaterial({ color: 0xe8c46a, emissive: 0xb08020 });
function buildPickups() {
  let n = 0, tries = 0;
  rand = mulberry32(777);
  while (n < 40 && tries < 5000) {
    tries++;
    const x = rr(-850, 600), z = rr(-850, 850), h = heightAt(x, z);
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
  if (S.bounty) { let [mx, my] = toMini(S.bounty.x, S.bounty.z); const ddx = mx - S2 / 2, ddy = my - S2 / 2, dd = Math.hypot(ddx, ddy), mr = S2 / 2 - 10; if (dd > mr) { mx = S2 / 2 + ddx / dd * mr; my = S2 / 2 + ddy / dd * mr; } ctx.fillStyle = '#e0402a'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
  for (const ch of CHESTS) { if (ch.opened) continue; const [mx, my] = toMini(ch.x, ch.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 6) continue; ctx.fillStyle = ch.tier === 2 ? '#ffd24a' : '#d8b860'; ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 1; ctx.fillRect(mx - 3, my - 2.5, 6, 5); ctx.strokeRect(mx - 3, my - 2.5, 6, 5); }
  for (const e of enemies) { if (e.dead) continue; const [mx, my] = toMini(e.x, e.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 4) continue; ctx.fillStyle = e.type === 'minotaur' ? '#ff3a1a' : '#c0392b'; ctx.beginPath(); ctx.arc(mx, my, e.type === 'minotaur' ? 4 : 2.2, 0, 7); ctx.fill(); }
  for (const r of NET.others.values()) { if (!r.st) continue; const [mx, my] = toMini(r.pos.x, r.pos.z); if (Math.hypot(mx - S2 / 2, my - S2 / 2) > S2 / 2 - 5) continue; ctx.fillStyle = '#4ab0ff'; ctx.strokeStyle = '#002'; ctx.beginPath(); ctx.arc(mx, my, 4, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.save(); ctx.translate(S2 / 2, S2 / 2); ctx.rotate(-player.yaw + Math.PI);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBigMap() {
  const c = $('bigmapCanvas'), ctx = c.getContext('2d'), W = c.width, k = W / N;
  ctx.drawImage(mapCanvas, 0, 0, W, W);
  ctx.strokeStyle = 'rgba(232,196,106,.5)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, W - 2);
  ctx.textAlign = 'center';
  for (const L of LOC_LIST) {
    if (L.hidden) continue;
    const x = w2m(L.x) * k, y = w2m(L.z) * k;
    ctx.fillStyle = '#1b140c'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8c46a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    ctx.font = '700 17px Cinzel, serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(L.name, x, y - 10); ctx.fillStyle = '#fff3d0'; ctx.fillText(L.name, x, y - 10);
  }
  const q = questTarget();
  if (q) { const x = w2m(q.x) * k, y = w2m(q.z) * k; ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const x = w2m(player.pos.x) * k, y = w2m(player.pos.z) * k;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-player.yaw + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.font = '700 22px Cinzel, serif'; ctx.fillStyle = '#e8c46a'; ctx.textAlign = 'left'; ctx.fillText('HELLAS', 20, 36);
  ctx.font = '15px Alegreya Sans, sans-serif'; ctx.fillStyle = '#fff3d0'; ctx.fillText('Rätsel: ' + S.quiz.length + '/30   ·   Amphoren: ' + S.amph.length + '/40   ·   Relikte: ' + player.relics.length + '/6   ·   Tempel entdeckt: ' + S.found.length + '/' + RUINS.length + '   ·   [M] schließen', 20, 58);
  ctx.textAlign = 'center';
  ctx.textAlign = 'center'; ctx.font = '700 14px Alegreya Sans, sans-serif';
  for (const q2 of QUIZZERS) { const x = w2m(q2.x) * k, y = w2m(q2.z) * k; ctx.fillStyle = S.quiz.includes(q2.id) ? '#4a5a6a' : '#1a3a5a'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.fillStyle = S.quiz.includes(q2.id) ? '#9aa' : '#8fe0ff'; ctx.fillText(S.quiz.includes(q2.id) ? '✓' : '?', x, y + 5); }
  for (const tv of TAVERNS) { const x = w2m(tv.x) * k, y = w2m(tv.z) * k; ctx.fillText('🍺', x + 12, y + 14); }
  if (S.bounty) { const x = w2m(S.bounty.x) * k, y = w2m(S.bounty.z) * k; ctx.fillStyle = '#e0402a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('☠', x, y + 5); }
  for (const st of TOWN_SITES) { const L = LOCS[st.key], T = townsState()[st.key], x = w2m(L.x) * k, y = w2m(L.z) * k; ctx.strokeStyle = !T ? '#ffffff' : isMine(T) ? '#ffd24a' : '#ff4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); }
  DUNGEONS.forEach(d => { if (!d.reward && !S.foundD.includes(d.idx)) return; const x = w2m(d.at[0]) * k, y = w2m(d.at[1]) * k; ctx.fillStyle = S.bossDead.includes(d.key) || (d.chest && d.chest.opened) ? '#6a5a70' : '#b05aff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = '600 13px Alegreya Sans, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(d.name, x, y - 10); ctx.fillStyle = '#e8d0ff'; ctx.fillText(d.name, x, y - 10); });
  S.found.forEach(i => { const r = RUINS[i]; if (!r) return; const x = w2m(r.x) * k, y = w2m(r.z) * k; ctx.fillStyle = r.chest.opened ? '#8a8070' : '#ffd24a'; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 5, y - 5, 10, 10); ctx.font = '600 13px Alegreya Sans, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(r.name, x, y + 20); ctx.fillStyle = '#fff3d0'; ctx.fillText(r.name, x, y + 20); });
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
  if (race) {
    octx.font = '700 30px Cinzel, serif'; octx.lineWidth = 4; octx.strokeStyle = 'rgba(0,0,0,.7)';
    const t = (race.limit - race.t).toFixed(1) + ' s'; octx.strokeText(t, innerWidth / 2, 80); octx.fillStyle = race.limit - race.t < 6 ? '#ff7a5a' : '#ffd24a'; octx.fillText(t, innerWidth / 2, 80);
    octx.font = '600 15px Alegreya Sans, sans-serif'; octx.fillStyle = '#fff3d0'; octx.fillText(race.half ? 'Zurück zum Start!' : 'Zum Ziel am Ostende!', innerWidth / 2, 104);
  }
}

// ============================================================
// Inseln, Schiffe, Dungeons, Höhlen, alte Ruinen, Mythen
// ============================================================
const DOCKS = {};
const DOCK_TITLES = { piraeus: 'Piräus', kreta: 'Kreta', thera: 'Thera', seriphos: 'Seriphos', sirenen: 'die Sireneninsel', ithaka: 'Ithaka' };
const DOCK_PRICE = { piraeus: 10, kreta: 10, thera: 15, seriphos: 15, sirenen: 12, ithaka: 20 };
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
    { key: 'polyphem', name: 'Höhle des Polyphem', sub: 'Hier haust der Zyklop', at: [L.polyphemTor.x, L.polyphemTor.z], theme: 'cave', rooms: 3, enemies: ['wolf'], boss: 'zyklop', bossOver: { name: 'Polyphem', hp: 900, boss: true, money: [150, 150] } },
  ];
  for (const d of defs) { buildDungeonInterior(d); buildEntrance(d); }
  const names = ['Höhle der Nymphen', 'Bärenhöhle', 'Grotte des Pan', 'Höhle der Schatten', 'Kristallhöhle', 'Fledermaushöhle', 'Höhle des Echos'];
  let tries = 0, n = 0;
  const placed = [];
  while (n < names.length && tries < 6000) {
    tries++;
    const x = rr(-900, 700), z = rr(-900, 900), h = heightAt(x, z), sl = slopeAt(x, z);
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
    const x = rr(-900, 700), z = rr(-900, 900), h = heightAt(x, z);
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
  // Thera: weiße Häuser mit blauen Dächern, kleiner Tempel des Hephaistos, Vulkan
  for (let i = 0; i < 9; i++) house(T.x + rr(-24, 24), T.z + rr(-24, 24), Math.floor(rand() * 4) * Math.PI / 2, rr(4.5, 6), rr(4.5, 6), rr(3, 4), { wall: lam(0xf6f2ea), roof: M.blue });
  temple(new Frame(T.x - 4, T.z + 26, Math.PI), 7, 11, 4, 5, 4.5, { tier: 1 });
  { const px = 665, pz = 235, py = heightAt(px, pz); const lava = new THREE.Mesh(G.cyl, lam(0xff5a10, 0xff3a00)); lava.position.set(px, py - 1.2, pz); lava.scale.set(14, 1, 14); scene.add(lava); const lava2 = new THREE.Mesh(G.cone, lam(0xff8a20, 0xff5000)); lava2.position.set(px, py + 1, pz); lava2.scale.set(5, 3, 5); scene.add(lava2); fires.push(lava2); }
  // Seriphos: versteinerte Helden
  for (let i = 0; i < 6; i++) house(Se.x + rr(-22, 22), Se.z + rr(-22, 22), Math.floor(rand() * 4) * Math.PI / 2, rr(5, 6.5), rr(5, 6.5), 3.6);
  let st = 0;
  for (let i = 0; i < 200 && st < 12; i++) { const a = rand() * 6.28, d = rr(35, 95); const x = 620 + Math.cos(a) * d, z = -370 + Math.sin(a) * d; if (heightAt(x, z) < 2 || !isFree(x, z, 3)) continue; statue(x, z, rand() * 6.28, rr(0.9, 1.15), lam(0x8e8a80)); st++; }
  // Sireneninsel: Felsen
  for (let i = 0; i < 16; i++) { const x = Si.x + rr(-50, 50), z = Si.z + rr(-50, 50); if (heightAt(x, z) < 0.5) continue; addStatic(G.rock, lam(0x7a746a), x, heightAt(x, z) + 0.5, z, rand(), rand(), 0, rr(1.5, 4), rr(1.5, 5), rr(1.5, 4)); circleCol(x, z, 2); }
  // Ithaka: Palast des Odysseus
  stoa(new Frame(I.x + 4, I.z - 18, 0), 22, 7, 8, 4.5);
  for (let i = 0; i < 7; i++) house(I.x + rr(-28, 28), I.z + rr(-5, 28), Math.floor(rand() * 4) * Math.PI / 2, rr(5, 6.5), rr(5, 6.5), 3.8);
  fountain(I.x - 8, I.z + 2);
}
function buildIslandNPCs() {
  const names = { thera: 'Fährmann Iason', seriphos: 'Fährmann Glaukos', sirenen: 'Fährmann Nereus', ithaka: 'Fährmann Eumaios' };
  for (const [k, nm] of Object.entries(names)) { const d = DOCKS[k]; if (d) addNPC(nm, d.boatman[0], d.boatman[1], { tunic: 0x6a5a3a, beard: true, pants: 0x3a3024 }, () => talkFerry(k)); }
  const vl = (L, n) => { for (let i = 0; i < n; i++) { let x, z, t = 0; do { x = L.x + rr(-L.r, L.r); z = L.z + rr(-L.r, L.r); t++; } while (t < 20 && heightAt(x, z) < 1); const line = pick(ISLAND_LINES[L === LOCS.thera ? 'thera' : L === LOCS.seriphos ? 'seriphos' : 'ithaka']); addNPC(pick(['Ariadne', 'Phoibe', 'Demetrios', 'Nikolaos', 'Kostas', 'Eirene']), x, z, { tunic: pick([0xe8e0cc, 0x3a5a8a, 0x9b3b2b]), pants: 0x3a3024, beard: rand() < 0.5 }, function () { talk([{ who: this.name, text: line }]); }, 10); } };
  vl(LOCS.thera, 3); vl(LOCS.seriphos, 3); vl(LOCS.ithaka, 3);
  const Si = LOCS.sirenen;
  for (let i = 0; i < 2; i++) { let x, z, t = 0; do { x = Si.x + rr(-12, 12); z = Si.z + rr(-12, 12); t++; } while (t < 20 && heightAt(x, z) < 1); addNPC('Sirene', x, z, { tunic: 0xbfe6f0, pants: 0x8fbcc8, veil: 0xe0f4ff, skin: 0xe8c8b0, wreath: true }, function () { talk([{ who: 'Sirene', text: pick(['♪ Komm näher, Held … bleib bei uns für immer … ♪', '♪ Wir kennen alle Geheimnisse des Meeres … in der Grotte des Poseidon wartet die Skylla … ♪', '♪ Odysseus band sich an den Mast, um uns zu hören. Und du? ♪']) }]); }, 4); }
  const I = LOCS.ithaka;
  addNPC('Penelope', I.x + 4, I.z - 10, { tunic: 0xe8dcc0, pants: 0xc8bca0, veil: 0x6b2f7a, skin: 0xd9a577 }, function () { talk([{ who: 'Penelope', text: 'Seit zwanzig Jahren webe ich und warte auf Odysseus. Er hat den Zyklopen Polyphem geblendet – nun haust das Ungeheuer in einer Höhle im Westen der Insel. Nimm dich in Acht!' }]); });
  addNPC('Chiron, der Kentaur', 60, -540, { model: makeCentaur({ tunic: 0xe8e0cc, beard: true, hair: 0xb8b0a0, body: 0x8a6a4a, weapon: 'staff' }) }, talkChiron);
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
  for (const k of Object.keys(DOCK_TITLES)) { if (k === from || !DOCKS[k]) continue; opts.push({ label: 'Nach ' + DOCK_TITLES[k] + ' segeln (' + DOCK_PRICE[k] + ' Drachmen)', fn: () => sailTo(k, DOCK_PRICE[k]) }); }
  if (!player.hasShip) opts.push({ label: 'Eigenes Schiff kaufen (Schiffsbauer)', fn: buyShip });
  opts.push({ label: 'Nein danke.', fn: () => { } });
  talk([{ who: 'Fährmann', text: from === 'piraeus' ? 'Meine Schiffe fahren zu allen Inseln der Ägäis: Kreta, Thera, Seriphos, die Sireneninsel und Ithaka. Wohin soll es gehen?' : 'Wohin soll ich dich bringen, Wanderer?', opts }]);
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
const NET = { ws: null, id: null, others: new Map(), sendT: 0, retry: 2, lastCloud: 0, chatOpen: false, online: false, room: 'lobby-1', max: 10, towns: null, lobbies: [] };
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
  NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = 0.1;
  const P = player.pos;
  const m = player.sailing ? 's' : player.flying ? 'p' : player.mounted ? 'h' : (player.swimming && player.gear.includes('poseidon')) ? 'k' : '';
  NET.ws.send(JSON.stringify({ t: 'st', x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yaw: +player.yaw.toFixed(3), sp: +Math.min(60, player.speedNow).toFixed(1), m, atk: player.atkAnim > 0.5, d: curD ? curD.idx : -1 }));
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
function setAccount(j) {
  NET.account = { name: j.name, token: j.token, admin: !!j.admin };
  lsSet('hellas-session', JSON.stringify(NET.account));
  if (j.data) lsSet(saveKey(), JSON.stringify(j.data));
  updateMenuAccount();
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
  body.appendChild(row);
  sec('Alle Konten');
  const list = document.createElement('div'); list.className = 'alist'; list.textContent = 'Lade …'; body.appendChild(list);
  try {
    const j = await accCall({ op: 'list', token: NET.account.token }, '/api/admin');
    list.textContent = '';
    for (const a of j.accounts) {
      const r = document.createElement('div'); r.className = 'arow';
      const n = document.createElement('span'); n.textContent = a.name + (a.admin ? ' ★ Admin' : '') + (a.banned ? ' – GEBANNT' : ''); if (a.banned) n.style.color = '#ff7a6a'; r.appendChild(n);
      if (!a.admin) r.appendChild(a.banned ? adminBtn('Entbannen', () => adminBan(a.name, false)) : adminBtn('Bannen', () => { if (confirm(a.name + ' wirklich bannen?')) adminBan(a.name, true); }, 'danger'));
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
  wagen: { name: 'Streitwagen', cost: 450, speed: [30, 46], col: 0xece6dc, chariot: true },
};
const WEAPONS = [
  { name: 'Bronzeschwert', cost: 0, dmg: 0 }, { name: 'Eisenschwert', cost: 80, dmg: 6 },
  { name: 'Kopis (Hiebschwert)', cost: 180, dmg: 12 }, { name: 'Xiphos des Champions', cost: 350, dmg: 20 },
];
const ARMORS = [
  { name: 'Tunika', cost: 0, red: 0, hp: 0 }, { name: 'Leinenpanzer', cost: 70, red: 0.1, hp: 20, col: 0xe8e0cc },
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
const playerDamage = () => (player.dmg + WEAPONS[player.wTier || 0].dmg) * (player.mounted && HORSES[player.horse || 'gaul'].chariot ? 1.3 : 1);

function findSpotNear(L, rMin, rMax, rad) {
  for (let i = 0; i < 400; i++) {
    const a = rand() * 6.283, r = rr(rMin, rMax), x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r;
    if (heightAt(x, z) > 1.2 && isFree(x, z, rad) && roadDist(x, z) > 5 && slopeAt(x, z) < 0.35) return [x, z];
  }
  return null;
}
const TAVERN_NAMES = ['Zum Goldenen Widder', 'Zum Durstigen Zyklopen', 'Die Lachende Amphore', 'Zum Einäugigen Polyphem', 'Zur Weinrebe des Dionysos', 'Zum Fliegenden Pegasus', 'Die Rostige Lanze', 'Zum Schlafenden Kentauren', 'Die Salzige Möwe', 'Zum Bronzenen Stier'];
const KEEPERS = ['Wirt Lysandros', 'Wirtin Agathe', 'Wirt Dorkas', 'Wirtin Myrto', 'Wirt Bion', 'Wirtin Korinna', 'Wirt Phaidon', 'Wirtin Ismene', 'Wirt Kallias', 'Wirtin Nausikaa'];
const RUMORS = [
  'Man sagt, im Hain der Dryaden ganz im Norden liegt ein Schatz – aber die Baumgeister verteidigen ihn.',
  'Im Wald von Nemea haust ein Löwe, dessen Fell kein Schwert durchdringt … fast keines.',
  'Ein riesiger Eber verwüstet die Felder bei Kalydon im Westen.',
  'Die Gelehrten im ganzen Land stellen Fragen. Wer klug antwortet, wird belohnt!',
  'Wenn du zu viele Soldaten erschlägst, schicken die Städte Wachen hinter dir her.',
  'Im Stall in Athen gibt es einen Streitwagen – schnell wie der Wind!',
  'Der Schiffsbauer in Piräus baut die besten Triremen der Ägäis.',
  'In deiner eigenen Stadt kannst du Bürger zu Soldaten ausbilden lassen.',
];
const TAVERNS = [];
function buildServices() {
  const tavernAt = ['athen', 'sparta', 'theben', 'piraeus', 'olympia', 'delphi', 'kreta', 'thera', 'ithaka', 'seriphos'];
  tavernAt.forEach((k, i) => {
    const L = LOCS[k]; const sp = findSpotNear(L, 12, L.r * 1.15, 6.5); if (!sp) return;
    const rot = Math.atan2(L.x - sp[0], L.z - sp[1]);
    const f = house(sp[0], sp[1], rot, 9, 7, 4.6, { wall: lam(0xd8c4a0), roof: M.roof2 });
    if (!f) return;
    f.box(M.wood, 1.8, 2.6, 3.6, 2.2, 0.9, 0.12); f.box(M.red, 1.8, 2.75, 3.68, 1.8, 0.55, 0.05);
    for (const tx of [-3.2, 3.6]) { f.box(M.wood, tx, 0, 6, 1.4, 0.9, 1.0, true); f.put(G.sphere, M.terracotta, tx, 1.1, 6, 0, 0, 0, 0.3, 0.45, 0.3); }
    const [nx, nz] = f.w(0, 5);
    const tv = { name: 'Taverne „' + TAVERN_NAMES[i] + '“', keeper: KEEPERS[i], loc: k };
    const n = addNPC(KEEPERS[i], nx, nz, { tunic: 0x8a5a2a, pants: 0x3a2a1a, beard: i % 2 === 0, veil: i % 2 ? 0xc8b090 : null, hair: 0x3a2a1a }, () => talkTavern(tv));
    n.yaw = rot; tv.x = nx; tv.z = nz; TAVERNS.push(tv);
  });
  for (const k of ['athen', 'sparta', 'olympia', 'theben', 'delphi']) {
    const L = LOCS[k]; const sp = findSpotNear(L, 15, L.r * 1.3, 9); if (!sp) continue;
    reserve(sp[0], sp[1], 9);
    const f = new Frame(sp[0], sp[1], Math.atan2(L.x - sp[0], L.z - sp[1]));
    for (const [px, pz] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) f.box(M.wood, px, 0, pz, 0.3, 3.2, 0.3, true);
    f.put(G.prism, M.roof2, 0, 3.2, 0, 0, 0, 0, 9, 1.4, 6);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; f.box(M.wood, Math.cos(a) * 7, 0.6, Math.sin(a) * 7 + 0.5, 3.4, 0.15, 0.12); }
    ['rappe', 'schimmel', 'gaul'].forEach((h, i) => { const hm = makeHorse(HORSES[h].col); const [hx, hz] = f.w(-3 + i * 3, 0); hm.root.position.set(hx, heightAt(hx, hz), hz); hm.root.rotation.y = f.rot + Math.PI / 2; scene.add(hm.root); });
    const [nx, nz] = f.w(0, 4.5);
    addNPC('Stallmeister', nx, nz, { tunic: 0x6a4a2a, pants: 0x3a2a1a, beard: true, hair: 0x4a3a2a }, talkStable).yaw = f.rot;
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
  const hidden = player.sailing || player.flying || player.adminFly;
  allies.forEach((a, i) => {
    a.m.root.visible = !hidden;
    if (hidden) return;
    a.cd -= dt; a.atk = Math.max(0, a.atk - dt * 2.6);
    if (t - a.lastHit > 6) a.hp = Math.min(a.maxHp, a.hp + dt * 3);
    let tgt = null, best = 18;
    for (const e of enemies) { if (e.dead || e.stoned > 0) continue; const d = Math.hypot(e.x - a.x, e.z - a.z); if (d < best && Math.hypot(e.x - P.x, e.z - P.z) < 30) { best = d; tgt = e; } }
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
function talkStable() {
  const opts = Object.entries(HORSES).map(([k, h]) => {
    const own = player.horses.includes(k);
    return { label: (own ? (player.horse === k ? '✔ ' : 'Reiten: ') : 'Kaufen: ') + h.name + ' – Tempo ' + h.speed[1] + (own ? '' : ' (' + h.cost + ' Drachmen)'), fn: () => {
      if (!own) { if (!spend(h.cost)) return; player.horses.push(k); toast(h.name + ' gehört jetzt dir!', 'gold'); }
      player.horse = k; setHorseModel(); save(); talkStable();
    } };
  });
  opts.push({ label: 'Auf Wiedersehen', fn: () => { } });
  talk([{ who: 'Stallmeister', text: 'Die besten Pferde von Hellas! Dein aktuelles Reittier: ' + HORSES[player.horse].name + '. (R zum Rufen)', opts }]);
}
function makeChariot() {
  const g = new THREE.Group(), horsesM = [];
  for (const s of [-0.5, 0.5]) { const h = makeHorse(0xece6dc, false); h.root.position.set(s, 0, 1.6); g.add(h.root); horsesM.push(h); }
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(1.6, 0.15, 1.3), M.wood, 0, 0.95, -1.3);
  add(new THREE.BoxGeometry(1.6, 0.8, 0.12), M.gold, 0, 1.4, -0.7);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.6, 1.3), M.gold, s * 0.8, 1.25, -1.3);
  const wheels = [];
  for (const s of [-1, 1]) wheels.push(add(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 14), M.darkwood, s * 0.95, 0.65, -1.3, 0, 0, Math.PI / 2));
  add(new THREE.BoxGeometry(0.1, 0.1, 2.6), M.wood, 0, 1.0, 0.4);
  return { root: g, legs: horsesM[0].legs, horses: horsesM, wheels, tail: horsesM[0].tail, phase: 0, chariot: true };
}
function setHorseModel() {
  const vis = horse ? horse.root.visible : false;
  if (horse) scene.remove(horse.root);
  const H = HORSES[player.horse || 'gaul'];
  horse = H.chariot ? makeChariot() : makeHorse(H.col);
  horse.root.visible = vis; scene.add(horse.root);
}
function talkSmith() {
  const opts = [];
  WEAPONS.forEach((w, i) => { if (i > (player.wTier || 0)) opts.push({ label: 'Waffe: ' + w.name + ' (+' + w.dmg + ' Schaden) – ' + w.cost + ' Drachmen', fn: () => { if (spend(w.cost)) { player.wTier = i; toast('Neue Waffe: ' + w.name, 'gold'); save(); } talkSmith(); } }); });
  ARMORS.forEach((a, i) => { if (i > (player.aTier || 0)) opts.push({ label: 'Rüstung: ' + a.name + ' (−' + Math.round(a.red * 100) + ' % Schaden, +' + a.hp + ' Leben) – ' + a.cost + ' Drachmen', fn: () => { if (spend(a.cost)) { player.maxHp += a.hp - ARMORS[player.aTier || 0].hp; player.aTier = i; player.hp = player.maxHp; toast('Neue Rüstung: ' + a.name, 'gold'); refreshHeroLook(); save(); } talkSmith(); } }); });
  opts.push({ label: 'Auf Wiedersehen', fn: () => { } });
  talk([{ who: 'Schmied Hephaistion', text: 'Klirr, klirr! Deine Waffe: ' + WEAPONS[player.wTier || 0].name + ', deine Rüstung: ' + ARMORS[player.aTier || 0].name + '.' + (opts.length === 1 ? ' Du trägst schon das Beste, was ich schmieden kann!' : ' Was soll ich dir schmieden?'), opts }]);
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
  { name: 'Hain der Dryaden', x: -220, z: -680, r: 85, guards: ['dryade', 'dryade', 'satyr', 'dryade'], roam: ['satyr', 'dryade', 'satyr', 'dryade'] },
  { name: 'Wald von Nemea', x: -580, z: 420, r: 80, guards: ['loewe', 'satyr', 'satyr'], roam: ['satyr', 'eber', 'satyr'] },
  { name: 'Kalydonischer Wald', x: -740, z: -140, r: 85, guards: ['eber_boss', 'eber', 'eber'], roam: ['eber', 'satyr', 'eber'] },
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
const QUIZ_NAMES = ['Sokrates', 'Platon', 'Aristoteles', 'Thales', 'Pythagoras', 'Heraklit', 'Demokrit', 'Hypatia', 'Sappho', 'Herodot', 'Thukydides', 'Euklid', 'Archimedes', 'Hippokrates', 'Diogenes', 'Anaxagoras', 'Zenon', 'Epikur', 'Empedokles', 'Parmenides', 'Aspasia', 'Theano', 'Äsop', 'Homer', 'Hesiod', 'Pindar', 'Solon', 'Kleisthenes', 'Xenophon', 'Protagoras'];
const QUIZZERS = [];
function buildQuizNPCs() {
  let tries = 0;
  while (QUIZZERS.length < 30 && tries < 20000) {
    tries++;
    const x = rr(-920, 720), z = rr(-920, 920), h = heightAt(x, z);
    if (h < 2 || h > 90 || slopeAt(x, z) > 0.45 || !isFree(x, z, 3) || inCity(x, z, 0.9)) continue;
    if (QUIZZERS.some(q => Math.hypot(q.x - x, q.z - z) < (tries < 12000 ? 110 : 70))) continue;
    const id = QUIZZERS.length, qr = mulberry32(5000 + id * 97), qs = [];
    while (qs.length < 5) { const k = Math.floor(qr() * QUIZ.length); if (!qs.includes(k)) qs.push(k); }
    const q = { id, x, z, name: QUIZ_NAMES[id], qs };
    reserve(x, z, 2);
    const f = new Frame(x, z, rand() * 6.28); f.box(M.marble2, 0, -0.3, -1.2, 1.4, 0.8, 0.5, true);
    q.npc = addNPC(q.name + ', der Gelehrte', x, z, { tunic: 0xf2ecdc, pants: 0xd8d0c0, beard: id % 3 !== 1, hair: pick([0xb8b0a0, 0x6a5a4a, 0x2a1a0e]), cape: 0x3a5a8a, weapon: 'staff', wreath: id % 2 === 0 }, () => talkQuiz(q));
    QUIZZERS.push(q);
  }
}
function talkQuiz(q) {
  const W = q.name;
  if (S.quiz.includes(q.id)) { talk([{ who: W, text: 'Du hast meine Fragen schon gelöst. Es gibt noch ' + (30 - S.quiz.length) + ' andere Gelehrte in Hellas!' }]); return; }
  talk([{ who: W, text: 'Chaire! Ich bin ' + W + '. Beantworte mir 5 Fragen über Griechenland – für jede richtige Antwort gibt es Drachmen!', opts: [
    { label: 'Ich bin bereit!', fn: () => askQuiz(q, 0, 0) }, { label: 'Später', fn: () => { } }] }]);
}
function askQuiz(q, i, correct) {
  const W = q.name;
  if (i >= 5) {
    const reward = correct * 12 + (correct === 5 ? 40 : 0);
    const pages = [{ who: W, text: correct + ' von 5 richtig! ' + (correct === 5 ? 'Perfekt – du bist ein wahrer Weiser!' : correct >= 3 ? 'Gut gemacht!' : 'Komm wieder, wenn du mehr weißt.'), fn: () => {
      if (reward) addMoney(reward);
      if (correct === 5) { player.potions++; toast('+1 Ambrosia', 'gold'); }
      if (correct >= 3) { S.quiz.push(q.id); toast('Rätsel gelöst: ' + S.quiz.length + '/30 Gelehrte', 'gold'); if (S.quiz.length === 30) banner('MEISTER DES WISSENS', 'Du hast alle 30 Gelehrten überzeugt!'); }
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
  for (const [x, z] of [[150, -460], [175, -480], [140, -490], [-520, -160], [-555, -185], [-480, 430]]) put('zentaur', x, z);
  for (const [x, z] of [[-850, 365], [210, -575], [-660, -420]]) put('zyklop', x, z);
  const Si = LOCS.sirenen;
  for (let i = 0; i < 4; i++) put('harpyie', Si.x + rr(-35, 35), Si.z + rr(-35, 35));
  for (let i = 0; i < 3; i++) put('harpyie', -470 + rr(-30, 30), -410 + rr(-30, 30));
  for (let i = 0; i < 3; i++) put('skelett', LOCS.seriphos.x + rr(20, 60), LOCS.seriphos.z + rr(-60, -20));
  for (const F of MYTH_FORESTS) for (const t of F.roam) put(t, F.x + rr(-F.r * 0.7, F.r * 0.7), F.z + rr(-F.r * 0.7, F.r * 0.7));
}

// ============================================================
// Eingabe
// ============================================================
addEventListener('keydown', (e) => {
  if (!started) return;
  const k = e.code;
  if (NET.chatOpen) { if (k === 'Enter') closeChat(true); if (k === 'Escape') closeChat(false); return; }
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
  if (adminOpen) return;
  if (k === 'KeyT') toggleFly();
  if (k === 'KeyB') toggleShip();
  if (k === 'KeyG') medusaHead();
  if (k === 'KeyM') { mapOpen = !mapOpen; $('bigmap').classList.toggle('hidden', !mapOpen); if (mapOpen) showLeaderboard(); }
  if (k === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', (e) => {
  if (!started) return;
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
document.addEventListener('pointerlockchange', () => { paused = started && document.pointerLockElement !== canvas && !dialog && !mapOpen && !adminOpen && !NET.chatOpen; $('pause').classList.toggle('hidden', !paused); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); resizeOverlay(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; });

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
  const canMove = !dialog && !player.dead && !mapOpen && !adminOpen && !NET.chatOpen && !(player.stoned > 0);
  if (canMove) {
    if (keys.KeyW || keys.ArrowUp) _mv.add(_fwd);
    if (keys.KeyS || keys.ArrowDown) _mv.sub(_fwd);
    if (keys.KeyD || keys.ArrowRight) _mv.add(_right);
    if (keys.KeyA || keys.ArrowLeft) _mv.sub(_right);
  }
  player.blocking = canMove && mouse.right && !player.mounted && !player.swimming;
  const moving = _mv.lengthSq() > 0;
  if (moving) _mv.normalize();
  const sprint = (keys.ShiftLeft || keys.ShiftRight) && moving && player.stamina > 1 && !player.blocking;
  if (player.adminFly) { updateAdminFly(dt, moving, sprint, canMove); return; }
  if (player.sailing) { updateSailing(dt, moving, sprint); return; }
  if (player.flying) { updateFlying(dt, moving, sprint, canMove); return; }
  const hasHippo = player.gear.includes('poseidon');
  const HS = HORSES[player.horse || 'gaul'].speed;
  let speed = player.mounted ? (sprint ? HS[1] : HS[0]) : (sprint ? 12.5 : 7);
  if (player.swimming) speed = hasHippo ? (sprint ? 36 : 26) : (sprint ? 6 : 4);
  if (player.blocking) speed = 3.2;
  if (player.relics.includes('hermes')) speed *= 1.2;
  const stMul = player.relics.includes('herakles') ? 0.5 : 1;
  if (sprint && !player.mounted) player.stamina = Math.max(0, player.stamina - dt * 22 * stMul);
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
    if (canMove && keys.Space && player.onGround) { player.vy = player.mounted ? 12 : 10.5; player.onGround = false; }
  }
  // Regeneration
  if (!player.dead && clock.elapsedTime - player.lastHurt > 6 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + dt * 4);
  // Modell
  const hy = player.mounted ? 1.3 : 0;
  const riding = player.swimming && hasHippo;
  hero.root.position.set(P.x, P.y + hy + (riding ? 1.0 : player.swimming ? -0.85 : 0), P.z);
  hero.root.rotation.y = player.yaw;
  animateHumanoid(hero, player.mounted || riding ? 0 : player.speedNow, dt, { attack: player.atkAnim, block: player.blocking, sitting: player.mounted || riding });
  hippo.root.visible = riding; if (riding) { hippo.root.position.set(P.x, P.y - 0.4, P.z); hippo.root.rotation.y = player.yaw; animateQuad(hippo, player.speedNow * 0.4, dt); }
  pegasus.root.visible = false; ship.root.visible = false;
  if (player.swimming && !riding) { hero.armL.rotation.x = -2.6 + Math.sin(clock.elapsedTime * 4) * 0.6; hero.armR.rotation.x = -2.6 - Math.sin(clock.elapsedTime * 4) * 0.6; }
  if (player.mounted) {
    horse.root.position.set(P.x, P.y, P.z); horse.root.rotation.y = player.yaw;
    if (horse.horses) { for (const hh of horse.horses) animateQuad(hh, player.speedNow * 0.6, dt); for (const w of horse.wheels) w.rotation.x += player.speedNow * dt / 0.65; hero.root.position.set(P.x - Math.sin(player.yaw) * 1.3, P.y + 1.0, P.z - Math.cos(player.yaw) * 1.3); animateHumanoid(hero, 0, dt, { attack: player.atkAnim }); }
    else animateQuad(horse, player.speedNow * 0.6, dt);
  }
  // Rennen
  if (race) {
    race.t += dt;
    const [ex, ez] = SPOTS.raceEnd, [sx, sz] = SPOTS.raceStart;
    if (!race.half && Math.abs(P.x - ex) < 2.5 && Math.abs(P.z - ez) < 11) { race.half = true; toast('Wende! Zurück zum Start!', 'gold'); sfx('coin'); }
    if (race.half && Math.abs(P.x - sx) < 2.5 && Math.abs(P.z - sz) < 11) {
      const t = race.t; race = null;
      const first = !S.raceBest;
      if (!S.raceBest || t < S.raceBest) S.raceBest = t;
      banner('SIEG IN OLYMPIA!', 'Deine Zeit: ' + t.toFixed(1) + ' Sekunden');
      addMoney(first ? 50 : 20); save();
    } else if (race && race.t > race.limit) { race = null; toast('Zu langsam! Sprich erneut mit dem Kampfrichter.'); }
    if (race && player.mounted) { race = null; toast('Disqualifiziert – kein Pferd im Stadion!'); }
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
  const tgt = new V3(P.x, P.y + (player.sailing ? 3.5 : player.mounted || player.flying ? 3.0 : 1.75) + (player.swimming && !player.gear.includes('poseidon') ? -0.6 : 0), P.z);
  let dist = (player.sailing ? 17 : player.flying ? 11 : player.mounted ? 9 : 6.5) * camZoom;
  const dx = Math.sin(camYaw) * Math.cos(camPitch), dy = Math.sin(camPitch), dz = Math.cos(camYaw) * Math.cos(camPitch);
  for (let k = 0.12; k <= 1.0001; k += 0.08) { if (camBlocked(tgt.x + dx * dist * k, tgt.y + dy * dist * k, tgt.z + dz * dist * k)) { dist *= Math.max(0.12, k - 0.1); break; } }
  const cx = tgt.x + dx * dist, cz = tgt.z + dz * dist;
  let cy = tgt.y + dy * dist;
  if (curD) cy = Math.min(cy, curD.O.y + curD.H - 0.8);
  else cy = Math.max(cy, heightAt(cx, cz) + 0.6, 0.4);
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
    updateRemotes(dt); netSend(dt); updateAllies(dt); updateWanted(dt);
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
    S.quiz = S.quiz || [];
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
  started = true;
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  updateQuestText();
  camYaw = 0; camPitch = 0.3; if (!sv) player.yaw = Math.PI;
  if (sv) for (const d of DUNGEONS) if (Math.hypot(player.pos.x - d.at[0], player.pos.z - d.at[1]) < 12) { const r = downhillRot(d.at[0], d.at[1]); camYaw = r + Math.PI; player.yaw = r; }
  canvas.requestPointerLock && canvas.requestPointerLock();
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
  buildTownBases(); buildRuins(); buildOldRuins(); buildDungeons(); buildMythForests(); buildServices(); buildQuizNPCs();
  buildVegetation();
  finalizeStatic();
  buildClouds();
  hero = makeHumanoid(heroLook()); scene.add(hero.root);
  horse = makeHorse(); horse.root.visible = false; scene.add(horse.root);
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
  setupMenuNet();
  $('btnNew').onclick = () => startGame(false);
  $('btnLoad').onclick = () => startGame(true);
  window.__hellas = { allies, TAVERNS, QUIZZERS, MYTH_FORESTS, setWanted, addCrime, spawnAlly, acceptBounty, toggleAdmin, renderAdmin, setAccount, roadDist, NET, DUNGEONS, DOCKS, enterDungeon, exitDungeon, gainGear, toggleShip, toggleFly, curD: () => curD, CHESTS, RUINS, talkTown, foundTown, upgradeTown, townsState, syncTowns, cam: () => [camYaw, camPitch], renderer, player, S, enemies, npcs, LOCS, SPOTS, heightAt, setStage, startGame, pickups, docks: () => [piraeusDock, kretaDock] };
  loop();
}
setTimeout(init, 30);
})();
