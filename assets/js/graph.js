// graph.js — the knowledge graph engine: layout, render, traversal, root-cause search.
// No dependencies. Works on plain {id, code, grade} nodes (title_ru/kk/en, or a plain
// `title` for lightweight fixtures — see titleFor) and {from, to} edges where `from`
// is the prerequisite and `to` is the dependent.
import { titleFor, t } from './i18n.js';

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

/**
 * Root-system layout. Two decisions carry the whole metaphor:
 *
 * 1. Depth is inverted relative to a normal dependency diagram. The newest
 *    grade sits just under the soil line and every earlier grade hangs *below*
 *    it, so the further back a topic was taught the deeper it is buried. That
 *    is what makes "спускаемся вниз по графу к корню" a literal description of
 *    what the user watches happen, instead of a metaphor fighting the picture.
 *
 * 2. Nodes are ordered by barycenter — each one drifts toward the average x of
 *    the topics that grow out of it — so a root and its offshoots stay in one
 *    bundle. Evenly spaced rows in fixed order read as an org chart; bundles
 *    that fan out and rejoin read as a root system.
 */
export function layoutGraph(nodes, edges, { width = 1000, height = 620, soilY = 0, narrow = false } = {}) {
  // Descending: highest grade becomes layer 0, nearest the surface.
  const grades = [...new Set(nodes.map(n => n.grade))].sort((a, b) => b - a);
  const layerOf = new Map(grades.map((g, i) => [g, i]));
  const byLayer = new Map();
  for (const n of nodes) {
    const l = layerOf.get(n.grade);
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(n);
  }

  // Who grows out of whom: dependents live one layer *up* (shallower).
  const dependentsOf = new Map();
  edges.forEach(e => { if (!dependentsOf.has(e.from)) dependentsOf.set(e.from, []); dependentsOf.get(e.from).push(e.to); });

  const layerKeys = [...byLayer.keys()].sort((a, b) => a - b);
  layerKeys.forEach(l => byLayer.get(l).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));

  // Generous side padding: labels are centred under their node, so a node
  // parked at the very edge gets its label clipped by the viewport.
  const padX = 92;
  const slotX = (list, i) => list.length > 1 ? padX + (i * (width - 2 * padX)) / (list.length - 1) : width / 2;

  // Seed x from the initial order, then relax downward a few times so each
  // deeper layer settles under the topics it feeds.
  const xOf = new Map();
  layerKeys.forEach(l => byLayer.get(l).forEach((n, i) => xOf.set(n.id, slotX(byLayer.get(l), i))));

  for (let pass = 0; pass < 4; pass++) {
    for (const l of layerKeys.slice(1)) {
      const list = byLayer.get(l);
      const pull = new Map();
      for (const n of list) {
        const deps = (dependentsOf.get(n.id) || []).filter(id => xOf.has(id));
        if (deps.length) pull.set(n.id, deps.reduce((s, id) => s + xOf.get(id), 0) / deps.length);
      }
      // Only reorder — never free-place — so nodes keep even spacing and can't
      // pile up on top of each other in a dense layer.
      const ordered = [...list].sort((a, b) => (pull.get(a.id) ?? xOf.get(a.id)) - (pull.get(b.id) ?? xOf.get(b.id)));
      byLayer.set(l, ordered);
      ordered.forEach((n, i) => xOf.set(n.id, slotX(ordered, i)));
    }
  }

  const positions = new Map();
  const layerCount = layerKeys.length || 1;
  // The first layer needs real clearance below the soil, otherwise the fibers
  // leaving the trunk have almost no vertical room and fan out as near-horizontal
  // wires across the whole width instead of descending like roots.
  const top = soilY + 132;
  // Bottom clearance covers the deepest row's labels *and* the legend chip in
  // the corner. Narrow screens stack labels on three lines, so they need more.
  const usable = Math.max(120, height - top - (narrow ? 165 : 86));
  for (const l of layerKeys) {
    const list = byLayer.get(l);
    const y = layerCount > 1 ? top + (l * usable) / (layerCount - 1) : top + usable / 2;
    const rowSpacing = list.length > 1 ? (width - 2 * padX) / (list.length - 1) : width - 2 * padX;
    list.forEach((n, idx) => {
      // Deterministic wobble so a layer never sits on a ruler-straight line —
      // real roots never grow at a perfectly even depth. `layer` (not the
      // wobbled y) is what edge drawing uses, so this can't create lines
      // running through nodes.
      const h = strHash(n.id);
      const wobbleY = ((h % 19) - 9) * 1.15;
      const wobbleX = (((h >> 6) % 13) - 6) * 1.1;
      // idx = position within its own row; label placement uses it to stagger
      // neighbours so their text doesn't collide on a narrow screen.
      positions.set(n.id, { x: xOf.get(n.id) + wobbleX, y: y + wobbleY, rowSpacing, layer: l, idx });
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
  // The SVG scales its whole viewBox down to the container width, and text
  // scales with it. On a 390px phone a 1000-unit viewBox shrinks by ~0.36, so
  // a 9px label lands on screen at 3px — present but unreadable. Narrow the
  // viewBox on small screens and size the type from the measured scale below.
  const boxW = container.clientWidth || 900;
  const narrow = boxW < 560;
  const width = opts.width || (narrow ? 640 : 1000);
  const height = opts.height || 620;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}` });
  const viewport = el('g', { class: 'graph-viewport' });
  svg.appendChild(viewport);
  container.appendChild(svg);

  const compactMode = !!opts.compact;
  const soilY = compactMode ? 26 : 40;
  const positions = layoutGraph(data.nodes, data.edges, { width, height, soilY, narrow });
  const statusOf = (id) => data.mastery?.get(id)?.status || 'unknown';
  const weights = computeWeights(data.nodes, data.edges);
  const maxWeight = Math.max(1, ...data.nodes.map(n => weights.get(n.id) || 0));

  const soilLayer = el('g', { class: 'graph-soil-layer' });
  const trunkLayer = el('g');
  const hairLayer = el('g');
  const edgeLayer = el('g');
  const nodeLayer = el('g');
  viewport.append(soilLayer, trunkLayer, hairLayer, edgeLayer, nodeLayer);

  // Same half-width curve nodes use for their own radius, just scaled down —
  // so a ribbon visually grows out of its node instead of meeting it at a
  // mismatched width.
  const halfWidthFor = (id) => 0.9 + ((weights.get(id) || 0) / maxWeight) * 5.6;

  // ---- soil surface + trunk -------------------------------------------------
  // Without these the picture is just a layered graph. A ground line with a
  // stem breaking through it is the single element that makes everything
  // hanging below it read as one root system rather than a network of dots.
  const shallow = [...positions.entries()].filter(([, p]) => p.layer === 0).map(([, p]) => p);
  const trunkX = shallow.length ? shallow.reduce((s, p) => s + p.x, 0) / shallow.length : width / 2;

  soilLayer.append(
    el('rect', { x: 0, y: 0, width, height: soilY, class: 'graph-sky' }),
    el('path', {
      // A softly undulating ground line, not a ruler edge.
      d: `M 0 ${soilY} C ${width * 0.25} ${soilY - 6}, ${width * 0.55} ${soilY + 5}, ${width} ${soilY - 2} L ${width} 0 L 0 0 Z`,
      class: 'graph-soil',
    }),
  );

  if (!compactMode) {
    const stemTop = Math.max(2, soilY - 34);
    trunkLayer.append(
      el('path', { d: taperedRibbon({ x: trunkX, y: stemTop }, { x: trunkX - 2, y: soilY }, { x: trunkX + 2, y: soilY + 20 }, { x: trunkX, y: soilY + 46 }, 3.5, 9), class: 'graph-trunk' }),
      el('path', { d: `M ${trunkX} ${stemTop + 8} C ${trunkX - 16} ${stemTop - 2}, ${trunkX - 20} ${stemTop + 6}, ${trunkX - 9} ${stemTop + 12}`, class: 'graph-leaf' }),
      el('path', { d: `M ${trunkX} ${stemTop + 12} C ${trunkX + 17} ${stemTop + 2}, ${trunkX + 21} ${stemTop + 10}, ${trunkX + 10} ${stemTop + 16}`, class: 'graph-leaf' }),
    );
  }

  // Everything in the shallowest layer hangs off the trunk, so the system has
  // one origin instead of a row of unconnected starting points.
  shallow.forEach((p) => {
    const seed = strHash(`trunk${p.x.toFixed(1)}`);
    const base = { x: trunkX, y: soilY + (compactMode ? 12 : 46) };
    const span = p.y - base.y;
    // Leave the trunk going almost straight down and only swing outward in the
    // lower half. Splitting sideways immediately is what made these read as
    // cables strung across the picture rather than roots pushing into soil.
    const c1 = { x: trunkX + ((seed % 9) - 4), y: base.y + span * 0.42 };
    const c2 = { x: p.x + (trunkX - p.x) * 0.22, y: base.y + span * 0.78 };
    trunkLayer.appendChild(el('path', {
      d: taperedRibbon(base, c1, c2, { x: p.x, y: p.y }, compactMode ? 3 : 6, 2.4),
      class: 'graph-edge graph-edge-trunk', style: '--edge-o:.55',
    }));
  });

  // A real root is thickest where it leaves the trunk and thins as it drives
  // deeper, so fiber width follows *depth*, not dependent-count. Importance
  // still drives node size, which keeps the "many topics rest on this one"
  // signal without inverting the shape of the plant.
  const maxLayer = Math.max(1, ...[...positions.values()].map(p => p.layer));
  const fiberWidth = (layer) => {
    const nearSurface = 1 - layer / maxLayer;      // 1 at the trunk, 0 at the tips
    return (compactMode ? 1.0 : 1.3) + nearSurface * (compactMode ? 3.0 : 4.6);
  };

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
      // Keep each end's x близко to its own node for the first stretch, so the
      // fiber leaves vertically and only crosses sideways in the middle. A
      // symmetric arc between two distant nodes sweeps horizontally across the
      // whole picture and reads as cabling, not as a root.
      const midVariance = ((Math.abs(seed) % 27) - 13);
      const shallowFirst = p1.y < p2.y;
      const near = shallowFirst ? p1.y : p2.y, far = shallowFirst ? p2.y : p1.y;
      const a = near + (far - near) * 0.38 + midVariance;
      const b = near + (far - near) * 0.68 + midVariance;
      c1y = shallowFirst ? a : b;
      c2y = shallowFirst ? b : a;
      c1x = p1.x + (p2.x - p1.x) * 0.16 + jitter1 * 0.5;
      c2x = p2.x + (p1.x - p2.x) * 0.16 + jitter2 * 0.5;
    }
    // A fiber that reaches right across the picture is a real dependency, but
    // at full weight a handful of them turn the whole root into spaghetti.
    // Let long spans thin out and recede so the local bundles stay readable.
    const span = Math.abs(p2.x - p1.x) / width;
    const recede = 1 - Math.min(0.62, span * 0.85);
    const path = el('path', {
      d: taperedRibbon(p1, { x: c1x, y: c1y }, { x: c2x, y: c2y }, p2,
        fiberWidth(p1.layer) * recede, fiberWidth(p2.layer) * recede),
      class: 'graph-edge',
      style: `--edge-o:${((0.3 + importance * 0.45) * recede).toFixed(2)}`,
    });
    edgeLayer.appendChild(path);
    edgeEls.set(`${e.from}>${e.to}`, path);
  });

  // ---- root hairs -----------------------------------------------------------
  // Terminal nodes (nothing grows out of them) get two or three fine wisps
  // trailing further down. They carry no data — they exist because a root tip
  // that just stops dead reads as a diagram, and one that frays reads as alive.
  if (!compactMode) {
    const hasDependents = new Set(data.edges.map(e => e.from));
    data.nodes.forEach((n) => {
      const p = positions.get(n.id);
      if (!p || hasDependents.has(n.id)) return;
      const seed = strHash(`hair${n.id}`);
      const count = 2 + (Math.abs(seed) % 2);
      for (let i = 0; i < count; i++) {
        const s = strHash(`${n.id}h${i}`);
        const dir = (i % 2 === 0 ? 1 : -1);
        const spread = 10 + (Math.abs(s) % 22);
        const len = 18 + (Math.abs(s >> 3) % 26);
        hairLayer.appendChild(el('path', {
          d: taperedRibbon(
            { x: p.x, y: p.y },
            { x: p.x + dir * spread * 0.4, y: p.y + len * 0.45 },
            { x: p.x + dir * spread, y: p.y + len * 0.8 },
            { x: p.x + dir * spread * 1.25, y: p.y + len }, 1.6, 0.15),
          class: 'graph-hair',
        }));
      }
    });
  }

  // Size labels from how much the viewBox is actually being squeezed, so text
  // lands at a readable pixel size on any screen instead of a fixed SVG size
  // that only happens to work at desktop width.
  const dispScale = Math.max(0.15, boxW / width);
  const labelPx = Math.min(24, Math.max(9, Math.round(10.5 / dispScale)));
  svg.style.setProperty('--graph-label-size', `${labelPx}px`);
  svg.style.setProperty('--graph-code-size', `${Math.max(8, Math.round(labelPx * 0.8))}px`);

  const compact = compactMode;
  const nodeEls = new Map();
  const labelEls = [];
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
      // Spread a row's labels over three lines on a phone. Each line then only
      // has to clear every third neighbour, which triples the horizontal room —
      // without it a row of eight collapses into "Квадратные уТеорКвадрат…".
      const lvl = narrow ? (p.idx % 3) : 0;
      const dy = labelPx * (1.35 + lvl * 1.2);
      if (!narrow) {
        const code = el('text', { x: p.x, y: p.y - r - labelPx * 0.6, class: 'graph-code' });
        code.textContent = n.code;
        g.append(code);
      }
      const room = (p.rowSpacing || 90) * (narrow ? 2.9 : 1);
      const maxChars = Math.max(7, Math.min(22, Math.round(room / (labelPx * 0.58))));
      const label = el('text', { x: p.x, y: p.y + r + dy, class: 'graph-label' });
      label.textContent = title.length > maxChars ? title.slice(0, maxChars - 1) + '…' : title;
      g.append(label);
      labelEls.push(label);
    }
    const activate = () => opts.onNodeClick && opts.onNodeClick(n.id);
    g.addEventListener('click', activate);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } });
    nodeLayer.appendChild(g);
    nodeEls.set(n.id, { g, circle, x: p.x, y: p.y });
  });

  // Labels are centre-anchored, so one on an outermost node hangs half its
  // width past the edge of the viewBox and loses its first letters. Measure the
  // text that actually rendered — an estimate from character count is wrong
  // often enough to still clip — and nudge it back inside.
  labelEls.forEach((label) => {
    let w = 0;
    try { w = label.getBBox().width; } catch { return; }
    if (!w) return;
    const half = w / 2;
    const x = Number(label.getAttribute('x'));
    const clamped = Math.min(width - 4 - half, Math.max(4 + half, x));
    if (clamped !== x) label.setAttribute('x', clamped);
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
      <button type="button" data-act="in" aria-label="${t('g_zoom_in')}">+</button>
      <button type="button" data-act="out" aria-label="${t('g_zoom_out')}">−</button>
      <button type="button" data-act="reset" aria-label="${t('g_reset')}">⟲</button>`;
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
    // The depth note is the one piece of the metaphor a picture can't state on
    // its own: colour is obvious, "further down = taught earlier" is not.
    legend.innerHTML = `
      <span><i style="background:var(--gap)"></i>${t('g_gap')}</span>
      <span><i style="background:var(--steppe)"></i>${t('g_learning')}</span>
      <span><i style="background:var(--root-glow)"></i>${t('g_mastered')}</span>
      <span class="graph-legend-depth">↓ ${t('g_depth')}</span>`;
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
