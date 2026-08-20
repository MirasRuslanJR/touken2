// views/feynman.js — killer feature #5, режим Фейнмана: the student explains the
// topic out loud, Gemini compares the transcript against the topic's key ideas.
import { getNode } from '../db.js';
import { titleFor } from '../i18n.js';
import { icon } from '../ui.js';

export async function renderFeynman(root, { nodeId }) {
  const node = await getNode(nodeId);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let transcript = '';

  root.innerHTML = `
    <div class="topbar"><div><div class="eyebrow">Режим Фейнмана</div><h1>Объясни: ${titleFor(node)}</h1></div></div>
    <div class="card card-pad" style="max-width:680px">
      <p style="color:var(--ink-soft)">Расскажи тему своими словами — вслух или текстом. Мы честно покажем, что понято, а что нет.</p>
      <div style="display:flex;gap:10px;margin:16px 0">
        <button class="btn ${SR ? 'btn-primary' : 'btn-ghost'}" id="mic-btn" ${SR ? '' : 'disabled'}>${icon('mic')}${SR ? 'Говорить' : 'Микрофон недоступен'}</button>
      </div>
      <textarea class="input" id="transcript-box" placeholder="Текст объяснения появится здесь — или впиши сам, если микрофон недоступен." style="min-height:140px"></textarea>
      <button class="btn btn-primary" id="analyze-btn" style="margin-top:14px">Проверить понимание</button>
    </div>
    <div id="map-result" style="max-width:680px;margin-top:20px"></div>`;

  const box = document.getElementById('transcript-box');
  const micBtn = document.getElementById('mic-btn');

  if (SR) {
    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
      box.value = text.trim();
    };
    rec.onend = () => { recognizing = false; micBtn.textContent = ''; micBtn.append(icon('mic'), document.createTextNode('Говорить')); };
    micBtn.addEventListener('click', () => {
      if (recognizing) { rec.stop(); return; }
      try { rec.start(); recognizing = true; micBtn.textContent = ''; micBtn.append(icon('mic'), document.createTextNode('Остановить')); }
      catch { /* already started */ }
    });
  }

  document.getElementById('analyze-btn').addEventListener('click', async () => {
    const text = box.value.trim();
    const resultEl = document.getElementById('map-result');
    if (!text) { resultEl.innerHTML = `<p style="color:var(--gap)">Сначала расскажи тему хотя бы в паре предложений.</p>`; return; }
    resultEl.innerHTML = `<div class="card card-pad"><div class="skel" style="height:16px;width:50%"></div><div class="skel" style="height:60px;margin-top:10px"></div></div>`;

    const { callGemini } = await import('../ai.js');
    let map;
    try { map = await callGemini('feynman_map', { topic: titleFor(node), transcript: text }); }
    catch { map = { coverage_percent: 0, correct_points: [], missing_points: ['Не удалось проанализировать офлайн'], confusions: [] }; }

    resultEl.innerHTML = `
      <div class="card card-pad">
        <div style="display:flex;align-items:center;gap:14px">
          <span class="num" style="font-size:var(--t-34)">${map.coverage_percent}%</span>
          <span style="color:var(--ink-soft)">карта понимания темы</span>
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
