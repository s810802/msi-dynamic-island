// 步態:讓小人與動物的動作自然一點。
// 速度會慢慢加速、慢慢停下;走路時身體上下起伏、微微前傾與左右擺動;站著時會東張西望、呼吸、偶爾比手畫腳。
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeGait() {
  return { phase: Math.random() * 6, v: 0, t: Math.random() * 20, look: 0, lookT: 1 + Math.random() * 2, gesture: 0, gestureT: 3 + Math.random() * 6 };
}

export function stepGait(obj, g, dt, targetV, opts = {}) {
  const u = obj.userData, k = Math.min(1, dt * 12);
  g.t += dt;
  const acc = targetV > g.v ? 2.0 : 3.0;
  g.v += clamp(targetV - g.v, -acc * dt, acc * dt);
  const moving = g.v > 0.04, s = clamp(g.v, 0, 1.4);
  if (moving) g.phase += g.v * dt * 5.4;
  const amp = moving ? clamp(0.18 + s * 0.5, 0, 0.8) : 0, sw = Math.sin(g.phase) * amp;

  if (u.legs) {                                  // 四腳動物:對角腳同時擺
    u.legs.forEach((l, i) => { l.rotation.x += ((i % 2 ? -sw : sw) * 1.1 - l.rotation.x) * k; });
    obj.children.forEach(c => { if (!u.legs.includes(c) && c.userData.bob === undefined) c.userData.bob = c.position.y; });
    const bob = moving ? Math.abs(Math.cos(g.phase)) * 0.025 : Math.sin(g.t * 1.6) * 0.004;
    obj.children.forEach(c => { if (!u.legs.includes(c) && c.userData.bob !== undefined) c.position.y = c.userData.bob + bob; });
    return;
  }
  const l = u.limbs; if (!l) return;
  const to = (o, v) => { o.rotation.x += (v - o.rotation.x) * k; };
  to(l.legL, sw); to(l.legR, -sw);
  const torso = u.torso, head = u.head;
  // 手臂:走路時與腳反向;聊天時右手抬起比畫;站著偶爾揮一下
  g.gestureT -= dt;
  if (g.gestureT < 0) { g.gesture = 1.6; g.gestureT = 4 + Math.random() * 8; }
  g.gesture = Math.max(0, g.gesture - dt);
  const talking = opts.chat || g.gesture > 0;
  to(l.armL, moving ? -sw * 0.9 : 0.04);
  to(l.armR, moving ? sw * 0.9 : talking ? -1.0 + Math.sin(g.t * 6) * 0.35 : 0.04);

  if (torso) {
    const bob = moving ? Math.abs(Math.cos(g.phase)) * 0.05 * clamp(s, 0, 1) : Math.sin(g.t * 1.7) * 0.01;
    torso.position.y += (bob - torso.position.y) * k;
    torso.rotation.z += ((moving ? Math.sin(g.phase) * 0.05 : 0) - torso.rotation.z) * k;
    torso.rotation.x += ((moving ? 0.07 * clamp(s, 0, 1) : 0) - torso.rotation.x) * k;
  }
  if (head) {
    g.lookT -= dt;
    if (g.lookT < 0) { g.look = moving ? (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 1.4; g.lookT = moving ? 2 + Math.random() * 3 : 0.8 + Math.random() * 2.5; }
    head.rotation.y += (g.look - head.rotation.y) * Math.min(1, dt * 4);
    head.rotation.x += ((talking ? Math.sin(g.t * 5) * 0.06 : 0) - head.rotation.x) * k;
  }
}
