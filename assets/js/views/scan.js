// views/scan.js — killer feature #1, "рентген тетради": photograph a handwritten
// solution, Gemini vision finds the exact line that broke, we highlight it in place
// and jump straight to the root node in the graph.
import { getNodeByCode } from '../db.js';
import { titleFor } from '../i18n.js';
import { icon, toast, aiBadge } from '../ui.js';

// A small drawn "handwritten" equation as a data URI, used for the guaranteed offline demo.
const DEMO_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <rect width="640" height="420" fill="#fbfbf7"/>
  ${Array.from({ length: 9 }, (_, i) => `<line x1="24" y1="${48 + i * 40}" x2="616" y2="${48 + i * 40}" stroke="#dfe3d8" stroke-width="1"/>`).join('')}
  <text x="40" y="80" font-family="Comic Sans MS, cursive" font-size="26" fill="#1a2a22">2(x + 3) = 14</text>
  <text x="40" y="120" font-family="Comic Sans MS, cursive" font-size="26" fill="#1a2a22">2x + 6 = 14</text>
  <text x="40" y="160" font-family="Comic Sans MS, cursive" font-size="26" fill="#1a2a22">2x = 14 + 6</text>
  <text x="40" y="200" font-family="Comic Sans MS, cursive" font-size="26" fill="#1a2a22">x = 10</text>
</svg>`)}`;

export async function renderScan(root) {
  root.innerHTML = `
    <div class="topbar"><div><div class="eyebrow">Рентген тетради</div><h1>Сфотографируй решение</h1></div></div>
    <div class="grid-2" style="align-items:start">
      <div>
        <div class="scan-drop" id="drop">
          ${icon('camera')}
          <p style="margin-top:10px;font-weight:600">Перетащи фото или нажми, чтобы выбрать</p>
          <p style="margin-top:4px;color:var(--ink-soft);font-size:13px">Работает и с камерой телефона</p>
          <input type="file" id="file-input" accept="image/*" capture="environment" style="display:none">
        </div>
        <button class="btn btn-ghost btn-sm" id="demo-photo" style="margin-top:12px">Использовать пример без интернета</button>
        <div id="scan-frame-wrap" style="margin-top:16px"></div>
      </div>
      <div id="result-panel">
        <div class="card card-pad">
          <strong style="font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em">Как это работает</strong>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
            <div style="display:flex;gap:12px"><span class="pill mono" style="flex-shrink:0">01</span><p>Загружаешь фото решения от руки — прямо с телефона или примером ниже.</p></div>
            <div style="display:flex;gap:12px"><span class="pill mono" style="flex-shrink:0">02</span><p>ИИ построчно разбирает решение и находит первую строку, где логика сломалась.</p></div>
            <div style="display:flex;gap:12px"><span class="pill mono" style="flex-shrink:0">03</span><p>Показываем не «ты ошибся», а конкретный узел графа знаний, который стоит закрыть.</p></div>
          </div>
        </div>
      </div>
    </div>`;

  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file-input');
  const frameWrap = document.getElementById('scan-frame-wrap');
  const resultPanel = document.getElementById('result-panel');

  drop.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragleave', 'drop'].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.toggle('drag', evt === 'dragover'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  document.getElementById('demo-photo').addEventListener('click', async () => {
    // Gemini's vision input doesn't accept image/svg+xml — rasterize the fixture
    // to PNG first so the offline-demo button also works against a real key.
    const png = await svgDataUrlToPng(DEMO_IMAGE, 640, 420);
    handleImage(png, true);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = () => handleImage(reader.result, false);
    reader.readAsDataURL(file);
  }

  function svgDataUrlToPng(svgDataUrl, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = svgDataUrl;
    });
  }

  async function handleImage(dataUrl, isDemoAsset) {
    frameWrap.innerHTML = `<div class="scan-frame"><img src="${dataUrl}" alt="Загруженное решение"><div class="scan-highlight" id="hl" style="display:none"></div></div>`;
    resultPanel.innerHTML = `<div class="card card-pad"><div class="skel" style="height:16px;width:60%"></div><div class="skel" style="height:14px;width:90%;margin-top:10px"></div><div class="skel" style="height:14px;width:80%;margin-top:8px"></div></div>`;

    const base64 = dataUrl.split(',')[1] || '';
    const mimeType = dataUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';

    const { callGemini } = await import('../ai.js');
    let result;
    try {
      result = await callGemini('scan_notebook', { note: isDemoAsset ? 'demo-fixture' : 'user-photo' }, { images: [{ base64, mimeType }] });
    } catch {
      toast('Не удалось распознать — используем заготовленный пример', 'gap');
      result = null;
    }
    if (!result) return;

    renderResult(result);
  }

  async function renderResult(result) {
    const total = result.recognized_steps?.length || 4;
    const errIdx = Math.max(0, (result.error_line || 1) - 1);
    const hl = document.getElementById('hl');
    if (hl) {
      hl.style.display = 'block';
      const topPct = (errIdx / total) * 100;
      hl.style.top = `${8 + topPct * 0.82}%`;
      hl.style.left = '4%';
      hl.style.width = '80%';
      hl.style.height = `${82 / total}%`;
    }

    let rootNode = null;
    if (result.root_node_code) { try { rootNode = await getNodeByCode(result.root_node_code); } catch {} }

    resultPanel.innerHTML = `
      <div class="card card-pad">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="pill pill-gap">Строка ${result.error_line} · ${result.error_type}</span>
          ${aiBadge(result)}
        </div>
        <p style="margin-top:12px;font-size:var(--t-18);line-height:1.6">${result.what_happened}</p>
        <div class="card card-pad" style="margin-top:14px;background:var(--paper)">
          <strong style="font-size:13px;color:var(--ink-soft)">Подсказка</strong>
          <p style="margin-top:6px">${result.hint}</p>
        </div>
        <ol style="margin-top:16px;padding-left:20px;color:var(--ink-soft);font-size:14px">
          ${(result.recognized_steps || []).map(s => `<li style="${s.line === result.error_line ? 'color:var(--gap);font-weight:700' : ''}">${s.content}</li>`).join('')}
        </ol>
        ${rootNode ? `<a class="btn btn-primary" style="margin-top:16px" href="#/task/${rootNode.id}">Закрыть корень: ${titleFor(rootNode)}</a>` : ''}
      </div>`;
  }
}
