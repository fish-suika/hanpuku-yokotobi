// ===== ゲームのロジック（画面を使わない）=====
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 位置: 0=左の線 1=中央 2=右の線。side: -1=左をタップ 1=右をタップ
const Game = {
  mode: 'title',   // title → ready → play → finish → over
  t: 0, readyT: 0, finT: 0, seed: 1, rand: null,
  pos: 1, lastSide: 0, xv: 0, stun: 0,
  stepTimes: [], rate: 0, lvl: 0, upT: 0, downT: 0,
  rec: 0, steps: 0, trips: 0, maxN: 1, maxLvl: 0,
  events: [],

  reset(seed) {
    this.seed = seed == null ? (Date.now() & 0xffff) : seed;
    this.rand = mulberry32(this.seed);
    this.mode = 'title';
    this.t = 0; this.readyT = 0; this.finT = 0;
    this.pos = 1; this.lastSide = 0; this.xv = 0; this.stun = 0;
    this.stepTimes = []; this.rate = 0; this.lvl = 0; this.upT = 0; this.downT = 0;
    this.rec = 0; this.steps = 0; this.trips = 0; this.maxN = 1; this.maxLvl = 0;
    this.events = [];
  },

  begin() {
    if (this.mode !== 'title') return;
    this.mode = 'ready'; this.readyT = 0;
    this.events.push({ type: 'ready' });
  },

  bodies() { return CFG.bodies[this.lvl]; },

  // 次にタップしてよい側（-1/1）の一覧
  nextSides() {
    if (this.pos === 1) return this.lastSide === 0 ? [-1, 1] : [-this.lastSide];
    return [this.pos === 0 ? 1 : -1];
  },
  // 次に光らせる線（0/1/2）の一覧
  nextLines() {
    if (this.pos === 1) return this.nextSides().map(s => 1 + s);
    return [1];
  },

  // 左右のタップ。'step' 正しく跳んだ / 'trip' 転んだ / 'stun' 転んで動けない間 / 'ignored'
  input(side) {
    if (this.mode !== 'play') return 'ignored';
    if (this.stun > 0) return 'stun';
    let ok;
    if (this.pos === 1) ok = this.lastSide === 0 || side !== this.lastSide;   // 中央から、さっき行った側へまた跳ぶと転ぶ
    else ok = side === (this.pos === 0 ? 1 : -1);                             // 外の線から外へ跳ぶとはみ出して転ぶ
    if (ok) {
      if (this.pos === 1) { this.pos = 1 + side; this.lastSide = side; }
      else this.pos = 1;
      const n = this.bodies();
      this.steps++; this.rec += n;
      this.stepTimes.push(this.t);
      this.events.push({ type: 'step', n, side, pos: this.pos });
      return 'step';
    }
    const was = this.lvl;
    this.trips++;
    this.stun = CFG.stunSecs;
    this.stepTimes.length = 0; this.rate = 0;
    this.lvl = Math.max(0, this.lvl - CFG.stunDrop);
    this.upT = 0; this.downT = 0;
    const wrongPos = this.pos;
    this.pos = 1;   // 転んだあとは中央から（lastSide は残すので、次は反対側へ行けばリズムがつながる）
    this.events.push({ type: 'trip', was, lvl: this.lvl, from: wrongPos, side, want: this.nextSides() });
    return 'trip';
  },

  candidate(rate) {
    let c = 0;
    for (let i = 0; i < CFG.levelRate.length; i++) if (rate >= CFG.levelRate[i]) c = i;
    return c;
  },

  step(dt) {
    this.xv += ((this.pos - 1) - this.xv) * (1 - Math.exp(-dt * CFG.hopK));
    if (this.mode === 'ready') {
      this.readyT += dt;
      if (this.readyT >= CFG.readySecs) { this.mode = 'play'; this.t = 0; this.events.push({ type: 'start' }); }
      return;
    }
    if (this.mode === 'finish') {
      this.finT += dt;
      if (this.finT >= CFG.finishSecs) { this.mode = 'over'; this.events.push({ type: 'over' }); }
      return;
    }
    if (this.mode !== 'play') return;
    this.t += dt;
    if (this.stun > 0) this.stun = Math.max(0, this.stun - dt);

    // 勢い：直近の歩を重みつきで数える（新しいほど重い）
    let sum = 0;
    const st = this.stepTimes;
    while (st.length && this.t - st[0] >= CFG.winEnd) st.shift();
    for (let i = 0; i < st.length; i++) {
      const age = this.t - st[i];
      sum += age <= CFG.winFull ? 1 : clamp((CFG.winEnd - age) / (CFG.winEnd - CFG.winFull), 0, 1);
    }
    this.rate = sum;

    const cand = this.candidate(this.rate);
    if (cand > this.lvl) {
      this.upT += dt; this.downT = 0;
      if (this.upT >= CFG.upHold) {
        this.lvl++; this.upT = 0;
        this.maxLvl = Math.max(this.maxLvl, this.lvl);
        this.maxN = Math.max(this.maxN, this.bodies());
        this.events.push({ type: 'lvl', up: true, lvl: this.lvl });
      }
    } else if (cand < this.lvl) {
      this.upT = 0;
      if (this.stun <= 0) {
        this.downT += dt;
        if (this.downT >= CFG.downHold) {
          this.lvl--; this.downT = 0;
          this.events.push({ type: 'lvl', up: false, lvl: this.lvl });
        }
      }
    } else { this.upT = 0; this.downT = 0; }

    if (this.t >= CFG.duration) {
      this.t = CFG.duration;
      this.mode = 'finish'; this.finT = 0;
      this.events.push({ type: 'end' });
    }
  },
};

// 判定（記録から）
function judgeFor(rec) {
  let j = CFG.judge[0][1];
  for (const [min, name] of CFG.judge) if (rec >= min) j = name;
  return j;
}
