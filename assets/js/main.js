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
    const { getOrCreateProfile } = await import('./db.js');
    const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
    user = { ...user, ...profile };
  }
  store.set({ user });
  boot();
}

function navFor(role) {
  if (role === 'teacher') {
    return [
      ['#/teacher', 'home', t('nav_teacher')],
      ['#/settings', 'settings', t('nav_settings')],
    ];
  }
  return [
    ['#/', 'home', t('nav_home')],
    ['#/module/math', 'graph', t('nav_modules')],
    ['#/xray/last', 'bolt', t('nav_xray')],
    ['#/tutor', 'tutor', t('nav_tutor')],
    ['#/feynman', 'feynman', t('nav_feynman')],
    ['#/scan', 'scan', t('nav_scan')],
    ['#/settings', 'settings', t('nav_settings')],
  ];
}

function boot() {
  const role = store.get().user?.role || 'student';
  const nav = document.getElementById('rail-nav');
  nav.innerHTML = navFor(role).map(([href, ic, label]) =>
    `<a href="${href}">${icon(ic)}<span>${label}</span></a>`).join('');

  const signoutBtn = document.getElementById('btn-signout');
  signoutBtn.innerHTML = `${icon('logout')}<span>${t('nav_signout')}</span>`;
  signoutBtn.addEventListener('click', async () => {
    await signOut();
    location.href = 'index.html';
  });

  mountOfflineFlag();
  mountAiMeter();

  registerRoute('/', renderDashboard);
  registerRoute('/onboarding', renderOnboarding);
  registerRoute('/diagnostic/:subject', renderDiagnostic);
  registerRoute('/xray/:diagId', renderXray);
  registerRoute('/module/:slug', renderModule);
  registerRoute('/task/:nodeId', renderTask);
  registerRoute('/tutor', renderTutor);
  registerRoute('/tutor/:nodeId', renderTutor);
  registerRoute('/feynman', renderFeynman);
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

/**
 * Shows how much of today's real-Gemini budget is left. On the free tier the
 * per-day request cap is the single thing most likely to sink a live demo, so
 * it belongs on screen rather than buried in devtools. Hidden entirely when the
 * app isn't making real calls at all (demo login / FORCE_DEMO_AI), where a
 * counter would just be noise.
 */
async function mountAiMeter() {
  const { aiStatus } = await import('./ai.js');
  const { CONFIG } = await import('../../config.js');
  if (CONFIG.FORCE_DEMO_AI || (isDemo() && !CONFIG.GEMINI_API_KEY)) return;

  const meter = document.createElement('div');
  meter.className = 'ai-meter';
  meter.id = 'ai-meter';
  document.querySelector('.rail-foot').prepend(meter);

  const update = () => {
    const s = aiStatus();
    // Three states, not two: plenty left, Gemini gone but a backup model still
    // answering for real, and genuinely no live AI left.
    meter.classList.toggle('low', !s.exhausted && s.left <= 5);
    meter.classList.toggle('out', s.exhausted && !s.hasBackup);
    const label = !s.exhausted ? `ИИ: осталось ${s.left}`
      : s.hasBackup ? 'ИИ: запасная модель'
      : 'ИИ: резерв';
    meter.innerHTML = `<span class="dot"></span><span>${label}</span>`;
    meter.title = !s.exhausted
      ? `Осталось ${s.left} из ${s.budget} обращений к Gemini на сегодня. Повторные и закэшированные ответы лимит не тратят.`
      : s.hasBackup
        ? 'Дневной лимит Gemini исчерпан — запросы идут к запасной модели, ответы по-прежнему живые.'
        : 'Дневной лимит Gemini исчерпан — функции отвечают заранее заготовленными ответами.';
  };
  update();
  window.addEventListener('tamyr:ai-budget', update);
  // Backstop for the date rolling over to a new day mid-session, which resets
  // the budget without any call happening to fire the event.
  setInterval(update, 30000);
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
    flag.innerHTML = `<span class="dot"></span><span class="offline-text">${on ? (n ? `онлайн · ${n} ждут отправки` : 'онлайн') : `офлайн${n ? ` · ${n} ответов ждут отправки` : ''}`}</span>`;
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
