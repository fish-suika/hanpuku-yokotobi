// ===== 描画（Canvas 2D。単位は「遊ぶ場所の幅 = 100」）=====
const $ = id => document.getElementById(id);
const cv = $('cv');
let cx = cv.getContext('2d');   // 静かな背景を 1 枚の画像に描くときだけ、一時的に別の canvas に差し替える（42-venues-art.js）
const FONT = EN ? '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI","Hiragino Maru Gothic ProN","Yu Gothic UI",sans-serif' : '"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';
let W = 0, H = 0, DPR = 1, U = 1, OX = 0, OY = 0;
let EX0 = 0, EX1 = 100, EY0 = 0, EY1 = 177.78;   // 画面いっぱいの範囲（遊ぶ場所の単位で）
let nowT = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sw = Math.min(W, H * 9 / 16);
  U = sw / 100; OX = (W - sw) / 2; OY = (H - sw * 16 / 9) / 2;
  EX0 = -OX / U; EX1 = 100 + OX / U; EY0 = -OY / U; EY1 = 177.78 + OY / U;
  LANES = lanesFor(EX1 - EX0, LS);
}

// ---- 横画面：同じ体育館に、ならんだレーン（右左左右の 3 本線のセット）を横にも並べ、分身は奥だけでなく横にも並ぶ ----
// 縦画面（幅 100）では 1 レーン＝今までどおり。横に広いほどレーンが増える（16:9 で 5 レーン）。本人はまん中のレーン。数え方は 15-venues.js
let LANES = 1;
const SLOTS = { n: 0, list: [] };
function slotOf(k) {   // 分身 k（1 から）が立つ場所 {z 奥行き, lane レーン番号, wx レーンの中でのずれ}
  if (SLOTS.n !== LANES) { SLOTS.n = LANES; SLOTS.list = buildSlots(LANES, CL.length - 1); }
  return SLOTS.list[k - 1];
}
function crowdZ0() { return LANES === 1 ? 18 : Math.max(11, slotOf(CL.length - 1).z + 2.5); }

// 床の遠近。z は奥行き（0 が本人）
const YH = 62, Y0 = 140, LS = 26, KS = 1.12;
const sOf = z => 1 / (1 + 0.13 * z);
const yOf = s => YH + (Y0 - YH) * s;
const xOf = (wx, s) => 50 + wx * LS * s;
const easeOut = p => 1 - (1 - p) * (1 - p);

// ---- 演出の状態 ----
const popups = [], smoke = [], hist = [];
let hudPop = 0, flash = 0, shakeT = 0, tripAt = -99, lvlShown = 0, bubbleT = 0;
let rivalPassed = false, rivalPassAt = -99;   // 測定中にライバルの記録を超えたか
let crowdAmt = 0;   // 奥の人だかりの量（0〜1）。分身が 48 人を超えると出てくる
const CL = [];   // 分身 k=1..47 の見た目の状態
for (let k = 0; k < 48; k++) CL.push({ app: 0 });

function addPopup(text, x, y, size, color, life, rise, outline) {
  popups.push({ text, x, y, size, color, life: 0, max: life, rise, outline: outline || '#fff' });
}

// ---- 小道具 ----
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function txt(s, x, y, size, fill, o) {
  o = o || {};
  cx.font = (o.weight || 'bold') + ' ' + size + 'px ' + FONT;
  cx.textAlign = o.align || 'center'; cx.textBaseline = 'middle';
  if (o.stroke) { cx.lineJoin = 'round'; cx.lineWidth = o.sw || size * 0.18; cx.strokeStyle = o.stroke; cx.strokeText(s, x, y); }
  cx.fillStyle = fill; cx.fillText(s, x, y);
}

// 本人の位置の履歴（分身は少し遅れて同じ動きをする）
function histX(tt) {
  for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= tt) return hist[i].x;
  return hist.length ? hist[0].x : 0;
}
function pushHist() {
  hist.push({ t: nowT, x: Game.xv });
  while (hist.length > 2 && hist[1].t < nowT - 2) hist.shift();
}

