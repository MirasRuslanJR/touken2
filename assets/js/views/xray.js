// views/xray.js — the "Рентген" screen: full subject graph, gaps lit red, an arrow
// pointing straight at the found root cause, and Gemini's human explanation.
import { getDiagnostic, listNodes, listEdges, getMastery, listSubjects } from '../db.js';
import { renderGraph } from '../graph.js';
import { titleFor, t } from '../i18n.js';
import { store } from '../store.js';
import { speak } from '../a11y.js';
import { icon, aiBadge } from '../ui.js';

export async function renderXray(root, { diagId }) {
  root.innerHTML = `<div class="skel" style="height:70vh"></div>`;
  // '#/xray/last' is the permanent entry point from the sidebar: there is no
  // diagnostic id to look up, so it replays the most recent result straight
  // from session storage. Looking up a literal 'last' row would just 404.
  const diag = (diagId && diagId !== 'last' ? await getDiagnostic(diagId).catch(() => null) : null)
    || JSON.parse(sessionStorage.getItem('tamyr_last_xray') || '{}');
  const cached = JSON.parse(sessionStorage.getItem('tamyr_last_xray') || '{}');
  const subjectId = diag.subject_id || cached.subjectId;
  const rootId = diag.root_node_id || cached.rootId;

  // Nothing to X-ray yet — the screen only means anything after a diagnostic,
  // so say that plainly instead of rendering an empty graph with no root.
  if (!subjectId || !rootId) {
    root.innerHTML = `
      <div class="topbar"><div><div class="eyebrow">${t('xray_title')}</div><h1>${t('xray_need_diag')}</h1></div></div>
      <div class="empty">
        <h3>${t('xray_need_diag_head')}</h3>
        <p>${t('xray_need_diag_sub')}</p>
        <a class="btn btn-primary" href="#/diagnostic/math" style="margin-top:14px;display:inline-flex">${t('dash_take_diagnostic')}</a>
      </div>`;
    return;
  }
  const rootPath = cached.rootId === rootId ? cached.rootPath : null;
  const summary = cached.summary || { headline: 'Корень найден', explanation: diag.summary || '' };

  const [nodes, edges, subjects] = await Promise.all([listNodes(subjectId), listEdges(subjectId), listSubjects()]);
  const user = store.get().user;
  const masteryRows = await getMastery(user.id);
  const masteryMap = new Map(masteryRows.map(m => [m.node_id, m]));
  const rootNode = nodes.find(n => n.id === rootId);
  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const subjectSlug = subjects.find(s => s.id === subjectId)?.slug || 'math';
  const chainLabel = rootPath && rootPath.length > 1
    ? rootPath.map(id => titleFor(nodesById.get(id))).filter(Boolean).join(' ← ')
    : '';

  root.innerHTML = `
    <div class="topbar">
      <div>
        <div class="eyebrow">${t('xray_title')}</div>
        <h1>${summary.headline || t('xray_root_found')}</h1>
      </div>
    </div>
    <div class="card card-pad" style="margin-bottom:20px;border-left:3px solid var(--gap)">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span class="pill pill-gap">${t('xray_root_node')} · ${rootNode ? titleFor(rootNode) : '—'}</span>
            ${aiBadge({ __source: cached.aiSource })}
          </div>
          <p style="font-size:var(--t-18);line-height:1.6">${summary.explanation || t('xray_found')}</p>
        </div>
        ${('speechSynthesis' in window) ? `<button class="btn btn-ghost btn-icon btn-sm" id="speak-explanation" aria-label="Прочитать вслух">${icon('volume')}</button>` : ''}
      </div>
      ${chainLabel ? `<p style="margin-top:10px;font-family:var(--f-mono);font-size:13px;color:var(--ink-soft)">${t('xray_chain')}: ${chainLabel}</p>` : ''}
    </div>
    <div class="graph-wrap" id="xray-graph"></div>
    <div style="display:flex;gap:12px;margin-top:20px">
      <a class="btn btn-primary" href="#/task/${rootId}">${t('xray_close_gap')}</a>
      <a class="btn btn-ghost" href="#/module/${subjectSlug}">${t('all_topics')}</a>
    </div>`;
  document.getElementById('speak-explanation')?.addEventListener('click', () => speak(summary.explanation || ''));

  const graphData = { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap };
  renderGraph(document.getElementById('xray-graph'), graphData, { highlightRoot: rootId, pathNodeIds: rootPath });
}
