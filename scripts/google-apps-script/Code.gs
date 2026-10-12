// 吉方位×マイル旅: メールリストの保管と「毎月の吉方位メール」の自動配信(Google Apps Script)
//
// 役割
//   1. doPost: 診断サイト(src/lib/leadSync.js)から届くメール登録をスプレッドシートに保存する
//   2. sendMonthlyMail: 節入り(吉方位の月の切り替わり)を過ぎたら、登録者に今月の吉方位をGmailで送る
//   3. doGet / unsubscribe: メール内のリンクから配信停止する
//
// 設定(プロジェクトの設定 → スクリプト プロパティ)
//   SECRET      : サイト側の LEADS_WEBHOOK_SECRET と同じ文字列(長いランダムな文字列)
//   SITE_URL    : 診断サイトのURL(例: https://kippou-mile-travel.onrender.com 末尾の / なし)
//   SENDER_NAME : メールの差出人名(屋号。例: かろやか研究所)
// 手順の詳細は同じフォルダの README.md を参照。

const SHEET_NAME = 'leads';
const HEADERS = ['登録日時', 'メールアドレス', 'お名前', '生年月日', '本命星', '出発地', '緯度', '経度', '診断ID', '状態', '最終配信月'];
const COL = { email: 2, status: 10, lastSent: 11 };
const ACTIVE = '配信中';
const STOPPED = '配信停止';

function props_() {
  return PropertiesService.getScriptProperties();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // すべて書式なしテキストにして、生年月日の自動変換や数式の実行を防ぐ
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).setNumberFormat('@');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 先頭が = + - @ の値は数式として解釈されないようにする
function cell_(v) {
  const s = v === undefined || v === null ? '' : String(v).slice(0, 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function findRow_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const emails = sheet.getRange(2, COL.email, last - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).toLowerCase() === email) return i + 2;
  }
  return 0;
}

function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
}