// ---- 人（体操服の生徒）。x,y は足元の真ん中、s は大きさ ----
function drawKid(c, x, y, s, o) {
  o = o || {};
  const lean = o.lean || 0, hop = o.hop || 0, fall = o.fall || 0, sit = o.sit || 0, face = o.face || 0;
  c.save();
  c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(70,45,10,.22)';
  c.beginPath(); c.ellipse(0, 0.6, 7 - hop * 2.2, 2.1, 0, 0, 6.283); c.fill();
  c.translate(0, -hop * 5.5 - (o.bob || 0));
  c.rotate(fall * 1.42 * (o.fallDir || 1));
  c.scale(1, 1 - 0.38 * sit);

  const skin = o.skin || '#f3c8a0', hair = o.hair || '#3a2a22';
  const sp = 2.4 + Math.min(1, Math.abs(lean)) * 4.6;
  // 足
  c.strokeStyle = o.legs || skin; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, -11.5); c.lineTo(-sp, -0.8); c.moveTo(2, -11.5); c.lineTo(sp, -0.8); c.stroke();
  c.fillStyle = '#fff'; c.strokeStyle = '#d33'; c.lineWidth = 0.5;
  for (const sx of [-sp, sp]) { c.beginPath(); c.ellipse(sx, -0.5, 2.7, 1.3, 0, 0, 6.283); c.fill(); c.stroke(); }
  // 短パン・体操服
  c.fillStyle = o.shorts || '#2c4aa0'; rr(c, -5.3, -15.5, 10.6, 5.6, 1.6); c.fill();
  c.fillStyle = o.shirt || '#ffffff'; c.strokeStyle = '#c9d0e4'; c.lineWidth = 0.5;
  rr(c, -5.6, -25.4, 11.2, 11.4, 3); c.fill(); c.stroke();
  c.fillStyle = o.collar || '#2c4aa0'; c.fillRect(-3.2, -25.5, 6.4, 1.1);
  c.fillStyle = '#fff'; c.strokeStyle = '#9aa7d0'; c.lineWidth = 0.35; c.fillRect(-2.6, -21.6, 5.2, 3.6); c.strokeRect(-2.6, -21.6, 5.2, 3.6);   // ゼッケン
  // 腕
  c.strokeStyle = o.arm || skin; c.lineWidth = 2.5;
  const sw = Math.min(1, 0.3 + Math.abs(lean)) * Math.sin((o.ph || 0));
  c.beginPath();
  if (o.cheer) {   // 万歳
    const b = Math.sin((o.ph || 0)) * 2;
    c.moveTo(-5.2, -23.5); c.lineTo(-8.5, -31 - b); c.moveTo(5.2, -23.5); c.lineTo(8.5, -31 + b);
  } else if (o.point) {   // 正しい側を指さす
    c.moveTo(-5.2, -23.5); c.lineTo(-8.5, -17);
    c.moveTo(5.2, -23.5); c.lineTo(5.2 + o.point * 9, -26.5);
    if (o.point < 0) { c.moveTo(-5.2, -23.5); c.lineTo(-14, -26.5); c.moveTo(5.2, -23.5); c.lineTo(8.5, -17); }
  } else {
    c.moveTo(-5.2, -23.5); c.lineTo(-8.8 - sw * 2.5, -16.5 - hop * 5 - sw * 3);
    c.moveTo(5.2, -23.5); c.lineTo(8.8 + sw * 2.5, -16.5 - hop * 5 + sw * 3);
  }
  c.stroke();
  // 頭
  const hy = -30.2;
  c.fillStyle = skin; c.beginPath(); c.arc(0, hy, 5.6, 0, 6.283); c.fill();
  c.fillStyle = hair; c.beginPath(); c.arc(0, hy - 0.4, 5.9, Math.PI * 1.0, Math.PI * 2.0); c.closePath(); c.fill();
  if (o.band !== false) { c.fillStyle = '#e03030'; c.fillRect(-5.7, hy - 2.7, 11.4, 1.7); }
  // 顔
  c.strokeStyle = '#3a2a22'; c.fillStyle = '#3a2a22'; c.lineWidth = 0.6; c.lineCap = 'round';
  if (fall > 0.35) {   // 目を回す
    for (const ex of [-2.2, 2.2]) { c.beginPath(); c.moveTo(ex - 0.9, hy - 0.2); c.lineTo(ex + 0.9, hy + 1.6); c.moveTo(ex + 0.9, hy - 0.2); c.lineTo(ex - 0.9, hy + 1.6); c.stroke(); }
    c.beginPath(); c.arc(0, hy + 3.3, 0.9, 0, 6.283); c.stroke();
  } else {
    c.beginPath(); c.arc(-2.2, hy + 0.9, 0.7, 0, 6.283); c.arc(2.2, hy + 0.9, 0.7, 0, 6.283); c.fill();
    if (face >= 3) {   // 真顔・必死
      c.beginPath(); c.moveTo(-3.6, hy - 0.3); c.lineTo(-1.1, hy + 0.2); c.moveTo(3.6, hy - 0.3); c.lineTo(1.1, hy + 0.2); c.stroke();
    }
    c.beginPath();
    if (o.cheer || face === 0) { c.arc(0, hy + 2.6, 1.5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (face >= 5) { c.moveTo(-1.6, hy + 3.2); c.lineTo(1.6, hy + 3.2); c.stroke(); }
    else if (face >= 3) { c.moveTo(-1.5, hy + 3.2); c.lineTo(1.5, hy + 3.2); c.stroke(); }
    else { c.arc(0, hy + 3.1, 0.8, 0, 6.283); c.stroke(); }
    if (o.cheer) { c.fillStyle = '#c44'; c.beginPath(); c.arc(0, hy + 3.2, 1.2, 0, 3.1416); c.fill(); }
  }
  if (face >= 2 || fall > 0.1) {   // 汗
    c.fillStyle = '#7ad0ff'; c.beginPath(); c.moveTo(6.4, hy - 2.5); c.quadraticCurveTo(8.4, hy + 0.5, 6.4, hy + 1.2); c.quadraticCurveTo(4.5, hy + 0.5, 6.4, hy - 2.5); c.fill();
  }
  c.restore();
}

// ---- 会場の背景は 42-venues-art.js（drawVenue）----

// 床のテープ線 3 本（手前へ広がる）。次に跳ぶ線をうっすら光らせる
function lineQuad(wx, w0, s0, s1) {
  cx.beginPath();
  cx.moveTo(xOf(wx, s0) - w0 * s0, yOf(s0)); cx.lineTo(xOf(wx, s0) + w0 * s0, yOf(s0));
  cx.lineTo(xOf(wx, s1) + w0 * s1, yOf(s1)); cx.lineTo(xOf(wx, s1) - w0 * s1, yOf(s1));
  cx.closePath();
}
function drawLines() {
  const sMax = (EY1 - YH) / (Y0 - YH) + 0.05;
  const glow = (Game.mode === 'play' && Game.stun <= 0) ? Game.nextLines() : [];
  const pulse = 0.5 + 0.5 * Math.sin(nowT * 9);
  const title = App.screen === 'title';
  for (const lane of laneOrder(LANES)) {
    // 本人のレーンはいつも。となりのレーンは、そこに分身が出てきたぶんだけ現れる
    let amt = lane === 0 ? 1 : 0;
    if (lane !== 0) for (let k = 1; k < CL.length; k++) if (slotOf(k).lane === lane && CL[k].app > amt) amt = CL[k].app;
    if (amt <= 0.01 || title) continue;
    cx.save(); cx.globalAlpha = Math.min(1, amt * 1.5) * (lane === 0 ? 1 : 0.8);
    for (let i = 0; i < 3; i++) {
      const wx = lane * LANE_W + i - 1, on = lane === 0 && glow.indexOf(i) >= 0;
      if (on) {
        cx.fillStyle = 'rgba(255,240,90,' + (0.22 + 0.2 * pulse) + ')';
        lineQuad(wx, 4.2, 0.02, sMax); cx.fill();
        cx.fillStyle = 'rgba(255,255,170,' + (0.25 + 0.25 * pulse) + ')';
        lineQuad(wx, 2.4, 0.02, sMax); cx.fill();
      }
      cx.fillStyle = on ? '#fffbe0' : '#fbfbf5';
      lineQuad(wx, 0.85, 0.02, sMax); cx.fill();
      cx.fillStyle = 'rgba(0,0,0,.08)';
      lineQuad(wx, 0.3, 0.02, sMax); cx.fill();
    }
    cx.restore();
  }
}

// ---- タイトルの絵：記録板なし。体育館のまえに、体操服の分身がずらりと並んで、波のように反復横とびをしている ----
function drawTitleScene() {
  const t = nowT, wide = EX1 - EX0, mid = (EX0 + EX1) / 2;
  const g = cx.createLinearGradient(0, EY0, 0, 72);   // 上は少し暗くして、ロゴを読みやすく
  g.addColorStop(0, 'rgba(14,24,66,.62)'); g.addColorStop(1, 'rgba(14,24,66,0)');
  cx.fillStyle = g; cx.fillRect(EX0 - 5, EY0 - 5, wide + 10, 72 - EY0 + 5);
  const rows = [[6, 1.3, 0.2], [3, 0.7, 0.5], [0, 0, 0]];   // [奥行き z, 波のずれ, 列のずらし]
  rows.forEach(([z, ph0, off], ri) => {
    const s = sOf(z), y = z === 0 ? Y0 : yOf(s), gap = 19 * s + 1;
    let n = Math.min(15, Math.floor((wide - 14) / gap) + 1); if (n % 2 === 0) n--;
    for (let i = 0; i < n; i++) {
      const ph = t * 2.3 - i * 0.55 + ph0, x = mid + (i - (n - 1) / 2) * gap + off * gap + Math.sin(ph) * 5 * s;
      if (x < EX0 - 12 || x > EX1 + 12) continue;
      const c = Math.cos(ph);
      drawKid(cx, x, y, s * KS, { lean: clamp(c * 0.8, -1, 1), hop: Math.abs(c) * 0.5, ph: t * 9 + i * 1.7, face: 0, alpha: 0.78 + 0.22 * s });
    }
  });
}

// ---- 見ている人たち ----
// min=その段階から出てくる。x,y は足元、col は体操服の色
const SP = [
  { x: 24, y: 83, min: 3, col: '#f2a43a', hair: '#5a3a22' }, { x: 77, y: 84, min: 3, col: '#58b0e0', hair: '#222' },
  { x: 14, y: 88, min: 3, col: '#e86a9a', hair: '#3a2a22' }, { x: 87, y: 89, min: 3, col: '#7ac45a', hair: '#6a4a2a' },
  { x: 32, y: 76, min: 4, col: '#f2a43a', hair: '#222' }, { x: 69, y: 77, min: 4, col: '#e86a9a', hair: '#5a3a22' },
  { x: 5, y: 82, min: 4, col: '#58b0e0', hair: '#3a2a22' }, { x: 96, y: 81, min: 4, col: '#f2a43a', hair: '#222' },
  { x: 8, y: 92, min: 5, col: '#3a8f5a', hair: '#777', teacher: true }, { x: 92, y: 93, min: 5, col: '#8a5ad0', hair: '#222' },
  { x: -8, y: 84, min: 5, col: '#e04a4a', hair: '#3a2a22' }, { x: 108, y: 85, min: 5, col: '#58b0e0', hair: '#5a3a22' },
  { x: -18, y: 90, min: 6, col: '#f2a43a', hair: '#222' }, { x: 118, y: 91, min: 6, col: '#e86a9a', hair: '#3a2a22' },
  { x: -30, y: 82, min: 6, col: '#7ac45a', hair: '#222' }, { x: 130, y: 83, min: 6, col: '#8a5ad0', hair: '#5a3a22' },
  { x: -44, y: 88, min: 6, col: '#58b0e0', hair: '#3a2a22' }, { x: 144, y: 89, min: 6, col: '#e04a4a', hair: '#222' },
  { x: -60, y: 84, min: 6, col: '#f2a43a', hair: '#5a3a22' }, { x: 160, y: 85, min: 6, col: '#7ac45a', hair: '#222' },
];
SP.forEach((p, i) => { p.app = 0; p.ph = i * 1.7; });

function drawSpectators() {
  const lv = Game.lvl, V = curVenue(), C = V.crowd;
  for (let i = 0; i < SP.length; i++) {
    const p = SP[i];
    if (p.app <= 0.01) continue;
    const s = (p.y - YH) / (Y0 - YH) * 1.15;
    const g = V.lowG ? 1.7 : 1;   // 月面：ふわっと高く弾む（見た目だけ）
    const bounce = (lv >= 4 ? Math.abs(Math.sin(nowT * 7 / g + p.ph)) * 1.6 * g : lv >= 3 ? Math.abs(Math.sin(nowT * 3 + p.ph)) * 0.5 : 0);
    const col = C.type === 'kid' ? p.col : C.shirts[i % C.shirts.length];
    const sc = s * (0.6 + 0.4 * easeOut(Math.min(1, p.app))), al = Math.min(1, p.app * 1.5);
    if (C.type === 'astro') drawAstro(cx, p.x, p.y, sc, { alpha: al, cheer: lv >= 4, ph: nowT * 7 + p.ph, bob: bounce, col, vis: i % 3 });
    else if (C.type === 'alien') drawAlien(cx, p.x, p.y, sc, { alpha: al, cheer: lv >= 4, ph: nowT * 7 + p.ph, bob: bounce, col, eyes: 1 + (i % 3), horn: i % 2 });
    else drawKid(cx, p.x, p.y, sc, {
      shirt: col, shorts: C.pants, hair: p.hair, collar: C.type === 'kid' ? '#fff' : col, band: false, alpha: al,
      cheer: lv >= 4, ph: nowT * 7 + p.ph, bob: bounce, face: 0, legs: C.type === 'kid' ? null : C.pants, arm: C.type === 'kid' ? null : col,
    });
    if (C.whistle && p.teacher && p.app > 0.6) {   // 先生は笛
      cx.fillStyle = '#e8c030'; cx.beginPath(); cx.arc(p.x + 0.8 * s, p.y - 23 * s, 0.9 * s, 0, 6.283); cx.fill();
    }
  }
}

// ---- 本人と分身 ----
function fallAmt(delay, isPlayer) {
  if (isPlayer) {
    if (Game.stun <= 0) return 0;
    const el = CFG.stunSecs - Game.stun;
    return clamp(el / 0.07, 0, 1) * clamp(Game.stun / 0.1, 0, 1);
  }
  const tt = nowT - tripAt - delay;
  if (tt < 0 || tt > 0.12 + 0.22 + 0.2) return 0;
  return clamp(tt / 0.12, 0, 1) * clamp((0.12 + 0.22 + 0.2 - tt) / 0.2, 0, 1);
}

function bodyOpts(tt, k, isPlayer, finishing) {
  const x = histX(tt), xp = histX(tt - 0.05);
  const sp = (x - xp) / 0.05;
  return { x, lean: clamp(sp / 14, -1, 1), hop: finishing ? 0 : clamp(Math.abs(sp) / 22, 0, 1) * (curVenue().lowG ? 1.7 : 1) };   // 月面は弧がふわっと高い（見た目だけ）
}

function drawBodies() {
  const lv = Game.lvl, N = CFG.bodies[lv];
  const finishing = Game.mode === 'finish' || Game.mode === 'over';
  const sit = finishing ? clamp(Game.finT / 0.35 + (Game.mode === 'over' ? 1 : 0), 0, 1) : 0;
  const breath = finishing ? Math.sin(nowT * 9) * 0.5 : 0;
  const face = finishing ? 4 : Math.min(lv + 1, 6) * (Game.mode === 'play' ? 1 : 0);
  const ph = nowT * 14;
  // 分身（奥から手前へ）
  const list = [];
  for (let k = 1; k < CL.length; k++) if (CL[k].app > 0.01) list.push(k);
  list.sort((a, b) => slotOf(b).z - slotOf(a).z || b - a);   // 奥（z が大きい）から
  const px = xOf(Game.xv, 1);
  for (const k of list) {
    const sl = slotOf(k), z = sl.z;
    const s = sOf(z), a = CL[k].app, ea = easeOut(Math.min(1, a));
    const d = k * CFG.cloneDelay;
    const o = bodyOpts(nowT - d, k, false, finishing);
    const slotX = xOf(o.x + sl.wx + sl.lane * LANE_W, s), slotY = yOf(s);
    const x = px + (slotX - px) * ea, y = Y0 + (slotY - Y0) * ea;
    const fa = fallAmt(z * 0.02, false);
    drawKid(cx, x, y, s * KS * (0.7 + 0.3 * ea), {
      lean: o.lean, hop: o.hop, ph: ph + k, fall: fa, fallDir: k % 2 ? 1 : -1, sit, bob: breath,
      alpha: Math.min(1, a * 1.4) * (0.9 - Math.min(0.25, z * 0.02)), face: finishing ? 4 : face,
    });
  }
  // 本人の残像（段階1から）
  const o = bodyOpts(nowT, 0, true, finishing);
  const px2 = xOf(o.x, 1);
  if (lv >= 1 && Game.mode === 'play') {
    const gn = lv >= 2 ? 3 : 2;
    for (let i = gn; i >= 1; i--) {
      const gx = xOf(histX(nowT - i * 0.035), 1);
      if (Math.abs(gx - px2) < 0.8) continue;
      drawKid(cx, gx, Y0, KS, { lean: o.lean, hop: o.hop, ph, alpha: 0.2 * (gn - i + 1) / gn, face });
    }
  }
  const pf = fallAmt(0, true);
  let point = 0;
  if (pf > 0.2) { const w = Game.nextSides(); if (w.length === 1) point = w[0]; }
  drawKid(cx, px2, Y0, KS, { lean: o.lean, hop: o.hop, ph, fall: pf, fallDir: -Game.lastSide || 1, sit, bob: breath, face, point });
}

// ---- 人だかり：分身が 48 人を超えたら、手前の 47 人はそのまま描き、奥へ小さな人の列を足す（描く数に上限）----
function crowdTarget() {
  const lv = Game.mode === 'play' ? Game.lvl : (Game.mode === 'finish' || Game.mode === 'over' ? lvlShown : 0);
  const N = CFG.bodies[lv] || 1;
  return N > 48 ? clamp(Math.log(N / 48) / Math.log(20000 / 48), 0.05, 1) : 0;
}
function drawCrowd() {
  if (crowdAmt < 0.01) return;
  const rows = 4 + Math.round(crowdAmt * 9), maxPer = 22 + Math.round(crowdAmt * 16), fill = 0.4 + 0.6 * crowdAmt;
  const wide = EX1 - EX0 + 24;
  cx.save(); cx.globalAlpha = 0.9 * Math.min(1, crowdAmt * 8);
  for (let r = rows - 1; r >= 0; r--) {   // 奥の列から
    const z = crowdZ0() + r * 3.2, s = sOf(z), y = yOf(s), sc = s * KS * 1.25;
    const step = Math.max(8 * sc, wide / maxPer), n = Math.floor(wide / step);
    const shift = histX(nowT - (48 + r * 6) * CFG.cloneDelay) * LS * s;   // 本人の動きに少し遅れてついていく
    const x0 = EX0 - 12 + (r % 2 ? step * 0.5 : 0) + shift;
    const dots = [];
    for (let i = 0; i < n; i++) {
      if (((i * 37 + r * 91) % 100) / 100 > fill) continue;
      dots.push(x0 + i * step, y - Math.abs(Math.sin(nowT * 9 + i * 1.3 + r)) * 2.2 * sc);
    }
    const part = (col, f) => { cx.fillStyle = col; cx.beginPath(); for (let k = 0; k < dots.length; k += 2) f(dots[k], dots[k + 1]); cx.fill(); };
    part('#f3c8a0', (x, yy) => { cx.rect(x - 3.6 * sc, yy - 10 * sc, 2.4 * sc, 10 * sc); cx.rect(x + 1.2 * sc, yy - 10 * sc, 2.4 * sc, 10 * sc); });
    part('#2c4aa0', (x, yy) => cx.rect(x - 5.3 * sc, yy - 15.5 * sc, 10.6 * sc, 5.6 * sc));
    part(r % 2 ? '#e4eaff' : '#ffffff', (x, yy) => cx.rect(x - 5.6 * sc, yy - 25.4 * sc, 11.2 * sc, 11.4 * sc));
    part('#f3c8a0', (x, yy) => { cx.moveTo(x + 5.6 * sc, yy - 30.2 * sc); cx.arc(x, yy - 30.2 * sc, 5.6 * sc, 0, 6.283); });
    part('#3a2a22', (x, yy) => { cx.moveTo(x + 5.9 * sc, yy - 30.6 * sc); cx.arc(x, yy - 30.6 * sc, 5.9 * sc, Math.PI, 6.283); });
  }
  cx.restore();
}
function drawCount() {   // 分身の人数を数字でも見せる
  const lv = Game.mode === 'play' ? Game.lvl : (Game.mode === 'finish' || Game.mode === 'over' ? lvlShown : 0);
  const N = CFG.bodies[lv] || 1;
  if (N < 8 || App.screen === 'result') return;
  fitTxt(STR.hud.bodies(fmtNum(N)), 50, 66, 6.6, 64, '#d2382f', { stroke: '#fff', sw: 1.3 });
}

// ---- 背景の効果 ----
function drawRays() {
  const lv = Game.lvl;
  if (lv < 5 || Game.mode !== 'play') return;
  const a = lv >= 6 ? 0.2 : 0.11;
  const cxp = xOf(Game.xv, 1), cyp = 118, n = 18, rot = nowT * (lv >= 6 ? 0.9 : 0.4);
  cx.save(); cx.translate(cxp, cyp);
  cx.fillStyle = 'rgba(255,236,120,' + a + ')';
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * Math.PI * 2 / n, a1 = a0 + Math.PI / n;
    cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(a0) * 400, Math.sin(a0) * 400); cx.lineTo(Math.cos(a1) * 400, Math.sin(a1) * 400); cx.closePath(); cx.fill();
  }
  cx.restore();
}
function drawSmoke() {
  const k = curVenue().kind, rgb = k === 'moon' ? '188,188,200' : k === 'space' ? '150,225,255' : '250,250,250';   // 月面はほこり、宇宙は光のつぶ
  for (const p of smoke) {
    const q = p.life / p.max;
    cx.fillStyle = 'rgba(' + rgb + ',' + (0.55 * (1 - q)) + ')';
    cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.6 + q * 1.6), 0, 6.283); cx.fill();
  }
}

