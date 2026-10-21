// 家事の引き継ぎ表の中心ロジック。LINE の Webhook と Web ページの API の両方から使う。
const crypto = require('crypto');
const db = require('./db');
const line = require('./line');

const MEAL_MINUTES = 30;
const REQUEST_XP = 15;
const THANKS_XP = 5;
const TITLES = [[1, '居候'], [2, '同居人'], [4, '家事見習い'], [6, '戦力'], [9, '家の柱'], [13, '生活の達人']];

const DEFAULT_CHORES = [
  {
    title: '食後の片付け', xp: 20, is_meal: 1,
    steps: ['残ったおかずを保存容器に移す', '蓋かラップをする', '冷蔵庫に入れる', '空いた皿をシンクに運ぶ', 'テーブルを拭く'],
    tip: '料理は常温に2時間以上置くと菌が増えて食中毒の原因になる、と理由を一度だけ伝えます。',
  },
  {
    title: '茶碗洗い', xp: 20, is_meal: 0,
    steps: ['シンクの食器を全部洗う(鍋・フライパンも)', '洗剤が残らないようにすすぐ', '水切りカゴに立てて置く', '乾いたら拭いて食器棚に戻す', '排水口の生ゴミを捨てる', 'シンクとコンロ周りをさっと拭く', 'スポンジを絞って置く'],
    tip: '最初は「戻すところまでが茶碗洗い」と一緒に1回通しでやると、基準のズレがなくなります。',
  },
  {
    title: '洗濯物を片付ける', xp: 20, is_meal: 0,
    steps: ['乾いた洗濯物を全部取り込む', '自分の分・家族の分に分ける', 'たたむ(タオルは決まった折り方で)', 'それぞれの引き出し・棚にしまう', 'ハンガーと洗濯ばさみを元の場所に戻す'],
    tip: 'たたみ方は写真を1枚撮って見せると、口で説明するより早く伝わります。',
  },
];

class KajiError extends Error {}

// ---- 時刻(日本時間で日・週を区切る) ----
const JST_MS = 9 * 3600 * 1000;
const nowIso = () => new Date().toISOString();
const jstDay = iso => new Date(new Date(iso).getTime() + JST_MS).toISOString().slice(0, 10);
function weekStartIso(now = new Date()) {
  const j = new Date(now.getTime() + JST_MS);
  j.setUTCHours(0, 0, 0, 0);
  j.setUTCDate(j.getUTCDate() - ((j.getUTCDay() + 6) % 7));
  return new Date(j.getTime() - JST_MS).toISOString();
}

// ---- レベル ----
// レベル L は 25·L·(L−1) XP から: Lv2 = 50, Lv3 = 150, Lv5 = 500, Lv10 = 2250。
const xpAt = L => 25 * L * (L - 1);
function levelOf(xp) {
  let L = 1;
  while (xpAt(L + 1) <= xp) L++;
  return L;
}
const titleOf = L => TITLES.filter(([n]) => L >= n).pop()[1];

// ---- 取得 ----
const pageUrl = member => `${(process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/kaji/?t=${member.token}`;
const memberByLine = id => db.prepare('SELECT * FROM kaji_members WHERE line_user_id = ?').get(id);
const memberByToken = t => (t ? db.prepare('SELECT * FROM kaji_members WHERE token = ?').get(String(t)) : undefined);
const members = fid => db.prepare('SELECT * FROM kaji_members WHERE family_id = ? ORDER BY id').all(fid);
const family = fid => db.prepare('SELECT * FROM kaji_families WHERE id = ?').get(fid);
function chores(fid) {
  return db.prepare('SELECT * FROM kaji_chores WHERE family_id = ? ORDER BY sort, id').all(fid)
    .map(c => ({ ...c, steps: JSON.parse(c.steps), is_meal: Boolean(c.is_meal) }));
}
const openMeal = fid => db.prepare('SELECT * FROM kaji_meals WHERE family_id = ? AND done_at IS NULL ORDER BY id DESC LIMIT 1').get(fid);

