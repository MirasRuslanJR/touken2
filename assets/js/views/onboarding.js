// views/onboarding.js — grade, subject, goal, deadline, school + optional class
// code. Feeds straight into the diagnostic; the class code (if any) sends a
// pending join request a teacher accepts/rejects from their class screen.
import { listSubjects, saveGoal, updateProfile, findClassByJoinCode, requestJoinClass } from '../db.js';
import { titleFor } from '../i18n.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

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

      <div class="field" style="margin-top:20px"><label>Школа</label>
        <input class="input" id="school" placeholder="Например: Школа-лицей №5, Алматы">
      </div>

      <div class="field" style="margin-top:20px">
        <label>Код класса от учителя <span style="color:var(--ink-soft);font-weight:400">(необязательно)</span></label>
        <input class="input mono" id="class-code" placeholder="Например: TAMYR9" maxlength="8" style="text-transform:uppercase">
        <p style="font-size:13px;color:var(--ink-soft);margin-top:6px">Учитель увидит заявку и должен будет её принять — ты сразу попадёшь в тепловую карту класса. Без кода тоже можно — просто занимайся сам.</p>
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

  document.getElementById('go').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const subject = subjects.find(s => s.id === state.subjectId);
    const user = store.get().user;
    const school = document.getElementById('school').value.trim();
    const classCode = document.getElementById('class-code').value.trim();

    await saveGoal({
      user_id: user.id, kind: state.goal,
      title: GOALS.find(g => g.id === state.goal)?.label || 'Цель',
      target_date: state.date || null, target_score: state.goal === 'ent' ? 100 : null,
    });

    if (school) {
      try { await updateProfile(user.id, { school }); store.set({ user: { ...user, school } }); } catch { /* non-critical */ }
    }

    if (classCode) {
      try {
        const cls = await findClassByJoinCode(classCode);
        if (cls) {
          await requestJoinClass(cls.id, user.id);
          toast(`Заявка отправлена в «${cls.title}» — жди подтверждения от учителя`, 'root');
        } else {
          toast('Код класса не найден — проверь у учителя и добавь его позже в настройках', 'gap');
        }
      } catch (err) {
        toast(err.message || 'Не удалось отправить заявку', 'gap');
      }
    }

    location.hash = `#/diagnostic/${subject.slug}`;
  });
}
