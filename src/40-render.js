// ===== 描画（Canvas 2D。単位は「遊ぶ場所の幅 = 100」）=====
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
const FONT = '"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';
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
}

// 床の遠近。z は奥行き（0 が本人）
const YH = 62, Y0 = 140, LS = 26, KS = 1.12;
const sOf = z => 1 / (1 + 0.13 * z);
const yOf = s => YH + (Y0 - YH) * s;
const xOf = (wx, s) => 50 + wx * LS * s;
const easeOut = p => 1 - (1 - p) * (1 - p);

// ---- 演出の状態 ----
const popups = [], smoke = [], hist = [];
let hudPop = 0, flash = 0, shakeT = 0, tripAt = -99, lvlShown = 0, bubbleT = 0;
const CL = [];   // 分身 k=1..31 の見た目の状態
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
  c.strokeStyle = skin; c.lineWidth = 3; c.lineCap = 'round';
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
  c.strokeStyle = skin; c.lineWidth = 2.5;
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

// ---- 体育館 ----
function drawGym() {
  const lv = Game.lvl;
  // 壁
  let g = cx.createLinearGradient(0, EY0, 0, YH);
  g.addColorStop(0, '#f6efd6'); g.addColorStop(1, '#eadcb4');
  cx.fillStyle = g; cx.fillRect(EX0 - 5, EY0 - 5, EX1 - EX0 + 10, YH - EY0 + 5);
  // 窓（4段階以上でガタガタ）
  const rat = lv >= 4 ? Math.sin(nowT * 70) * (lv >= 6 ? 0.55 : 0.25) : 0;
  const x0 = Math.floor((EX0 - 20) / 34) * 34 + 3;
  for (let x = x0; x < EX1 + 20; x += 34) {
    const jx = rat * Math.sin(x), jy = rat * Math.cos(x * 1.3);
    cx.fillStyle = '#c8d6e6'; rr(cx, x + jx, 8 + jy, 26, 22, 1.2); cx.fill();
    cx.fillStyle = '#9fd0f2'; cx.fillRect(x + 1.5 + jx, 9.5 + jy, 23, 19);
    cx.fillStyle = '#d5ecfb'; cx.fillRect(x + 1.5 + jx, 9.5 + jy, 23, 8);
    cx.fillStyle = '#c8d6e6'; cx.fillRect(x + 12.3 + jx, 9 + jy, 1.4, 20); cx.fillRect(x + jx, 18.5 + jy, 26, 1.4);
  }
  // 腰壁
  cx.fillStyle = '#b79a62'; cx.fillRect(EX0 - 5, 52, EX1 - EX0 + 10, YH - 52);
  cx.fillStyle = '#8a6e3e'; cx.fillRect(EX0 - 5, 52, EX1 - EX0 + 10, 0.9);
  // 横断幕「体力測定」と舞台
  cx.fillStyle = '#d2382f'; rr(cx, 22, 40.5, 56, 9, 1); cx.fill();
  cx.fillStyle = '#f6c84c'; cx.fillRect(22, 40.5, 56, 0.8); cx.fillRect(22, 48.7, 56, 0.8);
  txt('体力測定', 50, 45.2, 6.2, '#fff', { stroke: '#8f221c', sw: 1.1 });
  cx.fillStyle = '#9a1f2a'; cx.fillRect(34, 50, 32, 7);   // 舞台の幕
  const fl = Math.sin(nowT * (lv >= 6 ? 14 : 2)) * (lv >= 4 ? 0.7 : 0.1);
  for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#b02a35' : '#8a1a24'; cx.fillRect(34 + i * 4 + fl * (i % 3 - 1), 50, 4, 7); }
  cx.fillStyle = '#7a5a30'; cx.fillRect(30, 57, 40, 5);
  // 床
  g = cx.createLinearGradient(0, YH, 0, EY1);
  g.addColorStop(0, '#d9b36a'); g.addColorStop(1, '#c58f45');
  cx.fillStyle = g; cx.fillRect(EX0 - 5, YH, EX1 - EX0 + 10, EY1 - YH + 5);
  // 床板（奥へ集まる筋）
  cx.strokeStyle = 'rgba(120,80,30,.16)'; cx.lineWidth = 0.25;
  cx.beginPath();
  const reach = Math.max(EX1 - EX0, 200);
  for (let i = -14; i <= 14; i++) { cx.moveTo(50, YH); cx.lineTo(50 + i * 14, YH + (EY1 - YH + 10) * 1.0 + Math.abs(i) * 0); }
  cx.stroke();
  // 床のつや
  g = cx.createRadialGradient(50, 118, 5, 50, 118, 70);
  g.addColorStop(0, 'rgba(255,245,210,.35)'); g.addColorStop(1, 'rgba(255,245,210,0)');
  cx.fillStyle = g; cx.fillRect(EX0 - 5, YH, EX1 - EX0 + 10, EY1 - YH);
  // 床と壁の境
  cx.fillStyle = 'rgba(80,50,10,.25)'; cx.fillRect(EX0 - 5, YH - 0.3, EX1 - EX0 + 10, 0.9);
}

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
  for (let i = 0; i < 3; i++) {
    const wx = i - 1;
    if (glow.indexOf(i) >= 0) {
      cx.fillStyle = 'rgba(255,240,90,' + (0.22 + 0.2 * pulse) + ')';
      lineQuad(wx, 4.2, 0.02, sMax); cx.fill();
      cx.fillStyle = 'rgba(255,255,170,' + (0.25 + 0.25 * pulse) + ')';
      lineQuad(wx, 2.4, 0.02, sMax); cx.fill();
    }
    cx.fillStyle = glow.indexOf(i) >= 0 ? '#fffbe0' : '#fbfbf5';
    lineQuad(wx, 0.85, 0.02, sMax); cx.fill();
    cx.fillStyle = 'rgba(0,0,0,.08)';
    lineQuad(wx, 0.3, 0.02, sMax); cx.fill();
  }
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
  const lv = Game.lvl;
  for (const p of SP) {
    if (p.app <= 0.01) continue;
    const s = (p.y - YH) / (Y0 - YH) * 1.15;
    const bounce = lv >= 4 ? Math.abs(Math.sin(nowT * 7 + p.ph)) * 1.6 : lv >= 3 ? Math.abs(Math.sin(nowT * 3 + p.ph)) * 0.5 : 0;
    drawKid(cx, p.x, p.y, s * (0.6 + 0.4 * easeOut(Math.min(1, p.app))), {
      shirt: p.col, shorts: '#333b4d', hair: p.hair, collar: '#fff', band: false, alpha: Math.min(1, p.app * 1.5),
      cheer: lv >= 4, ph: nowT * 7 + p.ph, bob: bounce, face: 0,
    });
    if (p.teacher && p.app > 0.6) {   // 先生は笛
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
  return { x, lean: clamp(sp / 14, -1, 1), hop: finishing ? 0 : clamp(Math.abs(sp) / 22, 0, 1) };
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
  list.sort((a, b) => b - a);   // 大きい k = 奥
  const px = xOf(Game.xv, 1);
  for (const k of list) {
    const z = 1 + Math.floor((k - 1) / 3), col = (k - 1) % 3 - 1;
    const s = sOf(z), a = CL[k].app, ea = easeOut(Math.min(1, a));
    const d = k * CFG.cloneDelay;
    const o = bodyOpts(nowT - d, k, false, finishing);
    const slotX = xOf(o.x + col * 0.3, s), slotY = yOf(s);
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
  for (const p of smoke) {
    const q = p.life / p.max;
    cx.fillStyle = 'rgba(250,250,250,' + (0.55 * (1 - q)) + ')';
    cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.6 + q * 1.6), 0, 6.283); cx.fill();
  }
}

