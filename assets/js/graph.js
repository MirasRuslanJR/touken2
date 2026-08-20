// graph.js — the knowledge graph engine: layout, render, traversal, root-cause search.
// No dependencies. Works on plain {id, code, grade} nodes (title_ru/kk/en, or a plain
// `title` for lightweight fixtures — see titleFor) and {from, to} edges where `from`
// is the prerequisite and `to` is the dependent.
import { titleFor } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/** Layered layout: one layer per distinct grade, nodes spread evenly along x. */
export function layoutGraph(nodes, edges, { width = 1000, height = 620 } = {}) {
  const grades = [...new Set(nodes.map(n => n.grade))].sort((a, b) => a - b);
  const layerOf = new Map(grades.map((g, i) => [g, i]));
  const byLayer = new Map();
  for (const n of nodes) {
    const l = layerOf.get(n.grade);
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(n);
  }
  const positions = new Map();
  const padX = 60, padY = 56;
  const layerCount = grades.length || 1;
  for (const [layer, list] of byLayer) {
    list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const y = layerCount > 1 ? padY + (layer * (height - 2 * padY)) / (layerCount - 1) : height / 2;
    list.forEach((n, i) => {
      const x = list.length > 1 ? padX + (i * (width - 2 * padX)) / (list.length - 1) : width / 2;
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

/**
 * Render an interactive knowledge graph into `container` (a .graph-wrap element).
 * data: { nodes: [{id,code,title,grade,order_index}], edges: [{from,to}], mastery: Map(id->status) }
 * opts: { onNodeClick(id), highlightRoot: id|null, width, height }
 */
export function renderGraph(container, data, opts = {}) {
  container.innerHTML = '';
  const width = opts.width || 1000, height = opts.height || 620;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}` });
  const viewport = el('g', { class: 'graph-viewport' });
  svg.appendChild(viewport);
  container.appendChild(svg);

  const positions = layoutGraph(data.nodes, data.edges, { width, height });
  const statusOf = (id) => data.mastery?.get(id)?.status || 'unknown';

  const edgeLayer = el('g');
  const nodeLayer = el('g');
  viewport.appendChild(edgeLayer);
  viewport.appendChild(nodeLayer);

  const edgeEls = new Map();
  data.edges.forEach((e) => {
    const p1 = positions.get(e.from), p2 = positions.get(e.to);
    if (!p1 || !p2) return;
    const mx = (p1.x + p2.x) / 2;
    const path = el('path', {
      d: `M ${p1.x} ${p1.y} C ${p1.x} ${mx > 0 ? (p1.y + p2.y) / 2 : p1.y}, ${p2.x} ${(p1.y + p2.y) / 2}, ${p2.x} ${p2.y}`,
      class: 'graph-edge'
    });
    edgeLayer.appendChild(path);
    edgeEls.set(`${e.from}>${e.to}`, path);
  });

  const nodeEls = new Map();
  data.nodes.forEach((n, i) => {
    const p = positions.get(n.id);
    if (!p) return;
    const status = statusOf(n.id);
    const title = titleFor(n);
    const g = el('g', { class: 'graph-node-group', tabindex: '0', role: 'button', 'aria-label': `${title} — узел ${n.code}` });
    g.style.animationDelay = `${i * 24}ms`;
    const glow = el('circle', { cx: p.x, cy: p.y, r: 14, class: 'graph-node-glow' });
    const circle = el('circle', { cx: p.x, cy: p.y, r: 15, class: `graph-node ${status}` });
    const code = el('text', { x: p.x, y: p.y - 21, class: 'graph-code' });
    code.textContent = n.code;
    const label = el('text', { x: p.x, y: p.y + 30, class: 'graph-label' });
    label.textContent = title.length > 16 ? title.slice(0, 15) + '…' : title;
    g.append(glow, circle, code, label);
    const activate = () => opts.onNodeClick && opts.onNodeClick(n.id);
    g.addEventListener('click', activate);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } });
    nodeLayer.appendChild(g);
    nodeEls.set(n.id, { g, circle, x: p.x, y: p.y });
  });

  if (opts.highlightRoot && nodeEls.has(opts.highlightRoot)) {
    const target = nodeEls.get(opts.highlightRoot);
    const arrow = el('path', {
      d: `M ${target.x} ${target.y - 70} L ${target.x} ${target.y - 24}`,
      class: 'graph-root-arrow show', 'marker-end': 'url(#tamyr-arrowhead)'
    });
    const defs = el('defs');
    defs.innerHTML = `<marker id="tamyr-arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--gap)"/></marker>`;
    svg.insertBefore(defs, viewport);
    viewport.appendChild(arrow);
  }

  // pan & zoom
  let scale = 1, tx = 0, ty = 0, dragging = false, lastX = 0, lastY = 0;
  const apply = () => { viewport.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`); };
  container.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; container.setPointerCapture(e.pointerId); });
  container.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tx += (e.clientX - lastX); ty += (e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY; apply();
  });
  container.addEventListener('pointerup', () => dragging = false);
  container.addEventListener('pointerleave', () => dragging = false);
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    scale = Math.min(2.4, Math.max(0.5, scale + delta));
    apply();
  }, { passive: false });

  const controls = document.createElement('div');
  controls.className = 'graph-controls';
  controls.innerHTML = `
    <button type="button" data-act="in" aria-label="Приблизить">+</button>
    <button type="button" data-act="out" aria-label="Отдалить">−</button>
    <button type="button" data-act="reset" aria-label="Сбросить вид">⟲</button>`;
  controls.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'in') scale = Math.min(2.4, scale + 0.2);
    if (act === 'out') scale = Math.max(0.5, scale - 0.2);
    if (act === 'reset') { scale = 1; tx = 0; ty = 0; }
    apply();
  });
  container.appendChild(controls);

  const legend = document.createElement('div');
  legend.className = 'graph-legend';
  legend.innerHTML = `
    <span><i style="background:var(--gap)"></i>пробел</span>
    <span><i style="background:var(--steppe)"></i>в процессе</span>
    <span><i style="background:var(--root-glow)"></i>освоено</span>`;
  container.appendChild(legend);

  return {
    svg, nodeEls, edgeEls,
    setStatus(nodeId, status) {
      const entry = nodeEls.get(nodeId);
      if (!entry) return;
      entry.circle.classList.remove('gap', 'learning', 'mastered', 'unknown');
      entry.circle.classList.add(status);
    },
    pulse(nodeId) {
      const entry = nodeEls.get(nodeId);
      if (!entry) return;
      entry.g.classList.remove('pulse'); void entry.g.offsetWidth; entry.g.classList.add('pulse');
    },
    /** Light the wave: node -> its dependents -> their dependents, upward through the graph. */
    async lightWaveUp(startId, { onNode } = {}) {
      const byPrereq = new Map();
      data.edges.forEach(e => { if (!byPrereq.has(e.from)) byPrereq.set(e.from, []); byPrereq.get(e.from).push(e.to); });
      let frontier = [startId];
      const seen = new Set(frontier);
      while (frontier.length) {
        const next = [];
        for (const id of frontier) {
          this.setStatus(id, 'mastered');
          this.pulse(id);
          onNode && onNode(id);
          for (const dep of (byPrereq.get(id) || [])) {
            const key = `${id}>${dep}`;
            edgeEls.get(key)?.classList.add('lit');
            if (!seen.has(dep)) { seen.add(dep); next.push(dep); }
          }
        }
        await new Promise(r => setTimeout(r, 480));
        frontier = next;
      }
    }
  };
}

