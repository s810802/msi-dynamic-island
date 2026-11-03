// 各系列的地標、居民、樹木、海龍守護獸。圓潤低多邊形,全部用共用材質,換風格時一起變色。
export function makeMaterials(THREE) {
  const mk = color => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true });
  return {
    primary: mk("#e0443b"), accent: mk("#f4c24f"), dark: mk("#3b404c"), cream: mk("#fff5dc"),
    glass: mk("#a9d6e0"), wood: mk("#bd986e"), leaf: mk("#6fae6a"), leaf2: mk("#8fc27f"),
    white: mk("#fffcf0"), rock: mk("#cfc7b4"),
    // 窗燈與路燈:白天微亮,夜晚由 main.js 調高 emissiveIntensity
    glow: new THREE.MeshStandardMaterial({ color: "#fff1c4", emissive: "#ffc65a", emissiveIntensity: 0.1, roughness: 0.6, flatShading: true }),
  };
}

const rad = d => d * Math.PI / 180;

export function buildLandmark(THREE, id, m) {
  const g = new THREE.Group();
  g.name = `landmark:${id}`;
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh); return mesh;
  };
  const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
  const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);

  switch (id) {
    case "titan": // 龍堡塔
      add(cyl(1.25, 1.4, 0.5, 14), m.cream, 0, 0.25, 0);
      add(cyl(0.85, 1.0, 2.3, 10), m.dark, 0, 1.65, 0);
      add(cyl(1.05, 1.05, 0.18, 10), m.primary, 0, 2.75, 0);
      add(cyl(0.7, 0.85, 0.6, 10), m.dark, 0, 3.1, 0);
      add(cone(0.75, 1.3), m.primary, 0, 4.05, 0);
      for (const sx of [-1, 1]) {
        add(cyl(0.3, 0.35, 1.6, 8), m.dark, sx * 1.0, 1.3, 0.2);
        add(cone(0.38, 0.6, 8), m.accent, sx * 1.0, 2.4, 0.2);
      }
      add(sph(0.2), m.accent, 0, 1.9, 0.82);
      break;
    case "raider": { // 機庫
      add(box(2.8, 0.35, 1.9), m.cream, 0, 0.18, 0);
      const hangar = add(new THREE.CapsuleGeometry(0.75, 1.9, 6, 12), m.dark, 0, 1.05, 0, 0, 0, Math.PI / 2);
      hangar.scale.set(1, 1, 1.25);
      add(box(2.5, 0.1, 0.06), m.accent, 0, 1.15, 0.98);
      add(box(2.0, 0.08, 0.4), m.primary, 0, 1.82, 0);
      add(cyl(0.04, 0.04, 0.7, 6), m.dark, 0.8, 2.05, 0);
      add(new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.cream, 0.8, 2.4, 0, -0.5);
      break;
    }
    case "stealth": // 流線楔形
      add(box(2.6, 0.3, 1.8), m.cream, 0, 0.15, 0);
      add(box(2.3, 0.8, 1.5), m.dark, 0, 0.7, 0);
      add(box(2.3, 0.12, 1.7), m.primary, 0, 1.25, 0, 0.25);
      add(box(2.0, 0.07, 0.05), m.accent, 0, 0.75, 0.78);
      add(box(0.1, 0.7, 0.6), m.dark, -1.0, 1.4, -0.3);
      break;
    case "katana": // 插地的刀
      add(cyl(1.1, 1.25, 0.4, 8), m.cream, 0, 0.2, 0);
      add(cyl(0.14, 0.14, 0.6, 8), m.dark, 0, 0.7, 0);
      add(box(1.5, 0.2, 0.4), m.accent, 0, 1.05, 0);
      add(cone(0.55, 3.4, 4), m.white, 0, 2.8, 0, 0, Math.PI / 4);
      add(box(0.08, 2.6, 0.12), m.primary, 0, 2.5, -0.3);
      break;
    case "vector": // 反應爐
      add(cyl(1.3, 1.4, 0.35, 12), m.cream, 0, 0.18, 0);
      add(cyl(0.95, 1.05, 1.5, 12), m.dark, 0, 1.1, 0);
      add(new THREE.TorusGeometry(1.0, 0.12, 8, 16), m.primary, 0, 1.5, 0, Math.PI / 2);
      add(cyl(0.7, 0.8, 0.9, 12), m.primary, 0, 2.1, 0);
      add(sph(0.55), m.glass, 0, 2.7, 0);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        add(box(0.12, 1.3, 0.5), m.dark, Math.sin(a) * 1.05, 0.9, Math.cos(a) * 1.05, 0, a);
      }
      break;
    case "cyborg": { // 機器人頭
      add(cyl(1.0, 1.2, 0.3, 12), m.cream, 0, 0.15, 0);
      const head = add(sph(1.0), m.dark, 0, 1.2, 0);
      head.scale.set(1.2, 1, 1.05);
      add(box(1.7, 0.4, 0.2), m.accent, 0, 1.3, 0.92);
      for (const sx of [-1, 1]) add(cyl(0.25, 0.25, 0.3, 10), m.primary, sx * 1.2, 1.2, 0, 0, 0, Math.PI / 2);
      add(cyl(0.04, 0.04, 0.6, 6), m.dark, 0, 2.3, 0);
      add(sph(0.1), m.primary, 0, 2.65, 0);
      break;
    }
    case "creator": { // 工作室 + 色環
      add(box(2.4, 1.0, 1.7), m.cream, 0, 0.5, 0);
      add(box(2.6, 0.18, 1.9), m.primary, 0, 1.1, 0);
      add(box(0.8, 0.5, 0.05), m.glass, -0.5, 0.55, 0.86);
      add(box(0.4, 0.7, 0.05), m.wood, 0.7, 0.35, 0.86);
      add(cyl(0.06, 0.06, 1.0, 6), m.dark, 0, 1.7, -0.5);
      const wheel = new THREE.Group();
      ["#e0443b", "#f4c24f", "#7bc96f", "#4fb0c6", "#6b7bd6", "#c46bd1"].forEach((c, i) => {
        const w = new THREE.Mesh(new THREE.CircleGeometry(0.95, 8, rad(i * 60), rad(60)),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));
        w.castShadow = true; wheel.add(w);
      });
      wheel.position.set(0, 2.5, -0.5);
      g.add(wheel);
      add(box(0.7, 0.9, 0.06), m.white, 1.5, 0.65, 0.9, -0.2);
      add(cyl(0.03, 0.03, 1.1, 5), m.wood, 1.2, 0.5, 0.8, 0, 0, 0.3);
      add(cyl(0.03, 0.03, 1.1, 5), m.wood, 1.8, 0.5, 0.8, 0, 0, -0.3);
      break;
    }
    case "prestige": // 玻璃塔
      add(box(2.0, 0.35, 2.0), m.cream, 0, 0.18, 0);
      add(box(1.3, 3.1, 1.3), m.glass, 0, 1.9, 0);
      for (let i = 0; i < 5; i++) add(box(1.4, 0.08, 1.4), m.cream, 0, 0.7 + i * 0.6, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(0.07, 3.1, 0.07), m.accent, sx * 0.66, 1.9, sz * 0.66);
      add(box(1.5, 0.2, 1.5), m.dark, 0, 3.55, 0);
      add(sph(0.3), m.leaf, 0.3, 3.8, 0.2);
      add(sph(0.22), m.leaf2, -0.3, 3.76, -0.2);
      break;
    case "modern": // 咖啡小屋
      add(box(1.9, 1.1, 1.6), m.cream, 0, 0.55, 0);
      add(cone(1.55, 0.95, 4), m.primary, 0, 1.55, 0, 0, Math.PI / 4);
      add(box(0.4, 0.65, 0.05), m.wood, 0, 0.33, 0.82);
      add(box(0.5, 0.4, 0.05), m.glass, -0.6, 0.65, 0.82);
      add(box(0.5, 0.4, 0.05), m.glass, 0.6, 0.65, 0.82);
      add(box(2.0, 0.08, 0.6), m.accent, 0, 1.0, 1.05, 0.15);
      add(box(0.25, 0.6, 0.25), m.dark, 0.6, 2.0, -0.3);
      add(cyl(0.3, 0.3, 0.05, 10), m.wood, 1.4, 0.45, 0.9);
      add(cyl(0.04, 0.04, 0.45, 5), m.wood, 1.4, 0.22, 0.9);
      break;
  }
  // 窗燈(夜晚會亮):每個地標幾個發光窗/燈
  const lit = (w, h, d, x, y, z) => add(box(w, h, d), m.glow, x, y, z).castShadow = false;
  const LIT = {
    titan: [[0.2, 0.5, 0.06, -0.35, 1.7, 0.88], [0.2, 0.5, 0.06, 0, 1.7, 0.92], [0.2, 0.5, 0.06, 0.35, 1.7, 0.88], [0.16, 0.4, 0.06, 1.0, 1.4, 0.5]],
    raider: [-0.9, -0.45, 0, 0.45, 0.9].map(x => [0.22, 0.2, 0.05, x, 0.98, 0.95]),
    stealth: [-0.7, 0, 0.7].map(x => [0.4, 0.22, 0.05, x, 0.72, 0.77]),
    katana: [-1, 1].map(x => [0.2, 0.2, 0.2, x, 0.7, 0.95]),
    vector: [[0.7, 0.12, 0.7, 0, 2.7, 0], [1.9, 0.06, 1.9, 0, 0.42, 0]],
    cyborg: [[1.4, 0.18, 0.05, 0, 1.3, 0.97]],
    creator: [[0.7, 0.4, 0.03, -0.5, 0.55, 0.88], [0.3, 0.55, 0.03, 0.7, 0.35, 0.88]],
    prestige: [0, 1, 2, 3, 4].map(i => [1.0, 0.3, 0.03, 0, 0.95 + i * 0.6, 0.67]),
    modern: [[0.4, 0.3, 0.03, -0.6, 0.65, 0.85], [0.4, 0.3, 0.03, 0.6, 0.65, 0.85], [0.3, 0.55, 0.03, 0, 0.33, 0.85]],
  };
  (LIT[id] || []).forEach(a => lit(...a));
  g.userData.seriesId = id;
  return g;
}

