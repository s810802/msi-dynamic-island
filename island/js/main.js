import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { createIslandTerrain } from "./runtime-kit/terrain.mjs";
import { createIslandPath } from "./runtime-kit/paths.mjs";
import { createIslandWater } from "./runtime-kit/water.mjs";
import { SERIES, ISLANDS, OFFICIAL } from "./data.js";
import { THEMES, FAMILY_LIST, DEFAULT_THEME_ID } from "./themes.js";
import { makeMaterials, buildLandmark, buildTree, buildResident, createGuardian, buildLamp, buildAnimal, makeGlowTexture } from "./landmarks.js";
import { createSky } from "./sky.js";
import { createMusic } from "./music.js";
import { createBillboard } from "./billboard.js";
import { makeGait, stepGait } from "./gait.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const WATER = -0.24;

/* ---------- 世界配置(座標以世界單位計) ---------- */
// plateau: [x, y, z, 半徑, 承載的系列 id 或 null];y=0.9 是通往橋的低平台
const WORLD = {
  core: {
    outline: [[-11, -3], [-9, -7.5], [-3, -9], [4, -8.5], [9.5, -6], [12, -1], [11, 4], [6, 7], [-1, 7], [-7, 6.5], [-11, 3]],
    plateaus: [
      [-7, 3.0, -2.5, 1.7, "titan"], [-3.5, 3.0, -4.5, 1.7, "raider"], [1.5, 2.0, -5, 1.6, "stealth"],
      [6.5, 3.0, -3, 1.6, "katana"], [-5, 2.0, 2.5, 1.6, "vector"], [2, 3.0, 2.5, 1.6, "cyborg"],
      [-10, 0.9, 0.5, 1.0, null], [10, 0.9, 1.5, 1.0, null], [-1, 0.9, 5.2, 1.0, null],
    ],
  },
  creator: {
    outline: [[16.2, -3], [19, -6], [24, -6.5], [27.5, -3.5], [28, 1.5], [25, 5], [20, 5.5], [16.2, 3]],
    plateaus: [[17.4, 0.9, 0, 1.0, null], [23.5, 1.6, 0, 1.5, "creator"]],
  },
  business: {
    outline: [[-6.5, 11.8], [-1.5, 10.8], [3.5, 11.8], [5.5, 15.5], [4, 20], [-1, 21.5], [-6, 19.5], [-7.5, 15.5]],
    plateaus: [[-1.2, 0.9, 12.8, 1.0, null], [-1.5, 1.6, 17, 1.5, "prestige"]],
  },
  daily: {
    outline: [[-28, -1], [-24, -4], [-19, -3.5], [-16.2, 0], [-16.6, 4.5], [-21, 7], [-26, 6], [-29, 3]],
    plateaus: [[-17.8, 0.9, 0.8, 1.0, null], [-22.5, 1.6, 1.5, 1.5, "modern"]],
  },
};
// 橋:from/to 為兩岸的走路表面落點
const BRIDGES = [
  { id: "core-creator", from: "core", to: "creator", a: [10.8, 0.9, 1.5], b: [16.9, 0.9, 0.0] },
  { id: "core-business", from: "core", to: "business", a: [-1.0, 0.9, 6.0], b: [-1.2, 0.9, 12.0] },
  { id: "core-daily", from: "core", to: "daily", a: [-10.4, 0.9, 0.5], b: [-17.0, 0.9, 0.6] },
];
// 居民行走節點與島內道路
const NODES = {
  dockW: [-10, 0.5], A: [-7, -0.6], B: [-3.5, -2.6], C: [1.5, -3.1], D: [6.5, -1.1], dockE: [10, 1.5],
  F: [2, 4.4], dockS: [-1, 5.2], E: [-5, 4.4],
  dockC: [17.4, 0], C2: [21, 3.5], standC: [23.5, 1.7],
  dockB: [-1.2, 12.8], B2: [2, 15], standB: [-1.5, 18.7],
  dockD: [-17.8, 0.8], D2: [-21, 4], standD: [-22.5, 3.2],
};
const EDGES = [
  ["dockW", "A"], ["dockW", "E"], ["A", "B"], ["B", "C"], ["C", "D"], ["D", "dockE"], ["dockE", "F"], ["F", "dockS"], ["dockS", "E"],
  ["dockC", "C2"], ["C2", "standC"], ["dockB", "B2"], ["B2", "standB"], ["dockD", "D2"], ["D2", "standD"],
  ["dockE", "dockC", "core-creator"], ["dockS", "dockB", "core-business"], ["dockW", "dockD", "core-daily"],
];
const GUARDIAN_POS = [14, WATER, 12.5];
const BOUNDS = { min: new THREE.Vector3(-30, -1, -10), max: new THREE.Vector3(29, 10, 23) };

/* ---------- 引擎 ---------- */
const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.38;
controls.minZoom = 0.7; controls.maxZoom = 5;
controls.screenSpacePanning = false;

const hemi = new THREE.HemisphereLight("#fffcf0", "#6b8f85", 1.8);
const key = new THREE.DirectionalLight("#fff4d9", 2.2);
key.position.set(-14, 28, 14); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -50, right: 50, top: 40, bottom: -40, near: 1, far: 120 });
key.shadow.bias = -0.0006;
const fill = new THREE.DirectionalLight("#cde9ef", 0.65);
fill.position.set(20, 10, -20);
scene.add(hemi, key, fill);

const mats = makeMaterials(THREE);
const water = createIslandWater(THREE, { size: 500, height: WATER, nearDistance: 14, farDistance: 80 });
scene.add(water.mesh);
const world = new THREE.Group(); world.name = "world-root"; scene.add(world);

/* ---------- 島嶼 ---------- */
const terrains = {};
const landmarks = {};
const landmarkList = [];
for (const [id, def] of Object.entries(WORLD)) {
  const t = createIslandTerrain(THREE, {
    id, outline: def.outline, height: 0.9, waterLevel: WATER,
    plateaus: def.plateaus.map(p => ({ position: [p[0], p[1], p[2]], radius: p[3] })),
  });
  world.add(t.group); terrains[id] = t;
  for (const p of def.plateaus) if (p[4]) {
    const lm = buildLandmark(THREE, p[4], mats);
    lm.position.set(p[0], p[1], p[2]); lm.rotation.y = 0.45;
    world.add(lm); landmarks[p[4]] = lm; landmarkList.push(lm);
  }
}
const surfaceY = (x, z) => {
  for (const t of Object.values(terrains)) { const y = t.surfaceAt(x, z); if (y !== null) return y; }
  return null;
};

