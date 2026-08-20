// ui.js — small shared UI helpers: toasts, modals, skeleton builders.

export function toast(message, kind = '') {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`.trim();
  t.textContent = message;
  t.setAttribute('role', 'status');
  root.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 200ms'; t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2600);
}

export function openModal(contentHtml) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${contentHtml}</div>`;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', escHandler);
  function escHandler(e) { if (e.key === 'Escape') close(); }
  function close() { backdrop.remove(); document.removeEventListener('keydown', escHandler); }
  document.body.appendChild(backdrop);
  return { el: backdrop, close };
}

export function skeleton(height = 16, width = '100%') {
  const d = document.createElement('div');
  d.className = 'skel';
  d.style.height = `${height}px`;
  d.style.width = width;
  return d;
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function icon(name) {
  const paths = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1V10.5Z"/>',
    graph: '<circle cx="6" cy="17" r="2.5"/><circle cx="12" cy="7" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8 15.5 10.5 9M16 15.5 13.5 9"/>',
    task: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tutor: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12.5h5"/>',
    scan: '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M9 6l1-2h4l1 2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 5-5.5 7-5.5s5.5 1.5 7 5.5"/>',
    teacher: '<path d="M3 9 12 4l9 5-9 5-9-5Z"/><path d="M7 12v5c0 1.5 2 3 5 3s5-1.5 5-3v-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.8-1.6L13.3 2h-2.6l-.4 2.8a7 7 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .5.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.8 1.6l.4 2.8h2.6l.4-2.8a7 7 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.6Z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  return `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name] || ''}</svg></span>`;
}