// ---- 画面上のしるし（記録・時間・記録係）----
function recorderFace(x, y, r) {
  const lv = Game.lvl, fin = Game.mode === 'finish' || Game.mode === 'over';
  cx.fillStyle = '#f3c8a0'; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
  cx.fillStyle = '#2c4aa0'; cx.beginPath(); cx.arc(x, y - 0.5, r + 0.5, Math.PI * 1.02, Math.PI * 1.98); cx.closePath(); cx.fill();   // 帽子
  cx.fillRect(x - r - 2.2, y - 0.6, r * 2 + 4.4, 1.3);
  // 眼鏡
  cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.6; cx.fillStyle = '#fff';
  const ey = y + 1.0, big = lv >= 2 ? 2.35 : 1.8;
  cx.beginPath(); cx.arc(x - 2.6, ey, big, 0, 6.283); cx.moveTo(x + 2.6 + big, ey); cx.arc(x + 2.6, ey, big, 0, 6.283); cx.moveTo(x - 0.8, ey); cx.lineTo(x + 0.8, ey);
  cx.fill(); cx.stroke();
  cx.fillStyle = '#2b2b3a';
  const wob = lv >= 4 ? Math.sin(nowT * 40) * 0.25 : 0;
  cx.beginPath(); cx.arc(x - 2.6 + wob, ey, lv >= 2 ? 0.5 : 0.8, 0, 6.283); cx.arc(x + 2.6 + wob, ey, lv >= 2 ? 0.5 : 0.8, 0, 6.283); cx.fill();
  // 口
  cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.6; cx.beginPath();
  if (lv >= 5) { cx.fillStyle = '#7a2a2a'; cx.ellipse(x, y + 5.3, 1.6, 2.1, 0, 0, 6.283); cx.fill(); }
  else if (lv >= 2) { cx.arc(x, y + 5, 1.1, 0, 6.283); cx.stroke(); }
  else if (fin) { cx.moveTo(x - 1.4, y + 5); cx.lineTo(x + 1.4, y + 5); cx.stroke(); }
  else { cx.arc(x, y + 3.9, 1.5, 0.2 * Math.PI, 0.8 * Math.PI); cx.stroke(); }
  if (lv >= 3) {   // 汗
    cx.fillStyle = '#7ad0ff'; cx.beginPath(); cx.moveTo(x + r - 0.4, y - 2); cx.quadraticCurveTo(x + r + 1.8, y + 1.5, x + r - 0.4, y + 2.3); cx.quadraticCurveTo(x + r - 2.4, y + 1.5, x + r - 0.4, y - 2); cx.fill();
  }
  // 笛とバインダー、段階5からは電卓
  cx.fillStyle = '#e8c030'; cx.beginPath(); cx.arc(x - 3, y + 8.2, 1, 0, 6.283); cx.fill();
  if (lv >= 5) {
    cx.fillStyle = '#4a4f5c'; rr(cx, x + 1, y + 8, 7.5, 7.5, 0.8); cx.fill();
    cx.fillStyle = '#9fe3b0'; cx.fillRect(x + 1.8, y + 8.7, 5.9, 2);
    cx.fillStyle = '#e8e8e8';
    for (let i = 0; i < 6; i++) cx.fillRect(x + 1.9 + (i % 3) * 2, y + 11.6 + Math.floor(i / 3) * 1.8, 1.5, 1.1);
  } else {
    cx.fillStyle = '#8a6a3a'; rr(cx, x + 1.5, y + 8, 6.2, 7.8, 0.8); cx.fill();
    cx.fillStyle = '#fff'; cx.fillRect(x + 2.3, y + 9.2, 4.6, 6);
  }
}

