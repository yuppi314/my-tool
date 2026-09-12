// 「相手を本当はどう思っているか」を測る本音診断ロジック。
// 12問の状況質問への回答を6つの心理軸に配点し、正規化スコアから本音タイプを判定する。
// 軸の設計は愛の三角理論(親密性・情熱・コミットメント)と愛着スタイル(安定・不安・回避)の
// 一般的な考え方を参考にした、本アプリ独自の簡易モデルです(臨床的な心理検査ではありません)。

const AXES = [
  { key: 'aijou', name: '好意・ときめき', description: '相手に心が動く度合い。恋愛感情の火種になる軸です。' },
  { key: 'shinrai', name: '信頼・安心', description: '一緒にいて素の自分でいられる度合い。関係の土台になる軸です。' },
  { key: 'shuchaku', name: '執着・不安', description: '失うことへの恐れ。好意と混同されやすい軸です。' },
  { key: 'keii', name: '敬意・憧れ', description: '相手を上に見る気持ち。憧れが恋に見えることがあります。' },
  { key: 'kyori', name: '距離を置きたい気持ち', description: '離れて息をつきたい気持ち。本音のブレーキです。' },
  { key: 'iradachi', name: '苛立ち・わだかまり', description: '飲み込んだ不満の蓄積。愛情の裏返しでもあります。' },
];

// label はフォームの選択肢、who は呼び名未入力時に結果の文章へ差し込む表現
const RELATIONS = [
  { key: 'crush', label: '片思いしている人', who: '片思いのあの人' },
  { key: 'partner', label: '恋人・パートナー', who: 'パートナー' },
  { key: 'ex', label: '元恋人', who: '元恋人のあの人' },
  { key: 'friend', label: '友人', who: 'あの友人' },
  { key: 'colleague', label: '職場・学校の人', who: '職場のあの人' },
  { key: 'family', label: '家族・身内', who: 'あの家族' },
  { key: 'other', label: 'その他', who: 'あの人' },
];

