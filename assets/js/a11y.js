// a11y.js — one-button accessibility modes, applied as body classes so CSS carries the rest.
const KEY = 'tamyr_a11y';

export function getModes() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }

export function applyModes(modes) {
  document.body.classList.remove('a11y-dyslexia', 'a11y-adhd', 'a11y-lowvision');
  modes.forEach(m => document.body.classList.add(`a11y-${m}`));
  localStorage.setItem(KEY, JSON.stringify(modes));
}

export function toggleMode(mode) {
  const modes = getModes();
  const next = modes.includes(mode) ? modes.filter(m => m !== mode) : [...modes, mode];
  applyModes(next);
  return next;
}

export function speak(text, lang = 'ru-RU') {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export function initA11yStyles() {
  if (document.getElementById('a11y-style')) return;
  const style = document.createElement('style');
  style.id = 'a11y-style';
  style.textContent = `
    body.a11y-dyslexia { letter-spacing: .04em; line-height: 1.9; }
    body.a11y-dyslexia p, body.a11y-dyslexia li { max-width: 62ch; }
    body.a11y-adhd .card-pad { padding: 14px; }
    body.a11y-adhd .task-card { max-width: 520px; }
    body.a11y-lowvision { filter: contrast(1.15); }
    body.a11y-lowvision { --hairline: #8a978f; }
    body.a11y-lowvision .btn { outline: 1px solid var(--ink); }
  `;
  document.head.appendChild(style);
  applyModes(getModes());
}
