/* ===== 資料區:想改文案、系列,只要改這裡 ===== */
// 分數 1~5 為行銷示意的相對印象,非官方數據
const SERIES = [
  { id: "titan",   name: "Titan",   group: "電競", desc: "旗艦級電競,追求極致效能與散熱。",       score: { 效能: 5, 便攜: 1, 創作: 4, 價格: 1 } },
  { id: "raider",  name: "Raider",  group: "電競", desc: "高階電競,強調頂規硬體與炫目外觀。",     score: { 效能: 5, 便攜: 2, 創作: 4, 價格: 2 } },
  { id: "vector",  name: "Vector",  group: "電競", desc: "高效能電競,兼顧性能與平衡。",           score: { 效能: 4, 便攜: 2, 創作: 3, 價格: 3 } },
  { id: "katana",  name: "Katana",  group: "電競", desc: "主流電競,入門高效能的熱門選擇。",       score: { 效能: 4, 便攜: 3, 創作: 3, 價格: 4 } },
  { id: "cyborg",  name: "Cyborg",  group: "電競", desc: "個性化外型的入門電競款。",               score: { 效能: 3, 便攜: 3, 創作: 2, 價格: 5 } },
  { id: "creator", name: "Creator", group: "創作", desc: "為剪輯、3D、設計打造,色彩準確且效能強。", score: { 效能: 4, 便攜: 3, 創作: 5, 價格: 2 } },
  { id: "prestige",name: "Prestige",group: "商務", desc: "輕薄質感商務筆電,出差與會議的好夥伴。", score: { 效能: 3, 便攜: 5, 創作: 3, 價格: 3 } },
  { id: "modern",  name: "Modern",  group: "日常", desc: "學習、辦公、追劇,日常使用高 CP 值。",   score: { 效能: 2, 便攜: 4, 創作: 2, 價格: 5 } },
];

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
    <span class="tag">${s.group}</span>
    <h3>${s.name}</h3>
    <p>${s.desc}</p>
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

/* ===== 捲動淡入 ===== */
const revealObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); }
}), { threshold: .12 });
$$(".card, .feature, .section > h2").forEach(el => { el.classList.add("reveal"); revealObs.observe(el); });
