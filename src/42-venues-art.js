// ===== 会場の背景・小物・記録係の顔（会場の表 VENUES を見て描き分ける）=====
// 動かない部分は画面の外の canvas に 1 枚描いて使い回す（大きさ・会場が変わったときだけ描き直す）。動く部分（窓のガタガタ・点滅・星のまたたき）だけ毎フレーム描く。
// 見えるのは主に「記録板の下から床まで」（遊ぶ場所の高さ 38〜62）。ここに会場らしさをまとめる
function venueIdx() { return App.screen === 'title' ? 0 : clamp(App.idx, 0, VENUES.length - 1); }
function curVenue() { return VENUES[venueIdx()]; }

const VCache = { cv: null, key: '' };
function venueLayer(V) {
  const key = V.i + '|' + W + 'x' + H + '|' + DPR;
  if (VCache.key === key) return VCache.cv;
  const w = EX1 - EX0 + 10, h = EY1 - EY0 + 10;
  const pw = Math.max(1, Math.round(w * U * DPR)), phh = Math.max(1, Math.round(h * U * DPR));
  if (!VCache.cv) VCache.cv = document.createElement('canvas');
  VCache.cv.width = pw; VCache.cv.height = phh;
  const oc = VCache.cv.getContext('2d');
  oc.setTransform(pw / w, 0, 0, phh / h, -(EX0 - 5) * pw / w, -(EY0 - 5) * phh / h);
  const real = cx; cx = oc;
  try { paintStatic(V); } finally { cx = real; }
  VCache.key = key;
  return VCache.cv;
}
function drawVenue() {
  const V = curVenue(), L = venueLayer(V);
  cx.drawImage(L, EX0 - 5, EY0 - 5, EX1 - EX0 + 10, EY1 - EY0 + 10);
  for (const name of V.props) { const P = PROP[name]; if (P && P.dyn) P.dyn(V); }
}

// ---- 共通の道具 ----
const SKIN = ['#f3c8a0', '#e8b890', '#d9a578', '#c18a62', '#f6d4b4'];
const HAIR = ['#2a1c16', '#3a2a22', '#5a3a22', '#1a1a1e', '#777', '#8a6a3a'];
const WIDE = () => EX1 - EX0 + 10;
function glow(x, y, r, rgb, a) {
  const g = cx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
  cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
}
// 観客席の人（頭と肩）。rows＝[{y（肩の下の高さ）, size, gap}]、奥の列から順に描く
function standCrowd(rows, xa, xb, pal, seed, o) {
  o = o || {};
  const R = mulberry32(seed);
  for (const r of rows) {
    const sc = r.size;
    for (let x = xa + R() * r.gap; x < xb; x += r.gap) {
      const col = pal[(R() * pal.length) | 0], sk = SKIN[(R() * SKIN.length) | 0], hr = HAIR[(R() * HAIR.length) | 0];
      const hy = r.y - 4.6 * sc, up = o.stick && R() < o.stick;
      if (up) {   // 光る棒（ペンライト）
        const c = ['#ff3fa0', '#3fe0ff', '#ffe03f', '#7aff6a'][(R() * 4) | 0];
        cx.strokeStyle = c; cx.lineWidth = 0.55 * sc; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(x + 2.2 * sc, r.y - 3 * sc); cx.lineTo(x + 3.2 * sc, hy - 3.4 * sc); cx.stroke();
        glow(x + 3.2 * sc, hy - 3.4 * sc, 2.6 * sc, '255,255,255', 0.35);
      }
      cx.fillStyle = col; rr(cx, x - 2.3 * sc, r.y - 4.2 * sc, 4.6 * sc, 4.2 * sc, 1.2 * sc); cx.fill();
      cx.fillStyle = sk; cx.beginPath(); cx.arc(x, hy, 1.8 * sc, 0, 6.283); cx.fill();
      cx.fillStyle = hr; cx.beginPath(); cx.arc(x, hy - 0.25 * sc, 1.9 * sc, Math.PI, 6.283); cx.fill();
    }
  }
}
function bands(col, n) {   // 手前ほど太い横しま（芝刈りの筋・床のつや）
  cx.fillStyle = col;
  const hh = EY1 - YH + 10;
  for (let k = 0; k < n; k += 2) {
    const a = Math.pow(k / n, 1.7), b = Math.pow((k + 1) / n, 1.7);
    cx.fillRect(EX0 - 5, YH + a * hh, WIDE(), (b - a) * hh);
  }
}
function fan(col, lw, step) {   // 奥の一点へ集まる筋
  cx.strokeStyle = col; cx.lineWidth = lw; cx.beginPath();
  for (let i = -30; i <= 30; i++) { cx.moveTo(50, YH); cx.lineTo(50 + i * step, EY1 + 8); }
  cx.stroke();
}
function flagAt(x, y, w, h, d) {
  const F = [
    () => { ['#f4f4f4', '#2a4aa8', '#d0242a'].forEach((c, i) => { cx.fillStyle = c; cx.fillRect(x, y + h * i / 3, w, h / 3 + 0.05); }); },
    () => { ['#1f9a52', '#f4f4f4', '#d0242a'].forEach((c, i) => { cx.fillStyle = c; cx.fillRect(x + w * i / 3, y, w / 3 + 0.05, h); }); },
    () => { cx.fillStyle = '#f8f8f8'; cx.fillRect(x, y, w, h); cx.fillStyle = '#d0242a'; cx.beginPath(); cx.arc(x + w / 2, y + h / 2, h * 0.3, 0, 6.283); cx.fill(); },
    () => { cx.fillStyle = '#d0242a'; cx.fillRect(x, y, w, h); cx.fillStyle = '#fff'; cx.fillRect(x + w * 0.3, y, w * 0.14, h); cx.fillRect(x, y + h * 0.42, w, h * 0.16); },
    () => { for (let i = 0; i < 5; i++) { cx.fillStyle = i % 2 ? '#f4f4f4' : '#d0242a'; cx.fillRect(x, y + h * i / 5, w, h / 5 + 0.05); } cx.fillStyle = '#2a4aa8'; cx.fillRect(x, y, w * 0.45, h * 0.55); },
    () => { ['#161616', '#f2c61e', '#d0242a'].forEach((c, i) => { cx.fillStyle = c; cx.fillRect(x, y + h * i / 3, w, h / 3 + 0.05); }); },
    () => { cx.fillStyle = '#1f9a52'; cx.fillRect(x, y, w, h); cx.fillStyle = '#f2c61e'; cx.beginPath(); cx.moveTo(x + w / 2, y + h * 0.12); cx.lineTo(x + w * 0.88, y + h / 2); cx.lineTo(x + w / 2, y + h * 0.88); cx.lineTo(x + w * 0.12, y + h / 2); cx.closePath(); cx.fill(); },
    () => { cx.fillStyle = '#2a4aa8'; cx.fillRect(x, y, w, h); cx.fillStyle = '#f2c61e'; cx.beginPath(); cx.arc(x + w / 2, y + h / 2, h * 0.28, 0, 6.283); cx.fill(); },
  ];
  F[d % F.length]();
}

