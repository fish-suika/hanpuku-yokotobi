// ===== 言語（日本語 / 英語）=====
// ブラウザの言語が ja で始まれば日本語、それ以外は英語（ほかのポータル版と同じ規則）。?lang=ja / ?lang=en で上書きできる（確認用）。
// PORTAL はビルドで埋め込む（false＝GitHub 版：Xの共有ボタンあり／true＝ポータル版：外部リンク・共有ボタンなし）
const PORTAL = __PORTAL__;
function pickLang(nav, query) {
  if (query === 'ja' || query === 'en') return query;
  return /^ja/i.test(nav || '') ? 'ja' : 'en';
}
const LANG = (function () {
  let q = '';
  try { q = new URLSearchParams(location.search).get('lang') || ''; } catch (_) {}
  try { if (typeof window !== 'undefined' && window.__FORCE_LANG) q = window.__FORCE_LANG; } catch (_) {}
  let nav = '';
  try { nav = navigator.language || ''; } catch (_) {}
  return pickLang(nav, q);
})();
const EN = LANG === 'en';
