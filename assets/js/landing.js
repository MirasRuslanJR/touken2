// landing.js — index.html only. Live hero graph loop (no login required) + demo/email auth.
import { renderGraph } from './graph.js';
import { signInDemo, signInEmail, signUpEmail, isDemo } from './db.js';
import { toast } from './ui.js';

// A compact, self-contained fixture just for the hero animation — not the real dataset.
const heroNodes = [
  { id: 'a', code: 'ALG-6-01', title: 'Дроби', grade: 1, order_index: 1 },
  { id: 'b', code: 'ALG-6-05', title: 'Десятичные', grade: 1, order_index: 2 },
  { id: 'c', code: 'ALG-7-02', title: 'Скобки', grade: 2, order_index: 1 },
  { id: 'd', code: 'ALG-7-05', title: 'Степени', grade: 2, order_index: 2 },
  { id: 'e', code: 'ALG-8-01', title: 'Корень', grade: 2, order_index: 3 },
  { id: 'f', code: 'ALG-9-01', title: 'Кв. уравнения', grade: 3, order_index: 1 },
  { id: 'g', code: 'ALG-9-03', title: 'Парабола', grade: 3, order_index: 2 },
  { id: 'h', code: 'ALG-9-04', title: 'Степенные ур.', grade: 3, order_index: 3 },
];
const heroEdges = [
  { from: 'a', to: 'c' }, { from: 'b', to: 'c' }, { from: 'a', to: 'd' },
  { from: 'c', to: 'f' }, { from: 'd', to: 'e' }, { from: 'e', to: 'f' },
  { from: 'f', to: 'g' }, { from: 'd', to: 'h' }, { from: 'f', to: 'h' },
];

function initHeroGraph() {
  const container = document.getElementById('hero-graph');
  if (!container) return;
  const mastery = new Map(heroNodes.map(n => [n.id, { status: Math.random() > 0.5 ? 'gap' : (Math.random() > 0.5 ? 'learning' : 'mastered') }]));
  const controller = renderGraph(container, { nodes: heroNodes, edges: heroEdges, mastery }, { width: 900, height: 520 });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  async function cycle() {
    const gapIds = heroNodes.map(n => n.id).filter(id => mastery.get(id).status === 'gap');
    const targetId = gapIds[0] || heroNodes[Math.floor(Math.random() * heroNodes.length)].id;
    mastery.set(targetId, { status: 'mastered' });
    await controller.lightWaveUp(targetId);
    // reseed a couple of fresh gaps so the loop keeps demonstrating the idea
    heroNodes.forEach(n => { if (Math.random() < 0.18) mastery.set(n.id, { status: 'gap' }); });
    heroNodes.forEach(n => controller.setStatus(n.id, mastery.get(n.id).status));
    setTimeout(cycle, 2600);
  }
  setTimeout(cycle, 1400);
}

initHeroGraph();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

document.getElementById('demo-student')?.addEventListener('click', async () => {
  await signInDemo('student');
  location.href = 'app.html';
});
document.getElementById('demo-teacher')?.addEventListener('click', async () => {
  await signInDemo('teacher');
  location.href = 'app.html';
});

document.getElementById('toggle-auth')?.addEventListener('click', (e) => {
  const form = document.getElementById('auth-form');
  const show = form.style.display !== 'flex';
  form.style.display = show ? 'flex' : 'none';
  e.target.textContent = show ? 'Скрыть' : 'Показать форму';
});

document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isDemo()) { toast('Email-вход доступен, когда подключён настоящий Supabase-проект (см. README) — пока используй демо-кнопки выше', 'gap'); return; }
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    await signInEmail(email, password);
    location.href = 'app.html';
  } catch (err) {
    toast(err.message || 'Не удалось войти', 'gap');
  }
});
document.getElementById('auth-signup')?.addEventListener('click', async () => {
  if (isDemo()) { toast('Регистрация доступна, когда подключён настоящий Supabase-проект — пока используй демо-кнопки выше', 'gap'); return; }
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { toast('Заполни email и пароль', 'gap'); return; }
  try {
    await signUpEmail(email, password, {});
    toast('Аккаунт создан — проверь почту, если нужно подтверждение', 'root');
  } catch (err) {
    toast(err.message || 'Не удалось зарегистрироваться', 'gap');
  }
});