// ---- 静かな部分をまとめて描く ----
const LATE = { teachersRow: 1, studentsRow: 1, cameras: 1, judges: 1 };   // 床に足がつく小物は、床を描いたあとに
function paintStatic(V) {
  // 壁（空）
  const top = EY0 - 5;
  let g = cx.createLinearGradient(0, top, 0, YH);
  g.addColorStop(0, V.wall[0]); g.addColorStop(1, V.wall[1]);
  cx.fillStyle = g; cx.fillRect(EX0 - 5, top, WIDE(), YH - top + 0.5);
  BACK[V.kind](V);
  for (const n of V.props) if (!LATE[n] && PROP[n] && PROP[n].draw) PROP[n].draw(V);
  paintFloor(V);
  for (const n of V.props) if (LATE[n] && PROP[n] && PROP[n].draw) PROP[n].draw(V);
  // 床と壁の境
  cx.fillStyle = V.kind === 'space' || V.kind === 'tv' ? V.wainLine : 'rgba(0,0,0,.25)';
  cx.globalAlpha = V.kind === 'space' || V.kind === 'tv' ? 0.85 : 1;
  cx.fillRect(EX0 - 5, YH - 0.3, WIDE(), V.kind === 'space' || V.kind === 'tv' ? 0.6 : 0.9);
  cx.globalAlpha = 1;
  if (V.kind === 'space' || V.kind === 'tv') glow(50, YH, 70, V.kind === 'space' ? '92,240,255' : '0,216,255', 0.12);
}
const BACK = {
  gym(V) {   // 腰壁
    cx.fillStyle = V.wain; cx.fillRect(EX0 - 5, 52, WIDE(), YH - 52);
    cx.fillStyle = V.wainLine; cx.fillRect(EX0 - 5, 52, WIDE(), 0.9);
  },
  hall(V) {
    cx.fillStyle = 'rgba(40,70,100,.07)';
    for (let x = Math.floor((EX0 - 5) / 9) * 9; x < EX1 + 5; x += 9) cx.fillRect(x, 38, 0.5, 18);
    cx.fillStyle = V.wain; cx.fillRect(EX0 - 5, 56, WIDE(), YH - 56);
    cx.fillStyle = V.wainLine; cx.fillRect(EX0 - 5, 56, WIDE(), 0.8);
  },
  arena(V) {
    cx.fillStyle = V.wain; cx.fillRect(EX0 - 5, 58.5, WIDE(), YH - 58.5);
    cx.fillStyle = 'rgba(240,200,96,.35)'; cx.fillRect(EX0 - 5, 37.6, WIDE(), 0.5);
  },
  tv(V) {
    for (let x = Math.floor((EX0 - 5) / 12) * 12; x < EX1 + 5; x += 12) {
      cx.fillStyle = (x / 12) % 2 ? 'rgba(255,63,160,.10)' : 'rgba(63,224,255,.10)'; cx.fillRect(x, 20, 0.6, 42);
    }
    cx.fillStyle = V.wain; cx.fillRect(EX0 - 5, 58.5, WIDE(), YH - 58.5);
  },
  stadium(V) {   // 夜空の下の観客席のうしろ
    const g = cx.createLinearGradient(0, 36, 0, YH);
    g.addColorStop(0, 'rgba(120,150,230,0)'); g.addColorStop(1, 'rgba(150,180,255,.35)');
    cx.fillStyle = g; cx.fillRect(EX0 - 5, 36, WIDE(), YH - 36);
    cx.fillStyle = V.wain; cx.fillRect(EX0 - 5, 58.5, WIDE(), YH - 58.5);
  },
  moon(V) {
    const g = cx.createLinearGradient(0, 46, 0, YH);
    g.addColorStop(0, 'rgba(120,120,140,0)'); g.addColorStop(1, 'rgba(120,120,140,.28)');
    cx.fillStyle = g; cx.fillRect(EX0 - 5, 46, WIDE(), YH - 46);
  },
  space(V) {},
};

function paintFloor(V) {
  const g = cx.createLinearGradient(0, YH, 0, EY1);
  g.addColorStop(0, V.floor[0]); g.addColorStop(1, V.floor[1]);
  cx.fillStyle = g; cx.fillRect(EX0 - 5, YH, WIDE(), EY1 - YH + 5);
  const R = mulberry32(V.i * 977 + 5), hh = EY1 - YH;
  switch (V.floorStyle) {
    case 'planks':
      fan('rgba(120,80,30,.16)', 0.25, 14);
      glow(50, 118, 70, '255,245,210', 0.35);
      break;
    case 'court':
      fan('rgba(255,255,255,.13)', 0.25, 14);
      glow(50, 118, 70, '255,255,255', 0.28);
      break;
    case 'turf':
      bands('rgba(0,0,0,.07)', 16);
      glow(50, 118, 70, '240,255,220', 0.22);
      break;
    case 'glass':
      glow(18, 100, 60, '255,63,160', 0.28); glow(82, 120, 60, '63,224,255', 0.25);
      cx.fillStyle = 'rgba(255,255,255,.05)';
      for (let k = 0; k < 6; k++) cx.fillRect(EX0 - 5, YH + hh * (0.1 + k * 0.16), WIDE(), 0.6 + k * 0.3);
      break;
    case 'track':
      fan('rgba(255,255,255,.26)', 0.35, 26);
      bands('rgba(0,0,0,.05)', 14);
      glow(50, 118, 70, '255,220,200', 0.25);
      break;
    case 'regolith': {
      for (let k = 0; k < 34; k++) {   // クレーター。奥ほど小さく
        const z = Math.pow(R(), 0.8), y = YH + 2 + z * (hh - 2), s = 0.15 + z * 0.85, x = EX0 + R() * (EX1 - EX0), rw = (3 + R() * 7) * s * 2.2;
        cx.fillStyle = 'rgba(30,30,40,.20)'; cx.beginPath(); cx.ellipse(x, y, rw, rw * 0.28, 0, 0, 6.283); cx.fill();
        cx.strokeStyle = 'rgba(230,230,240,.22)'; cx.lineWidth = 0.35 * s + 0.1;
        cx.beginPath(); cx.ellipse(x, y - rw * 0.04, rw, rw * 0.28, 0, 0.1 * Math.PI, 0.9 * Math.PI); cx.stroke();
      }
      cx.fillStyle = 'rgba(255,255,255,.10)';
      for (let k = 0; k < 220; k++) { const z = R(); cx.fillRect(EX0 + R() * (EX1 - EX0), YH + 1 + z * (hh - 1), 0.25 + z * 0.35, 0.18 + z * 0.2); }
      glow(50, 118, 80, '255,255,255', 0.12);
      break;
    }
    case 'grid': {
      cx.strokeStyle = 'rgba(92,240,255,.20)'; cx.lineWidth = 0.28;
      cx.beginPath();
      for (let k = 1; k < 16; k++) { const y = YH + hh * Math.pow(k / 15, 2) + 4; cx.moveTo(EX0 - 5, y); cx.lineTo(EX1 + 5, y); }
      cx.stroke();
      fan('rgba(92,240,255,.17)', 0.28, 16);
      glow(50, 100, 90, '120,80,255', 0.20);
      break;
    }
  }
}