// w: 各選択肢が加点する軸と点数(0-3)
const QUESTIONS = [
  {
    id: 'q1',
    text: '相手からの返信が半日来ない。最初に浮かぶのは？',
    options: [
      { label: '何かあったのかな、と心配になる', w: { aijou: 2, shinrai: 1, shuchaku: 1 } },
      { label: '嫌われたかも、と落ち込んでしまう', w: { aijou: 1, shuchaku: 3 } },
      { label: '忙しいんだろう、と気にしない', w: { shinrai: 3, kyori: 1 } },
      { label: '正直、少しホッとする', w: { kyori: 3, iradachi: 1 } },
    ],
  },
  {
    id: 'q2',
    text: '相手が他の誰かと親しげに話している。そのとき胸の中は？',
    options: [
      { label: 'ざわっとして、目が離せない', w: { aijou: 2, shuchaku: 3 } },
      { label: '自分もその輪に入りたいと思う', w: { aijou: 2, shinrai: 1 } },
      { label: '楽しそうで良かったと思える', w: { shinrai: 3, keii: 1 } },
      { label: '特に何も感じない', w: { kyori: 3 } },
    ],
  },
  {
    id: 'q3',
    text: '相手と会った帰り道、あなたは何を感じている？',
    options: [
      { label: 'もっと一緒にいたかった', w: { aijou: 3, shuchaku: 1 } },
      { label: '今日の自分の言動を反省している', w: { shuchaku: 3, keii: 1 } },
      { label: '心地よい疲れで満たされている', w: { shinrai: 3, aijou: 1 } },
      { label: 'ようやく一人になれて落ち着く', w: { kyori: 3, iradachi: 1 } },
    ],
  },
  {
    id: 'q4',
    text: '相手の意外な失敗や弱さを知ってしまった。',
    options: [
      { label: '人間らしくて、かえって好きになる', w: { aijou: 3, shinrai: 1 } },
      { label: '支えてあげたいと思う', w: { aijou: 1, shinrai: 2, keii: 1 } },
      { label: '少しがっかりしてしまった', w: { keii: 3, iradachi: 1 } },
      { label: '「ざまあ見ろ」と一瞬思ってしまった', w: { kyori: 1, iradachi: 3 } },
    ],
  },
  {
    id: 'q5',
    text: '友人に相手のことを話すとき、あなたは？',
    options: [
      { label: 'つい自慢げに語ってしまう', w: { aijou: 2, keii: 3 } },
      { label: '話題にするのが照れくさい', w: { aijou: 3, shuchaku: 1 } },
      { label: '「いい人だよ」と客観的に紹介する', w: { shinrai: 3 } },
      { label: 'あまり話したくない', w: { kyori: 3, iradachi: 1 } },
    ],
  },
  {
    id: 'q6',
    text: 'もし相手が「遠くへ引っ越す」と言い出したら？',
    options: [
      { label: '引き止めたい、あるいは追いかけたい', w: { aijou: 3, shuchaku: 2 } },
      { label: '応援するけれど、心にぽっかり穴が空く', w: { aijou: 2, shinrai: 2 } },
      { label: '離れても関係は続くと信じられる', w: { shinrai: 3, keii: 1 } },
      { label: '区切りとしてちょうどいいと思う', w: { kyori: 3 } },
    ],
  },
  {
    id: 'q7',
    text: '相手から頼み事をされたとき、あなたは？',
    options: [
      { label: '自分の予定を変えてでも引き受ける', w: { aijou: 2, shuchaku: 2 } },
      { label: 'できる範囲で快く引き受ける', w: { shinrai: 3 } },
      { label: '断ると嫌われそうで断れない', w: { shuchaku: 3, iradachi: 1 } },
      { label: '正直「また面倒なことを」と思う', w: { kyori: 2, iradachi: 3 } },
    ],
  },
  {
    id: 'q8',
    text: '相手のSNSやプロフィールについて、近いのは？',
    options: [
      { label: '更新をほぼ毎回チェックしている', w: { aijou: 2, shuchaku: 3 } },
      { label: '見かけたら反応する程度', w: { aijou: 1, shinrai: 2 } },
      { label: '元気そうな様子を見て安心している', w: { shinrai: 2, shuchaku: 1 } },
      { label: '見ないようにしている・ミュートしている', w: { kyori: 3, iradachi: 1 } },
    ],
  },
  {
    id: 'q9',
    text: 'まだ相手に言えていない言葉がある。それに一番近いのは？',
    options: [
      { label: '「好きだ」に近い言葉', w: { aijou: 3, shuchaku: 1 } },
      { label: '「ありがとう」に近い言葉', w: { shinrai: 3, keii: 2 } },
      { label: '「尊敬している」に近い言葉', w: { shinrai: 1, keii: 3 } },
      { label: '「もうしんどい」に近い言葉', w: { kyori: 2, iradachi: 3 } },
    ],
  },
  {
    id: 'q10',
    text: '二人の関係が今のまま10年続くと想像すると？',
    options: [
      { label: '嬉しいけれど、今のままでは物足りない', w: { aijou: 3, shuchaku: 2 } },
      { label: '素直に幸せだと思える', w: { aijou: 1, shinrai: 3 } },
      { label: '相手が変わらず輝いていてほしい', w: { keii: 3 } },
      { label: '想像すると息苦しくなる', w: { kyori: 3, iradachi: 2 } },
    ],
  },
  {
    id: 'q11',
    text: '相手と意見がぶつかったとき、あなたは？',
    options: [
      { label: '嫌われたくなくて自分を曲げる', w: { shuchaku: 3 } },
      { label: 'ちゃんと話し合って擦り合わせる', w: { shinrai: 3, keii: 1 } },
      { label: '相手の言うことの方が正しい気がする', w: { keii: 3, shuchaku: 1 } },
      { label: '言い返さず、心の中に溜め込む', w: { kyori: 1, iradachi: 3 } },
    ],
  },
  {
    id: 'q12',
    text: '自分がひどく落ち込んでいるとき、相手には？',
    options: [
      { label: '誰よりも先に知ってほしい', w: { aijou: 3, shinrai: 1 } },
      { label: '弱いところは見せたくない', w: { keii: 2, kyori: 2 } },
      { label: '心配してもらえると安心する', w: { shinrai: 2, shuchaku: 2 } },
      { label: '察してくれないことに腹が立つ', w: { shuchaku: 2, iradachi: 3 } },
    ],
  },
];

