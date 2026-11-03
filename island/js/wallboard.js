// 天氣牆看板:把「天氣牆」整面搬到小島上,22 個縣市的目前天氣一次全部看得到。
import { CITIES } from "../../weather/js/cities.js";
import { kindOf } from "../../weather/js/scenes.js";
import { owm, drawIcon } from "./billboard.js";

const FONT = '"Iansui","Klee One","Kaiti TC","DFKai-SB",sans-serif';
const TTL = 10 * 60 * 1000;

const STOPS = [[5, [74, 144, 226]], [15, [64, 196, 190]], [22, [124, 204, 110]], [28, [255, 190, 60]], [34, [255, 120, 60]], [38, [225, 50, 70]]];
function tempRgb(t) {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) {
    const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], u = (t - a) / (b - a);
    return ca.map((v, k) => Math.round(v + (cb[k] - v) * u));
  }
  return STOPS.at(-1)[1];
}

export function createWallBoard(THREE, mats) {
  const W = 1536, H = 864, COLS = 6, ROWS = 4;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  const group = new THREE.Group(); group.name = "weather-wall-board";
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  add(new THREE.BoxGeometry(8.6, 0.3, 1.5), mats.cream, 0, 0.15, 0);
  for (const sx of [-3.3, 3.3]) add(new THREE.CylinderGeometry(0.15, 0.18, 2.7, 8), mats.dark, sx, 1.65, -0.1);
  add(new THREE.BoxGeometry(8.2, 4.7, 0.26), mats.dark, 0, 4.15, 0);
  add(new THREE.BoxGeometry(8.4, 0.2, 0.4), mats.primary, 0, 6.6, 0);
  for (let i = 0; i < 5; i++) {                  // 頂上投射燈
    add(new THREE.CylinderGeometry(0.1, 0.16, 0.34, 8), mats.dark, -3.2 + i * 1.6, 6.85, 0.25).rotation.x = 0.7;
    add(new THREE.SphereGeometry(0.1, 8, 6), mats.glow, -3.2 + i * 1.6, 6.78, 0.38);
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 4.4438), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 4.15, 0.135); group.add(screen);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(10, 6.4), new THREE.MeshBasicMaterial({ color: "#9fd0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, 4.15, 0.3); group.add(glow);
  group.userData = { billboard: true, label: "天氣牆看板(點一下放大)" };

  const data = {}, state = { status: "loading", updated: null };

  function draw(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#14274e"); g.addColorStop(1, "#2a4a7c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 10;
    ctx.font = `bold 52px ${FONT}`; ctx.fillText("台灣天氣牆", 40, 70);
    ctx.font = `28px ${FONT}`; ctx.textAlign = "right";
    const n = new Date(), pad = v => String(v).padStart(2, "0");
    ctx.fillText(state.updated ? `${pad(n.getHours())}:${pad(n.getMinutes())} 更新・22 縣市` : (state.status === "loading" ? "取得天氣中…" : "尚未設定 API Key,點我開啟天氣牆"), W - 40, 66);
    ctx.textAlign = "left"; ctx.shadowBlur = 0;

    const x0 = 24, y0 = 100, gap = 12, tw = (W - 2 * x0 - gap * (COLS - 1)) / COLS, th = (H - y0 - 24 - gap * (ROWS - 1)) / ROWS;
    const list = CITIES.map(c => ({ c, d: data[c.id] }));
    const have = list.filter(x => x.d);
    const hot = have.length ? have.reduce((a, b) => b.d.main.temp > a.d.main.temp ? b : a) : null;
    const cold = have.length ? have.reduce((a, b) => b.d.main.temp < a.d.main.temp ? b : a) : null;
    const hi = Math.floor(t / 3) % 22;
    const tile = (i, fn) => {
      const x = x0 + (i % COLS) * (tw + gap), y = y0 + Math.floor(i / COLS) * (th + gap);
      fn(x, y);
    };
    list.forEach(({ c, d }, i) => tile(i, (x, y) => {
      let rgb = [90, 110, 150], kind = "partly";
      if (d) { rgb = tempRgb(d.main.temp); kind = kindOf(d.weather[0].id); }
      const grad = ctx.createLinearGradient(x, y, x, y + th); grad.addColorStop(0, `rgba(${rgb},.55)`); grad.addColorStop(1, `rgba(${rgb},.2)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(x, y, tw, th, 20); ctx.fill();
      if (i === hi) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.shadowBlur = 6; ctx.font = `bold 32px ${FONT}`; ctx.fillText(c.name.replace("(馬祖)", ""), x + 16, y + 42);
      if (d) {
        const night = !(d.dt >= d.sys.sunrise && d.dt < d.sys.sunset);
        drawIcon(ctx, kind, night, x + 66, y + 104, 0.78);
        ctx.font = `bold 60px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(`${Math.round(d.main.temp)}°`, x + tw - 14, y + 108); ctx.textAlign = "left";
        ctx.font = `22px ${FONT}`; ctx.fillText(d.weather[0].description, x + 16, y + th - 14);
      } else { ctx.font = `28px ${FONT}`; ctx.fillText("--", x + 16, y + 100); }
      ctx.shadowBlur = 0;
    }));
    // 最後兩格:最高溫、最低溫
    [[22, "🔥 最高溫", hot, "#ff9a5a"], [23, "❄️ 最低溫", cold, "#7cc4ff"]].forEach(([i, label, x, color]) => tile(i, (px, py) => {
      ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.beginPath(); ctx.roundRect(px, py, tw, th, 20); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `26px ${FONT}`; ctx.fillText(label, px + 16, py + 40);
      if (x) {
        ctx.font = `bold 34px ${FONT}`; ctx.fillText(x.c.name.replace("(馬祖)", ""), px + 16, py + 90);
        ctx.fillStyle = color; ctx.font = `bold 58px ${FONT}`; ctx.fillText(`${Math.round(x.d.main.temp)}°`, px + 16, py + th - 18);
      }
    }));
    tex.needsUpdate = true;
  }

  async function load() {
    await Promise.all(CITIES.map(async c => { try { data[c.id] = await owm("weather", c); } catch (e) { if (e.message === "nokey") state.status = "nokey"; else if (state.status === "loading") state.status = "error"; } }));
    if (Object.keys(data).length) { state.status = "ok"; state.updated = Date.now(); }
  }
  load(); setInterval(load, TTL);
  if (document.fonts?.load) document.fonts.load(`bold 40px ${FONT}`).then(() => draw(0));

  let last = -1;
  return {
    group, data, state,
    update(t, night = 0) {
      if (Math.floor(t) !== last) { last = Math.floor(t); draw(t); }
      glow.material.opacity = 0.07 * night;
    },
  };
}
