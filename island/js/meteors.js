// 流星雨:夜晚不定時出現。畫在一張蓋住整個畫面的透明畫布上(不擋操作),所以不管怎麼旋轉縮放都看得到。
export function createMeteors(canvas, onShower) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const list = [];
  let shower = { left: 0, gap: 0 }, nextShower = rnd(15, 45), nextStray = rnd(5, 12), dirty = false;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();

  function spawn() {
    const ang = rnd(24, 40) * Math.PI / 180, speed = rnd(0.9, 1.5) * Math.max(W, H);
    list.push({
      x: rnd(0.25 * W, 1.15 * W), y: rnd(-0.12 * H, 0.35 * H),
      vx: -Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      t: 0, life: rnd(0.7, 1.3), len: rnd(0.12, 0.26) * Math.max(W, H), w: rnd(1.6, 3.2),
      hue: Math.random() < 0.3 ? 40 : 210,
    });
  }
  function burst(n = 10) { shower.left = n; shower.gap = 0; onShower?.(); }

  return {
    burst,
    update(dt, night, paused) {
      if (paused) return;
      if (night > 0.55) {
        nextShower -= dt; nextStray -= dt;
        if (nextShower <= 0) { burst(Math.round(rnd(7, 16))); nextShower = rnd(40, 110); }
        if (nextStray <= 0) { spawn(); nextStray = rnd(8, 22); }
      }
      if (shower.left > 0) {
        shower.gap -= dt;
        if (shower.gap <= 0) { spawn(); shower.left--; shower.gap = rnd(0.12, 0.55); }
      }
      if (!list.length) { if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; } return; }
      ctx.clearRect(0, 0, W, H); dirty = true;
      ctx.lineCap = "round";
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.t > m.life) { list.splice(i, 1); continue; }
        const k = m.t / m.life, a = Math.min(1, m.t / 0.08) * Math.pow(1 - k, 0.7) * Math.min(1, night * 1.4);
        const sp = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / sp * m.len, ty = m.y - m.vy / sp * m.len;
        const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0, `hsla(${m.hue},90%,85%,0)`); g.addColorStop(0.7, `hsla(${m.hue},90%,85%,${0.55 * a})`); g.addColorStop(1, `rgba(255,255,255,${a})`);
        ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
        const r = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.w * 6);
        r.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); r.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = r; ctx.beginPath(); ctx.arc(m.x, m.y, m.w * 6, 0, 7); ctx.fill();
      }
    },
  };
}