// 各軸の満点(全問で最大配点を選んだ場合の合計)。正規化に使う。
const MAX_BY_AXIS = AXES.reduce((acc, axis) => {
  acc[axis.key] = QUESTIONS.reduce(
    (sum, q) => sum + Math.max(...q.options.map((o) => o.w[axis.key] || 0)),
    0
  );
  return acc;
}, {});

const TYPES = {
  honmei: {
    id: 'honmei',
    name: '本命まっすぐ型',
    catch: 'あなたの本音は、ごまかしようのない「好き」です。',
    honne: 'この人と、ちゃんと一緒にいたい。',
    deep:
      '好意と信頼が両方高く、しかも不満の蓄積が少ない、いちばん健やかな「好き」の形です。' +
      'ときめきだけで舞い上がっているわけではなく、相手の素の部分を見たうえで一緒にいたいと思えている。' +
      'あなたが感じている気持ちは、気の迷いや寂しさの埋め合わせではありません。',
    conflict:
      'ただし「伝えなくても伝わっているはず」という思い込みが、あなたの唯一の弱点です。' +
      '関係が安定しているぶん、言葉にする機会を後回しにしがちです。',
    mirror:
      '相手からは「一緒にいて安心する人」「自分に好意的な人」として、かなり高い確度で認識されています。' +
      'ただし好意の強さの正確な度合いは、相手はまだ測りきれていません。',
    forecast:
      'このまま何も動かさなければ、3ヶ月後も「心地よいけれど進まない関係」のままです。' +
      '逆に、あなたが一度だけはっきり言葉にすれば、関係が次の段階に進む確率は高い局面にあります。',
    todo: [
      '気持ちを「いつか」ではなく日付を決めて伝える。',
      '相手の言葉を要約して返す(「つまり〜だよね」)。信頼がさらに深まります。',
      '二人だけの予定を、あなたから先に提案する。',
    ],
    ng: [
      '相手の反応を試すような遠回しな態度をとること。',
      '「察してほしい」と黙り込むこと。',
    ],
  },
  shuchaku: {
    id: 'shuchaku',
    name: '手放せない執着型',
    catch: 'それは「好き」より「失いたくない」かもしれません。',
    honne: 'いなくなるのが怖い。だから手放せない。',
    deep:
      '相手を想う気持ちの多くを、失うことへの不安が占めています。' +
      '執着は愛情とよく似た熱を持つので、本人にはほとんど区別がつきません。' +
      '見分け方はひとつ、「相手が幸せそうにしているとき、素直に嬉しいか」です。' +
      'そこで胸がざわつくなら、動いているのは好意より不安の側です。',
    conflict:
      'あなたは相手に尽くしているつもりで、実は「見捨てられない証拠」を集めています。' +
      '尽くすほど見返りが気になり、気にするほど苦しくなる——この循環が本当の苦しさの正体です。',
    mirror:
      '相手からは「よくしてくれる人」と見えている一方で、' +
      '無意識の圧を感じ取って、少しずつ距離のとり方を慎重にしている可能性があります。',
    forecast:
      '今のバランスのままなら、3ヶ月後のあなたは今よりも疲れています。' +
      '相手の一挙一動に反応する回数を意識的に減らせた場合だけ、関係はむしろ落ち着きを取り戻します。',
    todo: [
      '連絡を確認する回数を1日1回に決める(不安ではなく習慣に変える)。',
      '相手と関係のない予定を、週にひとつ入れる。',
      '「この人がいなくても成り立つ自分の時間」を紙に3つ書き出す。',
    ],
    ng: [
      '返信の速度や頻度で愛情を測ること。',
      '尽くしたことを数え、見返りを暗に求めること。',
    ],
  },
  akogare: {
    id: 'akogare',
    name: '憧れが恋に見えている型',
    catch: 'あなたが惹かれているのは、相手そのものより「相手の光」です。',
    honne: 'あんな風になりたい。近くにいたい。',
    deep:
      '敬意と憧れの軸が突出しています。これは恋愛感情ととてもよく似た興奮を生みますが、' +
      '向いている先が少し違います。あなたが見ているのは、相手が持っている能力・生き方・佇まいで、' +
      'それは「自分がこうなりたい」という理想像の投影でもあります。',
    conflict:
      '相手の弱さや平凡さを見たときに、がっかりしてしまう——それが憧れの証拠です。' +
      '本当の好意は相手の欠点を見た後に残るもので、憧れは欠点を見ると目減りします。',
    mirror:
      '相手はあなたを「自分を高く評価してくれる人」として好ましく思っています。' +
      'ただし対等な相手としてより、慕ってくれる後輩や味方として見ている可能性があります。',
    forecast:
      '憧れのままなら、3ヶ月後には相手の現実的な一面が見えて熱が少し下がります。' +
      'そこで気持ちが消えず残ったなら、それは本物の好意に変わったサインです。',
    todo: [
      '相手の「かっこよくない部分」を一つ挙げてみる。それでも一緒にいたいか確かめる。',
      '憧れている要素を分解し、自分の生活に1つ取り入れる。',
      '相手に相談だけでなく、自分の意見を返してみる。',
    ],
    ng: [
      '相手を理想化し続け、対等に話すのを避けること。',
      '自分を下に置いて接すること。',
    ],
  },
  soubou: {
    id: 'soubou',
    name: '情でつながる相棒型',
    catch: '恋よりも強い「信頼」で、あなたはこの人とつながっています。',
    honne: '恋ではない。でも、この人を失いたくはない。',
    deep:
      '信頼と敬意が高く、ときめきと不安がどちらも低い。これは恋愛の熱ではなく、' +
      '長く続く関係に特有の落ち着いた結びつきです。あなたはこの人の前で演じる必要がなく、' +
      'それは恋愛感情よりずっと得がたいものです。',
    conflict:
      'あなたは時々「好きではないのに、なぜこんなに大切なのだろう」と混乱します。' +
      'それは好意の欠落ではなく、関係の種類が恋愛の枠に収まっていないだけです。',
    mirror:
      '相手もあなたを「気を張らずにいられる相手」と感じています。' +
      'ただし恋愛的な期待はお互いに薄いため、どちらかが線を越えようとすると関係は大きく揺れます。',
    forecast:
      '3ヶ月後も、この関係はおそらく形を変えません。それは停滞ではなく安定です。' +
      'ただし連絡の間隔が空くと自然に薄れやすい種類の縁でもあります。',
    todo: [
      '用事がなくても連絡する口実を一つ持っておく。',
      '相手に感謝を具体的に伝える(何をしてもらったかまで言葉にする)。',
      '恋愛の枠に当てはめようとするのを、一度やめてみる。',
    ],
    ng: [
      '世間の「男女だから」という枠に合わせて関係を壊すこと。',
      '感謝を当たり前として扱うこと。',
    ],
  },
  ambivalent: {
    id: 'ambivalent',
    name: '好きなのに腹が立つ両価型',
    catch: 'あなたの本音は、好意と怒りが同じ場所で絡まっています。',
    honne: '大事にしたい。でも、わかってもらえなくて悔しい。',
    deep:
      '好意(あるいは執着)と苛立ちが、どちらも高く出ています。矛盾ではありません。' +
      '腹が立つのは期待しているからで、期待は関心の証です。' +
      '問題は感情そのものではなく、言えないまま溜めてきた分量です。',
    conflict:
      'あなたは「これくらいで怒るのは重い」と自分の不満を格下げしてきました。' +
      '飲み込んだ不満は消えず、皮肉や沈黙、急な冷たさとして別の形で漏れ出します。',
    mirror:
      '相手はあなたの好意には気づいていますが、不満の中身はほとんど把握していません。' +
      '「急に機嫌が悪くなる人」と受け取られているおそれがあります。',
    forecast:
      '言葉にしないまま3ヶ月が過ぎると、好意の側から先に摩耗します。' +
      '逆に不満を一つでも具体的に伝えられれば、関係の温度はむしろ上がります。',
    todo: [
      '不満を「人格」ではなく「出来事」で1つだけ伝える。',
      '要望を否定形ではなく依頼形にする(「〜しないで」→「〜してほしい」)。',
      '溜めている不満を紙に全部書き、伝える価値のあるものを選ぶ。',
    ],
    ng: [
      '皮肉や沈黙で伝えようとすること。',
      '限界まで溜めてから一度に爆発させること。',
    ],
  },
  nagori: {
    id: 'nagori',
    name: '情が残っているだけ型',
    catch: '動いているのは今の気持ちより、これまでの時間です。',
    honne: '嫌いじゃない。でも、もう前のようには戻れない。',
    deep:
      '好意の熱は下がっているのに、信頼と積み上げた時間だけが残っている状態です。' +
      '距離を置きたい気持ちがはっきり出ているのは、心が正直に休息を求めているサインです。' +
      '冷たくなったのではなく、関係の季節が変わっただけです。',
    conflict:
      'あなたは「ここまで続けたのに」という惜しさを、好意と読み替えています。' +
      'しかし関係を続ける理由が過去の分量だけになったとき、それは愛情ではなく在庫です。',
    mirror:
      '相手はあなたの熱が下がったことを、うっすら感じ取っています。' +
      'それを言葉にできないまま、お互いに気を遣い合う膠着状態になりやすいです。',
    forecast:
      '3ヶ月後、無理に元へ戻そうとした場合はさらに疲れます。' +
      '一度距離を置いた場合は、残るものと消えるものがはっきり分かれ、判断がしやすくなります。',
    todo: [
      '2週間だけ意識的に距離を置き、何が恋しくなるか観察する。',
      '関係を続ける理由を「過去」以外の言葉で書き出してみる。',
      '惜しさと好意を、別の紙に分けて書く。',
    ],
    ng: [
      '罪悪感だけで関係をつなぎ続けること。',
      '「昔はよかった」を基準に今の相手を測ること。',
    ],
  },
  hanare: {
    id: 'hanare',
    name: 'そっと離れたい型',
    catch: 'あなたの本音は、もう十分やったという答えに近づいています。',
    honne: '責めたいわけじゃない。ただ、静かに離れたい。',
    deep:
      '距離を置きたい気持ちと苛立ちが高く、好意が下がっています。' +
      'これは冷たさではなく、消耗の結果です。人は無限には差し出せません。' +
      '離れたいと思うことそれ自体に、後ろめたさを持つ必要はありません。',
    conflict:
      'それでもあなたは「自分が我慢すれば済む」「悪者になりたくない」と考え、' +
      '結論を先延ばしにしています。先延ばしのコストは、あなただけが払っています。',
    mirror:
      '相手はあなたの限界に気づいていない可能性が高いです。' +
      '何も言わずに離れると、相手には突然の断絶として映ります。',
    forecast:
      '3ヶ月後、今のまま我慢を続ければ、関係は最も後味の悪い形で終わります。' +
      '先に距離を明示できた場合は、関係を終えるにしても保つにしても、あなたの傷は浅くなります。',
    todo: [
      '連絡の頻度を段階的に下げ、自分の回復を優先する。',
      '「今は自分のことに集中したい」と、理由をひとつだけ伝える。',
      '離れた後に残る後悔があるかを、先に想像してみる。',
    ],
    ng: [
      '限界を超えてから、何も言わず突然断つこと。',
      '相手を悪者にして自分を納得させること(後で自分が苦しくなります)。',
    ],
  },
  mikakutei: {
    id: 'mikakutei',
    name: 'まだ言葉にならない型',
    catch: 'あなたの本音は、まだ形になる途中です。',
    honne: 'この気持ちに名前をつけたくない。',
    deep:
      'どの軸も突出せず、全体が平坦に出ています。これは感情が薄いのではなく、' +
      '相反する気持ちがつり合っている状態です。関係が始まったばかりか、' +
      'あるいは何かをきっかけに感情を保留していることが多いパターンです。',
    conflict:
      '「どうでもいい」と自分に言い聞かせながら、この診断を受けている。' +
      'その事実自体が、あなたが気にしていることの証拠です。',
    mirror:
      '相手からは「何を考えているか読みにくい人」に見えています。' +
      '嫌われてはいませんが、相手も踏み込みかねています。',
    forecast:
      'このまま情報が増えなければ、3ヶ月後も保留のままです。' +
      '一度でも深い話をすれば、気持ちはどちらかにはっきり動きます。',
    todo: [
      '相手と、事実確認ではない雑談を30分してみる。',
      '会った後の自分の気分を、3回だけ記録してみる。',
      '答えを急がず、判断材料を増やすことに集中する。',
    ],
    ng: [
      '周囲の評価で自分の気持ちを決めること。',
      '結論を出すために無理に距離を詰めること。',
    ],
  },
};

