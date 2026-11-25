// ===== エンディング（宇宙大会に初めて勝ったあと。約 16 秒・タップでとばせる）=====
// 流れ：①分身が整列して銀河へ ②宇宙人の記録係が宇宙記録の記録用紙に書きこむ ③そのころ、体育館で担任の先生が落ち着いて読み上げる
//       →「そうはならんやろ」→ 記録用紙（宇宙記録）→ 大会の一覧へ。v1 の「途中まで普通なのに、最後に そうはならんやろ」と同じ味
const End = { on: false, t: 0, cert: false, rec: 0, f: {}, stars: null, flashAt: -9 };

// 「|」の切れ目だけで改行する文字の並べ（途中で言葉を割らない）
function chunkLines(s, size, maxW) {
  cx.font = 'bold ' + size + 'px ' + FONT;
  const lines = []; let cur = '';
  for (const p of s.split('|')) {
    if (cur && cx.measureText(cur + STRSEP + p).width > maxW) { lines.push(cur); cur = p; } else cur += (cur ? STRSEP : '') + p;
  }
  lines.push(cur);
  return lines;
}
function drawChunks(s, x, y, size, maxW, fill, o) {
  const ls = chunkLines(s, size, maxW), lh = size * 1.32;
  ls.forEach((l, i) => txt(l, x, y + (i - (ls.length - 1) / 2) * lh, size, fill, o));
}

function startEnding(rec) {
  resetRun();
  End.on = true; End.t = 0; End.cert = false; End.rec = rec; End.f = {}; End.flashAt = -9;
  $('ending').classList.remove('cert');
  $('cStamp').classList.remove('on');
  Snd.setVenue(8); Snd.endSweep();
}
function skipEnding() { if (End.on && !End.cert && End.t > 0.25) End.t = endingTotal(); }
function endingPhase() {
  const T = ENDING_TIMES;
  if (End.t < T.galaxy) return 'galaxy';
  if (End.t < T.galaxy + T.sheet) return 'sheet';
  if (End.t < endingTotal()) return 'teacher';
  return 'cert';
}
function once(key, cond, fn) { if (cond && !End.f[key]) { End.f[key] = 1; fn(); } }

function updateEnding(dt) {
  if (!End.on) return;
  End.t += dt;
  const T = ENDING_TIMES, s0 = T.galaxy, s1 = T.galaxy + T.sheet, t = End.t;
  once('b1', t > 1.8, () => Snd.blip(3));
  once('b2', t > 3.6, () => Snd.blip(5));
  once('r1', t > s0 + 0.7, () => Snd.endType());
  once('r2', t > s0 + 1.3, () => Snd.endType());
  if (t > s0 + 1.3 && t < s0 + 3.0) { End.f.tk = (End.f.tk || 0) + dt; if (End.f.tk > 0.11) { End.f.tk = 0; Snd.endType(); } }
  once('st', t > s0 + 3.3, () => { Snd.stamp(); Snd.blip(2); });
  once('t1', t > s1 + 0.5, () => Snd.endType());
  once('t2', t > s1 + 2.3, () => Snd.endType());
  once('t3', t > s1 + 4.0, () => Snd.endType());
  once('so', t > s1 + 4.4, () => { Snd.sonna(); End.flashAt = nowT; });
  if (!End.cert && t >= endingTotal()) {
    End.cert = true; End.flashAt = nowT;
    $('cRec').textContent = fmt(End.rec); fitRec($('cRec'));
    $('ending').classList.add('cert');
    Tourney.markEndingSeen(SAVE); Tourney.persist(store, SAVE);   // 最後まで見た（途中でページを閉じたら、次に大会の一覧を開いたときもう一度出る）
    focusMain();
    Snd.endJingle();
    setTimeout(() => { $('cStamp').classList.add('on'); Snd.stamp(); }, 700);
  }
}

