// 主要空港から都心部への代表的なアクセス手段(目安)。
// 実際の時刻・料金は変動するため、公式サイトでの確認を促す前提の参考情報として扱う。
const AIRPORT_ACCESS = [
  {
    airport: '羽田空港',
    aliases: ['羽田', 'HND', '東京(羽田)'],
    cityCenter: '東京駅',
    options: [
      { method: 'リムジンバス', durationMin: 45, note: '主要ホテル・駅に直接アクセス可能' },
      { method: '東京モノレール+JR', durationMin: 30, note: '浜松町乗り換え' },
      { method: '京急+都営線', durationMin: 40, note: '品川乗り換え' }
    ]
  },
  {
    airport: '成田空港',
    aliases: ['成田', 'NRT', '東京(成田)'],
    cityCenter: '東京駅',
    options: [
      { method: '京成スカイライナー', durationMin: 41, note: '日暮里・上野方面' },
      { method: 'JR成田エクスプレス', durationMin: 60, note: '東京駅直通' },
      { method: 'リムジンバス', durationMin: 75, note: '道路状況により変動' }
    ]
  },
  {
    airport: '関西国際空港',
    aliases: ['関空', 'KIX', '大阪(関西)'],
    cityCenter: '大阪駅(梅田)',
    options: [
      { method: 'JR関空快速', durationMin: 65, note: '天王寺・大阪方面' },
      { method: '南海ラピート', durationMin: 40, note: 'なんば方面' },
      { method: 'リムジンバス', durationMin: 55, note: '主要ホテルに直接アクセス可能' }
    ]
  },
  {
    airport: '中部国際空港',
    aliases: ['セントレア', 'NGO', '名古屋(中部)'],
    cityCenter: '名古屋駅',
    options: [
      { method: '名鉄ミュースカイ', durationMin: 28, note: '名鉄名古屋駅直通' },
      { method: 'リムジンバス', durationMin: 50, note: '道路状況により変動' }
    ]
  },
  {
    airport: '福岡空港',
    aliases: ['福岡', 'FUK'],
    cityCenter: '博多駅',
    options: [
      { method: '地下鉄空港線', durationMin: 5, note: '空港直結、乗り換えなし' }
    ]
  },
  {
    airport: '新千歳空港',
    aliases: ['千歳', 'CTS', '札幌(新千歳)'],
    cityCenter: '札幌駅',
    options: [
      { method: 'JR快速エアポート', durationMin: 37, note: '札幌駅直通' },
      { method: 'リムジンバス', durationMin: 70, note: '道路状況・積雪により変動' }
    ]
  },
  {
    airport: '那覇空港',
    aliases: ['那覇', 'OKA', '沖縄'],
    cityCenter: '那覇市内(県庁前)',
    options: [
      { method: 'ゆいレール', durationMin: 15, note: '空港直結、乗り換えなし' }
    ]
  }
];

function findAirportAccess(inputText) {
  if (!inputText) return null;
  const normalized = inputText.trim();
  return (
    AIRPORT_ACCESS.find(
      (entry) => entry.airport === normalized || entry.aliases.includes(normalized)
    ) ||
    AIRPORT_ACCESS.find(
      (entry) =>
        entry.airport.includes(normalized) ||
        entry.aliases.some((alias) => alias.includes(normalized) || normalized.includes(alias))
    ) ||
    null
  );
}

module.exports = { AIRPORT_ACCESS, findAirportAccess };
