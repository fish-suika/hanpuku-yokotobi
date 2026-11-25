// ===== 画面の流れ・操作・ループ・結果・共有 =====
const fmt = fmtNum;   // 大きな数字の表示は fmtNum（12-strings.js）1 か所
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 「|」で区切った言葉を、文節ごとに途中で改行しない塊にして HTML にする
const phHtml = s => s.split('|').map(p => '<span class="nb">' + esc(p) + '</span>').join('');

// 保存（localStorage が使えないとき＝data: URL やプライベートモードでも止まらない）
const store = {
  getItem(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  setItem(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
};
let SAVE = Tourney.load(store);
Shop.apply(SAVE);

// 画面：title → list（大会の一覧）→ intro（ライバルの紹介）→ play（測定）→ result（記録用紙）→ list …。ending は宇宙大会に初めて勝ったあと
const App = { screen: 'title', idx: 0, introAt: 0, res: null, pendingEnding: false, shopFrom: 'list' };

let shownResult = false, rollT = 1, stampDone = true, vsT = -1, last = 0, murLvl = -1;
let crowdT = 0;

// 文字を画面に入れる（data-s＝そのまま、data-p＝「|」で文節に分ける）
function strAt(path) { return path.split('.').reduce((o, k) => o[k], STR); }
function applyStrings() {
  for (const el of document.querySelectorAll('[data-s]')) el.textContent = strAt(el.dataset.s);
  for (const el of document.querySelectorAll('[data-p]')) el.innerHTML = phHtml(strAt(el.dataset.p));
}

function setScreen(s) {
  App.screen = s;
  $('title').classList.toggle('hide', s !== 'title');
  $('list').classList.toggle('on', s === 'list');
  $('shop').classList.toggle('on', s === 'shop');
  $('intro').classList.toggle('on', s === 'intro');
  $('ending').classList.toggle('on', s === 'ending');
  if (s !== 'result') $('result').classList.remove('show', 'wait');
}

function tap(side) {
  Snd.init();
  if (App.screen === 'title') { openList(); return; }
  if (App.screen === 'intro') { if (nowT - App.introAt > 0.3) startRun(); return; }
  if (App.screen === 'ending') { skipEnding(); return; }
  if (App.screen === 'play') Game.input(side);
}

function bindUI() {
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    tap(e.clientX < window.innerWidth / 2 ? -1 : 1);
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); tap(-1); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); tap(1); }
    else if (k === ' ' || k === 'Enter') {
      if (e.target && e.target.tagName === 'BUTTON') return;   // ボタンの上では、そのボタン自身の操作にまかせる
      e.preventDefault(); Snd.init();
      if (App.screen === 'title') openList();
      else if (App.screen === 'list') openIntro(Tourney.focusIndex(SAVE));
      else if (App.screen === 'intro') { if (nowT - App.introAt > 0.3) startRun(); }
      else if (App.screen === 'result' && !$('result').classList.contains('wait')) retry();
      else if (App.screen === 'ending') { if (End.cert) openList(); else skipEnding(); }
    }
  });
  window.addEventListener('resize', resize);
  window.addEventListener('contextmenu', e => e.preventDefault());
  $('retry').addEventListener('click', () => { Snd.init(); retry(); });
  $('toList').addEventListener('click', () => { Snd.init(); if (App.pendingEnding) showEnding(); else openList(); });
  $('share').addEventListener('click', share);
  $('listBack').addEventListener('click', () => { resetRun(); setScreen('title'); });
  $('toShop').addEventListener('click', () => { Snd.init(); openShop('list'); });
  $('rShop').addEventListener('click', () => { Snd.init(); openShop('result'); });
  $('shopBack').addEventListener('click', () => { Snd.init(); if (App.pendingEnding) showEnding(); else openList(); });
  $('shopGo').addEventListener('click', () => { Snd.init(); startRun(); });
  $('shopBody').addEventListener('click', e => {
    const b = e.target.closest('.buy');
    if (b) { Snd.init(); buyItem(b.closest('.it').dataset.id); }
  });
  $('inBack').addEventListener('click', () => openList());
  $('endBtn').addEventListener('click', () => { Snd.init(); End.on = false; openList(); });
  $('endShare').addEventListener('click', shareEnding);
  $('ending').addEventListener('click', e => { if (!End.cert && !e.target.closest('button')) { Snd.init(); skipEnding(); } });
  $('listBody').addEventListener('click', e => {
    const b = e.target.closest('.tn');
    if (b && !b.disabled) { Snd.init(); openIntro(+b.dataset.i); }
  });
}

