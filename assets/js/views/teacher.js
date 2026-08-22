// views/teacher.js — teacher's landing: classes overview + create class + risk radar teaser.
import { listClasses, listSubjects, createClass } from '../db.js';
import { titleFor, t } from '../i18n.js';
import { store } from '../store.js';
import { openModal, toast, icon } from '../ui.js';

export async function renderTeacher(root) {
  const user = store.get().user;
  const [classes, subjects] = await Promise.all([listClasses(user.id), listSubjects()]);

  root.innerHTML = `
    <div class="topbar">
      <div><div class="eyebrow">${t('t_eyebrow')}</div><h1>${t('t_my_classes')}</h1></div>
      <button class="btn btn-primary" id="new-class">${t('t_new_class')}</button>
    </div>
    <div class="grid-3" id="class-grid">
      ${classes.map(c => `
        <a href="#/class/${c.id}" class="card card-pad" style="text-decoration:none;display:flex;flex-direction:column;gap:10px">
          <strong style="color:var(--ink);font-size:var(--t-18)">${c.title}</strong>
          <span class="pill">${t('t_join_code')}: <span class="mono">${c.join_code}</span></span>
        </a>`).join('') || `<div class="empty"><h3>${t('t_no_classes')}</h3><p>${t('t_no_classes_sub')}</p></div>`}
    </div>`;

  document.getElementById('new-class').addEventListener('click', () => {
    const modal = openModal(`
      <h3 style="margin-bottom:16px">Новый класс</h3>
      <div class="field"><label>Название</label><input class="input" id="cls-title" placeholder="9 «Ә» класс"></div>
      <div class="field" style="margin-top:12px"><label>Предмет</label>
        <select class="select input" id="cls-subject">${subjects.map(s => `<option value="${s.id}">${titleFor(s)}</option>`).join('')}</select>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary" id="cls-save">Создать</button>
        <button class="btn btn-ghost" id="cls-cancel">Отмена</button>
      </div>`);
    modal.el.querySelector('#cls-cancel').addEventListener('click', modal.close);
    modal.el.querySelector('#cls-save').addEventListener('click', async () => {
      const title = modal.el.querySelector('#cls-title').value.trim() || 'Новый класс';
      const subjectId = modal.el.querySelector('#cls-subject').value;
      const cls = await createClass({ teacher_id: user.id, title, subject_id: subjectId });
      toast(`Класс «${title}» создан · код ${cls.join_code}`, 'root');
      modal.close();
      renderTeacher(root);
    });
  });
}
