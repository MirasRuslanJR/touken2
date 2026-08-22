// views/tutor.js — Сократ: never gives the final answer, only guiding questions,
// escalating through 5 levels. Refuses direct "just tell me" requests by design (see ai.js system prompt).
import { getNode } from '../db.js';
import { titleFor, t } from '../i18n.js';
import { icon } from '../ui.js';

export async function renderTutor(root, { nodeId }) {
  const node = nodeId ? await getNode(nodeId) : null;
  let level = 0;
  const history = [];

  root.innerHTML = `
    <div class="topbar">
      <div><div class="eyebrow">${t('tut_eyebrow')}</div><h1>${node ? titleFor(node) : t('tut_title')}</h1></div>
    </div>
    <div class="tutor-stage">
      <div class="card card-pad" style="max-width:720px;width:100%;margin:0 auto">
        <div class="chat-log" id="chat-log">
          <div class="bubble ai">${t('tut_hello')}</div>
        </div>
        <div class="hint-ladder" id="hint-ladder">${Array.from({ length: 5 }, () => '<span></span>').join('')}</div>
        <div class="chat-input-row">
          <input class="input" id="chat-input" placeholder="${t('tut_placeholder')}">
          <button class="btn btn-primary btn-icon" id="chat-send" aria-label="${t('tut_send')}">${icon('arrowRight')}</button>
        </div>
      </div>
    </div>`;

  const log = document.getElementById('chat-log');
  const input = document.getElementById('chat-input');
  const ladder = document.getElementById('hint-ladder');

  function bubble(text, who) {
    const b = document.createElement('div');
    b.className = `bubble ${who}`;
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
  }

  function setLevel(n) {
    level = Math.max(level, n);
    [...ladder.children].forEach((s, i) => s.classList.toggle('used', i < level));
  }

  async function send() {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    bubble(msg, 'user');
    history.push(msg);
    const thinking = document.createElement('div');
    thinking.className = 'bubble ai';
    thinking.innerHTML = `<span class="skel" style="display:inline-block;width:120px;height:14px"></span>`;
    log.appendChild(thinking);
    log.scrollTop = log.scrollHeight;

    const { callGemini } = await import('../ai.js');
    let res;
    try {
      res = await callGemini('tutor_reply', { topic: node ? titleFor(node) : 'общий вопрос', message: msg, history: history.slice(-6), currentLevel: level });
    } catch {
      res = { reply: 'Сеть недоступна, но подсказка есть: попробуй сформулировать первый шаг решения словами.', escalation_level: level + 1, gave_answer: false };
    }
    thinking.remove();
    bubble(res.reply, 'ai');
    setLevel(res.escalation_level || level + 1);
  }

  document.getElementById('chat-send').addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
}