function isAnswerSet(answers) {
  if (!answers || typeof answers !== 'object') return false;
  return QUESTIONS.every((q) => {
    const v = answers[q.id];
    return Number.isInteger(v) && v >= 0 && v < q.options.length;
  });
}

// 回答を6軸の0-100スコアへ正規化する
function scoreAnswers(answers) {
  const raw = AXES.reduce((acc, a) => ({ ...acc, [a.key]: 0 }), {});
  QUESTIONS.forEach((q) => {
    const option = q.options[answers[q.id]];
    Object.entries(option.w).forEach(([key, value]) => {
      raw[key] += value;
    });
  });
  const scores = {};
  AXES.forEach((a) => {
    scores[a.key] = Math.round((raw[a.key] / MAX_BY_AXIS[a.key]) * 100);
  });
  return scores;
}

function determineTypeId(s) {
  const values = AXES.map((a) => s[a.key]);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread < 18) return 'mikakutei';

  if (s.iradachi >= 48 && s.kyori >= 48 && s.aijou < 42) return 'hanare';
  if (s.iradachi >= 50 && (s.aijou >= 50 || s.shuchaku >= 50)) return 'ambivalent';
  if (s.shuchaku >= 60 && s.shuchaku >= s.shinrai) return 'shuchaku';
  if (s.keii >= 60 && s.keii >= s.aijou && s.shinrai < 60) return 'akogare';
  if (s.aijou >= 55 && s.shinrai >= 50 && s.iradachi < 45) return 'honmei';
  if (s.shinrai >= 55 && s.aijou < 45 && s.shuchaku < 45) return 'soubou';
  if (s.kyori >= 50 && s.aijou < 45) return 'nagori';

  const dominant = AXES.reduce((best, a) => (s[a.key] > s[best.key] ? a : best), AXES[0]).key;
  const fallback = {
    aijou: 'honmei',
    shinrai: 'soubou',
    shuchaku: 'shuchaku',
    keii: 'akogare',
    kyori: 'nagori',
    iradachi: 'ambivalent',
  };
  return fallback[dominant] || 'mikakutei';
}