// ---- 会場の小物 ----
const PROP = {
  // 体育館
  windows: {   // 窓（段階 4 以上でガタガタ）
    dyn() {
      const lv = Game.lvl, rat = lv >= 4 ? Math.sin(nowT * 70) * (lv >= 6 ? 0.55 : 0.25) : 0;
      const x0 = Math.floor((EX0 - 20) / 34) * 34 + 3;
      for (let x = x0; x < EX1 + 20; x += 34) {
        const jx = rat * Math.sin(x), jy = rat * Math.cos(x * 1.3);
        cx.fillStyle = '#c8d6e6'; rr(cx, x + jx, 8 + jy, 26, 22, 1.2); cx.fill();
        cx.fillStyle = '#9fd0f2'; cx.fillRect(x + 1.5 + jx, 9.5 + jy, 23, 19);
        cx.fillStyle = '#d5ecfb'; cx.fillRect(x + 1.5 + jx, 9.5 + jy, 23, 8);
        cx.fillStyle = '#c8d6e6'; cx.fillRect(x + 12.3 + jx, 9 + jy, 1.4, 20); cx.fillRect(x + jx, 18.5 + jy, 26, 1.4);
      }
    },
  },
  banner: {   // 横断幕
    draw(V) {
      const S = STR.venues[V.i], hall = V.kind === 'hall', x = hall ? 32 : 22, w = hall ? 36 : 56, y = 40.5;
      cx.fillStyle = V.banner[0]; rr(cx, x, y, w, 9, 1); cx.fill();
      cx.fillStyle = V.banner[1]; cx.fillRect(x, y, w, 0.8); cx.fillRect(x, y + 8.2, w, 0.8);
      fitTxt(S.banner, 50, y + 4.7, 6.2, w - 6, '#fff', { stroke: 'rgba(0,0,0,.45)', sw: 1.1 });
    },
  },
  curtain: {   // 舞台の幕と舞台
    draw() {
      cx.fillStyle = '#9a1f2a'; cx.fillRect(34, 50, 32, 7);
      for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#b02a35' : '#8a1a24'; cx.fillRect(34 + i * 4, 50, 4, 7); }
      cx.fillStyle = '#7a5a30'; cx.fillRect(30, 57, 40, 5);
    },
    dyn() {
      const lv = Game.lvl; if (lv < 4) return;
      const fl = Math.sin(nowT * (lv >= 6 ? 14 : 2)) * 0.7;
      for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#b02a35' : '#8a1a24'; cx.fillRect(34 + i * 4 + fl * (i % 3 - 1), 50, 4, 7); }
    },
  },
  garlands: {   // 紙の飾りと風船（校内大会）
    draw() {
      const pal = ['#e0356f', '#f6c84c', '#58b0e0', '#7ac45a', '#8a5ad0'];
      for (let x0 = Math.floor((EX0 - 5) / 50) * 50; x0 < EX1 + 5; x0 += 50) {
        cx.strokeStyle = 'rgba(80,60,40,.5)'; cx.lineWidth = 0.25; cx.beginPath(); cx.moveTo(x0, 38.5); cx.quadraticCurveTo(x0 + 25, 46, x0 + 50, 38.5); cx.stroke();
        for (let k = 1; k < 11; k++) {
          const t = k / 11, px = x0 + 50 * t, py = 38.5 + 15 * t * (1 - t);
          cx.fillStyle = pal[(k + (x0 / 50 & 3)) % 5]; cx.beginPath(); cx.moveTo(px - 1.6, py); cx.lineTo(px + 1.6, py); cx.lineTo(px, py + 3.6); cx.closePath(); cx.fill();
        }
      }
      for (const [bx, by, c] of [[3.5, 50, '#e0356f'], [9, 47, '#58b0e0'], [14, 51, '#f6c84c'], [86, 51, '#7ac45a'], [91, 47, '#8a5ad0'], [96.5, 50, '#e0356f']]) {
        cx.strokeStyle = 'rgba(80,60,40,.45)'; cx.lineWidth = 0.2; cx.beginPath(); cx.moveTo(bx, by + 3); cx.lineTo(bx + 0.6, 60.5); cx.stroke();
        cx.fillStyle = c; cx.beginPath(); cx.ellipse(bx, by, 2.5, 3.1, 0, 0, 6.283); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.ellipse(bx - 0.8, by - 1.1, 0.7, 1, -0.5, 0, 6.283); cx.fill();
      }
    },
  },
  teachersRow: {   // 並んで見ている先生たち
    draw() {
      const xs = [5, 12.5, 20, 80, 87.5, 95], cols = ['#3a4256', '#4a3a56', '#2f4a5a'];
      xs.forEach((x, i) => drawKid(cx, x, 62.6, 0.46, { shirt: cols[i % 3], shorts: '#2c3140', legs: '#2c3140', arm: cols[i % 3], hair: i % 2 ? '#8a8a92' : '#3a2a22', collar: '#fff', band: false, face: 0 }));
    },
  },
  studentsRow: {   // 体育座りの全校生徒
    draw() {
      const R = mulberry32(31), cols = ['#f2a43a', '#58b0e0', '#e86a9a', '#7ac45a', '#8a5ad0', '#e04a4a'];
      for (let r = 0; r < 2; r++) {
        for (let x = EX0 - 4 + r * 2.6; x < EX1 + 4; x += 5.4) {
          if (x > 29 && x < 71) continue;
          drawKid(cx, x, 66.2 + r * 3.8, 0.34 + r * 0.035, { shirt: cols[(R() * 6) | 0], shorts: '#2c4aa0', hair: HAIR[(R() * 4) | 0], collar: '#fff', band: false, sit: 1, face: 0 });
        }
      }
    },
  },
  // 市民体育館
  clerestory: {
    draw() {
      for (let x = Math.floor((EX0 - 5) / 24) * 24 + 4; x < EX1 + 5; x += 24) {
        cx.fillStyle = '#8aa6b8'; rr(cx, x, 5, 18, 12, 1); cx.fill();
        cx.fillStyle = '#bfe0f4'; cx.fillRect(x + 1, 6, 16, 10); cx.fillStyle = '#8aa6b8'; cx.fillRect(x + 8.6, 5.5, 0.8, 11);
      }
    },
  },
  bleachers: {   // 観客席（左右）。ふつうの服の観客
    draw(V) {
      const sides = [[EX0 - 5, 30], [70, EX1 + 5]];
      for (let t = 2; t >= 0; t--) {
        const yb = 62 - 7 * t;
        for (const [xa, xb] of sides) {
          cx.fillStyle = '#3d5073'; cx.fillRect(xa, yb - 3, xb - xa, 3.2);
          cx.fillStyle = '#5a6f8f'; cx.fillRect(xa, yb - 7, xb - xa, 4);
          standCrowd([{ y: yb - 2.6, size: 1.0, gap: 4.2 }], xa + 1, xb - 1, V.crowd.shirts, 11 + t * 7 + (xa > 0 ? 3 : 0));
        }
      }
      cx.fillStyle = '#c9d6e6'; for (const [xa, xb] of sides) cx.fillRect(xa, 40.6, xb - xa, 0.6);   // 手すり
    },
  },
  sign: {   // 看板
    draw(V) {
      const S = STR.venues[V.i];
      cx.fillStyle = V.sign[0]; rr(cx, 38, 51, 24, 5.4, 0.8); cx.fill();
      fitTxt(S.sign, 50, 53.8, 3.4, 21, V.sign[1]);
    },
  },
  // アリーナ
  trusses: {   // 天井のライトの束
    draw() {
      cx.fillStyle = '#3a4060'; cx.fillRect(EX0 - 5, 3, WIDE(), 2.2);
      for (let x = Math.floor((EX0 - 5) / 17) * 17 + 8; x < EX1 + 5; x += 17) {
        const g = cx.createLinearGradient(0, 5, 0, 62);
        g.addColorStop(0, 'rgba(255,248,210,.17)'); g.addColorStop(1, 'rgba(255,248,210,0)');
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(x - 1.2, 5); cx.lineTo(x + 1.2, 5); cx.lineTo(x + 11, 62); cx.lineTo(x - 11, 62); cx.closePath(); cx.fill();
        cx.fillStyle = '#fff8d0'; cx.beginPath(); cx.arc(x, 5.6, 1.6, 0, 6.283); cx.fill();
      }
    },
  },
  tiers: {   // 観客席（正面、何段も）。アリーナは 2 段、スタジアムは 3 段
    draw(V) {
      const st = V.kind === 'stadium';
      const rows = st ? [{ y: 52.5, size: 0.9, gap: 3.9 }, { y: 57.3, size: 1.0, gap: 4.3 }, { y: 62, size: 1.1, gap: 4.7 }]
        : [{ y: 46, size: 0.8, gap: 3.5 }, { y: 50.5, size: 0.9, gap: 3.9 }, { y: 55, size: 1.0, gap: 4.3 }, { y: 59.5, size: 1.1, gap: 4.7 }, { y: 62.6, size: 1.2, gap: 5.2 }];
      if (!st) { cx.fillStyle = 'rgba(0,0,0,.28)'; cx.fillRect(EX0 - 5, 49.6, WIDE(), 0.7); }
      standCrowd(rows, EX0 - 5, EX1 + 5, V.crowd.shirts, 71 + V.i);
      const g = cx.createLinearGradient(0, 38, 0, 62);   // 奥は暗く
      g.addColorStop(0, 'rgba(8,10,30,' + (st ? 0.25 : 0.45) + ')'); g.addColorStop(1, 'rgba(8,10,30,0)');
      cx.fillStyle = g; cx.fillRect(EX0 - 5, 38, WIDE(), 24);
    },
    dyn() {   // カメラのフラッシュ（段階 3 から）
      if (Game.lvl < 3 || Game.mode !== 'play') return;
      const f = Math.floor(nowT * 9);
      for (let k = 0; k < 5; k++) {
        const sd = f * 31 + k * 17, x = EX0 + (((sd * 7919) % 1000) / 1000) * (EX1 - EX0), y = 42 + (((sd * 104729) % 1000) / 1000) * 19;
        cx.fillStyle = 'rgba(255,255,255,.9)'; cx.fillRect(x - 0.3, y - 1, 0.6, 2); cx.fillRect(x - 1, y - 0.3, 2, 0.6);
      }
    },
  },
  judges: {   // 審査員の机
    draw() {
      const xs = [33, 50, 67], nums = ['10', '9', '10'], hairs = ['#8a8a92', '#2a1c16', '#5a3a22'];
      xs.forEach((x, i) => drawKid(cx, x, 62.2, 0.4, { shirt: '#222a44', shorts: '#222a44', legs: '#222a44', arm: '#222a44', hair: hairs[i], collar: '#fff', band: false, face: 0 }));
      cx.fillStyle = '#f4f1e6'; cx.fillRect(19, 55.4, 62, 7.2);
      cx.fillStyle = '#d8d2bf'; for (let x = 24; x < 80; x += 8) cx.fillRect(x, 56.2, 0.35, 6.4);
      cx.fillStyle = '#7a1f2e'; cx.fillRect(19, 55, 62, 1.4);
      xs.forEach((x, i) => {
        cx.fillStyle = '#fff'; cx.strokeStyle = '#7a1f2e'; cx.lineWidth = 0.3; rr(cx, x + 3.4, 51.2, 5.4, 3.8, 0.5); cx.fill(); cx.stroke();
        txt(nums[i], x + 6.1, 53.2, 2.8, '#d2242a');
        cx.fillStyle = '#2c4aa0'; rr(cx, x - 3, 58.6, 6, 1.9, 0.4); cx.fill();
      });
    },
  },
  // テレビ中継の会場
  ledwall: {   // LED の大画面
    draw(V) {
      const S = STR.venues[V.i], x = 16, y = 38.6, w = 68, h = 16.5;
      cx.fillStyle = '#05030c'; rr(cx, x - 1, y - 1, w + 2, h + 2, 1.2); cx.fill();
      const g = cx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ff2fa8'); g.addColorStop(0.5, '#6a3cff'); g.addColorStop(1, '#00c8ff');
      cx.fillStyle = g; cx.fillRect(x, y, w, h);
      cx.fillStyle = 'rgba(0,0,0,.16)';
      for (let i = 1; i < 48; i++) cx.fillRect(x + i * w / 48, y, 0.18, h);
      for (let j = 1; j < 12; j++) cx.fillRect(x, y + j * h / 12, w, 0.18);
      fitTxt(S.banner, 50, y + h * 0.5, 9, w - 14, '#fff', { stroke: 'rgba(60,0,120,.7)', sw: 1.4 });
      cx.fillStyle = 'rgba(255,255,255,.16)'; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + w * 0.5, y); cx.lineTo(x + w * 0.3, y + h); cx.lineTo(x, y + h); cx.closePath(); cx.fill();
      glow(50, y + h / 2, 55, '170,90,255', 0.18);
    },
  },
  glowsticks: {   // 光る棒をふる観客
    draw(V) {
      standCrowd([{ y: 52, size: 0.85, gap: 3.6 }, { y: 56.6, size: 0.95, gap: 4.1 }, { y: 61.4, size: 1.1, gap: 4.7 }], EX0 - 5, EX1 + 5, V.crowd.shirts, 91, { stick: 0.4 });
    },
  },
  cameras: {   // テレビカメラとカメラマン
    draw() {
      for (const [x, dir] of [[10, 1], [90, -1]]) {
        drawKid(cx, x - dir * 7.5, 66.5, 0.52, { shirt: '#14141c', shorts: '#14141c', legs: '#14141c', arm: '#14141c', hair: '#222', collar: '#14141c', band: false, face: 0 });
        cx.strokeStyle = '#2a2f3a'; cx.lineWidth = 0.7; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(x, 57); cx.lineTo(x - 4, 66.8); cx.moveTo(x, 57); cx.lineTo(x + 4, 66.8); cx.moveTo(x, 57); cx.lineTo(x, 67.6); cx.stroke();
        cx.fillStyle = '#2a2f3a'; rr(cx, x - 6, 50.2, 12, 7, 1); cx.fill();
        cx.fillStyle = '#3a4150'; rr(cx, x - 4.5, 48.6, 9, 2.6, 0.8); cx.fill();
        const lx = dir > 0 ? x + 5.4 : x - 9.2;
        cx.fillStyle = '#14161c'; rr(cx, lx, 51.4, 3.8, 4.4, 0.6); cx.fill();
        cx.fillStyle = '#7ad0ff'; cx.beginPath(); cx.arc(lx + (dir > 0 ? 3.6 : 0.2), 53.6, 1.15, 0, 6.283); cx.fill();
      }
    },
  },
  live: {   // 画面の「LIVE」マーク（点滅）
    dyn(V) {
      cx.fillStyle = '#d2242a'; rr(cx, 4, 39.6, 15.5, 5.2, 1); cx.fill();
      cx.fillStyle = '#fff'; cx.globalAlpha = 0.55 + 0.45 * (Math.sin(nowT * 5) > 0 ? 1 : 0); cx.beginPath(); cx.arc(7.4, 42.2, 1, 0, 6.283); cx.fill(); cx.globalAlpha = 1;
      txt(STR.venues[V.i].sign, 13.4, 42.3, 3.4, '#fff');
    },
  },
  // スタジアム
  towers: {   // ナイター照明
    draw() {
      for (const x of [6, 94, EX0 + 8, EX1 - 8]) {
        cx.fillStyle = '#4a4f66'; cx.fillRect(x - 0.6, 34, 1.2, 28);
        cx.fillStyle = '#d8dae6'; rr(cx, x - 5, 30, 10, 6, 0.8); cx.fill();
        cx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { cx.beginPath(); cx.arc(x - 3.4 + i * 2.27, 31.8 + j * 2.3, 0.7, 0, 6.283); cx.fill(); }
        glow(x, 33, 22, '230,240,255', 0.30);
      }
    },
  },
  worldFlags: {   // 万国旗
    draw() {
      cx.strokeStyle = 'rgba(200,210,240,.5)'; cx.lineWidth = 0.3; cx.beginPath(); cx.moveTo(EX0 - 5, 43.4); cx.lineTo(EX1 + 5, 43.4); cx.stroke();
      let k = 0;
      for (let x = Math.floor((EX0 - 5) / 8.4) * 8.4; x < EX1 + 5; x += 8.4, k++) { flagAt(x, 43.6, 7, 4.7, k * 3 + (k >> 2)); }
    },
  },
  // 月面
  stars: {
    draw(V) {
      const R = mulberry32(V.i * 131 + 7), n = V.kind === 'stadium' ? 70 : 190;
      for (let k = 0; k < n; k++) {
        const x = EX0 - 5 + R() * WIDE(), y = EY0 - 5 + R() * (V.kind === 'stadium' ? 40 - (EY0 - 5) : 62 - (EY0 - 5)), r = 0.12 + R() * 0.3;
        cx.fillStyle = 'rgba(255,255,255,' + (0.35 + R() * 0.65) + ')'; cx.fillRect(x, y, r * 1.6, r * 1.6);
      }
    },
  },
  earth: {   // 地球
    draw() {
      const x = 17, y = 49.5, r = 8.8;
      glow(x, y, r * 1.9, '120,170,255', 0.28);
      const g = cx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, '#6aa8ff'); g.addColorStop(1, '#14388a');
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
      cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.clip();
      cx.fillStyle = '#3f9a52';
      cx.beginPath(); cx.ellipse(x - 2.6, y - 2, 3, 2.2, 0.5, 0, 6.283); cx.ellipse(x + 2.8, y + 1.8, 2.6, 3.2, -0.3, 0, 6.283); cx.ellipse(x - 1, y + 5, 2, 1.4, 0, 0, 6.283); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.55)';
      cx.beginPath(); cx.ellipse(x - 3, y + 0.4, 4, 0.9, -0.2, 0, 6.283); cx.ellipse(x + 2.2, y - 3.4, 3.2, 0.8, 0.3, 0, 6.283); cx.ellipse(x + 1, y + 3.6, 3.4, 0.8, -0.1, 0, 6.283); cx.fill();
      cx.fillStyle = 'rgba(0,0,20,.42)'; cx.beginPath(); cx.arc(x + r * 0.55, y + r * 0.2, r * 1.05, 0, 6.283); cx.fill();
      cx.restore();
    },
  },
  hills: {   // 月のなだらかな山
    draw() {
      const R = mulberry32(77);
      for (const [col, hmax, step] of [['#3b3b46', 6, 9], ['#4d4d59', 3.4, 6]]) {
        cx.fillStyle = col; cx.beginPath(); cx.moveTo(EX0 - 5, YH + 0.5);
        for (let x = EX0 - 5; x < EX1 + 8; x += step) cx.lineTo(x, YH - R() * hmax);
        cx.lineTo(EX1 + 8, YH + 0.5); cx.closePath(); cx.fill();
      }
    },
  },
  lander: {   // 着陸船
    draw() {
      const x = 66;
      cx.strokeStyle = '#9a9aa8'; cx.lineWidth = 0.6; cx.lineCap = 'round';
      cx.beginPath(); cx.moveTo(x - 4, 58); cx.lineTo(x - 8, 62.2); cx.moveTo(x + 4, 58); cx.lineTo(x + 8, 62.2); cx.moveTo(x, 58.5); cx.lineTo(x, 62.2); cx.stroke();
      cx.fillStyle = '#9a9aa8'; for (const dx of [-9, 0, 9]) cx.fillRect(x + dx - 1.2, 61.9, 2.4, 0.5);
      cx.fillStyle = '#d9a93a'; rr(cx, x - 5.5, 52.5, 11, 6.2, 1.2); cx.fill();
      cx.fillStyle = '#b9bcc8'; rr(cx, x - 3.8, 49.4, 7.6, 3.4, 1); cx.fill();
      cx.fillStyle = '#2d3a66'; cx.beginPath(); cx.arc(x - 1, 51.2, 1, 0, 6.283); cx.fill();
      cx.strokeStyle = '#b9bcc8'; cx.lineWidth = 0.3; cx.beginPath(); cx.moveTo(x + 3, 49.4); cx.lineTo(x + 4.6, 46.4); cx.stroke();
      cx.beginPath(); cx.arc(x + 4.6, 46, 1.2, 0, 6.283); cx.stroke();
    },
  },
  moonFlag: {   // 旗
    draw() {
      cx.strokeStyle = '#d8d8e0'; cx.lineWidth = 0.4; cx.beginPath(); cx.moveTo(40, 62.2); cx.lineTo(40, 49.6); cx.stroke();
      cx.fillStyle = '#f8f8f8'; cx.fillRect(40.2, 50, 8.4, 5.6);
      cx.fillStyle = '#d0242a'; cx.beginPath(); cx.arc(44.4, 52.8, 1.7, 0, 6.283); cx.fill();
    },
  },
  // 宇宙
  nebula: {
    draw() {
      cx.save(); cx.globalCompositeOperation = 'lighter';
      for (const [x, y, r, rgb, a] of [[18, 46, 70, '255,63,160', 0.22], [78, 54, 80, '47,160,255', 0.20], [50, 30, 90, '122,63,255', 0.22], [EX1 - 10, 44, 70, '255,170,63', 0.14], [EX0 + 10, 40, 70, '63,255,200', 0.12]]) glow(x, y, r, rgb, a);
      cx.restore();
    },
  },
  planet: {   // 輪のある星
    draw() {
      const x = 16, y = 50, r = 7.2;
      cx.save(); cx.translate(x, y); cx.rotate(-0.32);
      cx.strokeStyle = 'rgba(240,216,154,.55)'; cx.lineWidth = 1.1; cx.beginPath(); cx.ellipse(0, 0, 13, 3.4, 0, Math.PI, 6.283); cx.stroke();   // うしろ半分
      cx.restore();
      const g = cx.createRadialGradient(x - 2.5, y - 2.5, 1, x, y, r);
      g.addColorStop(0, '#f2c27a'); g.addColorStop(1, '#8a4a2a');
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
      cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.clip();
      cx.fillStyle = 'rgba(120,50,30,.3)'; cx.fillRect(x - r, y - 2, r * 2, 1.3); cx.fillRect(x - r, y + 2, r * 2, 1.7);
      cx.fillStyle = 'rgba(0,0,20,.38)'; cx.beginPath(); cx.arc(x + r * 0.55, y + r * 0.3, r * 1.05, 0, 6.283); cx.fill();
      cx.restore();
      cx.save(); cx.translate(x, y); cx.rotate(-0.32);
      cx.strokeStyle = 'rgba(240,216,154,.9)'; cx.lineWidth = 1.1; cx.beginPath(); cx.ellipse(0, 0, 13, 3.4, 0, 0, Math.PI); cx.stroke();   // 手前半分
      cx.restore();
    },
  },
  ufo: {   // 円盤（ゆっくり動く）
    dyn() {
      const x = 62 + Math.sin(nowT * 0.6) * 7, y = 47 + Math.sin(nowT * 1.3) * 1.2;
      cx.fillStyle = 'rgba(255,240,150,.10)'; cx.beginPath(); cx.moveTo(x - 2.4, y + 2); cx.lineTo(x + 2.4, y + 2); cx.lineTo(x + 9, 61); cx.lineTo(x - 9, 61); cx.closePath(); cx.fill();
      cx.fillStyle = '#7ad0e8'; cx.beginPath(); cx.ellipse(x, y - 0.6, 3.6, 3, 0, Math.PI, 6.283); cx.fill();
      cx.fillStyle = '#b9c0d8'; cx.beginPath(); cx.ellipse(x, y + 0.6, 8, 2.3, 0, 0, 6.283); cx.fill();
      cx.fillStyle = '#8a92b0'; cx.beginPath(); cx.ellipse(x, y + 1.2, 6.6, 1.3, 0, 0, Math.PI); cx.fill();
      for (let i = 0; i < 5; i++) { cx.fillStyle = (Math.floor(nowT * 4) + i) % 2 ? '#ffe03f' : '#ff3fa0'; cx.beginPath(); cx.arc(x - 5 + i * 2.5, y + 0.9, 0.5, 0, 6.283); cx.fill(); }
    },
  },
  twinkle: {   // またたく星
    dyn() {
      for (let i = 0; i < 46; i++) {
        const x = EX0 + ((i * 7919) % 1000) / 1000 * (EX1 - EX0), y = EY0 + ((i * 104729) % 1000) / 1000 * (60 - EY0);
        const a = 0.25 + 0.75 * Math.abs(Math.sin(nowT * (1.2 + (i % 5) * 0.5) + i));
        cx.fillStyle = 'rgba(255,255,255,' + a + ')'; cx.fillRect(x - 0.35, y - 0.12, 0.7, 0.24); cx.fillRect(x - 0.12, y - 0.35, 0.24, 0.7);
      }
    },
  },
};

