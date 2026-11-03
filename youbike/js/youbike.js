const API = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";
if (location.search.includes("embed")) document.documentElement.classList.add("embed");

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

let stations = [], prev = new Map(), selectedId = null, mapFor = null, dataTime = null, loading = false;

/* ---------- 時間 ---------- */
const fmt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short" });
function tick() {
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  $("#now").textContent = `${parts.hour}:${parts.minute}:${parts.second}`;
  $("#today").textContent = `${parts.year}/${parts.month}/${parts.day} ${parts.weekday}`;
  if (dataTime) {
    const sec = Math.max(0, Math.round((Date.now() - dataTime.getTime()) / 1000));
    $("#ago").textContent = sec < 90 ? `${sec} 秒前` : `${Math.round(sec / 60)} 分鐘前`;
  }
}
setInterval(tick, 1000); tick();
const toDate = s => new Date(String(s).replace(" ", "T") + "+08:00");

/* ---------- 資料 ---------- */
async function load(manual = false) {
  if (loading) return;
  loading = true;
  const btn = $("#refresh"); btn.disabled = true; btn.classList.add("busy");
  $("#status").className = "status"; $("#status").textContent = "更新中…";
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error(`伺服器回應 ${res.status}`);
    const raw = await res.json();
    prev = new Map(stations.map(s => [s.sno, s]));
    stations = raw.map(r => ({
      sno: r.sno, name: String(r.sna).replace(/^YouBike2\.0_/, ""), area: r.sarea, addr: r.ar, ok: String(r.act) === "1",
      total: Number(r.Quantity ?? r.total ?? 0), bikes: Number(r.available_rent_bikes ?? 0), spaces: Number(r.available_return_bikes ?? 0),
      lat: Number(r.latitude), lon: Number(r.longitude), info: r.infoTime || r.mday, src: r.srcUpdateTime || r.updateTime,
    }));
    dataTime = toDate(stations.reduce((a, s) => s.src > a ? s.src : a, ""));
    $("#dataTime").textContent = stations.reduce((a, s) => s.src > a ? s.src : a, "").replace(/-/g, "/");
    const n = new Date();
    $("#status").textContent = `${manual ? "已手動更新" : "已更新"} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}・共 ${stations.length} 個租借站・每 60 秒自動更新`;
    if (!selectedId) selectedId = (stations.find(s => s.name.includes("市政府")) || stations[0])?.sno;
    buildSelectors(true);
    render();
  } catch (e) {
    $("#status").className = "status err";
    $("#status").textContent = `暫時查不到資料(${e.message})。${stations.length ? "目前顯示的是先前取得的資料。" : ""}請稍後按「立即更新」再試一次。`;
  } finally { loading = false; btn.disabled = false; btn.classList.remove("busy"); tick(); }
}