export function buildLamp(THREE, m, glowTexture) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), m.dark); post.position.y = 0.55; post.castShadow = true; g.add(post);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), m.glow); bulb.position.y = 1.15; g.add(bulb);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: "#ffd27a", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(2.4); sprite.position.y = 1.15; g.add(sprite);
  g.userData.sprite = sprite;
  return g;
}

// 動物:sheep 綿羊、dog 小狗、cat 小貓、duck 鴨子(浮在海面)
export function buildAnimal(THREE, kind) {
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, mat(color)); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
  const legs = [];
  const leg = (x, z, h, color) => { const p = new THREE.Group(); p.position.set(x, h, z); const o = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, h, 5), mat(color)); o.position.y = -h / 2; o.castShadow = true; p.add(o); g.add(p); legs.push(p); };
  const S = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
  if (kind === "sheep") {
    add(S(0.3), "#fffaf0", 0, 0.42, 0, 1, 0.9, 1.35);
    add(S(0.17), "#3a3430", 0, 0.5, 0.45); add(S(0.07), "#fffaf0", 0, 0.66, 0.4);
    [[-0.12, 0.2], [0.12, 0.2], [-0.12, -0.2], [0.12, -0.2]].forEach(([x, z]) => leg(x, z, 0.22, "#3a3430"));
  } else if (kind === "dog") {
    add(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), "#b9824f", 0, 0.38, 0).rotation.x = Math.PI / 2;
    add(S(0.16), "#b9824f", 0, 0.55, 0.38); add(S(0.07), "#3a2a22", 0, 0.52, 0.52);
    add(new THREE.ConeGeometry(0.06, 0.16, 5), "#7a4f2d", -0.1, 0.7, 0.36); add(new THREE.ConeGeometry(0.06, 0.16, 5), "#7a4f2d", 0.1, 0.7, 0.36);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), "#b9824f", 0, 0.5, -0.38).rotation.x = -0.9;
    [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]].forEach(([x, z]) => leg(x, z, 0.24, "#7a4f2d"));
  } else if (kind === "cat") {
    add(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), "#f0a35e", 0, 0.3, 0).rotation.x = Math.PI / 2;
    add(S(0.13), "#f0a35e", 0, 0.4, 0.3);
    add(new THREE.ConeGeometry(0.05, 0.12, 4), "#f0a35e", -0.07, 0.52, 0.3); add(new THREE.ConeGeometry(0.05, 0.12, 4), "#f0a35e", 0.07, 0.52, 0.3);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 5), "#d98a45", 0, 0.45, -0.38).rotation.x = -0.6;
    [[-0.07, 0.15], [0.07, 0.15], [-0.07, -0.15], [0.07, -0.15]].forEach(([x, z]) => leg(x, z, 0.18, "#d98a45"));
  } else { // duck
    add(S(0.2), "#fffaf0", 0, 0.12, 0, 1, 0.75, 1.3);
    add(S(0.12), "#fffaf0", 0, 0.34, 0.22); add(new THREE.ConeGeometry(0.05, 0.12, 5), "#f4a53a", 0, 0.32, 0.36).rotation.x = Math.PI / 2;
  }
  g.userData.legs = legs;
  return g;
}

