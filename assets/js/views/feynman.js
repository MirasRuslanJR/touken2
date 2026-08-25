// views/feynman.js — killer feature #5, режим Фейнмана: the student explains the
// topic out loud, Gemini compares the transcript against the topic's key ideas.
import { getNode, listSubjects, listNodes, getMastery } from '../db.js';
import { titleFor, t, localeTag } from '../i18n.js';
import { icon, aiBadge } from '../ui.js';
import { rankWeakSpots } from '../mastery.js';
import { store } from '../store.js';

/**
 * Entered from the sidebar there is no topic yet — the feature is per-topic, so
 * ask which one first. Weak spots come first: explaining a topic you already
 * know proves nothing, the point is to find out where the understanding is thin.
 */
async function renderPicker(root) {
  root.innerHTML = `<div class="skel" style="height:50vh"></div>`;
  const user = store.get().user;
  const subjects = await listSubjects();
  const perSubject = await Promise.all(subjects.map(s => listNodes(s.id)));
  const nodes = perSubject.flat();
  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const mastery = await getMastery(user.id).catch(() => []);
  const weak = rankWeakSpots(mastery.filter(m => nodesById.has(m.node_id)), nodesById).slice(0, 6);
  const weakIds = new Set(weak.map(w => w.node_id));

  const card = (id, title, meta, status) => `
    <a href="#/feynman/${id}" class="card card-pad" style="text-decoration:none;display:flex;align-items:center;gap:12px">
      <span class="mastery-dot ${status || 'unknown'}"></span>
      <span style="flex:1;min-width:0">
        <strong style="color:var(--ink);display:block">${title}</strong>
        <span style="font-size:13px;color:var(--ink-soft)">${meta}</span>
      </span>
      ${icon('arrowRight')}
    </a>`;

  root.innerHTML = `
    <div class="topbar"><div>
      <div class="eyebrow">${t('feynman_mode')}</div>
      <h1>${t('feynman_pick_title')}</h1>
    </div></div>
    <p style="color:var(--ink-soft);max-width:60ch;margin-bottom:22px">${t('feynman_pick_sub')}</p>

    ${weak.length ? `
      <h3 style="margin-bottom:12px">${t('feynman_pick_weak')}</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${weak.map(w => card(w.node_id, titleFor(w.node), `${w.score}% ${t('mod_mastered')}`, w.status)).join('')}
      </div>` : ''}

    <h3 style="margin-bottom:12px">${t('feynman_pick_all')}</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${nodes.filter(n => !weakIds.has(n.id)).map(n => card(n.id, titleFor(n), n.code, 'unknown')).join('')}
    </div>`;
}

export async function renderFeynman(root, { nodeId } = {}) {
  if (!nodeId) return renderPicker(root);
  const node = await getNode(nodeId);
  if (!node) return renderPicker(root);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let transcript = '';

  root.innerHTML = `
    <div class="topbar"><div><div class="eyebrow">${t('feynman_mode')}</div><h1>${t('feynman_explain')}: ${titleFor(node)}</h1></div></div>
    <div class="tutor-stage">
      <div class="card card-pad" style="max-width:680px;width:100%;margin:0 auto">
        <p style="color:var(--ink-soft)">Расскажи тему своими словами — вслух или текстом. Мы честно покажем, что понято, а что нет.</p>
        <div style="display:flex;gap:10px;margin:16px 0">
          <button class="btn ${SR ? 'btn-primary' : 'btn-ghost'}" id="mic-btn" ${SR ? '' : 'disabled'}>${icon('mic')}${SR ? t('feynman_speak') : 'Микрофон недоступен'}</button>
        </div>
        <textarea class="input" id="transcript-box" placeholder="Текст объяснения появится здесь — или впиши сам, если микрофон недоступен." style="min-height:180px"></textarea>
        <button class="btn btn-primary" id="analyze-btn" style="margin-top:14px">${t('feynman_analyze')}</button>
        <div id="map-result" style="margin-top:20px"></div>
      </div>
    </div>`;

  const box = document.getElementById('transcript-box');
  const micBtn = document.getElementById('mic-btn');

  if (SR) {
    const rec = new SR();
    rec.lang = localeTag();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
      box.value = text.trim();
    };
    // icon() returns an HTML *string*, so this has to go through innerHTML —
    // append() would dump the raw <span><svg>… markup on screen as text.
    rec.onend = () => { recognizing = false; micBtn.innerHTML = `${icon('mic')}${t('feynman_speak')}`; };
    micBtn.addEventListener('click', () => {
      if (recognizing) { rec.stop(); return; }
      try { rec.start(); recognizing = true; micBtn.innerHTML = `${icon('mic')}${t('feynman_stop')}`; }
      catch { /* already started */ }
    });
  }

  document.getElementById('analyze-btn').addEventListener('click', async () => {
    const text = box.value.trim();
    const resultEl = document.getElementById('map-result');
    if (!text) { resultEl.innerHTML = `<p style="color:var(--gap)">Сначала расскажи тему хотя бы в паре предложений.</p>`; return; }
    resultEl.innerHTML = `<div class="card card-pad"><div class="skel" style="height:16px;width:50%"></div><div class="skel" style="height:60px;margin-top:10px"></div></div>`;

    const { callGemini } = await import('../ai.js');
    const map = await callGemini('feynman_map', { topic: titleFor(node), transcript: text });

    resultEl.innerHTML = `
      <div class="card card-pad">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <span class="num" style="font-size:var(--t-34)">${map.coverage_percent}%</span>
          <span style="color:var(--ink-soft)">карта понимания темы</span>
          ${aiBadge(map)}
        </div>
        <div class="progress" style="margin-top:10px"><span style="width:${map.coverage_percent}%"></span></div>
        <div class="grid-2" style="margin-top:18px">
          <div>
            <strong style="color:var(--root);font-size:13px">Объяснено верно</strong>
            <ul style="margin-top:8px;padding-left:18px">${(map.correct_points || []).map(p => `<li>${p}</li>`).join('') || '<li style="color:var(--ink-soft)">пока пусто</li>'}</ul>
          </div>
          <div>
            <strong style="color:var(--gap);font-size:13px">Пропущено</strong>
            <ul style="margin-top:8px;padding-left:18px">${(map.missing_points || []).map(p => `<li>${p}</li>`).join('') || '<li style="color:var(--ink-soft)">ничего не пропущено</li>'}</ul>
          </div>
        </div>
        ${map.confusions?.length ? `<div style="margin-top:16px"><strong style="color:var(--steppe);font-size:13px">Путаница в логике</strong><ul style="margin-top:8px;padding-left:18px">${map.confusions.map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}
      </div>`;
  });
}
