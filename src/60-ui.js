// ===== 操作・ループ・結果・共有 =====
const BEST_KEY = 'hanpuku-yokotobi-best';
function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (_) { return 0; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (_) {} }
const fmt = n => n.toLocaleString('ja-JP');

let shownResult = false, rollT = 1, stampDone = true, last = 0, murLvl = -1;
const LV_TEXT = ['', 'ぶんしん！', '4にん！', '8にん！！', '16にん！！', '32にん！！！', '測定不能！！！'];
const LV_COLOR = ['', '#2c4aa0', '#1f8f6a', '#e08a1a', '#e0502a', '#d2382f', '#b01a8a'];
const CROWD = ['わー！', 'すげー！', 'はやっ！', 'なにあれ！', 'ぶんしん！？', 'えええ！', '2人いる！', '見えない！'];
let crowdT = 0;

function tap(side) {
  Snd.init();
  if (Game.mode === 'title') { Game.begin(); return; }
  Game.input(side);
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
      e.preventDefault();
      if (Game.mode === 'title') { Snd.init(); Game.begin(); }
      else if (Game.mode === 'over' && !$('result').classList.contains('wait')) { Snd.init(); retry(); }
    }
  });
  window.addEventListener('resize', resize);
  window.addEventListener('contextmenu', e => e.preventDefault());
  $('retry').addEventListener('click', () => { Snd.init(); retry(); });
  $('share').addEventListener('click', share);
}

function retry() {
  Game.reset();
  shownResult = false; stampDone = true; rollT = 1;
  popups.length = 0; smoke.length = 0; hist.length = 0;
  for (const c of CL) c.app = 0;
  lvlShown = 0; murLvl = -1; tripAt = -99;
  Snd.murmur(0);
  $('result').classList.remove('show', 'wait');
  $('stamp').classList.remove('on');
  $('title').classList.remove('hide');
  Game.begin();   // 「もう一回」はそのまま「よーい」から
}

// 結果の数字
function resultInfo() {
  return { rec: Game.rec, steps: Game.steps, maxN: Game.maxN, trips: Game.trips, judge: judgeFor(Game.rec) };
}

function showResult() {
  shownResult = true;
  const r = resultInfo();
  const best = loadBest();
  const isBest = r.rec > best;
  if (isBest) saveBest(r.rec);
  $('rSteps').textContent = fmt(r.steps);
  $('rMaxN').textContent = fmt(r.maxN);
  $('rTrips').textContent = fmt(r.trips);
  $('rRec').textContent = '0';
  const st = $('stamp');
  st.textContent = r.judge;
  st.className = r.judge.length > 1 ? 'long' : '';
  $('rJudge').textContent = r.rec >= 1000 ? '記録係は ぜんいん 数えました' : r.maxN >= 2 ? '分身も ぜんいん 数えられました' : '';
  $('rBest').textContent = isBest && best > 0 ? 'ベスト こうしん！' : best > 0 ? 'ベスト ' + fmt(Math.max(best, r.rec)) + ' 回' : '';
  const el = $('result');
  el.classList.add('show', 'wait');   // 指が離れる前にボタンを押してしまわないように、少しの間は触れない
  setTimeout(() => el.classList.remove('wait'), 700);
  rollT = 0; stampDone = false;
}

function updateResult(dt) {
  if (rollT < 1) {
    rollT = Math.min(1, rollT + dt / 0.9);
    $('rRec').textContent = fmt(Math.round(Game.rec * easeOut(rollT)));
  } else if (!stampDone) {
    stampDone = true;
    $('stamp').classList.add('on');
    Snd.stamp();
  }
}