/* ---------- 選單 ---------- */
const areaSel = $("#area"), stSel = $("#station"), kw = $("#kw");
const areas = () => [...new Set(stations.map(s => s.area))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
function buildSelectors(keep) {
  const cur = stations.find(s => s.sno === selectedId);
  const area = keep && areaSel.value ? areaSel.value : (cur?.area || "all");
  areaSel.innerHTML = `<option value="all">全部行政區(${stations.length})</option>` + areas().map(a => `<option value="${esc(a)}">${esc(a)}(${stations.filter(s => s.area === a).length})</option>`).join("");
  areaSel.value = [...areaSel.options].some(o => o.value === area) ? area : "all";
  buildStations();
}
function filtered() {
  const q = kw.value.trim().toLowerCase().replace(/臺/g, "台");
  return stations.filter(s => (areaSel.value === "all" || s.area === areaSel.value) && (!q || s.name.toLowerCase().replace(/臺/g, "台").includes(q) || s.addr.includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}
function buildStations() {
  const list = filtered();
  stSel.innerHTML = list.length ? list.map(s => `<option value="${s.sno}">${esc(s.name)}・可借 ${s.bikes}</option>`).join("") : `<option value="">沒有符合的租借站</option>`;
  if (list.some(s => s.sno === selectedId)) stSel.value = selectedId;
  else if (list.length) { selectedId = list[0].sno; stSel.value = selectedId; }
}
areaSel.addEventListener("change", () => { buildStations(); render(); });
kw.addEventListener("input", () => { buildStations(); render(); });
stSel.addEventListener("change", () => { selectedId = stSel.value; render(); });
$("#refresh").addEventListener("click", () => load(true));
setInterval(() => { if (!document.hidden) load(); }, 60000);

/* ---------- 畫面 ---------- */
const level = n => n === 0 ? "low" : "";
function diffHtml(now, old, key) {
  if (!old) return "";
  const d = now[key] - old[key];
  return d === 0 ? "與上次相同" : `<span style="color:${(key === "bikes" ? d > 0 : d > 0) ? "#1fb36b" : "#ec4a55"}">${d > 0 ? "▲" : "▼"} ${Math.abs(d)}</span> 與上次比較`;
}
function dist(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function render() {
  renderDetail(); renderSummary(); renderAreas();
}
function renderDetail() {
  const s = stations.find(x => x.sno === selectedId), box = $("#detail");
  if (!s) { box.innerHTML = ""; return; }
  const old = prev.get(s.sno);
  const other = Math.max(0, s.total - s.bikes - s.spaces), tot = Math.max(1, s.total);
  const near = stations.filter(x => x.sno !== s.sno).map(x => ({ x, d: dist(s, x) })).filter(o => o.d <= 600).sort((a, b) => a.d - b.d).slice(0, 8);
  const note = !s.ok ? "此站目前暫停營運" : s.bikes === 0 ? "目前沒有車可借,可以看看下面附近的站" : s.spaces === 0 ? "目前沒有空位可還,可以看看下面附近的站" : s.bikes <= 3 ? "車輛不多,建議趕快!" : "車輛充足";
  box.innerHTML = `<article class="station">
    <div class="st-head"><div><span class="st-name">${esc(s.name)}</span><span class="st-area">${esc(s.area)}</span></div><span class="badge ${s.ok ? "ok" : "off"}">${s.ok ? "營運中" : "暫停營運"}</span></div>
    <p class="st-addr">📍 ${esc(s.addr)}</p>
    <div class="nums">
      <div class="num rent ${level(s.bikes)}"><small>🚲 可借車輛</small><b>${s.bikes}</b><span class="diff">${diffHtml(s, old, "bikes")}</span></div>
      <div class="num ret ${level(s.spaces)}"><small>🅿️ 可還空位</small><b>${s.spaces}</b><span class="diff">${diffHtml(s, old, "spaces")}</span></div>
      <div class="num tot"><small>🔢 車柱總數</small><b>${s.total}</b><span class="diff">${esc(note)}</span></div>
    </div>
    <div class="docks" role="img" aria-label="可借 ${s.bikes},可還 ${s.spaces},其他 ${other}"><i class="b" style="width:${s.bikes / tot * 100}%"></i><i class="r" style="width:${s.spaces / tot * 100}%"></i><i class="x" style="width:${other / tot * 100}%"></i></div>
    <div class="legend"><span><i style="background:#1fb36b"></i>可借車輛</span><span><i style="background:#2a8bf2"></i>可還空位</span><span><i style="background:#cfd6e4"></i>其他(維修或被占用)</span></div>
    <div class="st-meta"><span>🕒 此站資料時間:${esc(String(s.info).replace(/-/g, "/"))}</span><span>🧭 ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}</span></div>
    ${near.length ? `<div class="nearby"><h3>附近 600 公尺內的站點</h3><ul>${near.map(o => `<li><button type="button" data-sno="${o.x.sno}"><span>${esc(o.x.name)}</span><span class="n ${o.x.bikes === 0 ? "zero" : ""}">🚲 ${o.x.bikes}</span><small>${Math.round(o.d)} 公尺・可還 ${o.x.spaces}</small></button></li>`).join("")}</ul></div>` : ""}
  </article>`;
  box.querySelectorAll("[data-sno]").forEach(b => b.addEventListener("click", () => {
    selectedId = b.dataset.sno; const t = stations.find(x => x.sno === selectedId);
    areaSel.value = areaSel.value === "all" ? "all" : t.area; kw.value = ""; buildStations(); render();
    $("#detail").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }));
  if (mapFor !== s.sno) {
    mapFor = s.sno;
    $("#map").src = `https://www.google.com/maps?q=${s.lat},${s.lon}&z=17&hl=zh-TW&output=embed`;
    $("#mapTitle").textContent = `${s.name}(${s.area})`;
    $("#mapLink").href = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
  }
}
function renderSummary() {
  const act = stations.filter(s => s.ok), bikes = act.reduce((a, s) => a + s.bikes, 0), spaces = act.reduce((a, s) => a + s.spaces, 0);
  const none = act.filter(s => s.bikes === 0).length, full = act.filter(s => s.spaces === 0).length;
  $("#summary").innerHTML = [["🚲 全市可借車輛", bikes.toLocaleString(), "#1fb36b"], ["🅿️ 全市可還空位", spaces.toLocaleString(), "#2a8bf2"], ["📍 營運中站點", `${act.length}/${stations.length}`, "#ff8a00"], ["⚠️ 沒車的站", none, "#ec4a55"], ["⛔ 沒位子的站", full, "#a65fd6"]]
    .map(([k, v, c]) => `<div class="sum"><small>${k}</small><b style="color:${c}">${v}</b></div>`).join("");
}
function renderAreas() {
  const cur = stations.find(s => s.sno === selectedId)?.area;
  $("#areas").innerHTML = areas().map(a => {
    const l = stations.filter(s => s.area === a && s.ok), b = l.reduce((x, s) => x + s.bikes, 0), r = l.reduce((x, s) => x + s.spaces, 0);
    return `<button class="area" type="button" data-area="${esc(a)}" aria-pressed="${a === cur}"><b>${esc(a)}</b><span class="bar"><i style="width:${b / Math.max(1, b + r) * 100}%"></i></span><small>${l.length} 站・可借 ${b}・可還 ${r}</small></button>`;
  }).join("");
  $("#areas").querySelectorAll(".area").forEach(b => b.addEventListener("click", () => {
    areaSel.value = b.dataset.area; kw.value = ""; buildStations(); render();
    $("#detail").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }));
}

load();
