// ===== 画面に出す言葉（ここに集める。Phase 4 で英語を足す）=====
// 「|」は文節の切れ目。画面では文節ごとに改行しない塊（.nb）になる。ph() で「|」を取れば普通の文字列
const STR = {
  title: { name: '分身|反復横とび', catch: '20秒で|何人 分身できる？', tap: 'タップで スタート' },

  list: {
    head: '大会の一覧', back: 'タイトルへ',
    progress: (n, m) => n + ' / ' + m,
    vs: 'VS', unit: '回', best: 'ベスト', noBest: 'ベスト ---',
    tagWon: '勝ち', tagNext: '挑戦！', tagLocked: 'ロック', hidden: '？？？',
    tickets: '引換券', shop: '購買部',
  },

  // 購買部。品物は 6 つ。name・desc（何が強くなるか 1 行）・lb（効果の見出し）・v（段階ごとの効果の短い表示。引数は Shop.effect の値）。画面には「lb v → 次の v」
  shop: {
    head: '購買部', tickets: '引換券', back: '大会の一覧', go: 'もう一回',
    price: n => n, max: 'MAX', soldOut: '最大', poor: 'たりない', lock: 'ロック',
    gate: name => name + 'に|勝つと|買える',
    arrow: ' → ',
    items: {
      shoes: { name: '体育館シューズ', desc: '勢いが|長もち|する', lb: '長もち', v: e => '×' + e.mul.toFixed(1) },
      clothes: { name: '新しい体操着', desc: '分身が|出やすく|なる', lb: '必要な速さ', v: e => e.mul < 1 ? '-' + Math.round((1 - e.mul) * 100) + '%' : '±0%' },
      fall: { name: '受け身の練習', desc: '転んでも|立ち直りが|早い', lb: '', v: e => '-' + e.drop + '段 ' + e.secs.toFixed(2) + '秒' },
      recorder: { name: '記録係を増やす', desc: '記録が|ふえる', lb: '記録', v: e => '×' + (e.mul % 1 ? e.mul.toFixed(1) : e.mul) },
      cheer: { name: '応援団', desc: 'はじめから|勢いが|高い', lb: 'スタート', v: e => fmtNum(e.bodies) + '人' },
      book: { name: '分身の秘伝書', desc: '分身の|上限が|ふえる', lb: '最大', v: e => fmtNum(e.bodies) + '人' },
    },
  },

  intro: { rival: 'ライバル', rec: 'ライバルの記録', unit: '回', best: 'ベスト', start: 'タップで スタート', back: 'もどる' },

  // 大会 9 つ。順番が進む順番（CFG.targets と同じ並び）
  tournaments: [
    { name: 'クラスの体力測定', rival: { name: '前の席の|田中', short: '田中', say: '去年と|同じ記録を|目指します。' } },
    { name: '学年の体力測定', rival: { name: '学年1位の|鈴木', short: '鈴木', say: '毎朝|牛乳を|飲んでいます。' } },
    { name: '校内大会', rival: { name: '体育委員長の|佐藤', short: '佐藤', say: '全校生徒が|見ていますが|気にしません。' } },
    { name: '市大会', rival: { name: '市の代表の|高橋', short: '高橋', say: '言い訳は|すでに|用意してあります。' } },
    { name: '県大会', rival: { name: '県王者の|伊藤', short: '伊藤', say: '優勝賞品の|お米を|待っています。' } },
    { name: '全国大会', rival: { name: '全国2連覇の|渡辺', short: '渡辺', say: 'テレビに|映るので|髪を 整えました。' } },
    { name: '世界大会', rival: { name: '世界王者の|ジャン', short: 'ジャン', say: '言葉は|通じませんが|記録は 通じます。' } },
    { name: '月面大会', rival: { name: '宇宙飛行士の|山本', short: '山本', say: '重力が 小さいので|だいぶ|有利です。' } },
    { name: '宇宙大会', rival: { name: '宇宙人の|ポポ', short: 'ポポ', say: '記録係は|腕が 6本|あります。' } },
  ],

  // 記録用紙
  sheet: {
    head: '体力測定 記録用紙', kind: '大会', rec: '記録', unit: '回',
    steps: '本当の回数', maxN: '最高の分身', trips: '転んだ回数', times: ' 回', people: ' 人',
    judgeAll: '記録係は|ぜんいん 数えました', judgeClone: '分身も|ぜんいん 数えられました',
    bestNew: 'ベスト こうしん！', best: n => 'ベスト ' + n + ' 回',
    rival: s => 'ライバル ' + s, you: 'あなた', vs: 'VS', win: '勝ち！', lose: '負け…',
    noteLose: n => 'あと ' + n + ' 回で|勝ち！',
    noteUnlock: s => '「' + s + '」が|ひらきました！',
    noteReplay: 'ライバルに|また 勝ちました。',
    noteEnd: '全大会|せいは！',
    retry: 'もう一回', toList: '大会の一覧', cont: 'つづける', share: 'Xで シェア',
    tickets: '引換券', ticketGain: n => '+' + n, shop: '購買部',
  },

  // 宇宙大会に勝ったあと（Phase 3 で作り直す）
  ending: {
    head: '全大会|せいは！', body: '宇宙大会に|勝ちました。', thanks: 'おめでとう！',
    best: n => '宇宙大会 ベスト ' + n + ' 回', list: '大会の一覧へ',
  },

  // 測定中の画面（記録板・ふきだし・文字の演出）
  hud: {
    banner: '体力測定', rec: '記録', real: n => 'ほんとうは ' + n + ' 回', left: 'のこり', bodies: n => '分身 ' + n + '人',
    bubble: ['いーち、にー…', 'は、はやっ！', 'えっ…？ にー、よん…', 'ひとが ふえてる…', 'ゆ、ゆかが…！', 'でんたく でんたく…！', 'そ、測定不能…！'],
    bFinish: 'そこまで！ きろくします…', bOver: n => '…' + n + ' 回です。', bReady: 'よーい…',
    ready: 'よーい…', vs: 'VS', passed: '超えた！',
  },
  pop: {
    start: 'スタート！', stumble: 'もつれた！', out: 'はみだした！', down: '勢い ダウン', end: 'そこまで！', pant: 'ゼーゼー',
    rival: 'ライバルを 超えた！',
    lv: ['', 'ぶんしん！', '4にん！', '8にん！！', '16にん！！', '32にん！！！', '測定不能！！！'],
    lvN: n => fmtNum(n) + 'にん！！！',   // 段階 7 以上（分身の秘伝書）
    crowd: ['わー！', 'すげー！', 'はやっ！', 'なにあれ！', 'ぶんしん！？', 'えええ！', '2人いる！', '見えない！'],
  },

  // 共有（文面と画像カード）
  share: {
    text: (t, rec, steps, judge, maxN, win) =>
      '分身反復横とび「' + t + '」で 記録 ' + rec + ' 回（本当は ' + steps + ' 回）、判定「' + judge + '」！' + (win ? ' ライバルに勝ち！' : '') + ' 分身 ' + maxN + ' 人 #分身反復横とび',
    card: { head: '体力測定 記録用紙', kind: '種目', kindVal: '反復横とび', rec: '記録', unit: '回', steps: '本当の回数', maxN: '最高の分身', trips: '転んだ回数', times: ' 回', people: ' 人' },
  },
};
const ph = s => s.replace(/\|/g, '');   // 「|」を取った普通の文字列

