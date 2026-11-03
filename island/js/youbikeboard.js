// YouBike 2.0 即時查詢看板:全市可借車輛、可還空位,以及各行政區的車輛概況。資料每 60 秒更新。
const API = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";
const FONT = '"Iansui","Klee One","Kaiti TC","DFKai-SB",sans-serif';
const clockFmt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export function createYouBikeBoard(THREE, mats) {
  const W = 1280, H = 720;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  const group = new THREE.Group(); group.name = "youbike-board";
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  add(new THREE.BoxGeometry(8.0, 0.3, 1.5), mats.cream, 0, 0.15, 0);
  for (const sx of [-3.0, 3.0]) add(new THREE.CylinderGeometry(0.15, 0.18, 2.5, 8), mats.dark, sx, 1.55, -0.1);
  add(new THREE.BoxGeometry(7.4, 4.35, 0.26), mats.dark, 0, 3.95, 0);
  add(new THREE.BoxGeometry(7.6, 0.2, 0.4), mats.accent, 0, 6.25, 0);
  for (let i = 0; i < 4; i++) {
    add(new THREE.CylinderGeometry(0.1, 0.16, 0.34, 8), mats.dark, -2.6 + i * 1.73, 6.5, 0.25).rotation.x = 0.7;
    add(new THREE.SphereGeometry(0.1, 8, 6), mats.glow, -2.6 + i * 1.73, 6.43, 0.38);
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 3.994), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 3.95, 0.135); group.add(screen);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 5.8), new THREE.MeshBasicMaterial({ color: "#ffe9a8", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, 3.95, 0.3); group.add(glow);
  group.userData = { billboard: true, label: "YouBike 2.0 即時查詢看板(點一下放大)", embed: "../youbike/?embed=1", title: "YouBike 2.0 即時查詢" };

  const state = { status: "loading", stations: [], time: "" };

  const rr = (x, y, w, h, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
  function draw() {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#fff6cf"); g.addColorStop(0.45, "#ffe8f1"); g.addColorStop(1, "#dff4ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    rr(36, 28, 560, 74, 37, "#ff9a1f"); ctx.fillStyle = "#3a2400"; ctx.font = `bold 40px ${FONT}`; ctx.fillText("🚲 YouBike 2.0 即時查詢", 66, 80);
    ctx.textAlign = "right"; ctx.fillStyle = "#ff8a00"; ctx.font = `bold 56px ${FONT}`; ctx.fillText(clockFmt.format(new Date()), W - 40, 76);
    ctx.fillStyle = "#6a7690"; ctx.font = `26px ${FONT}`; ctx.fillText(state.time ? `資料時間 ${state.time}` : "", W - 40, 112); ctx.textAlign = "left";

    const act = state.stations.filter(s => s.ok), bikes = act.reduce((a, s) => a + s.bikes, 0), spaces = act.reduce((a, s) => a + s.spaces, 0);
    const tiles = [["🚲 全市可借車輛", state.stations.length ? bikes.toLocaleString() : "--", "#1fb36b", "#e3f9ee"], ["🅿️ 全市可還空位", state.stations.length ? spaces.toLocaleString() : "--", "#2a8bf2", "#e6f2ff"], ["📍 營運中站點", state.stations.length ? `${act.length}` : "--", "#ff8a00", "#fff4d4"]];
    tiles.forEach(([k, v, c, bg], i) => {
      const x = 36 + i * 410, y = 138; rr(x, y, 388, 136, 28, bg);
      ctx.fillStyle = "#4a5775"; ctx.font = `28px ${FONT}`; ctx.fillText(k, x + 22, y + 44);
      ctx.fillStyle = c; ctx.font = `bold 72px ${FONT}`; ctx.fillText(v, x + 22, y + 116);
    });
    if (!state.stations.length) {
      ctx.fillStyle = "#4a5775"; ctx.font = `38px ${FONT}`; ctx.textAlign = "center";
      ctx.fillText(state.status === "loading" ? "取得 YouBike 資料中…" : "暫時查不到資料,點我開啟查詢頁", W / 2, 470); ctx.textAlign = "left";
    } else {
      const byArea = new Map();
      for (const s of act) { const a = byArea.get(s.area) || { area: s.area, bikes: 0, spaces: 0, n: 0 }; a.bikes += s.bikes; a.spaces += s.spaces; a.n++; byArea.set(s.area, a); }
      const list = [...byArea.values()].sort((a, b) => b.bikes - a.bikes), max = Math.max(...list.map(a => a.bikes));
      ctx.fillStyle = "#4a5775"; ctx.font = `bold 28px ${FONT}`; ctx.fillText("各行政區可借車輛", 40, 322);
      list.slice(0, 14).forEach((a, i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 36 + col * 620, y = 340 + row * 46;
        ctx.fillStyle = "#26324a"; ctx.font = `26px ${FONT}`; ctx.fillText(a.area, x, y + 30);
        rr(x + 118, y + 8, 340, 26, 13, "#e4ebf7"); rr(x + 118, y + 8, Math.max(26, 340 * a.bikes / max), 26, 13, "#25c27a");
        ctx.fillStyle = "#1a7f4e"; ctx.font = `bold 26px ${FONT}`; ctx.fillText(String(a.bikes), x + 470, y + 31);
      });
    }
    ctx.fillStyle = "#6a7690"; ctx.font = `24px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("👆 點我開啟完整查詢:選行政區與租借站、看 Google 地圖", W / 2, H - 22); ctx.textAlign = "left";
    tex.needsUpdate = true;
  }

  async function load() {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const raw = await res.json();
      state.stations = raw.map(r => ({ area: r.sarea, ok: String(r.act) === "1", bikes: Number(r.available_rent_bikes || 0), spaces: Number(r.available_return_bikes || 0) }));
      state.time = raw.reduce((a, r) => (r.srcUpdateTime || "") > a ? r.srcUpdateTime : a, "").replace(/-/g, "/");
      state.status = "ok";
    } catch { if (!state.stations.length) state.status = "error"; }
  }
  load(); setInterval(load, 60000);
  if (document.fonts?.load) document.fonts.load(`bold 40px ${FONT}`).then(() => draw());

  let last = -1;
  return {
    group, state,
    update(t, night = 0) {
      if (Math.floor(t) !== last) { last = Math.floor(t); draw(); }
      glow.material.opacity = 0.07 * night;
    },
  };
}