// ---- 月面の宇宙飛行士・宇宙人（見ている人）----
function drawAstro(c, x, y, s, o) {
  o = o || {};
  c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 0.6, 7, 2, 0, 0, 6.283); c.fill();
  c.translate(0, -(o.hop || 0) * 5.5 - (o.bob || 0));
  c.strokeStyle = '#dcdce6'; c.lineWidth = 3.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, -11.5); c.lineTo(-3, -1.6); c.moveTo(2, -11.5); c.lineTo(3, -1.6); c.stroke();
  c.fillStyle = '#7a7a88'; c.fillRect(-5, -2, 4, 2); c.fillRect(1, -2, 4, 2);
  c.fillStyle = '#c8c8d4'; rr(c, -7.6, -26.5, 3.4, 13, 1); c.fill();
  c.fillStyle = o.col || '#f2f2f6'; c.strokeStyle = '#b8bccc'; c.lineWidth = 0.5; rr(c, -5.8, -26, 11.6, 13.5, 3); c.fill(); c.stroke();
  c.fillStyle = '#3a6ad0'; rr(c, -2.8, -23.6, 5.6, 3.4, 0.6); c.fill();
  c.fillStyle = '#ff6a4a'; c.fillRect(-1.6, -22.6, 1.1, 1.1); c.fillStyle = '#7ae070'; c.fillRect(0.6, -22.6, 1.1, 1.1);
  c.strokeStyle = '#eeeef4'; c.lineWidth = 2.8;
  c.beginPath();
  if (o.cheer) { const b = Math.sin(o.ph || 0) * 2; c.moveTo(-5.2, -23.5); c.lineTo(-8.6, -31 - b); c.moveTo(5.2, -23.5); c.lineTo(8.6, -31 + b); }
  else { c.moveTo(-5.2, -23.5); c.lineTo(-8.8, -16.5); c.moveTo(5.2, -23.5); c.lineTo(8.8, -16.5); }
  c.stroke();
  c.fillStyle = '#8a8a98'; c.beginPath(); if (o.cheer) { const b = Math.sin(o.ph || 0) * 2; c.arc(-8.6, -31 - b, 1.5, 0, 6.283); c.moveTo(10.1, -31 + b); c.arc(8.6, -31 + b, 1.5, 0, 6.283); } else { c.arc(-8.8, -16.5, 1.5, 0, 6.283); c.moveTo(10.3, -16.5); c.arc(8.8, -16.5, 1.5, 0, 6.283); } c.fill();
  const hy = -31;
  c.fillStyle = '#f4f4f8'; c.strokeStyle = '#b8bccc'; c.lineWidth = 0.5; c.beginPath(); c.arc(0, hy, 6.7, 0, 6.283); c.fill(); c.stroke();
  c.fillStyle = ['#e8b040', '#2d3a66', '#3a9aaa'][o.vis || 0]; c.beginPath(); c.ellipse(0.5, hy + 0.3, 5, 4.3, 0, 0, 6.283); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.6; c.beginPath(); c.arc(0.5, hy + 0.3, 3.4, 3.6, 4.5); c.stroke();
  c.restore();
}
function drawAlien(c, x, y, s, o) {
  o = o || {};
  const col = o.col || '#8fe07a';
  c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 0.6, 6.5, 2, 0, 0, 6.283); c.fill();
  c.translate(0, -(o.hop || 0) * 5.5 - (o.bob || 0));
  c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(-2, -11); c.lineTo(-3.4, -1); c.moveTo(2, -11); c.lineTo(3.4, -1); c.stroke();
  c.fillStyle = col; c.beginPath(); c.ellipse(-3.8, -0.6, 2.2, 1, 0, 0, 6.283); c.ellipse(3.8, -0.6, 2.2, 1, 0, 0, 6.283); c.fill();
  c.fillStyle = col; c.beginPath(); c.ellipse(0, -18.5, 5, 8, 0, 0, 6.283); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(0, -17, 3, 5, 0, 0, 6.283); c.fill();
  c.strokeStyle = col; c.lineWidth = 1.7; c.beginPath();
  if (o.cheer) { const b = Math.sin(o.ph || 0) * 2; c.moveTo(-4.4, -22); c.lineTo(-9, -29 - b); c.moveTo(4.4, -22); c.lineTo(9, -29 + b); }
  else { c.moveTo(-4.4, -22); c.lineTo(-8.5, -15); c.moveTo(4.4, -22); c.lineTo(8.5, -15); }
  c.stroke();
  const hy = -31;
  c.fillStyle = col; c.beginPath(); c.ellipse(0, hy, 6.8, 7.2, 0, 0, 6.283); c.fill();
  c.strokeStyle = col; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-2.4, hy - 6.4); c.lineTo(-4.6, hy - 11.4); c.moveTo(2.4, hy - 6.4); c.lineTo(4.6, hy - 11.4); c.stroke();
  c.fillStyle = '#ff5a9a'; c.beginPath(); c.arc(-4.6, hy - 11.6, 1.3, 0, 6.283); c.arc(4.6, hy - 11.6, 1.3, 0, 6.283); c.fill();
  const n = o.eyes || 2, xs = n === 1 ? [0] : n === 2 ? [-2.8, 2.8] : [-3.6, 0, 3.6];
  for (const ex of xs) {
    c.fillStyle = '#1a1030'; c.beginPath(); c.ellipse(ex, hy + 0.5, n === 1 ? 2.6 : 1.7, n === 1 ? 3.3 : 2.4, 0, 0, 6.283); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 0.5, hy - 0.4, 0.6, 0, 6.283); c.fill();
  }
  c.strokeStyle = '#1a1030'; c.lineWidth = 0.55; c.beginPath(); c.arc(0, hy + 4.2, 1.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.restore();
}