// ゲームの出来事を、見た目と音の反応にする
function reactToEvents() {
  for (const e of Game.events) {
    if (e.type === 'ready') {
      $('title').classList.add('hide');
    } else if (e.type === 'start') {
      Snd.whistleStart();
      addPopup('スタート！', 50, 100, 17, '#e0356f', 0.9, 14, '#fff');
    } else if (e.type === 'step') {
      Snd.squeak();
      hudPop = 1;
      if (Game.lvl >= 4) puffSmoke(Game.lvl - 3);
    } else if (e.type === 'trip') {
      Snd.trip();
      tripAt = nowT; shakeT = 0.12;
      addPopup(e.from === 1 ? 'もつれた！' : 'はみだした！', xOf(Game.xv, 1), 100, 8, '#d2382f', 0.8, 10, '#fff');
      if (e.was - e.lvl > 0) addPopup('勢い ダウン', 50, 118, 6, '#2c4aa0', 0.8, 6, '#fff');
    } else if (e.type === 'lvl') {
      if (e.up) {
        Snd.levelUp(e.lvl);
        flash = 0.12 + 0.05 * e.lvl; shakeT = 0.1;
        addPopup(LV_TEXT[e.lvl], 50, 84, 12 + e.lvl * 0.6, LV_COLOR[e.lvl], 1.1, 10, '#fff');
        puffSmoke(e.lvl >= 4 ? 8 : 0);
      }
    } else if (e.type === 'end') {
      Snd.whistleEnd();
      lvlShown = Game.lvl;
      addPopup('そこまで！', 50, 90, 18, '#2c4aa0', 1.4, 8, '#fff');
      setTimeout(() => Snd.pant(), 500);
      setTimeout(() => Snd.pant(), 1400);
      for (let i = 0; i < 5; i++) addPopup('ゼーゼー', 22 + i * 14, 112 + (i % 2) * 14, 5, '#55608a', 1.8, 6, '#fff');
    }
  }
  Game.events.length = 0;
  // ざわめき
  const m = Game.mode === 'play' ? Game.lvl : 0;
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
  addPopup(CROWD[Math.floor(Math.random() * CROWD.length)], p.x, p.y - 22, 3.8, '#2b2b3a', 0.9, 5, '#fff');
}

function frame(ts) {
  const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
  last = ts; nowT += dt;
  Game.step(dt);
  reactToEvents();
  if (Game.mode === 'over' && !shownResult) showResult();
  if (shownResult) updateResult(dt);
  crowdTalk(dt);
  updateVisual(dt);
  render();
  requestAnimationFrame(frame);
}

// ===== 共有（記録用紙のカード）=====
function shareText() {
  const r = resultInfo();
  return '反復横とびで 記録 ' + fmt(r.rec) + ' 回（本当は ' + r.steps + ' 回）、判定「' + r.judge + '」！ 分身 ' + r.maxN + ' 人 #反復横とび';
}
function shareUrl() {
  const web = /^https?:/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)/.test(location.host);
  return web ? location.origin + location.pathname : CFG.shareUrl;
}
function makeShareImage() {
  return new Promise(resolve => {
    const Wd = 1080, Ht = 1350, r = resultInfo();
    const cc = document.createElement('canvas');
    cc.width = Wd; cc.height = Ht;
    const c = cc.getContext('2d');
    c.fillStyle = '#e8d6a8'; c.fillRect(0, 0, Wd, Ht);
    c.fillStyle = '#c58f45'; c.fillRect(0, 900, Wd, 450);
    c.fillStyle = '#fffdf2'; c.strokeStyle = '#2c4aa0'; c.lineWidth = 10;
    rr(c, 90, 90, Wd - 180, Ht - 330, 22); c.fill(); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#2c4aa0'; c.font = 'bold 66px ' + FONT; c.fillText('体力測定 記録用紙', Wd / 2, 210);
    c.fillRect(150, 240, Wd - 300, 6);
    c.fillStyle = '#55608a'; c.font = '48px ' + FONT; c.textAlign = 'left'; c.fillText('種目', 160, 330);
    c.textAlign = 'right'; c.fillStyle = '#2b2b3a'; c.font = 'bold 54px ' + FONT; c.fillText('反復横とび', Wd - 160, 330);
    c.textAlign = 'left'; c.fillStyle = '#55608a'; c.font = 'bold 52px ' + FONT; c.fillText('記録', 160, 520);
    c.textAlign = 'right'; c.fillStyle = '#d2382f'; c.font = '900 200px ' + FONT; c.fillText(fmt(r.rec), Wd - 260, 560);
    c.fillStyle = '#55608a'; c.font = 'bold 58px ' + FONT; c.fillText('回', Wd - 160, 560);
    // 判定の判子
    c.save(); c.translate(Wd - 230, 360); c.rotate(-0.25);
    c.strokeStyle = '#d2382f'; c.fillStyle = '#d2382f'; c.lineWidth = 12;
    c.beginPath(); c.arc(0, 0, 112, 0, 6.283); c.stroke();
    c.textAlign = 'center'; c.font = '900 ' + (r.judge.length > 1 ? 40 : 110) + 'px ' + FONT;
    if (r.judge.length > 3) { c.fillText(r.judge.slice(0, 3), 0, -6); c.fillText(r.judge.slice(3), 0, 40); }
    else c.fillText(r.judge, 0, r.judge.length > 1 ? 14 : 38);
    c.restore();
    const rows = [['本当の回数', fmt(r.steps) + ' 回'], ['最高の分身', fmt(r.maxN) + ' 人'], ['転んだ回数', fmt(r.trips) + ' 回']];
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