// ---- 画面上のしるし（記録・時間・記録係）----
function drawHud() {   // 横画面は記録板を少し大きく（画面が広いぶん、文字が小さく見えないように）
  cx.save();
  if (LANES > 1) { cx.translate(50, 0); cx.scale(1.3, 1.3); cx.translate(-50, 0); }
  drawHudBody();
  cx.restore();
}
function drawHudBody() {
  const play = Game.mode === 'play', lv = Game.lvl;
  // 記録板
  cx.fillStyle = '#0003'; rr(cx, 3, 3.8, 94, 35, 3); cx.fill();
  cx.fillStyle = '#fffdf2'; rr(cx, 3, 2.4, 94, 35, 3); cx.fill();
  cx.strokeStyle = '#2c4aa0'; cx.lineWidth = 0.9; rr(cx, 3, 2.4, 94, 35, 3); cx.stroke();
  drawRecorder(15, 13.5, 6.3, curVenue().recorder);
  txt(STR.hud.rec, 52, 8.6, 3.4, '#55608a');
  const pop = 1 + 0.16 * hudPop;
  cx.save(); cx.translate(52, 19.8); cx.scale(pop, pop);
  fitTxt(fmtNum(Game.rec), 0, 0, 12, 46, '#d2382f');   // 大きな数字は 万・億・兆 にして、枠に入る幅に縮める
  cx.restore();
  txt(STR.hud.real(Game.steps), 52, 27.6, 2.6, '#55608a');
  // 残り時間
  const left = Game.mode === 'title' || Game.mode === 'ready' ? CFG.duration : clamp(CFG.duration - Game.t, 0, CFG.duration);
  txt(STR.hud.left, 85, 8.6, 3.4, '#55608a');
  txt(String(Math.ceil(left - 1e-9)), 85, 19.8, 12, left <= 5 && play ? '#e03030' : '#2c4aa0');
  // 時間の帯
  cx.fillStyle = '#dde3f3'; rr(cx, 6, 34.7, 88, 1.5, 0.75); cx.fill();
  cx.fillStyle = left <= 5 ? '#e03030' : '#2c9a6a'; rr(cx, 6, 34.7, Math.max(1.5, 88 * left / CFG.duration), 1.5, 0.75); cx.fill();
  // 記録係のひとこと
  const VS = STR.venues[venueIdx()];
  let b = VS.rec[Math.min(lv, VS.rec.length - 1)];
  if (Game.mode === 'finish') b = VS.fin;
  else if (Game.mode === 'over') b = VS.over(fmt(Game.rec));
  else if (Game.mode === 'title' || Game.mode === 'ready') b = VS.ready;
  fitTxt(b, 52, 31.8, 2.8, 66, '#2b2b3a');
}