// ---- 絵 ----
function endStars() {
  if (!End.stars) {
    const R = mulberry32(5); End.stars = [];
    for (let i = 0; i < 360; i++) End.stars.push({ x: -300 + R() * 700, y: -120 + R() * 420, r: 0.15 + R() * 0.4, a: 0.3 + R() * 0.7, f: 1 + R() * 3 });
  }
  return End.stars;
}
function spaceBg() {
  const g = cx.createLinearGradient(0, EY0, 0, EY1);
  g.addColorStop(0, '#0a0420'); g.addColorStop(1, '#1d0b45');
  cx.fillStyle = g; cx.fillRect(EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10);
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, rgb, a] of [[18, 46, 80, '255,63,160', 0.2], [82, 120, 90, '47,160,255', 0.2], [50, 90, 100, '122,63,255', 0.22], [EX1 - 10, 40, 80, '255,170,63', 0.12], [EX0 + 10, 150, 80, '63,255,200', 0.1]]) glow(x, y, r, rgb, a);
  cx.restore();
  for (const s of endStars()) {
    if (s.x < EX0 - 2 || s.x > EX1 + 2 || s.y < EY0 - 2 || s.y > EY1 + 2) continue;
    cx.fillStyle = 'rgba(255,255,255,' + (s.a * (0.65 + 0.35 * Math.sin(End.t * s.f + s.x))) + ')'; cx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
  }
}
const eIO = q => q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
function endCaption(s, y, a) {
  cx.save(); cx.globalAlpha = clamp(a, 0, 1);
  drawChunks(s, 50, y, 6.4, 84, '#fff', { stroke: '#1a1050', sw: 1.5 });
  cx.restore();
}

// ① 分身が整列して、銀河へ散らばっていく
function sceneGalaxy(t, caps) {
  const wide = EX1 - EX0, C = wide > 110 ? clamp(Math.round((wide - 16) / 7.1), 12, 26) : 12, N = C * 7;   // 横画面は列を増やして横いっぱいに
  const step = wide > 110 ? (wide - 16) / (C - 1) : 7.1, fx0 = wide > 110 ? EX0 + 8 : 12, radMax = Math.max(86, wide * 0.5);
  const q = eIO(clamp((t - 1.8) / 1.6, 0, 1)), ex = Math.max(0, t - 3.6);
  for (let i = 0; i < N; i++) {
    const col = i % C, row = (i / C) | 0;
    const fx = fx0 + col * step + Math.sin(t * 9 + (row % 2) * 3.14) * 1.8 * (1 - q), fy = 82 + row * 11;
    const ang = i * 0.42 + t * 0.5, rad = (6 + i / N * (radMax - 6)) * (1 + ex * 0.35);
    const sx = 50 + Math.cos(ang) * rad, sy = 112 + Math.sin(ang) * rad * 0.55;
    const x = fx + (sx - fx) * q, y = fy + (sy - fy) * q;
    const a = clamp((t - i * 0.012) / 0.3, 0, 1) * (1 - 0.45 * clamp(ex / 1.6, 0, 1));
    if (a <= 0.01 || x < EX0 - 12 || x > EX1 + 12) continue;
    const sc = (0.3 - 0.1 * q) * (1 - Math.min(0.4, ex * 0.12));
    drawKid(cx, x, y, sc, { hop: (1 - q) * (0.5 + 0.5 * Math.sin(t * 9 + i)), lean: (1 - q) * Math.cos(t * 9 + (row % 2) * 3.14), ph: t * 14 + i, alpha: a, face: 0 });
  }
  if (caps) {
    const T = ENDING_TIMES.galaxy;
    if (t > 0.3 && t < 2.7) endCaption(STR.ending.cap.galaxy[0], 160, Math.min((t - 0.3) / 0.4, (2.7 - t) / 0.4));
    if (t > 2.9 && t < T) endCaption(STR.ending.cap.galaxy[1], 160, Math.min((t - 2.9) / 0.4, (T - t) / 0.3));
  }
}

