// views/class.js — roster, class heatmap (topics × students), AI module builder,
// and the risk radar (killer feature #6). The heatmap is the single screen that
// answers "did the class fail, or did one kid fail" at a glance.
import { classRoster, listNodes, listSubjects } from '../db.js';
import { riskScore } from '../mastery.js';
import { titleFor } from '../i18n.js';
import { openModal, toast, icon } from '../ui.js';

function seededHeat(studentId, nodeId) {
  let h = 0;
  const s = studentId + nodeId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h % 100;
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
  const [roster, subjects] = await Promise.all([classRoster(id), listSubjects()]);
  const math = subjects.find(s => s.slug === 'math') || subjects[0];
  const grade9 = (await listNodes(math.id)).filter(n => n.grade === 9);

  const students = roster.map(r => r.profiles);

  root.innerHTML = `
    <div class="topbar">
      <div><div class="eyebrow">Класс</div><h1>9 «Ә» класс</h1></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost" id="radar-btn">${icon('bolt')}Радар риска</button>
        <button class="btn btn-primary" id="build-btn">Учитель-мультипликатор</button>
      </div>
    </div>

    <h3 style="margin-bottom:12px">Тепловая карта класса</h3>
    <div class="heatmap-scroll" style="margin-bottom:28px">
      <table class="heatmap">
        <thead><tr><th>Ученик</th>${grade9.map(n => `<th class="mono">${n.code}</th>`).join('')}</tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><a href="#/student/${s.id}" style="text-decoration:none;color:var(--ink);font-weight:600">${s.full_name}</a></td>
              ${grade9.map(n => { const v = seededHeat(s.id, n.id); return `<td><div class="heat-cell" style="background:${heatColor(v)};color:${heatText(v)}">${v}</div></td>`; }).join('')}
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
    const modal = openModal(`<h3 style="margin-bottom:14px">Радар риска</h3><div id="radar-body"><div class="skel" style="height:60px"></div></div>`);
    const { callGemini } = await import('../ai.js');
    const signals = await callGemini('teacher_radar', { students: students.map(s => ({ name: s.full_name, accuracy: s.accuracy, trend: s.trend, daysInactive: s.lastActive })) });
    modal.el.querySelector('#radar-body').innerHTML = signals.signals.map(sig => `
      <div class="risk-card" style="margin-bottom:10px">
        <span class="risk-badge ${sig.risk === 'high' ? 'high' : sig.risk === 'med' ? 'med' : 'low'}"></span>
        <div><strong style="color:var(--ink)">${sig.student}</strong><div style="font-size:13px;color:var(--ink-soft);margin-top:2px">${sig.message}</div></div>
      </div>`).join('') + `<button class="btn btn-ghost btn-sm" id="radar-close" style="margin-top:8px">Закрыть</button>`;
    modal.el.querySelector('#radar-close').addEventListener('click', modal.close);
  });

  document.getElementById('build-btn').addEventListener('click', () => openBuilder());
}

async function openBuilder() {
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
    resultBox.innerHTML = `<div class="skel" style="height:80px"></div>`;
    const { callGemini } = await import('../ai.js');
    const built = await callGemini('module_builder', { sourceText: text });
    resultBox.innerHTML = `
      <div class="card card-pad">
        <strong>${built.topic_title}</strong>
        <div style="margin-top:8px;font-size:13px;color:var(--ink-soft)">${(built.microtopics || []).join(' · ')}</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          ${(built.tasks || []).slice(0, 4).map(t => `<div style="font-size:14px"><span class="pill">Ур. ${t.difficulty}</span> ${t.prompt}</div>`).join('')}
          ${built.tasks?.length > 4 ? `<span style="font-size:13px;color:var(--ink-soft)">и ещё ${built.tasks.length - 4} заданий…</span>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" id="publish-btn" style="margin-top:14px">Опубликовать в класс</button>
      </div>`;
    resultBox.querySelector('#publish-btn').addEventListener('click', () => { toast('Опубликовано', 'root'); modal.close(); });
  });
}
