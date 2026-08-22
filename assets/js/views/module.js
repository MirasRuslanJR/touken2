// views/module.js — subject browser: full interactive graph + topic list.
import { listSubjects, listNodes, listEdges, getMastery } from '../db.js';
import { renderGraph } from '../graph.js';
import { titleFor, t } from '../i18n.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

export async function renderModule(root, { slug }, query) {
  root.innerHTML = `<div class="skel" style="height:60vh"></div>`;
  const subjects = await listSubjects();
  const subject = subjects.find(s => s.slug === slug) || subjects[0];
  const [nodes, edges] = await Promise.all([listNodes(subject.id), listEdges(subject.id)]);
  const user = store.get().user;
  const masteryRows = await getMastery(user.id);
  const masteryMap = new Map(masteryRows.map(m => [m.node_id, m]));

  const byGrade = new Map();
  nodes.forEach(n => { if (!byGrade.has(n.grade)) byGrade.set(n.grade, []); byGrade.get(n.grade).push(n); });

  root.innerHTML = `
    <div class="topbar">
      <div>
        <div class="eyebrow">${t('nav_modules')}</div>
        <h1>${titleFor(subject)}</h1>
      </div>
      <div style="display:flex;gap:8px">
        ${subjects.map(s => `<a class="btn ${s.id === subject.id ? 'btn-primary' : 'btn-ghost'} btn-sm" href="#/module/${s.slug}">${titleFor(s)}</a>`).join('')}
      </div>
    </div>
    <div class="graph-wrap" id="mod-graph" style="margin-bottom:28px"></div>
    <div id="topic-groups"></div>
    <div style="margin-top:24px">
      <a class="btn btn-primary" href="#/diagnostic/${subject.slug}">${t('mod_retake')}</a>
    </div>`;

  const graphData = { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap };
  const closedId = new URLSearchParams(query || '').get('closed');
  const controller = renderGraph(document.getElementById('mod-graph'), graphData, {
    onNodeClick: (id) => { location.hash = `#/task/${id}`; },
  });
  if (closedId) {
    setTimeout(() => { controller.lightWaveUp(closedId); toast('Пробел закрыт — смотри, как знание идёт вверх по графу', 'root'); }, 500);
  }

  const groups = document.getElementById('topic-groups');
  groups.innerHTML = [...byGrade.entries()].sort((a, b) => a[0] - b[0]).map(([grade, list]) => `
    <div style="margin-bottom:20px">
      <div class="eyebrow">${grade} ${t('grade')}</div>
      <div class="grid-3">
        ${list.map(n => {
          const m = masteryMap.get(n.id);
          const status = m?.status || 'unknown';
          return `
          <a href="#/task/${n.id}" class="card card-pad" style="text-decoration:none;display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="mono" style="font-size:12px;color:var(--ink-soft)">${n.code}</span>
              <span class="mastery-dot ${status}"></span>
            </div>
            <strong style="color:var(--ink)">${titleFor(n)}</strong>
            <span style="font-size:13px;color:var(--ink-soft)">${m ? `${m.score}% ${t('mod_mastered')}` : t('mod_not_started')}</span>
          </a>`;
        }).join('')}
      </div>
    </div>`).join('');
}