/* 橋 */
const paths = {};
for (const b of BRIDGES) {
  for (const [island, pt] of [[b.from, b.a], [b.to, b.b]]) {
    if (terrains[island].surfaceAt(pt[0], pt[2]) === null) throw new Error(`${b.id}: 落點不在 ${island} 的陸地上`);
  }
  const p = createIslandPath(THREE, { id: b.id, fromIslandId: b.from, toIslandId: b.to, from: b.a, to: b.b, width: 1.3, kind: "bridge", colors: { deck: "#bd986e", rail: "#ead9b1", post: "#bd986e" } });
  world.add(p.group); paths[b.id] = p;
}

/* 道路:共用同一份折線給走路的居民與貼地的路面 */
function landLine(a, b, bend = 0) {
  const pts = [];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 0.35));
  const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
  for (let i = 0; i <= n; i++) {
    const u = i / n, off = Math.sin(u * Math.PI) * bend;
    const x = a[0] + (b[0] - a[0]) * u + nx * off, z = a[1] + (b[1] - a[1]) * u + nz * off;
    const y = surfaceY(x, z) ?? pts.at(-1)?.y ?? 1;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}
const edges = [];
EDGES.forEach(([from, to, bridgeId], i) => {
  let pts, landParts;
  if (bridgeId) {
    const br = BRIDGES.find(b => b.id === bridgeId), p = paths[bridgeId];
    const a = landLine(NODES[from], [br.a[0], br.a[2]]);
    const mid = Array.from({ length: 25 }, (_, k) => p.pointAt(k / 24).clone());
    const c = landLine([br.b[0], br.b[2]], NODES[to]);
    pts = [...a, ...mid, ...c]; landParts = [a, c];
  } else {
    const bend = (i % 2 ? 1 : -1) * (from.startsWith("dock") && !"CDB".includes(to[0]) ? 0.0 : 0.35);
    pts = landLine(NODES[from], NODES[to], bend); landParts = [pts];
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
  edges.push({ from, to, pts, cum, len: cum.at(-1), landParts });
});

/* 貼地路面 */
const roadMat = new THREE.MeshStandardMaterial({ color: "#fff5dc", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
mats.road = roadMat;
for (const e of edges) for (const part of e.landParts) {
  if (part.length < 2) continue;
  const pos = [], idx = [];
  part.forEach((p, i) => {
    const prev = part[Math.max(0, i - 1)], next = part[Math.min(part.length - 1, i + 1)];
    const tx = next.x - prev.x, tz = next.z - prev.z, l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l * 0.34, nz = tx / l * 0.34;
    for (const s of [-1, 1]) {
      const x = p.x + nx * s, z = p.z + nz * s;
      pos.push(x, (surfaceY(x, z) ?? p.y) + 0.05, z);
    }
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, roadMat); road.receiveShadow = true; world.add(road);
}

/* 樹木與石頭 */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(7);
const routePts = edges.flatMap(e => e.pts);
const lmCenters = Object.values(WORLD).flatMap(d => d.plateaus.filter(p => p[4]).map(p => p));
const trees = [];
for (const [id, def] of Object.entries(WORLD)) {
  const xs = def.outline.map(p => p[0]), zs = def.outline.map(p => p[1]);
  const want = id === "core" ? 46 : 16;
  for (let tries = 0, got = 0; tries < 400 && got < want; tries++) {
    const x = Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs));
    const z = Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs));
    const ring = [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]];
    if (!terrains[id].contains(x, z) || ring.some(([dx, dz]) => !terrains[id].contains(x + dx, z + dz))) continue;
    if (lmCenters.some(p => Math.hypot(p[0] - x, p[2] - z) < p[3] + 1.5)) continue;
    if (Object.values(WORLD).some(d => d.plateaus.some(p => !p[4] && Math.hypot(p[0] - x, p[2] - z) < 2.2))) continue;
    if (routePts.some(p => Math.hypot(p.x - x, p.z - z) < 1.0)) continue;
    const tr = buildTree(THREE, mats, rand() > 0.5);
    tr.position.set(x, terrains[id].surfaceAt(x, z), z); tr.scale.setScalar(0.8 + rand() * 0.6); tr.rotation.y = rand() * 6;
    world.add(tr); trees.push(tr); got++;
  }
}

/* 居民 */
const adj = {};
edges.forEach((e, i) => {
  (adj[e.from] ??= []).push({ edge: i, to: e.to, dir: 1 });
  (adj[e.to] ??= []).push({ edge: i, to: e.from, dir: -1 });
});
const SHIRTS = ["#e0443b", "#4f8fb5", "#f4c24f", "#7bc96f", "#c46bd1", "#f0a35e", "#6b7bd6", "#4fb0a0", "#d86a8a", "#8c8f99"];
const SKINS = ["#f1c9a5", "#d9a37b", "#a8744f", "#f6d7bd", "#7b5339"];
const HAIRS = ["#3a2a22", "#6b4630", "#1f1f24", "#a0522d", "#caa56c"];
const startNodes = ["dockW", "A", "C", "D", "F", "E", "standC", "standB", "standD", "dockE"];
const residents = startNodes.map((node, i) => {
  const obj = buildResident(THREE, SHIRTS[i % SHIRTS.length], SKINS[i % SKINS.length], HAIRS[(i * 2) % HAIRS.length]);
  obj.scale.setScalar(1.15);
  world.add(obj);
  const r = { obj, node, edge: null, dir: 1, s: 0, dwell: rand() * 3, speed: 0.8 + rand() * 0.6, last: -1, phase: rand() * 6, gait: makeGait(), turn: 1, chat: false, faceTo: null };
  const p = NODES[node]; obj.position.set(p[0], surfaceY(p[0], p[1]) ?? 1, p[1]);
  return r;
});
function stepResident(r, dt) {
  if (r.dwell > 0) { r.dwell -= dt; idleFace(r, dt); stepGait(r.obj, r.gait, dt, 0, { chat: r.chat }); return; }
  r.chat = false; r.faceTo = null;
  if (r.edge === null) {
    const options = adj[r.node];
    const forward = options.filter(o => o.edge !== r.last);
    const pick = (forward.length ? forward : options)[Math.floor(rand() * (forward.length || options.length))];
    r.edge = pick.edge; r.dir = pick.dir; r.s = 0; r.target = pick.to;
  }
  const e = edges[r.edge];
  stepGait(r.obj, r.gait, dt, r.speed * Math.min(1, Math.max(0.3, (e.len - r.s) / 0.9)) * r.turn);
  r.s += r.gait.v * dt;
  const dist = r.dir > 0 ? Math.min(r.s, e.len) : Math.max(e.len - r.s, 0);
  let k = 1;
  while (k < e.cum.length - 1 && e.cum[k] < dist) k++;
  const u = (dist - e.cum[k - 1]) / Math.max(1e-6, e.cum[k] - e.cum[k - 1]);
  const a = e.pts[k - 1], b = e.pts[k];
  r.obj.position.lerpVectors(a, b, Math.min(1, Math.max(0, u)));
  const hx = (b.x - a.x) * r.dir, hz = (b.z - a.z) * r.dir;
  if (hx || hz) {
    const want = Math.atan2(hx, hz);
    let d = want - r.obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    r.obj.rotation.y += d * Math.min(1, dt * 6);
    r.turn = Math.abs(d) > 0.9 ? 0.4 : 1;
  }
  if (r.s >= e.len) { r.node = r.target; r.last = r.edge; r.edge = null; r.dwell = 1.5 + rand() * 4; startChat(r); }
}
/* 看門獸 */
const guardian = createGuardian(THREE, mats);
guardian.root.position.set(...GUARDIAN_POS);
world.add(guardian.root);

