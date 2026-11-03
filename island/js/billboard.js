// 天氣顯示器:立在小島上的 3D 大螢幕,模擬「天氣牆」的版面(城市、氣溫、六項數值、未來五天預報),輪流顯示主要城市。
// 資料與「天氣牆」頁面共用同一個 API Key(weather/config.js)與同一份快取,不會多耗查詢次數。
import { CITIES } from "../../weather/js/cities.js";
import { kindOf } from "../../weather/js/scenes.js";

export const BOARD_CITIES = ["taipei", "taichung", "kaohsiung", "hualien", "penghu", "kinmen"];
const TTL = 10 * 60 * 1000, CACHE_KEY = "owm-cache-v1";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const DIRS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
const FONT = '"Iansui","Klee One","Kaiti TC","DFKai-SB",sans-serif';

let KEY = "";
try { KEY = (await import("../../weather/config.js")).default || ""; } catch { /* 沒有 config.js */ }
if (!KEY) { try { KEY = localStorage.getItem("owm-key") || ""; } catch { /* 略過 */ } }
let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }

export async function owm(kind, city) {
  const id = `${kind}:${city.id}`, hit = cache[id];
  if (hit && Date.now() - hit.t < TTL) return hit.d;
  let res;
  try { res = await fetch(KEY ? `https://api.openweathermap.org/data/2.5/${kind}?lat=${city.lat}&lon=${city.lon}&appid=${encodeURIComponent(KEY)}&units=metric&lang=zh_tw` : `/api/weather?kind=${kind}&lat=${city.lat}&lon=${city.lon}`); }
  catch { if (hit) return hit.d; throw new Error("net"); }
  if (!KEY && (res.status === 404 || res.status === 405 || res.status === 500)) throw new Error("nokey");
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
    if (!days.has(key)) days.set(key, { wd: d.getUTCDay(), key, items: [] });
    days.get(key).items.push({ ...it, hour: d.getUTCHours() });
  }
  return [...days.values()].slice(0, 5).map(day => {
    const rep = day.items.reduce((a, b) => Math.abs(b.hour - 13) < Math.abs(a.hour - 13) ? b : a);
    return {
      wd: day.wd, key: day.key, min: Math.min(...day.items.map(i => i.main.temp_min)), max: Math.max(...day.items.map(i => i.main.temp_max)),
      pop: Math.max(...day.items.map(i => i.pop || 0)), kind: kindOf(rep.weather[0].id), desc: rep.weather[0].description,
    };
  });
}

const SKY = {
  clear: { day: ["#3a9bff", "#cdeeff"], night: ["#070d24", "#2b4a7a"] }, partly: { day: ["#4a9be8", "#d5ecf7"], night: ["#0a1230", "#38527f"] },
  overcast: { day: ["#7d8da3", "#d3dae2"], night: ["#1a2231", "#46546a"] }, drizzle: { day: ["#4d5f78", "#9fb0c4"], night: ["#0d1424", "#2f4260"] },
  rain: { day: ["#4d5f78", "#9fb0c4"], night: ["#0d1424", "#2f4260"] }, thunder: { day: ["#2f3550", "#6c7592"], night: ["#080b18", "#2a3255"] },
  snow: { day: ["#8fa7c4", "#eef4fb"], night: ["#1a2540", "#596f94"] }, fog: { day: ["#98a6b4", "#e6ebef"], night: ["#232c38", "#566474"] },
};

