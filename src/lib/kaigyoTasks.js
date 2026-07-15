// 個人事業を始めるときにやることリストのもと(テンプレート)
// できるだけ難しい言葉を使わず、高校生でも読んでわかるように説明を書いています。

const CATEGORIES = {
  tax: '税務署への届け出',
  insurance: '健康保険・年金',
  bank: '銀行',
  other: 'そのほか',
};

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr, months) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// タスクのもとになる定義。condition(profile) が true のものだけタスクになる。
const TASK_TEMPLATES = [
  {
    key: 'kaigyo_todoke',
    category: 'tax',
    title: 'お仕事を始めたことを税務署に知らせる(開業届)',
    description:
      '個人事業を始めたことを税務署に知らせるための書類です。出さなくても罰金はありませんが、出しておくと「青色申告」を選べるようになるなど良いことがあります。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    condition: () => true,
    dueDate: (p) => addMonths(p.start_date, 1),
    dueNote: '開業日から1か月以内が目安です。',
  },
  {
    key: 'aoiro_shonin',
    category: 'tax',
    title: '税金がお得になる「青色申告」を選ぶ書類',
    description:
      '確定申告のときに税金の計算がおトクになる「青色申告」を選びたい人が出す書類です。期限を過ぎると、その年は青色申告を選べなくなるので気をつけましょう。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    condition: (p) => !!p.wants_blue_tax_return,
    dueDate: (p) => addMonths(p.start_date, 2),
    dueNote: '開業日から2か月以内が目安です(1月1日〜1月15日に開業した人は、その年の3月15日までのこともあります)。',
  },
  {
    key: 'senju_kyuyo',
    category: 'tax',
    title: '家族に払うお給料を税務署に知らせる書類',
    description:
      '家族が仕事を手伝ってくれて、その人にお給料を払う場合に必要な書類です。この届け出をしないと、家族への給料を経費にできません。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    condition: (p) => !!p.has_family_employee,
    dueDate: (p) => addMonths(p.start_date, 2),
    dueNote: '開業日から2か月以内が目安です。',
  },
  {
    key: 'kyuyo_jimusho',
    category: 'tax',
    title: '人を雇うことを税務署に知らせる書類',
    description: '従業員(家族も含む)にお給料を払うようになったときに出す書類です。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    condition: (p) => !!p.has_employee,
    dueDate: (p) => addMonths(p.start_date, 1),
    dueNote: '給料の支払いを始めてから1か月以内が目安です。',
  },
  {
    key: 'kokumin_kenko_hoken',
    category: 'insurance',
    title: '健康保険を「国民健康保険」に切りかえる',
    description:
      '会社を辞めると、それまでの健康保険が使えなくなります。住んでいる市区町村の窓口で「国民健康保険」への切りかえ手続きをしましょう。',
    whereToSubmit: '住んでいる市区町村の役所',
    condition: (p) => p.previous_status === 'company_employee',
    dueDate: (p) => addDays(p.resign_date || p.start_date, 14),
    dueNote: '会社を辞めた日の翌日から14日以内が目安です。',
  },
  {
    key: 'kokumin_nenkin',
    category: 'insurance',
    title: '年金を「国民年金」に切りかえる',
    description:
      '会社を辞めると厚生年金を抜けることになるので、自分で国民年金に入る手続きが必要です。',
    whereToSubmit: '住んでいる市区町村の役所、または年金事務所',
    condition: (p) => p.previous_status === 'company_employee',
    dueDate: (p) => addDays(p.resign_date || p.start_date, 14),
    dueNote: '会社を辞めた日の翌日から14日以内が目安です。',
  },
  {
    key: 'bank_account',
    category: 'bank',
    title: '仕事用の銀行口座を作る',
    description:
      '自分のお金と仕事のお金を分けておくと、後で帳簿(お金の記録)をつけるときにとても楽になります。屋号(お店や事業の名前)入りの口座が作れる銀行もあります。',
    whereToSubmit: '銀行の窓口',
    condition: () => true,
    dueDate: () => null,
    dueNote: '決まった期限はありませんが、早めに作っておくのがおすすめです。',
  },
  {
    key: 'kyosai',
    category: 'other',
    title: '将来のための積み立て制度を調べる(小規模企業共済)',
    description:
      '個人事業主には会社員のような退職金がありません。毎月お金を積み立てておくと、将来受け取れて、税金の負担も少し軽くなる制度があります。余裕があれば調べてみましょう。',
    whereToSubmit: '商工会議所・金融機関など',
    condition: () => true,
    dueDate: () => null,
    dueNote: '決まった期限はありません。気になったら調べてみましょう。',
  },
  {
    key: 'subsidy_check',
    category: 'other',
    title: 'もらえるお金(補助金・助成金)がないか調べる',
    description:
      '開業したばかりの人が使えるお金の支援制度があるかもしれません。このツールの「補助金・助成金をさがす」ページで調べてみましょう。',
    whereToSubmit: 'このツールの「補助金・助成金をさがす」ページ',
    condition: () => true,
    dueDate: () => null,
    dueNote: '決まった期限はありません。早めに調べておくと安心です。',
  },
];

// プロフィールの内容から、そのプロフィールに必要なタスクの一覧を作る
function buildTasksForProfile(profile) {
  return TASK_TEMPLATES.filter((t) => t.condition(profile)).map((t, index) => {
    const due = profile.start_date ? t.dueDate(profile) : null;
    return {
      templateKey: t.key,
      category: t.category,
      title: t.title,
      description: `${t.description}\n${t.dueNote}`,
      whereToSubmit: t.whereToSubmit,
      dueDate: due,
      sortOrder: index,
    };
  });
}

module.exports = { CATEGORIES, TASK_TEMPLATES, buildTasksForProfile, addDays, addMonths };
