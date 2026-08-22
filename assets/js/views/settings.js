// views/settings.js — language, accessibility modes, profile, school + class code
// (same as onboarding, for anyone who skipped it or wants to join another class).
import { setLang, getLang, t } from '../i18n.js';
import { getModes, toggleMode } from '../a11y.js';
import { signOut, updateProfile, findClassByJoinCode, requestJoinClass, listMyMemberships } from '../db.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

const LANGS = [['ru', 'Русский'], ['kk', 'Қазақша'], ['en', 'English']];
const MODES = [
  ['dyslexia', 'Дислексия', 'Увеличенные интервалы и трекинг, разбивка на чанки.'],
  ['adhd', 'СДВГ', 'Компактные экраны, микро-сессии.'],
  ['lowvision', 'Слабовидение', 'Высокий контраст, чёткие границы.'],
];
const STATUS_LABEL = { pending: 'ожидает подтверждения', approved: 'подтверждено', rejected: 'отклонено' };

export async function renderSettings(root) {
  const user = store.get().user;
  const activeModes = getModes();
  const memberships = user.role === 'student' ? await listMyMemberships(user.id).catch(() => []) : [];

  root.innerHTML = `
    <div class="topbar"><div><div class="eyebrow">${t('set_title')}</div><h1>${t('set_profile')}</h1></div></div>
    <div class="card card-pad" style="max-width:640px;margin-bottom:20px">
      <strong>${user.full_name}</strong>
      <p style="color:var(--ink-soft);margin-top:4px">${user.role === 'teacher' ? t('teacher') : `${user.grade || 9} ${t('grade')} · ${t('student')}`}</p>
      ${user.school ? `<p style="color:var(--ink-soft);margin-top:4px">${user.school}</p>` : ''}
    </div>

    ${user.role === 'student' ? `
    <h3 style="margin-bottom:12px">${t('set_school_class')}</h3>
    <div class="card card-pad" style="max-width:480px;margin-bottom:24px;display:flex;flex-direction:column;gap:12px">
      <div class="field"><label>${t('set_school')}</label>
        <input class="input" id="school" placeholder="Например: Школа-лицей №5, Алматы" value="${user.school || ''}">
      </div>
      <div class="field"><label>${t('set_class_code')}</label>
        <div style="display:flex;gap:8px">
          <input class="input mono" id="class-code" placeholder="Например: TAMYR9" maxlength="8" style="text-transform:uppercase;flex:1">
          <button class="btn btn-primary btn-sm" id="save-school-class">${t('set_save')}</button>
        </div>
      </div>
      ${memberships.length ? `
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
        ${memberships.map(m => `
          <div style="display:flex;align-items:center;gap:8px;font-size:13px">
            <span class="mastery-dot ${m.status === 'approved' ? 'mastered' : m.status === 'rejected' ? 'gap' : 'learning'}"></span>
            <span style="color:var(--ink)">${m.classes?.title || 'Класс'}</span>
            <span style="color:var(--ink-soft)">— ${STATUS_LABEL[m.status] || m.status}</span>
          </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <h3 style="margin-bottom:12px">${t('set_lang')}</h3>
    <div class="chip-grid" style="max-width:400px;margin-bottom:24px">
      ${LANGS.map(([code, label]) => `<button class="chip ${getLang() === code ? 'selected' : ''}" data-lang="${code}">${label}</button>`).join('')}
    </div>

    <h3 style="margin-bottom:12px">${t('set_a11y')}</h3>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:480px">
      ${MODES.map(([id, label, desc]) => `
        <label class="card card-pad" style="display:flex;align-items:center;gap:12px;cursor:pointer">
          <input type="checkbox" data-mode="${id}" ${activeModes.includes(id) ? 'checked' : ''}>
          <span><strong style="display:block">${label}</strong><span style="font-size:13px;color:var(--ink-soft)">${desc}</span></span>
        </label>`).join('')}
    </div>

    <div style="margin-top:28px;max-width:480px">
      <button class="btn btn-ghost" id="settings-signout" style="width:100%;color:var(--gap);border-color:var(--gap-18)">${t('set_signout')}</button>
    </div>`;

  root.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.lang === getLang()) return;
    setLang(b.dataset.lang);
    root.querySelectorAll('[data-lang]').forEach(x => x.classList.toggle('selected', x === b));
    toast(t('set_lang_changed'), 'root');
    // The sidebar is built once at boot and every view renders its labels at
    // render time, so re-rendering just this screen would leave the rest of the
    // app in the old language. A reload is the honest way to swap all of it.
    setTimeout(() => location.reload(), 350);
  }));
  root.querySelectorAll('[data-mode]').forEach(cb => cb.addEventListener('change', () => toggleMode(cb.dataset.mode)));
  document.getElementById('settings-signout').addEventListener('click', async () => {
    await signOut();
    location.href = 'index.html';
  });

  document.getElementById('save-school-class')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const school = document.getElementById('school').value.trim();
    const classCode = document.getElementById('class-code').value.trim();
    try {
      if (school && school !== user.school) {
        await updateProfile(user.id, { school });
        store.set({ user: { ...user, school } });
      }
      if (classCode) {
        const cls = await findClassByJoinCode(classCode);
        if (cls) {
          await requestJoinClass(cls.id, user.id);
          toast(`Заявка отправлена в «${cls.title}»`, 'root');
        } else {
          toast('Код класса не найден', 'gap');
        }
      } else if (school) {
        toast('Сохранено', 'root');
      }
      renderSettings(root);
    } catch (err) {
      toast(err.message || 'Не удалось сохранить', 'gap');
      btn.disabled = false;
    }
  });
}