// 文字が枠に入りきらないときは、その幅に縮める
function fitTxt(s, x, y, size, maxW, fill, o) {
  cx.font = 'bold ' + size + 'px ' + FONT;
  const w = cx.measureText(s).width;
  txt(s, x, y, w > maxW ? size * maxW / w : size, fill, o);
}
// ライバルの札：記録板の下、右の端。記録に合わせて下から色が満ち、超えると金色になる
function drawRival() {
  const i = App.idx, R = STR.tournaments[i].rival, tg = CFG.targets[i];
  const passed = rivalPassed, prog = clamp(Game.rec / tg, 0, 1);
  const w = 18, h = 13.2, q = clamp((nowT - rivalPassAt) / 0.6, 0, 1);
  const sc = passed && q < 1 ? 1 + 0.25 * Math.sin(q * Math.PI) : 1;
  const k = LANES > 1 ? 1.5 : 1, rx = LANES > 1 ? EX1 - w * k - 5 : 79, ry = LANES > 1 ? 5 : 40;   // 横画面：画面の右上すみに、少し大きく
  cx.save(); cx.translate(rx + w * k / 2, ry + h * k / 2); cx.scale(sc * k, sc * k); cx.translate(-w / 2, -h / 2);
  cx.fillStyle = '#0002'; rr(cx, 0, 0.7, w, h, 1.6); cx.fill();
  cx.fillStyle = 'rgba(255,253,242,.94)'; rr(cx, 0, 0, w, h, 1.6); cx.fill();
  cx.save(); rr(cx, 0, 0, w, h, 1.6); cx.clip();
  cx.fillStyle = passed ? 'rgba(246,200,76,.85)' : 'rgba(150,175,235,.45)';
  cx.fillRect(0, h * (1 - prog), w, h * prog);
  cx.restore();
  cx.strokeStyle = passed ? '#c98a10' : '#2c4aa0'; cx.lineWidth = 0.5; rr(cx, 0, 0, w, h, 1.6); cx.stroke();
  txt(passed ? STR.hud.passed : STR.hud.vs, w / 2, 2.4, 2.1, passed ? '#8a5a00' : '#55608a');
  fitTxt(R.short, w / 2, 5.9, 2.9, w - 2, '#2b2b3a');
  fitTxt(fmt(tg), w / 2, 10, 3.8, w - 2, passed ? '#8a5a00' : '#d2382f');
  cx.restore();
}

