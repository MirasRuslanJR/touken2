// views/student.js — teacher's view of a single student: their graph and stats.
import { listNodes, listEdges, listSubjects, classRoster, getMastery, isDemo } from '../db.js';
import { renderGraph } from '../graph.js';

function seededHeat(studentId, nodeId) {
  let h = 0;
  const s = studentId + nodeId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h % 100;
}
function statusFor(v) { return v >= 70 ? 'mastered' : v >= 40 ? 'learning' : 'gap'; }

export async function renderStudent(root, { id }) {
  root.innerHTML = `<div class="skel" style="height:60vh"></div>`;
  const [subjects, roster] = await Promise.all([listSubjects(), classRoster('demo-class')]);
  const student = roster.find(r => r.profiles.id === id)?.profiles || { id, full_name: 'Ученик' };
  const math = subjects.find(s => s.slug === 'math') || subjects[0];
  const [nodes, edges] = await Promise.all([listNodes(math.id), listEdges(math.id)]);

  let masteryMap;
  if (isDemo()) {
    masteryMap = new Map(nodes.map(n => { const v = seededHeat(student.id, n.id); return [n.id, { score: v, status: statusFor(v) }]; }));
  } else {
    const rows = await getMastery(id);
    masteryMap = new Map(rows.map(m => [m.node_id, m]));
  }
  const gaps = [...masteryMap.entries()].filter(([, m]) => m.status === 'gap').length;

  root.innerHTML = `
    <div class="topbar">
      <div><div class="eyebrow">Ученик</div><h1>${student.full_name}</h1></div>
      <span class="pill ${gaps ? 'pill-gap' : 'pill-root'}">${gaps} ${gaps === 1 ? 'пробел' : 'пробелов'}</span>
    </div>
    <div class="graph-wrap" id="student-graph"></div>`;

  renderGraph(document.getElementById('student-graph'),
    { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap }, {});
}