/* 路燈(夜晚亮起) */
const glowTexture = makeGlowTexture(THREE);
const lamps = [];
for (const [name, [x, z]] of Object.entries(NODES)) {
  if (name.startsWith("dock") && name !== "dockW") continue;
  for (const [dx, dz] of [[0.9, 0.9]]) {
    const y = surfaceY(x + dx, z + dz); if (y === null) continue;
    const lamp = buildLamp(THREE, mats, glowTexture);
    lamp.position.set(x + dx, y, z + dz); world.add(lamp); lamps.push(lamp);
  }
}
for (const b of BRIDGES) for (const t of [0.25, 0.75]) {  // 橋頭兩側各一盞
  const p = paths[b.id].pointAt(t);
  const lamp = buildLamp(THREE, mats, glowTexture);
  lamp.position.set(p.x, p.y + 0.02, p.z + 0.7); world.add(lamp); lamps.push(lamp);
}

/* 天空 */
const sky = createSky(THREE, mats);
world.add(sky.group);

/* 自由走動的人與動物:在整片陸地上隨意散步,避開地標 */
const lmList = Object.values(WORLD).flatMap(d => d.plateaus.filter(p => p[4]));
const nearLandmark = (x, z, pad) => lmList.some(p => Math.hypot(p[0] - x, p[2] - z) < 1.7 + pad);
function lineClear(island, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.4));
  for (let i = 0; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
    if (!terrains[island].contains(x, z) || nearLandmark(x, z, 0.2)) return false;
  }
  return true;
}
function randomSpot(island) {
  const o = WORLD[island].outline, xs = o.map(p => p[0]), zs = o.map(p => p[1]);
  for (let i = 0; i < 80; i++) {
    const x = Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs));
    if (terrains[island].contains(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => terrains[island].contains(x + dx * 0.6, z + dz * 0.6)) && !nearLandmark(x, z, 0.4)) return [x, z];
  }
  return null;
}
const roamers = [];
function addRoamer(island, obj, speed, scale = 1) {
  const spot = randomSpot(island); if (!spot) return;
  obj.scale.setScalar(scale); world.add(obj);
  obj.position.set(spot[0], terrains[island].surfaceAt(spot[0], spot[1]) ?? 1, spot[1]);
  obj.rotation.y = rand() * 6;
  roamers.push({ obj, island, speed, tx: null, tz: null, dwell: rand() * 3, phase: rand() * 6, gait: makeGait(), turn: 1, chat: false, faceTo: null });
}
[["core", 4], ["creator", 1], ["business", 1], ["daily", 1]].forEach(([isl, n]) => {
  for (let i = 0; i < n; i++) addRoamer(isl, buildResident(THREE, SHIRTS[(i + 3 + isl.length) % SHIRTS.length], SKINS[(i + 1) % SKINS.length], HAIRS[(i + 2) % HAIRS.length]), 0.55 + rand() * 0.4, 1.15);
});
[["core", "sheep", 5, 0.45, 1], ["daily", "sheep", 2, 0.4, 1], ["core", "dog", 2, 1.0, 1], ["business", "dog", 1, 0.9, 1],
 ["creator", "cat", 1, 0.6, 1], ["daily", "cat", 1, 0.6, 1], ["business", "cat", 1, 0.6, 1]].forEach(([isl, kind, n, sp, sc]) => {
  for (let i = 0; i < n; i++) addRoamer(isl, buildAnimal(THREE, kind), sp * (0.8 + rand() * 0.4), sc);
});
function stepRoamer(r, dt) {
  if (r.dwell > 0) { r.dwell -= dt; idleFace(r, dt); stepGait(r.obj, r.gait, dt, 0, { chat: r.chat }); return; }
  r.chat = false; r.faceTo = null;
  const p = r.obj.position;
  if (r.tx === null) {
    for (let i = 0; i < 20; i++) {
      const spot = randomSpot(r.island);
      if (spot && Math.hypot(spot[0] - p.x, spot[1] - p.z) > 1.5 && lineClear(r.island, p.x, p.z, spot[0], spot[1])) { r.tx = spot[0]; r.tz = spot[1]; break; }
    }
    if (r.tx === null) { r.dwell = 1 + rand() * 2; return; }
  }
  const dx = r.tx - p.x, dz = r.tz - p.z, d = Math.hypot(dx, dz);
  if (d < 0.12) { r.tx = null; r.dwell = 1.5 + rand() * 5; startChat(r); stepGait(r.obj, r.gait, dt, 0); return; }
  stepGait(r.obj, r.gait, dt, r.speed * Math.min(1, Math.max(0.3, d / 0.9)) * r.turn);
  const mv = Math.min(d, r.gait.v * dt);
  p.x += dx / d * mv; p.z += dz / d * mv;
  p.y = terrains[r.island].surfaceAt(p.x, p.z) ?? p.y;
  let da = Math.atan2(dx, dz) - r.obj.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
  r.obj.rotation.y += da * Math.min(1, dt * 5);
  r.turn = Math.abs(da) > 0.9 ? 0.4 : 1;
}
/* 停下來時:附近有別人就轉過去面對面聊天;否則自己東張西望 */
function nearestPerson(r) {
  let best = null, bd = 2.4;
  for (const o of [...residents, ...roamers]) {
    if (o === r || !o.obj.userData.limbs || (o.mode && o.mode !== "roam")) continue;
    const d = Math.hypot(o.obj.position.x - r.obj.position.x, o.obj.position.z - r.obj.position.z);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function startChat(r) {
  const o = r.obj.userData.limbs ? nearestPerson(r) : null;
  if (!o) return;
  r.faceTo = Math.atan2(o.obj.position.x - r.obj.position.x, o.obj.position.z - r.obj.position.z); r.chat = true;
  if (o.dwell !== undefined && o.dwell < 3) o.dwell = 3 + rand() * 2;   // 對方也停下來聊一下
}
function idleFace(r, dt) {
  if (r.faceTo === null) return;
  let da = r.faceTo - r.obj.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
  r.obj.rotation.y += da * Math.min(1, dt * 3);
}

/* 海面上游動的鴨子 */
const ducks = [[-6, -14, 3, 0.18], [8, -13, 3, -0.15], [24, 10, 3, 0.2], [-15, -8, 2.6, -0.17], [10, 19, 2.4, 0.16]].flatMap(([cx, cz, R, sp], g) =>
  Array.from({ length: 2 }, (_, i) => {
    const obj = buildAnimal(THREE, "duck"); obj.scale.setScalar(1.3); world.add(obj);
    return { obj, cx, cz, R: R + i * 0.6, sp, a: rand() * 6.28 + i * 1.5 };
  }));
function stepDucks(dt, t) {
  for (const d of ducks) {
    d.a += d.sp * dt;
    const x = d.cx + Math.cos(d.a) * d.R, z = d.cz + Math.sin(d.a) * d.R;
    d.obj.position.set(x, WATER + 0.02 + Math.sin(t * 2 + d.a * 3) * 0.03, z);
    d.obj.rotation.y = Math.atan2(-Math.sin(d.a) * Math.sign(d.sp), Math.cos(d.a) * Math.sign(d.sp));
    d.obj.rotation.z = Math.sin(t * 2 + d.a * 3) * 0.05;
  }
}

/* ---------- 海龍接駁:海龍在島間巡游,沿岸停靠,載小人上下背 ---------- */
const HARBORS = [
  { name: "電競島(西南灣)", island: "core", stop: [-10.6, 8.0], shore: [-8.4, 4.5] },
  { name: "日常島", island: "daily", stop: [-20.5, 9.8], shore: [-21, 6.2] },
  { name: "商務島", island: "business", stop: [8.6, 16.8], shore: [4.4, 16.8] },
  { name: "創作島", island: "creator", stop: [23, 8.6], shore: [23, 4.4] },
  { name: "電競島(東南灣)", island: "core", stop: [10.8, 7.8], shore: [9.1, 4.4] },
];
const LEG_PTS = [
  [[-10.6, 8.0], [-15, 9.4], [-20.5, 9.8]],
  [[-20.5, 9.8], [-16, 17], [-8, 24.5], [2, 26], [9, 22], [8.6, 16.8]],
  [[8.6, 16.8], [15, 12], [22, 10.5], [23, 8.6]],
  [[23, 8.6], [17, 9], [10.8, 7.8]],
];
const legs = LEG_PTS.map(pts => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  return { curve, len: curve.getLength() };
});
const people = roamers.filter(r => r.obj.userData.limbs);
people.forEach(r => { r.mode = "roam"; });
const SEATS = 3, SEAT_TMP = new THREE.Vector3(), HOP = 0.9;
const ferry = { leg: 2, dir: 1, u: 0.3, state: "sail", timer: 0, stop: 2, heading: 0, riders: Array(SEATS).fill(null), speed: 1.7 };
const tan = new THREE.Vector3(), pt = new THREE.Vector3();
const headingOf = (leg, u, dir) => { legs[leg].curve.getTangentAt(Math.min(1, Math.max(0, u)), tan); return Math.atan2(-tan.z * dir, tan.x * dir); };
ferry.heading = headingOf(ferry.leg, ferry.u, ferry.dir);

function nextLegAfter(stopIdx) {
  if (stopIdx === HARBORS.length - 1) ferry.dir = -1;
  else if (stopIdx === 0) ferry.dir = 1;
  ferry.leg = ferry.dir > 0 ? stopIdx : stopIdx - 1;
  ferry.u = ferry.dir > 0 ? 0 : 1;
}
const seatPos = (i, out) => guardian.seat(i, out, SEATS);
function setSitting(r, sit) {
  const l = r.obj.userData.limbs;
  l.legL.rotation.x = l.legR.rotation.x = sit ? -1.3 : 0;
  l.armL.rotation.x = l.armR.rotation.x = sit ? -0.4 : 0;
}
function dock(stopIdx) {
  ferry.state = "dock"; ferry.timer = 9; ferry.stop = stopIdx;
  const h = HARBORS[stopIdx];
  nextLegAfter(stopIdx);
  // 下船:目的地到了就跳回岸上
  ferry.riders.forEach((r, i) => {
    if (r && r.dest === stopIdx) {
      let sx = h.shore[0] + (rand() - 0.5) * 1.2, sz = h.shore[1] + (rand() - 0.5) * 1.2;
      if (!terrains[h.island].contains(sx, sz)) { sx = h.shore[0]; sz = h.shore[1]; }
      Object.assign(r, { mode: "hopOut", t: -i * 0.6, to: [sx, sz], island: h.island, seat: i });
      ferry.riders[i] = null;
    }
  });
  // 上船:同島的自由散步小人走到岸邊
  const dist = r => Math.hypot(r.obj.position.x - h.shore[0], r.obj.position.z - h.shore[1]);
  const free = people.filter(r => r.mode === "roam" && r.island === h.island).sort((a, b) => dist(a) - dist(b));
  const seatsLeft = ferry.riders.filter(r => !r).length;
  for (const r of free.slice(0, Math.min(2, seatsLeft))) {
    r.dest = Math.min(HARBORS.length - 1, Math.max(0, stopIdx + ferry.dir * (1 + Math.floor(rand() * 2))));
    if (r.dest === stopIdx) r.dest = stopIdx + (stopIdx === 0 ? 1 : -1);
    Object.assign(r, { mode: "toShore", wait: [h.shore[0] + (rand() - 0.5), h.shore[1] + (rand() - 0.5)], harbor: stopIdx });
  }
}
function updatePeople(dt) {
  for (const r of people) {
    const p = r.obj.position;
    if (r.mode === "toShore") {
      const [tx, tz] = r.wait, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (ferry.state !== "dock" || ferry.stop !== r.harbor) { r.mode = "roam"; r.tx = null; r.dwell = 1; continue; }
      if (d > 0.25) {
        const mv = Math.min(d, 1.3 * dt);
        p.x += dx / d * mv; p.z += dz / d * mv; p.y = terrains[r.island].surfaceAt(p.x, p.z) ?? p.y;
        let da = Math.atan2(dx, dz) - r.obj.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
        r.obj.rotation.y += da * Math.min(1, dt * 8);
        r.phase += 0.25;
        const sw = Math.sin(r.phase * 6) * 0.6, l = r.obj.userData.limbs;
        l.legL.rotation.x = sw; l.legR.rotation.x = -sw; l.armL.rotation.x = -sw * 0.8; l.armR.rotation.x = sw * 0.8;
      } else {
        const free = ferry.riders.findIndex(x => !x);
        if (free >= 0) { ferry.riders[free] = r; Object.assign(r, { mode: "hopIn", t: 0, seat: free, from: p.clone() }); setSitting(r, false); }
      }
    } else if (r.mode === "hopIn") {
      r.t += dt / HOP;
      const u = Math.min(1, r.t);
      seatPos(r.seat, SEAT_TMP);
      p.lerpVectors(r.from, SEAT_TMP, u); p.y += Math.sin(Math.PI * u) * 1.3;
      if (u >= 1) { r.mode = "ride"; setSitting(r, true); }
    } else if (r.mode === "ride") {
      seatPos(r.seat, SEAT_TMP); p.copy(SEAT_TMP);
      r.obj.rotation.y = ferry.heading + Math.PI / 2;
    } else if (r.mode === "hopOut") {
      if (r.t < 0) {
        r.t += dt; seatPos(r.seat, SEAT_TMP); p.copy(SEAT_TMP);
        if (r.t >= 0) { r.from = p.clone(); r.t = 0; }
        continue;
      }
      r.t += dt / HOP;
      const u = Math.min(1, r.t), y = terrains[r.island].surfaceAt(r.to[0], r.to[1]) ?? 1;
      pt.set(r.to[0], y, r.to[1]); p.lerpVectors(r.from, pt, u); p.y += Math.sin(Math.PI * u) * 1.3;
      if (u >= 1) { r.mode = "roam"; r.tx = null; r.dwell = 1.5 + rand() * 2; setSitting(r, false); }
    }
  }
}
function updateFerry(dt) {
  const L = legs[ferry.leg];
  if (ferry.state === "sail") {
    const travelled = ferry.dir > 0 ? ferry.u * L.len : (1 - ferry.u) * L.len, remain = L.len - travelled;
    const f = Math.min(1, Math.max(0.2, Math.min(travelled + 0.6, remain) / 3.5));
    ferry.u += ferry.dir * ferry.speed * f * dt / L.len;
    if (ferry.u >= 1 || ferry.u <= 0) {
      ferry.u = Math.min(1, Math.max(0, ferry.u));
      dock(ferry.dir > 0 ? ferry.leg + 1 : ferry.leg);
      return updateFerry(0);
    }
  } else {
    ferry.timer -= dt;
    if (ferry.timer <= 0) ferry.state = "sail";
  }
  legs[ferry.leg].curve.getPointAt(Math.min(1, Math.max(0, ferry.u)), pt);
  guardian.root.position.set(pt.x, WATER, pt.z);
  const want = headingOf(ferry.leg, ferry.u, ferry.dir);
  let d = want - ferry.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
  ferry.heading += d * Math.min(1, dt * 1.6);
  guardian.root.rotation.y = ferry.heading;
}
legs[ferry.leg].curve.getPointAt(ferry.u, pt);
guardian.root.position.set(pt.x, WATER, pt.z);
guardian.root.rotation.y = ferry.heading;


/* ---------- 天氣 3D 看板:立在電競主島東南側,輪流顯示各城市的天氣 ---------- */
const billboard = createBillboard(THREE, mats);
{
  const bx = 6.0, bz = 4.6, by = terrains.core.surfaceAt(bx, bz) ?? 1.2;
  billboard.group.position.set(bx, by, bz);
  billboard.group.rotation.y = 0.56;
  world.add(billboard.group);
  for (let i = trees.length - 1; i >= 0; i--) {
    const t = trees[i];
    if (Math.hypot(t.position.x - bx, t.position.z - bz) < 2.2) { world.remove(t); trees.splice(i, 1); }
  }
}
function openWeather() {
  const rows = billboard.cities.map(c => {
    const d = billboard.data[c.id];
    return d ? `<li><b>${c.name}</b><span>${Math.round(d.cur.main.temp)}°C</span><span>${d.cur.weather[0].description}</span><span>${Math.round(d.days[0].max)}° / ${Math.round(d.days[0].min)}°</span></li>`
             : `<li><b>${c.name}</b><span>--</span><span>${billboard.state.status === "nokey" ? "尚未設定 API Key" : "取得中或暫時查不到"}</span><span></span></li>`;
  }).join("");
  openPanel("天氣看板", `<p class="lead">看板每 7 秒換一個城市。資料來自 OpenWeather,每 10 分鐘更新。</p>
    <ul class="wx-list">${rows}</ul>
    <p class="links"><a href="../weather/">進入完整天氣牆(22 個縣市+五天預報) →</a></p>`);
}

/* ---------- 風格 ---------- */
const STORE_KEY = "msi-island-theme-v1";
let applied = THEMES.find(t => t.id === DEFAULT_THEME_ID);
let custom = {};
try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (saved) { applied = THEMES.find(t => t.id === saved.id) || applied; custom = saved.custom || {}; } } catch {}
let current = applied, currentCustom = { ...custom };

