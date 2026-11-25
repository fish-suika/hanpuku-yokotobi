// ===== 自動テスト =====
(function () {
  const out = document.getElementById('out');
  let fail = 0;
  function check(name, cond, note) {
    if (!cond) fail++;
    const p = document.createElement('div');
    p.className = cond ? 'ok' : 'ng';
    p.textContent = (cond ? 'OK  ' : 'NG  ') + name + (note ? '  [' + note + ']' : '');
    out.appendChild(p);
  }
  const median = a => a.slice().sort((p, q) => p - q)[a.length >> 1];

  // 開始直後の遊べる状態を作る
  function startPlay(seed) {
    Game.reset(seed || 1); Game.begin();
    let n = 0;
    while (Game.mode !== 'play' && n++ < 1000) Game.step(CFG.h);
    Game.events.length = 0;
  }
  // 1 回ぶんの時間を進める
  function advance(sec) { for (let i = 0; i < Math.round(sec / CFG.h); i++) Game.step(CFG.h); }

  // ボット。rate 回/秒で押す。err 間違える確率。alt なら交互連打。
  function run(opt) {
    opt = Object.assign({ rate: 6, err: 0, alt: false, seed: 1 }, opt);
    Game.reset(opt.seed); Game.begin();
    const r = mulberry32(opt.seed * 7919 + 13);
    let next = opt.rate > 0 ? 0 : Infinity, altSide = 1, n = 0, maxLvl = 0, lvlAt = [];
    while (Game.mode !== 'over' && n++ < 120 * 40) {
      if (Game.mode === 'play' && Game.t >= next) {
        let side;
        if (opt.alt) { side = altSide; altSide = -altSide; }
        else {
          const ok = Game.nextSides();
          side = ok[0];
          if (ok.length === 1 && r() < opt.err) side = -ok[0];   // 間違い側（外へ出る／同じ側へ二度跳ぶ）
          else if (ok.length === 2) side = r() < 0.5 ? -1 : 1;
        }
        Game.input(side);
        next += 1 / opt.rate;
      }
      Game.step(CFG.h);
      maxLvl = Math.max(maxLvl, Game.lvl);
      if (Game.mode === 'play') lvlAt.push(Game.lvl);
    }
    return { rec: Game.rec, steps: Game.steps, trips: Game.trips, lvl: Game.lvl, maxLvl, maxN: Game.maxN, t: Game.t, mode: Game.mode, lvlAt };
  }

  // --- 順番の判定 ---
  startPlay();
  let allOk = true;
  for (let i = 0; i < 40; i++) {
    // 右左左右 の順を 10 回
    const seq = [1, -1, -1, 1];
    for (const s of seq) { if (Game.input(s) !== 'step') allOk = false; advance(0.02); }
  }
  check('右・左・左・右のくり返しは全部通る（転ばない）', allOk && Game.trips === 0, 'steps=' + Game.steps);

  startPlay();
  const seqL = [-1, 1, 1, -1, -1, 1, 1, -1];
  let okL = true;
  for (const s of seqL) if (Game.input(s) !== 'step') okL = false;
  check('左・右・右・左 の順でも通る（最初はどちらからでもよい）', okL && Game.trips === 0);

  startPlay();
  Game.input(1);   // 右の線へ
  check('右の線にいる', Game.pos === 2);
  const r1 = Game.input(1);   // さらに右へ＝はみ出す
  check('外の線から外へ跳ぶと転ぶ（はみ出し）', r1 === 'trip' && Game.trips === 1 && Game.pos === 1);

  startPlay();
  Game.input(1); Game.input(-1);   // 右 → 中央
  check('中央に戻った', Game.pos === 1);
  const r2 = Game.input(1);        // さっき行った右へまた跳ぶ
  check('中央から、さっき行った側へまた跳ぶと転ぶ（足がもつれる）', r2 === 'trip' && Game.trips === 1);
  advance(CFG.stunSecs + 0.05);
  check('転んだあとは約0.4秒で動ける', Game.stun === 0 && Game.input(-1) === 'step');

  startPlay();
  Game.input(1);
  Game.input(1);   // 転ぶ
  check('転んでいる間のタップは無視される', Game.input(-1) === 'stun' && Game.steps === 1);

  startPlay();
  check('次に跳べる側：最初はどちらでも', Game.nextSides().length === 2);
  Game.input(1);
  check('次に光る線：外の線にいるなら中央だけ', Game.nextLines().length === 1 && Game.nextLines()[0] === 1);
  Game.input(-1);
  check('次に光る線：中央にいるなら反対側だけ（右へ行ったあとは左）', Game.nextLines().length === 1 && Game.nextLines()[0] === 0);

  // --- 勢いの段階 ---
  const b5 = run({ rate: 5 });
  check('毎秒5回で正しく押すと段階3（8人）', b5.lvl === 3 && b5.trips === 0, 'lvl=' + b5.lvl + ' rec=' + b5.rec);
  const b3 = run({ rate: 3 });
  check('毎秒3回でも段階1（もう分身 2 人）', b3.lvl === 1 && b3.maxN === 2, 'lvl=' + b3.lvl + ' rec=' + b3.rec);
  const b2 = run({ rate: 2 });
  check('毎秒2回なら段階0（分身しない）', b2.lvl === 0 && b2.maxN === 1, 'lvl=' + b2.lvl);
  const b10 = run({ rate: 9 });
  check('毎秒9回で最上段（段階6）に届く', b10.lvl === 6 && b10.trips === 0, 'lvl=' + b10.lvl + ' maxN=' + b10.maxN + ' rec=' + b10.rec);
  const b11 = run({ rate: 10 });
  check('毎秒10回で 48 人になる', b11.lvl === 6 && b11.maxN === 48, 'lvl=' + b11.lvl + ' rec=' + b11.rec);

  // 段階がチカチカ増減しない（一定の速さなら、上がったあとは下がらない）
  const stable = b10.lvlAt;
  let flips = 0;
  for (let i = 1; i < stable.length; i++) if (stable[i] < stable[i - 1]) flips++;
  check('一定の速さなら段階が途中で下がってチカチカしない', flips === 0, 'flips=' + flips);

  // --- 20秒で終わる ---
  check('20秒で測定が終わり、記録が出る', b5.mode === 'over' && Math.abs(b5.t - CFG.duration) < 1e-6 && b5.rec > 0, 't=' + b5.t);
  const idle = run({ rate: 0 });
  check('何も押さなくても 20 秒で終わる（記録0・判定E）', idle.mode === 'over' && idle.rec === 0 && judgeFor(idle.rec) === 'E');

  // --- 順番に意味がある：交互連打は損 ---
  const seeds = [1, 2, 3, 4, 5];
  const altR = seeds.map(s => run({ rate: 7, alt: true, seed: s }));
  const okR = seeds.map(s => run({ rate: 7, seed: s }));
  const altMed = median(altR.map(r => r.rec)), okMed = median(okR.map(r => r.rec));
  check('交互に連打するだけ（右左右左）は転び続けて記録が伸びない', altMed * 5 < okMed && altR.every(r => r.trips >= 20),
    '交互 記録=' + altMed + ' 転倒=' + median(altR.map(r => r.trips)) + ' ／ 正しい順 記録=' + okMed);
  check('交互連打では分身が 4 人を超えない', altR.every(r => r.maxN <= 4), 'maxN=' + altR.map(r => r.maxN).join(','));

  // --- 速さと正確さの引っ張り合い ---
  // 速いほどミスが増える人間を想定: 7回/秒でミス2% ／ 9回/秒でミス8% ／ 11回/秒でミス20%
  const pull = [[3.5, 0.01], [6, 0.02], [8, 0.07], [10, 0.22]].map(([rate, err]) =>
    median([1, 2, 3, 4, 5, 6, 7, 8].map(s => run({ rate, err, seed: s }).rec)));
  check('速くしすぎてミスが増えると記録が下がる（引っ張り合いがある）', pull[3] < pull[2] && pull[2] > pull[0],
    '4.5回/秒=' + pull[0] + ' 7回=' + pull[1] + ' 9回=' + pull[2] + ' 11回(ミス多)=' + pull[3]);
  const sloppy = run({ rate: 10, err: 0.1, seed: 3 });
  check('ミスをすると勢いが落ちる（転んだ回数が記録される）', sloppy.trips > 0 && sloppy.maxLvl > sloppy.lvl - 1, 'trips=' + sloppy.trips);

  // 転んだときの落ち方
  startPlay();
  for (let i = 0; i < 120; i++) { // 10回/秒で 4 秒ほど
    const ok = Game.nextSides(); Game.input(ok[0]); advance(0.1);
  }
  const before = Game.lvl;
  const lvEv = Game.events.filter(e => e.type === 'lvl').length;
  Game.input(Game.pos === 1 ? Game.lastSide : (Game.pos === 0 ? -1 : 1));
  check('転ぶと勢いが 2 段階落ちる', Game.lvl === Math.max(0, before - 2), before + ' → ' + Game.lvl);

  // --- 点数 ---
  check('記録は「歩ごとの体の数」の合計（本当の回数より大きい）', b10.rec > b10.steps * 3, 'steps=' + b10.steps + ' rec=' + b10.rec);

  // --- 判定の線引き ---
  const j = [0, 39, 40, 79, 80, 150, 400, 1000, 2999, 3000, 6999, 7000].map(judgeFor).join(',');
  check('判定の線引き（E〜S→測定不能→人類の範囲外）', j === 'E,E,D,D,C,B,A,S,S,測定不能,測定不能,人類の範囲外', j);
  check('最高速のボットは最上位の判定に届く', judgeFor(b11.rec) === '人類の範囲外', 'rec=' + b11.rec);
  check('のんびり（毎秒2回）は低い判定', judgeFor(b2.rec) === 'D' || judgeFor(b2.rec) === 'C' || judgeFor(b2.rec) === 'E', 'rec=' + b2.rec + ' ' + judgeFor(b2.rec));
  check('ふつう（毎秒5回）は A（S には届かない）、毎秒3回は C', judgeFor(b5.rec) === 'A' && judgeFor(b3.rec) === 'C', 'rec=' + b5.rec + ' ' + judgeFor(b5.rec));

  // ===== v2：大会のくり返し =====
  const fake = (init, throws) => {
    const d = Object.assign({}, init);
    return {
      d,
      getItem: k => { if (throws) throw new Error('storage'); return k in d ? d[k] : null; },
      setItem: (k, v) => { if (throws) throw new Error('storage'); d[k] = String(v); },
    };
  };
  const N = Tourney.count();
  const winRec = i => CFG.targets[i] + 1;

  check('大会は 9 つ・ライバルの目標の記録は設定どおり', N === 9 && CFG.targets.join() === '80,200,600,2000,6000,20000,100000,500000,3000000', CFG.targets.join());
  check('目標の記録は、大会が進むほど大きくなる', CFG.targets.every((t, i) => i === 0 || t > CFG.targets[i - 1]));
  check('大会の名前・ライバル・一言が 9 つぶん揃っている（言葉の表）',
    STR.tournaments.length === N && STR.tournaments.every(t => t.name && t.rival.name && t.rival.short && t.rival.say));
  check('大会の順番は クラス→学年→校内→市→県→全国→世界→月面→宇宙',
    STR.tournaments.map(t => t.name).join() === 'クラスの体力測定,学年の体力測定,校内大会,市大会,県大会,全国大会,世界大会,月面大会,宇宙大会');
  check('ph() は文節の切れ目「|」を取る', ph('去年と|同じ記録を|目指します。') === '去年と同じ記録を目指します。');

  // はじめの状態
  let sv = Tourney.newSave();
  check('はじめは、最初の大会だけ遊べて、あとはロック', Tourney.status(sv, 0) === 'next' && [1, 2, 3, 4, 5, 6, 7, 8].every(i => Tourney.status(sv, i) === 'locked') && Tourney.playable(sv, 0) && !Tourney.playable(sv, 1));
  check('はじめのベストは全部 0', sv.best.length === N && sv.best.every(b => b === 0));

  // 勝つと次が開く／負けても開かない
  let r = Tourney.record(sv, 0, winRec(0));
  check('ライバルを超えると勝ち、次の大会が開く', r.win && r.unlockedNext && r.firstWin && sv.unlocked === 1 && Tourney.status(sv, 0) === 'won' && Tourney.status(sv, 1) === 'next' && Tourney.status(sv, 2) === 'locked');
  sv = Tourney.newSave();
  r = Tourney.record(sv, 0, CFG.targets[0]);
  check('ライバルと同じ記録は負け（超えていないので次は開かない）', !r.win && !r.unlockedNext && sv.unlocked === 0 && Tourney.status(sv, 0) === 'next');
  r = Tourney.record(sv, 0, CFG.targets[0] - 1);
  check('負けても次は開かない（ベストは残る）', !r.win && sv.unlocked === 0 && sv.best[0] === CFG.targets[0]);
  check('Tourney.beats は 超えたときだけ true', Tourney.beats(81, 0) && !Tourney.beats(80, 0) && !Tourney.beats(0, 0));

  // ベスト
  sv = Tourney.newSave();
  r = Tourney.record(sv, 0, 50);
  check('1回目の記録がベストになる', r.isBest && r.prevBest === 0 && sv.best[0] === 50);
  r = Tourney.record(sv, 0, 30);
  check('低い記録ではベストは下がらない', !r.isBest && sv.best[0] === 50);
  r = Tourney.record(sv, 0, 70);
  check('高い記録でベストが上がる（前のベストも返る）', r.isBest && r.prevBest === 50 && sv.best[0] === 70);
  Tourney.record(sv, 0, winRec(0));
  Tourney.record(sv, 1, 120);
  check('ベストは大会ごとに別', sv.best[1] === 120 && sv.best[0] === winRec(0) && sv.best[2] === 0);

  // 遊べない大会
  sv = Tourney.newSave();
  const snap0 = JSON.stringify(sv);
  r = Tourney.record(sv, 3, 99999999);
  check('まだ開いていない大会の結果は、何も変えない', !r.win && JSON.stringify(sv) === snap0);

  // 勝った大会のやり直し
  sv = Tourney.newSave();
  Tourney.record(sv, 0, winRec(0));
  Tourney.record(sv, 1, winRec(1));
  check('勝った大会にはいつでも戻れる', Tourney.playable(sv, 0) && Tourney.playable(sv, 1) && Tourney.playable(sv, 2) && !Tourney.playable(sv, 3));
  r = Tourney.record(sv, 0, 10);
  check('勝った大会で負けても、勝ちと進み具合は消えない', !r.win && sv.won[0] && sv.unlocked === 2 && Tourney.status(sv, 0) === 'won');
  r = Tourney.record(sv, 0, winRec(0) + 5);
  check('勝った大会でもう一度勝っても、新しく開くものはない', r.win && !r.firstWin && !r.unlockedNext && sv.unlocked === 2 && r.isBest);

  // 全部勝つ
  sv = Tourney.newSave();
  let endings = 0, unlockCnt = 0;
  for (let i = 0; i < N; i++) { const q = Tourney.record(sv, i, winRec(i)); if (q.ending) endings++; if (q.unlockedNext) unlockCnt++; }
  check('順に全部勝つと、全部「勝ち」になり最後の大会まで開く', sv.won.every(Boolean) && sv.unlocked === N - 1 && unlockCnt === N - 1 && Tourney.wonCount(sv) === N);
  check('エンディングは 宇宙大会に初めて勝ったときだけ', endings === 1 && !Tourney.record(sv, N - 1, winRec(N - 1)).ending);
  sv = Tourney.newSave();
  for (let i = 0; i < N - 1; i++) Tourney.record(sv, i, winRec(i));
  check('宇宙大会に着くまでにエンディングは出ない', Tourney.record(sv, N - 1, 5).ending === false && Tourney.status(sv, N - 1) === 'next');

  // 目標は使うたびに CFG から読む（Phase 2 の強化で変えられる）
  const t0 = CFG.targets[0];
  CFG.targets[0] = 10;
  const cfgOk = Tourney.beats(11, 0) && !Tourney.beats(10, 0);
  CFG.targets[0] = t0;
  check('ライバルの記録は CFG から読む（焼き込まない）', cfgOk && !Tourney.beats(11, 0));

  // 保存
  sv = Tourney.newSave();
  Tourney.record(sv, 0, winRec(0) + 7); Tourney.record(sv, 1, 150);
  const st1 = fake({});
  check('保存できる', Tourney.persist(st1, sv) === true && SAVE_KEY in st1.d);
  const back = Tourney.load(st1);
  check('保存して読み直すと同じ（進み具合・勝ち・ベスト）', JSON.stringify(back) === JSON.stringify(sv) && back.best[0] === winRec(0) + 7 && back.unlocked === 1 && back.won[0] === true);
  check('保存には版の番号が入る', JSON.parse(st1.d[SAVE_KEY]).v === SAVE_VER && SAVE_KEY === 'hanpuku-yokotobi-save');

  // v1 のベストの引き継ぎ
  const st2 = fake({ [V1_BEST_KEY]: '1234' });
  const mig = Tourney.load(st2);
  check('v2 の保存がなく v1 のベストがあれば、最初の大会のベストに引き継ぐ', mig.best[0] === 1234 && mig.best.slice(1).every(b => b === 0) && mig.unlocked === 0);
  check('引き継いだ結果は v2 の保存に書かれる（v1 の値は消さない）', JSON.parse(st2.d[SAVE_KEY]).best[0] === 1234 && st2.d[V1_BEST_KEY] === '1234');
  st2.d[V1_BEST_KEY] = '9999';
  check('2回目以降は v2 の保存を使い、v1 の値は見ない', Tourney.load(st2).best[0] === 1234);
  const st3 = fake({ [V1_BEST_KEY]: '777', [SAVE_KEY]: JSON.stringify(Object.assign(Tourney.newSave(), { best: [5, 0, 0, 0, 0, 0, 0, 0, 0] })) });
  check('v2 の保存があれば v1 のベストは引き継がない', Tourney.load(st3).best[0] === 5);
  check('v1 の値が数字でなければ無視する', Tourney.load(fake({ [V1_BEST_KEY]: 'abc' })).best[0] === 0 && Tourney.load(fake({ [V1_BEST_KEY]: '-5' })).best[0] === 0);

  // 壊れた保存・使えない保存
  check('保存が空なら、はじめの状態', JSON.stringify(Tourney.load(fake({}))) === JSON.stringify(Tourney.newSave()));
  check('保存が壊れていても（JSONでない）はじめの状態で動く', JSON.stringify(Tourney.load(fake({ [SAVE_KEY]: '{oops' }))) === JSON.stringify(Tourney.newSave()));
  const thr = fake({}, true);
  let threw = false, lt;
  try { lt = Tourney.load(thr); Tourney.persist(thr, lt); } catch (_) { threw = true; }
  check('localStorage が使えなくても（読み書きで例外）止まらない', !threw && lt.unlocked === 0 && Tourney.persist(thr, lt) === false);
  const odd = Tourney.sanitize({ v: 99, unlocked: 99, won: [true, 'x', null], best: [-5, 'abc', 12.9, 1e3], extra: 'keep' });
  check('値がおかしい保存は直して読む（進み具合は範囲内・ベストは0以上の整数）',
    odd.unlocked === N - 1 && odd.won.length === N && odd.best.length === N && odd.best[0] === 0 && odd.best[1] === 0 && odd.best[2] === 12 && odd.best[3] === 1000 && odd.v === SAVE_VER);
  check('進み具合に合わせて、手前の大会は「勝ち」として読む', Tourney.sanitize({ unlocked: 3 }).won.slice(0, 3).every(Boolean) && !Tourney.sanitize({ unlocked: 3 }).won[3]);
  check('勝ちがあるなら、その次の大会は開いている', Tourney.sanitize({ won: [false, false, true] }).unlocked === 3);
  check('知らない項目は残す（Phase 2 の強化を足しても消えない）', odd.extra === 'keep');

  // ボットで目安：強化なしの Phase 1 で、どこまで勝てるか
  const rec6 = median([1, 2, 3, 4, 5].map(sd => run({ rate: 6, err: 0.02, seed: sd }).rec));
  const rec9 = median([1, 2, 3, 4, 5].map(sd => run({ rate: 9, err: 0.05, seed: sd }).rec));
  const beaten = rec => CFG.targets.filter(t => rec > t).length;
  check('毎秒6回のボットは、少なくとも最初の大会に勝てる（遊び始めで詰まらない）', beaten(rec6) >= 1, 'rec=' + rec6 + ' 勝てる大会=' + beaten(rec6));
  check('強化なしでは、後ろの大会は勝てない（毎秒9回でも全国大会以降は届かない）', beaten(rec9) < 6 && beaten(b11.rec) < 6, 'rec9=' + rec9 + ' 勝てる大会=' + beaten(rec9) + ' ／ 最高速 rec=' + b11.rec);

  const s = document.createElement('h2');
  s.textContent = fail === 0 ? '全部 OK' : 'NG が ' + fail + ' 件';
  s.className = fail === 0 ? 'ok' : 'ng';
  out.insertBefore(s, out.firstChild);
  window.__verifyFail = fail;
})();
