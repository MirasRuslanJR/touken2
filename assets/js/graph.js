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

function strHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Build a closed, filled ribbon that tapers from half-width w1 at S to w2 at
 * E along a cubic bezier through C1/C2 — an actual root fiber shape, not a
 * uniform-width wire. A single stroked line, however cleverly colored, still
 * reads as a circuit diagram; a shape that's fat at the trunk end and thins
 * to a hair by the tip is what makes it read as a root.
 */
function taperedRibbon(S, C1, C2, E, w1, w2) {
  const dx = E.x - S.x, dy = E.y - S.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // unit perpendicular to the S->E chord
  const off = (pt, w, s) => ({ x: pt.x + nx * w * s, y: pt.y + ny * w * s });
  const top = [off(S, w1, 1), off(C1, w1, 1), off(C2, w2, 1), off(E, w2, 1)];
  const bot = [off(E, w2, -1), off(C2, w2, -1), off(C1, w1, -1), off(S, w1, -1)];
  return `M ${top[0].x} ${top[0].y} C ${top[1].x} ${top[1].y}, ${top[2].x} ${top[2].y}, ${top[3].x} ${top[3].y} `
    + `L ${bot[0].x} ${bot[0].y} C ${bot[1].x} ${bot[1].y}, ${bot[2].x} ${bot[2].y}, ${bot[3].x} ${bot[3].y} Z`;
}

/**
 * How much of the tree grows out of each node — the count of everything that
 * transitively depends on it. This is the "root thickness" signal: a node
 * many other topics build on is a thick taproot; a node nothing builds on is
 * a hair-thin root tip. Used to taper both node size and edge width so the
 * graph reads as one organic root system instead of a uniform tech diagram.
 */