let baseScene = null, baseTheme = null, nightF = 0, appliedNight = -1;
const NIGHT_TINT = new THREE.Color("#1b2a5c"), tcA = new THREE.Color(), tcB = new THREE.Color();
const nightColor = (hex, f) => tcA.set(hex).lerp(tcB.set(hex).multiplyScalar(0.34).lerp(NIGHT_TINT, 0.3), f).clone();
function applyNight(f) {
  if (!baseScene) return;
  appliedNight = f;
  const s = baseScene, dark = baseTheme.dark;
  water.setColors({ sea: nightColor(s.sea, f), deep: nightColor(s.deep, f) });
  for (const t of Object.values(terrains)) t.setColors({ groundColor: nightColor(s.lawn, f), bankColor: nightColor(s.shore, f) });
  scene.background = nightColor(s.deep, f);
  hemi.intensity = (dark ? 0.9 : 1.8) * (1 - 0.62 * f);
  key.intensity = (dark ? 1.05 : 2.2) * (1 - 0.7 * f);
  key.color.set(dark ? "#cfd8ff" : "#fff4d9").lerp(tcB.set("#9fb2ff"), f);
  fill.intensity = (dark ? 0.5 : 0.65) * (1 - 0.5 * f);
  mats.glow.emissiveIntensity = 0.12 + 2.3 * f;
  for (const l of lamps) l.userData.sprite.material.opacity = 0.9 * f;
}
function applyTheme(theme, over = {}) {
  current = theme; currentCustom = { ...over };
  const s = { ...theme.scene, ...over };
  baseScene = s; baseTheme = theme;
  for (const k of ["primary", "accent", "dark", "cream", "glass"]) mats[k].color.set(s[k]);
  mats.road.color.set(s.cream);
  mats.white.color.set(theme.dark ? "#e8ebf2" : "#fffcf0");
  mats.rock.color.set(s.shore);
  water.setColors({ sea: s.sea, deep: s.deep });
  for (const t of Object.values(terrains)) t.setColors({ groundColor: s.lawn, bankColor: s.shore });
  scene.background = new THREE.Color(s.deep);
  hemi.color.set(s.sky); hemi.groundColor.set(s.ground);
  hemi.intensity = theme.dark ? 0.9 : 1.8;
  key.intensity = theme.dark ? 1.05 : 2.2; key.color.set(theme.dark ? "#cfd8ff" : "#fff4d9");
  fill.intensity = theme.dark ? 0.5 : 0.65;
  renderer.toneMappingExposure = theme.dark ? 1.0 : 1.0;
  const root = document.documentElement.style, u = theme.ui;
  root.setProperty("--bg1", u.bg1); root.setProperty("--bg2", u.bg2); root.setProperty("--surface", u.surface);
  root.setProperty("--text", u.text); root.setProperty("--muted", u.muted); root.setProperty("--line", u.line);
  root.setProperty("--primary", over.primary ? over.primary : u.primary);
  root.setProperty("--on-primary", over.primary ? pickText(over.primary) : u.onPrimary);
  root.setProperty("--accent", s.accent);
  document.documentElement.dataset.mode = theme.dark ? "dark" : "light";
  if (lamps.length || nightF) applyNight(nightF);
}
function pickText(hex) { const c = new THREE.Color(hex); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) > 0.4 ? "#1a1a1a" : "#ffffff"; }
applyTheme(applied, custom);

