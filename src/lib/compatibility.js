// 2人分のプロフィールから相性診断を合成するロジック(有料機能)
const kyusei = require('./kyusei');

const RELATION_SCORE = {
  same: 80,
  generates: 92,
  generatedBy: 88,
  controls: 55,
  controlledBy: 60,
  neutral: 70,
};

const RELATION_TEXT = {
  same: '同じ気質を持つ者同士。価値観が似ていて安心感がありますが、似た者ゆえの衝突にも注意。',
  generates: 'あなたが相手を育てる関係。あなたの働きかけが相手の成長を後押しする、良い流れの相性。',
  generatedBy: '相手があなたを育てる関係。相手からの影響やサポートを受け取りやすい、心地よい相性。',
  controls: 'あなたが相手を抑える関係。主導権を握りやすい反面、相手を尊重する意識が大切。',
  controlledBy: '相手があなたを抑える関係。相手に主導権が傾きやすいので、自分の意見も伝えましょう。',
  neutral: '互いに干渉しすぎない、独立性の高い相性。適度な距離感がうまくいく秘訣。',
};

function buildCompatibility(profileA, profileB) {
  const relation = kyusei.elementRelation(profileA.star.element, profileB.star.element);
  const score = RELATION_SCORE[relation];
  const kinDiff = Math.abs(profileA.kin - profileB.kin) % 260;
  const sealBonus = profileA.seal.id === profileB.seal.id ? 5 : 0;
  const totalScore = Math.min(100, score + sealBonus);

  return {
    score: totalScore,
    elementRelation: relation,
    text: `${profileA.star.name}(${profileA.star.element})と${profileB.star.name}(${profileB.star.element})の関係は「${RELATION_TEXT[relation]}」 マヤ暦では${profileA.seal.name}と${profileB.seal.name}の組み合わせで、KINの差は${kinDiff}。${sealBonus ? '同じ紋章同士で価値観の共鳴が期待できます。' : ''}`,
  };
}

module.exports = { buildCompatibility };
