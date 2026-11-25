// ===== 画面に出す言葉（ここに集める。Phase 4 で英語を足す）=====
// 「|」は文節の切れ目。画面では文節ごとに改行しない塊（.nb）になる。ph() で「|」を取れば普通の文字列
const STR = {
  title: { name: '分身|反復横とび', catch: '20秒で|何人 分身できる？', tap: 'タップで スタート' },

  list: {
    head: '大会の一覧', back: 'タイトルへ',
    progress: (n, m) => n + ' / ' + m,
    vs: 'VS', unit: '回', best: 'ベスト', noBest: 'ベスト ---',
    tagWon: '勝ち', tagNext: '挑戦！', tagLocked: 'ロック', hidden: '？？？',
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
  },

  // 宇宙大会に勝ったあと（Phase 3 で作り直す）
  ending: {
    head: '全大会|せいは！', body: '宇宙大会に|勝ちました。', thanks: 'おめでとう！',
    best: n => '宇宙大会 ベスト ' + n + ' 回', list: '大会の一覧へ',
  },

  // 測定中の画面（記録板・ふきだし・文字の演出）
  hud: {
    banner: '体力測定', rec: '記録', real: n => 'ほんとうは ' + n + ' 回', left: 'のこり',
    bubble: ['いーち、にー…', 'は、はやっ！', 'えっ…？ にー、よん…', 'ひとが ふえてる…', 'ゆ、ゆかが…！', 'でんたく でんたく…！', 'そ、測定不能…！'],
    bFinish: 'そこまで！ きろくします…', bOver: n => '…' + n + ' 回です。', bReady: 'よーい…',
    ready: 'よーい…', vs: 'VS', passed: '超えた！',
  },
  pop: {
    start: 'スタート！', stumble: 'もつれた！', out: 'はみだした！', down: '勢い ダウン', end: 'そこまで！', pant: 'ゼーゼー',
    rival: 'ライバルを 超えた！',
    lv: ['', 'ぶんしん！', '4にん！', '8にん！！', '16にん！！', '32にん！！！', '測定不能！！！'],
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