// ===== 大きな数字の表示（ここ 1 か所。Phase 4 で英語の K / M / B を足すときは units と、読みを変えるところだけ）=====
// 1 万未満はそのまま（3 桁ごとにカンマ）。1 万以上は 万・億・兆 を付けて、有効数字 4 桁まで（例 12.34万・123.4万・1234万・1.5億）
STR.num = { units: [[1e4, '万'], [1e8, '億'], [1e12, '兆']], sep: ',', sig: 4 };
function fmtNum(v) {
  let n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '0';
  const neg = n < 0; if (neg) n = -n;
  const U = STR.num.units;
  let out;
  if (n < U[0][0]) {
    out = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, STR.num.sep);
  } else {
    let u = 0;
    while (u + 1 < U.length && n >= U[u + 1][0]) u++;
    const body = k => {   // 有効数字 sig 桁に丸めて、余分な 0 を落とす
      const m = n / U[k][0], d = Math.max(0, STR.num.sig - 1 - Math.floor(Math.log10(m)));
      return Number(m.toFixed(d));
    };
    let m = body(u);
    if (m >= 10000 && u + 1 < U.length) { u++; m = body(u); }   // 9999.6万 → 1億 のような繰り上がり
    out = String(m) + U[u][1];
  }
  return neg ? '-' + out : out;
}
