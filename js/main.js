/* ===== 資料區:想改文案、系列,只要改這裡 ===== */
// 分數 1~5 為行銷示意的相對印象,非官方數據
const SERIES = [
  { id: "titan",   name: "Titan",   group: "電競", desc: "旗艦級電競,追求極致效能與散熱。",       score: { 效能: 5, 便攜: 1, 創作: 4, 價格: 1 } },
  { id: "raider",  name: "Raider",  group: "電競", desc: "高階電競,強調頂規硬體與炫目外觀。",     score: { 效能: 5, 便攜: 2, 創作: 4, 價格: 2 } },
  { id: "stealth", name: "Stealth", group: "電競", desc: "兼顧電競效能與輕薄機身,玩遊戲也能帶著走。", score: { 效能: 4, 便攜: 4, 創作: 4, 價格: 2 } },
  { id: "vector", name: "Vector",  group: "電競", desc: "高效能電競,兼顧性能與平衡。",           score: { 效能: 4, 便攜: 2, 創作: 3, 價格: 3 } },
  { id: "katana",  name: "Katana",  group: "電競", desc: "主流電競,入門高效能的熱門選擇。",       score: { 效能: 4, 便攜: 3, 創作: 3, 價格: 4 } },
  { id: "cyborg",  name: "Cyborg",  group: "電競", desc: "個性化外型的入門電競款。",               score: { 效能: 3, 便攜: 3, 創作: 2, 價格: 5 } },
  { id: "creator", name: "Creator", group: "創作", desc: "為剪輯、3D、設計打造,色彩準確且效能強。", score: { 效能: 4, 便攜: 3, 創作: 5, 價格: 2 } },
  { id: "prestige",name: "Prestige",group: "商務", desc: "輕薄質感商務筆電,出差與會議的好夥伴。", score: { 效能: 3, 便攜: 5, 創作: 3, 價格: 3 } },
  { id: "modern",  name: "Modern",  group: "日常", desc: "學習、辦公、追劇,日常使用高 CP 值。",   score: { 效能: 2, 便攜: 4, 創作: 2, 價格: 5 } },
];

// 代表機種與規格:僅收錄公開報導(CES / Computex 2026、2026 春季更新)有明確寫出的數據
// 未找到可靠資料的欄位留空,卡片會顯示「規格請見官網」。上線前請再對照 MSI 官網。
const SPECS = {
  titan:    { model: "Titan 18 HX Dragon Edition Draco Epic", lines: ["40 週年旗艦機種", "完整規格請見官網"] },
  raider:   { model: "Raider 16 Max HX", lines: ["Ryzen 9 9955HX3D(16 核 32 緒)", "RTX 5090 Laptop GPU 175W", "整機功耗最高約 300W"] },
  stealth:  { model: "Stealth 16 AI+", lines: ["完整規格請見官網"] },
  vector:   { model: "", lines: [] },
  katana:   { model: "Katana 17.3 吋(2026 春季更新)", lines: ["17.3 吋 WQHD 螢幕", "Core i7-14650HX", "RTX 5070 / 5060 / 5050 可選"] },
  cyborg:   { model: "Cyborg 15(2026 重新設計)", lines: ["入門電競外型改版", "完整規格請見官網"] },
  creator:  { model: "", lines: [] },
  prestige: { model: "Prestige 13 AI+ / 14 / 16", lines: ["Core Ultra Series 3 處理器", "13 AI+ 重 899 g;14 吋 1.32 kg;16 吋 1.59 kg", "Prestige 14/16 電池 81Wh", "Flip 款:2.8K 120Hz OLED 觸控螢幕"] },
  modern:   { model: "Modern 14S / 16S", lines: ["Core Ultra Series 3 處理器", "起始重量 1.3 kg、雙記憶體插槽", "USB-A、USB-C、HDMI、RJ-45、MicroSD"] },
};

const NOTICES = [
  "🔥 新品上市:快來看看最新系列",
  "🎓 學生專屬優惠請洽官方通路",
  "💡 不知道怎麼選?試試「3 題幫我選」",
];

