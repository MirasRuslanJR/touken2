// views/diagnostic.js — adaptive diagnostic: 10-12 questions, walking the graph
// down on failure, up on success, ending on the X-ray screen with the found root gap.
import { listSubjects, listNodes, listEdges, listTasks, saveDiagnostic, upsertMastery, getMastery } from '../db.js';
import { findRootGapPath } from '../graph.js';
import { updateMastery } from '../mastery.js';
import { store } from '../store.js';
import { titleFor } from '../i18n.js';
import { toast } from '../ui.js';

const MAX_QUESTIONS = 11;

export async function renderDiagnostic(root, { subject: slug }) {
  root.innerHTML = `<div class="quiz-wrap"><div class="skel" style="height:400px"></div></div>`;

  const subjects = await listSubjects();
  const subject = subjects.find(s => s.slug === slug) || subjects[0];
  const nodes = await listNodes(subject.id);
  const edges = await listEdges(subject.id);
  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const grade = store.get().user?.grade || 9;

  // seed pool of nodes that actually have tasks (queried lazily, cached here)
  const taskCache = new Map();
  async function tasksFor(nodeId) {
    if (!taskCache.has(nodeId)) taskCache.set(nodeId, await listTasks(nodeId));
    return taskCache.get(nodeId);
  }
  const withTasks = [];
  for (const n of nodes) { if ((await tasksFor(n.id)).length) withTasks.push(n); }
  if (!withTasks.length) { root.innerHTML = `<div class="empty"><h3>Заданий для диагностики пока нет</h3></div>`; return; }

  const depsOf = new Map(), prereqsOf = new Map();
  edges.forEach(e => {
    if (!depsOf.has(e.from)) depsOf.set(e.from, []);
    depsOf.get(e.from).push(e.to);
    if (!prereqsOf.has(e.to)) prereqsOf.set(e.to, []);
    prereqsOf.get(e.to).push(e.from);
  });

  let current = withTasks.find(n => n.grade === grade) || withTasks[Math.floor(withTasks.length / 2)];
  const visited = new Set();
  const path = []; // {nodeId, correct}

  function pickNeighbor(list, exclude) {
    const candidates = (list || []).map(id => nodesById.get(id)).filter(n => n && withTasks.includes(n) && !exclude.has(n.id));
    return candidates[0] || withTasks.find(n => !exclude.has(n.id));
  }

  async function step() {
    if (path.length >= MAX_QUESTIONS || !current) return finish();
    visited.add(current.id);
    const tasks = await tasksFor(current.id);
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    renderQuestion(current, task);
  }

  function renderQuestion(node, task) {
    const progress = Math.min(100, Math.round((path.length / MAX_QUESTIONS) * 100));
    root.innerHTML = `
      <div class="quiz-wrap">
        <div class="quiz-progress">
          <div class="progress" style="flex:1"><span style="width:${progress}%"></span></div>
          <span class="mono" style="font-size:13px;color:var(--ink-soft)">${path.length + 1}/${MAX_QUESTIONS}</span>
        </div>
        <div class="eyebrow">${titleFor(node)} · ${node.code}</div>
        <h2>${task.prompt}</h2>
        <div id="q-body"></div>
      </div>`;
    const body = root.querySelector('#q-body');
    if (task.type === 'choice' && task.options) {
      const opts = Array.isArray(task.options) ? task.options : JSON.parse(task.options);
      body.innerHTML = `<div class="option-list">${opts.map((o, i) => `<button class="option" data-v="${o}">${o}</button>`).join('')}</div>`;
      body.querySelectorAll('.option').forEach(b => b.addEventListener('click', () => answer(node, task, b.dataset.v)));
    } else {
      body.innerHTML = `
        <div class="field" style="margin-top:16px">
          <input class="input" id="ans" placeholder="Твой ответ" autofocus>
        </div>
        <button class="btn btn-primary" id="submit" style="margin-top:14px">Проверить</button>`;
      const input = body.querySelector('#ans');
      const submit = () => answer(node, task, input.value.trim());
      body.querySelector('#submit').addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }
  }

  function isCorrect(task, given) {
    return String(given).trim().toLowerCase() === String(task.answer).trim().toLowerCase();
  }

  let answering = false;
  async function answer(node, task, given) {
    // Two fast taps on two different options used to record two answers for one
    // question and skip a step of the walk.
    if (answering) return;
    answering = true;
    root.querySelectorAll('.option, #submit').forEach(el => { el.disabled = true; });

    const correct = isCorrect(task, given);
    path.push({ nodeId: node.id, correct, taskId: task.id });
    toast(correct ? 'Верно' : 'Неверно, идём глубже', correct ? 'root' : 'gap');

    if (correct) {
      current = pickNeighbor(depsOf.get(node.id), visited) || null;
    } else {
      current = pickNeighbor(prereqsOf.get(node.id), visited) || null;
    }
    setTimeout(() => { answering = false; step(); }, 350);
  }

  async function finish() {
    root.innerHTML = `<div class="quiz-wrap"><div class="empty"><div class="spinner"></div><h3 id="finish-status">Проверяем ответы…</h3><p>Ищем настоящую причину, а не последний неверный ответ.</p></div></div>`;
    const stages = ['Проверяем ответы…', 'Спускаемся по графу знаний…', 'Ищем корень, а не симптом…', 'Формулируем объяснение…'];
    let stageIdx = 0;
    const statusEl = document.getElementById('finish-status');
    const stageTimer = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      if (statusEl) statusEl.textContent = stages[stageIdx];
    }, 2600);

    const masteryMap = new Map();
    path.forEach(p => masteryMap.set(p.nodeId, { score: p.correct ? 85 : 20, status: p.correct ? 'mastered' : 'gap' }));
    const lastWrong = [...path].reverse().find(p => !p.correct) || path[path.length - 1];
    const rootSearch = lastWrong ? findRootGapPath(lastWrong.nodeId, edges, masteryMap) : null;
    const rootId = rootSearch ? rootSearch.root : path[0]?.nodeId;
    const rootPath = rootSearch ? rootSearch.path : (rootId ? [rootId] : []);
    const rootNode = nodesById.get(rootId);

    const user = store.get().user;
    const existingMastery = await getMastery(user.id);
    const existingByNode = new Map(existingMastery.map(m => [m.node_id, m]));
    for (const p of path) {
      const prevForNode = existingByNode.get(p.nodeId) || null;
      const patch = updateMastery(prevForNode, { isCorrect: p.correct, difficulty: 3 });
      await upsertMastery(user.id, p.nodeId, patch);
      existingByNode.set(p.nodeId, { user_id: user.id, node_id: p.nodeId, ...patch });
    }

    const { callGemini } = await import('../ai.js');
    const summary = await callGemini('xray_summary', {
      subject: subject.title_ru, root_title: titleFor(rootNode),
      path: path.map(p => ({ node: titleFor(nodesById.get(p.nodeId)), correct: p.correct })),
    });

    const diag = await saveDiagnostic({
      user_id: user.id, subject_id: subject.id,
      answers: path, root_node_id: rootId, summary: summary.explanation,
    });

    // __source is non-enumerable, so JSON.stringify would drop it — carry it
    // across explicitly or the X-ray screen can't say where its text came from.
    sessionStorage.setItem('tamyr_last_xray', JSON.stringify({ subjectId: subject.id, rootId, rootPath, summary, aiSource: summary.__source, path }));
    clearInterval(stageTimer);
    location.hash = `#/xray/${diag.id}`;
  }

  step();
}