// ---- 画面を開く ----
function resetRun() {
  Game.reset();
  shownResult = false; stampDone = true; rollT = 1; vsT = -1;
  popups.length = 0; smoke.length = 0; hist.length = 0;
  for (const c of CL) c.app = 0;
  lvlShown = 0; murLvl = -1; crowdAmt = 0; tripAt = -99; rivalPassed = false; rivalPassAt = -99;
  Snd.murmur(-1);
  $('stamp').classList.remove('on'); $('vsStamp').classList.remove('on');
}

function openList() {
  resetRun();
  End.on = false;
  Snd.setVenue(0);
  App.pendingEnding = false;
  renderList();
  setScreen('list');
}

function renderList() {
  const n = Tourney.count(), L = STR.list;
  let html = '';
  for (let i = 0; i < n; i++) {
    const st = Tourney.status(SAVE, i), T = STR.tournaments[i], R = T.rival;
    const locked = st === 'locked';
    const sub = locked ? L.hidden : L.vs + ' ' + R.short + '　' + fmt(CFG.targets[i]) + L.unit;
    const best = SAVE.best[i] > 0 ? L.best + ' ' + fmt(SAVE.best[i]) : (locked ? '' : L.noBest);
    const tag = st === 'won' ? L.tagWon : st === 'next' ? L.tagNext : L.tagLocked;
    html += '<button class="tn ' + st + '" data-i="' + i + '"' + (locked ? ' disabled' : '') + '>'
      + '<span class="no">' + (i + 1) + '</span>'
      + '<span class="mid"><span class="nm">' + esc(T.name) + '</span><span class="sb">' + esc(sub) + '</span></span>'
      + '<span class="rt"><span class="tag">' + esc(tag) + '</span><span class="bs">' + esc(best) + '</span></span>'
      + '</button>';
  }
  $('listBody').innerHTML = html;
  $('listProg').textContent = L.progress(Tourney.wonCount(SAVE), n);
  $('listTk').textContent = fmt(SAVE.tickets);
  $('toShop').classList.toggle('hot', anyBuyable());
}

// ---- 購買部 ----
function anyBuyable() { return Shop.ids.some(id => Shop.canBuy(SAVE, id)); }

// from：'list'（大会の一覧から）／'result'（記録用紙から。「もう一回」で続けて測れる）
function openShop(from) {
  App.shopFrom = from;
  if (from !== 'result') resetRun();
  renderShop();
  $('shopGo').style.display = from === 'result' && !App.pendingEnding ? '' : 'none';
  setScreen('shop');
}

function renderShop() {
  const S = STR.shop;
  let html = '';
  for (const id of Shop.ids) {
    const I = S.items[id], lv = Shop.level(SAVE, id), mx = Shop.maxLevel(id), st = Shop.state(SAVE, id);
    const cur = (I.lb ? I.lb + ' ' : '') + I.v(Shop.effect(id, lv));
    let fx = esc(st === 'max' ? cur : cur + S.arrow + I.v(Shop.effect(id, lv + 1)));
    if (st === 'locked') fx = phHtml(S.gate(ph(STR.tournaments[Shop.gate(SAVE, id) - 1].name)));
    let pips = '';
    for (let k = 0; k < mx; k++) pips += '<i' + (k < lv ? ' class="on"' : '') + '>●</i>';
    const label = st === 'max' ? S.soldOut : st === 'locked' ? S.lock : fmt(Shop.price(SAVE, id));
    html += '<div class="it ' + st + '" data-id="' + id + '">'
      + '<div class="mid"><div class="l1"><span class="nm">' + esc(I.name) + '</span><span class="pips">' + pips + '</span></div>'
      + '<div class="ds">' + phHtml(I.desc) + '</div><div class="fx">' + fx + '</div></div>'
      + '<button class="buy"' + (st === 'max' ? ' disabled' : '') + '>' + esc(label) + '</button></div>';
  }
  $('shopBody').innerHTML = html;
  $('shopTk').textContent = fmt(SAVE.tickets);
}

function buyItem(id) {
  const r = Shop.buy(SAVE, id);
  if (r.ok) { Tourney.persist(store, SAVE); Snd.buy(); }
  else if (r.reason !== 'max') Snd.deny();
  renderShop();
  const row = $('shopBody').querySelector('[data-id="' + id + '"]');
  if (row && r.reason !== 'max') { row.classList.add(r.ok ? 'got' : 'no'); setTimeout(() => row.classList.remove('got', 'no'), 400); }
}

