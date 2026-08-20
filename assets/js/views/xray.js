// views/xray.js — the "Рентген" screen: full subject graph, gaps lit red, an arrow
// pointing straight at the found root cause, and Gemini's human explanation.
import { getDiagnostic, listNodes, listEdges, getMastery, listSubjects } from '../db.js';
import { renderGraph } from '../graph.js';
import { titleFor } from '../i18n.js';
import { store } from '../store.js';

export async function renderXray(root, { diagId }) {
  root.innerHTML = `<div class="skel" style="height:70vh"></div>`;
  const diag = await getDiagnostic(diagId) || JSON.parse(sessionStorage.getItem('tamyr_last_xray') || '{}');
  const cached = JSON.parse(sessionStorage.getItem('tamyr_last_xray') || '{}');
  const subjectId = diag.subject_id || cached.subjectId;
  const rootId = diag.root_node_id || cached.rootId;
  const summary = cached.summary || { headline: 'Корень найден', explanation: diag.summary || '' };

  const [nodes, edges, subjects] = await Promise.all([listNodes(subjectId), listEdges(subjectId), listSubjects()]);
  const user = store.get().user;
  const masteryRows = await getMastery(user.id);
  const masteryMap = new Map(masteryRows.map(m => [m.node_id, m]));
  const rootNode = nodes.find(n => n.id === rootId);
  const subjectSlug = subjects.find(s => s.id === subjectId)?.slug || 'math';

  root.innerHTML = `
    <div class="topbar">
      <div>
        <div class="eyebrow">Рентген</div>
        <h1>${summary.headline || 'Корень найден'}</h1>
      </div>
    </div>
    <div class="card card-pad" style="margin-bottom:20px;border-left:3px solid var(--gap)">
      <div class="pill pill-gap" style="margin-bottom:10px">Корневой узел · ${rootNode ? titleFor(rootNode) : '—'}</div>
      <p style="font-size:var(--t-18);line-height:1.6">${summary.explanation || 'Нашли, где всё сломалось.'}</p>
    </div>
    <div class="graph-wrap" id="xray-graph"></div>
    <div style="display:flex;gap:12px;margin-top:20px">
      <a class="btn btn-primary" href="#/task/${rootId}">Закрыть пробел</a>
      <a class="btn btn-ghost" href="#/module/${subjectSlug}">Все темы</a>
    </div>`;

  const graphData = { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap };
  renderGraph(document.getElementById('xray-graph'), graphData, { highlightRoot: rootId });
}
