// ===== 会場の表（画面を使わない。描き方は 42-venues-art.js、言葉は 12-strings.js の STR.venues）=====
// 大会 9 つと同じ並び（CFG.targets・STR.tournaments・STR.venues と同じ番号）。
//   kind   背景の描き方（gym 体育館／hall 市民体育館／arena 大きなアリーナ／tv テレビ中継の会場／stadium スタジアム／moon 月面／space 宇宙空間）
//   wall   壁（空）の上と下の色　wain 腰壁　floor 床の上（奥）と下（手前）の色　floorStyle 床の模様
//   props  この会場だけの小物（名前は VENUE_PROPS のどれか。描くのは PROP[名前]）
//   crowd  見ている人（type＝絵の種類　shirts＝服の色の順番　pants＝ズボン）
//   recorder  記録係の絵（記録板の顔）
//   lowG   月面：跳ぶ弧がふわっと、ほこりがゆっくり（見た目だけ。ルールと時間は変えない）
//   amb    効果音：会場の空気（50-audio.js）　k＝観客の大きさ（会場が上がるほど大きい）
const VENUE_PROPS = [
  'windows', 'banner', 'curtain', 'garlands', 'teachersRow', 'studentsRow',   // 体育館
  'clerestory', 'bleachers', 'sign',                                          // 市民体育館
  'trusses', 'tiers', 'judges',                                               // アリーナ
  'ledwall', 'glowsticks', 'cameras', 'live',                                 // テレビ中継
  'towers', 'worldFlags',                                                     // スタジアム
  'stars', 'earth', 'hills', 'lander', 'moonFlag',                            // 月面
  'nebula', 'planet', 'ufo', 'twinkle',                                       // 宇宙
];
const VENUE_KINDS = ['gym', 'hall', 'arena', 'tv', 'stadium', 'moon', 'space'];
const REC_TYPES = ['teacher', 'teachers', 'megaphone', 'referee', 'judge', 'announcer', 'intl', 'astro', 'alien'];
const CROWD_TYPES = ['kid', 'citizen', 'staff', 'athlete', 'astro', 'alien'];

const GYM_WALL = { wall: ['#f6efd6', '#eadcb4'], wain: '#b79a62', wainLine: '#8a6e3e', floor: ['#d9b36a', '#c58f45'], floorStyle: 'planks', bg: '#e8d6a8' };
const KID_SHIRTS = ['#f2a43a', '#58b0e0', '#e86a9a', '#7ac45a', '#8a5ad0', '#e04a4a'];