function openIntro(i) {
  if (!Tourney.playable(SAVE, i)) return;
  resetRun();
  App.idx = i;
  Snd.setVenue(i);
  const T = STR.tournaments[i], I = STR.intro;
  $('inName').textContent = ph(T.name);
  $('inRival').innerHTML = phHtml(T.rival.name);
  $('inSay').innerHTML = '「' + phHtml(T.rival.say) + '」';
  $('inRec').innerHTML = esc(fmt(CFG.targets[i])) + '<small>' + esc(I.unit) + '</small>';
  $('inBest').textContent = SAVE.best[i] > 0 ? I.best + ' ' + fmt(SAVE.best[i]) + ' ' + I.unit : '';
  setScreen('intro');
  App.introAt = nowT;
}

// 測定をはじめる（「よーい」から）。結果からの「もう一回」もここ＝1タップ
function startRun() {
  resetRun();
  Shop.apply(SAVE);   // 買った強化を、この測定のぶん CFG に反映する
  setScreen('play');
  Game.begin();
}
function retry() { startRun(); }

function showEnding() {
  App.pendingEnding = false;
  setScreen('ending');
  startEnding(SAVE.best[Tourney.count() - 1]);
}

// ---- 結果 ----
function resultInfo() {
  return { rec: Game.rec, steps: Game.steps, maxN: Game.maxN, trips: Game.trips, judge: judgeFor(Game.rec) };
}

// 長い数字は小さく（枠からはみ出さないように）
// 記録の大きな数字：長いときは文字を小さくして、判子や単位とぶつからないようにする
function fitRec(el) { el.parentNode.style.fontSize = el.textContent.length > 5 ? '9.5cqw' : el.textContent.length > 4 ? '11cqw' : ''; }
function fitNum(el) { el.className = el.textContent.length > 7 ? 'l3' : el.textContent.length > 5 ? 'l2' : ''; }

function showResult() {
  shownResult = true;
  const r = resultInfo(), i = App.idx, S = STR.sheet, T = STR.tournaments[i];
  const info = Tourney.record(SAVE, i, r.rec);
  Tourney.persist(store, SAVE);
  App.res = info; App.pendingEnding = info.ending;
  setScreen('result');
  $('rName').textContent = T.name;
  $('rSteps').textContent = fmt(r.steps);
  $('rMaxN').textContent = fmt(r.maxN);
  $('rTrips').textContent = fmt(r.trips);
  $('rRec').textContent = '0';
  fitRec($('rRec'));
  $('rTk').textContent = S.ticketGain(fmt(info.gain));
  $('rShop').classList.toggle('hot', anyBuyable());
  const st = $('stamp');
  st.textContent = r.judge;
  st.className = r.judge.length > 1 ? 'long' : '';
  $('rJudge').innerHTML = r.rec >= 1000 ? phHtml(S.judgeAll) : r.maxN >= 2 ? phHtml(S.judgeClone) : '';
  const best = SAVE.best[i];
  $('rBest').textContent = info.isBest && info.prevBest > 0 ? S.bestNew : best > 0 ? S.best(fmt(best)) : '';
  // ライバルとの比べ
  const tg = CFG.targets[i];
  $('vs').className = info.win ? 'win' : 'lose';
  $('vsRLb').textContent = S.rival(T.rival.short);
  $('vsRRec').textContent = fmt(tg); fitNum($('vsRRec'));
  $('vsYou').textContent = '0';
  $('vsStamp').textContent = info.win ? S.win : S.lose;
  let note = '';
  if (info.ending) note = S.noteEnd;
  else if (info.unlockedNext) note = S.noteUnlock(STR.tournaments[i + 1].name);
  else if (info.win) note = S.noteReplay;
  else note = S.noteLose(fmt(tg - r.rec + 1));
  $('vsNote').innerHTML = phHtml(note);
  $('vsSay').innerHTML = '<span class="who">' + esc(T.rival.short) + '</span>' + phHtml(S.rivalSay(info.win ? T.rival.win : T.rival.lose));
  $('toList').textContent = info.ending ? S.cont : S.toList;
  const el = $('result');
  el.classList.add('show', 'wait');   // 指が離れる前にボタンを押してしまわないように、少しの間は触れない
  setTimeout(() => el.classList.remove('wait'), 700);
  rollT = 0; stampDone = false; vsT = -1;
}