export function makeGlowTexture(THREE) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.35)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildTree(THREE, m, kind) {
  const g = new THREE.Group();
  const mesh = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.castShadow = true; g.add(o); };
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), m.wood, 0.25);
  if (kind) { mesh(new THREE.ConeGeometry(0.45, 0.9, 7), m.leaf, 0.85); mesh(new THREE.ConeGeometry(0.33, 0.7, 7), m.leaf2, 1.3); }
  else { mesh(new THREE.SphereGeometry(0.5, 8, 6), m.leaf, 0.85); mesh(new THREE.SphereGeometry(0.32, 8, 6), m.leaf2, 1.3); }
  return g;
}

export function buildResident(THREE, shirt, skin, hair) {
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  const g = new THREE.Group();
  const part = (geo, color, x, y, z) => { const o = new THREE.Mesh(geo, mat(color)); o.position.set(x, y, z); o.castShadow = true; return o; };
  g.add(part(new THREE.CapsuleGeometry(0.2, 0.32, 4, 8), shirt, 0, 0.72, 0));
  g.add(part(new THREE.SphereGeometry(0.2, 10, 8), skin, 0, 1.2, 0));
  const hairMesh = part(new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.23, -0.01);
  g.add(hairMesh);
  const limb = (x, y, len, color) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const o = part(new THREE.CapsuleGeometry(0.065, len, 3, 6), color, 0, -len / 2, 0);
    pivot.add(o); g.add(pivot); return pivot;
  };
  const legL = limb(-0.1, 0.5, 0.3, "#3b404c"), legR = limb(0.1, 0.5, 0.3, "#3b404c");
  const armL = limb(-0.26, 0.95, 0.3, skin), armR = limb(0.26, 0.95, 0.3, skin);
  g.userData.limbs = { legL, legR, armL, armR };
  return g;
}