// ② 宇宙人の記録係が、宇宙記録の記録用紙に書きこむ
function sceneSheet(t) {
  const S = STR.ending.sheetRow, W0 = 10, Wd = 80, Y0s = 24;
  cx.fillStyle = 'rgba(0,0,0,.35)'; rr(cx, W0 + 1, Y0s + 2.4, Wd, 80, 2); cx.fill();
  cx.fillStyle = '#fffdf2'; rr(cx, W0, Y0s, Wd, 80, 2); cx.fill();
  cx.strokeStyle = '#2c4aa0'; cx.lineWidth = 0.9; rr(cx, W0, Y0s, Wd, 80, 2); cx.stroke();
  const show = (a, fn) => { cx.save(); cx.globalAlpha = clamp((t - a) / 0.25, 0, 1); fn(); cx.restore(); };
  show(0.2, () => { txt(STR.ending.cert.head, 50, 34, 6, '#2c4aa0'); cx.fillStyle = '#2c4aa0'; cx.fillRect(16, 39, 68, 0.6); });
  show(0.7, () => { txt(S.kind, 17, 50, 4.2, '#55608a', { align: 'left' }); txt(S.kindVal, 83, 50, 5, '#2b2b3a', { align: 'right' }); cx.fillStyle = '#9aa7d0'; cx.fillRect(16, 54, 68, 0.3); });
  show(1.3, () => {
    txt(S.rec, 17, 70, 4.6, '#55608a', { align: 'left' });
    const v = fmt(Math.round(End.rec * easeOut(clamp((t - 1.3) / 1.7, 0, 1))));
    cx.font = '900 15px ' + FONT; const w = cx.measureText(v).width, mx = EN ? 36 : 44, fs = w > mx ? 15 * mx / w : 15;   // 英語は左の「Record」が長いので、数字を少し細く
    txt(v, 70, 70, fs, '#d2382f', { weight: '900', align: 'right' }); txt(S.unit, 83, 72, 4.4, '#55608a', { align: 'right' });
    cx.fillStyle = '#9aa7d0'; cx.fillRect(16, 79, 68, 0.3);
  });
  show(1.9, () => { txt(S.judge, 17, 92, 4.6, '#55608a', { align: 'left' }); });
  if (t > 3.3) {   // 判子
    const q = clamp((t - 3.3) / 0.28, 0, 1), sc = 2.4 - 1.4 * easeOut(q);
    cx.save(); cx.globalAlpha = q; cx.translate(62, 92); cx.rotate(-0.25); cx.scale(sc, sc);
    cx.strokeStyle = '#d2382f'; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(0, 0, 10.5, 0, 6.283); cx.stroke();
    drawChunks(STR.ending.cert.stamp, 0, 0, EN ? 3.8 : 5.2, 18, '#d2382f', { weight: '900' });
    cx.restore();
  }
  // 宇宙人の記録係：腕が 6本。ペン・はんこ・電卓・バインダー…を持って、いそがしい
  const ax = 50, ay = 176, sc = 1.0, wv = Math.sin(t * 8);
  cx.strokeStyle = '#8fe07a'; cx.lineWidth = 1.5; cx.lineCap = 'round';
  const arms = [[-1, 0, '#e8e8e8'], [-1, 1, '#d2242a'], [-1, 2, '#4a4f5c'], [1, 0, '#8a6a3a'], [1, 1, '#3a6ad0'], [1, 2, '#f2c61e']];
  arms.forEach(([d, k, c], i) => {
    const bx = ax + d * 4, by = ay - 21 * sc + k * 2.4, tx = ax + d * (11 + k * 4), ty = ay - 32 * sc + k * 4.5 + Math.sin(t * 8 + i * 1.7) * 2.2;
    cx.beginPath(); cx.moveTo(bx, by); cx.quadraticCurveTo(ax + d * 9, by - 4, tx, ty); cx.stroke();
    cx.fillStyle = c; rr(cx, tx - 1.5 + (d > 0 ? 0 : -1.5), ty - 2, 4, 4, 0.6); cx.fill();
  });
  drawAlien(cx, ax, ay, sc, { eyes: 3, ph: t * 7, cheer: false });
  if (t > 0.4 && t < 2.6) endCaption(STR.ending.cap.sheet[0], 116, Math.min((t - 0.4) / 0.4, (2.6 - t) / 0.3));
  if (t > 3.0) endCaption(STR.ending.cap.sheet[1], 116, Math.min((t - 3.0) / 0.4, (ENDING_TIMES.sheet - t) / 0.3));
}

