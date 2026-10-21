// 家事の引き継ぎ表の通しテスト。偽の LINE API を立て、サーバーを別 DB で起動して、
// 家族作成 → 参加 → ごちそうさま → 片付け → 期限切れ通知 → おねがい → Web API を確かめる。
// 例: node scripts/kaji-smoke.js
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert/strict');

const SECRET = 'smoke-secret';
const APP_PORT = 3901;
const LINE_PORT = 3902;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaji-smoke-'));
const sent = [];

const names = { U_parent: 'はは', U_child: 'むすめ' };
const lineMock = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const profile = req.url.match(/^\/v2\/bot\/profile\/(.+)$/);
    if (profile) return res.end(JSON.stringify({ displayName: names[decodeURIComponent(profile[1])] }));
    sent.push({ path: req.url, body: JSON.parse(body) });
    res.end('{}');
  });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const base = `http://localhost:${APP_PORT}`;

async function webhook(events, { sign = true } = {}) {
  const raw = JSON.stringify({ events });
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('base64');
  const res = await fetch(`${base}/webhook/line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-line-signature': sign ? sig : 'bad' },
    body: raw,
  });
  await sleep(150); // イベントは 200 を返した後に処理される
  return res.status;
}
let tokenSeq = 0;
const say = (userId, text) => webhook([{ type: 'message', replyToken: `r${++tokenSeq}`, source: { userId }, message: { type: 'text', text } }]);
const tap = (userId, data) => webhook([{ type: 'postback', replyToken: `r${++tokenSeq}`, source: { userId }, postback: { data } }]);
const lastReply = () => [...sent].reverse().find(s => s.path.endsWith('/reply')).body.messages;
const pushesTo = (userId, since) => sent.slice(since).filter(s => s.path.endsWith('/push') && s.body.to === userId);
const allText = msgs => msgs.map(m => m.text || m.template?.text || '').join('\n');
const tokenFrom = msgs => msgs.flatMap(m => m.template?.actions || []).find(a => a.uri)?.uri.match(/t=([0-9a-f]+)/)[1];

async function api(pathname, token, body) {
  const res = await fetch(`${base}/api/kaji/${pathname}${body ? '' : `?t=${token}`}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, t: token }) }
    : undefined);
  return { status: res.status, data: await res.json() };
}

async function main() {
  await new Promise(r => lineMock.listen(LINE_PORT, r));
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: APP_PORT, DATA_DIR: dataDir, BASE_URL: base,
      LINE_CHANNEL_SECRET: SECRET, LINE_CHANNEL_ACCESS_TOKEN: 'smoke-token', LINE_API_BASE: `http://localhost:${LINE_PORT}`,
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    for (let i = 0; i < 50; i++) {
      if (await fetch(`${base}/health`).then(r => r.ok, () => false)) break;
      await sleep(100);
    }

    assert.equal(await webhook([], { sign: false }), 401, '署名が違う Webhook は 401');

    await say('U_parent', '家族を作る');
    const code = allText(lastReply()).match(/家族コード: ([A-Z0-9]{6})/)[1];
    const parentToken = tokenFrom(lastReply());
    assert.ok(parentToken, '親にページのリンクが届く');

    await say('U_child', `参加 ${code}`);
    assert.match(allText(lastReply()), /子どもとして家族に参加/);
    const childToken = tokenFrom(lastReply());

    // ごちそうさま → 子どもに通知 → 片付けた でスピードボーナス
    let mark = sent.length;
    await say('U_parent', 'ごちそうさま');
    assert.equal(pushesTo('U_child', mark).length, 1, 'ごちそうさまで子どもに push');
    assert.equal(pushesTo('U_parent', mark).length, 0, '押した親自身には push しない');
    await tap('U_child', 'a=meal_done');
    assert.match(allText(lastReply()), /スピード/, '30分以内ならスピードボーナス');

    // 期限切れ: 次の食事の締め切りを過去にして、タイマーが親に1回だけ知らせるか
    await say('U_parent', 'ごちそうさま');
    const Database = require('better-sqlite3');
    const raw = new Database(path.join(dataDir, 'app.db'));
    raw.prepare("UPDATE kaji_meals SET deadline_at = '2000-01-01T00:00:00.000Z' WHERE done_at IS NULL").run();
    mark = sent.length;
    await sleep(61 * 1000); // startTimers は1分ごと
    assert.equal(pushesTo('U_parent', mark).length, 1, '期限切れで親に push');
    assert.match(pushesTo('U_parent', mark)[0].body.messages[0].text, /まだ記録されていません/);
    await sleep(100);
    assert.equal(pushesTo('U_parent', mark).length, 1, '同じ食事で二度は知らせない');
    await tap('U_child', 'a=meal_done');
    assert.doesNotMatch(allText(lastReply()), /スピード/, '期限後はボーナスなし');

    // おねがい: 親 → 子ども、引き受け・完了で親に知らせる
    mark = sent.length;
    await say('U_parent', 'おねがい 19時までにお米をといでおいて');
    const reqPush = pushesTo('U_child', mark)[0];
    const takeData = reqPush.body.messages[0].template.actions[0].data;
    await tap('U_child', takeData);
    assert.match(allText(lastReply()), /引き受けました/);
    await tap('U_child', takeData.replace('req_take', 'req_done'));
    assert.match(allText(lastReply()), /\+15 XP/);
    assert.equal(pushesTo('U_parent', mark).length, 2, '引き受け・完了で親に2回 push');

    // Web API
    assert.equal((await api('state', 'nope')).status, 401, '無効なトークンは 401');
    const st = (await api('state', childToken)).data;
    assert.equal(st.me.role, 'child');
    assert.equal(st.members.length, 2);
    assert.ok(st.me.xp >= 40 + 20 + 15, `子どもの XP が加算されている (${st.me.xp})`);
    const dishes = st.chores.find(c => c.title === '茶碗洗い');
    const logged = await api('logs', childToken, { choreId: dishes.id });
    assert.equal(logged.status, 200);
    const logId = logged.data.state.logs[0].id;
    assert.equal((await api(`logs/${logId}/thanks`, childToken, {})).status, 400, '自分の記録にはありがとうできない');
    const thanked = await api(`logs/${logId}/thanks`, parentToken, {});
    assert.equal(thanked.data.state.logs[0].thanks, 1);
    assert.equal((await api('chores', childToken, { title: 'x', steps: 'y' })).status, 400, '子どもは家事を追加できない');
    assert.equal((await api('chores', parentToken, { title: 'お風呂掃除', steps: '洗う\n流す', xp: 30 })).status, 200);
    assert.equal((await api('reward', parentToken, { text: '晩ごはんリクエスト権', xp: 200 })).data.state.family.reward.xp, 200);

    const rank = (await api('state', parentToken)).data.ranking;
    assert.equal(rank[0].name, 'むすめ', 'ランキング1位は子ども');

    console.log('OK: 家事の引き継ぎ表の通しテストがすべて通りました');
  } finally {
    server.kill();
    lineMock.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