/* ---------- 相機 ---------- */
const DIR = new THREE.Vector3(24, 27, 38).normalize();
const center = BOUNDS.min.clone().add(BOUNDS.max).multiplyScalar(0.5);
let fitHeight = 40;
function fitView(resetOnly = false) {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, aspect = w / h;
  camera.position.copy(center).addScaledVector(DIR, 120); camera.lookAt(center); camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const x of [BOUNDS.min.x, BOUNDS.max.x]) for (const y of [BOUNDS.min.y, BOUNDS.max.y]) for (const z of [BOUNDS.min.z, BOUNDS.max.z]) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(inv);
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  const topPad = innerWidth < 700 ? 90 : 70, botPad = innerWidth < 700 ? 60 : 30;
  fitHeight = Math.max((maxY - minY) * (1 + (topPad + botPad) / h), (maxX - minX) / aspect) * 1.04;
  camera.left = -fitHeight * aspect / 2; camera.right = fitHeight * aspect / 2;
  camera.top = fitHeight / 2; camera.bottom = -fitHeight / 2;
  camera.zoom = 1; camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  fitView();
}
addEventListener("resize", resize);

let tween = null;
function flyTo(target, zoom) {
  const startT = controls.target.clone(), startZ = camera.zoom, t0 = performance.now();
  tween = { startT, startZ, target: target.clone(), zoom, t0 };
}
function resetView() {
  tween = null; fitView();
}