const BUBBLE = ['いーち、にー…', 'は、はやっ！', 'えっ…？ にー、よん…', 'ひとが ふえてる…', 'ゆ、ゆかが…！', 'でんたく でんたく…！', 'そ、測定不能…！'];
function drawHud() {
  const play = Game.mode === 'play', lv = Game.lvl;
  // 記録板
  cx.fillStyle = '#0003'; rr(cx, 3, 3.8, 94, 35, 3); cx.fill();
  cx.fillStyle = '#fffdf2'; rr(cx, 3, 2.4, 94, 35, 3); cx.fill();
  cx.strokeStyle = '#2c4aa0'; cx.lineWidth = 0.9; rr(cx, 3, 2.4, 94, 35, 3); cx.stroke();
  recorderFace(15, 13.5, 6.3);
  txt('記録', 52, 8.6, 3.4, '#55608a');
  const pop = 1 + 0.16 * hudPop;
  cx.save(); cx.translate(52, 19.8); cx.scale(pop, pop);
  txt(String(Game.rec), 0, 0, Game.rec >= 10000 ? 9.5 : 12, '#d2382f');
  cx.restore();
  txt('ほんとうは ' + Game.steps + ' 回', 52, 27.6, 2.6, '#55608a');
  // 残り時間
  const left = Game.mode === 'title' || Game.mode === 'ready' ? CFG.duration : clamp(CFG.duration - Game.t, 0, CFG.duration);
  txt('のこり', 85, 8.6, 3.4, '#55608a');
  txt(String(Math.ceil(left - 1e-9)), 85, 19.8, 12, left <= 5 && play ? '#e03030' : '#2c4aa0');
  // 時間の帯
  cx.fillStyle = '#dde3f3'; rr(cx, 6, 34.7, 88, 1.5, 0.75); cx.fill();
  cx.fillStyle = left <= 5 ? '#e03030' : '#2c9a6a'; rr(cx, 6, 34.7, Math.max(1.5, 88 * left / CFG.duration), 1.5, 0.75); cx.fill();
  // 記録係のひとこと
  let b = BUBBLE[lv];
  if (Game.mode === 'finish') b = 'そこまで！ きろくします…';
  else if (Game.mode === 'over') b = '…' + Game.rec + ' 回です。';
  else if (Game.mode === 'title') b = 'よーい…';
  else if (Game.mode === 'ready') b = 'よーい…';
  txt(b, 52, 31.8, 2.8, '#2b2b3a', { align: 'center' });
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
  cx.fillStyle = '#e8d6a8'; cx.fillRect(0, 0, cv.width, cv.height);
  const lv = Game.mode === 'play' ? Game.lvl : 0;
  const amp = lv >= 6 ? 0.9 : lv >= 5 ? 0.5 : lv >= 4 ? 0.22 : 0;
  const shx = amp ? (Math.random() - 0.5) * 2 * amp + (shakeT > 0 ? (Math.random() - 0.5) * shakeT * 6 : 0) : (shakeT > 0 ? (Math.random() - 0.5) * shakeT * 6 : 0);
  const shy = amp ? (Math.random() - 0.5) * 2 * amp : 0;
  cx.setTransform(DPR * U, 0, 0, DPR * U, DPR * (OX + shx * U), DPR * (OY + shy * U));
  drawGym();
  drawLines();
  drawRays();
  drawSpectators();
  drawBodies();
  drawSmoke();
  cx.setTransform(DPR * U, 0, 0, DPR * U, DPR * OX, DPR * OY);
  drawHud();
  drawPopups();
  if (Game.mode === 'ready') {
    const q = Game.readyT / CFG.readySecs;
    txt('よーい…', 50, 100, 16 + 2 * Math.sin(q * 6), '#fff', { stroke: '#213a86', sw: 3 });
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
  for (let k = 1; k < CL.length; k++) {
    const c = CL[k];
    if (k < N) c.app = Math.min(1, c.app + dt * 4.5);
    else {
      // 転んだときは、倒れてから消える（手前から順に）。ゆっくり減速したときは、そのままふっと消える
      const z = 1 + Math.floor((k - 1) / 3);
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
    smoke.push({ x: px + (Math.random() - 0.5) * 16, y: Y0 - 1 - Math.random() * 3, vx: (Math.random() - 0.5) * 6, vy: -6 - Math.random() * 9, r: 1.6 + Math.random() * 1.6, life: 0, max: 0.6 + Math.random() * 0.4 });
  }
}