const QUIZ = [
  { q: "你最常拿筆電做什麼?", opts: [
      { t: "玩遊戲", w: { 電競: 3 } },
      { t: "剪片、設計、3D", w: { 創作: 3 } },
      { t: "工作、開會、出差", w: { 商務: 3 } },
      { t: "上課、追劇、上網", w: { 日常: 3 } } ] },
  { q: "你的預算大概?", opts: [
      { t: "不設限,要最好", w: { 電競: 1, 創作: 1 }, pick: ["titan", "raider"] },
      { t: "中高價位", w: { 電競: 1, 創作: 1, 商務: 1 }, pick: ["vector", "creator", "prestige"] },
      { t: "親民實用", w: { 日常: 1, 電競: 1 }, pick: ["katana", "cyborg", "modern"] } ] },
  { q: "你會常常帶著走嗎?", opts: [
      { t: "天天帶,越輕越好", w: { 商務: 2, 日常: 2 } },
      { t: "偶爾移動", w: { 創作: 1, 電競: 1 } },
      { t: "多半放桌上", w: { 電競: 2 } } ] },
];

/* ===== 小工具 ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ===== 動態島 ===== */
const island = $("#island");
let noticeTimer, noticeIdx = 0;

function setMode(m) { island.dataset.mode = m; }
function openIsland(tab) {
  clearTimeout(noticeTimer);
  setMode("open");
  if (tab) switchTab(tab);
}
function closeIsland() { setMode("idle"); scheduleNotice(); }

function switchTab(name) {
  $$(".tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === name));
  $$(".pane").forEach(p => p.classList.toggle("is-active", p.dataset.pane === name));
}

$("#islandIdle").addEventListener("click", () => openIsland("nav"));
$("#islandClose").addEventListener("click", closeIsland);
$$(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
$$(".nav-link").forEach(a => a.addEventListener("click", closeIsland));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeIsland(); });
document.addEventListener("click", e => {
  if (island.dataset.mode === "open" && !island.contains(e.target)) closeIsland();
});

/* 通知:閒置時定時彈出 */
function scheduleNotice() {
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    if (island.dataset.mode !== "idle") return scheduleNotice();
    $("#noticeText").textContent = NOTICES[noticeIdx++ % NOTICES.length];
    setMode("notice");
    noticeTimer = setTimeout(() => { if (island.dataset.mode === "notice") setMode("idle"); scheduleNotice(); }, 3500);
  }, 8000);
}
scheduleNotice();

/* 目前所在區塊 → 顯示在收合的島上 */
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) $("#idleSection").textContent = e.target.dataset.name; });
}, { rootMargin: "-40% 0px -55% 0px" });
$$("[data-name]").forEach(s => sectionObs.observe(s));

/* ===== 島:系列切換 ===== */
const chipsBox = $("#islandChips");
SERIES.forEach(s => {
  const b = document.createElement("button");
  b.className = "chip"; b.textContent = s.name; b.dataset.id = s.id;
  b.addEventListener("click", () => selectSeries(s.id));
  chipsBox.appendChild(b);
});
function selectSeries(id) {
  const s = SERIES.find(x => x.id === id);
  $$(".chip").forEach(c => c.classList.toggle("is-active", c.dataset.id === id));
  $("#islandSeriesDesc").textContent = `【${s.group}】${s.desc}`;
  focusCard(id);
}
selectSeries("titan");

/* ===== 島:比較 ===== */
const cmpA = $("#cmpA"), cmpB = $("#cmpB");
SERIES.forEach(s => {
  cmpA.add(new Option(s.name, s.id));
  cmpB.add(new Option(s.name, s.id));
});
cmpA.value = "raider"; cmpB.value = "modern";
function renderCompare() {
  const a = SERIES.find(s => s.id === cmpA.value), b = SERIES.find(s => s.id === cmpB.value);
  $("#cmpBars").innerHTML = Object.keys(a.score).map(k => `
    <div class="cmp-row"><span>${k}</span>
      <div class="bar"><i class="a" style="width:${a.score[k] * 20}%"></i><i class="b" style="width:${b.score[k] * 20}%"></i></div>
    </div>`).join("");
}
cmpA.addEventListener("change", renderCompare);
cmpB.addEventListener("change", renderCompare);
renderCompare();