/* ---------- 介面 ---------- */
const panel = $("#panel"), panelBody = $("#panelBody"), panelTitle = $("#panelTitle");
let lastFocus = null;
function openPanel(title, html, focusId) {
  lastFocus = document.activeElement;
  panelTitle.textContent = title; panelBody.innerHTML = html;
  panel.hidden = false; document.body.classList.add("panel-open");
  $("#panelClose").focus();
  if (focusId) $(`[data-card="${focusId}"]`, panelBody)?.scrollIntoView({ block: "nearest" });
}
function closePanel() {
  panel.hidden = true; document.body.classList.remove("panel-open");
  lastFocus?.focus?.(); lastFocus = null;
}
$("#panelClose").addEventListener("click", closePanel);
panel.addEventListener("click", e => { if (e.target === panel) closePanel(); });

function cardHtml(s, hot) {
  const specs = s.specs.length ? `<ul>${s.specs.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p class="none">規格請見官網</p>`;
  return `<a class="card${hot ? " hot" : ""}" data-card="${s.id}" href="${s.url}" target="_blank" rel="noopener">
    <img src="${s.image}" alt="MSI ${s.name} 筆電" loading="lazy" width="900" height="720">
    <div class="card-body"><span class="tag">${s.group}</span><h3>${s.name}</h3><p>${s.desc}</p>
    ${s.model ? `<strong>${s.model}</strong>` : ""}${specs}<span class="go">到官網看 ${s.name} →</span></div></a>`;
}
function openIsland(id, hotSeries) {
  const isl = ISLANDS.find(i => i.id === id);
  const cols = Math.min(3, isl.series.length);
  openPanel(isl.name, `<p class="lead">${isl.blurb}</p>
    <div class="cards" style="--cols:${cols}">${isl.series.map(sid => cardHtml(SERIES[sid], sid === hotSeries)).join("")}</div>
    <p class="links"><a href="${OFFICIAL.main.url}" target="_blank" rel="noopener">${OFFICIAL.main.label} →</a>
    <a href="${OFFICIAL.store.url}" target="_blank" rel="noopener">${OFFICIAL.store.label} →</a>
    <a href="${OFFICIAL.laptops.url}" target="_blank" rel="noopener">${OFFICIAL.laptops.label} →</a></p>`, hotSeries);
  const first = WORLD[id].plateaus.find(p => p[4]);
  flyTo(new THREE.Vector3(first[0], 1.5, first[2]), id === "core" ? 1.7 : 2.4);
}
function openGuide() {
  guardian.nod();
  openPanel("海龍嚮導", `<p class="lead">我是守護這片海的龍,每天在四座島之間游來游去,背上可以載小朋友喔!四座島分別是電競主島、創作島、商務島與日常島,想去哪一座?</p>
    <div class="guide">${ISLANDS.map(i => `<button class="guide-btn" data-island="${i.id}">${i.name}<small>${i.series.map(s => SERIES[s].name).join("・")}</small></button>`).join("")}</div>
    <p class="links"><a href="${OFFICIAL.main.url}" target="_blank" rel="noopener">${OFFICIAL.main.label} →</a>
    <a href="${OFFICIAL.store.url}" target="_blank" rel="noopener">${OFFICIAL.store.label} →</a>
    <a href="${OFFICIAL.laptops.url}" target="_blank" rel="noopener">${OFFICIAL.laptops.label} →</a></p>`);
  $$(".guide-btn", panelBody).forEach(b => b.addEventListener("click", () => { closePanel(); openIsland(b.dataset.island); }));
}

