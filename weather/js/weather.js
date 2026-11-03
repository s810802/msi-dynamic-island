import { CITIES, REGIONS } from "./cities.js?v=3";
import { kindOf, icon } from "./scenes.js?v=3";

if (location.search.includes("embed")) document.documentElement.classList.add("embed");
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const API = "https://api.openweathermap.org/data/2.5";
const TTL = 10 * 60 * 1000;
const CACHE_KEY = "owm-cache-v1", KEY_STORE = "owm-key";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const DIRS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];

/* ---------- API Key:優先用 weather/config.js(不會被上傳),其次是你在頁面輸入、存在這個瀏覽器的 ---------- */
let KEY = "";
try { KEY = (await import("../config.js")).default || ""; } catch { /* 沒有 config.js 就用輸入的 */ }
if (!KEY) { try { KEY = localStorage.getItem(KEY_STORE) || ""; } catch { /* 無法讀取就請使用者輸入 */ } }

/* ---------- 資料 ---------- */
let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
const saveCache = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* 空間不足就算了 */ } };

class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
async function owm(kind, city, force = false) {
  const id = `${kind}:${city.id}`, hit = cache[id];
  if (!force && hit && Date.now() - hit.t < TTL) return hit.d;
  // 有自己的 Key 就直接查;沒有就走同網域的 /api/weather(Cloudflare Worker 代查,Key 不在網頁裡)
  const url = KEY ? `${API}/${kind}?lat=${city.lat}&lon=${city.lon}&appid=${encodeURIComponent(KEY)}&units=metric&lang=zh_tw`
    : `/api/weather?kind=${kind}&lat=${city.lat}&lon=${city.lon}`;
  let res;
  try { res = await fetch(url); } catch { if (hit) return hit.d; throw new ApiError("net", "網路連線失敗"); }
  if (!KEY && (res.status === 404 || res.status === 405 || res.status === 500)) throw new ApiError("nokey", "尚未設定 API Key");
  if (res.status === 401) throw new ApiError("401", "API Key 無效,或剛申請尚未啟用(通常需要 1~2 小時)");
  if (res.status === 429) { if (hit) return hit.d; throw new ApiError("429", "查詢次數太多,請稍後再試"); }
  if (!res.ok) { if (hit) return hit.d; throw new ApiError("http", `伺服器回應 ${res.status}`); }
  const d = await res.json();
  cache[id] = { t: Date.now(), d }; saveCache();
  return d;
}

