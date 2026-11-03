// 天氣 3D 看板:立在小島上的大看板,輪流顯示台灣主要城市的目前天氣與未來五天氣溫。
// 資料與「天氣牆」頁面共用同一個 API Key(weather/config.js)與同一份快取,不會多耗查詢次數。
import { CITIES } from "../../weather/js/cities.js";
import { kindOf } from "../../weather/js/scenes.js";

export const BOARD_CITIES = ["taipei", "taichung", "kaohsiung", "hualien", "penghu", "kinmen"];
const TTL = 10 * 60 * 1000, CACHE_KEY = "owm-cache-v1";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const FONT = '"Iansui","Klee One","Kaiti TC","DFKai-SB",sans-serif';

let KEY = "";
try { KEY = (await import("../../weather/config.js")).default || ""; } catch { /* 沒有 config.js */ }
if (!KEY) { try { KEY = localStorage.getItem("owm-key") || ""; } catch { /* 略過 */ } }
let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }

async function owm(kind, city) {
  const id = `${kind}:${city.id}`, hit = cache[id];
  if (hit && Date.now() - hit.t < TTL) return hit.d;
  if (!KEY) throw new Error("nokey");
  let res;
  try { res = await fetch(`https://api.openweathermap.org/data/2.5/${kind}?lat=${city.lat}&lon=${city.lon}&appid=${encodeURIComponent(KEY)}&units=metric&lang=zh_tw`); }
  catch { if (hit) return hit.d; throw new Error("net"); }
  if (!res.ok) { if (hit) return hit.d; throw new Error(String(res.status)); }
  const d = await res.json();
  cache[id] = { t: Date.now(), d };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* 略過 */ }
  return d;
}

function daily(f) {
  const tz = f.city.timezone, days = new Map();
  for (const it of f.list) {
    const d = new Date((it.dt + tz) * 1000), key = d.toISOString().slice(0, 10);
    if (!days.has(key)) days.set(key, { wd: d.getUTCDay(), items: [] });
    days.get(key).items.push({ ...it, hour: d.getUTCHours() });
  }
  return [...days.values()].slice(0, 5).map(day => {
    const rep = day.items.reduce((a, b) => Math.abs(b.hour - 13) < Math.abs(a.hour - 13) ? b : a);
    return { wd: day.wd, min: Math.min(...day.items.map(i => i.main.temp_min)), max: Math.max(...day.items.map(i => i.main.temp_max)), kind: kindOf(rep.weather[0].id) };
  });
}

const SKY = {
  clear: { day: ["#3a9bff", "#cdeeff"], night: ["#070d24", "#2b4a7a"] }, partly: { day: ["#4a9be8", "#d5ecf7"], night: ["#0a1230", "#38527f"] },
  overcast: { day: ["#7d8da3", "#d3dae2"], night: ["#1a2231", "#46546a"] }, drizzle: { day: ["#4d5f78", "#9fb0c4"], night: ["#0d1424", "#2f4260"] },
  rain: { day: ["#4d5f78", "#9fb0c4"], night: ["#0d1424", "#2f4260"] }, thunder: { day: ["#2f3550", "#6c7592"], night: ["#080b18", "#2a3255"] },
  snow: { day: ["#8fa7c4", "#eef4fb"], night: ["#1a2540", "#596f94"] }, fog: { day: ["#98a6b4", "#e6ebef"], night: ["#232c38", "#566474"] },
};

