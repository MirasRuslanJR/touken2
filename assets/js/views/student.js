// views/student.js — teacher's view of a single student: their graph and stats.
import { listNodes, listEdges, listSubjects, getProfile, getMastery, isDemo } from '../db.js';
import { renderGraph } from '../graph.js';
import { t } from '../i18n.js';

/** Same avalanche mix as the class heatmap — see the note in views/class.js. */
function seededHeat(studentId, nodeId) {
  let h = 2166136261 >>> 0;
  const s = studentId + '|' + nodeId;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
  return ((h ^= h >>> 16) >>> 0) % 100;
}
function statusFor(v) { return v >= 70 ? 'mastered' : v >= 40 ? 'learning' : 'gap'; }

/** 1 пробел / 2 пробела / 5 пробелов — Kazakh and English collapse to one form. */
function pluralGaps(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t('gaps_one');
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('gaps_few');
  return t('gaps_many');
}

export async function renderStudent(root, { id }) {
  root.innerHTML = `<div class="skel" style="height:60vh"></div>`;
  // Look the student up by id directly. This used to read the roster of a
  // hard-coded 'demo-class', which is not a UUID — against a real database that
  // threw before the screen could render at all.
  const [subjects, profile] = await Promise.all([listSubjects(), getProfile(id).catch(() => null)]);
  const student = profile || { id, full_name: t('student_fallback') };
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
      <div><div class="eyebrow">${t('t_student')}</div><h1>${student.full_name}</h1></div>
      <span class="pill ${gaps ? 'pill-gap' : 'pill-root'}">${gaps} ${pluralGaps(gaps)}</span>
    </div>
    <div class="graph-wrap" id="student-graph"></div>`;

  renderGraph(document.getElementById('student-graph'),
    { nodes, edges: edges.map(e => ({ from: e.prerequisite_node_id || e.from, to: e.dependent_node_id || e.to })), mastery: masteryMap }, {});
}
