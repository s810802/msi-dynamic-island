// 主站的 128 種風格選擇:與 3D 小島共用同一份主題資料與同一個儲存鍵,在這裡選的風格,小島也會套用。
import { THEMES, FAMILY_LIST } from "../island/js/themes.js";

const STORE_KEY = "msi-island-theme-v1";
const root = document.documentElement.style;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function pickText(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1a1a1a" : "#ffffff";
}
function applyUi(theme, custom = {}) {
  const u = theme.ui, primary = custom.primary || u.primary;
  root.setProperty("--bg", u.bg1);
  root.setProperty("--bg-alt", u.surface);
  root.setProperty("--text", u.text);
  root.setProperty("--muted", u.muted);
  root.setProperty("--line", u.line);
  root.setProperty("--red", primary);
  root.setProperty("--on-red", custom.primary ? pickText(custom.primary) : u.onPrimary);
  root.setProperty("--red-soft", `color-mix(in srgb, ${primary} 14%, ${u.surface})`);
  root.setProperty("--island-bg", theme.scene.dark);
}

let applied = null, custom = {};
try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s) { applied = THEMES.find(t => t.id === s.id) || null; custom = s.custom || {}; } } catch {}
if (applied) applyUi(applied, custom);

const overlay = document.createElement("div");
overlay.className = "style-overlay"; overlay.hidden = true;
overlay.innerHTML = `<section class="style-sheet" role="dialog" aria-modal="true" aria-labelledby="sTitle">
  <header><h2 id="sTitle">選擇風格</h2><button id="sClose" aria-label="關閉">✕</button></header>
  <div class="style-body">
    <p id="sCurrent"></p>
    <div class="s-seg" role="group" aria-label="亮色或暗色"><button data-mode="light">☀ 亮色 64 種</button><button data-mode="dark">☾ 暗色 64 種</button></div>
    <div class="s-fams" id="sFams" role="group" aria-label="主題"></div>
    <p class="muted" id="sCount"></p>
    <div class="s-tiles" id="sGrid"></div>
    <div class="s-custom">
      <label>自訂主色 <input type="color" id="sPrimary"></label>
      <button id="sRandom">隨機</button><button id="sReset">還原預設</button>
    </div>
    <div class="s-actions"><button id="sCancel">取消</button><button id="sApply" class="primary">套用(記在這台裝置)</button></div>
  </div></section>`;
document.body.appendChild(overlay);
const fab = document.createElement("button");
fab.className = "style-fab"; fab.innerHTML = '<span class="lbl">風格 </span>✦ 128'; fab.setAttribute("aria-label", "選擇風格(共 128 種)");
document.body.appendChild(fab);

let mode = "light", family = "all", draft = applied, draftCustom = {}, lastFocus = null;
$("#sFams").innerHTML = `<button data-fam="all">全部</button>` + FAMILY_LIST.map(f => `<button data-fam="${f.id}">${f.name}</button>`).join("");
function render() {
  $$("[data-mode]", overlay).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  $$("[data-fam]", overlay).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fam === family)));
  const list = THEMES.filter(t => t.mode === mode && (family === "all" || t.family === family));
  $("#sGrid").innerHTML = list.map(t => `<button class="s-tile" data-id="${t.id}" aria-pressed="${draft?.id === t.id}" title="${t.name}">
    <span class="sw" style="background:linear-gradient(135deg,${t.scene.sea} 0 34%,${t.scene.lawn} 34% 62%,${t.scene.primary} 62% 82%,${t.scene.accent} 82%)"></span><span class="nm">${t.name}</span></button>`).join("");
  $("#sCount").textContent = `${list.length} 種(共 ${THEMES.length} 種:亮 64、暗 64)`;
  $("#sCurrent").textContent = draft ? `目前:${draft.name}${draftCustom.primary ? "(自訂色)" : ""}` : "目前:預設(MSI 紅黑)";
  $("#sPrimary").value = draftCustom.primary || draft?.scene.primary || "#e60012";
}
function open() { draft = applied; draftCustom = { ...custom }; mode = applied?.mode || "light"; family = "all"; lastFocus = document.activeElement; overlay.hidden = false; render(); $("#sClose").focus(); }
function close(keep) {
  if (keep !== true) { if (applied) applyUi(applied, custom); else location.reload(); }
  overlay.hidden = true; lastFocus?.focus?.();
}
fab.addEventListener("click", open);
$("#sClose").addEventListener("click", () => close(false));
$("#sCancel").addEventListener("click", () => close(false));
overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !overlay.hidden) close(false); });
$("#sFams").addEventListener("click", e => { const b = e.target.closest("[data-fam]"); if (b) { family = b.dataset.fam; render(); } });
$$("[data-mode]", overlay).forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; render(); }));
$("#sGrid").addEventListener("click", e => { const b = e.target.closest(".s-tile"); if (!b) return; draft = THEMES.find(t => t.id === b.dataset.id); draftCustom = {}; applyUi(draft); render(); });
$("#sPrimary").addEventListener("input", e => { if (!draft) draft = THEMES.find(t => t.id === "light-tech-1"); draftCustom.primary = e.target.value; applyUi(draft, draftCustom); });
$("#sRandom").addEventListener("click", () => { const l = THEMES.filter(t => t.mode === mode); draft = l[Math.floor(Math.random() * l.length)]; draftCustom = {}; applyUi(draft); render(); });
$("#sReset").addEventListener("click", () => { try { localStorage.removeItem(STORE_KEY); } catch {} location.reload(); });
$("#sApply").addEventListener("click", () => {
  if (!draft) return close(true);
  applied = draft; custom = { ...draftCustom };
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ id: applied.id, custom })); } catch {}
  close(true);
});
