// LINE Messaging API の最小クライアント。
// LINE_CHANNEL_ACCESS_TOKEN が未設定のときは送信せずログに出す(ローカル開発用)。
const crypto = require('crypto');

const API_BASE = () => process.env.LINE_API_BASE || 'https://api.line.me';
const enabled = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

// 署名検証: x-line-signature は channel secret で raw body を HMAC-SHA256 した base64。
function verifySignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function call(method, path, body) {
  if (!enabled()) {
    console.log(`[kaji/line] (未送信) ${method} ${path}`, body ? JSON.stringify(body) : '');
    return null;
  }
  const res = await fetch(API_BASE() + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`[kaji/line] ${method} ${path} 失敗: ${res.status} ${await res.text()}`);
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// 返信は無料。友だちへの push は無料プランの月間通数にカウントされる。
const reply = (replyToken, messages) => call('POST', '/v2/bot/message/reply', { replyToken, messages: [].concat(messages) });
const push = (to, messages) => call('POST', '/v2/bot/message/push', { to, messages: [].concat(messages) });
const getProfile = userId => call('GET', `/v2/bot/profile/${encodeURIComponent(userId)}`);

const text = t => ({ type: 'text', text: t });

// ボタン付きメッセージ。actions は [{label, data}](postback)または [{label, uri}]。
function buttons(body, actions, altText = body) {
  return {
    type: 'template',
    altText: altText.slice(0, 400),
    template: {
      type: 'buttons',
      text: body.slice(0, 160),
      actions: actions.slice(0, 4).map(a =>
        a.uri
          ? { type: 'uri', label: a.label.slice(0, 20), uri: a.uri }
          : { type: 'postback', label: a.label.slice(0, 20), data: a.data, displayText: a.label }
      ),
    },
  };
}

module.exports = { verifySignature, reply, push, getProfile, text, buttons, enabled };
