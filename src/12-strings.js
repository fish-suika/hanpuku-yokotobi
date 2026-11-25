// ===== 画面に出す言葉（ここに集める。日本語は STR_JA、英語は STR_EN。同じ形で書く）=====
// 「|」は文節の切れ目。画面では文節ごとに改行しない塊（.nb）になる。ph() で「|」を取れば普通の文字列
const STR_JA = {
  title: { name: '分身|反復横とび', logo: ['分身', '反復横とび'], tag: '体力測定', catch: '20秒で|何人 分身できる？', tap: 'タップで スタート' },

  // 判定の名前（CFG.judge と同じ並び）。「|」は判子の中で改行できる場所
  judge: ['E', 'D', 'C', 'B', 'A', 'S', '測定|不能', '人類の|範囲外'],

  list: {
    head: '大会の一覧', back: 'タイトルへ',
    progress: (n, m) => n + ' / ' + m,
    vs: 'VS', unit: '回', best: 'ベスト', noBest: 'ベスト ---',
    tagWon: '勝ち', tagNext: '挑戦！', tagLocked: 'ロック', hidden: '？？？',
    tickets: '引換券', shop: '購買部',
    sub: (short, n) => 'VS ' + short + '　' + n + '回', bestOf: n => 'ベスト ' + n,
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

  intro: { rival: 'ライバル', rec: 'ライバルの記録', unit: '回', bestOf: n => 'ベスト ' + n + ' 回', start: 'タップで スタート', back: 'もどる' },

  // 大会 9 つ。順番が進む順番（CFG.targets と同じ並び）
  tournaments: [
    { name: 'クラスの体力測定', rival: { name: '前の席の|田中', short: '田中', say: '去年と|同じ記録を|目指します。', win: '来年も|牛乳を|もらいます。', lose: '去年と|同じ記録で|勝ちました。' } },
    { name: '学年の体力測定', rival: { name: '学年1位の|鈴木', short: '鈴木', say: '毎朝|牛乳を|飲んでいます。', win: '牛乳が|足りません|でした。', lose: '牛乳の|おかげです。' } },
    { name: '校内大会', rival: { name: '体育委員長の|佐藤', short: '佐藤', say: '全校生徒が|見ていますが|気にしません。', win: '全校生徒の|前で|負けました。', lose: '全校生徒が|見ていた|ようですね。' } },
    { name: '市大会', rival: { name: '市の代表の|高橋', short: '高橋', say: '言い訳は|すでに|用意してあります。', win: 'ここで|言い訳を|使います。', lose: '言い訳は|不要|でした。' } },
    { name: '県大会', rival: { name: '県王者の|伊藤', short: '伊藤', say: '優勝賞品の|お米を|待っています。', win: 'お米は|差し上げます。', lose: 'お米は|いただき|ます。' } },
    { name: '全国大会', rival: { name: '全国2連覇の|渡辺', short: '渡辺', say: 'テレビに|映るので|髪を 整えました。', win: '髪が|乱れました。', lose: '髪は|乱れて|いません。' } },
    { name: '世界大会', rival: { name: '世界王者の|ジャン', short: 'ジャン', say: '言葉は|通じませんが|記録は 通じます。', win: '記録は|通じました。|完敗です。', lose: '記録が|通じ|ませんでしたね。' } },
    { name: '月面大会', rival: { name: '宇宙飛行士の|山本', short: '山本', say: '重力が 小さいので|だいぶ|有利です。', win: '重力の|せいに|します。', lose: '重力が|味方に|なりました。' } },
    { name: '宇宙大会', rival: { name: '宇宙人の|ポポ', short: 'ポポ', say: '記録係は|腕が 6本|あります。', win: '腕が 6本でも|数えきれ|ません。', lose: '腕が 6本|ありますので。' } },
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
    rivalSay: s => '「' + s + '」',
    retry: 'もう一回', toList: '大会の一覧', cont: 'つづける', share: 'Xで シェア',
    tickets: '引換券', ticketGain: n => '+' + n, shop: '購買部',
  },

  // 会場ごとの言葉。banner＝壁の横断幕、sign＝看板、rec＝記録係のひとこと（勢いの段階 0〜10。段階 7〜10 は分身の秘伝書）、
  // ready／fin／over＝「よーい」「そこまで」「記録の読み上げ」、tag＝記録係の呼び名（エンディングでも使う）
  venues: [
    { banner: '体力測定', sign: '', tag: '担任の先生', ready: 'よーい…', fin: 'そこまで！ きろくします…', over: n => '…' + n + ' 回です。',
      rec: ['いーち、にー…', 'は、はやっ！', 'えっ…？ にー、よん…', 'ひとが ふえてる…', 'ゆ、ゆかが…！', 'でんたく でんたく…！', 'そ、測定不能…！',
        '百人…？ 数えます！', '出席簿が 足りない…', '先生 校庭に 出ます', '先生 もう 帰っていい？'] },
    { banner: '学年の体力測定', sign: '', tag: '学年の先生たち', ready: '三人で 見ます…', fin: 'そこまで！ 集計します', over: n => '学年記録は ' + n + ' 回です',
      rec: ['一組の先生、数えて！', 'こっちの数と 合わない', '三人で 数えます！', '学年主任が 二人います', '体育の先生が 泣いてる', '電卓を 回してください', '会議にします！ 測定不能',
        '全員で 数えますが…', '職員室から 応援を！', '教頭先生が 倒れました', '校長先生に 報告します'] },
    { banner: '校内大会', sign: '', tag: '体育委員の先生', ready: '全校生徒、静かに…', fin: 'そこまで！ 全校に 発表', over: n => '校内記録 ' + n + ' 回！',
      rec: ['全校生徒が 見ています', '静かに！ 見えません！', '体育委員、整列して！', '全校が ざわざわ…', '校長先生も 立ちました', '放送室！ 実況お願い！', '学校記録を 超えました',
        '校庭が 分身だらけです', '近所からも 見ています', '来年の 校内大会は…？', '校歌を うたってください'] },
    { banner: '市大会', sign: '市民体育館', tag: '審判', ready: '位置について…', fin: 'そこまで。記録 確認', over: n => '記録 ' + n + ' 回。有効。',
      rec: ['位置について。', 'ただいまの 動作、有効。', '二名に 見えますが 有効', '競技者の数を 確認中', '競技規則に 前例なし', '審判長、協議します', '規定により 測定不能',
        '分身は 登録外です', '市長に 連絡しました', '協議の結果 続行します', '審判を 増員します'] },
    { banner: '県大会', sign: '', tag: '審査員', ready: '採点を はじめます…', fin: '採点 しめきります', over: n => '得点 ' + n + ' 回ぶん',
      rec: ['審査員、採点 準備！', '一人目、7点！', '二人目、迷っています', '三人とも 札が 割れた', '採点が 追いつかない', '得点板が 足りない！', '満点を 超えました',
        '審査員も 分身しました', '県知事が 立ちました', '採点は 天に まかせます', '審査規定を 書き直します'] },
    { banner: '全国大会', sign: 'LIVE', tag: '実況アナウンサー', ready: '生中継、入ります…', fin: 'ここで 終了！ 結果は…', over: n => '記録は… ' + n + ' 回！',
      rec: ['さあ 始まりました！', 'おっと！ 今 二人に！？', '解説の 田村さん これは？', '増えている！ 増えている！', '視聴率が 急上昇中！', '放送事故 寸前です！', 'カメラが 追えない！',
        '全国の お茶の間が 騒然！', '番組を 延長します！', '歴史的瞬間を 目撃中！', 'CM… 入れません！'] },
    { banner: '世界大会', sign: '', tag: '国際審判', ready: 'レディ…', fin: '終了。ジャッジ 協議', over: n => n + ' 回。公式記録。',
      rec: ['ええと… レディ？', '通訳！ 通訳 来て！', 'ワンダフル…？ トゥー？', '世界記録の 予感です', '言葉は いりません', '各国の 審判が 協議中', 'ノーカウント…いや 数える',
        '国連に 報告します', '全大陸が 見ています', 'ルールブックが 足りない', 'もう どこの国か 不明'] },
    { banner: '月面大会', sign: '', tag: '宇宙飛行士', ready: '地球へ。開始します…', fin: '終了。データを 送信', over: n => '地球へ。' + n + ' 回です',
      rec: ['地球へ。測定を 開始', '地球へ。二人に 見える', 'こちら 月。四人です', 'ザザッ… 増えてます', '砂ぼこりが 止まらない', '地球、応答を！ 数が…', '測定不能。通信 終了',
        '百人を 確認。どうぞ', '五百人。酸素が たりない', '三千人。月が せまい', '地球へ。引っこします'] },
    { banner: '宇宙大会', sign: '', tag: '宇宙人の ポポ', ready: 'ピポ。よーい…', fin: 'ピポ。おわりです', over: n => n + ' 回… たぶん',
      rec: ['ピポ。いち…ですか？', 'に。あるいは 8ミリ', 'よん… いえ 九万です', 'ふえた。星 ふえた', '16 を 3 と よみました', '数え方を わすれました', 'ケタが 銀河を 超えた',
        '百。つまり 青色です', '五百。おいしい におい', '三千。わが星の 人口', 'ポポ 数える 全部 すき'] },
  ],

  // 宇宙大会に初めて勝ったあと：エンディング（3 つの場面 → 宇宙記録の記録用紙）。cap の「|」は文節の切れ目
  ending: {
    cap: {
      galaxy: ['あなたの|分身は|整列して|宇宙へ|飛び立ちました。', '銀河の|すみずみまで|ならんでいます。'],
      sheet: ['記録係の|ポポが|6本の腕で|書きこみます。', '宇宙規模でも|書式は|いつもどおり。'],
      teacher: ['そのころ、|体育館では。'],
    },
    sheetRow: { kind: '種目', kindVal: '反復横とび', rec: '記録', unit: '回', judge: '判定', judgeVal: '宇宙規模' },
    teacher: ['…はい。|記録しました。', n => '宇宙記録、|' + n + '回。', '例年どおり|異常なし。'],
    pop: 'そうはならんやろ',
    cert: {
      head: '体力測定 記録用紙', sub: '宇宙記録', kind: '種目', kindVal: '反復横とび', tn: '大会', tnVal: '宇宙大会', rec: '記録', unit: '回',
      who: '記録係', whoVal: 'ポポ（腕 6本）', witness: '立会', witnessVal: '担任の先生', note: '備考', noteVal: '例年どおり|異常なし', stamp: '宇宙|規模',
    },
    skip: 'とばす ▶', list: '大会の一覧へ', share: 'Xで シェア',
    shareText: (n) => '分身反復横とび「宇宙大会」に勝ちました！ 宇宙記録 ' + n + ' 回、備考「例年どおり異常なし」 #分身反復横とび',
  },

  // 測定中の画面（記録板・ふきだし・文字の演出）
  hud: {
    rec: '記録', real: n => 'ほんとうは ' + n + ' 回', left: 'のこり', bodies: n => '分身 ' + n + '人',
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

// ===== English（日本語と同じ形で書く。「|」は文節の切れ目で、英語では画面に出るとき空白になる）=====
// 学校の体力測定のまじめな言い方のまま、記録だけが大げさになる味を残す
const STR_EN = {
  title: { name: 'Clone|Side Step', logo: ['CLONE', 'SIDE STEP'], tag: 'FITNESS TEST', catch: 'How many clones|in 20 seconds?', tap: 'Tap to Start' },

  judge: ['E', 'D', 'C', 'B', 'A', 'S', 'Off the|Charts', 'Beyond|Human'],

  list: {
    head: 'Tournaments', back: 'Title',
    progress: (n, m) => n + ' / ' + m,
    vs: 'VS', unit: 'reps', best: 'Best', noBest: 'Best ---',
    tagWon: 'WON', tagNext: 'NEXT!', tagLocked: 'LOCKED', hidden: '???',
    tickets: 'Coupons', shop: 'Shop',
    sub: (short, n) => 'VS ' + short + ' · ' + n + ' reps', bestOf: n => 'Best ' + n,
  },

  shop: {
    head: 'School Shop', tickets: 'Coupons', back: 'Tournaments', go: 'Try Again',
    price: n => n, max: 'MAX', soldOut: 'Maxed', poor: 'Short', lock: 'Locked',
    gate: name => 'Win|' + name + '|to unlock',
    arrow: ' → ',
    items: {
      shoes: { name: 'Gym Shoes', desc: 'Keeps your|momentum|longer', lb: 'Hold', v: e => '×' + e.mul.toFixed(1) },
      clothes: { name: 'New Gym Clothes', desc: 'Clones appear|more easily', lb: 'Speed needed', v: e => e.mul < 1 ? '-' + Math.round((1 - e.mul) * 100) + '%' : '±0%' },
      fall: { name: 'Fall Practice', desc: 'Recover|faster from|tumbles', lb: '', v: e => '-' + e.drop + ' lvl ' + e.secs.toFixed(2) + 's' },
      recorder: { name: 'More Recorders', desc: 'Bigger|records', lb: 'Record', v: e => '×' + (e.mul % 1 ? e.mul.toFixed(1) : e.mul) },
      cheer: { name: 'Cheer Squad', desc: 'Start with|high momentum', lb: 'Start', v: e => fmtNum(e.bodies) + (e.bodies === 1 ? ' clone' : ' clones') },
      book: { name: 'Clone Scroll', desc: 'Raises the|clone cap', lb: 'Max', v: e => fmtNum(e.bodies) + ' clones' },
    },
  },

  intro: { rival: 'Rival', rec: 'Rival Record', unit: 'reps', bestOf: n => 'Best ' + n + ' reps', start: 'Tap to Start', back: 'Back' },

  tournaments: [
    { name: 'Class Fitness Test', rival: { name: 'Tanaka from|the Front Seat', short: 'Tanaka', say: 'Aiming for|the same record|as last year.', win: 'Guess I get|milk again|next year.', lose: 'Won with the|same record|as last year.' } },
    { name: 'Grade Fitness Test', rival: { name: 'Grade Champ|Suzuki', short: 'Suzuki', say: 'I drink milk|every morning.', win: 'We were short|on milk.', lose: 'Thanks to|the milk.' } },
    { name: 'School Meet', rival: { name: 'PE Committee|Chair Sato', short: 'Sato', say: 'The whole school|is watching.|I do not mind.', win: 'Lost in front|of the whole|school.', lose: 'The whole school|seems to have|watched.' } },
    { name: 'City Meet', rival: { name: 'City Rep|Takahashi', short: 'Takahashi', say: 'My excuses|are already|prepared.', win: 'Time to use|my excuse.', lose: 'No excuse|was needed.' } },
    { name: 'Prefecture Meet', rival: { name: 'Prefecture Champ|Ito', short: 'Ito', say: 'I am waiting|for the prize|rice.', win: 'You can|have the rice.', lose: 'I will take|the rice.' } },
    { name: 'National Meet', rival: { name: 'Two-Time National|Champ Watanabe', short: 'Watanabe', say: 'I will be on TV,|so I fixed|my hair.', win: 'My hair|got messy.', lose: 'My hair is|not messy.' } },
    { name: 'World Meet', rival: { name: 'World Champ|Jean', short: 'Jean', say: 'We share no|language, but|records translate.', win: 'The record|translated.|I concede.', lose: 'The record|did not|translate.' } },
    { name: 'Lunar Meet', rival: { name: 'Astronaut|Yamamoto', short: 'Yamamoto', say: 'Low gravity|helps me|a lot.', win: 'I will blame|the gravity.', lose: 'Gravity was|on my side.' } },
    { name: 'Space Meet', rival: { name: 'Alien|Popo', short: 'Popo', say: 'My recorder|has six arms.', win: 'Six arms|still cannot|count that.', lose: 'I have|six arms,|you see.' } },
  ],

  sheet: {
    head: 'Fitness Test Record Sheet', kind: 'Event', rec: 'Record', unit: 'reps',
    steps: 'Real hops', maxN: 'Most clones', trips: 'Falls', times: '', people: '',
    judgeAll: 'The recorders|counted everyone.', judgeClone: 'Clones were|counted too.',
    bestNew: 'New best!', best: n => 'Best ' + n + ' reps',
    rival: s => 'Rival ' + s, you: 'You', vs: 'VS', win: 'WIN!', lose: 'LOSE...',
    noteLose: n => n + ' more reps|to win!',
    noteUnlock: s => s + '|is now open!',
    noteReplay: 'Beat the rival|again.',
    noteEnd: 'All tournaments|cleared!',
    rivalSay: s => '“' + s + '”',
    retry: 'Try Again', toList: 'Tournaments', cont: 'Continue', share: 'Share on X',
    tickets: 'Coupons', ticketGain: n => '+' + n, shop: 'Shop',
  },

  venues: [
    { banner: 'FITNESS TEST', sign: '', tag: 'Homeroom Teacher', ready: 'Ready...', fin: 'Time! Recording...', over: n => '...' + n + ' reps.',
      rec: ['One, two...', 'W-whoa, fast!', 'Huh...? Two, four...', 'There are more of them...', 'The f-floor...!', 'Calculator! Calculator...!', 'Un... unmeasurable...!',
        '100 people...? Counting!', 'Not enough attendance sheets', 'Teacher is going outside', 'Can teacher go home now?'] },
    { banner: 'GRADE FITNESS TEST', sign: '', tag: 'Grade Teachers', ready: 'Three of us are watching...', fin: 'Time! Tallying up', over: n => 'Grade record: ' + n + ' reps',
      rec: ['Class 1 teacher, count!', 'My count does not match', 'Three of us will count!', 'There are two grade heads', 'The gym teacher is crying', 'Pass the calculator around', 'Calling a meeting! Unmeasurable',
        'Everyone count... but...', 'Send help from the staff room!', 'The vice principal fainted', 'Reporting to the principal'] },
    { banner: 'SCHOOL MEET', sign: '', tag: 'PE Committee Teacher', ready: 'Whole school, quiet...', fin: 'Time! Announcing to all', over: n => 'School record: ' + n + ' reps!',
      rec: ['The whole school is watching', 'Quiet! I cannot see!', 'PE committee, line up!', 'Murmuring across the school...', 'Even the principal stood up', 'Broadcast room! Commentary!', 'The school record is broken',
        'The yard is all clones', 'Neighbors are watching too', 'What about next year...?', 'Please sing the school song'] },
    { banner: 'CITY MEET', sign: 'CITY GYM', tag: 'Referee', ready: 'Take your marks...', fin: 'Time. Checking the record', over: n => 'Record: ' + n + ' reps. Valid.',
      rec: ['Take your marks.', 'That motion: valid.', 'Looks like two. Still valid', 'Counting competitors...', 'No precedent in the rules', 'Chief referee, confer!', 'Per the rules: unmeasurable',
        'Clones are not registered', 'Contacted the mayor', 'After review: continuing', 'Adding more referees'] },
    { banner: 'PREFECTURE MEET', sign: '', tag: 'Judge', ready: 'Scoring begins...', fin: 'Scoring is closed', over: n => 'Score: ' + n + ' reps',
      rec: ['Judges, get ready to score!', 'Judge one: 7 points!', 'Judge two is hesitating', 'All three paddles split', 'Cannot keep up with scoring', 'Need a bigger scoreboard!', 'Beyond a perfect score',
        'The judges cloned too', 'The governor stood up', 'Scoring is left to heaven', 'Rewriting the judging rules'] },
    { banner: 'NATIONAL MEET', sign: 'LIVE', tag: 'Announcer', ready: 'Going live...', fin: 'And that is it! The result is...', over: n => 'The record is... ' + n + ' reps!',
      rec: ['And we are underway!', 'Oh! Two of them now?!', 'Analyst Tamura, what is this?', 'More and more of them!', 'Ratings are spiking!', 'Broadcast accident incoming!', 'The camera cannot follow!',
        'Living rooms nationwide erupt!', 'We are extending the show!', 'Witnessing history!', 'No time for commercials!'] },
    { banner: 'WORLD MEET', sign: '', tag: 'International Referee', ready: 'Ready...', fin: 'Finish. Judges confer', over: n => n + ' reps. Official record.',
      rec: ['Umm... ready?', 'Interpreter! Interpreter!', 'Wonderful...? Two?', 'Smells like a world record', 'No words needed', 'Referees of all nations confer', 'No count... no, we count it',
        'Reporting to the UN', 'Every continent is watching', 'We ran out of rulebook', 'Which country is this now?'] },
    { banner: 'LUNAR MEET', sign: '', tag: 'Astronaut', ready: 'To Earth. Starting...', fin: 'Finish. Sending the data', over: n => 'To Earth. ' + n + ' reps.',
      rec: ['To Earth. Measurement start', 'To Earth. I see two', 'This is Moon. Four of them', 'Crrk... they are increasing', 'The dust will not settle', 'Earth, respond! The count...', 'Unmeasurable. Ending comms',
        '100 confirmed. Over.', '500. Oxygen is running low', '3,000. The Moon is cramped', 'To Earth. I am moving out'] },
    { banner: 'SPACE MEET', sign: '', tag: 'Alien Popo', ready: 'Pipo. Ready...', fin: 'Pipo. All done', over: n => n + ' reps... maybe',
      rec: ['Pipo. One... yes?', 'Two. Or 8 millimeters', 'Four... no, ninety thousand', 'More. Stars more', 'I read 16 as 3', 'I forgot how to count', 'Digits exceeded the galaxy',
        '100. So, blue', '500. Tasty smell', '3,000. My planet population', 'Popo loves counting all'] },
  ],

  ending: {
    cap: {
      galaxy: ['Your clones|lined up and|flew off|into space.', 'They fill|every corner|of the galaxy.'],
      sheet: ['Recorder Popo|writes it down|with six arms.', 'Cosmic scale,|same format|as always.'],
      teacher: ['Meanwhile,|at the gym.'],
    },
    sheetRow: { kind: 'Event', kindVal: 'Side Step Test', rec: 'Record', unit: 'reps', judge: 'Verdict', judgeVal: 'Cosmic scale' },
    teacher: ['...Yes.|Recorded.', n => 'Space record:|' + n + ' reps.', 'Nothing unusual|this year.'],
    pop: 'That Doesn’t Happen',
    cert: {
      head: 'Fitness Test Record Sheet', sub: 'Space Record', kind: 'Event', kindVal: 'Side Step Test', tn: 'Meet', tnVal: 'Space Meet', rec: 'Record', unit: 'reps',
      who: 'Recorder', whoVal: 'Popo (6 arms)', witness: 'Witness', witnessVal: 'Homeroom Teacher', note: 'Notes', noteVal: 'Nothing unusual|this year', stamp: 'COSMIC|SCALE',
    },
    skip: 'Skip ▶', list: 'To Tournaments', share: 'Share on X',
    shareText: (n) => 'I won the Space Meet in Clone Side Step! Space record: ' + n + ' reps. Notes: “Nothing unusual this year.” #CloneSideStep',
  },

  hud: {
    rec: 'Record', real: n => 'Real hops: ' + n, left: 'Left', bodies: n => n + ' clones',
    ready: 'Ready...', vs: 'VS', passed: 'Passed!',
  },
  pop: {
    start: 'GO!', stumble: 'Tangled!', out: 'Out of bounds!', down: 'Momentum down', end: 'Time!', pant: 'huff',
    rival: 'Passed the rival!',
    lv: ['', 'Clone!', '4 clones!', '8 clones!!', '16 clones!!', '32 clones!!!', 'Off the charts!!!'],
    lvN: n => fmtNum(n) + ' clones!!!',
    crowd: ['Woah!', 'So fast!', 'What is that?!', 'Clones?!', 'No way!', 'There are two!', 'I can’t see!', 'Go go go!'],
  },

  share: {
    text: (t, rec, steps, judge, maxN, win) =>
      'I scored ' + rec + ' reps (' + steps + ' real hops) at the ' + t + ' in Clone Side Step. Verdict: “' + judge + '”!' + (win ? ' Beat the rival!' : '') + ' ' + maxN + ' clones #CloneSideStep',
    card: { head: 'Fitness Test Record Sheet', kind: 'Event', kindVal: 'Side Step Test', rec: 'Record', unit: 'reps', steps: 'Real hops', maxN: 'Most clones', trips: 'Falls', times: '', people: '' },
  },
};

// 言語ごとの数字の書き方。units＝[基準, 記号]、from＝この数からまとめる
STR_JA.num = { units: [[1e4, '万'], [1e8, '億'], [1e12, '兆']], sep: ',', sig: 4, from: 1e4 };
STR_EN.num = { units: [[1e3, 'K'], [1e6, 'M'], [1e9, 'B']], sep: ',', sig: 4, from: 1e4 };
const STRS = { ja: STR_JA, en: STR_EN };
const STR = STRS[LANG];

// 「|」を、日本語では何もなし・英語では空白にした普通の文字列
const STRSEP = EN ? ' ' : '';
const phL = (s, lang) => s.replace(/\|/g, lang === 'en' ? ' ' : '');
const ph = s => s.replace(/\|/g, STRSEP);

// ===== 大きな数字の表示（ここ 1 か所）=====
// 日本語：1 万未満はカンマ、1 万以上は 万・億・兆。英語：1 万（10,000）未満はカンマ、以上は K / M / B。
// どちらも有効数字 4 桁まで・最大 6 文字（例 12.34万・123.4万・1234万・1.5億／12.35K・123.5K・1.235M）。lang を省くと今の言語
function fmtNum(v, lang) {
  let n = Math.round(Number(v));
  if (!Number.isFinite(n)) return '0';
  const neg = n < 0; if (neg) n = -n;
  const N = STRS[lang === 'ja' || lang === 'en' ? lang : LANG].num, U = N.units;   // map(fmtNum) のように添字が渡っても無視
  let out;
  if (n < N.from) {
    out = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, N.sep);
  } else {
    let u = 0;
    while (u + 1 < U.length && n >= U[u + 1][0]) u++;
    const body = k => {   // 有効数字 sig 桁に丸めて、余分な 0 を落とす
      const m = n / U[k][0], d = Math.max(0, N.sig - 1 - Math.floor(Math.log10(m)));
      return Number(m.toFixed(d));
    };
    let m = body(u);
    if (u + 1 < U.length && m >= U[u + 1][0] / U[u][0]) { u++; m = body(u); }   // 9999.6万 → 1億、999.96K → 1M のような繰り上がり
    out = String(m) + U[u][1];
  }
  return neg ? '-' + out : out;
}
