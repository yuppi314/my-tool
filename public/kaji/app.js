// 家事の引き継ぎ表(Webページ)。LINE で配った本人専用リンク ?t=トークン で API を呼ぶ。
const TOKEN = new URLSearchParams(location.search).get('t');
const LEVELS = ['', 'いっしょに', '見守り', 'ひとりで', '担当'];
let S = null;
const open = new Set();
const checks = {};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function ago(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}時間前` : `${Math.floor(h / 24)}日前`;
}
const nameOf = id => (id === S.me.id ? '自分' : S.members.find(m => m.id === id)?.name || '家族');

async function api(path, body) {
  const res = await fetch(`/api/kaji/${path}${body ? '' : `?t=${encodeURIComponent(TOKEN)}`}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, t: TOKEN }) }
    : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '通信できませんでした。電波を確認して、もう一度お試しください。');
  return data;
}

let toastT;
function toast(html) {
  const t = $('toast');
  t.innerHTML = html;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 3500);
}
function xpToast(r) {
  if (!r) return;
  const bonus = r.bonus?.length ? `(${r.bonus.map(b => (b === 'quest' ? 'クエスト' : 'スピード')).join('・')}ボーナス)` : '';
  toast(r.levelUp ? `レベルアップ! <em>Lv${r.levelUp.level} ${esc(r.levelUp.title)}</em>` : `<em>+${r.xp} XP</em>${bonus}`);
}

// 書き込み系はすべてここを通す。成功すると最新の state が返ってくる。
async function act(path, body, after) {
  try {
    const data = await api(path, body);
    S = data.state;
    render();
    after?.(data);
  } catch (err) {
    toast(esc(err.message));
  }
}

function renderPlayer() {
  const me = S.me;
  $('pLv').innerHTML = `<small>Lv</small>${me.level}`;
  $('pTitle').textContent = me.title;
  $('pStreak').textContent = me.streak ? `${me.streak}日連続` : '';
  $('pBar').style.width = `${((me.xp - me.curAt) / (me.nextAt - me.curAt)) * 100}%`;
  $('pSub').textContent = `${me.name}(${me.role === 'parent' ? '親' : '子ども'}) ・ ${me.xp} XP ・ 次のレベルまで ${me.nextAt - me.xp} XP`;
}

function renderRequests() {
  $('reqQuick').innerHTML = S.chores.map(c => `<button class="chipq" type="button" data-title="${esc(c.title)}">${esc(c.title)}</button>`).join('');
  $('reqs').innerHTML = S.requests.length ? S.requests.map(r => {
    let meta, btn = '';
    if (r.status === 'open') {
      meta = `${esc(nameOf(r.by_member))}から ・ ${ago(r.at)}`;
      btn = r.by_member === S.me.id
        ? `<button class="small" data-act="cancel">取り消す</button>`
        : `<button class="primary small" data-act="take">引き受けた</button>`;
    } else if (r.status === 'accepted') {
      meta = `${esc(nameOf(r.taken_by))}が引き受け中 ・ ${esc(nameOf(r.by_member))}から`;
      if (r.taken_by === S.me.id) btn = `<button class="primary small" data-act="done">できた! +${r.xp} XP</button>`;
    } else {
      meta = `${esc(nameOf(r.taken_by))}がやった ・ ${ago(r.done_at)} ・ +${r.xp} XP`;
    }
    return `<li class="${r.status}" data-req="${r.id}"><div class="body"><span class="rt">${esc(r.text)}</span><span class="rm">${meta}</span></div>${btn}</li>`;
  }).join('') : `<li class="done" style="opacity:1"><div class="body"><span class="rm">今日のおねがいはありません。</span></div></li>`;
}

function renderQuest() {
  const q = S.chores.find(c => c.id === S.quest);
  $('quest').innerHTML = q
    ? `<b>今日のクエスト:${esc(q.title)}</b><p class="tip">今日やると経験値2倍(${q.xp * 2} XP)。</p>`
    : `<b>今日のクエスト</b><p class="tip">家事を登録すると、毎日1つ選ばれます。</p>`;
}