/**
 * Find the "true root" of an error: walk prerequisite edges downward from a
 * struggling node, returning the deepest unmastered ancestor. This is the
 * core diagnostic idea of the product — treat the root, not the symptom.
 *
 * @param nodeId - the node the student is visibly failing
 * @param edges - [{from: prerequisiteId, to: dependentId}]
 * @param masteryMap - Map(nodeId -> {score, status})
 * @param threshold - score below which a node counts as a gap (default 60)
 */
export function findRootGap(nodeId, edges, masteryMap, threshold = 60) {
  const prereqsOf = new Map();
  edges.forEach(e => { if (!prereqsOf.has(e.to)) prereqsOf.set(e.to, []); prereqsOf.get(e.to).push(e.from); });

  const isGap = (id) => {
    const m = masteryMap.get(id);
    return !m || m.status === 'gap' || m.status === 'unknown' || m.score < threshold;
  };

  let deepest = nodeId;
  const visited = new Set();
  const stack = [nodeId];
  while (stack.length) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const prereqs = prereqsOf.get(cur) || [];
    const gapPrereqs = prereqs.filter(isGap);
    if (gapPrereqs.length === 0) {
      // cur has no unmastered prerequisites — cur itself is a candidate root
      if (isGap(cur)) deepest = cur;
    } else {
      gapPrereqs.forEach(p => stack.push(p));
      deepest = gapPrereqs[0]; // provisional; refined as we go deeper
    }
  }
  return deepest;
}

/** All ancestors (prerequisites, transitively) of a node — used to scope diagnostics. */
export function ancestorsOf(nodeId, edges) {
  const prereqsOf = new Map();
  edges.forEach(e => { if (!prereqsOf.has(e.to)) prereqsOf.set(e.to, []); prereqsOf.get(e.to).push(e.from); });
  const seen = new Set();
  const stack = [nodeId];
  while (stack.length) {
    const cur = stack.pop();
    for (const p of (prereqsOf.get(cur) || [])) {
      if (!seen.has(p)) { seen.add(p); stack.push(p); }
    }
  }
  return seen;
}