// 1. 診断サイトからのメール登録を受け取る
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  }
  const secret = props_().getProperty('SECRET');
  if (!secret || data.secret !== secret) return json_({ ok: false, error: 'unauthorized' });

  const email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json_({ ok: false, error: 'invalid email' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    const row = findRow_(sheet, email);
    const values = [now_(), email, cell_(data.name), cell_(data.birthdate), data.star, cell_(data.origin), data.lat, data.lon, cell_(data.diagnosisId), ACTIVE, cell_(data.month)];
    if (row) {
      // 同じ人の再診断: 最新の情報に更新し、本人がメールを入力し直したので配信も再開する
      values[0] = sheet.getRange(row, 1).getValue();
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function signature_(email) {
  const bytes = Utilities.computeHmacSha256Signature(email, props_().getProperty('SECRET'));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 24);
}

function unsubscribeUrl_(email) {
  return ScriptApp.getService().getUrl() + '?email=' + encodeURIComponent(email) + '&sig=' + signature_(email);
}

// 3. 配信停止ページ。メールのセキュリティ機能がリンクを自動で開いても停止しないよう、ボタンを押して確定する
function doGet(e) {
  const email = String((e.parameter && e.parameter.email) || '').toLowerCase();
  const sig = String((e.parameter && e.parameter.sig) || '');
  const t = HtmlService.createTemplate(
    '<div style="font-family:sans-serif;max-width:480px;margin:40px auto;line-height:1.8">' +
      '<? if (valid) { ?>' +
      '<p><?= email ?> への「毎月の吉方位メール」を停止しますか？</p>' +
      '<button id="b" onclick="this.disabled=true;google.script.run.withSuccessHandler(function(){document.getElementById(\'m\').textContent=\'配信を停止しました。ご利用ありがとうございました。\'}).unsubscribe(<?= JSON.stringify(email) ?>, <?= JSON.stringify(sig) ?>)">配信を停止する</button>' +
      '<p id="m"></p>' +
      '<? } else { ?><p>リンクが正しくありません。お手数ですが、メールのリンクをもう一度お試しください。</p><? } ?>' +
      '</div>'
  );
  t.email = email;
  t.sig = sig;
  t.valid = !!email && sig === signature_(email);
  return t.evaluate().setTitle('配信停止');
}

function unsubscribe(email, sig) {
  email = String(email).toLowerCase();
  if (sig !== signature_(email)) throw new Error('invalid link');
  const sheet = getSheet_();
  const row = findRow_(sheet, email);
  if (row) sheet.getRange(row, COL.status).setValue(STOPPED);
  return true;
}

// 診断サイトの無料結果APIから、その人の今月の吉方位を取得する(無料プランの休止明けに備えて1回だけ再試行)
function fetchResult_(siteUrl, row) {
  const q = '?s=' + encodeURIComponent(row[4]) + '&lat=' + encodeURIComponent(row[6]) + '&lon=' + encodeURIComponent(row[7]) + '&o=' + encodeURIComponent(row[5]);
  const url = siteUrl + '/api/diagnosis/' + encodeURIComponent(row[8] || 'mail') + q;
  for (let i = 0; i < 2; i++) {
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return { data: JSON.parse(res.getContentText()), resultUrl: siteUrl + '/result.html?id=' + encodeURIComponent(row[8] || 'mail') + '&' + q.slice(1) };
    } catch (err) {
      // 休止中のサーバーの起動待ちでタイムアウトすることがある
    }
    Utilities.sleep(5000);
  }
  return null;
}

function buildMail_(name, r, resultUrl, email, siteUrl, senderName) {
  const m = r.data.month;
  const domestic = m.destinations.filter(function (d) { return d.region === 'domestic'; }).slice(0, 3);
  const lines = [];
  lines.push((name ? name + ' さん' : 'こんにちは') + '、' + senderName + 'です。');
  lines.push('');
  lines.push(m.label + '(' + m.period + ')の吉方位が切り替わりました。');
  lines.push('本命星: ' + r.data.star.name + ' / 出発地: ' + r.data.origin);
  lines.push('');
  lines.push(m.message);
  if (domestic.length) {
    lines.push('');
    lines.push('▼ 今月のおすすめ旅先(' + r.data.origin + 'から)');
    domestic.forEach(function (d) {
      lines.push('・' + d.name + '(' + d.direction + '・約' + d.distanceKm + 'km / ' + d.miles + ')');
      lines.push('  ' + d.hint);
    });
  }
  if (r.data.nextBestMonth) {
    lines.push('');
    lines.push('次に最大吉方が巡るのは ' + r.data.nextBestMonth.label + '(' + r.data.nextBestMonth.bestDirections.join('・') + ')です。');
  }
  lines.push('');
  lines.push('▼ 方位盤とすべての旅先はこちら');
  lines.push(resultUrl);
  lines.push('');
  lines.push('12ヶ月先までの吉方位カレンダーを見ておくと、マイルの特典航空券を早めに押さえられます。');
  lines.push('');
  lines.push('※ 九星気学の一般的な考え方に基づく娯楽目的の情報です。');
  lines.push('――――――――――');
  lines.push('発行: ' + senderName);
  lines.push('事業者情報: ' + siteUrl + '/tokushoho.html');
  lines.push('配信停止: ' + unsubscribeUrl_(email));
  return {
    subject: '【' + m.label + '】' + r.data.star.name + 'のあなたの吉方位が切り替わりました',
    body: lines.join('\n'),
  };
}

// 2. 毎日1回トリガーで実行する。節入り後の最初の実行で、その月の分をまだ送っていない人に送る。
//    Gmailの1日の送信上限に達したら止め、残りは翌日の実行で続きから送る。
function sendMonthlyMail() {
  const p = props_();
  const siteUrl = String(p.getProperty('SITE_URL') || '').replace(/\/+$/, '');
  const senderName = p.getProperty('SENDER_NAME') || '吉方位×マイル旅';
  if (!siteUrl) throw new Error('スクリプト プロパティ SITE_URL を設定してください');

  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const started = Date.now();
  let sent = 0;
  let currentLabel = null; // 今の節月(例: 2026年10月)。最初に取得した結果から決まる

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[COL.status - 1] !== ACTIVE) continue;
    if (currentLabel && row[COL.lastSent - 1] === currentLabel) continue; // この節月は送信済み(サイトに問い合わせない)
    if (MailApp.getRemainingDailyQuota() < 1) break;
    if (Date.now() - started > 5 * 60 * 1000) break; // 実行時間の上限(6分)の手前で止め、翌日に続ける

    const r = fetchResult_(siteUrl, row);
    if (!r) continue;
    currentLabel = r.data.month.label;
    if (currentLabel === row[COL.lastSent - 1]) continue;

    const email = String(row[1]);
    const mail = buildMail_(row[2], r, r.resultUrl, email, siteUrl, senderName);
    MailApp.sendEmail({ to: email, subject: mail.subject, body: mail.body, name: senderName });
    sheet.getRange(i + 2, COL.lastSent).setValue(r.data.month.label);
    sent++;
  }
  console.log('sent ' + sent + ' mails');
}

// 初回だけ実行: 毎朝9時台に sendMonthlyMail を動かすトリガーを作る
function setup() {
  getSheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendMonthlyMail') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendMonthlyMail').timeBased().everyDays(1).atHour(9).inTimezone('Asia/Tokyo').create();
}