export function drawCloud(c, x, y, s, fill = "#fff") {
  c.fillStyle = fill; c.beginPath();
  c.arc(x, y, 22 * s, 0, 7); c.arc(x + 26 * s, y - 12 * s, 28 * s, 0, 7); c.arc(x + 56 * s, y, 22 * s, 0, 7); c.rect(x, y, 56 * s, 22 * s); c.fill();
}
export function drawIcon(c, kind, night, x, y, s) {
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
  const W = 1280, H = 720;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  /* 顯示器本體:底座、支架、外框、螢幕 */
  const group = new THREE.Group(); group.name = "weather-monitor";
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  add(new THREE.CylinderGeometry(1.7, 1.9, 0.3, 14), mats.cream, 0, 0.15, 0);
  add(new THREE.CylinderGeometry(0.5, 0.65, 0.2, 12), mats.dark, 0, 0.4, 0);
  add(new THREE.CylinderGeometry(0.2, 0.26, 1.7, 10), mats.dark, 0, 1.3, -0.05);
  add(new THREE.BoxGeometry(5.7, 3.3, 0.22), mats.dark, 0, 3.35, 0);
  add(new THREE.BoxGeometry(1.0, 0.1, 0.05), mats.primary, 0, 1.77, 0.13);
  add(new THREE.SphereGeometry(0.05, 8, 6), mats.glow, 2.6, 1.8, 0.13);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.0375), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 3.45, 0.115); group.add(screen);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), new THREE.MeshBasicMaterial({ color: "#9fd0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, 3.45, 0.25); group.add(glow);
  group.userData.billboard = true;

  const data = {}, state = { idx: 0, status: "loading" };
  const cities = BOARD_CITIES.map(id => CITIES.find(c => c.id === id));

  const tile = (x, y, w, h) => { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); };

  function draw(now) {
    const city = cities[state.idx], d = data[city.id];
    let kind = "partly", night = false;
    if (d) { kind = kindOf(d.cur.weather[0].id); night = !(d.cur.dt >= d.cur.sys.sunrise && d.cur.dt < d.cur.sys.sunset); }
    const [a, b] = SKY[kind][night ? "night" : "day"];
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (kind !== "clear") for (const [x, y, s] of [[150, 110, 1.5], [640, 70, 1.1], [1000, 160, 1.7]]) drawCloud(ctx, (x + now * 7) % (W + 240) - 120, y, s, "rgba(255,255,255,.16)");
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 10;
    ctx.font = `bold 40px ${FONT}`; ctx.fillText("台灣天氣牆", 44, 66);
    ctx.textAlign = "right"; ctx.font = `34px ${FONT}`;
    let clock = "";
    if (d) { const t = new Date(Date.now() + d.cur.timezone * 1000); clock = `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`; }
    ctx.fillText(`${city.name}　${clock}`, W - 44, 66); ctx.textAlign = "left";
    if (!d) {
      ctx.textAlign = "center"; ctx.font = `52px ${FONT}`;
      ctx.fillText(state.status === "loading" ? "取得天氣中…" : "點我進入天氣牆", W / 2, H / 2 + 10);
      ctx.font = `30px ${FONT}`; ctx.fillText(state.status === "nokey" ? "(尚未設定 API Key)" : state.status === "error" ? "(暫時查不到資料)" : "", W / 2, H / 2 + 66); ctx.textAlign = "left";
    } else {
      const c = d.cur, tz = c.timezone;
      const hm = dt => { const t = new Date((dt + tz) * 1000); return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`; };
      drawIcon(ctx, kind, night, 140, 230, 2.1);
      ctx.font = `bold 190px ${FONT}`; ctx.fillText(`${Math.round(c.main.temp)}°`, 250, 320);
      ctx.font = `42px ${FONT}`; ctx.fillText(`${c.weather[0].description}・體感 ${Math.round(c.main.feels_like)}°`, 44, 392);
      ctx.font = `30px ${FONT}`; ctx.fillText(`今日最高 ${Math.round(d.days[0].max)}° / 最低 ${Math.round(d.days[0].min)}°`, 44, 436);
      // 六項數值
      const stats = [["💧 濕度", `${c.main.humidity}%`], ["🌬️ 風", `${DIRS[Math.round(c.wind.deg / 45) % 8]}風 ${c.wind.speed.toFixed(1)}`], ["🧭 氣壓", `${c.main.pressure}`],
        ["👁️ 能見度", `${c.visibility != null ? (c.visibility / 1000).toFixed(1) : "--"} km`], ["☁️ 雲量", `${c.clouds.all}%`], ["🌅 日出日落", `${hm(c.sys.sunrise)}/${hm(c.sys.sunset)}`]];
      stats.forEach(([k, v], i) => {
        const x = 700 + (i % 3) * 190, y = 100 + Math.floor(i / 3) * 128;
        ctx.shadowBlur = 0; tile(x, y, 178, 116); ctx.shadowBlur = 8; ctx.fillStyle = "#fff";
        ctx.font = `24px ${FONT}`; ctx.fillText(k, x + 14, y + 36); ctx.font = `bold 34px ${FONT}`; ctx.fillText(v, x + 14, y + 86);
      });
      // 五天預報卡片
      d.days.forEach((day, i) => {
        const x = 44 + i * 238, y = 468, w = 224, h = 214;
        ctx.shadowBlur = 0; tile(x, y, w, h); ctx.shadowBlur = 8; ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.font = `bold 30px ${FONT}`; ctx.fillText(i === 0 ? "今天" : i === 1 ? "明天" : `週${WEEK[day.wd]}`, x + w / 2, y + 40);
        drawIcon(ctx, day.kind, false, x + w / 2 - 6, y + 92, 0.8);
        ctx.font = `bold 34px ${FONT}`; ctx.fillStyle = "#ffe08a"; ctx.fillText(`${Math.round(day.max)}°`, x + w / 2 - 46, y + 168);
        ctx.fillStyle = "#bfe6ff"; ctx.fillText(`${Math.round(day.min)}°`, x + w / 2 + 46, y + 168);
        ctx.fillStyle = "#fff"; ctx.font = `24px ${FONT}`; ctx.fillText(`☔ ${Math.round(day.pop * 100)}%`, x + w / 2, y + 202); ctx.textAlign = "left";
      });
    }
    ctx.shadowBlur = 0; ctx.textAlign = "left";
    cities.forEach((_, i) => { ctx.fillStyle = i === state.idx ? "#fff" : "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.arc(W / 2 - (cities.length - 1) * 14 + i * 28, H - 16, i === state.idx ? 7 : 5, 0, 7); ctx.fill(); });
    tex.needsUpdate = true;
  }

  async function load() {
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
      glow.material.opacity = 0.07 * night;
    },
  };
}