function renderTimer() {
  const left = S.meal ? new Date(S.meal.deadline) - Date.now() : 0;
  const live = left > 0;
  $('timer').classList.toggle('live', live);
  $('mealCount').textContent = live ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : '';
  $('mealBtn').textContent = live ? '計測中' : 'ごちそうさま';
  $('mealBtn').disabled = live;
}

function renderChores() {
  const ws = new Date(S.weekStart);
  $('list').innerHTML = S.chores.map(c => {
    const logs = S.logs.filter(l => l.chore_id === c.id);
    const last = logs[0];
    const week = logs.filter(l => new Date(l.at) >= ws).length;
    const stale = !last || Date.now() - new Date(last.at) > 3 * 864e5;
    const isOpen = open.has(c.id);
    const ck = checks[c.id] || [];
    const allDone = c.steps.every((_, i) => ck[i]);
    const isQuest = c.id === S.quest;
    return `<article class="chore${stale ? ' stale' : ''}" data-id="${c.id}">
      <div class="top"><h3>${esc(c.title)}</h3><span class="xp${isQuest ? ' quest' : ''}">${isQuest ? 'クエスト ' : ''}+${c.xp * (isQuest ? 2 : 1)} XP</span></div>
      <div class="meta">${last ? `最後:<strong>${ago(last.at)}</strong>(${esc(nameOf(last.member_id))})` : 'まだ記録なし'} ・ 今週 <strong>${week}</strong> 回
        ・ <span class="pips" title="引き継ぎの段階">${[1, 2, 3, 4].map(n => `<i class="${n <= c.level ? 'on' : ''}"></i>`).join('')} ${LEVELS[c.level]}</span></div>
      ${isOpen ? `
        <ul class="steps">${c.steps.map((s, i) => `<li><label><input type="checkbox" data-step="${i}" ${ck[i] ? 'checked' : ''}><span>${esc(s)}</span></label></li>`).join('')}</ul>
        ${c.tip ? `<p class="tip">コツ:${esc(c.tip)}</p>` : ''}
        <div class="row">
          <button class="primary" data-act="log" ${allDone ? '' : 'disabled'}>${allDone ? 'やった!記録する' : '全部チェックで記録'}</button>
          <button data-act="close">閉じる</button>
          <span class="spacer"></span>
          <button class="small" data-act="down" ${c.level <= 1 ? 'disabled' : ''} aria-label="段階を下げる">段階 −</button>
          <button class="small" data-act="up" ${c.level >= 4 ? 'disabled' : ''} aria-label="段階を上げる">段階 +</button>
        </div>`
      : `<div class="row"><button class="primary" data-act="open">チェックリストを開く</button></div>`}
    </article>`;
  }).join('');
}

function renderRank() {
  const top = Math.max(1, ...S.ranking.map(r => r.xp));
  $('rank').innerHTML = S.ranking.map((r, i) => `<li class="${r.id === S.me.id ? 'me' : ''}">
    <span class="pos">${i + 1}</span>
    <div><b>${esc(r.id === S.me.id ? '自分' : r.name)}</b><div class="bar"><i style="width:${(r.xp / top) * 100}%"></i></div></div>
    <span class="num">${r.xp} XP</span></li>`).join('');
  const rw = S.family.reward;
  const mine = S.ranking.find(r => r.id === S.me.id)?.xp || 0;
  $('rewardGoal').textContent = rw ? `週 ${rw.xp} XP で「${rw.text}」` : 'まだ決まっていません';
  $('rewardProg').textContent = !rw ? '週に何XPためたら何がもらえるか、家族で決めましょう。'
    : mine >= rw.xp ? '今週は達成!ごほうびを受け取れます。' : `自分は今週 ${mine} XP。あと ${rw.xp - mine} XP。`;
}