// ③ そのころ、体育館で。担任の先生が、落ち着いて読み上げる
function sceneTeacher(t) {
  const V = VENUES[0];
  cx.drawImage(venueLayer(V), EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10);
  PROP.windows.dyn(V);
  const s = 2.3, x = 50, y = 166, hy = y - 30.2 * s;
  drawKid(cx, x, y, s, { shirt: '#3a8f5a', shorts: '#2c3140', legs: '#2c3140', hair: '#777', collar: '#fff', band: false, face: 0, ph: 0 });
  cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.55; cx.beginPath();   // 眼鏡
  cx.arc(x - 2.2 * s, hy + 0.9 * s, 1.6 * s, 0, 6.283); cx.moveTo(x + 2.2 * s + 1.6 * s, hy + 0.9 * s); cx.arc(x + 2.2 * s, hy + 0.9 * s, 1.6 * s, 0, 6.283); cx.moveTo(x - 0.6 * s, hy + 0.9 * s); cx.lineTo(x + 0.6 * s, hy + 0.9 * s); cx.stroke();
  cx.fillStyle = '#e8c030'; cx.beginPath(); cx.arc(x - 2.4 * s, y - 24 * s, 1.1 * s, 0, 6.283); cx.fill();   // 笛
  cx.save(); cx.translate(x + 9 * s, y - 16 * s); cx.rotate(-0.12);   // バインダー
  cx.fillStyle = '#8a6a3a'; rr(cx, -5.5, -9, 11, 14, 1); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(-4.2, -7.2, 8.4, 10.5);
  cx.fillStyle = '#9aa7d0'; for (let i = 0; i < 4; i++) cx.fillRect(-3.4, -5.6 + i * 2.3, 6.8, 0.3);
  cx.restore();
  const T = STR.ending.teacher;
  let line = null;
  if (t > 0.5 && t < 2.2) line = T[0]; else if (t >= 2.3 && t < 3.9) line = T[1](fmt(End.rec)); else if (t >= 4.0) line = T[2];
  if (t < 1.9) { cx.fillStyle = 'rgba(0,0,0,.55)'; rr(cx, 22, 30, 56, 13, 2); cx.fill(); drawChunks(STR.ending.cap.teacher[0], 50, 36.5, 5.6, 52, '#fff'); }
  if (line) {
    cx.fillStyle = '#fff'; cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.7;
    rr(cx, 11, 46, 78, 36, 3); cx.fill(); cx.stroke();
    cx.beginPath(); cx.moveTo(43, 82); cx.lineTo(50, hy - 9); cx.lineTo(57, 82); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(43.4, 82.4); cx.lineTo(50, hy - 9); cx.lineTo(56.6, 82.4); cx.stroke();
    cx.fillStyle = '#fff'; cx.fillRect(43.6, 81.4, 12.8, 1.6);
    drawChunks(line, 50, 64, 7.4, 70, '#2b2b3a');
  }
  if (t > 4.5) {   // そうはならんやろ
    const q = clamp((t - 4.5) / 0.22, 0, 1), sc = 1 + 0.5 * (1 - easeOut(q));
    cx.save(); cx.translate(50, 128); cx.rotate(-0.07); cx.scale(sc, sc); cx.globalAlpha = q;
    fitTxt(STR.ending.pop, 0, 0, 11, 82, '#e0356f', { stroke: '#fff', sw: 2.4 });
    cx.restore();
  }
}

// 記録用紙（宇宙記録）のうしろ：ゆっくり回る銀河と分身
function sceneCert() { sceneGalaxy(4.2 + (End.t - endingTotal()) * 0.25, false); }

function drawEndingScene() {
  const ph = endingPhase(), T = ENDING_TIMES, t = End.t;
  spaceBg();
  if (ph === 'galaxy') sceneGalaxy(t, true);
  else if (ph === 'sheet') sceneSheet(t - T.galaxy);
  else if (ph === 'teacher') sceneTeacher(t - T.galaxy - T.sheet);
  else sceneCert();
  // 場面のつなぎ目は、いったん暗くして入る
  for (const b of [T.galaxy, T.galaxy + T.sheet]) {
    const d = t - b;
    if (d > -0.2 && d < 0.35) { cx.fillStyle = 'rgba(0,0,0,' + (d < 0 ? (d + 0.2) / 0.2 : 1 - d / 0.35) + ')'; cx.fillRect(EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10); }
  }
  const f = clamp(1 - (nowT - End.flashAt) / 0.5, 0, 1);
  if (f > 0) { cx.fillStyle = 'rgba(255,255,255,' + f * 0.85 + ')'; cx.fillRect(EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10); }
}
