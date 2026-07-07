// マヤ暦(ドリームスペル/13の月の暦 方式): KIN番号・太陽の紋章・銀河の音の算出
// 日本の主要なマヤ暦占いサイトで公開されている計算例(1992年10月24日=KIN129、
// 1997年5月2日=KIN219)から逆算した基準日を起点とする。
// 注: マヤ暦占いは流派によって基準日の取り方が数日単位で異なることがあり、
// 他サイトの計算結果と数KINずれる場合がある。

const EPOCH_UTC = Date.UTC(1900, 0, 1); // KIN 30
const EPOCH_KIN = 30;
const MS_PER_DAY = 86400000;

const SEALS = [
  { id: 1, name: '赤い龍', keyword: '誕生・母性・育む力' },
  { id: 2, name: '白い風', keyword: '精神・伝達・気づき' },
  { id: 3, name: '青い夜', keyword: '豊かさ・直感・夢' },
  { id: 4, name: '黄色い種', keyword: '開花・目標・可能性' },
  { id: 5, name: '赤い蛇', keyword: '生命力・情熱・本能' },
  { id: 6, name: '白い世界の橋渡し', keyword: '橋渡し・機会・手放し' },
  { id: 7, name: '青い手', keyword: '達成・癒し・実行力' },
  { id: 8, name: '黄色い星', keyword: '美・芸術・調和' },
  { id: 9, name: '赤い月', keyword: '浄化・共感・流れ' },
  { id: 10, name: '白い犬', keyword: '忠誠・愛情・信頼' },
  { id: 11, name: '青い猿', keyword: '遊び心・魔法・創造' },
  { id: 12, name: '黄色い人', keyword: '自由・知恵・影響力' },
  { id: 13, name: '赤い空歩く人', keyword: '探求・挑戦・覚醒' },
  { id: 14, name: '白い魔法使い', keyword: '魅了・気品・タイミング' },
  { id: 15, name: '青い鷲', keyword: '視野・計画・先見性' },
  { id: 16, name: '黄色い戦士', keyword: '知性・勇気・突破力' },
  { id: 17, name: '赤い地球', keyword: 'シンクロ・共鳴・現実化' },
  { id: 18, name: '白い鏡', keyword: '内省・秩序・真実' },
  { id: 19, name: '青い嵐', keyword: '変容・エネルギー・自己触媒' },
  { id: 20, name: '黄色い太陽', keyword: '光・生命力・無条件の愛' },
];

const TONES = [
  { id: 1, name: '磁気の音', keyword: '目的・引き寄せ' },
  { id: 2, name: '月の音', keyword: '協力・二極性' },
  { id: 3, name: '電気の音', keyword: '奉仕・活性化' },
  { id: 4, name: '自己存在の音', keyword: '定義・かたち' },
  { id: 5, name: '倍音の音', keyword: '調和・中心' },
  { id: 6, name: 'リズムの音', keyword: '平等・バランス' },
  { id: 7, name: '共振の音', keyword: 'channel・波及' },
  { id: 8, name: '銀河の音', keyword: '調和的模型・完全性' },
  { id: 9, name: '太陽の音', keyword: '意図の実現' },
  { id: 10, name: '惑星の音', keyword: '完成・達成' },
  { id: 11, name: 'スペクトルの音', keyword: '解放・浄化' },
  { id: 12, name: '水晶の音', keyword: '協働・universalize' },
  { id: 13, name: '宇宙の音', keyword: '超越・受容' },
];

function toUTCDateOnly(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getKin(date) {
  const daysSince = Math.round((toUTCDateOnly(date) - EPOCH_UTC) / MS_PER_DAY);
  const kin = ((EPOCH_KIN - 1 + daysSince) % 260 + 260) % 260 + 1;
  return kin;
}

function getSeal(kin) {
  const index = (kin - 1) % 20;
  return SEALS[index];
}

function getTone(kin) {
  const index = (kin - 1) % 13;
  return TONES[index];
}

module.exports = {
  SEALS,
  TONES,
  getKin,
  getSeal,
  getTone,
};
