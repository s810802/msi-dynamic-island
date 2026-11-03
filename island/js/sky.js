// 天空:會飄動的雲、成群飛翔的小鳥、不定時飛過的飛機
export function createSky(THREE, mats) {
  const group = new THREE.Group();
  group.name = "sky";
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* 雲:幾顆球疊成一朵,往 +x 飄,飄出邊界後從另一側回來 */
  const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Group();
    const n = 4 + (i % 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(1.1, 1.9), 9, 7), cloudMat);
      s.position.set(k * 1.3 - n * 0.65, rnd(-0.15, 0.3), rnd(-0.5, 0.5));
      s.scale.y = 0.62; c.add(s);
    }
    c.position.set(rnd(-60, 60), rnd(13, 18), rnd(-34, 40));
    c.userData.speed = rnd(0.35, 0.8);
    c.scale.setScalar(rnd(0.9, 1.6));
    group.add(c); clouds.push(c);
  }

  /* 小鳥:三群,各自繞著天空的一點盤旋 */
  const birdMat = new THREE.MeshStandardMaterial({ color: "#4a4f5c", roughness: 0.9, flatShading: true });
  const birdGeo = { body: new THREE.SphereGeometry(0.16, 6, 5), wing: new THREE.BoxGeometry(0.5, 0.03, 0.22), beak: new THREE.ConeGeometry(0.05, 0.14, 4) };
  const flocks = [[-6, 9, 4, 13, 0.22], [18, 11, 2, 16, -0.17], [-4, 10, 28, 11, 0.2]].map(([cx, cy, cz, radius, speed], f) => {
    const birds = Array.from({ length: 6 }, (_, i) => {
      const b = new THREE.Group();
      const body = new THREE.Mesh(birdGeo.body, birdMat); body.scale.set(1, 0.8, 1.6); b.add(body);
      const beak = new THREE.Mesh(birdGeo.beak, mats.accent); beak.rotation.x = Math.PI / 2; beak.position.z = 0.28; b.add(beak);
      const wl = new THREE.Group(), wr = new THREE.Group();
      const a = new THREE.Mesh(birdGeo.wing, birdMat), c = new THREE.Mesh(birdGeo.wing, birdMat);
      a.position.x = -0.25; c.position.x = 0.25; wl.add(a); wr.add(c); b.add(wl, wr);
      b.userData = { wl, wr, off: i * 0.5 + f, bob: rnd(0, 6), r: radius + (i % 3) * 1.1 };
      b.scale.setScalar(1.5);
      group.add(b); return b;
    });
    return { cx, cy, cz, speed, birds };
  });

  /* 飛機:從一側飛到另一側,間隔一陣子再來一班 */
  const plane = new THREE.Group();
  const pm = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); plane.add(o); return o; };
  pm(new THREE.CapsuleGeometry(0.32, 2.2, 4, 10), mats.cream, 0, 0, 0, Math.PI / 2);
  pm(new THREE.BoxGeometry(3.6, 0.07, 0.7), mats.cream, 0, -0.05, 0.1);
  pm(new THREE.BoxGeometry(1.2, 0.06, 0.4), mats.cream, 0, 0, -1.2);
  pm(new THREE.BoxGeometry(0.06, 0.6, 0.45), mats.primary, 0, 0.35, -1.2);
  pm(new THREE.BoxGeometry(0.34, 0.1, 2.0), mats.primary, 0, 0.02, 0.1).scale.set(1, 0.4, 1);
  pm(new THREE.SphereGeometry(0.22, 8, 6), mats.glass, 0, 0.15, 0.9);
  plane.scale.setScalar(1.7);
  group.add(plane);
  const flight = { t: 0, wait: 6, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 22 };
  function launch() {
    const side = Math.random() < 0.5 ? 1 : -1;
    const z = rnd(-20, 26);
    flight.from.set(-70 * side, rnd(15, 19), z + rnd(-8, 8));
    flight.to.set(70 * side, rnd(15, 19), z + rnd(-8, 8));
    flight.t = 0; flight.dur = rnd(18, 26); flight.active = true;
  }

  const tint = new THREE.Color(), day = new THREE.Color("#ffffff"), night = new THREE.Color("#7c86a8");
  return {
    group, clouds, flocks, plane,
    update(t, dt, nightF) {
      for (const c of clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 68) c.position.x = -68; }
      cloudMat.color.copy(tint.copy(day).lerp(night, nightF));
      for (const f of flocks) for (const b of f.birds) {
        const a = t * f.speed + b.userData.off;
        const x = f.cx + Math.cos(a) * b.userData.r, z = f.cz + Math.sin(a) * b.userData.r * 0.7;
        b.position.set(x, f.cy + Math.sin(t * 1.3 + b.userData.bob) * 0.5, z);
        const dir = f.speed > 0 ? 1 : -1;
        b.rotation.y = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * 0.7 * dir);
        const flap = Math.sin(t * 9 + b.userData.bob) * 0.7;
        b.userData.wl.rotation.z = flap; b.userData.wr.rotation.z = -flap;
      }
      if (!flight.active) { flight.wait -= dt; if (flight.wait <= 0) launch(); plane.visible = false; }
      else {
        flight.t += dt; const u = flight.t / flight.dur; plane.visible = true;
        plane.position.lerpVectors(flight.from, flight.to, u);
        plane.rotation.y = Math.atan2(flight.to.x - flight.from.x, flight.to.z - flight.from.z);
        plane.rotation.z = Math.sin(t * 0.8) * 0.06;
        if (u >= 1) { flight.active = false; flight.wait = rnd(12, 26); }
      }
    },
  };
}