// 今日のクエスト: 日付と家族から決まるので、家族全員に同じ家事が出る。
function questChore(fid, day = jstDay(nowIso())) {
  const list = chores(fid);
  if (!list.length) return null;
  let h = 0;
  for (const ch of `${fid}:${day}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

function personXp(memberId, sinceIso = '') {
  const logs = db.prepare('SELECT COALESCE(SUM(xp), 0) AS x FROM kaji_logs WHERE member_id = ? AND at >= ?').get(memberId, sinceIso).x;
  const thanks = db.prepare(`SELECT COUNT(*) AS c FROM kaji_thanks t JOIN kaji_logs l ON l.id = t.log_id
    WHERE l.member_id = ? AND l.at >= ?`).get(memberId, sinceIso).c;
  const reqs = db.prepare(`SELECT COALESCE(SUM(xp), 0) AS x FROM kaji_requests
    WHERE taken_by = ? AND status = 'done' AND done_at >= ?`).get(memberId, sinceIso).x;
  return logs + thanks * THANKS_XP + reqs;
}

function streakOf(memberId) {
  const days = new Set(db.prepare('SELECT at FROM kaji_logs WHERE member_id = ?').all(memberId).map(r => jstDay(r.at)));
  const d = new Date(Date.now() + JST_MS);
  let n = 0;
  if (!days.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

function ranking(fid) {
  const since = weekStartIso();
  return members(fid)
    .map(m => ({ id: m.id, name: m.name, role: m.role, xp: personXp(m.id, since) }))
    .sort((a, b) => b.xp - a.xp);
}

function status(member) {
  const xp = personXp(member.id);
  const level = levelOf(xp);
  return { xp, level, title: titleOf(level), nextAt: xpAt(level + 1), curAt: xpAt(level), streak: streakOf(member.id) };
}

// ---- 家族 ----
function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), b => chars[b % chars.length]).join('');
    if (!db.prepare('SELECT 1 FROM kaji_families WHERE code = ?').get(code)) return code;
  }
}

function addMember(fid, lineUserId, name, role) {
  if (memberByLine(lineUserId)) throw new KajiError('すでに家族に参加しています。');
  const token = crypto.randomBytes(18).toString('hex');
  const info = db.prepare('INSERT INTO kaji_members (family_id, line_user_id, name, role, token) VALUES (?, ?, ?, ?, ?)')
    .run(fid, lineUserId, name, role, token);
  return db.prepare('SELECT * FROM kaji_members WHERE id = ?').get(info.lastInsertRowid);
}

const createFamily = db.transaction((lineUserId, name) => {
  if (memberByLine(lineUserId)) throw new KajiError('すでに家族に参加しています。');
  const fid = db.prepare('INSERT INTO kaji_families (code) VALUES (?)').run(newCode()).lastInsertRowid;
  const ins = db.prepare('INSERT INTO kaji_chores (family_id, title, steps, tip, xp, is_meal, sort) VALUES (?, ?, ?, ?, ?, ?, ?)');
  DEFAULT_CHORES.forEach((c, i) => ins.run(fid, c.title, JSON.stringify(c.steps), c.tip, c.xp, c.is_meal, i));
  const member = addMember(fid, lineUserId, name, 'parent');
  return { family: family(fid), member };
});

function joinFamily(code, lineUserId, name, role) {
  const f = db.prepare('SELECT * FROM kaji_families WHERE code = ?').get(String(code).toUpperCase().trim());
  if (!f) throw new KajiError('家族コードが見つかりません。もう一度確かめてください。');
  return { family: f, member: addMember(f.id, lineUserId, name, role) };
}

function rename(member, name) {
  const n = String(name).trim().slice(0, 20);
  if (!n) throw new KajiError('名前を入れてください。');
  db.prepare('UPDATE kaji_members SET name = ? WHERE id = ?').run(n, member.id);
  return n;
}

// ---- 通知 ----
async function pushTo(list, messages) {
  for (const m of list) await line.push(m.line_user_id, messages);
}
const others = (member, role) => members(member.family_id).filter(m => m.id !== member.id && (!role || m.role === role));

// ---- 食後タイマー ----
async function startMeal(member) {
  const now = new Date();
  const deadline = new Date(now.getTime() + MEAL_MINUTES * 60000);
  // 前の食事が残っていたら、通知せずに閉じる。
  db.prepare("UPDATE kaji_meals SET notified_at = COALESCE(notified_at, ?), done_at = ? WHERE family_id = ? AND done_at IS NULL")
    .run(now.toISOString(), now.toISOString(), member.family_id);
  db.prepare('INSERT INTO kaji_meals (family_id, started_by, started_at, deadline_at) VALUES (?, ?, ?, ?)')
    .run(member.family_id, member.id, now.toISOString(), deadline.toISOString());
  const hhmm = deadline.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
  const targets = others(member, 'child');
  await pushTo(targets, line.buttons(
    `ごちそうさま！${hhmm}までに食後の片付けをすると経験値2倍。\n残り物を容器に移して冷蔵庫へ。`,
    [{ label: '片付けた', data: 'a=meal_done' }]
  ));
  return { deadline: deadline.toISOString(), notified: targets.length };
}

async function logChore(member, choreId) {
  const chore = db.prepare('SELECT * FROM kaji_chores WHERE id = ? AND family_id = ?').get(choreId, member.family_id);
  if (!chore) throw new KajiError('その家事は見つかりません。');
  const at = nowIso();
  const bonus = [];
  if (questChore(member.family_id)?.id === chore.id) bonus.push('quest');
  let meal = null;
  if (chore.is_meal) {
    meal = openMeal(member.family_id);
    if (meal && at <= meal.deadline_at) bonus.push('speed');
  }
  const before = levelOf(personXp(member.id));
  const xp = chore.xp * 2 ** bonus.length;
  const logId = db.prepare('INSERT INTO kaji_logs (family_id, chore_id, member_id, xp, bonus, at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(member.family_id, chore.id, member.id, xp, JSON.stringify(bonus), at).lastInsertRowid;
  if (meal) {
    db.prepare('UPDATE kaji_meals SET done_at = ?, done_by = ? WHERE id = ?').run(at, member.id, meal.id);
    if (process.env.KAJI_NOTIFY_DONE === 'true') {
      await pushTo(others(member, 'parent'), line.text(`${member.name}さんが食後の片付けをしました(+${xp} XP)。`));
    }
  }
  const after = levelOf(personXp(member.id));
  return { logId, chore: chore.title, xp, bonus, levelUp: after > before ? { level: after, title: titleOf(after) } : null };
}

async function finishMeal(member) {
  const chore = db.prepare('SELECT id FROM kaji_chores WHERE family_id = ? AND is_meal = 1 ORDER BY sort LIMIT 1').get(member.family_id);
  if (!chore) throw new KajiError('「食後の片付け」の家事がありません。Webページで追加してください。');
  return logChore(member, chore.id);
}

// 期限を過ぎても片付けが記録されていない食事を、親に1回だけ知らせる。
async function checkOverdueMeals() {
  const now = nowIso();
  const due = db.prepare('SELECT * FROM kaji_meals WHERE done_at IS NULL AND notified_at IS NULL AND deadline_at <= ?').all(now);
  for (const meal of due) {
    db.prepare('UPDATE kaji_meals SET notified_at = ? WHERE id = ?').run(now, meal.id);
    const parents = members(meal.family_id).filter(m => m.role === 'parent');
    await pushTo(parents, line.text(`ごちそうさまから${MEAL_MINUTES}分たちましたが、食後の片付けがまだ記録されていません。`));
  }
  return due.length;
}

// ---- おねがい ----
async function createRequest(member, text) {
  const t = String(text || '').trim().slice(0, 60);
  if (!t) throw new KajiError('おねがいの内容を書いてください。例: おねがい 19時までにお米をといでおいて');
  const id = db.prepare('INSERT INTO kaji_requests (family_id, text, by_member, xp, at) VALUES (?, ?, ?, ?, ?)')
    .run(member.family_id, t, member.id, REQUEST_XP, nowIso()).lastInsertRowid;
  // 親からのおねがいは子どもへ、子どもからは親へ届ける。
  const targets = others(member, member.role === 'parent' ? 'child' : 'parent');
  await pushTo(targets, line.buttons(`${member.name}さんからおねがい:\n${t}`, [{ label: '引き受けた', data: `a=req_take&id=${id}` }]));
  return { id, notified: targets.length };
}

function getRequest(member, id) {
  const r = db.prepare('SELECT * FROM kaji_requests WHERE id = ? AND family_id = ?').get(id, member.family_id);
  if (!r) throw new KajiError('そのおねがいは見つかりません。');
  return r;
}

async function takeRequest(member, id) {
  const r = getRequest(member, id);
  if (r.status !== 'open') throw new KajiError(r.status === 'accepted' ? 'もう誰かが引き受けています。' : 'このおねがいは終わっています。');
  if (r.by_member === member.id) throw new KajiError('自分のおねがいは引き受けられません。');
  db.prepare("UPDATE kaji_requests SET status = 'accepted', taken_by = ? WHERE id = ?").run(member.id, id);
  const requester = db.prepare('SELECT * FROM kaji_members WHERE id = ?').get(r.by_member);
  if (requester) await line.push(requester.line_user_id, line.text(`${member.name}さんが「${r.text}」を引き受けました。`));
  return r;
}

async function doneRequest(member, id) {
  const r = getRequest(member, id);
  if (r.status !== 'accepted' || r.taken_by !== member.id) throw new KajiError('引き受けたおねがいだけ「できた」にできます。');
  const before = levelOf(personXp(member.id));
  db.prepare("UPDATE kaji_requests SET status = 'done', done_at = ? WHERE id = ?").run(nowIso(), id);
  const requester = db.prepare('SELECT * FROM kaji_members WHERE id = ?').get(r.by_member);
  if (requester) await line.push(requester.line_user_id, line.text(`${member.name}さんが「${r.text}」をやりました。`));
  const after = levelOf(personXp(member.id));
  return { xp: r.xp, text: r.text, levelUp: after > before ? { level: after, title: titleOf(after) } : null };
}

function cancelRequest(member, id) {
  const r = getRequest(member, id);
  if (r.by_member !== member.id || r.status !== 'open') throw new KajiError('まだ誰も引き受けていない自分のおねがいだけ取り消せます。');
  db.prepare("UPDATE kaji_requests SET status = 'cancelled' WHERE id = ?").run(id);
}

// ---- Webページ用 ----
function toggleThanks(member, logId) {
  const log = db.prepare('SELECT * FROM kaji_logs WHERE id = ? AND family_id = ?').get(logId, member.family_id);
  if (!log) throw new KajiError('その記録は見つかりません。');
  if (log.member_id === member.id) throw new KajiError('自分の記録には押せません。');
  const del = db.prepare('DELETE FROM kaji_thanks WHERE log_id = ? AND member_id = ?').run(logId, member.id);
  if (!del.changes) db.prepare('INSERT INTO kaji_thanks (log_id, member_id) VALUES (?, ?)').run(logId, member.id);
}

function addChore(member, { title, steps, xp }) {
  if (member.role !== 'parent') throw new KajiError('家事の追加は親だけができます。');
  const t = String(title || '').trim().slice(0, 30);
  const s = (Array.isArray(steps) ? steps : String(steps || '').split('\n')).map(x => String(x).trim()).filter(Boolean).slice(0, 12);
  if (!t || !s.length) throw new KajiError('家事の名前と、手順を1つ以上入れてください。');
  const x = [10, 20, 30, 40].includes(Number(xp)) ? Number(xp) : 20;
  const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM kaji_chores WHERE family_id = ?').get(member.family_id).s;
  db.prepare('INSERT INTO kaji_chores (family_id, title, steps, xp, sort) VALUES (?, ?, ?, ?, ?)').run(member.family_id, t, JSON.stringify(s), x, sort);
}

function setLevel(member, choreId, level) {
  const lv = Math.min(4, Math.max(1, Number(level) || 1));
  const r = db.prepare('UPDATE kaji_chores SET level = ? WHERE id = ? AND family_id = ?').run(lv, choreId, member.family_id);
  if (!r.changes) throw new KajiError('その家事は見つかりません。');
}

function setReward(member, text, xp) {
  if (member.role !== 'parent') throw new KajiError('ごほうびは親が決めます。');
  const t = String(text || '').trim().slice(0, 40);
  const x = Math.max(50, Math.round(Number(xp) / 50) * 50 || 0);
  db.prepare('UPDATE kaji_families SET reward_text = ?, reward_xp = ? WHERE id = ?').run(t || null, t ? x : null, member.family_id);
}

function state(member) {
  const fid = member.family_id;
  const f = family(fid);
  const logs = db.prepare(`SELECT l.*, (SELECT COUNT(*) FROM kaji_thanks t WHERE t.log_id = l.id) AS thanks,
      EXISTS (SELECT 1 FROM kaji_thanks t WHERE t.log_id = l.id AND t.member_id = ?) AS thanked
    FROM kaji_logs l WHERE l.family_id = ? ORDER BY l.at DESC LIMIT 200`).all(member.id, fid)
    .map(l => ({ ...l, bonus: JSON.parse(l.bonus), thanked: Boolean(l.thanked) }));
  const today = jstDay(nowIso());
  const requests = db.prepare(`SELECT * FROM kaji_requests WHERE family_id = ? AND status != 'cancelled' ORDER BY at DESC LIMIT 100`).all(fid)
    .filter(r => r.status !== 'done' || jstDay(r.done_at) === today);
  const meal = openMeal(fid);
  return {
    me: { id: member.id, name: member.name, role: member.role, ...status(member) },
    family: { code: f.code, reward: f.reward_text ? { text: f.reward_text, xp: f.reward_xp } : null },
    members: members(fid).map(m => ({ id: m.id, name: m.name, role: m.role })),
    chores: chores(fid),
    quest: questChore(fid)?.id ?? null,
    logs,
    requests,
    meal: meal && !meal.notified_at ? { startedAt: meal.started_at, deadline: meal.deadline_at } : null,
    ranking: ranking(fid),
    weekStart: weekStartIso(),
  };
}

module.exports = {
  KajiError, MEAL_MINUTES,
  memberByLine, memberByToken, members, chores, pageUrl, status, ranking,
  createFamily, joinFamily, rename,
  startMeal, finishMeal, logChore, checkOverdueMeals,
  createRequest, takeRequest, doneRequest, cancelRequest,
  toggleThanks, addChore, setLevel, setReward, state,
  levelOf, titleOf, weekStartIso, jstDay,
};
