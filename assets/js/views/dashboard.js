// views/dashboard.js — student personal cabinet: progress, weak spots, streak,
// timeline to goal, mini graph, attempt history.
import { listSubjects, listNodes, listEdges, getMastery, listAttempts, getGoal } from '../db.js';
import { renderGraph } from '../graph.js';
import { rankWeakSpots, subjectMasteryScore } from '../mastery.js';
import { titleFor } from '../i18n.js';
import { store } from '../store.js';

function computeStreak(attempts) {
  const days = new Set(attempts.map(a => new Date(a.created_at).toDateString()));
  let streak = 0;
  const cur = new Date();
  while (days.has(cur.toDateString())) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

export async function renderDashboard(root) {
  root.innerHTML = `<div class="skel" style="height:60vh"></div>`;
  const user = store.get().user;
  const subjects = await listSubjects();
  const math = subjects.find(s => s.slug === 'math') || subjects[0];

  const [nodes, edges, masteryRows, attempts, goal] = await Promise.all([
    listNodes(math.id), listEdges(math.id), getMastery(user.id), listAttempts(user.id, 30), getGoal(user.id),
  ]);
  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const masteryMap = new Map(masteryRows.map(m => [m.node_id, m]));
  const streak = computeStreak(attempts);
  const overall = subjectMasteryScore(masteryRows.filter(m => nodesById.has(m.node_id)));
  const weak = rankWeakSpots(masteryRows.filter(m => nodesById.has(m.node_id)), nodesById).slice(0, 5);

  const daysLeft = goal?.target_date ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)) : null;

  root.innerHTML = `
    <div class="topbar">
      <div><div class="eyebrow">С возвращением</div><h1>${user.full_name || 'Ученик'}</h1></div>
      <a class="btn btn-primary" href="#/diagnostic/${math.slug}">Пройти диагностику</a>
    </div>
    <div class="stat-row" style="margin-bottom:24px">
      <div class="card stat"><div class="num mono">${overall}%</div><div class="lbl">общее освоение</div></div>
      <div class="card stat"><div class="num mono">${streak}</div><div class="lbl">дней подряд</div></div>
      <div class="card stat"><div class="num mono">${daysLeft ?? '—'}</div><div class="lbl">${daysLeft != null ? 'дней · ' : ''}${goal?.title || 'до цели'}</div></div>
      <div class="card stat"><div class="num mono">${attempts.length}</div><div class="lbl">попыток за месяц</div></div>
    </div>
    <div class="grid-2" style="align-items:start">
      <div>
        <h3 style="margin-bottom:12px">Слабые места по приоритету</h3>
        <div class="card">
          ${weak.length ? weak.map(w => `
            <a href="#/task/${w.node_id}" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--hairline);text-decoration:none;color:var(--ink)">
              <span class="mastery-dot ${w.status}"></span>
              <span style="flex:1">${titleFor(w.node)}</span>
              <span class="mono" style="color:var(--ink-soft);font-size:13px">${w.score}%</span>
            </a>`).join('') : `<div class="empty"><h3>Пробелов не найдено</h3><p>Похоже, всё закрыто — пройди диагностику ещё раз, чтобы проверить.</p></div>`}
        </div>
        <h3 style="margin:24px 0 12px">История попыток</h3>
        <div class="card">
          ${attempts.slice(0, 8).map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--hairline)">
              <span class="mastery-dot ${a.is_correct ? 'mastered' : 'gap'}"></span>
              <span style="flex:1;color:var(--ink-soft);font-size:13px">${titleFor(nodesById.get(a.node_id)) || a.node_id}</span>
              <span class="mono" style="font-size:12px;color:var(--ink-soft)">${new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
            </div>`).join('') || `<div class="empty"><h3>Пока пусто</h3></div>`}
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:12px">Твой граф</h3>
        <div class="graph-wrap compact" id="mini-graph"></div>
      </div>
    </div>`;

  renderGraph(document.getElementById('mini-graph'),
    { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap },
    { onNodeClick: (id) => { location.hash = `#/task/${id}`; }, width: 700, height: 480 });
}
