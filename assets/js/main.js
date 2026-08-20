// main.js — app.html entry point: session, nav, routes, offline indicator.
import { getSession, signOut, isDemo } from './db.js';
import { initRouter, registerRoute } from './router.js';
import { store } from './store.js';
import { initA11yStyles } from './a11y.js';
import { getLang, setLang, t } from './i18n.js';
import { initOfflineSync, onQueueChange, queueLength } from './offline.js';
import { icon } from './ui.js';

import { renderDashboard } from './views/dashboard.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderDiagnostic } from './views/diagnostic.js';
import { renderXray } from './views/xray.js';
import { renderModule } from './views/module.js';
import { renderTask } from './views/task.js';
import { renderTutor } from './views/tutor.js';
import { renderFeynman } from './views/feynman.js';
import { renderScan } from './views/scan.js';
import { renderTeacher } from './views/teacher.js';
import { renderClass } from './views/class.js';
import { renderStudent } from './views/student.js';
import { renderSettings } from './views/settings.js';

document.documentElement.lang = getLang();
initA11yStyles();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

const session = await getSession();
if (!session?.user) {
  location.href = 'index.html';
} else {
  let user = session.user;
  if (!isDemo()) {
    const { supabase } = await import('./db.js');
    const { data: profile } = await supabase().from('profiles').select('*').eq('id', user.id).single();
    user = { ...user, ...profile };
  }
  store.set({ user });
  boot();
}

function navFor(role) {
  if (role === 'teacher') {
    return [
      ['#/', 'home', t('nav_teacher')],
      ['#/settings', 'settings', t('nav_settings')],
    ];
  }
  return [
    ['#/', 'home', t('nav_home')],
    ['#/module/math', 'graph', t('nav_modules')],
    ['#/tutor', 'tutor', t('nav_tutor')],
    ['#/scan', 'scan', t('nav_scan')],
    ['#/settings', 'settings', t('nav_settings')],
  ];
}

function boot() {
  const role = store.get().user?.role || 'student';
  const nav = document.getElementById('rail-nav');
  nav.innerHTML = navFor(role).map(([href, ic, label]) =>
    `<a href="${href}">${icon(ic)}<span>${label}</span></a>`).join('');

  document.getElementById('btn-signout').addEventListener('click', async () => {
    await signOut();
    location.href = 'index.html';
  });

  mountOfflineFlag();

  registerRoute('/', renderDashboard);
  registerRoute('/onboarding', renderOnboarding);
  registerRoute('/diagnostic/:subject', renderDiagnostic);
  registerRoute('/xray/:diagId', renderXray);
  registerRoute('/module/:slug', renderModule);
  registerRoute('/task/:nodeId', renderTask);
  registerRoute('/tutor', renderTutor);
  registerRoute('/tutor/:nodeId', renderTutor);
  registerRoute('/feynman/:nodeId', renderFeynman);
  registerRoute('/scan', renderScan);
  registerRoute('/teacher', renderTeacher);
  registerRoute('/class/:id', renderClass);
  registerRoute('/student/:id', renderStudent);
  registerRoute('/settings', renderSettings);

  if (role === 'teacher' && (location.hash === '' || location.hash === '#/')) {
    location.hash = '#/teacher';
  }
  initRouter(document.getElementById('view-root'));
}

function mountOfflineFlag() {
  const flag = document.createElement('div');
  flag.className = 'offline-flag';
  flag.id = 'offline-flag';
  document.querySelector('.rail-foot').prepend(flag);
  const update = async () => {
    const n = await queueLength();
    const on = navigator.onLine;
    flag.classList.toggle('on-line', on);
    flag.innerHTML = `<span class="dot"></span>${on ? (n ? `онлайн · ${n} ждут отправки` : 'онлайн') : `офлайн${n ? ` · ${n} ответов ждут отправки` : ''}`}`;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  onQueueChange(update);
  update();
  initOfflineSync(async (row) => {
    const { recordAttempt } = await import('./db.js');
    await recordAttempt(row);
  });
}
