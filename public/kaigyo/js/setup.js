requireKaigyoLogin();
renderKaigyoNav('setup.html');

const els = {
  fullName: document.getElementById('fullName'),
  address: document.getElementById('address'),
  businessName: document.getElementById('businessName'),
  businessType: document.getElementById('businessType'),
  industryKeyword: document.getElementById('industryKeyword'),
  prefecture: document.getElementById('prefecture'),
  startDate: document.getElementById('startDate'),
  previousStatus: document.getElementById('previousStatus'),
  resignDate: document.getElementById('resignDate'),
  wantsBlueTaxReturn: document.getElementById('wantsBlueTaxReturn'),
  hasFamilyEmployee: document.getElementById('hasFamilyEmployee'),
  hasEmployee: document.getElementById('hasEmployee'),
};

function toggleResignDate() {
  document.getElementById('resign-date-wrap').style.display =
    els.previousStatus.value === 'company_employee' ? 'block' : 'none';
}
els.previousStatus.addEventListener('change', toggleResignDate);
toggleResignDate();

async function loadProfile() {
  const { ok, data } = await kaigyoFetch('/api/kaigyo/profile');
  if (!ok || !data.profile) return;
  const p = data.profile;
  els.fullName.value = p.fullName || '';
  els.address.value = p.address || '';
  els.businessName.value = p.businessName || '';
  els.businessType.value = p.businessType || '';
  els.industryKeyword.value = p.industryKeyword || '';
  els.prefecture.value = p.prefecture || '';
  els.startDate.value = p.startDate || '';
  els.previousStatus.value = p.previousStatus || 'other';
  els.resignDate.value = p.resignDate || '';
  els.wantsBlueTaxReturn.checked = !!p.wantsBlueTaxReturn;
  els.hasFamilyEmployee.checked = !!p.hasFamilyEmployee;
  els.hasEmployee.checked = !!p.hasEmployee;
  toggleResignDate();
}
loadProfile();

document.getElementById('setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('setup-error');
  const successEl = document.getElementById('setup-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  const body = {
    fullName: els.fullName.value,
    address: els.address.value,
    businessName: els.businessName.value,
    businessType: els.businessType.value,
    industryKeyword: els.industryKeyword.value,
    prefecture: els.prefecture.value,
    startDate: els.startDate.value,
    previousStatus: els.previousStatus.value,
    resignDate: els.resignDate.value || null,
    wantsBlueTaxReturn: els.wantsBlueTaxReturn.checked,
    hasFamilyEmployee: els.hasFamilyEmployee.checked,
    hasEmployee: els.hasEmployee.checked,
  };

  const { ok, data } = await kaigyoFetch('/api/kaigyo/profile', { method: 'POST', body });
  if (!ok) {
    errorEl.textContent = data.error || '保存できませんでした。';
    return;
  }
  successEl.textContent = '保存しました。やることリストを作りました。';
  setTimeout(() => {
    window.location.href = '/kaigyo/index.html';
  }, 800);
});