function updateResult(dt) {
  if (rollT < 1) {
    rollT = Math.min(1, rollT + dt / 0.9);
    const v = fmt(Math.round(Game.rec * easeOut(rollT)));
    $('rRec').textContent = v; fitRec($('rRec'));
    $('vsYou').textContent = v; fitNum($('vsYou'));
  } else if (!stampDone) {
    stampDone = true;
    $('stamp').classList.add('on');
    Snd.stamp();
    vsT = 0.45;
  } else if (vsT > 0) {
    vsT -= dt;
    if (vsT <= 0) {
      $('vsStamp').classList.add('on');
      if (App.res && App.res.win) Snd.win(); else Snd.lose();
    }
  }
}

// ライバルの記録を超えた瞬間：音と文字と札のふくらみ
function checkRival() {
  if (App.screen !== 'play' || rivalPassed || Game.mode !== 'play') return;
  if (!Tourney.beats(Game.rec, App.idx)) return;
  rivalPassed = true; rivalPassAt = nowT;
  Snd.rival();
  flash = Math.max(flash, 0.14);
  addPopup(STR.pop.rival, 50, 76, 8.5, '#e0356f', 1.3, 10, '#fff');
}

// ゲームの出来事を、見た目と音の反応にする
function reactToEvents() {
  for (const e of Game.events) {
    if (e.type === 'start') {
      Snd.whistleStart();
      addPopup(STR.pop.start, 50, 100, 17, '#e0356f', 0.9, 14, '#fff');
    } else if (e.type === 'step') {
      Snd.squeak();
      hudPop = 1;
      if (Game.lvl >= 4) puffSmoke(Game.lvl - 3);
    } else if (e.type === 'trip') {
      Snd.trip();
      tripAt = nowT; shakeT = 0.12;
      addPopup(e.from === 1 ? STR.pop.stumble : STR.pop.out, xOf(Game.xv, 1), 100, 8, '#d2382f', 0.8, 10, '#fff');
      if (e.was - e.lvl > 0) addPopup(STR.pop.down, 50, 118, 6, '#2c4aa0', 0.8, 6, '#fff');
    } else if (e.type === 'lvl') {
      if (e.up) {
        Snd.levelUp(e.lvl);
        const LV_COLOR = ['', '#2c4aa0', '#1f8f6a', '#e08a1a', '#e0502a', '#d2382f', '#b01a8a', '#8a1ab0', '#5a1ab0', '#2a1ab0', '#0a3ad0'];
        flash = 0.12 + 0.05 * Math.min(e.lvl, 8); shakeT = 0.1;
        addPopup(STR.pop.lv[e.lvl] || STR.pop.lvN(CFG.bodies[e.lvl]), 50, 84, 12 + Math.min(e.lvl, 8) * 0.6, LV_COLOR[Math.min(e.lvl, 10)], 1.1, 10, '#fff');
        puffSmoke(e.lvl >= 4 ? 8 : 0);
      }
    } else if (e.type === 'end') {
      Snd.whistleEnd();
      lvlShown = Game.lvl;
      addPopup(STR.pop.end, 50, 90, 18, '#2c4aa0', 1.4, 8, '#fff');
      setTimeout(() => Snd.pant(), 500);
      setTimeout(() => Snd.pant(), 1400);
      for (let i = 0; i < 5; i++) addPopup(STR.pop.pant, 22 + i * 14, 112 + (i % 2) * 14, 5, '#55608a', 1.8, 6, '#fff');
    }
  }
  Game.events.length = 0;
  // ざわめき
  const m = Game.mode === 'play' ? Game.lvl : -1;
  if (m !== murLvl) { murLvl = m; Snd.murmur(m); }
}

// 見ている人のひとこと（段階3から）
function crowdTalk(dt) {
  if (Game.mode !== 'play' || Game.lvl < 3) return;
  crowdT -= dt;
  if (crowdT > 0) return;
  crowdT = 0.9 - Game.lvl * 0.09;
  const cand = SP.filter(p => p.app > 0.7 && p.x > 2 && p.x < 98);
  if (!cand.length) return;
  const p = cand[Math.floor(Math.random() * cand.length)];
  addPopup(STR.pop.crowd[Math.floor(Math.random() * STR.pop.crowd.length)], p.x, p.y - 22, 3.8, '#2b2b3a', 0.9, 5, '#fff');
}

function frame(ts) {
  const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
  last = ts; nowT += dt;
  Game.step(dt);
  updateEnding(dt);
  reactToEvents();
  checkRival();
  if (Game.mode === 'over' && !shownResult && App.screen === 'play') showResult();
  if (shownResult) updateResult(dt);
  crowdTalk(dt);
  updateVisual(dt);
  render();
  requestAnimationFrame(frame);
}