function drawPopups() {
  for (const p of popups) {
    const q = p.life / p.max;
    const sc = 1 + 0.35 * (1 - Math.min(1, p.life / 0.12));
    cx.save(); cx.globalAlpha = clamp(1 - Math.pow(q, 3), 0, 1);
    cx.translate(p.x, p.y - p.rise * q); cx.scale(sc, sc);
    txt(p.text, 0, 0, p.size, p.color, { stroke: p.outline, sw: p.size * 0.2 });
    cx.restore();
  }
}

function render() {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.fillStyle = curVenue().bg; cx.fillRect(0, 0, cv.width, cv.height);
  if (App.screen === 'ending') { cx.setTransform(DPR * U, 0, 0, DPR * U, DPR * OX, DPR * OY); drawEndingScene(); return; }
  const lv = Game.mode === 'play' ? Game.lvl : 0;
  const amp = lv >= 6 ? 0.9 : lv >= 5 ? 0.5 : lv >= 4 ? 0.22 : 0;
  const shx = amp ? (Math.random() - 0.5) * 2 * amp + (shakeT > 0 ? (Math.random() - 0.5) * shakeT * 6 : 0) : (shakeT > 0 ? (Math.random() - 0.5) * shakeT * 6 : 0);
  const shy = amp ? (Math.random() - 0.5) * 2 * amp : 0;
  cx.setTransform(DPR * U, 0, 0, DPR * U, DPR * (OX + shx * U), DPR * (OY + shy * U));
  drawVenue();
  drawLines();
  if (App.screen === 'title') { drawTitleScene(); } else {
  drawRays();
  drawCrowd();
  drawSpectators();
  drawBodies();
  drawSmoke();
  }
  cx.setTransform(DPR * U, 0, 0, DPR * U, DPR * OX, DPR * OY);
  if (App.screen !== 'result' && App.screen !== 'title') drawHud();   // 記録用紙のあいだは、記録板をひっこめる。タイトルは記録板なしの絵
  if (App.screen === 'play') drawCount();
  if (App.screen === 'play') drawRival();
  drawPopups();
  if (Game.mode === 'ready') {
    const q = Game.readyT / CFG.readySecs;
    txt(STR.hud.ready, 50, 100, 16 + 2 * Math.sin(q * 6), '#fff', { stroke: '#213a86', sw: 3 });
  }
  if (flash > 0) {
    cx.fillStyle = 'rgba(255,255,255,' + flash * 0.9 + ')';
    cx.fillRect(EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10);
  }
}