function renderFeed() {
  const title = id => S.chores.find(c => c.id === id)?.title || '家事';
  const items = S.logs.slice(0, 15);
  $('feed').innerHTML = items.length ? items.map(l => {
    const bonus = l.bonus.length ? ` ×${2 ** l.bonus.length}` : '';
    const canThank = l.member_id !== S.me.id;
    return `<li data-log="${l.id}"><span><b>${esc(nameOf(l.member_id))}</b> が ${esc(title(l.chore_id))} <span class="num">+${l.xp}XP${bonus}</span><span class="when">${ago(l.at)}</span></span>
      ${canThank ? `<button class="small thanks${l.thanked ? ' on' : ''}" data-act="thanks">ありがとう${l.thanks ? ' ' + l.thanks : ''}</button>`
        : l.thanks ? `<span class="tip">ありがとう ${l.thanks}</span>` : ''}</li>`;
  }).join('') : `<li><span class="tip">やった記録がここに並びます。</span></li>`;
}

function render() {
  $('status').hidden = true;
  $('player').hidden = false;
  $('main').hidden = false;
  const parent = S.me.role === 'parent';
  $('addBox').hidden = !parent;
  $('rewardForm').hidden = !parent;
  $('famCode').textContent = S.family.code;
  $('famList').textContent = `メンバー:${S.members.map(m => `${m.name}(${m.role === 'parent' ? '親' : '子ども'})`).join('、')}`;
  renderPlayer();
  renderRequests();
  renderQuest();
  renderTimer();
  renderChores();
  renderRank();
  renderFeed();
}

$('list').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const id = Number(b.closest('.chore').dataset.id);
  const c = S.chores.find(x => x.id === id);
  switch (b.dataset.act) {
    case 'open': open.add(id); checks[id] = []; return render();
    case 'close': open.delete(id); return render();
    case 'log': b.disabled = true; return act('logs', { choreId: id }, d => { open.delete(id); render(); xpToast(d.result); });
    case 'up': case 'down':
      return act(`chores/${id}/level`, { level: c.level + (b.dataset.act === 'up' ? 1 : -1) });
  }
});
$('list').addEventListener('change', e => {
  const box = e.target.closest('input[data-step]');
  if (!box) return;
  const id = Number(box.closest('.chore').dataset.id);
  (checks[id] ||= [])[Number(box.dataset.step)] = box.checked;
  render();
});
$('feed').addEventListener('click', e => {
  const b = e.target.closest("button[data-act='thanks']");
  if (b) act(`logs/${b.closest('li').dataset.log}/thanks`, {});
});
$('reqQuick').addEventListener('click', e => {
  const b = e.target.closest('button[data-title]');
  if (!b) return;
  $('reqText').value = `今日の${b.dataset.title}をお願い`;
  $('reqText').focus();
});
$('reqForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('reqText').value.trim();
  if (text) act('requests', { text }, () => { $('reqText').value = ''; toast('おねがいを送りました'); });
});
$('reqs').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  b.disabled = true;
  const id = b.closest('li').dataset.req;
  act(`requests/${id}/${b.dataset.act}`, {}, d => xpToast(d.result));
});
$('mealBtn').addEventListener('click', () => act('meal', {}, () => toast('30分以内に片付けると<em>経験値2倍</em>')));
$('rewardForm').addEventListener('submit', e => {
  e.preventDefault();
  act('reward', { text: $('rewardText').value, xp: $('rewardXp').value }, () => e.target.reset());
});
$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  act('chores', { title: $('addTitle').value, steps: $('addSteps').value, xp: $('addXp').value }, () => {
    e.target.reset();
    $('addBox').open = false;
    toast('家事を追加しました');
  });
});

async function load() {
  try {
    S = await api('state');
    render();
  } catch (err) {
    $('status').textContent = err.message;
  }
}

setInterval(() => { if (S?.meal) renderTimer(); }, 1000);
// 家族の記録を拾うため、表示中は1分ごとに読み直す。
setInterval(() => { if (S && document.visibilityState === 'visible' && !open.size) load(); }, 60000);
document.addEventListener('visibilitychange', () => { if (S && document.visibilityState === 'visible' && !open.size) load(); });

if (!TOKEN) $('status').textContent = 'LINE で「ページ」と送ると、自分専用のリンクが届きます。そのリンクから開いてください。';
else load();
