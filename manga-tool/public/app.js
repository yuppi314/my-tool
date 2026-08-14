let currentScenarioId = null;
let currentScenario = null;

const $ = (sel) => document.querySelector(sel);

function showSection(id) {
  document.querySelector(id).classList.remove("hidden");
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `リクエストに失敗しました (${res.status})`);
  return json;
}

// ---------- Step 1: シナリオ生成 ----------

$("#btnGenerateScenario").addEventListener("click", async () => {
  const premise = $("#premise").value.trim();
  const numPages = $("#numPages").value;
  const artStyle = $("#artStyle").value.trim();
  const readingDirection = $("#readingDirection").value;
  if (!premise) {
    $("#scenarioStatus").textContent = "プロットを入力してください。";
    return;
  }

  const btn = $("#btnGenerateScenario");
  btn.disabled = true;
  $("#scenarioStatus").textContent = "生成中です…(数十秒かかることがあります)";

  try {
    const scenario = await api("/api/scenario/generate", {
      method: "POST",
      body: JSON.stringify({ premise, numPages, artStyle, readingDirection }),
    });
    currentScenarioId = scenario.id;
    currentScenario = scenario;
    $("#scenarioStatus").textContent = `「${scenario.title}」を生成しました。`;
    renderEditor(scenario);
    showSection("#step-edit");
    showSection("#step-images");
    showSection("#step-export");
    $("#btnDownloadPdf").href = `/api/manga/${currentScenarioId}/pdf`;
  } catch (err) {
    $("#scenarioStatus").textContent = `エラー: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Step 2: 編集 ----------

function renderEditor(scenario) {
  $("#editTitle").value = scenario.title;
  const container = $("#pagesEditor");
  container.innerHTML = "";

  scenario.pages.forEach((page, pageIdx) => {
    const pageEl = document.createElement("div");
    pageEl.className = "page-block";
    pageEl.dataset.pageIndex = pageIdx;

    const heading = document.createElement("h3");
    heading.textContent = `ページ ${page.page_number}`;
    pageEl.appendChild(heading);

    page.panels.forEach((panel, panelIdx) => {
      const panelEl = document.createElement("div");
      panelEl.className = "panel-block";
      panelEl.dataset.panelIndex = panelIdx;

      panelEl.innerHTML = `
        <label>コマ ${panel.panel_number} — 場面説明
          <textarea class="f-scene">${escapeHtml(panel.scene_description)}</textarea>
        </label>
        <label>登場キャラクター(カンマ区切り)
          <input class="f-characters" type="text" value="${escapeHtml((panel.characters_present || []).join(", "))}" />
        </label>
        <label>キャプション(状況説明・任意)
          <input class="f-caption" type="text" value="${escapeHtml(panel.caption || "")}" />
        </label>
        <label>効果音(任意)
          <input class="f-sfx" type="text" value="${escapeHtml(panel.sfx || "")}" />
        </label>
        <div class="f-dialogue"></div>
        <button type="button" class="btn-add-dialogue" style="font-size:12px;padding:6px 10px;">+ セリフを追加</button>
      `;

      const dialogueContainer = panelEl.querySelector(".f-dialogue");
      (panel.dialogue || []).forEach((d) => addDialogueRow(dialogueContainer, d.speaker, d.text));

      panelEl.querySelector(".btn-add-dialogue").addEventListener("click", () => {
        addDialogueRow(dialogueContainer, "", "");
      });

      pageEl.appendChild(panelEl);
    });

    container.appendChild(pageEl);
  });
}

function addDialogueRow(container, speaker, text) {
  const row = document.createElement("div");
  row.className = "dialogue-line";
  row.innerHTML = `
    <input class="d-speaker" type="text" placeholder="話者" value="${escapeHtml(speaker || "")}" style="max-width:100px;" />
    <input class="d-text" type="text" placeholder="セリフ" value="${escapeHtml(text || "")}" />
    <button type="button" class="d-remove" style="padding:4px 8px;">×</button>
  `;
  row.querySelector(".d-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectScenarioFromEditor() {
  const scenario = JSON.parse(JSON.stringify(currentScenario));
  scenario.title = $("#editTitle").value.trim();

  document.querySelectorAll("#pagesEditor .page-block").forEach((pageEl) => {
    const pageIdx = Number(pageEl.dataset.pageIndex);
    const page = scenario.pages[pageIdx];

    pageEl.querySelectorAll(".panel-block").forEach((panelEl) => {
      const panelIdx = Number(panelEl.dataset.panelIndex);
      const panel = page.panels[panelIdx];

      panel.scene_description = panelEl.querySelector(".f-scene").value;
      panel.characters_present = panelEl
        .querySelector(".f-characters")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      panel.caption = panelEl.querySelector(".f-caption").value || null;
      panel.sfx = panelEl.querySelector(".f-sfx").value || null;

      panel.dialogue = [];
      panelEl.querySelectorAll(".dialogue-line").forEach((row) => {
        const speaker = row.querySelector(".d-speaker").value.trim();
        const text = row.querySelector(".d-text").value.trim();
        if (speaker || text) panel.dialogue.push({ speaker, text });
      });
    });
  });

  return scenario;
}

$("#btnSaveScenario").addEventListener("click", async () => {
  if (!currentScenarioId) return;
  const scenario = collectScenarioFromEditor();
  $("#saveStatus").textContent = "保存中…";
  try {
    await api(`/api/scenario/${currentScenarioId}`, {
      method: "PUT",
      body: JSON.stringify(scenario),
    });
    currentScenario = scenario;
    $("#saveStatus").textContent = "保存しました。";
  } catch (err) {
    $("#saveStatus").textContent = `エラー: ${err.message}`;
  }
});

// ---------- Step 3: 画像生成 ----------

$("#btnGenerateImages").addEventListener("click", async () => {
  if (!currentScenarioId) return;
  const btn = $("#btnGenerateImages");
  btn.disabled = true;
  $("#imagesStatus").textContent = "生成中です…";

  try {
    const result = await api(`/api/manga/${currentScenarioId}/generate-images`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    $("#imagesStatus").textContent = `${result.generated}コマ分を生成しました。` +
      (result.errors.length ? ` (${result.errors.length}件エラー)` : "");
    renderPagePreviews();
  } catch (err) {
    $("#imagesStatus").textContent = `エラー: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

function renderPagePreviews() {
  const container = $("#pagesPreview");
  container.innerHTML = "";
  currentScenario.pages.forEach((page) => {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.src = `/api/manga/${currentScenarioId}/page/${page.page_number}.svg?t=${Date.now()}`;
    const caption = document.createElement("div");
    caption.className = "page-caption";
    caption.textContent = `ページ ${page.page_number}`;
    wrap.appendChild(img);
    wrap.appendChild(caption);
    container.appendChild(wrap);
  });
}
