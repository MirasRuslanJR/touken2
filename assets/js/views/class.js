// views/class.js — roster, class heatmap (topics × students), AI module builder,
// and the risk radar (killer feature #6). The heatmap is the single screen that
// answers "did the class fail, or did one kid fail" at a glance.
import { classRoster, listNodes, listSubjects, createNode, createTasks, getClass, listPendingMembers, setMembershipStatus } from '../db.js';
import { riskScore } from '../mastery.js';
import { titleFor } from '../i18n.js';
import { openModal, toast, icon, aiBadge } from '../ui.js';

// Derived from the student's own accuracy (+ small deterministic per-node jitter)
// rather than an independent hash, so the heatmap row never contradicts the
// risk card shown for the same student further down the page.
function seededHeat(student, nodeId) {
  let h = 0;
  const s = student.id + nodeId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  const jitter = (h % 30) - 15;
  return Math.max(2, Math.min(99, Math.round((student.accuracy ?? 50) + jitter)));
}

function heatColor(v) {
  if (v >= 70) return 'var(--root-10)';
  if (v >= 40) return 'var(--steppe-10)';
  return 'var(--gap-10)';
}
function heatText(v) {
  if (v >= 70) return 'var(--root)';
  if (v >= 40) return '#8a6120';
  return 'var(--gap)';
}

