const express = require('express');
const db = require('../db');

const router = express.Router();

const STATUS_LABEL = {
  plot: 'プロット',
  script: 'シナリオ',
  name: 'ネーム',
  final: '完成',
};

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nl2br(str) {
  return esc(str).replace(/\n/g, '<br>');
}

router.get('/projects/:projectId/export', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'not_found' });

  const characters = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY order_index ASC').all(project.id);
  const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(project.id);
  const frontmatterRows = db.prepare('SELECT * FROM frontmatter WHERE project_id = ?').all(project.id);
  const frontmatter = { foreword: '', afterword: '' };
  frontmatterRows.forEach((r) => { frontmatter[r.type] = r.content || ''; });

  const sceneStmt = db.prepare('SELECT * FROM scenes WHERE chapter_id = ? ORDER BY order_index ASC');
  const pageStmt = db.prepare('SELECT * FROM pages WHERE chapter_id = ? ORDER BY order_index ASC');
  const panelStmt = db.prepare('SELECT * FROM panels WHERE page_id = ? ORDER BY order_index ASC');
  const charById = new Map(characters.map((c) => [c.id, c]));

  const chapterData = chapters.map((ch) => ({
    chapter: ch,
    scenes: sceneStmt.all(ch.id),
    pages: pageStmt.all(ch.id).map((p) => ({ ...p, panels: panelStmt.all(p.id) })),
  }));

  const toc = [];
  if (frontmatter.foreword.trim()) toc.push({ label: 'はじめに', page: '' });
  chapters.filter((c) => c.show_in_toc).forEach((c) => toc.push({ label: c.title, page: c.page_label || '' }));
  if (frontmatter.afterword.trim()) toc.push({ label: 'おわりに', page: '' });

  const charName = (id) => {
    const c = charById.get(id);
    return c ? c.name : '(不明なキャラクター)';
  };

  const html = `
<section class="doc-cover">
  <h1>${esc(project.title)}</h1>
  ${project.subtitle ? `<p class="subtitle">${esc(project.subtitle)}</p>` : ''}
  ${project.series_title ? `<p class="series">${esc(project.series_title)}</p>` : ''}
  <p class="author">${esc(project.author || '')}</p>
</section>

<section class="doc-section">
  <h2>目次</h2>
  <ol class="toc-list">
    ${toc.map((t) => `<li><span>${esc(t.label)}</span>${t.page ? `<span class="toc-page">${esc(t.page)}</span>` : ''}</li>`).join('\n')}
  </ol>
</section>

${frontmatter.foreword.trim() ? `<section class="doc-section"><h2>はじめに</h2><div class="prose">${nl2br(frontmatter.foreword)}</div></section>` : ''}

<section class="doc-section">
  <h2>登場キャラクター</h2>
  <div class="char-grid">
    ${characters.map((c) => `
      <div class="char-card" style="border-color:${esc(c.color_tag || '#6c5ce7')}">
        ${c.image_data ? `<img src="${esc(c.image_data)}" alt="${esc(c.name)}">` : ''}
        <h3>${esc(c.name)}${c.aliases ? ` <span class="aliases">(${esc(c.aliases)})</span>` : ''}</h3>
        ${c.role ? `<p class="role">${esc(c.role)}</p>` : ''}
        ${c.appearance ? `<p><strong>外見:</strong> ${nl2br(c.appearance)}</p>` : ''}
        ${c.personality ? `<p><strong>性格:</strong> ${nl2br(c.personality)}</p>` : ''}
        ${c.speech_style ? `<p><strong>口調:</strong> ${nl2br(c.speech_style)}</p>` : ''}
        ${c.notes ? `<p><strong>メモ:</strong> ${nl2br(c.notes)}</p>` : ''}
      </div>`).join('\n')}
  </div>
</section>

${chapterData.map(({ chapter, scenes, pages }) => `
<section class="doc-section chapter-section">
  <h2>${esc(chapter.title)} <span class="status-badge">${esc(STATUS_LABEL[chapter.status] || chapter.status)}</span></h2>
  ${chapter.summary ? `<p class="chapter-summary">${nl2br(chapter.summary)}</p>` : ''}

  ${scenes.length ? `
  <h3>シナリオ</h3>
  ${scenes.map((s, i) => `
    <div class="scene-block">
      <h4>Scene ${i + 1}${s.heading ? `: ${esc(s.heading)}` : ''}</h4>
      ${s.character_ids ? (() => { try { const ids = JSON.parse(s.character_ids); return ids.length ? `<p class="scene-chars">登場: ${ids.map(charName).map(esc).join(' / ')}</p>` : ''; } catch (e) { return ''; } })() : ''}
      <div class="prose">${nl2br(s.script)}</div>
    </div>`).join('\n')}` : ''}

  ${pages.length ? `
  <h3>コマ割り(ネーム)</h3>
  <div class="page-grid">
    ${pages.map((p, i) => `
      <div class="storyboard-page">
        <div class="page-label">p.${i + 1}</div>
        <div class="page-canvas">
          ${p.panels.map((panel, pi) => `
            <div class="panel-box" style="left:${panel.x}%;top:${panel.y}%;width:${panel.w}%;height:${panel.h}%;">
              <div class="panel-num">${pi + 1}</div>
              ${panel.shot_type ? `<div class="panel-shot">${esc(panel.shot_type)}</div>` : ''}
              ${panel.description ? `<div class="panel-desc">${nl2br(panel.description)}</div>` : ''}
              ${panel.dialogue ? `<div class="panel-dialogue">${nl2br(panel.dialogue)}</div>` : ''}
            </div>`).join('\n')}
        </div>
        ${p.notes ? `<div class="page-notes">${nl2br(p.notes)}</div>` : ''}
      </div>`).join('\n')}
  </div>` : ''}
</section>`).join('\n')}

${frontmatter.afterword.trim() ? `<section class="doc-section"><h2>おわりに</h2><div class="prose">${nl2br(frontmatter.afterword)}</div></section>` : ''}

${(project.kdp_keywords || project.kdp_categories || project.description) ? `
<section class="doc-section">
  <h2>KDP出版メタ情報</h2>
  ${project.description ? `<p><strong>紹介文:</strong> ${nl2br(project.description)}</p>` : ''}
  ${project.kdp_categories ? `<p><strong>カテゴリ:</strong> ${esc(project.kdp_categories)}</p>` : ''}
  ${project.kdp_keywords ? `<p><strong>検索キーワード:</strong> ${esc(project.kdp_keywords)}</p>` : ''}
</section>` : ''}
`;

  res.json({ project, html });
});

module.exports = router;