function axisMeta(key) {
  return AXES.find((a) => a.key === key);
}

function relationLabel(relation) {
  const found = RELATIONS.find((r) => r.key === relation);
  return found ? found.who : 'あの人';
}

// 無料結果: タイプ名と本音の一行、そして6軸のうち2軸だけを開示する
function buildFreeResult({ scores, typeId, relation, targetLabel }) {
  const type = TYPES[typeId];
  const ranked = AXES.map((a) => ({ key: a.key, name: a.name, score: scores[a.key] }))
    .sort((x, y) => y.score - x.score);
  const who = targetLabel ? `${targetLabel}さん` : relationLabel(relation);

  return {
    type: { id: type.id, name: type.name, catch: type.catch, honne: type.honne },
    target: { relation: relation || 'other', label: targetLabel || null, who },
    headline: `${who}に対するあなたの本音は「${type.name}」`,
    openAxes: ranked.slice(0, 2),
    lockedAxes: ranked.slice(2).map((a) => ({ key: a.key, name: a.name })),
    shareText: `私の本音は「${type.name}」でした。${type.catch}`,
    lockedCount: ranked.length - 2,
  };
}

// 有料レポート: 全軸のスコアと解説、矛盾の指摘、相手側から見た姿、3ヶ月後の予測、行動指針
function buildFullResult({ scores, typeId, relation, targetLabel }) {
  const type = TYPES[typeId];
  const who = targetLabel ? `${targetLabel}さん` : relationLabel(relation);
  const axes = AXES.map((a) => ({
    key: a.key,
    name: a.name,
    description: a.description,
    score: scores[a.key],
    comment: axisComment(a.key, scores[a.key]),
  }));

  return {
    type: { id: type.id, name: type.name, catch: type.catch, honne: type.honne },
    target: { relation: relation || 'other', label: targetLabel || null, who },
    axes,
    deep: type.deep,
    conflict: type.conflict,
    mirror: type.mirror,
    forecast: type.forecast,
    balance: buildBalanceNote(scores, who),
    todo: type.todo,
    ng: type.ng,
  };
}

