// ===== ポータル版：共有ボタンなし・外部リンクなし（65-share.js の代わりに入る）=====
function bindShare() {
  for (const id of ['share', 'endShare']) { const el = $(id); if (el && el.parentNode) el.parentNode.removeChild(el); }
}