/* 場景標籤 + 地點清單 */
const labelBox = $("#labels");
const LABEL_ANCHORS = { core: [0, 1, -11], creator: [22, 1, -8.5], business: [-1.5, 1, 24], daily: [-22, 1, 9.5] };
const labels = ISLANDS.map(i => {
  const b = document.createElement("button");
  b.className = "chip"; b.textContent = i.name; b.dataset.island = i.id;
  b.addEventListener("click", () => openIsland(i.id));
  labelBox.appendChild(b); return { el: b, anchor: new THREE.Vector3(...LABEL_ANCHORS[i.id]) };
});
const gl = document.createElement("button");
gl.className = "chip chip-guide"; gl.textContent = "海龍嚮導"; gl.addEventListener("click", openGuide);
labelBox.appendChild(gl);
const wxChip = document.createElement("button");
wxChip.className = "chip chip-guide"; wxChip.textContent = "天氣看板"; wxChip.addEventListener("click", openWeather);
labelBox.appendChild(wxChip);
labels.push({ el: wxChip, anchor: new THREE.Vector3(9, 5, 7.5) });
const guideAnchor = new THREE.Vector3(GUARDIAN_POS[0] + 6, 4, GUARDIAN_POS[2] - 1);
labels.push({ el: gl, anchor: guideAnchor });
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight, used = [];
  for (const l of labels) {
    const v = l.anchor.clone().project(camera);
    let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    const bw = l.el.offsetWidth, bh = l.el.offsetHeight;
    x = Math.min(w - bw / 2 - 6, Math.max(bw / 2 + 6, x)); y = Math.min(h - bh - 6, Math.max(64, y));
    for (const u of used) if (Math.abs(u.x - x) < (bw + u.w) / 2 && Math.abs(u.y - y) < bh + 4) y = u.y + bh + 6;
    used.push({ x, y, w: bw });
    l.el.style.transform = `translate(${x - bw / 2}px, ${y}px)`;
  }
}
const places = $("#placeList");
ISLANDS.forEach(i => {
  const li = document.createElement("li");
  li.innerHTML = `<button data-island="${i.id}">${i.name}<small>${i.series.map(s => SERIES[s].name).join("・")}</small></button>`;
  li.firstChild.addEventListener("click", () => openIsland(i.id)); places.appendChild(li);
});
const wl = document.createElement("li");
wl.innerHTML = `<button>天氣看板<small>各城市即時天氣</small></button>`;
wl.firstChild.addEventListener("click", openWeather); places.appendChild(wl);
const lg = document.createElement("li");
lg.innerHTML = `<button>海龍嚮導<small>守護入口海域的巨龍</small></button>`;
lg.firstChild.addEventListener("click", openGuide); places.appendChild(lg);

