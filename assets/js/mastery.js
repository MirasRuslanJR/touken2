// mastery.js — mastery scoring, adaptive difficulty, streak tracking.
// Pure functions, no I/O. db.js persists what these compute.

const DAY_MS = 86400000;

/** Recency-weighted mastery update after one attempt. Score in [0,100]. */
export function updateMastery(prev, { isCorrect, difficulty = 3, now = Date.now() }) {
  const prevScore = prev?.score ?? 0;
  const lastSeen = prev?.last_seen_at ? new Date(prev.last_seen_at).getTime() : now;
  const daysSince = Math.max(0, (now - lastSeen) / DAY_MS);
  const decay = Math.min(20, daysSince * 1.5); // knowledge fades ~1.5pt/day, capped
  const decayed = Math.max(0, prevScore - decay);

  const weight = 6 + difficulty * 2.4; // harder correct answers move the needle more
  let next = isCorrect ? decayed + weight : decayed - (weight * 0.8);
  next = Math.max(0, Math.min(100, Math.round(next)));

  let status;
  if (next >= 75) status = 'mastered';
  else if (next >= 35) status = 'learning';
  else status = 'gap';

  return { score: next, status, last_seen_at: new Date(now).toISOString() };
}

/**
 * Adaptive difficulty 1–5: two wrong in a row → step down, three correct in a
 * row → step up. Streaks reset on a change of direction.
 */
export function nextDifficulty(currentDifficulty, recentResults) {
  // recentResults: array of booleans, most recent last
  const last2 = recentResults.slice(-2);
  const last3 = recentResults.slice(-3);
  if (last2.length === 2 && last2.every(r => r === false)) {
    return Math.max(1, currentDifficulty - 1);
  }
  if (last3.length === 3 && last3.every(r => r === true)) {
    return Math.min(5, currentDifficulty + 1);
  }
  return currentDifficulty;
}

/** "Understood or guessed" detector: a correct answer only counts once a follow-up
 * conceptual check also passes. Returns the mastery status to apply. */
export function resolveComprehensionCheck({ answerCorrect, checkCorrect }) {
  if (!answerCorrect) return { counted: false, note: null };
  if (checkCorrect) return { counted: true, note: null };
  return { counted: false, note: 'guessed' };
}

/** Roll up per-node mastery into a 0-100 subject score, weighted by grade recency. */
export function subjectMasteryScore(masteryRows) {
  if (!masteryRows.length) return 0;
  const sum = masteryRows.reduce((acc, m) => acc + (m.score || 0), 0);
  return Math.round(sum / masteryRows.length);
}

/** Priority-ranked weak spots for the student dashboard: lowest score first, gaps before learning. */
export function rankWeakSpots(masteryRows, nodesById) {
  const rank = { gap: 0, learning: 1, unknown: 2, mastered: 3 };
  return masteryRows
    .filter(m => m.status !== 'mastered')
    .sort((a, b) => (rank[a.status] - rank[b.status]) || (a.score - b.score))
    .map(m => ({ ...m, node: nodesById.get(m.node_id) }));
}

/** Class-level heat value for the teacher heatmap: 0-100 average mastery per node. */
export function classHeatmap(students, masteryByStudent, nodeIds) {
  return nodeIds.map(nodeId => {
    const scores = students.map(s => masteryByStudent.get(s.id)?.get(nodeId)?.score ?? null).filter(v => v !== null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { nodeId, avg, coverage: scores.length };
  });
}

/** Risk score for the teacher radar: combines accuracy trend + inactivity. Higher = riskier. */
export function riskScore({ accuracyRecent, accuracyPrior, daysSinceActive, nightShare }) {
  const drop = Math.max(0, (accuracyPrior ?? accuracyRecent) - accuracyRecent);
  const inactivity = Math.min(1, daysSinceActive / 10);
  const night = nightShare ?? 0;
  const score = drop * 0.6 + inactivity * 30 + night * 15;
  if (score >= 28) return 'high';
  if (score >= 12) return 'med';
  return 'low';
}
