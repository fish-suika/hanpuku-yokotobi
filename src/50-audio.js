// ===== 効果音（WebAudio で合成。音声ファイルなし・BGMなし。キュッキュッのリズムが音楽の代わり）=====
const Snd = (() => {
  let ac = null, master = null, noiseBuf = null, murGain = null, lastSq = -1, lastTone = 0;

  function init() {
    if (!ac) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        const comp = ac.createDynamicsCompressor();   // 重なっても割れないように
        comp.threshold.value = -14; comp.ratio.value = 6;
        master = ac.createGain(); master.gain.value = 0.62;
        master.connect(comp); comp.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        // ざわめき（体育館の人の声）。段階が上がると大きくなる
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 800; fl.Q.value = 0.7;
        murGain = ac.createGain(); murGain.gain.value = 0;
        src.connect(fl); fl.connect(murGain); murGain.connect(master); src.start();
      } catch (_) { ac = null; return; }
    }
    if (ac.state === 'suspended') ac.resume();
  }
  const now = () => ac.currentTime;

  function tone(f, t0, dur, o) {
    if (!ac) return;
    o = o || {};
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const a = o.attack || 0.005, v = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, o) {
    if (!ac) return;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f, t0); fl.Q.value = o.q || 1;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const g = ac.createGain();
    const env = o.env || [[0, 0], [0.05, 1], [1, 0]];
    g.gain.setValueAtTime(0.0001, t0);
    for (const [p, v] of env) g.gain.linearRampToValueAtTime(Math.max(0.0001, v * (o.gain == null ? 0.3 : o.gain)), t0 + p * dur);
    src.connect(fl); fl.connect(g); g.connect(master);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  }
  // ホイッスル：2つの近い音のうなりでピッと鳴る
  function whistle(t0, dur) {
    tone(2850, t0, dur, { gain: 0.22, attack: 0.01 });
    tone(2930, t0, dur, { gain: 0.2, attack: 0.01 });
    noise(t0, dur, { f: 3300, q: 4, gain: 0.07, env: [[0, 0], [0.05, 1], [0.9, 0.7], [1, 0]] });
  }

  return {
    init,
    // 体育館シューズのキュッ
    squeak() {
      if (!ac) return; const t = now();
      if (t - lastSq < 0.03) return;   // 重なりすぎたら間引く
      lastSq = t;
      const f = 1500 + Math.random() * 800;
      noise(t, 0.075, { f, f2: f * 1.9, q: 7, gain: 0.2, env: [[0, 0], [0.12, 1], [1, 0]] });
      tone(f * 0.55, t, 0.05, { type: 'triangle', gain: 0.035, f2: f });
    },
    whistleStart() { if (ac) whistle(now(), 0.2); },
    whistleEnd() { if (ac) whistle(now(), 1.1); },
    // 転ぶ：ドサッ
    trip() {
      if (!ac) return; const t = now();
      tone(320, t, 0.28, { type: 'triangle', gain: 0.26, f2: 85 });
      noise(t + 0.05, 0.14, { f: 420, type: 'lowpass', gain: 0.4 });
    },
    // 段階アップ：上がっていく音
    levelUp(l) {
      if (!ac) return; const t = now();
      const semis = [0, 2, 4, 7, 9, 12, 16];
      const n = Math.min(l + 1, 6);
      for (let i = 0; i < n; i++) tone(523.3 * Math.pow(2, semis[i] / 12), t + i * 0.055, 0.18, { type: 'triangle', gain: 0.11 });
      this.cheer(l, l >= 5);
    },
    cheer(n, big) {
      if (!ac) return; const t = now(), k = 0.3 + 0.07 * Math.min(n || 1, 8), len = big ? 1.4 : 0.7;
      noise(t, len, { f: 900, q: 0.8, gain: 0.45 * k, env: [[0, 0], [0.12, 1], [0.6, 0.7], [1, 0]] });
      noise(t, len, { f: 1700, f2: 2100, q: 1.4, gain: 0.25 * k, env: [[0, 0], [0.18, 1], [0.7, 0.6], [1, 0]] });
    },
    // ざわめきの大きさを段階に合わせる
    murmur(l) {
      if (!ac) return;
      murGain.gain.setTargetAtTime(l >= 3 ? 0.05 + 0.05 * (l - 3) : 0, now(), 0.3);
    },
    // ゼーゼー
    pant() {
      if (!ac) return; const t = now();
      noise(t, 0.5, { f: 1200, f2: 600, q: 1.2, gain: 0.12, env: [[0, 0], [0.3, 1], [1, 0]] });
      noise(t + 0.6, 0.5, { f: 1200, f2: 600, q: 1.2, gain: 0.1, env: [[0, 0], [0.3, 1], [1, 0]] });
    },
    // 記録用紙にポン
    stamp() {
      if (!ac) return; const t = now();
      tone(150, t, 0.16, { gain: 0.5, f2: 55 });
      noise(t, 0.08, { f: 700, type: 'lowpass', gain: 0.3 });
    },
  };
})();
