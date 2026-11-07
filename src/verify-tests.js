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

  const s = document.createElement('h2');
  s.textContent = fail === 0 ? '全部 OK' : 'NG が ' + fail + ' 件';
  s.className = fail === 0 ? 'ok' : 'ng';
  out.insertBefore(s, out.firstChild);
  window.__verifyFail = fail;
})();