function computeWeights(nodes, edges) {
  const depsOf = new Map();
  edges.forEach(e => { if (!depsOf.has(e.from)) depsOf.set(e.from, []); depsOf.get(e.from).push(e.to); });
  const memo = new Map();
  function weightOf(id, trail) {
    if (memo.has(id)) return memo.get(id);
    if (trail.has(id)) return 0; // guard against accidental cycles in the data
    trail.add(id);
    let w = 0;
    for (const dep of (depsOf.get(id) || [])) w += 1 + weightOf(dep, trail);
    memo.set(id, w);
    return w;
  }
  nodes.forEach(n => weightOf(n.id, new Set()));
  return memo;
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
    // Available horizontal room per node in this row — used to size labels so
    // neighbours in dense rows don't visually run into each other.
    const rowSpacing = list.length > 1 ? (width - 2 * padX) / (list.length - 1) : width - 2 * padX;
    list.forEach((n, i) => {
      const x = list.length > 1 ? padX + (i * (width - 2 * padX)) / (list.length - 1) : width / 2;
      // A small deterministic vertical wobble per node so rows don't sit on a
      // ruler-straight line — real roots never grow at a perfectly even depth.
      // `layer` (not the wobbled y) is what edge-drawing uses to detect
      // same-row connections, so this can't reintroduce lines-through-nodes.
      const wobble = ((strHash(n.id) % 17) - 8) * 0.9;
      positions.set(n.id, { x, y: y + wobble, rowSpacing, layer });
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
  const weights = computeWeights(data.nodes, data.edges);
  const maxWeight = Math.max(1, ...data.nodes.map(n => weights.get(n.id) || 0));

  const edgeLayer = el('g');
  const nodeLayer = el('g');
  viewport.appendChild(edgeLayer);
  viewport.appendChild(nodeLayer);

  // Same half-width curve nodes use for their own radius, just scaled down —
  // so a ribbon visually grows out of its node instead of meeting it at a
  // mismatched width.
  const halfWidthFor = (id) => 0.9 + ((weights.get(id) || 0) / maxWeight) * 5.6;

  const edgeEls = new Map();
  data.edges.forEach((e) => {
    const p1 = positions.get(e.from), p2 = positions.get(e.to);
    if (!p1 || !p2) return;
    const importance = (weights.get(e.from) || 0) / maxWeight;
    const seed = strHash(`${e.from}>${e.to}`);
    // Small deterministic wobble per edge so curves aren't perfect mirrored
    // arcs — real roots never bend in exactly the same way twice.
    const jitter1 = ((seed % 17) - 8) * 1.8;
    const jitter2 = (((seed >> 5) % 17) - 8) * 1.8;
    let c1x = p1.x + jitter1, c2x = p2.x + jitter2, c1y, c2y;
    if (p1.layer === p2.layer) {
      // Same row: a straight line would run directly through any node sitting
      // between p1 and p2 on that row (real case: ALG-6-01 -> ALG-6-05 skips
      // ALG-6-02..04). Bow the curve below the row, scaled by distance, so it
      // arcs around intermediate nodes instead of cutting through them.
      const bowVariance = 0.8 + (Math.abs(seed) % 40) / 100; // 0.8–1.2
      const bow = Math.min(50, Math.abs(p2.x - p1.x) * 0.2) * bowVariance;
      c1y = p1.y + bow; c2y = p2.y + bow;
    } else {
      const midVariance = ((Math.abs(seed) % 27) - 13); // ±13, breaks the flat symmetric midpoint
      c1y = c2y = (p1.y + p2.y) / 2 + midVariance;
    }
    const w1 = halfWidthFor(e.from), w2 = halfWidthFor(e.to);
    const path = el('path', {
      d: taperedRibbon(p1, { x: c1x, y: c1y }, { x: c2x, y: c2y }, p2, w1, w2),
      class: 'graph-edge',
      style: `--edge-o:${(0.28 + importance * 0.5).toFixed(2)}`,
    });
    edgeLayer.appendChild(path);
    edgeEls.set(`${e.from}>${e.to}`, path);
  });

  const compact = !!opts.compact;
  const nodeEls = new Map();
  data.nodes.forEach((n, i) => {
    const p = positions.get(n.id);
    if (!p) return;
    const status = statusOf(n.id);
    const title = titleFor(n);
    const g = el('g', { class: 'graph-node-group', tabindex: '0', role: 'button', 'aria-label': `${title} — узел ${n.code}` });
    g.style.animationDelay = `${i * 24}ms`;
    const tip = el('title');
    tip.textContent = `${title} · ${n.code}`;
    // Same taper as the edges: a node lots of the tree depends on is a thick
    // root junction, a leaf topic is a thin tip.
    const importance = (weights.get(n.id) || 0) / maxWeight;
    const baseR = compact ? 11 : 15;
    const r = baseR + importance * (compact ? 4 : 7);
    const glow = el('circle', { cx: p.x, cy: p.y, r: r - 1, class: 'graph-node-glow' });
    const circle = el('circle', { cx: p.x, cy: p.y, r, class: `graph-node ${status}` });
    g.append(tip, glow, circle);
    if (!compact) {
      const code = el('text', { x: p.x, y: p.y - r - 6, class: 'graph-code' });
      code.textContent = n.code;
      const label = el('text', { x: p.x, y: p.y + r + 15, class: 'graph-label' });
      // Budget the label to the room actually available in its row so dense
      // rows don't render neighbouring labels running into one another.
      const maxChars = Math.max(6, Math.min(22, Math.round((p.rowSpacing || 90) / 6.2)));
      label.textContent = title.length > maxChars ? title.slice(0, maxChars - 1) + '…' : title;
      g.append(code, label);
    }
    const activate = () => opts.onNodeClick && opts.onNodeClick(n.id);
    g.addEventListener('click', activate);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } });
    nodeLayer.appendChild(g);
    nodeEls.set(n.id, { g, circle, x: p.x, y: p.y });
  });

  // Trace the actual chain the root-cause search walked, root -> symptom, so
  // the causal story is visible in the graph itself, not just stated in text.
  if (Array.isArray(opts.pathNodeIds) && opts.pathNodeIds.length > 1) {
    for (let i = 0; i < opts.pathNodeIds.length - 1; i++) {
      const a = opts.pathNodeIds[i], b = opts.pathNodeIds[i + 1];
      const edge = edgeEls.get(`${b}>${a}`) || edgeEls.get(`${a}>${b}`);
      edge?.classList.add('lit-gap');
    }
    opts.pathNodeIds.forEach(id => nodeEls.get(id)?.g.classList.add('on-path'));
  }

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

  if (!compact) {
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
  }

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
  return findRootGapPath(nodeId, edges, masteryMap, threshold).root;
}

/**
 * Same search as findRootGap, but also reconstructs the actual chain of real
 * edges walked from the symptom down to the root — used to light up the exact
 * causal path in the graph, not just point at the destination.
 * @returns {{ root: string, path: string[] }} path is ordered symptom -> root.
 */
export function findRootGapPath(nodeId, edges, masteryMap, threshold = 60) {
  const prereqsOf = new Map();
  edges.forEach(e => { if (!prereqsOf.has(e.to)) prereqsOf.set(e.to, []); prereqsOf.get(e.to).push(e.from); });

  const isGap = (id) => {
    const m = masteryMap.get(id);
    return !m || m.status === 'gap' || m.status === 'unknown' || m.score < threshold;
  };

  let deepest = nodeId;
  const parentOf = new Map();
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
      gapPrereqs.forEach(p => { if (!parentOf.has(p)) parentOf.set(p, cur); stack.push(p); });
      deepest = gapPrereqs[0]; // provisional; refined as we go deeper
    }
  }

  const path = [deepest];
  let cur = deepest;
  while (parentOf.has(cur)) { cur = parentOf.get(cur); path.push(cur); }
  path.reverse(); // nodeId (symptom) -> ... -> deepest (root)
  return { root: deepest, path };
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