const VENUES = [
  // 1 クラスの体力測定：v1 の体育館・担任の先生
  Object.assign({ id: 'class', kind: 'gym', props: ['windows', 'banner', 'curtain'], banner: ['#d2382f', '#f6c84c'],
    crowd: { type: 'kid', shirts: KID_SHIRTS, pants: '#333b4d', whistle: true }, recorder: 'teacher', lowG: false, amb: 'gym', k: 0.8 }, GYM_WALL),
  // 2 学年の体力測定：同じ体育館・先生たちが並んで見ている
  Object.assign({ id: 'grade', kind: 'gym', props: ['windows', 'banner', 'curtain', 'teachersRow'], banner: ['#2c4aa0', '#f6c84c'],
    crowd: { type: 'kid', shirts: KID_SHIRTS, pants: '#333b4d', whistle: true }, recorder: 'teachers', lowG: false, amb: 'gym', k: 0.9 }, GYM_WALL),
  // 3 校内大会：同じ体育館・全校生徒が座って見ている・紙の飾り
  Object.assign({ id: 'school', kind: 'gym', props: ['windows', 'garlands', 'banner', 'curtain', 'studentsRow', 'teachersRow'], banner: ['#e0356f', '#fff2a8'],
    crowd: { type: 'kid', shirts: KID_SHIRTS, pants: '#333b4d', whistle: true }, recorder: 'megaphone', lowG: false, amb: 'gym', k: 1.15 }, GYM_WALL),
  // 4 市大会：市民体育館・観客席・審判
  { id: 'city', kind: 'hall', wall: ['#dbe6ec', '#b9ccd6'], wain: '#2f4a73', wainLine: '#1d3050', floor: ['#79a6cc', '#4f7fae'], floorStyle: 'court', bg: '#4f7fae',
    props: ['clerestory', 'bleachers', 'banner', 'sign'], banner: ['#2f4a73', '#e8e8f2'], sign: ['#1d3050', '#ffe08a'],
    crowd: { type: 'citizen', shirts: ['#e8e2d0', '#6aa5d8', '#e89a4a', '#8fc47a', '#d96a8a', '#b9b9c8'], pants: '#3b4a6b' }, recorder: 'referee', lowG: false, amb: 'hall', k: 1.0 },
  // 5 県大会：大きなアリーナ・審査員の机・観客席が 2 段
  { id: 'pref', kind: 'arena', wall: ['#1d2342', '#2c3560'], wain: '#10142c', wainLine: '#070a1c', floor: ['#62b184', '#3f8a60'], floorStyle: 'turf', bg: '#3f8a60',
    props: ['trusses', 'tiers', 'banner', 'judges'], banner: ['#7a1f2e', '#f0c860'],
    crowd: { type: 'staff', shirts: ['#26304f', '#3a2e57', '#2c4a5a', '#57364a', '#3a3f55'], pants: '#1a2038' }, recorder: 'judge', lowG: false, amb: 'arena', k: 1.3 },
  // 6 全国大会：テレビ中継の会場・LED の壁・カメラ・LIVE
  { id: 'nation', kind: 'tv', wall: ['#120a24', '#241446'], wain: '#0a0618', wainLine: '#00d8ff', floor: ['#4b3a86', '#2c2260'], floorStyle: 'glass', bg: '#2c2260',
    props: ['glowsticks', 'ledwall', 'cameras', 'live'],
    crowd: { type: 'staff', shirts: ['#111018', '#1d1a2e', '#2a2140', '#14202e', '#26142a'], pants: '#0d0b18', headset: true }, recorder: 'announcer', lowG: false, amb: 'tv', k: 1.5 },
  // 7 世界大会：スタジアム・万国旗・赤い走路
  { id: 'world', kind: 'stadium', wall: ['#0b1233', '#27407a'], wain: '#2a2f45', wainLine: '#10131f', floor: ['#d0583e', '#a63f2c'], floorStyle: 'track', bg: '#a63f2c',
    props: ['stars', 'towers', 'tiers', 'worldFlags'], banner: ['#1f3a8a', '#ffffff'],
    crowd: { type: 'athlete', shirts: ['#e04a4a', '#3a6ad0', '#f2c43a', '#2fa36a', '#f2f2f2', '#e86a9a'], pants: '#222a44' }, recorder: 'intl', lowG: false, amb: 'stadium', k: 1.8 },
  // 8 月面大会：月面・地球・宇宙飛行士
  { id: 'moon', kind: 'moon', wall: ['#000004', '#080b1a'], wain: '#55555f', wainLine: '#33333c', floor: ['#8d8d96', '#5c5c66'], floorStyle: 'regolith', bg: '#5c5c66',
    props: ['stars', 'earth', 'hills', 'lander', 'moonFlag'],
    crowd: { type: 'astro', shirts: ['#f2f2f6', '#f2f2f6', '#ffe9c0', '#f2f2f6'], pants: '#c9c9d4' }, recorder: 'astro', lowG: true, amb: 'moon', k: 0.5 },
  // 9 宇宙大会：宇宙空間・星雲・宇宙人
  { id: 'space', kind: 'space', wall: ['#0a0420', '#1d0b45'], wain: '#2a1d6a', wainLine: '#5cf0ff', floor: ['#2a1d6a', '#150f40'], floorStyle: 'grid', bg: '#150f40',
    props: ['stars', 'nebula', 'planet', 'ufo', 'twinkle'],
    crowd: { type: 'alien', shirts: ['#8fe07a', '#7ad0e8', '#e89ae0', '#f2d65a', '#b09af0'], pants: '#5a4a9a' }, recorder: 'alien', lowG: false, amb: 'space', k: 0.9 },
];

VENUES.forEach((v, i) => { v.i = i; });

// エンディングの長さ（秒）。3 つの場面のあとに記録用紙（宇宙記録）が出る。タップでとばせる
const ENDING_TIMES = { galaxy: 5.2, sheet: 5.2, teacher: 5.6 };
const endingTotal = () => ENDING_TIMES.galaxy + ENDING_TIMES.sheet + ENDING_TIMES.teacher;

// ===== 横画面：レーンと分身の立つ場所（画面を使わない。描くのは 40-render.js）=====
// レーン＝右左左右の 3 本線のひとまとまり。縦画面は 1 つ、横に広いほど増える（本人はまん中）。LANE_W は床の線 1 間隔を 1 としたレーンの間隔
const LANE_W = 2.6;
// wide＝画面の幅（遊ぶ場所の幅 100 を単位に）、step＝床の線 1 間隔（40-render の LS）。レーンの数は 1・3・5・7
function lanesFor(wide, step) {
  const m = Math.floor((wide / 2 - 8) / (LANE_W * step));
  return (m >= 0 ? Math.min(3, m) : 0) * 2 + 1;
}
// 本人のレーンが先頭、そのあと左右へ 1 つずつ（0, -1, 1, -2, 2 …）
function laneOrder(n) { const o = [0]; for (let j = 1; o.length < n; j++) o.push(-j, j); return o.slice(0, n); }
// 分身 count 人の立つ場所。1 レーンは今までどおり（奥へ 3 人ずつ）。複数レーンは、1 行目が本人の横（本人のレーンはあけておく）・2 行目から全レーンで、ずらして立つ
function buildSlots(lanes, count) {
  const out = [], L = laneOrder(lanes);
  for (let i = 0; out.length < count; i++) {
    if (lanes === 1) { out.push({ z: 1 + Math.floor(i / 3), lane: 0, wx: (i % 3 - 1) * 0.3 }); continue; }
    const first = L.length - 1;
    if (i < first) { out.push({ z: 0, lane: L[i + 1], wx: 0 }); continue; }
    const j = i - first, z = 1 + Math.floor(j / lanes), idx = j % lanes;
    out.push({ z, lane: L[idx], wx: ((z + idx) % 3 - 1) * 0.28 });
  }
  return out;
}