// ---- 記録係の顔（記録板の左。会場ごとに別人。段階が上がると表情が崩れていく）----
const recGlass = (x, y, lv, col) => {   // 眼鏡と目（段階 2 でまん丸、4 でふるえる）
  const ey = y + 1.0, big = lv >= 2 ? 2.35 : 1.8, wob = lv >= 4 ? Math.sin(nowT * 40) * 0.25 : 0;
  cx.strokeStyle = col || '#2b2b3a'; cx.lineWidth = 0.6; cx.fillStyle = '#fff';
  cx.beginPath(); cx.arc(x - 2.6, ey, big, 0, 6.283); cx.moveTo(x + 2.6 + big, ey); cx.arc(x + 2.6, ey, big, 0, 6.283); cx.moveTo(x - 0.8, ey); cx.lineTo(x + 0.8, ey);
  cx.fill(); cx.stroke();
  cx.fillStyle = '#2b2b3a';
  cx.beginPath(); cx.arc(x - 2.6 + wob, ey, lv >= 2 ? 0.5 : 0.8, 0, 6.283); cx.arc(x + 2.6 + wob, ey, lv >= 2 ? 0.5 : 0.8, 0, 6.283); cx.fill();
};
const recDots = (x, y, lv, brow) => {   // 眼鏡なしの目（まゆ毛つき）
  const wob = lv >= 4 ? Math.sin(nowT * 40) * 0.25 : 0, ey = y + 1.0, rr_ = lv >= 2 ? 1.15 : 0.85;
  cx.fillStyle = '#2b2b3a'; cx.beginPath(); cx.arc(x - 2.6 + wob, ey, rr_, 0, 6.283); cx.arc(x + 2.6 + wob, ey, rr_, 0, 6.283); cx.fill();
  cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.6; cx.lineCap = 'round'; cx.beginPath();
  const up = lv >= 2 ? -1.6 : 0, tilt = brow ? 0.9 : 0;
  cx.moveTo(x - 4.2, ey - 2.2 + up + tilt); cx.lineTo(x - 1.2, ey - 2.4 + up - tilt); cx.moveTo(x + 4.2, ey - 2.2 + up + tilt); cx.lineTo(x + 1.2, ey - 2.4 + up - tilt); cx.stroke();
};
const recMouth = (x, y, lv, fin) => {
  cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.6; cx.beginPath();
  if (lv >= 5) { cx.fillStyle = '#7a2a2a'; cx.ellipse(x, y + 5.3, 1.6, 2.1, 0, 0, 6.283); cx.fill(); }
  else if (lv >= 2) { cx.arc(x, y + 5, 1.1, 0, 6.283); cx.stroke(); }
  else if (fin) { cx.moveTo(x - 1.4, y + 5); cx.lineTo(x + 1.4, y + 5); cx.stroke(); }
  else { cx.arc(x, y + 3.9, 1.5, 0.2 * Math.PI, 0.8 * Math.PI); cx.stroke(); }
};
const recSweat = (x, y, r, lv) => {
  if (lv < 3) return;
  cx.fillStyle = '#7ad0ff'; cx.beginPath(); cx.moveTo(x + r - 0.4, y - 2); cx.quadraticCurveTo(x + r + 1.8, y + 1.5, x + r - 0.4, y + 2.3); cx.quadraticCurveTo(x + r - 2.4, y + 1.5, x + r - 0.4, y - 2); cx.fill();
};
const recWhistle = (x, y) => { cx.fillStyle = '#e8c030'; cx.beginPath(); cx.arc(x - 3, y + 8.2, 1, 0, 6.283); cx.fill(); };
const recBinder = (x, y, lv) => {   // バインダー、段階 5 からは電卓
  if (lv >= 5) {
    cx.fillStyle = '#4a4f5c'; rr(cx, x + 1, y + 8, 7.5, 7.5, 0.8); cx.fill();
    cx.fillStyle = '#9fe3b0'; cx.fillRect(x + 1.8, y + 8.7, 5.9, 2);
    cx.fillStyle = '#e8e8e8';
    for (let i = 0; i < 6; i++) cx.fillRect(x + 1.9 + (i % 3) * 2, y + 11.6 + Math.floor(i / 3) * 1.8, 1.5, 1.1);
  } else {
    cx.fillStyle = '#8a6a3a'; rr(cx, x + 1.5, y + 8, 6.2, 7.8, 0.8); cx.fill();
    cx.fillStyle = '#fff'; cx.fillRect(x + 2.3, y + 9.2, 4.6, 6);
  }
};
const recHead = (x, y, r, skin) => { cx.fillStyle = skin || '#f3c8a0'; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill(); };
const recHair = (x, y, r, col) => { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y - 0.5, r + 0.4, Math.PI * 1.02, Math.PI * 1.98); cx.closePath(); cx.fill(); };
const recSuit = (x, y, col, tie) => {   // 肩とえり
  cx.fillStyle = col; rr(cx, x - 7, y + 8.2, 14, 6.4, 2); cx.fill();
  cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(x - 2.4, y + 8.2); cx.lineTo(x, y + 11.6); cx.lineTo(x + 2.4, y + 8.2); cx.closePath(); cx.fill();
  if (tie) { cx.fillStyle = tie; cx.beginPath(); cx.moveTo(x - 0.8, y + 9); cx.lineTo(x + 0.8, y + 9); cx.lineTo(x + 1.1, y + 13); cx.lineTo(x, y + 14); cx.lineTo(x - 1.1, y + 13); cx.closePath(); cx.fill(); }
};

