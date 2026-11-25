// ===== 大会のくり返し（画面を使わない）=====
// 保存の形：{ v, unlocked（遊べる一番先の大会 0始まり）, won[大会ごとの勝ち], best[大会ごとのベスト] }
// 強化（Phase 2）はここに項目を足す。知らない項目は読み書きしても消さない
const SAVE_KEY = 'hanpuku-yokotobi-save';
const V1_BEST_KEY = 'hanpuku-yokotobi-best';   // v1 のベスト（引き継ぎ用に読むだけ）
const SAVE_VER = 1;

const Tourney = {
  count() { return CFG.targets.length; },
  target(i) { return CFG.targets[i]; },
  // ライバルに勝つ：記録が目標を「超える」こと（同じ数は負け）。目標は使うたびに CFG から読む
  beats(rec, i) { return rec > CFG.targets[i]; },

  newSave() {
    const n = this.count();
    return { v: SAVE_VER, unlocked: 0, won: new Array(n).fill(false), best: new Array(n).fill(0) };
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

  // 1回の結果を保存の形に反映する。勝てば次の大会が開く。遊べない大会は何も変えない
  record(save, i, rec) {
    const none = { win: false, isBest: false, prevBest: save.best[i] || 0, firstWin: false, unlockedNext: false, ending: false };
    if (!this.playable(save, i)) return none;
    const prevBest = save.best[i] || 0;
    const isBest = rec > prevBest;
    if (isBest) save.best[i] = rec;
    const win = this.beats(rec, i);
    let firstWin = false, unlockedNext = false;
    if (win) {
      firstWin = !save.won[i];
      save.won[i] = true;
      if (i + 1 < this.count() && save.unlocked < i + 1) { save.unlocked = i + 1; unlockedNext = true; }
    }
    return { win, isBest, prevBest, firstWin, unlockedNext, ending: firstWin && i === this.count() - 1 };
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
