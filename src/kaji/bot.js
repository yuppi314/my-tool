// LINE の Webhook イベントを処理する。返信(reply)は無料なので、案内はなるべく返信で返す。
const line = require('./line');
const svc = require('./service');

const HELP_NEW = [
  '家事の引き継ぎ表へようこそ。',
  '',
  '■ はじめての家族',
  '「家族を作る」と送ってください。家族コードが届きます。',
  '',
  '■ 家族に入る',
  '子ども:「参加 家族コード」',
  '親:「親で参加 家族コード」',
].join('\n');

const HELP = [
  '■ 使えることば',
  'ごちそうさま … 30分の片付けタイマー開始',
  '片付けた … 食後の片付けを記録',
  'おねがい 〜 … 家族に頼みごと',
  'ページ … 自分専用のページを開く',
  'ランキング … 今週の順位',
  '名前 〜 … 表示名を変える',
  'コード … 家族コードを見る',
].join('\n');

function xpLine(r) {
  const bonus = r.bonus?.length ? `(${r.bonus.map(b => (b === 'quest' ? 'クエスト' : 'スピード')).join('・')}ボーナス)` : '';
  const up = r.levelUp ? `\nレベルアップ! Lv${r.levelUp.level}「${r.levelUp.title}」` : '';
  return `+${r.xp} XP${bonus}${up}`;
}

async function displayName(userId) {
  const p = await line.getProfile(userId).catch(() => null);
  return (p?.displayName || '家族').slice(0, 20);
}

async function onText(userId, raw) {
  const t = raw.replace(/　/g, ' ').trim();
  const member = svc.memberByLine(userId);
  let m;

  if (!member) {
    if (t === '家族を作る') {
      const { family, member: me } = svc.createFamily(userId, await displayName(userId));
      return [
        line.text(`家族を作りました。\n家族コード: ${family.code}\n\n家族にはこのアカウントを友だち追加してもらい、\n子どもは「参加 ${family.code}」\n親は「親で参加 ${family.code}」\nと送ってもらってください。`),
        line.buttons('自分専用のページです。リンクは他の人に教えないでください。', [{ label: 'ページを開く', uri: svc.pageUrl(me) }]),
      ];
    }
    if ((m = t.match(/^(親で)?参加\s*([A-Za-z0-9]{6})$/))) {
      const { member: me } = svc.joinFamily(m[2], userId, await displayName(userId), m[1] ? 'parent' : 'child');
      return [
        line.text(`${me.role === 'parent' ? '親' : '子ども'}として家族に参加しました。\n\n${HELP}`),
        line.buttons('自分専用のページです。リンクは他の人に教えないでください。', [{ label: 'ページを開く', uri: svc.pageUrl(me) }]),
      ];
    }
    return line.text(HELP_NEW);
  }

  if (/^ごちそう(さま|様)/.test(t)) {
    const r = await svc.startMeal(member);
    const hhmm = new Date(r.deadline).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
    return line.text(`${svc.MEAL_MINUTES}分のタイマーを始めました(${hhmm}まで)。${r.notified ? '子どもに知らせました。' : ''}\nそれまでに片付けが記録されなければ、親にLINEが届きます。`);
  }
  if (/^(片付けた|かたづけた|片づけた)$/.test(t)) {
    return line.text(`食後の片付けを記録しました。${xpLine(await svc.finishMeal(member))}`);
  }
  if ((m = t.match(/^(おねがい|お願い)\s*([\s\S]*)$/))) {
    const r = await svc.createRequest(member, m[2]);
    return line.text(r.notified ? 'おねがいを送りました。引き受けたら知らせます。' : 'おねがいを登録しました。まだ送る相手が家族にいません。');
  }
  if (/^(ページ|表|記録)$/.test(t)) {
    return line.buttons('自分専用のページです。リンクは他の人に教えないでください。', [{ label: 'ページを開く', uri: svc.pageUrl(member) }]);
  }
  if (/^(ランキング|順位|ステータス)$/.test(t)) {
    const st = svc.status(member);
    const rank = svc.ranking(member.family_id).map((r, i) => `${i + 1}. ${r.name} ${r.xp} XP`).join('\n');
    return line.text(`あなた: Lv${st.level}「${st.title}」 ${st.xp} XP${st.streak ? ` ・ ${st.streak}日連続` : ''}\n\n■ 今週のランキング\n${rank}`);
  }
  if ((m = t.match(/^名前\s*(.+)$/))) {
    return line.text(`表示名を「${svc.rename(member, m[1])}」にしました。`);
  }
  if (t === 'コード') {
    const { code } = svc.state(member).family;
    return line.text(`家族コード: ${code}\n子どもは「参加 ${code}」、親は「親で参加 ${code}」と送ってください。`);
  }
  return line.text(HELP);
}

async function onPostback(userId, data) {
  const member = svc.memberByLine(userId);
  if (!member) return line.text(HELP_NEW);
  const p = new URLSearchParams(data);
  const id = Number(p.get('id'));
  switch (p.get('a')) {
    case 'meal_done':
      return line.text(`食後の片付けを記録しました。${xpLine(await svc.finishMeal(member))}`);
    case 'req_take': {
      const r = await svc.takeRequest(member, id);
      return line.buttons(`「${r.text}」を引き受けました。終わったら押してください。`, [{ label: 'できた', data: `a=req_done&id=${id}` }]);
    }
    case 'req_done': {
      const r = await svc.doneRequest(member, id);
      return line.text(`「${r.text}」おつかれさま。${xpLine(r)}`);
    }
    default:
      return line.text(HELP);
  }
}

async function handleEvent(ev) {
  const userId = ev.source?.userId;
  if (!userId || !ev.replyToken) return;
  let messages;
  try {
    if (ev.type === 'follow') messages = line.text(svc.memberByLine(userId) ? HELP : HELP_NEW);
    else if (ev.type === 'message' && ev.message?.type === 'text') messages = await onText(userId, ev.message.text);
    else if (ev.type === 'postback') messages = await onPostback(userId, ev.postback?.data || '');
    else return;
  } catch (err) {
    if (!(err instanceof svc.KajiError)) console.error('[kaji/bot]', err);
    messages = line.text(err instanceof svc.KajiError ? err.message : 'うまく処理できませんでした。少し待ってからもう一度送ってください。');
  }
  await line.reply(ev.replyToken, messages);
}

module.exports = { handleEvent };
