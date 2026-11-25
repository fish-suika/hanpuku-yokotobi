#!/bin/sh
# 分割ソースを1枚のHTMLに結合する
#   sh build.sh          … 通常版（GitHub Pages 用。ブラウザの言語で日本語／英語・Xの共有ボタンあり）
#   sh build.sh portal   … ポータル版（CrazyGames / itch.io 用。日本語／英語の自動切替・共有ボタンも外部リンクもなし・index.html 1枚）
cd "$(dirname "$0")"

COMMON="src/00-head.html src/10-config.js src/11-lang.js src/12-strings.js src/15-venues.js src/20-logic.js src/22-shop.js src/25-tourney.js src/40-render.js src/42-venues-art.js src/45-ending.js src/50-audio.js src/60-ui.js"
TAIL="src/90-boot.js src/99-tail.html"

if [ "$1" = "portal" ]; then
  OUT="../monetize/portal/hanpuku-yokotobi"
  mkdir -p "$OUT"
  cat $COMMON src/65-share-stub.js $TAIL | sed -e 's/__PORTAL__/true/' -e 's#<button id="share"[^>]*></button>##' -e 's#<button id="endShare"[^>]*></button>##' > "$OUT/index.html"   # 共有ボタンの HTML も出さない
  echo "built portal: $OUT/index.html ($(wc -c < "$OUT/index.html") bytes)"
  # 提出用の zip（ほかの3本と同じく、index.html だけを入れる）。zip コマンドがない PC でも動くよう Python の zipfile を使う
  ZIP="../monetize/portal/hanpuku-yokotobi.zip"
  rm -f "$ZIP"
  if command -v zip >/dev/null 2>&1; then
    (cd "$OUT" && zip -q -X "../hanpuku-yokotobi.zip" index.html)
  else
    python -I -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED); z.write(sys.argv[2],'index.html'); z.close()" "$ZIP" "$OUT/index.html" \
      || echo "zip を作れませんでした（zip も python もありません）。$OUT/index.html を手で zip にしてください"
  fi
  [ -f "$ZIP" ] && echo "zip: $ZIP ($(wc -c < "$ZIP") bytes)"
  exit 0
fi

# --- 本体 ---
cat $COMMON src/65-share.js $TAIL | sed -e 's/__PORTAL__/false/' > hanpuku-yokotobi.html
cp hanpuku-yokotobi.html index.html   # GitHub Pages はルートの index.html を配信する

# 検証ページ（画面を使わないロジックだけ）
cat src/verify-head.html \
    src/10-config.js \
    src/11-lang.js \
    src/12-strings.js \
    src/15-venues.js \
    src/20-logic.js \
    src/22-shop.js \
    src/25-tourney.js \
    src/verify-tests.js \
    src/99-tail.html | sed -e 's/__PORTAL__/false/' > verify.html

echo "built hanpuku-yokotobi.html + index.html ($(wc -c < hanpuku-yokotobi.html) bytes)"
echo "built verify.html ($(wc -c < verify.html) bytes)"