function axisComment(key, score) {
  const level = score >= 67 ? 'high' : score >= 34 ? 'mid' : 'low';
  const table = {
    aijou: {
      high: '心が動く回数が多く、相手はすでにあなたの日常の一部になっています。',
      mid: '惹かれてはいるものの、熱が一定ではありません。相手の出方に左右されやすい状態です。',
      low: 'ときめきの成分は小さく、この関係を動かしているのは別の感情です。',
    },
    shinrai: {
      high: '素の自分を見せられる相手です。これは関係のいちばん頑丈な土台になります。',
      mid: '信頼はあるけれど、まだ見せていない面が残っています。',
      low: 'どこかで気を張っています。安心して預けられる感覚はまだ育っていません。',
    },
    shuchaku: {
      high: '失う恐れが強く出ています。好意と混同しやすいので、切り分けが必要です。',
      mid: '不安は出ていますが、まだ自分でコントロールできる範囲です。',
      low: '相手の有無に振り回されていません。健やかな距離感を保てています。',
    },
    keii: {
      high: '相手を高く置いています。憧れは推進力になりますが、対等さを奪うこともあります。',
      mid: '尊敬しつつ、欠点も見えている良いバランスです。',
      low: '相手を特別扱いせず、等身大で見ています。',
    },
    kyori: {
      high: '心が休息を求めています。離れたい気持ちは、罪ではなく消耗のサインです。',
      mid: '近づきたい気持ちと引きたい気持ちが、交互に出ています。',
      low: '距離を詰めることに抵抗がありません。',
    },
    iradachi: {
      high: '飲み込んだ不満が溜まっています。伝えないままだと、好意の側から削れていきます。',
      mid: '小さな不満はありますが、まだ言葉にできる量です。',
      low: '我慢の蓄積はほとんどありません。',
    },
  };
  return table[key][level];
}

