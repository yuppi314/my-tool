// メール登録(リード)を外部のGoogleスプレッドシートにも送る。
// Renderの無料プランは再起動でSQLiteが消えるため、メールリストはこちらを正本にする。
// 受け口は scripts/google-apps-script/Code.gs(Google Apps Script のウェブアプリ)。
const houi = require('./houi');
const { todayInJst } = require('./content');

function leadSyncEnabled() {
  return !!process.env.LEADS_WEBHOOK_URL;
}

// 診断の応答を遅らせないよう、送信は待たずに失敗はログだけ残す
function syncLead({ diagnosisId, email, name, birthdate, star, origin }) {
  if (!leadSyncEnabled()) return Promise.resolve(false);
  const payload = {
    secret: process.env.LEADS_WEBHOOK_SECRET || '',
    diagnosisId,
    email,
    name: name || '',
    birthdate,
    star,
    origin: origin.name,
    lat: origin.lat,
    lon: origin.lon,
    // 登録した節月は結果ページで見ているので、毎月のメールは次の節月から送る
    month: houi.getMonthInfo(todayInJst()).label,
  };
  return fetch(process.env.LEADS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })
    .then(async (res) => {
      const body = await res.text();
      if (!res.ok || !/"ok"\s*:\s*true/.test(body)) throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
      return true;
    })
    .catch((err) => {
      console.error('lead sync error:', err.message);
      return false;
    });
}

module.exports = { syncLead, leadSyncEnabled };
