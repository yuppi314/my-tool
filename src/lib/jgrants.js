// 経済産業省が公開している補助金検索システム「jGrants」の公開APIを呼び出す。
// ネットワークやAPI側の都合でエラーになることもあるため、失敗しても
// アプリ本体(手続き支援・タスク管理)が止まらないよう、エラーはやさしい日本語のメッセージにして返す。

const BASE_URL = 'https://api.jgrants-portal.go.jp/exp/v1/public';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分間はおなじ検索結果を使い回す
const REQUEST_TIMEOUT_MS = 15 * 1000; // 15秒待っても返事がなければあきらめる

const cache = new Map();

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function friendlyErrorMessage(err) {
  return '補助金・助成金の情報を取得できませんでした。しばらく時間をおいてからもう一度お試しください。';
}

function normalizeItem(item) {
  return {
    id: item.id,
    title: item.title || item.name || '(名前不明の補助金)',
    catchCopy: item.subsidy_catch_copy || '',
    maxLimit: item.subsidy_max_limit ?? null,
    acceptanceStart: item.acceptance_start_datetime || null,
    acceptanceEnd: item.acceptance_end_datetime || null,
    targetArea: item.target_area_search || '',
    targetEmployees: item.target_number_of_employees || '',
    isAcceptanceOpen: item.acceptance ?? null,
  };
}

// keyword は必須(2文字以上)。空だと検索できないため呼び出し前に確認すること。
async function searchSubsidies({ keyword, prefecture, employeeCount, acceptingOnly }) {
  if (!keyword || keyword.trim().length < 2) {
    return { ok: false, message: '検索キーワードを2文字以上入力してください。' };
  }

  const params = new URLSearchParams();
  params.set('keyword', keyword.trim());
  params.set('sort', 'acceptance_end_datetime');
  params.set('order', 'ASC');
  if (acceptingOnly) params.set('acceptance', '1');
  if (prefecture) params.set('target_area_search', prefecture);
  if (employeeCount) params.set('target_number_of_employees', employeeCount);

  const cacheKey = `search:${params.toString()}`;
  const cached = getCache(cacheKey);
  if (cached) return { ok: true, results: cached, fromCache: true };

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/subsidies?${params.toString()}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, message: friendlyErrorMessage(), status: res.status };
    }
    const body = await res.json();
    const results = (body.result || []).map(normalizeItem);
    setCache(cacheKey, results);
    return { ok: true, results, fromCache: false };
  } catch (err) {
    return { ok: false, message: friendlyErrorMessage() };
  }
}

async function getSubsidyDetail(id) {
  if (!id) return { ok: false, message: '補助金のIDが指定されていません。' };

  const cacheKey = `detail:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return { ok: true, detail: cached, fromCache: true };

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/subsidies/id/${encodeURIComponent(id)}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, message: friendlyErrorMessage(), status: res.status };
    }
    const body = await res.json();
    const item = (body.result && body.result[0]) || null;
    if (!item) return { ok: false, message: '補助金の詳細が見つかりませんでした。' };
    const detail = { ...normalizeItem(item), raw: item };
    setCache(cacheKey, detail);
    return { ok: true, detail, fromCache: false };
  } catch (err) {
    return { ok: false, message: friendlyErrorMessage() };
  }
}

module.exports = { searchSubsidies, getSubsidyDetail };