function drawCloud(c, x, y, s, fill = "#fff") {
  c.fillStyle = fill; c.beginPath();
  c.arc(x, y, 22 * s, 0, 7); c.arc(x + 26 * s, y - 12 * s, 28 * s, 0, 7); c.arc(x + 56 * s, y, 22 * s, 0, 7); c.rect(x, y, 56 * s, 22 * s); c.fill();
}
function drawIcon(c, kind, night, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const sun = () => { c.fillStyle = "#ffd54a"; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill(); c.strokeStyle = "#ffd54a"; c.lineWidth = 5; c.lineCap = "round"; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * 33, Math.sin(a) * 33); c.lineTo(Math.cos(a) * 43, Math.sin(a) * 43); c.stroke(); } };
  const moon = () => { c.fillStyle = "#f3f1d6"; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(12, -8, 22, 0, 7); c.fill(); c.globalCompositeOperation = "source-over"; };
  if (kind === "clear") night ? moon() : sun();
  else if (kind === "partly") { c.save(); c.translate(-12, -14); c.scale(0.8, 0.8); night ? moon() : sun(); c.restore(); drawCloud(c, -34, 14, 0.85, "#f4f8ff"); }
  else {
    drawCloud(c, -34, 0, 1, kind === "overcast" ? "#dbe3ee" : kind === "thunder" ? "#8f9bb0" : kind === "fog" ? "#e6ebf1" : "#c4cfdc");
    c.lineCap = "round";
    if (kind === "rain" || kind === "drizzle") { c.strokeStyle = "#4aa8ff"; c.lineWidth = 5; for (const dx of [-22, -4, 14, 32]) { c.beginPath(); c.moveTo(dx, 30); c.lineTo(dx - 6, 48); c.stroke(); } }
    if (kind === "thunder") { c.fillStyle = "#ffd54a"; c.beginPath(); c.moveTo(6, 22); c.lineTo(-10, 48); c.lineTo(2, 48); c.lineTo(-4, 68); c.lineTo(20, 40); c.lineTo(8, 40); c.closePath(); c.fill(); }
    if (kind === "snow") { c.fillStyle = "#fff"; for (const dx of [-20, 2, 24]) { c.beginPath(); c.arc(dx, 42, 5, 0, 7); c.fill(); } }
    if (kind === "fog") { c.strokeStyle = "#fff"; c.lineWidth = 5; for (const dy of [34, 46]) { c.beginPath(); c.moveTo(-26, dy); c.lineTo(34, dy); c.stroke(); } }
  }
  c.restore();
}