// 毎フレームの見た目の更新
function updateVisual(dt) {
  pushHist();
  const N = CFG.bodies[Game.lvl];
  crowdAmt += (crowdTarget() - crowdAmt) * Math.min(1, dt * 3);
  if (crowdAmt < 0.005) crowdAmt = 0;
  for (let k = 1; k < CL.length; k++) {
    const c = CL[k];
    if (k < N) c.app = Math.min(1, c.app + dt * 4.5);
    else {
      // 転んだときは、倒れてから消える（手前から順に）。ゆっくり減速したときは、そのままふっと消える
      const z = slotOf(k).z || 1;
      const falling = nowT - tripAt < 0.12 + z * 0.02 + 0.1;
      if (!falling) c.app = Math.max(0, c.app - dt * 3.2);
    }
  }
  const lv = Game.mode === 'play' ? Game.lvl : (Game.mode === 'finish' || Game.mode === 'over' ? lvlShown : 0);
  for (const p of SP) p.app = clamp(p.app + (lv >= p.min ? dt * 2.2 : -dt * 3), 0, 1.2);
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].life += dt; if (popups[i].life >= popups[i].max) popups.splice(i, 1); }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life >= p.max) smoke.splice(i, 1);
  }
  hudPop = Math.max(0, hudPop - dt * 6); flash = Math.max(0, flash - dt * 2.2); shakeT = Math.max(0, shakeT - dt);
}
function puffSmoke(n) {
  const px = xOf(Game.xv, 1);
  for (let i = 0; i < n; i++) {
    const g = curVenue().lowG ? 0.45 : 1;   // 月面：ほこりがゆっくり舞って、長く残る
    smoke.push({ x: px + (Math.random() - 0.5) * 16, y: Y0 - 1 - Math.random() * 3, vx: (Math.random() - 0.5) * 6 * g, vy: (-6 - Math.random() * 9) * g, r: 1.6 + Math.random() * 1.6, life: 0, max: (0.6 + Math.random() * 0.4) / g });
  }
}
