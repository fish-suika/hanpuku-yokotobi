// ===== 購買部と引換券（画面を使わない）=====
// 強化の段階は保存の up（品物ごと 0〜最大）。測定のはじめに Shop.apply(save) が CFG へ掛け算・足し算で反映する。
// Shop.apply は「素の値」から計算し直すので、何度呼んでも重ならない。20-logic.js の仕組みは変えない
const SHOP_IDS = ['shoes', 'clothes', 'fall', 'recorder', 'cheer', 'book'];

const Shop = {
  ids: SHOP_IDS,
  // 強化なしの素の値（読み込み時に控えておく）
  base: {
    winFull: CFG.winFull, winEnd: CFG.winEnd, levelRate: CFG.levelRate.slice(), bodies: CFG.bodies.slice(),
    stunSecs: CFG.stunSecs, stunDrop: CFG.stunDrop,
  },

  // 素の段階の体の数に、秘伝書で増えるぶんを足した一覧（表示用）
  allBodies() { return this.base.bodies.concat(CFG.bodiesExtra); },
  zeroUp() { const u = {}; for (const id of SHOP_IDS) u[id] = 0; return u; },
  maxLevel(id) { return CFG.shop[id].price.length; },
  level(save, id) { return clamp(Math.floor(Number(save.up && save.up[id])) || 0, 0, this.maxLevel(id)); },

  // 次の段階の値段（もう最大なら null）
  price(save, id) {
    const lv = this.level(save, id);
    return lv >= this.maxLevel(id) ? null : CFG.shop[id].price[lv];
  },
  // 次の段階を買うのに勝っておく大会の数（なければ 0）。秘伝書だけ
  gate(save, id) {
    const g = CFG.shop[id].gate;
    return g ? g[this.level(save, id)] || 0 : 0;
  },
  // 'max' 最大 ／ 'locked' 大会に勝ちが足りない ／ 'poor' 引換券が足りない ／ 'ok' 買える
  state(save, id) {
    const p = this.price(save, id);
    if (p == null) return 'max';
    if (Tourney.wonCount(save) < this.gate(save, id)) return 'locked';
    return (save.tickets || 0) >= p ? 'ok' : 'poor';
  },
  canBuy(save, id) { return this.state(save, id) === 'ok'; },
  // 買う。足りない・ロック・最大なら何も変えず、理由を返す
  buy(save, id) {
    const st = this.state(save, id);
    if (st !== 'ok') return { ok: false, reason: st };
    const p = this.price(save, id);
    save.tickets -= p;
    save.up[id] = this.level(save, id) + 1;
    return { ok: true, price: p, level: save.up[id] };
  },
  // 買った段階までの値段の合計（今の値段表で）。振り直しで全額戻る額
  spent(save) {
    let t = 0;
    for (const id of SHOP_IDS) { const lv = this.level(save, id); for (let k = 0; k < lv; k++) t += CFG.shop[id].price[k]; }
    return t;
  },
  // 振り直し：強化を全部 0 段階に戻し、買ったぶんを全額、引換券に戻す。大会の進み具合には触らない。何も買っていなければ何も変えない
  respec(save) {
    const refund = this.spent(save);
    if (refund <= 0) return { ok: false, refund: 0 };
    save.tickets = (save.tickets || 0) + refund;
    save.up = this.zeroUp();
    return { ok: true, refund };
  },
  // いま買える中でいちばん安い品物（なければ null）。ボット用
  cheapest(save) {
    let best = null, bp = Infinity;
    for (const id of SHOP_IDS) if (this.canBuy(save, id)) { const p = this.price(save, id); if (p < bp) { bp = p; best = id; } }
    return best;
  },

  // 段階 lv のときの効果の値（画面の「いま → 次」の表示用）
  effect(id, lv) {
    const S = CFG.shop[id], B = this.base, k = lv - 1;
    switch (id) {
      case 'shoes': return { mul: lv > 0 ? S.mul[k] : 1 };
      case 'clothes': return { mul: lv > 0 ? S.mul[k] : 1 };
      case 'fall': return { drop: lv > 0 ? S.drop[k] : B.stunDrop, secs: lv > 0 ? S.secs[k] : B.stunSecs };
      case 'recorder': return { mul: lv > 0 ? S.mul[k] : 1 };
      case 'cheer': { const sl = lv > 0 ? S.lvl[k] : 0; return { lvl: sl, bodies: this.allBodies()[sl] }; }
      case 'book': return { bodies: this.allBodies()[B.bodies.length - 1 + lv] };
    }
  },

  // 強化を CFG に反映する（測定の前に毎回）
  apply(save) {
    const B = this.base, S = CFG.shop, lv = id => this.level(save, id);
    const sh = lv('shoes') ? S.shoes.mul[lv('shoes') - 1] : 1;
    CFG.winFull = B.winFull * sh; CFG.winEnd = B.winEnd * sh;
    const cl = lv('clothes') ? S.clothes.mul[lv('clothes') - 1] : 1;
    const tiers = lv('book');
    CFG.bodies = B.bodies.concat(CFG.bodiesExtra.slice(0, tiers));
    CFG.levelRate = B.levelRate.concat(CFG.levelRateExtra.slice(0, tiers)).map((r, i) => i === 0 ? 0 : r * cl);
    const fl = lv('fall');
    CFG.stunDrop = fl ? S.fall.drop[fl - 1] : B.stunDrop;
    CFG.stunSecs = fl ? S.fall.secs[fl - 1] : B.stunSecs;
    CFG.recMul = lv('recorder') ? S.recorder.mul[lv('recorder') - 1] : 1;
    const ch = lv('cheer');
    CFG.startLvl = ch ? Math.min(S.cheer.lvl[ch - 1], CFG.bodies.length - 1) : 0;
    CFG.startGrace = ch ? S.cheer.grace : 0;
  },
  // 強化なしの素の値に戻す（検証用）
  reset() { this.apply({ up: this.zeroUp() }); },

  // 1回の引換券。記録の一部（勝つと多め）＋ まだ勝っていない大会の参加賞（大会の目標に比例。遅い人でも進めるように）
  payout(rec, win, target, wasWon) {
    let t = rec > 0 ? Math.max(1, Math.floor(rec * (win ? CFG.payWin : CFG.payLose))) : 0;
    if (!wasWon && target > 0) t += Math.floor(target * CFG.payPart);
    return t;
  },
};
