// views/task.js — single task screen: adaptive difficulty, instant feedback,
// the "understood or guessed" comprehension check, and a "didn't get it" simpler explain.
import { getNode, listTasks, recordAttempt, upsertMastery, getMastery, listSubjects } from '../db.js';
import { queueAttempt } from '../offline.js';
import { updateMastery, nextDifficulty, resolveComprehensionCheck } from '../mastery.js';
import { titleFor, t } from '../i18n.js';
import { store } from '../store.js';
import { toast, icon } from '../ui.js';
import { speak } from '../a11y.js';

function sessionKey(nodeId) { return `tamyr_diff_${nodeId}`; }

export async function renderTask(root, { nodeId }) {
  root.innerHTML = `<div class="skel" style="height:50vh"></div>`;
  const [node, tasks] = await Promise.all([getNode(nodeId), listTasks(nodeId)]);
  if (!node || !tasks.length) {
    root.innerHTML = `<div class="empty"><h3>Заданий здесь пока нет</h3><p>Загляни в другую тему графа — она точно наполнена.</p><a class="btn btn-primary" href="#/module/math" style="margin-top:12px;display:inline-flex">Все темы</a></div>`;
    return;
  }

  const recent = JSON.parse(sessionStorage.getItem(sessionKey(nodeId) + '_hist') || '[]');
  let difficulty = Number(sessionStorage.getItem(sessionKey(nodeId))) || 3;
  difficulty = nextDifficulty(difficulty, recent);

  function pickTask() {
    const pool = tasks.filter(t => t.difficulty === difficulty);
    const list = pool.length ? pool : tasks;
    return list[Math.floor(Math.random() * list.length)];
  }

  let task = pickTask();
  let startedAt = Date.now();
  let hintsUsed = 0;

  function draw() {
    startedAt = Date.now();
    root.innerHTML = `
      <div class="task-card">
        <div class="task-meta">
          <span class="pill">${node.code}</span>
          <span class="pill">${t('task_level')} ${task.difficulty}/5</span>
        </div>
        <div class="eyebrow" style="margin-top:14px">${titleFor(node)}</div>
        <div style="display:flex;align-items:flex-start;gap:8px">
          <p class="task-prompt" style="flex:1">${task.prompt}</p>
          ${('speechSynthesis' in window) ? `<button class="btn btn-ghost btn-icon btn-sm" id="speak-prompt" aria-label="Прочитать вслух" style="margin-top:16px;flex-shrink:0">${icon('volume')}</button>` : ''}
        </div>
        <div id="task-body"></div>
        <div id="feedback-slot"></div>
        <div class="task-actions">
          <a class="btn btn-ghost btn-sm" href="#/tutor/${nodeId}">${icon('tutor')}${t('task_ask_socrates')}</a>
          <a class="btn btn-ghost btn-sm" href="#/feynman/${nodeId}">${icon('mic')}${t('task_explain_own')}</a>
        </div>
      </div>`;
    document.getElementById('speak-prompt')?.addEventListener('click', () => speak(task.prompt));
    const body = root.querySelector('#task-body');
    const options = task.options ? (Array.isArray(task.options) ? task.options : JSON.parse(task.options)) : null;
    if (task.type === 'choice' && options) {
      body.innerHTML = `<div class="option-list">${options.map(o => `<button class="option" data-v="${o}">${o}</button>`).join('')}</div>`;
      body.querySelectorAll('.option').forEach(b => b.addEventListener('click', () => {
        body.querySelectorAll('.option').forEach(x => {
          if (x.dataset.v === task.answer) x.classList.add('correct');
          else if (x === b) x.classList.add('wrong');
        });
        submit(b.dataset.v);
      }));
    } else {
      body.innerHTML = `
        <div class="field" style="margin-top:16px"><input class="input" id="ans" placeholder="Твой ответ" autofocus></div>
        <button class="btn btn-primary" id="submit" style="margin-top:14px">${icon('check')}Проверить</button>`;
      const input = body.querySelector('#ans');
      const go = () => submit(input.value.trim());
      body.querySelector('#submit').addEventListener('click', go);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
  }

  async function submit(given) {
    const correct = String(given).trim().toLowerCase() === String(task.answer).trim().toLowerCase();
    const timeSpent = Date.now() - startedAt;
    const user = store.get().user;

    recent.push(correct);
    sessionStorage.setItem(sessionKey(nodeId) + '_hist', JSON.stringify(recent.slice(-6)));
    sessionStorage.setItem(sessionKey(nodeId), String(nextDifficulty(difficulty, recent)));

    const attemptRow = { user_id: user.id, task_id: task.id, node_id: nodeId, is_correct: correct, answer_given: String(given), time_spent_ms: timeSpent, hints_used: hintsUsed };
    if (navigator.onLine) { try { await recordAttempt(attemptRow); } catch { await queueAttempt(attemptRow); toast('Нет связи — сохранили ответ локально', ''); } }
    else { await queueAttempt(attemptRow); toast('Офлайн: ответ сохранён, отправим при связи', ''); }

    const slot = root.querySelector('#feedback-slot');
    if (!correct) {
      const mastery = await getMastery(user.id);
      const prev = mastery.find(m => m.node_id === nodeId);
      const patch = updateMastery(prev, { isCorrect: false, difficulty: task.difficulty });
      await upsertMastery(user.id, nodeId, patch);
      slot.innerHTML = `
        <div class="feedback-panel wrong">
          <strong>Не в этот раз</strong>
          <p style="margin-top:8px">${task.solution}</p>
          <button class="btn btn-ghost btn-sm" id="simpler" style="margin-top:12px">Не понял, объясни проще</button>
          <button class="btn btn-primary btn-sm" id="next" style="margin-top:12px;margin-left:8px">Следующее задание</button>
        </div>`;
      slot.querySelector('#next').addEventListener('click', () => { difficulty = Number(sessionStorage.getItem(sessionKey(nodeId))); task = pickTask(); draw(); });
      slot.querySelector('#simpler').addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = 'Думаем…';
        const { callGemini } = await import('../ai.js');
        const res = await callGemini('explain_simpler', { topic: titleFor(node), original: task.solution });
        const p = document.createElement('p');
        p.style.marginTop = '10px'; p.style.color = 'var(--ink-soft)';
        p.textContent = res.explanation;
        slot.querySelector('.feedback-panel').insertBefore(p, e.target);
        e.target.remove();
      });
      return;
    }

    // Correct — but was it understood or guessed? Only actually worth asking
    // when a guess was *possible*: on a multiple-choice question, or when the
    // answer came back too fast to have been worked out. Free-text answers that
    // took real time are their own proof. This used to fire on every single
    // correct answer, which burned the whole daily AI budget in ~18 tasks and
    // interrogated students who had plainly done the work.
    const guessable = task.type === 'choice';
    const suspiciouslyFast = timeSpent < 8000 && task.difficulty >= 3;
    const needsCheck = guessable || suspiciouslyFast;

    slot.innerHTML = `<div class="feedback-panel correct"><strong>${t('task_correct')}</strong>${needsCheck
      ? ` <span id="check-status" style="display:inline-flex;align-items:center;gap:8px"><span class="skel" style="width:14px;height:14px;border-radius:50%;flex-shrink:0"></span>${t('task_checking')}</span>`
      : ''}</div>`;
    // Declared before any creditMastery() call — it closes over this binding,
    // so calling it earlier would hit the temporal dead zone.
    const panel = slot.querySelector('.feedback-panel');

    if (!needsCheck) { await creditMastery(true); return; }

    const { callGemini } = await import('../ai.js');
    const check = await callGemini('comprehension_check', { topic: titleFor(node), solution: task.solution });

    if (!check?.question) { await creditMastery(true); return; }

    panel.innerHTML = `
      <strong>Верно.</strong>
      <p style="margin-top:8px">Ещё один вопрос, чтобы убедиться, что это не угадано:</p>
      <p style="margin-top:6px;font-weight:600">${check.question}</p>
      <div class="field" style="margin-top:10px"><input class="input" id="check-ans" placeholder="Ответ"></div>
      <button class="btn btn-primary btn-sm" id="check-submit" style="margin-top:10px">${icon('check')}Проверить</button>`;
    panel.querySelector('#check-submit').addEventListener('click', async () => {
      const val = panel.querySelector('#check-ans').value.trim().toLowerCase();
      const checkCorrect = val.length > 0 && (val.includes(check.expected_answer.toLowerCase().slice(0, 8)) || val.length > 6);
      const resolution = resolveComprehensionCheck({ answerCorrect: true, checkCorrect });
      await creditMastery(resolution.counted, resolution.note);
    });

    async function creditMastery(counted, note) {
      const mastery = await getMastery(user.id);
      const prev = mastery.find(m => m.node_id === nodeId);
      // "Closing" a node means it wasn't mastered before and is now — 'gap' and
      // 'learning' both render as unmastered (red/sand) in the graph, so either
      // one flipping to 'mastered' is the wave-worthy moment, not just 'gap' specifically.
      const wasGap = !prev || prev.status !== 'mastered';
      const patch = updateMastery(prev, { isCorrect: counted, difficulty: task.difficulty });
      if (!counted) patch.status = 'learning';
      await upsertMastery(user.id, nodeId, patch);
      const justClosed = counted && wasGap && patch.status === 'mastered';
      let waveLink = '';
      if (justClosed) {
        const subjects = await listSubjects();
        const slug = subjects.find(s => s.id === node.subject_id)?.slug || 'math';
        waveLink = `<a class="btn btn-primary btn-sm" href="#/module/${slug}?closed=${nodeId}" style="margin-top:10px;margin-left:8px">${icon('bolt')}Смотреть волну в графе</a>`;
      }
      panel.className = `feedback-panel ${counted ? 'correct' : 'wrong'}`;
      panel.innerHTML = counted
        ? `<strong>${justClosed ? 'Пробел закрыт.' : 'Понято по-настоящему.'}</strong><p style="margin-top:8px">Прогресс засчитан.</p><button class="btn btn-ghost btn-sm" id="next2" style="margin-top:10px">Следующее задание</button>${waveLink}`
        : `<strong>Похоже, ответ был угадан.</strong><p style="margin-top:8px">Тема остаётся «требует закрепления» — это честно, и это нормально.</p><button class="btn btn-primary btn-sm" id="next2" style="margin-top:10px">Ещё раз</button>`;
      panel.querySelector('#next2').addEventListener('click', () => { difficulty = Number(sessionStorage.getItem(sessionKey(nodeId))); task = pickTask(); draw(); });
    }
  }

  draw();
}
