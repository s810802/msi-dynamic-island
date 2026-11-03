// 天氣場景與圖示:全部用 CSS 與 SVG 繪製,不需要任何圖片檔。
const rnd = (a, b) => a + Math.random() * (b - a);

// OpenWeather 天氣代碼 → 場景種類
export function kindOf(id) {
  if (id >= 200 && id < 300) return "thunder";
  if (id >= 300 && id < 400) return "drizzle";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return "clear";
  if (id === 801 || id === 802) return "partly";
  return "overcast";
}

const CLOUD_PATH = "M18 40c-6 0-11-4-11-10 0-5 4-9 9-10 2-6 7-10 14-10 8 0 14 5 15 12 5 0 9 4 9 9 0 5-4 9-9 9z";
const cloudSvg = (fill = "#fff", op = 1) => `<path d="${CLOUD_PATH}" fill="${fill}" opacity="${op}"/>`;

// 小圖示(預報與卡片用)
export function icon(kind, night = false, size = 56) {
  const sun = `<g class="ic-spin"><circle cx="32" cy="32" r="11" fill="#ffd54a"/>${Array.from({ length: 8 }, (_, i) => `<rect x="31" y="9" width="2.6" height="7" rx="1.3" fill="#ffd54a" transform="rotate(${i * 45} 32 32)"/>`).join("")}</g>`;
  const moon = `<path d="M40 14a18 18 0 1 0 12 30A15 15 0 0 1 40 14z" fill="#f3f1d6"/>`;
  const cl = (x, y, s, f = "#fff") => `<g transform="translate(${x} ${y}) scale(${s})">${cloudSvg(f)}</g>`;
  const body = {
    clear: night ? moon : sun,
    partly: (night ? moon : `<g transform="translate(-8 -6) scale(.8)">${sun}</g>`) + cl(10, 22, 0.85, "#f4f8ff"),
    overcast: cl(2, 12, 1, "#cfd8e3") + cl(14, 24, 0.85, "#eef3f9"),
    drizzle: cl(6, 6, 1, "#dfe7f1") + [20, 32, 44].map((x, i) => `<line x1="${x}" y1="46" x2="${x - 3}" y2="54" stroke="#7fc4ff" stroke-width="2.4" stroke-linecap="round" class="ic-drop" style="animation-delay:${i * 0.25}s"/>`).join(""),
    rain: cl(6, 4, 1, "#c4cfdc") + [16, 26, 36, 46].map((x, i) => `<line x1="${x}" y1="44" x2="${x - 4}" y2="56" stroke="#4aa8ff" stroke-width="2.8" stroke-linecap="round" class="ic-drop" style="animation-delay:${i * 0.2}s"/>`).join(""),
    thunder: cl(6, 2, 1, "#9aa6b8") + `<path d="M34 36l-8 14h7l-3 11 12-16h-7l4-9z" fill="#ffd54a" class="ic-flash"/>`,
    snow: cl(6, 4, 1, "#e3ebf5") + [18, 32, 46].map((x, i) => `<circle cx="${x}" cy="52" r="3" fill="#fff" class="ic-drop" style="animation-delay:${i * 0.3}s"/>`).join(""),
    fog: cl(6, 6, 1, "#e0e6ee") + [40, 47, 54].map((y, i) => `<rect x="${12 + (i % 2) * 6}" y="${y}" width="${36 - (i % 2) * 8}" height="3" rx="1.5" fill="#fff" opacity=".85"/>`).join(""),
  }[kind] || "";
  return `<svg class="wx-ic" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

// 整面場景(背景用):漸層天空 + 日月 + 雲 + 雨雪 + 星星 + 閃電
export function scene(kind, night, rich = true) {
  const k = `${kind} ${night ? "night" : "day"}`;
  const clouds = { clear: 0, partly: 2, overcast: 4, drizzle: 3, rain: 4, thunder: 4, snow: 3, fog: 2 }[kind];
  let h = `<div class="sc ${k}" aria-hidden="true">`;
  if (night && (kind === "clear" || kind === "partly")) h += `<div class="stars">${Array.from({ length: rich ? 36 : 16 }, () => `<i style="left:${rnd(0, 100)}%;top:${rnd(0, 70)}%;animation-delay:${rnd(0, 4)}s;transform:scale(${rnd(0.5, 1.4)})"></i>`).join("")}</div>`;
  if (kind === "clear" || kind === "partly") h += `<div class="orb"></div>`;
  for (let i = 0; i < clouds; i++) h += `<div class="cloud" style="top:${6 + i * 16 + rnd(-3, 3)}%;--s:${rnd(0.7, 1.4)};animation-duration:${rnd(40, 80)}s;animation-delay:-${rnd(0, 60)}s"></div>`;
  if (kind === "rain" || kind === "drizzle" || kind === "thunder") {
    const n = (rich ? 46 : 22) * (kind === "drizzle" ? 0.6 : 1);
    h += `<div class="rain">${Array.from({ length: Math.round(n) }, () => `<i style="left:${rnd(0, 100)}%;animation-duration:${rnd(0.55, 1.1)}s;animation-delay:-${rnd(0, 1.2)}s;opacity:${rnd(0.4, 0.9)}"></i>`).join("")}</div>`;
  }
  if (kind === "snow") h += `<div class="snow">${Array.from({ length: rich ? 40 : 18 }, () => `<i style="left:${rnd(0, 100)}%;width:${rnd(3, 7)}px;height:${rnd(3, 7)}px;animation-duration:${rnd(4, 9)}s;animation-delay:-${rnd(0, 9)}s"></i>`).join("")}</div>`;
  if (kind === "thunder") h += `<div class="bolt"></div>`;
  if (kind === "fog") h += `<div class="fog f1"></div><div class="fog f2"></div><div class="fog f3"></div>`;
  return h + `</div>`;
}

export const KIND_LABEL = { clear: "晴朗", partly: "多雲時晴", overcast: "陰天", drizzle: "毛毛雨", rain: "下雨", thunder: "雷雨", snow: "下雪", fog: "霧或霾" };