// ===== 共有（記録用紙のカード）=====
function shareText() {
  const r = resultInfo(), win = !!(App.res && App.res.win);
  return STR.share.text(ph(STR.tournaments[App.idx].name), fmt(r.rec), r.steps, r.judge, r.maxN, win);
}
function shareUrl() {
  const web = /^https?:/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)/.test(location.host);
  return web ? location.origin + location.pathname : CFG.shareUrl;
}
function makeShareImage() {
  return new Promise(resolve => {
    const Wd = 1080, Ht = 1350, r = resultInfo(), K = STR.share.card;
    const cc = document.createElement('canvas');
    cc.width = Wd; cc.height = Ht;
    const c = cc.getContext('2d');
    c.fillStyle = '#e8d6a8'; c.fillRect(0, 0, Wd, Ht);
    c.fillStyle = '#c58f45'; c.fillRect(0, 900, Wd, 450);
    c.fillStyle = '#fffdf2'; c.strokeStyle = '#2c4aa0'; c.lineWidth = 10;
    rr(c, 90, 90, Wd - 180, Ht - 330, 22); c.fill(); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#2c4aa0'; c.font = 'bold 66px ' + FONT; c.fillText(K.head, Wd / 2, 210);
    c.fillRect(150, 240, Wd - 300, 6);
    c.fillStyle = '#55608a'; c.font = '48px ' + FONT; c.textAlign = 'left'; c.fillText(K.kind, 160, 330);
    c.textAlign = 'right'; c.fillStyle = '#2b2b3a'; c.font = 'bold 54px ' + FONT; c.fillText(K.kindVal, Wd - 160, 330);
    c.textAlign = 'left'; c.fillStyle = '#55608a'; c.font = 'bold 52px ' + FONT; c.fillText(K.rec, 160, 520);
    const recS = fmt(r.rec); let fs = 200;
    c.font = '900 ' + fs + 'px ' + FONT;
    const mw = c.measureText(recS).width;
    if (mw > 560) { fs = Math.floor(fs * 560 / mw); c.font = '900 ' + fs + 'px ' + FONT; }   // 長い数字は、左の「記録」にぶつからない幅に縮める
    c.textAlign = 'right'; c.fillStyle = '#d2382f'; c.fillText(recS, Wd - 260, 560);
    c.fillStyle = '#55608a'; c.font = 'bold 58px ' + FONT; c.fillText(K.unit, Wd - 160, 560);
    // 判定の判子
    c.save(); c.translate(Wd - 230, 360); c.rotate(-0.25);
    c.strokeStyle = '#d2382f'; c.fillStyle = '#d2382f'; c.lineWidth = 12;
    c.beginPath(); c.arc(0, 0, 112, 0, 6.283); c.stroke();
    c.textAlign = 'center'; c.font = '900 ' + (r.judge.length > 1 ? 40 : 110) + 'px ' + FONT;
    if (r.judge.length > 3) { c.fillText(r.judge.slice(0, 3), 0, -6); c.fillText(r.judge.slice(3), 0, 40); }
    else c.fillText(r.judge, 0, r.judge.length > 1 ? 14 : 38);
    c.restore();
    const rows = [[K.steps, fmt(r.steps) + K.times], [K.maxN, fmt(r.maxN) + K.people], [K.trips, fmt(r.trips) + K.times]];
    rows.forEach(([a, b], i) => {
      const y = 700 + i * 110;
      c.strokeStyle = '#9aa7d0'; c.lineWidth = 3; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(150, y + 28); c.lineTo(Wd - 150, y + 28); c.stroke(); c.setLineDash([]);
      c.textAlign = 'left'; c.fillStyle = '#55608a'; c.font = '50px ' + FONT; c.fillText(a, 160, y);
      c.textAlign = 'right'; c.fillStyle = '#2b2b3a'; c.font = 'bold 56px ' + FONT; c.fillText(b, Wd - 160, y);
    });
    c.textAlign = 'center'; c.fillStyle = '#5a3d1e'; c.font = '40px ' + FONT;
    c.fillText(shareUrl(), Wd / 2, Ht - 80);
    cc.toBlob(resolve, 'image/png');
  });
}
function shareEnding() {
  const text = STR.ending.shareText(fmt(SAVE.best[Tourney.count() - 1])), url = shareUrl();
  try { if (navigator.share) { navigator.share({ text, url }).catch(() => {}); return; } } catch (_) {}
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
}
async function share() {
  const text = shareText(), url = shareUrl();
  try {
    if (navigator.canShare && navigator.share) {
      const blob = await makeShareImage();
      const file = new File([blob], 'hanpuku-yokotobi.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) await navigator.share({ text, url, files: [file] });
      else await navigator.share({ text, url });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
}