export function createGuardian(THREE, m) {
  const root = new THREE.Group();
  root.name = "guardian-root";
  const N = 46, spheres = [];
  const bodyMat = m.dark;
  for (let i = 0; i < N; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bodyMat);
    o.castShadow = true; root.add(o); spheres.push(o);
  }
  const spines = [];
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 6), m.primary);
    c.castShadow = true; root.add(c); spines.push(c);
  }
  const head = new THREE.Group();
  const hp = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; head.add(o); return o;
  };
  const skull = hp(new THREE.SphereGeometry(0.9, 12, 10), bodyMat, 0, 0, 0); skull.scale.set(1.1, 0.9, 1);
  hp(new THREE.CapsuleGeometry(0.42, 0.9, 4, 10), bodyMat, 1.15, -0.12, 0, 0, 0, Math.PI / 2);
  hp(new THREE.BoxGeometry(1.2, 0.18, 0.7), m.primary, 1.1, -0.55, 0);
  for (const sz of [-1, 1]) {
    hp(new THREE.SphereGeometry(0.2, 8, 6), m.white, 0.5, 0.3, sz * 0.62);
    hp(new THREE.SphereGeometry(0.11, 8, 6), m.dark, 0.64, 0.3, sz * 0.7);
    hp(new THREE.ConeGeometry(0.2, 1.0, 6), m.accent, -0.45, 0.8, sz * 0.45, 0, 0, rad(55));
    hp(new THREE.ConeGeometry(0.18, 0.7, 5), m.primary, -0.1, 0.1, sz * 0.95, rad(sz * 80), 0, rad(90));
    hp(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4), m.accent, 1.5, -0.35, sz * 0.5, 0, 0, rad(75));
    hp(new THREE.SphereGeometry(0.07, 6, 4), m.dark, 1.95, 0.1, sz * 0.15);
  }
  root.add(head);

  const ripples = [0, 1, 2].map(i => {
    const r = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 36),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.position.set(0.4, 0.02, 0); r.userData.phase = i / 3;
    root.add(r); return r;
  });

  const base = [
    [-9, -4, 2], [-7, 0.7, 1.3], [-5, -2.4, 0.5], [-3, 0.5, -0.2], [-1.3, -2.2, 0], [0, 0.4, 0],
    [0.3, 3, 0], [0.7, 5.6, 0], [1.7, 7.9, 0.1], [2.5, 8.7, 0.1],
  ].map(p => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(base.map(p => p.clone()), false, "catmullrom", 0.5);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  let nod = 0;

  function update(t) {
    const sway = Math.sin(t * 0.6) * 0.5, breathe = 1 + Math.sin(t * 1.3) * 0.02;
    base.forEach((p, i) => {
      const h = Math.max(0, p.y) / 9;
      curve.points[i].set(p.x + sway * h, p.y + (h > 0.3 ? Math.sin(t * 0.9 + i) * 0.08 : 0), p.z + Math.cos(t * 0.5) * 0.3 * h);
    });
    spheres.forEach((o, i) => {
      const u = i / (N - 1);
      curve.getPointAt(u, tmp);
      const r = (1.05 - u * 0.4) * breathe;
      o.position.copy(tmp); o.scale.setScalar(r);
    });
    spines.forEach((c, i) => {
      const u = 0.45 + (i / (spines.length - 1)) * 0.5;
      curve.getPointAt(u, tmp); curve.getTangentAt(u, tan);
      const r = 1.05 - u * 0.4;
      c.position.set(tmp.x - 0.05, tmp.y + r * 0.95, tmp.z);
      c.rotation.set(0, 0, rad(18) + tan.x * 0.2);
      c.scale.setScalar(1 - (i / spines.length) * 0.35);
    });
    curve.getPointAt(1, tmp);
    head.position.copy(tmp).add(new THREE.Vector3(0.7, 0.15, 0));
    nod = Math.max(0, nod - 0.016 * 1.4);
    head.rotation.z = Math.sin(t * 0.8) * 0.06 - 0.12 - Math.sin(nod * Math.PI) * 0.35;
    ripples.forEach(r => {
      const p = (t * 0.25 + r.userData.phase) % 1;
      r.scale.setScalar(1 + p * 1.6); r.material.opacity = 0.5 * (1 - p);
    });
  }
  update(0);
  root.userData = { guardian: true };
  return { root, update, nod: () => { nod = 1; }, head };
}
