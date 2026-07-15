requireKaigyoLogin();
renderKaigyoNav('documents.html');

const params = new URLSearchParams(window.location.search);
const docType = params.get('type');

let fieldDefs = [];

function inputHtml(field, value) {
  const v = value === undefined || value === null ? '' : value;
  const help = field.help ? `<span class="hint">${field.help}</span>` : '';
  const labelHtml = `<label>${field.label}${help}</label>`;

  if (field.type === 'textarea') {
    return `${labelHtml}<textarea name="${field.key}" placeholder="${field.placeholder || ''}">${v}</textarea>`;
  }
  if (field.type === 'select') {
    const options = field.options
      .map((o) => `<option value="${o.value}" ${o.value === v ? 'selected' : ''}>${o.label}</option>`)
      .join('');
    return `${labelHtml}<select name="${field.key}"><option value="">選んでください</option>${options}</select>`;
  }
  const type = field.type || 'text';
  return `${labelHtml}<input type="${type}" name="${field.key}" value="${v}" placeholder="${field.placeholder || ''}" />`;
}

async function load() {
  if (!docType) {
    document.getElementById('doc-error').textContent = '書類の種類が指定されていません。';
    return;
  }

  const { ok, data } = await kaigyoFetch(`/api/kaigyo/documents/${encodeURIComponent(docType)}`);
  if (!ok) {
    document.getElementById('doc-error').textContent = data.error || '読み込みに失敗しました。';
    return;
  }

  document.getElementById('doc-title').textContent = data.title;
  document.getElementById('doc-summary').textContent = data.summary;
  document.getElementById('doc-official-name').textContent = `正式名称: ${data.officialName}`;
  document.getElementById('doc-where').textContent = data.whereToSubmit;

  fieldDefs = data.fields;
  const form = document.getElementById('doc-form');
  form.innerHTML = fieldDefs.map((f) => inputHtml(f, data.formData[f.key])).join('');
}

function collectFormData() {
  const form = document.getElementById('doc-form');
  const result = {};
  fieldDefs.forEach((f) => {
    const el = form.elements[f.key];
    result[f.key] = el ? el.value : '';
  });
  return result;
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('doc-error');
  const successEl = document.getElementById('doc-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  const body = collectFormData();
  const { ok, data } = await kaigyoFetch(`/api/kaigyo/documents/${encodeURIComponent(docType)}`, {
    method: 'POST',
    body,
  });
  if (!ok) {
    errorEl.textContent = data.error || '保存できませんでした。';
    return;
  }
  successEl.textContent = '保存しました。';
  setTimeout(() => {
    successEl.textContent = '';
  }, 1500);
});

document.getElementById('print-btn').addEventListener('click', () => {
  const formData = collectFormData();
  const title = document.getElementById('doc-title').textContent;
  const official = document.getElementById('doc-official-name').textContent;

  const rows = fieldDefs
    .map((f) => {
      let displayValue = formData[f.key] || '';
      if (f.type === 'select') {
        const opt = f.options.find((o) => o.value === displayValue);
        displayValue = opt ? opt.label : displayValue;
      }
      return `<div class="field-row"><div class="field-label">${f.label}</div><div class="field-value">${displayValue}</div></div>`;
    })
    .join('');

  document.getElementById('print-view').innerHTML = `
    <h1>${title}</h1>
    <p>${official}</p>
    ${rows}
  `;
  window.print();
});

load();
