// ===== 大会のくり返し（画面を使わない）=====
// 保存の形：{ v, unlocked（遊べる一番先の大会 0始まり）, won[大会ごとの勝ち], best[大会ごとのベスト] }
// Phase 2 で tickets（引換券の残り）と up（品物ごとの強化の段階）を、Phase 4 で endingSeen（エンディングを最後まで見たか）を足した。知らない項目は読み書きしても消さない
const SAVE_KEY = 'hanpuku-yokotobi-save';
const V1_BEST_KEY = 'hanpuku-yokotobi-best';   // v1 のベスト（引き継ぎ用に読むだけ）
const SAVE_VER = 3;   // 1＝Phase 1（大会だけ）／2＝引換券と強化／3＝endingSeen（エンディングを見たか）

const Tourney = {
  count() { return CFG.targets.length; },
  target(i) { return CFG.targets[i]; },
  // ライバルに勝つ：記録が目標を「超える」こと（同じ数は負け）。目標は使うたびに CFG から読む
  beats(rec, i) { return rec > CFG.targets[i]; },

  newSave() {
    const n = this.count();
    return { v: SAVE_VER, unlocked: 0, won: new Array(n).fill(false), best: new Array(n).fill(0), tickets: 0, up: Shop.zeroUp(), endingSeen: false };
  },

  // どんな値が来ても、使える形に直す（壊れた保存・古い保存・手で書き換えた保存）
  sanitize(o) {
    const n = this.count(), s = this.newSave();
    if (!o || typeof o !== 'object') return s;
    const out = Object.assign({}, o);   // 知らない項目は残す
    const u = Math.floor(Number(o.unlocked));
    out.unlocked = Number.isFinite(u) ? clamp(u, 0, n - 1) : 0;
    out.won = s.won.map((_, i) => Array.isArray(o.won) && o.won[i] === true);
    out.best = s.best.map((_, i) => {
      const b = Array.isArray(o.best) ? Math.floor(Number(o.best[i])) : 0;
      return Number.isFinite(b) && b > 0 ? b : 0;
    });
    // つじつま：先へ進めているなら手前は勝っている／勝った大会の次は開いている
    for (let i = 0; i < out.unlocked; i++) out.won[i] = true;
    for (let i = 0; i < n; i++) if (out.won[i]) out.unlocked = Math.max(out.unlocked, Math.min(i + 1, n - 1));
    for (let i = 0; i < out.unlocked; i++) out.won[i] = true;
    // 引換券と強化（Phase 1 の保存にはないので、なければ 0）
    const tk = Math.floor(Number(o.tickets));
    out.tickets = Number.isFinite(tk) && tk > 0 ? tk : 0;
    out.up = Shop.zeroUp();
    for (const id of Shop.ids) {
      const l = Math.floor(Number(o.up && o.up[id]));
      out.up[id] = Number.isFinite(l) ? clamp(l, 0, Shop.maxLevel(id)) : 0;
    }
    // エンディングを見たか（版 2 までの保存にはないので false。全部勝っているのに false なら、次に大会の一覧を開いたとき 1 回だけ出る）
    out.endingSeen = o.endingSeen === true;
    out.v = SAVE_VER;
    return out;
  },

  // 'won' 勝った ／ 'next' 挑戦できる（まだ勝っていない） ／ 'locked' まだ
  status(save, i) {
    if (save.won[i]) return 'won';
    return i <= save.unlocked ? 'next' : 'locked';
  },
  playable(save, i) { return i >= 0 && i < this.count() && i <= save.unlocked; },
  focusIndex(save) { return save.unlocked; },
  wonCount(save) { return save.won.filter(Boolean).length; },
  allWon(save) { return save.won.length > 0 && save.won.every(Boolean); },
  // エンディングを出すか：9 大会ぜんぶ勝っていて、まだ最後まで見ていない（ページを閉じて見損ねても、次に出る）
  shouldShowEnding(save) { return this.allWon(save) && !save.endingSeen; },
  markEndingSeen(save) { save.endingSeen = true; },

  // 1回の結果を保存の形に反映する。勝てば次の大会が開く。遊べない大会は何も変えない
  record(save, i, rec) {
    const none = { win: false, isBest: false, prevBest: save.best[i] || 0, firstWin: false, unlockedNext: false, ending: false, gain: 0 };
    if (!this.playable(save, i)) return none;
    const prevBest = save.best[i] || 0;
    const isBest = rec > prevBest;
    if (isBest) save.best[i] = rec;
    const win = this.beats(rec, i), wasWon = !!save.won[i];
    let firstWin = false, unlockedNext = false;
    if (win) {
      firstWin = !save.won[i];
      save.won[i] = true;
      if (i + 1 < this.count() && save.unlocked < i + 1) { save.unlocked = i + 1; unlockedNext = true; }
    }
    const gain = Shop.payout(rec, win, CFG.targets[i], wasWon);   // 負けても引換券はもらえる（勝つと多め）
    save.tickets = (save.tickets || 0) + gain;
    return { win, isBest, prevBest, firstWin, unlockedNext, ending: firstWin && i === this.count() - 1, gain };
  },

  // 保存の読み込み。v2 の保存がなければ v1 のベストを最初の大会のベストとして引き継ぐ。storage は getItem/setItem を持つもの
  load(st) {
    let raw = null;
    try { raw = st.getItem(SAVE_KEY); } catch (_) {}
    if (raw) {
      try { return this.sanitize(JSON.parse(raw)); } catch (_) { return this.newSave(); }
    }
    const s = this.newSave();
    let v1 = 0;
    try { v1 = parseInt(st.getItem(V1_BEST_KEY), 10) || 0; } catch (_) {}
    if (v1 > 0) { s.best[0] = v1; this.persist(st, s); }
    return s;
  },
  persist(st, save) {
    try { st.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch (_) { return false; }
  },
};