/* ---------- 小工具 ---------- */
const tempColor = t => {
  const stops = [[5, [74, 144, 226]], [15, [64, 196, 190]], [22, [124, 204, 110]], [28, [255, 190, 60]], [34, [255, 120, 60]], [38, [225, 50, 70]]];
  if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i], u = (t - a) / (b - a);
    return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * u))})`;
  }
  return `rgb(${stops.at(-1)[1]})`;
};
const local = (dt, tz) => new Date((dt + tz) * 1000);
const pad = n => String(n).padStart(2, "0");
const hm = (dt, tz) => { const d = local(dt, tz); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const isNight = (c) => !(c.dt >= c.sys.sunrise && c.dt < c.sys.sunset);
const beaufort = v => [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7].findIndex(x => v < x);
const bft = v => { const i = beaufort(v); return i === -1 ? 12 : i; };
const round = n => Math.round(n);

function dailyForecast(f) {
  const tz = f.city.timezone, days = new Map();
  for (const it of f.list) {
    const d = local(it.dt, tz), key = d.toISOString().slice(0, 10);
    if (!days.has(key)) days.set(key, { key, wd: d.getUTCDay(), items: [] });
    days.get(key).items.push({ ...it, hour: d.getUTCHours() });
  }
  return [...days.values()].slice(0, 5).map(day => {
    const rep = day.items.reduce((a, b) => Math.abs(b.hour - 13) < Math.abs(a.hour - 13) ? b : a);
    return {
      ...day,
      min: Math.min(...day.items.map(i => i.main.temp_min)), max: Math.max(...day.items.map(i => i.main.temp_max)),
      pop: Math.max(...day.items.map(i => i.pop || 0)), kind: kindOf(rep.weather[0].id), desc: rep.weather[0].description,
    };
  });
}

/* ---------- 畫面 ---------- */
const state = { region: "全部", q: "", selected: CITIES[0], current: {}, errors: {}, updated: null };

const wall = $("#wall");
wall.innerHTML = CITIES.map(c => `<button class="card" data-id="${c.id}" data-region="${c.region}" aria-label="查看${c.name}的天氣">
  <span class="card-scene" style="background-image:url('img/thumb/${c.id}.jpg')"></span>
  <span class="card-body">
    <span class="card-top"><b class="card-name">${c.name}</b><span class="card-region">${c.region}</span></span>
    <span class="card-main"><span class="card-ic"></span><span class="card-temp">--<small>°C</small></span></span>
    <span class="card-desc">載入中…</span>
    <span class="card-meta"></span>
  </span></button>`).join("");
$("#regions").innerHTML = REGIONS.map(r => `<button data-region="${r}" aria-pressed="${r === state.region}">${r}</button>`).join("");

function filterWall() {
  for (const el of $$(".card", wall)) {
    const c = CITIES.find(x => x.id === el.dataset.id);
    el.hidden = !((state.region === "全部" || c.region === state.region) && (!state.q || norm(c.name).includes(state.q) || c.en.toLowerCase().includes(state.q) || c.region.includes(state.q)));
  }
  $("#empty").hidden = $$(".card:not([hidden])", wall).length > 0;
}
$("#regions").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.region = b.dataset.region; $$("#regions button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); filterWall(); });
const norm = v => v.trim().toLowerCase().replace(/臺/g, "台");
const sugg = $("#sugg");
function matches(q) {
  q = norm(q); if (!q) return [];
  return CITIES.filter(c => norm(c.name).includes(q) || c.en.toLowerCase().includes(q) || c.region.includes(q));
}
function renderSugg() {
  const list = matches($("#q").value).slice(0, 8);
  sugg.hidden = !list.length;
  sugg.innerHTML = list.map((c, i) => `<li role="option" data-id="${c.id}" aria-selected="${i === 0}"><img src="img/thumb/${c.id}.jpg" alt="" width="44" height="30"><b>${c.name}</b><small>${c.en}</small></li>`).join("");
}
function chooseCity(c) {
  state.selected = c; state.q = ""; $("#q").value = ""; sugg.hidden = true; filterWall();
  renderHero();
  $("#hero").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
$("#q").addEventListener("input", e => { state.q = norm(e.target.value); filterWall(); renderSugg(); });
$("#q").addEventListener("keydown", e => {
  if (e.key === "Enter") { const c = matches($("#q").value)[0]; if (c) { e.preventDefault(); chooseCity(c); } }
  if (e.key === "Escape") { sugg.hidden = true; }
});
sugg.addEventListener("mousedown", e => { const li = e.target.closest("li"); if (li) { e.preventDefault(); chooseCity(CITIES.find(c => c.id === li.dataset.id)); } });
$("#q").addEventListener("blur", () => setTimeout(() => { sugg.hidden = true; }, 120));

function paintCard(city) {
  const el = $(`.card[data-id="${city.id}"]`), c = state.current[city.id], err = state.errors[city.id];
  if (!c) { if (err) { $(".card-desc", el).textContent = err.code === "nokey" ? "需要 API Key" : "暫時查不到"; } return; }
  const kind = kindOf(c.weather[0].id), night = isNight(c);
  $(".card-ic", el).innerHTML = icon(kind, night, 46);
  $(".card-temp", el).innerHTML = `${round(c.main.temp)}<small>°C</small>`;
  $(".card-desc", el).textContent = c.weather[0].description;
  $(".card-meta", el).innerHTML = `<span>💧${c.main.humidity}%</span><span>🌬️${c.wind.speed.toFixed(1)} m/s</span>`;
  el.style.setProperty("--tc", tempColor(c.main.temp));
}

async function loadAll(force = false) {
  $("#status").textContent = "更新中…"; $("#btnRefresh").disabled = true;
  let keyProblem = null;
  await Promise.all(CITIES.map(async city => {
    try { state.current[city.id] = await owm("weather", city, force); delete state.errors[city.id]; }
    catch (e) { state.errors[city.id] = e; if (e.code === "nokey" || e.code === "401") keyProblem = e; }
    paintCard(city);
  }));
  state.updated = new Date();
  const ok = Object.keys(state.current).length;
  $("#status").textContent = `已更新 ${pad(state.updated.getHours())}:${pad(state.updated.getMinutes())}・${ok}/${CITIES.length} 個縣市`;
  $("#btnRefresh").disabled = false;
  $("#keyBox").hidden = !keyProblem;
  if (keyProblem) $("#keyMsg").textContent = keyProblem.message;
  else renderHero();
  paintSummary();
}

/* 全台概況列 */
function paintSummary() {
  const arr = CITIES.map(c => ({ c, w: state.current[c.id] })).filter(x => x.w);
  if (!arr.length) { $("#summary").innerHTML = ""; return; }
  const hot = arr.reduce((a, b) => b.w.main.temp > a.w.main.temp ? b : a), cold = arr.reduce((a, b) => b.w.main.temp < a.w.main.temp ? b : a);
  const rain = arr.filter(x => [2, 3, 5].includes(Math.floor(x.w.weather[0].id / 100)));
  $("#summary").innerHTML = `<span>🔥 最高溫 <b>${hot.c.name} ${round(hot.w.main.temp)}°</b></span>
    <span>❄️ 最低溫 <b>${cold.c.name} ${round(cold.w.main.temp)}°</b></span>
    <span>☔ 正在下雨 <b>${rain.length} 個縣市</b>${rain.length ? `(${rain.slice(0, 4).map(x => x.c.name).join("、")}${rain.length > 4 ? "…" : ""})` : ""}</span>`;
}

/* 目前選擇的城市:大面板 + 五天預報 */
async function renderHero(force = false) {
  const city = state.selected, c = state.current[city.id];
  if (!c) return;
  const kind = kindOf(c.weather[0].id), night = isNight(c), tz = c.timezone;
  setBg(city);
  const now = local(Math.floor(Date.now() / 1000), tz);
  $("#hero").innerHTML = `<div class="hero-photo" style="background-image:url('img/${city.id}.jpg')" role="img" aria-label="${esc(city.name)}的城市風景"></div><div class="hero-shade"></div>
    <div class="hero-body">
      <div class="hero-left">
        <p class="hero-city">${esc(city.name)}<span>${esc(city.region)}</span></p>
        <p class="hero-time">${now.getUTCMonth() + 1}月${now.getUTCDate()}日 週${WEEK[now.getUTCDay()]} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}</p>
        <div class="hero-temp">${icon(kind, night, 96)}<span>${round(c.main.temp)}<small>°C</small></span></div>
        <p class="hero-desc">${esc(c.weather[0].description)}・體感 ${round(c.main.feels_like)}°</p>
        <p class="hero-hilo" id="hilo"></p>
      </div>
      <dl class="hero-stats">
        <div><dt>💧 濕度</dt><dd>${c.main.humidity}%</dd></div>
        <div><dt>🌬️ 風</dt><dd>${DIRS[Math.round(c.wind.deg / 45) % 8]}風 ${bft(c.wind.speed)} 級<small>${c.wind.speed.toFixed(1)} m/s${c.wind.gust ? `・陣風 ${c.wind.gust.toFixed(1)}` : ""}</small></dd></div>
        <div><dt>🧭 氣壓</dt><dd>${c.main.pressure}<small>hPa</small></dd></div>
        <div><dt>👁️ 能見度</dt><dd>${c.visibility != null ? (c.visibility / 1000).toFixed(1) : "--"}<small>km</small></dd></div>
        <div><dt>☁️ 雲量</dt><dd>${c.clouds.all}%</dd></div>
        <div><dt>🌅 日出 / 日落</dt><dd>${hm(c.sys.sunrise, tz)}<small>/ ${hm(c.sys.sunset, tz)}</small></dd></div>
      </dl>
    </div>
    <div class="forecast" id="forecast"><p class="fc-loading">載入未來五天預報…</p></div>
    <section class="mapbox"><h3>${esc(city.name)}的 Google 地圖<a href="https://www.google.com/maps/search/?api=1&query=${city.lat},${city.lon}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a></h3>
      <iframe title="${esc(city.name)} Google 地圖" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen
        src="https://www.google.com/maps?q=${city.lat},${city.lon}&z=11&hl=zh-TW&output=embed"></iframe></section>`;
  $$(".card").forEach(el => el.classList.toggle("is-selected", el.dataset.id === city.id));
  try {
    const f = await owm("forecast", city, force);
    if (state.selected !== city) return;
    const days = dailyForecast(f);
    $("#hilo").textContent = `今日最高 ${round(days[0].max)}° / 最低 ${round(days[0].min)}°`;
    $("#forecast").innerHTML = forecastHtml(days, f);
  } catch (e) {
    if (state.selected === city) $("#forecast").innerHTML = `<p class="fc-loading">預報暫時查不到:${esc(e.message)}</p>`;
  }
}

function forecastHtml(days, f) {
  const lo = Math.min(...days.map(d => d.min)), hi = Math.max(...days.map(d => d.max));
  const label = (d, i) => i === 0 ? "今天" : i === 1 ? "明天" : `週${WEEK[d.wd]}`;
  const cards = days.map((d, i) => {
    const a = (d.min - lo) / (hi - lo || 1), b = (d.max - lo) / (hi - lo || 1);
    return `<li class="day"><b>${label(d, i)}</b><small>${d.key.slice(5).replace("-", "/")}</small>${icon(d.kind, false, 52)}
      <span class="day-desc">${esc(d.desc)}</span>
      <span class="day-hi" style="color:${tempColor(d.max)}">${round(d.max)}°</span>
      <span class="range"><i style="bottom:${a * 100}%;height:${Math.max(6, (b - a) * 100)}%;background:linear-gradient(${tempColor(d.max)},${tempColor(d.min)})"></i></span>
      <span class="day-lo" style="color:${tempColor(d.min)}">${round(d.min)}°</span>
      <span class="day-pop">☔ ${round(d.pop * 100)}%</span></li>`;
  }).join("");
  return `<h3>未來五天氣溫預報</h3><ul class="days">${cards}</ul>
    <div class="charts">
      <figure><figcaption>每日最高 / 最低溫</figcaption>${hiloChart(days)}</figure>
      <figure><figcaption>降雨機率(每 3 小時)</figcaption>${rainChart(f)}</figure>
    </div>
    <figure class="wide"><figcaption>每 3 小時氣溫曲線</figcaption>${chartSvg(f)}</figure>`;
}

/* 每日最高 / 最低溫:兩條線 + 之間的色帶 */
function hiloChart(days) {
  const W = 420, H = 230, L = 34, R = 16, T = 28, B = 34;
  const lo = Math.floor(Math.min(...days.map(d => d.min)) - 2), hi = Math.ceil(Math.max(...days.map(d => d.max)) + 2);
  const x = i => L + (W - L - R) * (i + 0.5) / days.length, y = t => T + (H - T - B) * (1 - (t - lo) / (hi - lo));
  const label = (d, i) => i === 0 ? "今天" : i === 1 ? "明天" : `週${WEEK[d.wd]}`;
  const line = k => days.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d[k])}`).join(" ");
  const band = days.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.max)}`).join(" ") + " " + [...days].reverse().map((d, i) => `L${x(days.length - 1 - i)} ${y(d.min)}`).join(" ") + " Z";
  const grid = Array.from({ length: 4 }, (_, k) => { const t = lo + (hi - lo) * k / 3; return `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${round(t)}°</text>`; }).join("");
  const dots = days.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.max)}" r="5" fill="#ffb25a" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${y(d.max) - 10}" text-anchor="middle" class="mk">${round(d.max)}°</text>
    <circle cx="${x(i)}" cy="${y(d.min)}" r="5" fill="#7cc4ff" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${y(d.min) + 20}" text-anchor="middle" class="mk">${round(d.min)}°</text>
    <text x="${x(i)}" y="${H - 8}" text-anchor="middle">${label(d, i)}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="未來五天每日最高與最低溫">${grid}
    <path d="${band}" fill="rgba(255,200,120,.2)"/><path d="${line("max")}" class="line hi"/><path d="${line("min")}" class="line lo"/>${dots}</svg>`;
}

