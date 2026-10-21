// 家事の引き継ぎ表: LINE Webhook と、Webページ(public/kaji/)用の API。
// Webページは LINE で配る本人専用リンク(?t=トークン)で本人を判定する。
const express = require('express');
const line = require('./line');
const bot = require('./bot');
const svc = require('./service');

// LINE の署名検証には raw body が必要なので、express.json() より前に登録する。
function lineWebhookHandler(req, res) {
  if (!line.verifySignature(req.body, req.get('x-line-signature'))) {
    return res.status(401).json({ error: '署名を確認できませんでした。LINE_CHANNEL_SECRET を確認してください。' });
  }
  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'JSON を読み取れませんでした。' });
  }
  // LINE には先に 200 を返し、イベントはその後に処理する。
  res.json({ ok: true });
  for (const ev of body.events || []) bot.handleEvent(ev).catch(err => console.error('[kaji/webhook]', err));
}

const router = express.Router();

function auth(req, res, next) {
  const member = svc.memberByToken(req.query.t || req.body?.t);
  if (!member) return res.status(401).json({ error: 'リンクが無効です。LINE で「ページ」と送って、新しいリンクを開いてください。' });
  req.member = member;
  next();
}

// KajiError は利用者向けの文言なので 400 でそのまま返す。
const wrap = fn => async (req, res) => {
  try {
    const out = await fn(req);
    res.json({ ok: true, ...(out || {}), state: svc.state(req.member) });
  } catch (err) {
    if (err instanceof svc.KajiError) return res.status(400).json({ error: err.message });
    console.error('[kaji/api]', err);
    res.status(500).json({ error: '保存できませんでした。少し待ってからもう一度お試しください。' });
  }
};

router.get('/kaji/state', auth, (req, res) => res.json(svc.state(req.member)));
router.post('/kaji/logs', auth, wrap(async req => ({ result: await svc.logChore(req.member, Number(req.body.choreId)) })));
router.post('/kaji/logs/:id/thanks', auth, wrap(req => svc.toggleThanks(req.member, Number(req.params.id))));
router.post('/kaji/meal', auth, wrap(async req => ({ result: await svc.startMeal(req.member) })));
router.post('/kaji/requests', auth, wrap(async req => ({ result: await svc.createRequest(req.member, req.body.text) })));
router.post('/kaji/requests/:id/take', auth, wrap(async req => { await svc.takeRequest(req.member, Number(req.params.id)); }));
router.post('/kaji/requests/:id/done', auth, wrap(async req => ({ result: await svc.doneRequest(req.member, Number(req.params.id)) })));
router.post('/kaji/requests/:id/cancel', auth, wrap(req => svc.cancelRequest(req.member, Number(req.params.id))));
router.post('/kaji/chores', auth, wrap(req => svc.addChore(req.member, req.body)));
router.post('/kaji/chores/:id/level', auth, wrap(req => svc.setLevel(req.member, Number(req.params.id), req.body.level)));
router.post('/kaji/reward', auth, wrap(req => svc.setReward(req.member, req.body.text, req.body.xp)));

// 食後タイマーの期限切れを毎分確認する。Render の無料プランは15分アクセスがないと止まるので、README の外部 ping を参照。
function startTimers() {
  const tick = () => svc.checkOverdueMeals().catch(err => console.error('[kaji/timer]', err));
  tick();
  return setInterval(tick, 60 * 1000);
}

module.exports = { router, lineWebhookHandler, startTimers };