export async function renderClass(root, { id }) {
  root.innerHTML = `<div class="skel" style="height:60vh"></div>`;
  const [cls, roster, pending, subjects] = await Promise.all([getClass(id), classRoster(id), listPendingMembers(id), listSubjects()]);
  const math = subjects.find(s => s.slug === 'math') || subjects[0];
  const grade9 = (await listNodes(math.id)).filter(n => n.grade === 9);

  const students = roster.map(r => r.profiles);
  const requests = pending.map(r => r.profiles);

  root.innerHTML = `
    <div class="topbar">
      <div>
        <div class="eyebrow">Класс</div>
        <h1>${cls?.title || 'Класс'}</h1>
        ${cls?.join_code ? `<span class="pill" style="margin-top:8px">Код для учеников: <span class="mono">${cls.join_code}</span></span>` : ''}
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost" id="radar-btn">${icon('bolt')}Радар риска</button>
        <button class="btn btn-primary" id="build-btn">Учитель-мультипликатор</button>
      </div>
    </div>

    ${requests.length ? `
    <h3 style="margin-bottom:12px">Заявки на вступление · ${requests.length}</h3>
    <div id="requests-grid" class="grid-3" style="margin-bottom:28px">
      ${requests.map(s => `
        <div class="card card-pad">
          <strong style="color:var(--ink)">${s.full_name}</strong>
          <div style="font-size:13px;color:var(--ink-soft);margin-top:2px">${s.school || 'Школа не указана'} · ${s.grade || '—'} класс</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary btn-sm" data-accept="${s.id}" style="flex:1">Принять</button>
            <button class="btn btn-ghost btn-sm" data-reject="${s.id}" style="flex:1">Отклонить</button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <h3 style="margin-bottom:12px">Тепловая карта класса</h3>
    <div class="heatmap-scroll" style="margin-bottom:28px">
      <table class="heatmap">
        <thead><tr><th>Ученик</th>${grade9.map(n => `<th class="mono">${n.code}</th>`).join('')}</tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><a href="#/student/${s.id}" style="text-decoration:none;color:var(--ink);font-weight:600">${s.full_name}</a></td>
              ${grade9.map(n => { const v = seededHeat(s, n.id); return `<td><div class="heat-cell" style="background:${heatColor(v)};color:${heatText(v)}">${v}</div></td>`; }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3 style="margin-bottom:12px">Ученики</h3>
    <div class="grid-3" id="roster-grid">
      ${students.map(s => {
        const risk = riskScore({ accuracyRecent: s.accuracy, accuracyPrior: s.accuracy + (s.trend === 'down' ? 25 : 0), daysSinceActive: s.lastActive, nightShare: s.trend === 'down' ? 0.4 : 0.1 });
        return `
        <a href="#/student/${s.id}" class="risk-card" style="text-decoration:none">
          <span class="risk-badge ${risk}"></span>
          <div>
            <strong style="color:var(--ink)">${s.full_name}</strong>
            <div style="font-size:13px;color:var(--ink-soft);margin-top:2px">${s.accuracy}% точность · ${s.trend === 'down' ? '↓ падает' : s.trend === 'up' ? '↑ растёт' : '→ стабильно'}</div>
          </div>
        </a>`;
      }).join('')}
    </div>`;

  document.getElementById('radar-btn').addEventListener('click', async () => {
    const modal = openModal(`
      <h3 style="margin-bottom:14px">Радар риска</h3>
      <div id="radar-body">
        <p style="color:var(--ink-soft);font-size:13px;margin-bottom:12px" id="radar-status">ИИ читает поведение ${students.length} учеников…</p>
        <div class="skel" style="height:60px"></div>
        <div class="skel" style="height:60px;margin-top:8px"></div>
      </div>`);
    // A whole-class read is the heaviest call in the app (~30s). Without a
    // ticking status the modal just looks frozen and people close it early.
    const startedAt = Date.now();
    const ticker = setInterval(() => {
      const el = modal.el.querySelector('#radar-status');
      if (el) el.textContent = `ИИ читает поведение ${students.length} учеников… ${Math.round((Date.now() - startedAt) / 1000)} с`;
    }, 1000);
    const { callGemini } = await import('../ai.js');
    let signals;
    try { signals = await callGemini('teacher_radar', { students: students.map(s => ({ name: s.full_name, accuracy: s.accuracy, trend: s.trend, daysInactive: s.lastActive })) }); }
    finally { clearInterval(ticker); }
    modal.el.querySelector('#radar-body').innerHTML = `<div style="margin-bottom:12px">${aiBadge(signals)}</div>` + (signals.signals || []).map(sig => `
      <div class="risk-card" style="margin-bottom:10px">
        <span class="risk-badge ${sig.risk === 'high' ? 'high' : sig.risk === 'med' ? 'med' : 'low'}"></span>
        <div><strong style="color:var(--ink)">${sig.student}</strong><div style="font-size:13px;color:var(--ink-soft);margin-top:2px">${sig.message}</div></div>
      </div>`).join('') + `<button class="btn btn-ghost btn-sm" id="radar-close" style="margin-top:8px">Закрыть</button>`;
    modal.el.querySelector('#radar-close').addEventListener('click', modal.close);
  });

  document.getElementById('build-btn').addEventListener('click', () => openBuilder(math, grade9.length, () => renderClass(root, { id })));

  document.getElementById('requests-grid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const studentId = btn.dataset.accept || btn.dataset.reject;
    if (!studentId) return;
    const status = btn.dataset.accept ? 'approved' : 'rejected';
    btn.closest('.card').style.opacity = '.5';
    btn.closest('.card').style.pointerEvents = 'none';
    try {
      await setMembershipStatus(id, studentId, status);
      toast(status === 'approved' ? 'Ученик добавлен в класс' : 'Заявка отклонена', status === 'approved' ? 'root' : '');
      renderClass(root, { id });
    } catch (err) {
      toast(err.message || 'Не удалось обработать заявку', 'gap');
    }
  });
}

async function openBuilder(subject, existingCount, onPublished) {
  const modal = openModal(`
    <h3 style="margin-bottom:10px">Учитель-мультипликатор</h3>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:12px">Вставь текст главы или конспект — получишь готовый модуль с 10 заданиями пяти уровней сложности.</p>
    <textarea class="input" id="builder-text" style="min-height:140px" placeholder="Например: «Показательная функция — функция вида y=a^x, где a>0…»"></textarea>
    <button class="btn btn-primary" id="builder-go" style="margin-top:14px">Сгенерировать модуль</button>
    <div id="builder-result" style="margin-top:16px"></div>`);

  modal.el.querySelector('#builder-go').addEventListener('click', async () => {
    const text = modal.el.querySelector('#builder-text').value.trim();
    if (!text) return;
    const resultBox = modal.el.querySelector('#builder-result');
    const startedAt = Date.now();
    resultBox.innerHTML = `<p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px" id="builder-status">ИИ разбирает текст и составляет 10 заданий…</p><div class="skel" style="height:80px"></div>`;
    const ticker = setInterval(() => {
      const el = resultBox.querySelector('#builder-status');
      if (el) el.textContent = `ИИ разбирает текст и составляет 10 заданий… ${Math.round((Date.now() - startedAt) / 1000)} с`;
    }, 1000);
    const { callGemini } = await import('../ai.js');
    let built;
    try { built = await callGemini('module_builder', { sourceText: text }); }
    finally { clearInterval(ticker); }
    resultBox.innerHTML = `
      <div class="card card-pad">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><strong>${built.topic_title}</strong>${aiBadge(built)}</div>
        <div style="margin-top:8px;font-size:13px;color:var(--ink-soft)">${(built.microtopics || []).join(' · ')}</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          ${(built.tasks || []).slice(0, 4).map(t => `<div style="font-size:14px"><span class="pill">Ур. ${t.difficulty}</span> ${t.prompt}</div>`).join('')}
          ${built.tasks?.length > 4 ? `<span style="font-size:13px;color:var(--ink-soft)">и ещё ${built.tasks.length - 4} заданий…</span>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" id="publish-btn" style="margin-top:14px">Опубликовать в класс</button>
      </div>`;
    resultBox.querySelector('#publish-btn').addEventListener('click', async (e) => {
      e.target.disabled = true; e.target.textContent = 'Публикуем…';
      try {
        const code = `NEW-${Date.now().toString(36).toUpperCase()}`;
        const node = await createNode({
          subject_id: subject.id, code,
          title_ru: built.topic_title, title_kk: built.topic_title, title_en: built.topic_title,
          grade: 9, summary: (built.microtopics || []).join(' · '), order_index: existingCount + 1,
        });
        await createTasks((built.tasks || []).map(t => ({
          node_id: node.id, difficulty: t.difficulty, type: t.type, prompt: t.prompt,
          options: t.options || null, answer: t.answer, solution: t.solution, lang: 'ru',
        })));
        toast(`Опубликовано — тема «${built.topic_title}» появилась в графе`, 'root');
        modal.close();
        onPublished?.();
      } catch (err) {
        toast(err.message || 'Не удалось опубликовать', 'gap');
        e.target.disabled = false; e.target.textContent = 'Опубликовать в класс';
      }
    });
  });
}
