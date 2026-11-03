// 128 種風格 = 16 個主題 × 4 種變化 × 亮/暗 兩種模式(各 64 種)。
// 顏色由色相公式產生,3D 場景與介面共用同一份,所以換風格時兩邊一起變。

const FAMILIES = [
  { id: "tech",    name: "科技感", h: 210, ah: 175, sea: 200, land: 165, s: 0.7,  warm: 0.15 },
  { id: "cartoon", name: "卡通",   h: 8,   ah: 48,  sea: 190, land: 105, s: 0.85, warm: 0.5 },
  { id: "land",    name: "風景",   h: 130, ah: 38,  sea: 195, land: 95,  s: 0.6,  warm: 0.45 },
  { id: "ocean",   name: "海洋",   h: 195, ah: 20,  sea: 190, land: 160, s: 0.7,  warm: 0.4 },
  { id: "cloud",   name: "雲海",   h: 215, ah: 335, sea: 212, land: 200, s: 0.45, warm: 0.2 },
  { id: "forest",  name: "森林",   h: 150, ah: 30,  sea: 175, land: 120, s: 0.55, warm: 0.35 },
  { id: "desert",  name: "沙漠",   h: 28,  ah: 8,   sea: 185, land: 42,  s: 0.65, warm: 0.7 },
  { id: "aurora",  name: "極光",   h: 165, ah: 285, sea: 190, land: 150, s: 0.65, warm: 0.1 },
  { id: "sakura",  name: "櫻花",   h: 340, ah: 18,  sea: 200, land: 110, s: 0.6,  warm: 0.5 },
  { id: "retro",   name: "復古",   h: 22,  ah: 175, sea: 180, land: 75,  s: 0.5,  warm: 0.65 },
  { id: "neon",    name: "霓虹",   h: 300, ah: 180, sea: 215, land: 250, s: 0.9,  warm: 0.1 },
  { id: "candy",   name: "糖果",   h: 322, ah: 45,  sea: 185, land: 150, s: 0.8,  warm: 0.5 },
  { id: "space",   name: "宇宙",   h: 262, ah: 40,  sea: 235, land: 270, s: 0.7,  warm: 0.1 },
  { id: "volcano", name: "火山",   h: 6,   ah: 40,  sea: 195, land: 20,  s: 0.75, warm: 0.6 },
  { id: "snow",    name: "雪地",   h: 205, ah: 350, sea: 200, land: 195, s: 0.35, warm: 0.1 },
  { id: "ink",     name: "水墨",   h: 200, ah: 10,  sea: 200, land: 150, s: 0.12, warm: 0.3 },
];

const LIGHT_VARIANTS = [
  { name: "晨曦", dh: 0,   dl: 0.02 },
  { name: "正午", dh: 16,  dl: 0 },
  { name: "午後", dh: -16, dl: -0.01 },
  { name: "暮色", dh: 34,  dl: -0.03 },
];
const DARK_VARIANTS = [
  { name: "子夜", dh: 0,   dl: 0 },
  { name: "星夜", dh: 16,  dl: 0.02 },
  { name: "月光", dh: -16, dl: 0.03 },
  { name: "破曉", dh: 34,  dl: -0.01 },
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = x => Math.round(f(x) * 255).toString(16).padStart(2, "0");
  return `#${hex(0)}${hex(8)}${hex(4)}`;
}

function buildTheme(fam, variant, mode) {
  const dark = mode === "dark";
  const { dh, dl } = variant;
  const h = fam.h + dh, ah = fam.ah + dh * 0.5;
  const sea = fam.sea + dh * 0.3, land = fam.land + dh * 0.4;
  const s = fam.s;
  const shoreH = 36 + fam.warm * 10;
  const scene = dark ? {
    sea: hsl(sea, 0.5 * s + 0.1, 0.3 + dl), deep: hsl(sea + 8, 0.5 * s + 0.1, 0.2 + dl),
    lawn: hsl(land, 0.3 * s + 0.1, 0.42 + dl), shore: hsl(shoreH, 0.25 + fam.warm * 0.2, 0.52),
    primary: hsl(h, 0.65 * s + 0.15, 0.6), accent: hsl(ah, 0.8, 0.66),
    dark: hsl(h, 0.25, 0.14), cream: hsl(shoreH, 0.25, 0.82), glass: hsl(sea, 0.45, 0.6),
    sky: hsl(sea, 0.4, 0.45), ground: hsl(sea, 0.3, 0.2),
  } : {
    sea: hsl(sea, 0.55 * s + 0.2, 0.74 + dl), deep: hsl(sea + 8, 0.5 * s + 0.2, 0.62 + dl),
    lawn: hsl(land, 0.42 * s + 0.15, 0.72 + dl), shore: hsl(shoreH, 0.5, 0.82),
    primary: hsl(h, 0.62 * s + 0.2, 0.52), accent: hsl(ah, 0.8, 0.62),
    dark: hsl(h, 0.25, 0.26), cream: hsl(shoreH, 0.7, 0.93), glass: hsl(sea, 0.5, 0.8),
    sky: "#fffcf0", ground: "#6b8f85",
  };
  const ui = dark ? {
    bg1: hsl(h, 0.3, 0.1), bg2: hsl(sea, 0.35, 0.18),
    surface: hsl(h, 0.22, 0.16), text: hsl(h, 0.2, 0.93), muted: hsl(h, 0.15, 0.72),
    primary: hsl(h, 0.65 * s + 0.15, 0.66), onPrimary: hsl(h, 0.3, 0.1), line: hsl(h, 0.2, 0.3),
  } : {
    bg1: hsl(sea, 0.55, 0.95), bg2: hsl(sea, 0.5, 0.86),
    surface: hsl(h, 0.45, 0.985), text: hsl(h, 0.3, 0.14), muted: hsl(h, 0.15, 0.36),
    primary: hsl(h, 0.6 * s + 0.2, 0.3), onPrimary: "#ffffff", line: hsl(h, 0.25, 0.85),
  };
  return { scene, ui, dark };
}

export const THEMES = [];
for (const mode of ["light", "dark"]) {
  FAMILIES.forEach((fam, fi) => {
    (mode === "light" ? LIGHT_VARIANTS : DARK_VARIANTS).forEach((variant, vi) => {
      THEMES.push({
        id: `${mode}-${fam.id}-${vi + 1}`,
        family: fam.id, familyName: fam.name, mode,
        name: `${fam.name}・${variant.name}`,
        index: fi * 4 + vi + 1,
        ...buildTheme(fam, variant, mode),
      });
    });
  });
}
export const FAMILY_LIST = FAMILIES.map(f => ({ id: f.id, name: f.name }));
export const DEFAULT_THEME_ID = "light-tech-1";