/* 降雨機率:每 3 小時一根長條,依機率上色 */
function rainChart(f) {
  const tz = f.city.timezone, pts = f.list.map(it => ({ p: it.pop || 0, d: local(it.dt, tz) }));
  const W = 420, H = 230, L = 34, R = 12, T = 28, B = 34, bw = (W - L - R) / pts.length;
  const y = p => T + (H - T - B) * (1 - p);
  const color = p => `rgba(${Math.round(120 - p * 70)},${Math.round(190 - p * 60)},255,${0.45 + p * 0.5})`;
  const grid = [0, 0.5, 1].map(p => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" class="grid"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join("");
  const bars = pts.map((p, i) => `<rect x="${L + i * bw + 1}" y="${y(p.p)}" width="${Math.max(2, bw - 2)}" height="${Math.max(1.5, (H - T - B) * p.p)}" rx="2" fill="${color(p.p)}"><title>${p.d.getUTCMonth() + 1}/${p.d.getUTCDate()} ${pad(p.d.getUTCHours())}:00 降雨機率 ${round(p.p * 100)}%</title></rect>`).join("");
  const ticks = pts.map((p, i) => p.d.getUTCHours() === 0 || i === 0 ? `<line x1="${L + i * bw}" x2="${L + i * bw}" y1="${T}" y2="${H - B}" class="day-line"/><text x="${L + i * bw + 3}" y="${H - 8}">${i === 0 ? "現在" : `${p.d.getUTCMonth() + 1}/${p.d.getUTCDate()}`}</text>` : "").join("");
  const peak = pts.reduce((a, p, i) => p.p > pts[a].p ? i : a, 0);
  const mark = pts[peak].p > 0 ? `<text x="${L + peak * bw + bw / 2}" y="${y(pts[peak].p) - 7}" text-anchor="middle" class="mk">${round(pts[peak].p * 100)}%</text>` : "";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="未來五天每三小時降雨機率">${grid}${ticks}${bars}${mark}</svg>`;
}

/* 背景:目前城市的照片,換城市時淡入淡出 */
let bgFront = null;
function setBg(city) {
  const bg = $("#bg");
  if (bg.dataset.city === city.id) return;
  bg.dataset.city = city.id;
  const layer = document.createElement("div");
  layer.className = "bg-photo"; layer.style.backgroundImage = `url('img/${city.id}.jpg')`;
  bg.appendChild(layer);
  requestAnimationFrame(() => layer.classList.add("in"));
  const old = bgFront; bgFront = layer;
  if (old) setTimeout(() => old.remove(), 900);
}

/* 圖片來源與授權(Wikimedia Commons,依授權標示作者) */
fetch("img/credits.json").then(r => r.json()).then(cr => {
  $("#credits").innerHTML = CITIES.map(c => {
    const x = cr[c.id]; if (!x) return "";
    return `<li><b>${esc(c.name)}</b>:${esc(x.artist || "作者請見原頁")}・<a href="${esc(x.licenseUrl || x.page)}" target="_blank" rel="noopener">${esc(x.license)}</a>・<a href="${esc(x.page)}" target="_blank" rel="noopener">原圖頁面</a></li>`;
  }).join("");
}).catch(() => {});

/* 3 小時一點的氣溫曲線 */
function chartSvg(f) {
  const tz = f.city.timezone, pts = f.list.map(it => ({ t: it.main.temp, d: local(it.dt, tz) }));
  const W = 760, H = 190, L = 34, R = 12, T = 22, B = 30;
  const lo = Math.floor(Math.min(...pts.map(p => p.t)) - 1), hi = Math.ceil(Math.max(...pts.map(p => p.t)) + 1);
  const x = i => L + (W - L - R) * i / (pts.length - 1), y = t => T + (H - T - B) * (1 - (t - lo) / (hi - lo));
  let path = `M${x(0)} ${y(pts[0].t)}`;
  for (let i = 1; i < pts.length; i++) { const cx = (x(i - 1) + x(i)) / 2; path += ` C${cx} ${y(pts[i - 1].t)} ${cx} ${y(pts[i].t)} ${x(i)} ${y(pts[i].t)}`; }
  const grid = Array.from({ length: 4 }, (_, k) => { const t = lo + (hi - lo) * k / 3; return `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${round(t)}°</text>`; }).join("");
  const ticks = pts.map((p, i) => p.d.getUTCHours() === 0 || i === 0 ? `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}" class="day-line"/><text x="${x(i) + 4}" y="${H - 10}">${i === 0 ? "現在" : `${p.d.getUTCMonth() + 1}/${p.d.getUTCDate()} 週${WEEK[p.d.getUTCDay()]}`}</text>` : "").join("");
  const maxI = pts.reduce((a, p, i) => p.t > pts[a].t ? i : a, 0), minI = pts.reduce((a, p, i) => p.t < pts[a].t ? i : a, 0);
  const mark = i => `<circle cx="${x(i)}" cy="${y(pts[i].t)}" r="4.5" fill="${tempColor(pts[i].t)}" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${y(pts[i].t) - 9}" text-anchor="middle" class="mk">${round(pts[i].t)}°</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="未來五天每三小時氣溫曲線">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a" stop-opacity=".55"/><stop offset="1" stop-color="#4aa8ff" stop-opacity="0"/></linearGradient></defs>
    ${grid}${ticks}<path d="${path} L${x(pts.length - 1)} ${H - B} L${x(0)} ${H - B} Z" fill="url(#lg)"/><path d="${path}" class="line"/>${mark(maxI)}${mark(minI)}</svg>`;
}

/* ---------- 互動 ---------- */
wall.addEventListener("click", e => {
  const el = e.target.closest(".card"); if (!el) return;
  state.selected = CITIES.find(c => c.id === el.dataset.id);
  renderHero();
  $("#hero").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
});
$("#btnRefresh").addEventListener("click", () => loadAll(true).then(() => renderHero(true)));
$("#keyForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("#keyInput").value.trim();
  if (!/^[0-9a-f]{32}$/i.test(v)) { $("#keyMsg").textContent = "API Key 應該是 32 個字元的英數字,請再確認。"; return; }
  KEY = v; try { localStorage.setItem(KEY_STORE, v); } catch { /* 無法儲存時,本次仍可使用 */ }
  $("#keyInput").value = ""; cache = {}; loadAll(true);
});
$("#btnForget").addEventListener("click", () => { try { localStorage.removeItem(KEY_STORE); } catch { /* 略過 */ } KEY = ""; cache = {}; saveCache(); loadAll(true); });
setInterval(() => loadAll(), TTL);
filterWall();
loadAll();