/* ===== 系列卡片 ===== */
const GROUPS = ["全部", ...new Set(SERIES.map(s => s.group))];
const filterBox = $("#filter"), cardsBox = $("#cards");
GROUPS.forEach((g, i) => {
  const b = document.createElement("button");
  b.textContent = g; if (i === 0) b.classList.add("is-active");
  b.addEventListener("click", () => {
    $$("#filter button").forEach(x => x.classList.toggle("is-active", x === b));
    $$(".card").forEach(c => c.classList.toggle("hide", g !== "全部" && c.dataset.group !== g));
  });
  filterBox.appendChild(b);
});
cardsBox.innerHTML = SERIES.map(s => `
  <article class="card" data-id="${s.id}" data-group="${s.group}">
    <div class="thumb">
      <svg viewBox="0 0 120 80" aria-hidden="true"><rect x="22" y="8" width="76" height="48" rx="4" fill="#cfd4dc"/><path d="M8 62h104l-6 8H14z" fill="#b3b9c4"/></svg>
      <img src="images/${s.id}.jpg" alt="MSI ${s.name} 筆電" loading="lazy" onerror="this.remove()">
    </div>
    <span class="tag">${s.group}</span>
    <h3>${s.name}</h3>
    <p>${s.desc}</p>
    <div class="specs">
      ${SPECS[s.id].model ? `<strong>${SPECS[s.id].model}</strong>` : ""}
      ${SPECS[s.id].lines.length
        ? `<ul>${SPECS[s.id].lines.map(l => `<li>${l}</li>`).join("")}</ul>`
        : `<p class="spec-none">規格請見官網</p>`}
    </div>
  </article>`).join("");

function focusCard(id) {
  $$(".card").forEach(c => c.classList.toggle("is-focus", c.dataset.id === id));
}

/* ===== 3 題幫我選 ===== */
const quizBox = $("#quiz");
let step = 0, scoreMap = {}, picks = [];

function renderQuiz() {
  if (step >= QUIZ.length) return renderResult();
  const q = QUIZ[step];
  quizBox.innerHTML = `<p class="q-step">第 ${step + 1} / ${QUIZ.length} 題:${q.q}</p><div class="q-opts"></div>`;
  q.opts.forEach(o => {
    const b = document.createElement("button");
    b.className = "q-opt"; b.textContent = o.t;
    b.addEventListener("click", () => {
      for (const k in o.w) scoreMap[k] = (scoreMap[k] || 0) + o.w[k];
      if (o.pick) picks = o.pick;
      step++; renderQuiz();
    });
    $(".q-opts", quizBox).appendChild(b);
  });
}
function renderResult() {
  const top = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0][0];
  let pool = SERIES.filter(s => s.group === top);
  const narrowed = pool.filter(s => picks.includes(s.id));
  const result = (narrowed[0] || pool[0]);
  quizBox.innerHTML = `
    <div class="q-result">
      <p>推薦你看看</p>
      <h3>MSI ${result.name} 系列</h3>
      <p>${result.desc}</p>
      <button class="btn btn-primary" id="quizGo">在系列區看看</button>
      <button class="btn btn-ghost" id="quizRetry">重新測驗</button>
    </div>`;
  $("#quizGo").addEventListener("click", () => {
    $$("#filter button")[0].click();
    focusCard(result.id);
    $("#series").scrollIntoView();
  });
  $("#quizRetry").addEventListener("click", () => { step = 0; scoreMap = {}; picks = []; renderQuiz(); });
}
renderQuiz();

/* ===== 聯絡表單 =====
   純靜態網站沒有伺服器,所以按送出會開啟訪客的郵件程式,內容已幫忙填好。
   把下面的信箱換成你要收信的地址。 */
const CONTACT_EMAIL = "s810802@gmail.com";
$("#contactForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  const subject = `[MSI 網站詢問] ${f.topic.value}`;
  const body = `姓名:${f.name.value}\n聯絡信箱:${f.email.value}\n感興趣的系列:${f.topic.value}\n\n${f.message.value}`;
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $("#formHint").textContent = "已開啟你的郵件程式,請在裡面按「傳送」完成寄出。";
});
$("#topic").innerHTML = ["不確定,想請你推薦", ...SERIES.map(s => s.name)].map(t => `<option>${t}</option>`).join("");

/* ===== 捲動淡入 ===== */
const revealObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); }
}), { threshold: .12 });
$$(".card, .feature, .section > h2").forEach(el => { el.classList.add("reveal"); revealObs.observe(el); });