function buildBalanceNote(scores, who) {
  const loveVsFear = scores.aijou - scores.shuchaku;
  const stayVsLeave = (scores.aijou + scores.shinrai) / 2 - (scores.kyori + scores.iradachi) / 2;

  const fearNote =
    loveVsFear >= 15
      ? `${who}への気持ちは、不安よりも好意が上回っています。あなたの「好き」は自前のものです。`
      : loveVsFear <= -15
      ? `${who}への気持ちは、好意よりも「失う恐れ」が上回っています。動いているのは愛情より不安です。`
      : `好意と不安がほぼ同量で拮抗しています。どちらが自分の本音か見分けづらい、いちばん苦しい状態です。`;

  const stayNote =
    stayVsLeave >= 15
      ? '総合すると、あなたの心はまだこの関係の中に留まりたいと言っています。'
      : stayVsLeave <= -15
      ? '総合すると、あなたの心はすでに関係の外側に足を向けています。'
      : '総合すると、留まりたい気持ちと離れたい気持ちが同じ重さです。結論を急がず、判断材料を増やす時期です。';

  return `${fearNote}${stayNote}`;
}

module.exports = {
  AXES,
  RELATIONS,
  QUESTIONS,
  TYPES,
  isAnswerSet,
  scoreAnswers,
  determineTypeId,
  buildFreeResult,
  buildFullResult,
  axisMeta,
  relationLabel,
};
