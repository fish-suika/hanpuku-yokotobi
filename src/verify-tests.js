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

  check('大会は 9 つ・ライバルの目標の記録は設定どおり', N === 9 && CFG.targets.join() === '80,200,500,1200,3000,8000,20000,45000,100000', CFG.targets.join());
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

  // ===== v2 Phase 2：購買部と強化 =====
  // --- 大きな数字の表示 ---
  const F = fmtNum;
  check('数字の表示：1 万未満はそのまま（カンマ付き）', F(0) === '0' && F(7) === '7' && F(999) === '999' && F(1000) === '1,000' && F(9999) === '9,999', [0, 999, 1000, 9999].map(F).join(' '));
  check('数字の表示：1 万以上は 万（有効数字 4 桁・余分な 0 は落とす）', F(10000) === '1万' && F(12346) === '1.235万' && F(123456) === '12.35万' && F(1234567) === '123.5万' && F(12345678) === '1235万' && F(30000) === '3万' && F(100000) === '10万', [10000, 12346, 123456, 1234567, 12345678].map(F).join(' '));
  check('数字の表示：億・兆と繰り上がり（9999.9万→1億）', F(99999999) === '1億' && F(100000000) === '1億' && F(123456789) === '1.235億' && F(1e12) === '1兆' && F(2.5e12) === '2.5兆' && F(99999600) === '1億', [99999999, 123456789, 1e12, 2.5e12].map(F).join(' '));
  check('数字の表示：壊れた値（NaN・文字・負・小数）でも文字列を返す', F(NaN) === '0' && F(undefined) === '0' && F(Infinity) === '0' && F(-5) === '-5' && F(-12346) === '-1.235万' && F(2.4) === '2' && F('1234') === '1,234');
  let longest = 0;
  for (const v of [9999, 10000, 99999, 123456, 999999, 1234567, 9999999, 12345678, 99999999, 123456789, 999999999, 1.234e10, 1.234e11, 1e12, 1.234e13, 1.234e15]) longest = Math.max(longest, F(v).length);
  check('数字の表示：想定する最大の数字でも 6 文字以内（画面からはみ出さない）', longest <= 6 && F(1.234e15).length <= 6, 'longest=' + longest + ' ' + F(1.234e15));

  // --- 品物の定義 ---
  check('購買部は 6 つの品物（シューズ・体操着・受け身・記録係・応援団・秘伝書）', Shop.ids.length === 6 && ['shoes', 'clothes', 'fall', 'recorder', 'cheer', 'book'].every(id => Shop.ids.indexOf(id) >= 0), Shop.ids.join());
  check('どの品物にも名前・1 行の説明・効果の表示がある（言葉の表）', Shop.ids.every(id => STR.shop.items[id] && STR.shop.items[id].name && STR.shop.items[id].desc && typeof STR.shop.items[id].v === 'function' && STR.shop.items[id].v(Shop.effect(id, 1))));
  check('値段は段階ごとに上がり、全部の品物が複数の段階をもつ', Shop.ids.every(id => CFG.shop[id].price.length >= 4 && CFG.shop[id].price.every((p, i, a) => i === 0 || p > a[i - 1])));
  check('秘伝書の段階は、体の数と速さの線を 1 つずつ持つ（7=100人・8=500人・9=3000人）', CFG.bodiesExtra.slice(0, 3).join() === '100,500,3000' && CFG.bodiesExtra.length === CFG.levelRateExtra.length && CFG.levelRateExtra.every((r, i, a) => r > CFG.levelRate[6] && (i === 0 || r > a[i - 1])));
  check('秘伝書は大会に勝たないと買えない段階を持つ（段階が上がるほど多く勝つ）', CFG.shop.book.gate.length === CFG.shop.book.price.length && CFG.shop.book.gate.every((g, i, a) => i === 0 || g > a[i - 1]) && CFG.shop.book.gate[0] >= 2);

  // --- 引換券の払い出し ---
  check('引換券：記録の一部（勝つと多め）', Shop.payout(1000, true, 500, true) === Math.floor(1000 * CFG.payWin) && Shop.payout(1000, false, 500, true) === Math.floor(1000 * CFG.payLose) && CFG.payWin > CFG.payLose);
  check('引換券：まだ勝っていない大会は参加賞がつく（勝った大会にはつかない）', Shop.payout(1000, false, 500, false) === Math.floor(1000 * CFG.payLose) + Math.floor(500 * CFG.payPart) && Shop.payout(1000, false, 500, true) < Shop.payout(1000, false, 500, false));
  check('引換券：記録が 0 でも参加賞だけはもらえる／勝った大会で 0 なら 0', Shop.payout(0, false, 500, false) === Math.floor(500 * CFG.payPart) && Shop.payout(0, false, 500, true) === 0);
  check('引換券：記録があれば最低 1 枚', Shop.payout(5, false, 80, true) >= 1);
  sv = Tourney.newSave();
  r = Tourney.record(sv, 0, 1000);
  check('結果を記録すると引換券がたまる（残りに加わり、結果にも出る）', r.gain === Shop.payout(1000, true, CFG.targets[0], false) && sv.tickets === r.gain && r.gain > 0, 'gain=' + r.gain);
  r = Tourney.record(sv, 0, 10);
  check('負けても（勝った大会でも）引換券は増える・減らない', r.gain >= 1 && sv.tickets > 0);
  const snapT = sv.tickets;
  r = Tourney.record(sv, 5, 99999999);
  check('まだ開いていない大会の結果では、引換券は増えない', r.gain === 0 && sv.tickets === snapT);

  // --- 買う ---
  const poorSv = Tourney.newSave();
  check('引換券がなければ買えない（何も変わらない）', Shop.state(poorSv, 'shoes') === 'poor' && Shop.buy(poorSv, 'shoes').ok === false && poorSv.up.shoes === 0 && poorSv.tickets === 0);
  const rich = Tourney.newSave(); rich.tickets = 1e9;
  const p1 = Shop.price(rich, 'shoes');
  let br = Shop.buy(rich, 'shoes');
  check('買うと引換券が値段の分だけ減り、段階が 1 つ上がる', br.ok && rich.tickets === 1e9 - p1 && rich.up.shoes === 1 && br.level === 1 && br.price === p1);
  check('次の段階の値段は高くなる', Shop.price(rich, 'shoes') > p1);
  for (const id of ['shoes', 'clothes', 'fall', 'recorder', 'cheer']) while (Shop.buy(rich, id).ok);
  check('最大の段階まで買うと、それ以上は買えない（値段なし・状態は max）', Shop.ids.filter(id => id !== 'book').every(id => rich.up[id] === Shop.maxLevel(id) && Shop.state(rich, id) === 'max' && Shop.price(rich, id) === null && Shop.buy(rich, id).reason === 'max'));
  const gSv = Tourney.newSave(); gSv.tickets = 1e9;
  check('秘伝書：大会に勝つ前は、引換券があっても買えない（ロック）', Shop.state(gSv, 'book') === 'locked' && Shop.buy(gSv, 'book').ok === false && gSv.up.book === 0 && gSv.tickets === 1e9 && Shop.gate(gSv, 'book') === CFG.shop.book.gate[0]);
  for (let i = 0; i < CFG.shop.book.gate[0] - 1; i++) Tourney.record(gSv, i, winRec(i));
  gSv.tickets = 1e9;
  check('秘伝書：1 つ足りないあいだはまだロック', Shop.state(gSv, 'book') === 'locked');
  Tourney.record(gSv, CFG.shop.book.gate[0] - 1, winRec(CFG.shop.book.gate[0] - 1));
  gSv.tickets = 1e9;
  check('秘伝書：必要な数の大会に勝つと買える', Shop.state(gSv, 'book') === 'ok' && Shop.buy(gSv, 'book').ok && gSv.up.book === 1);
  check('秘伝書：次の段階は、もっと多くの大会に勝たないと買えない', Shop.state(gSv, 'book') === 'locked' && Shop.gate(gSv, 'book') === CFG.shop.book.gate[1]);
  const cheap = Tourney.newSave(); cheap.tickets = CFG.shop.clothes.price[0];
  check('いちばん安い買える品物が選べる（ボット用）', Shop.cheapest(cheap) !== null && Shop.price(cheap, Shop.cheapest(cheap)) <= cheap.tickets && Shop.cheapest(Tourney.newSave()) === null);

  // --- 強化が CFG を変える（測定の前に反映）---
  const base0 = JSON.stringify([CFG.winFull, CFG.winEnd, CFG.levelRate, CFG.bodies, CFG.stunDrop, CFG.stunSecs, CFG.recMul, CFG.startLvl, CFG.startGrace]);
  const up1 = id => { const q = Tourney.newSave(); q.up[id] = 1; Shop.apply(q); return q; };
  up1('shoes');
  check('体育館シューズ：勢いを数える時間がのびる（winFull・winEnd が長くなる）', CFG.winFull > Shop.base.winFull && CFG.winEnd > Shop.base.winEnd && CFG.winEnd > CFG.winFull);
  up1('clothes');
  check('新しい体操着：段階になる速さが下がる（0 は 0 のまま・並びは昇順のまま）', CFG.levelRate[0] === 0 && CFG.levelRate.slice(1).every((x, i) => x < Shop.base.levelRate[i + 1] && (i === 0 || x > CFG.levelRate[i])));
  up1('fall');
  check('受け身の練習：転んだときの勢いの落ちが小さく、動けない時間が短い', CFG.stunDrop < Shop.base.stunDrop && CFG.stunSecs < Shop.base.stunSecs);
  up1('recorder');
  check('記録係を増やす：記録の倍率が上がる', CFG.recMul > 1);
  up1('cheer');
  check('応援団：はじめの段階が上がる', CFG.startLvl >= 1 && CFG.startGrace > 0);
  const bk = Tourney.newSave(); bk.up.book = 2; Shop.apply(bk);
  check('分身の秘伝書：段階の上限が増える（7 段階 → 9 段階・体の数 100 と 500 が加わる）', CFG.bodies.length === 9 && CFG.levelRate.length === 9 && CFG.bodies[7] === 100 && CFG.bodies[8] === 500 && CFG.bodies[6] === 48);
  const allMax = Tourney.newSave(); for (const id of Shop.ids) allMax.up[id] = Shop.maxLevel(id);
  Shop.apply(allMax); const jMax = JSON.stringify([CFG.winFull, CFG.levelRate, CFG.bodies]); Shop.apply(allMax);
  check('強化の反映は何度やっても重ならない（同じ強化なら同じ値）', JSON.stringify([CFG.winFull, CFG.levelRate, CFG.bodies]) === jMax);
  check('全部最大：秘伝書の最大の段階まで体の数と速さの線が揃う', CFG.bodies.length === 7 + CFG.bodiesExtra.length && CFG.levelRate.length === CFG.bodies.length && CFG.startLvl <= CFG.bodies.length - 1);
  Shop.reset();
  check('強化なし（Shop.reset）にすると、素の値にぴったり戻る', JSON.stringify([CFG.winFull, CFG.winEnd, CFG.levelRate, CFG.bodies, CFG.stunDrop, CFG.stunSecs, CFG.recMul, CFG.startLvl, CFG.startGrace]) === base0);

  // --- 強化が実際の記録に効く（最初の 1 段階から分かる）---
  // 段階の線にぎりぎりの速さだと 1 段階では変わらないこともあるので、いくつかの速さの平均で見る
  const recAt = rate => median([1, 2, 3, 4, 5, 6, 7].map(sd => run({ rate, err: 0.03, seed: sd }).rec));
  const rec5 = () => [4, 5, 6, 7].reduce((a, rt) => a + Math.log(recAt(rt)), 0) / 4;   // 対数の平均（＝倍率の平均）
  const baseRec = rec5();
  const gains = {};
  for (const id of ['shoes', 'clothes', 'recorder', 'cheer']) { up1(id); gains[id] = Math.exp(rec5() - baseRec); Shop.reset(); }
  check('最初の 1 段階から、記録が目に見えて増える（シューズ・体操着・記録係は 10% 以上、応援団は 5% 以上）', gains.shoes >= 1.1 && gains.clothes >= 1.1 && gains.recorder >= 1.4 && gains.cheer >= 1.05,
    Object.keys(gains).map(k => k + ' ×' + gains[k].toFixed(2)).join(' '));
  // 受け身：ミスの多い人の記録が上がる
  const sloppy5 = () => median([1, 2, 3, 4, 5, 6, 7].map(sd => run({ rate: 7, err: 0.08, seed: sd }).rec));
  const sBase = sloppy5(); up1('fall'); const sFall = sloppy5(); Shop.reset();
  check('受け身の練習：ミスの多い人の記録が上がる', sFall > sBase * 1.05, 'before=' + sBase + ' after=' + sFall);
  // 応援団：1 歩目から分身
  const ch = Tourney.newSave(); ch.up.cheer = 2; Shop.apply(ch);
  startPlay(3);
  check('応援団：測定がはじまった瞬間から勢いの段階が高い（出だしから分身）', Game.lvl === CFG.startLvl && Game.lvl >= 2 && Game.maxN === CFG.bodies[CFG.startLvl]);
  Game.input(1);
  check('応援団：1 歩目から多い人数ぶんの記録が入る', Game.rec === CFG.bodies[CFG.startLvl]);
  Shop.reset();
  // 記録係：倍率どおり。小数のぶんは持ち越す
  const rm = Tourney.newSave(); rm.up.recorder = 1; Shop.apply(rm);
  startPlay(4);
  for (let k = 0; k < 4; k++) { Game.input(Game.nextSides()[0]); advance(0.15); }
  check('記録係：倍率をかけた記録になり、小数のぶんは持ち越して取りこぼさない', Game.rec === Math.floor(4 * CFG.recMul) && Game.steps === 4, 'rec=' + Game.rec + ' recMul=' + CFG.recMul);
  Shop.reset();
  // 秘伝書：新しい段階まで上がる
  const bk3 = Tourney.newSave(); for (const id of Shop.ids) bk3.up[id] = Shop.maxLevel(id); Shop.apply(bk3);
  const hi = run({ rate: 9, err: 0.01, seed: 2 });
  check('秘伝書：速い人は 48 人を超えて 100 人以上に分身できる（段階 7 以上）', hi.maxLvl >= 7 && hi.maxN >= 100, 'maxLvl=' + hi.maxLvl + ' maxN=' + hi.maxN);
  const slowHi = run({ rate: 2, seed: 2 });
  check('秘伝書があっても、ゆっくりなら秘伝書の段階（7 以上）には上がらない', slowHi.maxLvl < 7, 'maxLvl=' + slowHi.maxLvl);
  Shop.reset();

  // --- 保存：引換券と強化、Phase 1 の保存の引き継ぎ ---
  const p1save = { v: 1, unlocked: 3, won: [true, true, true, false, false, false, false, false, false], best: [90, 250, 700, 100, 0, 0, 0, 0, 0] };
  const stP1 = fake({ [SAVE_KEY]: JSON.stringify(p1save) });
  const mig2 = Tourney.load(stP1);
  check('Phase 1 の保存を読むと、進み具合とベストはそのまま、引換券は 0・強化は全部 0', mig2.unlocked === 3 && mig2.won.slice(0, 3).every(Boolean) && mig2.best[1] === 250 && mig2.tickets === 0 && Shop.ids.every(id => mig2.up[id] === 0) && mig2.v === 2 && SAVE_VER === 2);
  sv = Tourney.newSave(); Tourney.record(sv, 0, 5000); sv.up.shoes = 2; sv.up.cheer = 1;
  const stP2 = fake({}); Tourney.persist(stP2, sv);
  const back2 = Tourney.load(stP2);
  check('保存して読み直すと、引換券と強化の段階も同じ', back2.tickets === sv.tickets && back2.up.shoes === 2 && back2.up.cheer === 1 && back2.up.book === 0 && JSON.stringify(back2) === JSON.stringify(sv), 'tickets=' + back2.tickets);
  const weird = Tourney.sanitize({ tickets: -50, up: { shoes: 99, clothes: -3, fall: 'x', recorder: 2.9, cheer: null, book: 1 } });
  check('おかしい保存は直して読む（引換券は 0 以上・強化は 0〜最大）', weird.tickets === 0 && weird.up.shoes === Shop.maxLevel('shoes') && weird.up.clothes === 0 && weird.up.fall === 0 && weird.up.recorder === 2 && weird.up.cheer === 0 && weird.up.book === 1);
  check('引換券が小数・文字でも整数の枚数に直す', Tourney.sanitize({ tickets: 12.8 }).tickets === 12 && Tourney.sanitize({ tickets: 'abc' }).tickets === 0 && Tourney.sanitize({ up: 5 }).up.shoes === 0);
  check('v1 のベストの引き継ぎは、これまでどおり新しい保存の形で書かれる', JSON.parse(st2.d[SAVE_KEY]).v === 2 && JSON.parse(st2.d[SAVE_KEY]).tickets === 0);
  Shop.reset();

  // ===== ボットでペースを確認：毎秒 4 / 6 / 8 回のボットが、次に勝っていない大会を遊び続け、いちばん安い強化を買いながら宇宙大会まで =====
  // 1 回は約 30 秒（測定 20 秒＋画面）で数える
  function playThrough(rate, err, seed, maxRuns) {
    const q = Tourney.newSave(); let runs = 0, buys = 0;
    while (!q.won[N - 1] && runs < maxRuns) {
      const i = q.won.indexOf(false);
      Shop.apply(q);
      const res = run({ rate, err, seed: seed * 1000 + runs });
      Tourney.record(q, i, res.rec);
      runs++;
      for (let g = 0; g < 60; g++) { const id = Shop.cheapest(q); if (!id) break; Shop.buy(q, id); buys++; }
    }
    Shop.reset();
    return { runs, done: q.won[N - 1], up: q.up, buys, tickets: q.tickets };
  }
  const bots = [[4, 0.02], [6, 0.03], [8, 0.03]].map(([rate, err]) => {
    const rs = [1, 2, 3, 4, 5].map(sd => playThrough(rate, err, sd, 600));
    const runs = rs.map(x => x.runs).sort((a, b) => a - b);
    return { rate, err, runs: runs[2], min: runs[2] * 0.5, done: rs.every(x => x.done), up: rs[2].up };
  });
  const tbl = document.createElement('pre');
  tbl.textContent = 'ボットで宇宙大会まで（5 回の中央値・1 回 30 秒で換算）\n' + bots.map(b => '毎秒 ' + b.rate + ' 回（ミス ' + Math.round(b.err * 100) + '%）：' + b.runs + ' 回・約 ' + b.min.toFixed(1) + ' 分　最終の強化 ' + JSON.stringify(b.up)).join('\n');
  out.appendChild(tbl);
  check('ボット：毎秒 6 回の人は 20〜30 分で宇宙大会に勝つ', bots[1].done && bots[1].min >= 20 && bots[1].min <= 30, bots[1].runs + ' 回・' + bots[1].min.toFixed(1) + ' 分');
  check('ボット：毎秒 8 回の人は、毎秒 6 回の人より早い', bots[2].done && bots[2].runs < bots[1].runs, bots[2].runs + ' 回・' + bots[2].min.toFixed(1) + ' 分');
  check('ボット：毎秒 4 回の人も、いつかは勝てる（毎秒 6 回の人の 5 倍以内）', bots[0].done && bots[0].runs <= bots[1].runs * 5, bots[0].runs + ' 回・' + bots[0].min.toFixed(1) + ' 分');
  check('ボット：毎秒 6 回の人は最初の大会に 1 回目で勝てる（始めで詰まらない）', (() => { Shop.reset(); const x = run({ rate: 6, err: 0.03, seed: 1 }); return Tourney.beats(x.rec, 0); })());
  check('ボット：毎秒 4 回の人でも、最初の強化は 5 回以内に買える（遅い人でも最初の手応えが早い）', (() => {
    const q = Tourney.newSave(); let runs = 0;
    while (!Shop.cheapest(q) && runs < 30) { const i = q.won.indexOf(false); Shop.apply(q); Tourney.record(q, i, run({ rate: 4, err: 0.02, seed: 50 + runs }).rec); runs++; }
    Shop.reset(); return runs <= 5;
  })());
  Shop.reset();

  // ボットで目安：強化なしの Phase 1 で、どこまで勝てるか
  const rec6 = median([1, 2, 3, 4, 5].map(sd => run({ rate: 6, err: 0.02, seed: sd }).rec));
  const rec9 = median([1, 2, 3, 4, 5].map(sd => run({ rate: 9, err: 0.05, seed: sd }).rec));
  const beaten = rec => CFG.targets.filter(t => rec > t).length;
  check('毎秒6回のボットは、少なくとも最初の大会に勝てる（遊び始めで詰まらない）', beaten(rec6) >= 1, 'rec=' + rec6 + ' 勝てる大会=' + beaten(rec6));
  check('強化なしでは、最後の大会には勝てない（毎秒10回でも宇宙大会には届かない）', beaten(rec9) < N && beaten(b11.rec) < N, 'rec9=' + rec9 + ' 勝てる大会=' + beaten(rec9) + ' ／ 最高速 rec=' + b11.rec);

  // ===== v2 Phase 3：会場・記録係・ライバルの一言・エンディング =====
  {
    const NV = CFG.targets.length;
    const strs = o => { const out = []; (function w(v) { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object') Object.keys(v).forEach(k => w(v[k])); })(o); return out; };
    check('会場の表：大会と同じ 9 つ（目標・名前・言葉と同じ数）', VENUES.length === 9 && NV === 9 && STR.tournaments.length === 9 && STR.venues.length === 9);
    check('会場の表：番号と id が合っている（重なりなし）', VENUES.every((v, i) => v.i === i) && new Set(VENUES.map(v => v.id)).size === 9);
    check('会場の表：必要な項目（kind・壁・床・小物・観客・記録係・音）が全部ある', VENUES.every(v => VENUE_KINDS.indexOf(v.kind) >= 0 && v.wall.length === 2 && v.floor.length === 2 && typeof v.floorStyle === 'string' && typeof v.bg === 'string'
      && v.props.length > 0 && v.props.every(n => VENUE_PROPS.indexOf(n) >= 0) && CROWD_TYPES.indexOf(v.crowd.type) >= 0 && v.crowd.shirts.length > 0 && typeof v.crowd.pants === 'string'
      && REC_TYPES.indexOf(v.recorder) >= 0 && typeof v.amb === 'string' && v.k > 0 && typeof v.lowG === 'boolean'));
    check('会場の表：最初の 3 つは体育館・月面だけ低重力・記録係の絵は 9 会場ぜんぶ別', VENUES.slice(0, 3).every(v => v.kind === 'gym') && VENUES.filter(v => v.lowG).length === 1 && VENUES[7].lowG && new Set(VENUES.map(v => v.recorder)).size === 9);
    check('会場の表：会場が上がるほど観客が大きく（クラス＜世界）、月面は静か', VENUES[6].k >= VENUES[0].k * 2 && VENUES[7].k < VENUES[0].k);
    check('会場の言葉：9 つとも横断幕・待ち・終了・読み上げがある', STR.venues.every(v => v.banner && v.ready && v.fin && v.tag && typeof v.over(12) === 'string' && v.over(12).indexOf('12') >= 0));
    check('記録係のひとこと：9 会場とも、勢いの段階 0〜10（秘伝書の 7〜10 も）に 1 つずつある', STR.venues.every(v => v.rec.length >= 7 + CFG.bodiesExtra.length && v.rec.every(x => typeof x === 'string' && x.length > 0)), '段階の数 ' + (7 + CFG.bodiesExtra.length));
    check('記録係のひとこと：1 行に収まる長さ（16 文字まで）', STR.venues.every(v => v.rec.concat([v.ready, v.fin, v.over(99999)]).every(x => x.length <= 16)));
    check('記録係のひとこと：会場ごとに言葉が違う（同じ文が 2 会場に出ない）', (() => { const all = [].concat(...STR.venues.map(v => v.rec)); return new Set(all).size === all.length; })());
    check('ライバルの一言：9 人とも、勝ったとき・負けたときの 2 つがある', STR.tournaments.every(t => t.rival.win && t.rival.lose && t.rival.win !== t.rival.lose));
    check('文節の区切り「|」：空の文節がない（画面の言葉全部）', strs(STR).every(x => x.indexOf('||') < 0 && x[0] !== '|' && x[x.length - 1] !== '|'));
    check('エンディング：全体の長さは 10〜20 秒（3 場面ぶん）', endingTotal() >= 10 && endingTotal() <= 20 && Object.keys(ENDING_TIMES).length === 3 && Object.values(ENDING_TIMES).every(x => x > 3));
    check('エンディング：字幕・先生のセリフ・記録用紙の言葉がそろっている', STR.ending.cap.galaxy.length >= 2 && STR.ending.cap.sheet.length >= 2 && STR.ending.teacher.length === 3 && strs(STR.ending.cert).every(x => x.length > 0) && STR.ending.teacher[1]('9,999').indexOf('9,999') >= 0);
    check('エンディング：宇宙大会に初めて勝った 1 回だけ出る・見たあとは全大会が遊べて、ベストを伸ばせる', (() => {
      const sv = Tourney.newSave();
      for (let i = 0; i < NV - 1; i++) Tourney.record(sv, i, CFG.targets[i] + 1);
      const a = Tourney.record(sv, NV - 1, CFG.targets[NV - 1] + 10), b = Tourney.record(sv, NV - 1, CFG.targets[NV - 1] + 99);
      return a.ending === true && b.ending === false && b.isBest && sv.best[NV - 1] === CFG.targets[NV - 1] + 99 && sv.won.every(Boolean) && sv.won.every((_, i) => Tourney.playable(sv, i));
    })());
    check('保存：Phase 3 では形を変えない（版 2・項目は v・unlocked・won・best・tickets・up）', SAVE_VER === 2 && JSON.stringify(Object.keys(Tourney.newSave()).sort()) === JSON.stringify(['best', 'tickets', 'unlocked', 'up', 'v', 'won']));
  }

  const s = document.createElement('h2');
  s.textContent = fail === 0 ? '全部 OK' : 'NG が ' + fail + ' 件';
  s.className = fail === 0 ? 'ok' : 'ng';
  out.insertBefore(s, out.firstChild);
  window.__verifyFail = fail;
})();
