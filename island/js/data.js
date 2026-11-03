// 內容資料:系列說明、規格與官網連結。想改文案只要改這裡。
// 規格只收錄公開報導(CES / Computex 2026、2026 春季更新)有寫出的數據,沒有的標「完整規格請見官網」。
export const OFFICIAL = {
  main: { label: "MSI 台灣官網", url: "https://tw.msi.com/" },
  store: { label: "MSI 台灣官方商店", url: "https://tw-store.msi.com/" },
  laptops: { label: "全部筆電(官網)", url: "https://tw.msi.com/Laptops" },
};
const store = q => `https://tw-store.msi.com/search?q=${encodeURIComponent(q)}&type=product`;

export const SERIES = {
  titan:    { name: "Titan",    group: "電競", desc: "旗艦級電競,追求極致效能與散熱。", model: "Titan 18 HX Dragon Edition Draco Epic", specs: ["40 週年旗艦機種", "完整規格請見官網"], url: store("Titan") },
  raider:   { name: "Raider",   group: "電競", desc: "高階電競,強調頂規硬體與炫目外觀。", model: "Raider 16 Max HX", specs: ["Ryzen 9 9955HX3D(16 核 32 緒)", "RTX 5090 Laptop GPU 175W", "整機功耗最高約 300W"], url: store("Raider") },
  stealth:  { name: "Stealth",  group: "電競", desc: "兼顧電競效能與輕薄機身,玩遊戲也能帶著走。", model: "Stealth 16 AI+", specs: ["完整規格請見官網"], url: store("Stealth") },
  katana:   { name: "Katana",   group: "電競", desc: "主流電競,入門高效能的熱門選擇。", model: "Katana 17.3 吋(2026 春季更新)", specs: ["17.3 吋 WQHD 螢幕", "Core i7-14650HX", "RTX 5070 / 5060 / 5050 可選"], url: store("Katana") },
  vector:   { name: "Vector",   group: "電競", desc: "高效能電競,兼顧性能與平衡。", model: "", specs: [], url: store("Vector") },
  cyborg:   { name: "Cyborg",   group: "電競", desc: "個性化外型的入門電競款。", model: "Cyborg 15(2026 重新設計)", specs: ["入門電競外型改版", "完整規格請見官網"], url: store("Cyborg") },
  creator:  { name: "Creator",  group: "創作", desc: "為剪輯、3D、設計打造,色彩準確且效能強。", model: "", specs: [], url: store("Creator") },
  prestige: { name: "Prestige", group: "商務", desc: "輕薄質感商務筆電,出差與會議的好夥伴。", model: "Prestige 13 AI+ / 14 / 16", specs: ["Core Ultra Series 3 處理器", "13 AI+ 重 899 g;14 吋 1.32 kg;16 吋 1.59 kg", "Prestige 14/16 電池 81Wh", "Flip 款:2.8K 120Hz OLED 觸控螢幕"], url: store("Prestige") },
  modern:   { name: "Modern",   group: "日常", desc: "學習、辦公、追劇,日常使用高 CP 值。", model: "Modern 14S / 16S", specs: ["Core Ultra Series 3 處理器", "起始重量 1.3 kg、雙記憶體插槽", "USB-A、USB-C、HDMI、RJ-45、MicroSD"], url: store("Modern") },
};
for (const [id, s] of Object.entries(SERIES)) { s.id = id; s.image = `../images/${id}.jpg`; }

// 四座島與各自承載的系列
export const ISLANDS = [
  { id: "core", name: "電競主島", blurb: "起伏的高地上坐落六個電競系列,是整個島群的入口。", series: ["titan", "raider", "stealth", "katana", "cyborg", "vector"] },
  { id: "creator", name: "創作島", blurb: "給剪輯、設計與 3D 創作者的工作室。", series: ["creator"] },
  { id: "business", name: "商務島", blurb: "輕薄質感,為出差與會議而生。", series: ["prestige"] },
  { id: "daily", name: "日常島", blurb: "學習、辦公、追劇的高 CP 值夥伴。", series: ["modern"] },
];
