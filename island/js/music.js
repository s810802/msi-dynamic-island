// 原創的輕快背景音樂,用瀏覽器內建的 Web Audio 即時合成,不需要任何音檔,也沒有版權問題。
// C 大調五聲音階旋律 + 彈撥音琶音 + 輕輕的沙鈴節奏,循環播放。
const NOTE = { C3: 130.81, F2: 87.31, G2: 98, A2: 110, B4: 493.88, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };
const CHORDS = [
  { bass: "C3", tri: ["C4", "E4", "G4"] }, { bass: "G2", tri: ["D4", "G4", "B4"] },
  { bass: "A2", tri: ["C4", "E4", "A4"] }, { bass: "F2", tri: ["C4", "F4", "A4"] },
];
const MELODY = [
  ["E5", 0, "G5", 0, "A5", "G5", "E5", 0, "G5", 0, "E5", "D5", "C5", 0, "D5", 0],
  ["D5", 0, "E5", 0, "G5", "E5", "D5", 0, "B4", 0, "D5", "E5", "D5", 0, 0, 0],
  ["C5", 0, "E5", 0, "A5", 0, "G5", "E5", "C5", 0, "E5", 0, "G5", "A5", "G5", 0],
  ["A5", 0, "G5", 0, "F5", "E5", "D5", 0, "E5", 0, "C5", 0, "D5", "E5", "C5", 0],
];

export function createMusic() {
  let ctx = null, master = null, timer = null, nextTime = 0, step = 0, on = false;
  const BPM = 108, stepLen = 60 / BPM / 4;

  function pluck(freq, when, dur, vol) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o2.type = "sine"; o.frequency.value = freq; o2.frequency.value = freq * 2;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(when); o2.start(when); o.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
  }
  function shaker(when) {
    const len = 0.05, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; hp.type = "highpass"; hp.frequency.value = 6000; g.gain.value = 0.05;
    src.connect(hp); hp.connect(g); g.connect(master); src.start(when);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % 4, i = step % 16, chord = CHORDS[bar], n = MELODY[bar][i];
      if (n) pluck(NOTE[n], nextTime, 0.45, 0.16);
      if (i % 4 === 0) pluck(NOTE[chord.bass], nextTime, 0.5, i % 8 === 0 ? 0.2 : 0.12);
      if (i === 0 || i === 8) chord.tri.forEach(k => pluck(NOTE[k], nextTime + 0.01, 0.9, 0.05));
      if (i % 4 === 2) shaker(nextTime);
      nextTime += stepLen; step++;
    }
  }
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  }
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !on) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });
  return {
    get on() { return on; },
    async start() {
      ensure(); await ctx.resume();
      if (on) return; on = true;
      nextTime = ctx.currentTime + 0.1;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.45, ctx.currentTime, 0.4);
      timer = setInterval(schedule, 60); schedule();
    },
    stop() {
      if (!ctx || !on) return; on = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      clearInterval(timer); timer = null;
    },
  };
}
