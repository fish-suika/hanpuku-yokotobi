// ===== 共有（記録用紙のカード・Xへの投稿）。GitHub 版だけ。ポータル版では 65-share-stub.js に置き換わり、ボタンも外部リンクもない =====
const SHARE_URL = 'https://fish-suika.github.io/hanpuku-yokotobi/';
function shareText() {
  const r = resultInfo(), win = !!(App.res && App.res.win);
  return STR.share.text(ph(STR.tournaments[App.idx].name), fmt(r.rec), r.steps, r.judge, r.maxN, win);
}
function shareUrl() {
  const web = /^https?:/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)/.test(location.host);
  return web ? location.origin + location.pathname : SHARE_URL;
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
    c.textAlign = 'center';
    const jl = r.judgeRaw.split('|');
    if (jl.length > 1) { c.font = '900 40px ' + FONT; jl.forEach((l, i) => c.fillText(l, 0, 14 + (i - (jl.length - 1) / 2) * 46)); }
    else { c.font = '900 ' + (r.judge.length > 1 ? 40 : 110) + 'px ' + FONT; c.fillText(r.judge, 0, r.judge.length > 1 ? 14 : 38); }
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
function openTweet(text, url) {
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
}
function shareEnding() {
  const text = STR.ending.shareText(fmt(SAVE.best[Tourney.count() - 1])), url = shareUrl();
  try { if (navigator.share) { navigator.share({ text, url }).catch(() => {}); return; } } catch (_) {}
  openTweet(text, url);
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
  openTweet(text, url);
}
function bindShare() {
  $('share').addEventListener('click', share);
  $('endShare').addEventListener('click', shareEnding);
}