/* 點選地標與守護獸 */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const tip = $("#tip");
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects([...landmarkList, guardian.root, billboard.group], true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.seriesId && !o.userData.guardian && !o.userData.billboard) o = o.parent;
  return o ? (o.userData.guardian ? { guardian: true } : o.userData.billboard ? { billboard: true } : { series: o.userData.seriesId }) : null;
}
let down = null;
canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null;
  const hit = pick(e);
  if (!hit) return;
  if (hit.guardian) return openGuide();
  if (hit.billboard) return openWeather();
  const isl = ISLANDS.find(i => i.series.includes(hit.series));
  openIsland(isl.id, hit.series);
});
canvas.addEventListener("pointermove", e => {
  if (e.buttons) { tip.hidden = true; return; }
  const hit = pick(e);
  canvas.style.cursor = hit ? "pointer" : "grab";
  if (hit) { tip.hidden = false; tip.textContent = hit.guardian ? "海龍嚮導" : hit.billboard ? "天氣看板" : `MSI ${SERIES[hit.series].name}`; tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`; }
  else tip.hidden = true;
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });

/* 工具列 */
$("#btnHome").addEventListener("click", resetView);
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
const btnPause = $("#btnPause");
function syncPause() { btnPause.textContent = paused ? "▶ 繼續動態" : "⏸ 暫停動態"; btnPause.setAttribute("aria-pressed", String(paused)); }
btnPause.addEventListener("click", () => { paused = !paused; syncPause(); });
syncPause();
$("#btnPlaces").addEventListener("click", () => { const open = $("#places").classList.toggle("open"); $("#btnPlaces").setAttribute("aria-expanded", String(open)); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!panel.hidden) closePanel(); else if (!stylePanel.hidden) closeStyles(); } });

/* ---------- 風格選擇面板(128 種) ---------- */
const stylePanel = $("#stylePanel"), styleGrid = $("#styleGrid");
let styleMode = applied.mode, styleFamily = "all", draft = applied, draftCustom = { ...custom };
function renderStyles() {
  $$("[data-mode]", stylePanel).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === styleMode)));
  $$("[data-fam]", stylePanel).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fam === styleFamily)));
  const list = THEMES.filter(t => t.mode === styleMode && (styleFamily === "all" || t.family === styleFamily));
  styleGrid.innerHTML = list.map(t => `<button class="tile" data-id="${t.id}" aria-pressed="${t.id === draft.id}" title="${t.name}">
    <span class="sw" style="background:linear-gradient(135deg,${t.scene.sea} 0 34%,${t.scene.lawn} 34% 62%,${t.scene.primary} 62% 82%,${t.scene.accent} 82%)"></span>
    <span class="nm">${t.name}</span></button>`).join("");
  $("#styleCount").textContent = `${list.length} 種(共 ${THEMES.length} 種:亮 64、暗 64)`;
  $("#styleCurrent").textContent = `目前:${draft.name}${Object.keys(draftCustom).length ? "(自訂色)" : ""}`;
  $("#pickPrimary").value = draftCustom.primary || draft.scene.primary;
  $("#pickAccent").value = draftCustom.accent || draft.scene.accent;
}
$("#styleFamilies").innerHTML = `<button data-fam="all">全部</button>` + FAMILY_LIST.map(f => `<button data-fam="${f.id}">${f.name}</button>`).join("");
$("#styleFamilies").addEventListener("click", e => { const b = e.target.closest("[data-fam]"); if (b) { styleFamily = b.dataset.fam; renderStyles(); } });
$$("[data-mode]", stylePanel).forEach(b => b.addEventListener("click", () => { styleMode = b.dataset.mode; renderStyles(); }));
styleGrid.addEventListener("click", e => {
  const b = e.target.closest(".tile"); if (!b) return;
  draft = THEMES.find(t => t.id === b.dataset.id); draftCustom = {};
  applyTheme(draft); renderStyles();
});
$("#pickPrimary").addEventListener("input", e => { draftCustom.primary = e.target.value; applyTheme(draft, draftCustom); });
$("#pickAccent").addEventListener("input", e => { draftCustom.accent = e.target.value; applyTheme(draft, draftCustom); });
$("#styleRandom").addEventListener("click", () => {
  const list = THEMES.filter(t => t.mode === styleMode);
  draft = list[Math.floor(Math.random() * list.length)]; draftCustom = {}; applyTheme(draft); renderStyles();
});
$("#styleApply").addEventListener("click", () => {
  applied = draft; custom = { ...draftCustom };
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ id: applied.id, custom })); } catch {}
  closeStyles(true);
});
$("#styleCancel").addEventListener("click", () => closeStyles(false));
$("#styleReset").addEventListener("click", () => {
  const def = THEMES.find(t => t.id === DEFAULT_THEME_ID); draft = def; draftCustom = {}; applyTheme(def); renderStyles();
});
function openStyles() {
  draft = applied; draftCustom = { ...custom }; styleMode = applied.mode; styleFamily = "all";
  lastFocus = document.activeElement; stylePanel.hidden = false; renderStyles(); $("#styleClose").focus();
}
function closeStyles(keep) {
  if (keep !== true) applyTheme(applied, custom);
  stylePanel.hidden = true; lastFocus?.focus?.();
}
$("#styleClose").addEventListener("click", () => closeStyles(false));
$("#btnStyle").addEventListener("click", openStyles);

/* ---------- 時間、夜晚、音樂 ---------- */
let timeMode = "auto";
const TIME_LABELS = { auto: "時間:即時", day: "時間:白天", night: "時間:夜晚" };
const clockFmt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function taipeiNow() {
  const parts = clockFmt.formatToParts(new Date()), g = t => +parts.find(p => p.type === t).value;
  return { h: g("hour"), m: g("minute"), s: g("second") };
}
const targetNight = h => (h >= 19 || h < 5) ? 1 : h >= 17.5 ? (h - 17.5) / 1.5 : h < 6.5 ? 1 - (h - 5) / 1.5 : 0;
function currentHour() {
  if (timeMode === "day") return 12;
  if (timeMode === "night") return 22;
  const n = taipeiNow(); return n.h + n.m / 60 + n.s / 3600;
}
function updateClock() {
  const n = taipeiNow(), pad = v => String(v).padStart(2, "0"), h = currentHour();
  $("#clockTime").textContent = `${pad(n.h)}:${pad(n.m)}:${pad(n.s)}`;
  const phase = h >= 19 || h < 5 ? ["🌙", "夜晚"] : h < 8 ? ["🌅", "清晨"] : h >= 17.5 ? ["🌇", "黃昏"] : ["☀️", "白天"];
  $("#clockIcon").textContent = phase[0];
  $("#clockLabel").textContent = timeMode === "auto" ? `台北時間・${phase[1]}` : `預覽${phase[1]}(實際 ${pad(n.h)}:${pad(n.m)})`;
}
updateClock(); setInterval(updateClock, 1000);
nightF = targetNight(currentHour()); applyNight(nightF);
$("#btnTime").addEventListener("click", () => {
  timeMode = { auto: "day", day: "night", night: "auto" }[timeMode];
  $("#btnTime").textContent = TIME_LABELS[timeMode]; updateClock();
});

const music = createMusic();
const btnMusic = $("#btnMusic");
function syncMusic() { btnMusic.textContent = music.on ? "♪ 音樂:開" : "♪ 音樂:關"; btnMusic.setAttribute("aria-pressed", String(music.on)); }
btnMusic.addEventListener("click", async () => {
  if (music.on) music.stop(); else { try { await music.start(); } catch { /* 瀏覽器不允許時維持關閉 */ } }
  syncMusic();
});
syncMusic();

/* ---------- 主迴圈 ---------- */
let sim = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) {
    sim += dt;
    water.update(sim);
    updateFerry(dt);
    guardian.update(sim);
    updatePeople(dt);
    for (const r of residents) stepResident(r, dt);
    for (const r of roamers) if (!r.mode || r.mode === "roam") stepRoamer(r, dt);
    stepDucks(dt, sim);
    sky.update(sim, dt, nightF);
  }
  { const target = targetNight(currentHour()); nightF += (target - nightF) * Math.min(1, dt * 1.5);
    if (Math.abs(nightF - target) < 0.004) nightF = target;
    if (Math.abs(nightF - appliedNight) > 0.004) applyNight(nightF); }
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / 800), e = 1 - Math.pow(1 - k, 3);
    controls.target.lerpVectors(tween.startT, tween.target, e);
    camera.zoom = tween.startZ + (tween.zoom - tween.startZ) * e; camera.updateProjectionMatrix();
    if (k >= 1) tween = null;
  }
  controls.target.clamp(BOUNDS.min.clone().setY(-1), BOUNDS.max.clone().setY(3));
  controls.update();
  renderer.render(scene, camera);
  billboard.update(now / 1000, nightF);
  guideAnchor.set(guardian.root.position.x + 3, 5, guardian.root.position.z + 1);
  placeLabels();
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
window.__island = { billboard, ferry, people, HARBORS, updateFerry, updatePeople, stepResident, stepRoamer, roamers, sky, ducks, lamps, mats, setTimeMode: m => { timeMode = m; }, nightFactor: () => nightF, scene, camera, controls, residents, edges, terrains, guardian, THEMES, applyTheme, openIsland };
