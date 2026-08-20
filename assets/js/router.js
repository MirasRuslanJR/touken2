// router.js — hash router with View Transitions API and graceful fallback.
const routes = new Map();
let rootEl = null;
let notFound = () => '<div class="empty"><h3>Страница не найдена</h3></div>';

export function registerRoute(path, renderFn) { routes.set(path, renderFn); }
export function setNotFound(fn) { notFound = fn; }

function matchRoute(hash) {
  const path = (hash || '#/').replace(/^#/, '') || '/';
  const [pathname, query] = path.split('?');
  const params = new URLSearchParams(query || '');
  for (const [pattern, fn] of routes) {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
    const m = pathname.match(regex);
    if (m) {
      const routeParams = {};
      keys.forEach((k, i) => routeParams[k] = decodeURIComponent(m[i + 1]));
      return { fn, params: routeParams, query };
    }
  }
  return null;
}

async function render() {
  const match = matchRoute(location.hash);
  const doRender = async () => {
    rootEl.setAttribute('aria-busy', 'true');
    try {
      if (match) await match.fn(rootEl, match.params, match.query);
      else rootEl.innerHTML = notFound();
    } catch (err) {
      console.warn('[router] render error', err);
      rootEl.innerHTML = `<div class="empty"><h3>Что-то пошло не так</h3><p>${err.message || err}</p></div>`;
    }
    rootEl.removeAttribute('aria-busy');
    rootEl.scrollTop = 0;
    document.querySelectorAll('.rail a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + (match ? location.hash.replace('#', '') : ''));
    });
  };

  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const transition = document.startViewTransition(doRender);
    // A transition superseded by a fast follow-up navigation rejects .ready/.finished
    // with AbortError — expected lifecycle behaviour, not a bug. Swallow it so it never
    // surfaces as an unhandled rejection / console.error.
    transition.finished.catch(() => {});
    transition.ready.catch(() => {});
  } else {
    await doRender();
  }
}

export function initRouter(root) {
  rootEl = root;
  window.addEventListener('hashchange', render);
  render();
}

export function navigate(hash) { location.hash = hash; }
