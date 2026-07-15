// 開業のときに使う書類の「入力する項目」の定義。
// 正式な書類名は法律で決まっているものですが、説明はやさしい言葉にしています。

const DOCUMENT_TYPES = {
  kaigyo_todoke: {
    title: '開業届',
    officialName: '個人事業の開業・廃業等届出書',
    summary: 'お仕事を始めたことを税務署に知らせる書類です。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    fields: [
      { key: 'full_name', label: '名前', type: 'text', placeholder: '例: 山田 太郎' },
      { key: 'birth_date', label: '生年月日', type: 'date' },
      { key: 'address', label: '住んでいる場所の住所', type: 'text', placeholder: '例: 東京都〇〇区〇〇1-2-3' },
      { key: 'phone', label: '電話番号', type: 'text', placeholder: '例: 090-1234-5678' },
      {
        key: 'business_name',
        label: '屋号(お店・事業の名前)',
        type: 'text',
        placeholder: '例: 山田デザイン事務所',
        help: '屋号はなくても大丈夫です。決めていない場合は空でも構いません。',
      },
      {
        key: 'business_address',
        label: '仕事をする場所の住所',
        type: 'text',
        placeholder: '自宅と同じ場合は同じ住所でOK',
      },
      {
        key: 'business_type',
        label: 'どんな仕事をしますか?',
        type: 'textarea',
        placeholder: '例: ウェブサイトのデザイン制作',
      },
      { key: 'start_date', label: '開業日(仕事を始める日)', type: 'date' },
      {
        key: 'income_type',
        label: '収入の種類',
        type: 'select',
        options: [
          { value: 'business', label: '事業所得(お店や個人の仕事など、ほとんどの場合はこれ)' },
          { value: 'real_estate', label: '不動産所得(部屋やビルを貸す仕事)' },
          { value: 'forestry', label: '山林所得(山や木を扱う仕事)' },
        ],
        help: '迷ったら「事業所得」を選ぶ人がほとんどです。',
      },
    ],
  },
  aoiro_shonin: {
    title: '青色申告承認申請書',
    officialName: '所得税の青色申告承認申請書',
    summary: '確定申告のとき、税金がおトクになる「青色申告」を選ぶための書類です。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    fields: [
      { key: 'full_name', label: '名前', type: 'text' },
      { key: 'address', label: '住んでいる場所の住所', type: 'text' },
      { key: 'business_name', label: '屋号(お店・事業の名前)', type: 'text', help: 'なければ空でも構いません。' },
      { key: 'start_date', label: '開業日', type: 'date' },
      {
        key: 'target_year',
        label: 'いつの年分から青色申告を使いたいですか?',
        type: 'text',
        placeholder: '例: 2026年分',
      },
      {
        key: 'bookkeeping_method',
        label: '帳簿のつけ方',
        type: 'select',
        options: [
          { value: 'double_entry', label: '複式簿記(お金の記録をしっかりつける。その分、税金の控除が多い)' },
          { value: 'simple_entry', label: '簡易簿記(記録が簡単。その分、税金の控除は少なめ)' },
        ],
        help: '会計ソフトを使えば、複式簿記でも思ったより難しくありません。',
      },
      {
        key: 'books_kept',
        label: '備え付ける帳簿(記録するノートの種類)',
        type: 'textarea',
        placeholder: '例: 現金出納帳、売掛帳、経費帳、固定資産台帳',
      },
    ],
  },
  senju_kyuyo: {
    title: '青色事業専従者給与に関する届出書',
    officialName: '青色事業専従者給与に関する届出書',
    summary: '家族に仕事を手伝ってもらい、お給料を払う場合に出す書類です。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    fields: [
      { key: 'full_name', label: '名前', type: 'text' },
      { key: 'business_name', label: '屋号(お店・事業の名前)', type: 'text' },
      { key: 'family_member_name', label: '手伝ってくれる家族の名前', type: 'text' },
      { key: 'relationship', label: '続柄', type: 'text', placeholder: '例: 妻、夫、子' },
      { key: 'job_content', label: 'どんな仕事を手伝ってもらいますか?', type: 'textarea' },
      { key: 'salary_amount', label: 'お給料の金額(1か月あたり)', type: 'number', placeholder: '例: 80000' },
      { key: 'start_month', label: '支払いを始める年月', type: 'month' },
    ],
  },
  kyuyo_jimusho: {
    title: '給与支払事務所等の開設届出書',
    officialName: '給与支払事務所等の開設・移転・廃止届出書',
    summary: '従業員(家族以外も含む)にお給料を払うようになったときに出す書類です。',
    whereToSubmit: '住んでいる場所を担当する税務署',
    fields: [
      { key: 'full_name', label: '名前', type: 'text' },
      { key: 'business_name', label: '屋号(お店・事業の名前)', type: 'text' },
      { key: 'open_date', label: '人を雇い始める(始めた)日', type: 'date' },
      { key: 'office_address', label: 'お給料を払う場所の住所', type: 'text' },
      { key: 'employee_count', label: '雇う人の人数', type: 'number' },
    ],
  },
};

module.exports = { DOCUMENT_TYPES };
