// views/settings.js — language, accessibility modes, profile.
import { setLang, getLang } from '../i18n.js';
import { getModes, toggleMode } from '../a11y.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

const LANGS = [['ru', 'Русский'], ['kk', 'Қазақша'], ['en', 'English']];
const MODES = [
  ['dyslexia', 'Дислексия', 'Увеличенные интервалы и трекинг, разбивка на чанки.'],
  ['adhd', 'СДВГ', 'Компактные экраны, микро-сессии.'],
  ['lowvision', 'Слабовидение', 'Высокий контраст, чёткие границы.'],
];

export async function renderSettings(root) {
  const user = store.get().user;
  const activeModes = getModes();

  root.innerHTML = `
    <div class="topbar"><div><div class="eyebrow">Настройки</div><h1>Профиль</h1></div></div>
    <div class="card card-pad" style="max-width:640px;margin-bottom:20px">
      <strong>${user.full_name}</strong>
      <p style="color:var(--ink-soft);margin-top:4px">${user.role === 'teacher' ? 'Учитель' : `${user.grade || 9} класс · ученик`}</p>
    </div>

    <h3 style="margin-bottom:12px">Язык интерфейса</h3>
    <div class="chip-grid" style="max-width:400px;margin-bottom:24px">
      ${LANGS.map(([code, label]) => `<button class="chip ${getLang() === code ? 'selected' : ''}" data-lang="${code}">${label}</button>`).join('')}
    </div>

    <h3 style="margin-bottom:12px">Режимы доступности</h3>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:480px">
      ${MODES.map(([id, label, desc]) => `
        <label class="card card-pad" style="display:flex;align-items:center;gap:12px;cursor:pointer">
          <input type="checkbox" data-mode="${id}" ${activeModes.includes(id) ? 'checked' : ''}>
          <span><strong style="display:block">${label}</strong><span style="font-size:13px;color:var(--ink-soft)">${desc}</span></span>
        </label>`).join('')}
    </div>`;

  root.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    toast('Язык изменён', 'root');
    root.querySelectorAll('[data-lang]').forEach(x => x.classList.toggle('selected', x === b));
  }));
  root.querySelectorAll('[data-mode]').forEach(cb => cb.addEventListener('change', () => toggleMode(cb.dataset.mode)));
}