export function createBillboard(THREE, mats) {
  const W = 1024, H = 576;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  const group = new THREE.Group(); group.name = "weather-billboard";
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  add(new THREE.CylinderGeometry(1.5, 1.7, 0.35, 12), mats.cream, 0, 0.17, 0);
  for (const sx of [-1.7, 1.7]) add(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), mats.dark, sx, 1.5, -0.05);
  add(new THREE.BoxGeometry(4.7, 2.75, 0.2), mats.dark, 0, 3.15, 0);
  add(new THREE.BoxGeometry(4.9, 0.16, 0.34), mats.primary, 0, 4.58, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.475), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 3.15, 0.11); group.add(screen);
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.6), new THREE.MeshBasicMaterial({ color: "#9fd0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.position.set(0, 3.15, 0.2); group.add(sprite);
  group.userData.billboard = true;

  const data = {}, state = { idx: 0, since: 0, status: "loading" };
  const cities = BOARD_CITIES.map(id => CITIES.find(c => c.id === id));

  function draw(now) {
    const city = cities[state.idx], d = data[city.id];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    let kind = "partly", night = false;
    if (d) { kind = kindOf(d.cur.weather[0].id); night = !(d.cur.dt >= d.cur.sys.sunrise && d.cur.dt < d.cur.sys.sunset); }
    const [a, b] = SKY[kind][night ? "night" : "day"];
    g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (kind !== "clear") for (const [x, y, s] of [[120, 90, 1.3], [520, 60, 1], [820, 130, 1.5]]) drawCloud(ctx, (x + now * 6) % (W + 200) - 100, y, s, "rgba(255,255,255,.22)");
    ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 10;
    ctx.font = `bold 34px ${FONT}`; ctx.fillText("台灣天氣牆", 36, 56);
    ctx.font = `28px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(`${city.name}`, W - 36, 56); ctx.textAlign = "left";
    if (!d) {
      ctx.font = `44px ${FONT}`; ctx.textAlign = "center";
      ctx.fillText(state.status === "loading" ? "取得天氣中…" : "點我進入天氣牆", W / 2, H / 2 + 10);
      ctx.font = `26px ${FONT}`; ctx.fillText(state.status === "nokey" ? "(尚未設定 API Key)" : state.status === "error" ? "(暫時查不到資料)" : "", W / 2, H / 2 + 60); ctx.textAlign = "left";
    } else {
      const c = d.cur;
      drawIcon(ctx, kind, night, 118, 230, 1.7);
      ctx.font = `bold 150px ${FONT}`; ctx.fillText(`${Math.round(c.main.temp)}°`, 220, 290);
      ctx.font = `36px ${FONT}`; ctx.fillText(c.weather[0].description, 40, 372);
      ctx.font = `28px ${FONT}`; ctx.fillText(`體感 ${Math.round(c.main.feels_like)}°　濕度 ${c.main.humidity}%`, 40, 420);
      ctx.fillText(`風速 ${c.wind.speed.toFixed(1)} m/s　氣壓 ${c.main.pressure} hPa`, 40, 462);
      const x0 = 590, rowH = 82, lo = Math.min(...d.days.map(x => x.min)), hi = Math.max(...d.days.map(x => x.max));
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.shadowBlur = 0; ctx.beginPath(); ctx.roundRect(x0 - 24, 92, W - x0 - 12, 5 * rowH + 18, 24); ctx.fill(); ctx.shadowBlur = 8; ctx.fillStyle = "#fff";
      d.days.forEach((day, i) => {
        const y = 134 + i * rowH;
        ctx.font = `28px ${FONT}`; ctx.fillText(i === 0 ? "今天" : i === 1 ? "明天" : `週${WEEK[day.wd]}`, x0, y + 18);
        drawIcon(ctx, day.kind, false, x0 + 140, y + 8, 0.52);
        ctx.font = `bold 30px ${FONT}`; ctx.fillText(`${Math.round(day.max)}°`, x0 + 205, y + 18);
        ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText(`${Math.round(day.min)}°`, x0 + 280, y + 18);
        const bx = x0 + 340, bw = 70, s0 = (day.min - lo) / (hi - lo || 1), s1 = (day.max - lo) / (hi - lo || 1);
        ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(bx, y + 6, bw, 10);
        ctx.fillStyle = "#ffd27a"; ctx.fillRect(bx + s0 * bw, y + 6, Math.max(8, (s1 - s0) * bw), 10); ctx.fillStyle = "#fff";
      });
    }
    ctx.shadowBlur = 0;
    cities.forEach((_, i) => { ctx.fillStyle = i === state.idx ? "#fff" : "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.arc(W / 2 - (cities.length - 1) * 14 + i * 28, H - 24, i === state.idx ? 7 : 5, 0, 7); ctx.fill(); });
    tex.needsUpdate = true;
  }

  async function load() {
    if (!KEY) { state.status = "nokey"; return; }
    await Promise.all(cities.map(async city => {
      try {
        const [cur, f] = await Promise.all([owm("weather", city), owm("forecast", city)]);
        data[city.id] = { cur, days: daily(f) };
      } catch (e) { state.status = e.message === "nokey" ? "nokey" : "error"; }
    }));
    if (Object.keys(data).length) state.status = "ok";
  }
  load();
  setInterval(load, TTL);
  if (document.fonts?.load) document.fonts.load(`bold 40px ${FONT}`).then(() => draw(0));

  let lastDraw = -1;
  return {
    group, data, cities, state,
    update(t, night = 0) {
      const idx = Math.floor(t / 7) % cities.length;
      if (idx !== state.idx) state.idx = idx;
      if (Math.floor(t * 2) !== lastDraw) { lastDraw = Math.floor(t * 2); draw(t); }
      sprite.material.opacity = 0.06 * night;
    },
  };
}
