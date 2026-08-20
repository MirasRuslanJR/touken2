// views/onboarding.js — grade, subject, goal, deadline. Feeds straight into the diagnostic.
import { listSubjects, saveGoal } from '../db.js';
import { titleFor } from '../i18n.js';
import { store } from '../store.js';

const GOALS = [
  { id: 'ent', label: 'ЕНТ' }, { id: 'olymp', label: 'Олимпиада' },
  { id: 'catchup', label: 'Подтянуть тему' }, { id: 'school', label: 'Школьная программа' },
];

export async function renderOnboarding(root) {
  const subjects = await listSubjects();
  const state = { grade: store.get().user?.grade || 9, subjectId: subjects[0]?.id, goal: 'ent', date: '' };

  root.innerHTML = `
    <div class="onboard-wrap">
      <div class="eyebrow">Настройка</div>
      <h1 style="margin-bottom:24px">Расскажи о себе</h1>

      <div class="field"><label>Класс</label>
        <div class="chip-grid">${[7,8,9,10,11,12].map(g => `<button class="chip ${g === state.grade ? 'selected' : ''}" data-grade="${g}">${g}</button>`).join('')}</div>
      </div>

      <div class="field" style="margin-top:20px"><label>Предмет</label>
        <div class="chip-grid">${subjects.map(s => `<button class="chip ${s.id === state.subjectId ? 'selected' : ''}" data-subject="${s.id}">${titleFor(s)}</button>`).join('')}</div>
      </div>

      <div class="field" style="margin-top:20px"><label>Цель</label>
        <div class="chip-grid">${GOALS.map(g => `<button class="chip ${g.id === state.goal ? 'selected' : ''}" data-goal="${g.id}">${g.label}</button>`).join('')}</div>
      </div>

      <div class="field" style="margin-top:20px"><label>Срок цели</label>
        <input class="input" type="date" id="target-date">
      </div>

      <button class="btn btn-primary" id="go" style="margin-top:28px;width:100%">Начать диагностику</button>
    </div>`;

  root.querySelectorAll('[data-grade]').forEach(b => b.addEventListener('click', () => { state.grade = Number(b.dataset.grade); refresh(); }));
  root.querySelectorAll('[data-subject]').forEach(b => b.addEventListener('click', () => { state.subjectId = b.dataset.subject; refresh(); }));
  root.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => { state.goal = b.dataset.goal; refresh(); }));
  document.getElementById('target-date').addEventListener('change', (e) => state.date = e.target.value);

  function refresh() {
    root.querySelectorAll('[data-grade]').forEach(b => b.classList.toggle('selected', Number(b.dataset.grade) === state.grade));
    root.querySelectorAll('[data-subject]').forEach(b => b.classList.toggle('selected', b.dataset.subject === state.subjectId));
    root.querySelectorAll('[data-goal]').forEach(b => b.classList.toggle('selected', b.dataset.goal === state.goal));
  }

  document.getElementById('go').addEventListener('click', async () => {
    const subject = subjects.find(s => s.id === state.subjectId);
    const user = store.get().user;
    await saveGoal({
      user_id: user.id, kind: state.goal,
      title: GOALS.find(g => g.id === state.goal)?.label || 'Цель',
      target_date: state.date || null, target_score: state.goal === 'ent' ? 100 : null,
    });
    location.hash = `#/diagnostic/${subject.slug}`;
  });
}