const REC_DRAW = {
  teacher(x, y, r, lv, fin) {   // 担任の先生（v1 のまま）
    recHead(x, y, r);
    cx.fillStyle = '#2c4aa0'; cx.beginPath(); cx.arc(x, y - 0.5, r + 0.5, Math.PI * 1.02, Math.PI * 1.98); cx.closePath(); cx.fill();
    cx.fillRect(x - r - 2.2, y - 0.6, r * 2 + 4.4, 1.3);
    recGlass(x, y, lv); recMouth(x, y, lv, fin); recSweat(x, y, r, lv); recWhistle(x, y); recBinder(x, y, lv);
  },
  teachers(x, y, r, lv, fin) {   // 学年の先生たち：うしろから、ほかの先生がのぞく
    for (const [dx, dy, hc] of [[-8.6, 2.6, '#777'], [8.8, -0.6, '#3a2a22']]) {
      recHead(x + dx, y + dy, r * 0.74, '#e9bd94'); recHair(x + dx, y + dy, r * 0.74, hc);
      cx.fillStyle = '#2b2b3a'; cx.beginPath(); cx.arc(x + dx - 1.7, y + dy + 0.8, 0.55, 0, 6.283); cx.arc(x + dx + 1.7, y + dy + 0.8, 0.55, 0, 6.283); cx.fill();
      cx.strokeStyle = '#2b2b3a'; cx.lineWidth = 0.45; cx.beginPath(); cx.arc(x + dx, y + dy + 3.4, lv >= 2 ? 1 : 0.9, 0, lv >= 2 ? 6.283 : Math.PI); cx.stroke();
    }
    recHead(x, y, r); recHair(x, y, r, '#8a8a92');
    recGlass(x, y, lv); recMouth(x, y, lv, fin); recSweat(x, y, r, lv); recWhistle(x, y); recBinder(x, y, lv);
  },
  megaphone(x, y, r, lv, fin) {   // 校内大会：メガホンの先生
    recHead(x, y, r);
    cx.fillStyle = '#d2382f'; cx.beginPath(); cx.arc(x, y - 0.5, r + 0.5, Math.PI * 1.02, Math.PI * 1.98); cx.closePath(); cx.fill();
    cx.fillRect(x - r - 2.2, y - 0.6, r * 2 + 4.4, 1.3);
    recGlass(x, y, lv); recMouth(x, y, lv, fin); recSweat(x, y, r, lv); recWhistle(x, y);
    cx.fillStyle = '#f4f4f4'; cx.beginPath(); cx.moveTo(x + 1.2, y + 10.2); cx.lineTo(x + 9.6, y + 6.6); cx.lineTo(x + 9.6, y + 14.6); cx.closePath(); cx.fill();
    cx.fillStyle = '#d2382f'; cx.beginPath(); cx.moveTo(x + 5.4, y + 8.4); cx.lineTo(x + 9.6, y + 6.6); cx.lineTo(x + 9.6, y + 14.6); cx.lineTo(x + 5.4, y + 12.4); cx.closePath(); cx.fill();
  },
  referee(x, y, r, lv, fin) {   // 審判：黒い帽子・笛・しま模様・カード
    recHead(x, y, r);
    cx.fillStyle = '#1b1b22'; cx.beginPath(); cx.arc(x, y - 0.6, r + 0.5, Math.PI * 1.02, Math.PI * 1.98); cx.closePath(); cx.fill();
    cx.fillRect(x - r - 2.6, y - 0.6, r * 2 + 5.2, 1.5);
    recDots(x, y, lv, true); recMouth(x, y, lv, fin); recSweat(x, y, r, lv);
    cx.fillStyle = '#e8c030'; cx.beginPath(); cx.arc(x + 1.4, y + 4.4, 1.1, 0, 6.283); cx.fill(); cx.fillRect(x + 1.2, y + 3.8, 3.4, 1.1);
    cx.fillStyle = '#f2f2f2'; rr(cx, x - 6.5, y + 8.2, 13, 6.4, 2); cx.fill();
    cx.fillStyle = '#1b1b22'; for (let i = 0; i < 6; i++) cx.fillRect(x - 5.4 + i * 2.1, y + 8.4, 1, 6);
    cx.fillStyle = '#f2c61e'; rr(cx, x + 5.2, y + 8, 3.2, 4.6, 0.4); cx.fill();
    cx.fillStyle = '#d2242a'; cx.save(); cx.translate(x + 8.8, y + 9); cx.rotate(0.25); rr(cx, 0, 0, 3.2, 4.6, 0.4); cx.fill(); cx.restore();
  },
  judge(x, y, r, lv, fin) {   // 審査員：白髪・金の眼鏡・蝶ネクタイ・採点札
    recHead(x, y, r); recHair(x, y, r, '#a0a0ae');
    recGlass(x, y, lv, '#9a7a2a'); recMouth(x, y, lv, fin); recSweat(x, y, r, lv);
    recSuit(x, y, '#222a44', null);
    cx.fillStyle = '#d2242a'; cx.beginPath(); cx.moveTo(x, y + 9.6); cx.lineTo(x - 2.4, y + 8.4); cx.lineTo(x - 2.4, y + 10.8); cx.closePath(); cx.moveTo(x, y + 9.6); cx.lineTo(x + 2.4, y + 8.4); cx.lineTo(x + 2.4, y + 10.8); cx.closePath(); cx.fill();
    cx.fillStyle = '#fff'; cx.strokeStyle = '#7a1f2e'; cx.lineWidth = 0.4; rr(cx, x + 3.6, y + 7.6, 6.4, 5.2, 0.6); cx.fill(); cx.stroke();
    txt(lv >= 5 ? '0' : '10', x + 6.8, y + 10.3, 3.2, '#d2242a');
  },
  announcer(x, y, r, lv, fin) {   // 実況アナウンサー：ヘッドセットとマイク・髪型バッチリ
    recHead(x, y, r); recHair(x, y, r, '#5a3a22');
    cx.fillStyle = '#5a3a22'; cx.beginPath(); cx.arc(x + 2.6, y - r - 0.3, 2.6, 0, 6.283); cx.fill();
    recDots(x, y, lv, false);
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x - 3.0, y + 0.5, 0.35, 0, 6.283); cx.arc(x + 2.2, y + 0.5, 0.35, 0, 6.283); cx.fill();
    cx.strokeStyle = '#222'; cx.lineWidth = 0.9; cx.beginPath(); cx.arc(x, y - 0.4, r + 0.9, Math.PI * 1.05, Math.PI * 1.95); cx.stroke();
    cx.fillStyle = '#222'; cx.beginPath(); cx.arc(x - r - 0.6, y + 1, 1.5, 0, 6.283); cx.fill();
    cx.lineWidth = 0.6; cx.beginPath(); cx.moveTo(x - r - 0.6, y + 2.2); cx.quadraticCurveTo(x - r, y + 6, x - 3, y + 5.4); cx.stroke();
    cx.fillStyle = '#e0356f'; cx.beginPath(); cx.arc(x - 3, y + 5.4, 0.95, 0, 6.283); cx.fill();
    recMouth(x, y - 0.3, lv, fin);
    recSweat(x, y, r, lv);
    recSuit(x, y, '#2a3a7a', '#e0356f');
    cx.fillStyle = '#222'; rr(cx, x + 3.4, y + 9.6, 2.4, 5.6, 1); cx.fill();
    cx.fillStyle = '#e0356f'; cx.beginPath(); cx.arc(x + 4.6, y + 9, 1.9, 0, 6.283); cx.fill();
  },
  intl(x, y, r, lv, fin) {   // 国際審判：イヤホン・ルールブック・ネクタイ
    recHead(x, y, r, '#e8b890'); recHair(x, y, r, '#2a1c16');
    recGlass(x, y, lv, '#4a4a58'); recMouth(x, y, lv, fin); recSweat(x, y, r, lv);
    cx.fillStyle = '#e8d8c0'; cx.beginPath(); cx.arc(x + r - 0.1, y + 1.4, 1, 0, 6.283); cx.fill();
    cx.strokeStyle = '#e8d8c0'; cx.lineWidth = 0.35; cx.beginPath(); cx.moveTo(x + r, y + 2.4); cx.quadraticCurveTo(x + r + 2, y + 7, x + 6, y + 9); cx.stroke();
    recSuit(x, y, '#1c1c28', '#2c4aa0');
    cx.fillStyle = '#2c4aa0'; rr(cx, x + 1.8, y + 8.4, 7.8, 8.6, 0.8); cx.fill();
    cx.fillStyle = '#f6f2e0'; cx.fillRect(x + 2.8, y + 15.6, 6.2, 1.1);
    cx.strokeStyle = '#f2c61e'; cx.lineWidth = 0.4; cx.beginPath(); cx.arc(x + 5.7, y + 12, 2.2, 0, 6.283); cx.moveTo(x + 3.5, y + 12); cx.lineTo(x + 7.9, y + 12); cx.moveTo(x + 5.7, y + 9.8); cx.lineTo(x + 5.7, y + 14.2); cx.stroke();
  },
  astro(x, y, r, lv, fin) {   // 宇宙飛行士：ヘルメット・無線・タブレット
    cx.strokeStyle = '#c8c8d4'; cx.lineWidth = 0.5; cx.beginPath(); cx.moveTo(x + r + 0.6, y - r + 0.4); cx.lineTo(x + r + 3.4, y - r - 4); cx.stroke();
    cx.fillStyle = Math.sin(nowT * 6) > 0 ? '#ff5a4a' : '#7a2a2a'; cx.beginPath(); cx.arc(x + r + 3.4, y - r - 4.2, 0.9, 0, 6.283); cx.fill();
    cx.fillStyle = '#f4f4f8'; cx.strokeStyle = '#b8bccc'; cx.lineWidth = 0.5; cx.beginPath(); cx.arc(x, y, r + 1.9, 0, 6.283); cx.fill(); cx.stroke();
    cx.fillStyle = '#f3c8a0'; cx.beginPath(); cx.ellipse(x, y + 0.3, r * 0.92, r * 0.88, 0, 0, 6.283); cx.fill();
    recDots(x, y, lv, false); recMouth(x, y, lv, fin);
    cx.fillStyle = 'rgba(232,176,64,.42)'; cx.beginPath(); cx.ellipse(x, y + 0.3, r * 0.95, r * 0.9, 0, 0, 6.283); cx.fill();
    cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth = 0.6; cx.beginPath(); cx.arc(x, y + 0.3, r * 0.7, 3.5, 4.5); cx.stroke();
    recSweat(x + 1.4, y, r, lv);
    cx.fillStyle = '#e8e8ee'; rr(cx, x - 6.6, y + 8.4, 13, 6.4, 2); cx.fill();
    cx.fillStyle = '#3a6ad0'; cx.fillRect(x - 3.6, y + 10, 4.6, 2.6);
    cx.fillStyle = Math.sin(nowT * 4) > 0 ? '#ff5a4a' : '#7a2a2a'; cx.beginPath(); cx.arc(x + 3, y + 11.3, 0.8, 0, 6.283); cx.fill();
    cx.fillStyle = '#2b2f40'; rr(cx, x + 2.6, y + 9, 7.4, 6.4, 0.8); cx.fill();
    cx.fillStyle = '#9fe3b0'; cx.fillRect(x + 3.4, y + 9.8, 5.8, 4.6);
    cx.strokeStyle = '#2b2f40'; cx.lineWidth = 0.4; cx.beginPath(); cx.moveTo(x + 4.2, y + 12); cx.lineTo(x + 8.4, y + 12); cx.stroke();
  },
  alien(x, y, r, lv, fin) {   // 宇宙人のポポ：腕が 6本。ケタを読み間違える
    const col = '#8fe07a', wob = lv >= 4 ? Math.sin(nowT * 40) * 0.3 : 0;
    cx.strokeStyle = col; cx.lineWidth = 1.1; cx.lineCap = 'round';
    cx.fillStyle = '#6ac85a'; cx.beginPath(); cx.ellipse(x, y + 12, 5.4, 4.4, 0, 0, 6.283); cx.fill();
    cx.beginPath();   // 左の腕 3本
    for (const [ex, ey] of [[-9.4, 8], [-8.2, 12.6], [-10.4, 15.6]]) { cx.moveTo(x - 4, y + 10.4); cx.quadraticCurveTo(x - 7, y + 12, x + ex * 0.9, y + ey); }
    cx.stroke();
    cx.beginPath(); cx.moveTo(x - 2.6, y - r - 0.4); cx.lineTo(x - 5, y - r - 4.4); cx.moveTo(x + 2.6, y - r - 0.4); cx.lineTo(x + 5, y - r - 4.4); cx.stroke();
    cx.fillStyle = '#ff5a9a'; cx.beginPath(); cx.arc(x - 5, y - r - 4.6, 1.2, 0, 6.283); cx.arc(x + 5, y - r - 4.6, 1.2, 0, 6.283); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(x, y, r * 1.08, r * 1.1, 0, 0, 6.283); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.25)'; cx.beginPath(); cx.ellipse(x - 1.6, y - 2.6, 2.6, 1.4, -0.4, 0, 6.283); cx.fill();
    const big = lv >= 2 ? 1.25 : 1;
    for (const ex of [-3.6, 0, 3.6]) {
      cx.fillStyle = '#1a1030'; cx.beginPath(); cx.ellipse(x + ex + wob, y + 0.6, 1.5 * big, 2.2 * big, 0, 0, 6.283); cx.fill();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x + ex - 0.4 + wob, y - 0.2, 0.5, 0, 6.283); cx.fill();
    }
    cx.strokeStyle = '#1a1030'; cx.lineWidth = 0.55; cx.beginPath();
    if (lv >= 5) { cx.fillStyle = '#5a1a4a'; cx.ellipse(x, y + 5.2, 1.5, 1.9, 0, 0, 6.283); cx.fill(); }
    else if (lv >= 2) { cx.arc(x, y + 5, 1, 0, 6.283); cx.stroke(); }
    else { cx.arc(x, y + 3.9, 1.5, 0.2 * Math.PI, 0.8 * Math.PI); cx.stroke(); }
    recSweat(x, y, r + 0.4, lv);
    cx.strokeStyle = col; cx.lineWidth = 1.1;   // 右の腕 3本が持つもの
    cx.beginPath(); cx.moveTo(x + 4, y + 10.4); cx.lineTo(x + 3, y + 12); cx.moveTo(x + 4.6, y + 11.6); cx.lineTo(x + 8, y + 13); cx.moveTo(x + 4.4, y + 13); cx.lineTo(x + 10, y + 17); cx.stroke();
    recBinder(x + 1.2, y + 0.4, lv);
    cx.fillStyle = '#d2242a'; cx.beginPath(); cx.arc(x + 10.4, y + 17.4, 1.2, 0, 6.283); cx.fill();
  },
};
function drawRecorder(x, y, r, type) {
  const lv = Game.lvl, fin = Game.mode === 'finish' || Game.mode === 'over';
  (REC_DRAW[type] || REC_DRAW.teacher)(x, y, r, lv, fin);
}
