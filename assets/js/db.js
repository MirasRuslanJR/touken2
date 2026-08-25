// db.js — thin Supabase wrapper. Every other module talks to the backend through here,
// never through a raw supabase-js call, so offline/demo fallbacks live in one place.
//
// IMPORTANT: supabase-js is loaded via a *dynamic* import, done lazily inside supabase()
// and only on the non-demo path. A static top-level `import ... from 'https://esm.sh/...'`
// would be fetched eagerly by the browser the moment this module loads — before isDemo()
// is ever checked — which would break the entire app (including every offline/demo screen)
// on a machine with no network. Keep this import dynamic.
import { CONFIG } from '../../config.js';
import { DEMO } from './demo-data.js';
import { readThrough } from './offline.js';

export const isDemo = () => new URLSearchParams(location.search).get('demo') === '1' || CONFIG.FORCE_DEMO;

let _client = null;
export async function supabase() {
  if (isDemo()) return null;
  if (!_client) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return _client;
}

// ---------- auth ----------
export async function getSession() {
  if (isDemo()) return { user: DEMO.currentUser() };
  const { data } = await (await supabase()).auth.getSession();
  return data.session;
}

export async function signInDemo(role) {
  DEMO.setRole(role);
  // Deliberately does NOT stamp ?demo=1 onto the current URL. Its only caller
  // is the landing page, which navigates to app.html?demo=1 itself — rewriting
  // the landing entry left ?demo=1 in history, so pressing Back after a demo
  // session returned to index.html?demo=1, where isDemo() is true and the real
  // email login refuses to run.
  return DEMO.currentUser();
}

export async function signInEmail(email, password) {
  const { data, error } = await (await supabase()).auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpEmail(email, password, profile) {
  const { data, error } = await (await supabase()).auth.signUp({ email, password });
  if (error) throw error;
  // If email confirmation is required there's no session yet — auth.uid() is
  // null and RLS rejects the insert regardless of what we send. In that case
  // the profile gets created on first real login instead (see main.js).
  if (data.session && data.user) {
    const { error: profileError } = await (await supabase()).from('profiles').insert({ id: data.user.id, role: 'student', full_name: profile.fullName || email.split('@')[0], grade: profile.grade || 9, lang: 'ru' });
    if (profileError) throw profileError;
  }
  return data;
}

export async function signOut() {
  if (isDemo()) { DEMO.clear(); return; }
  await (await supabase()).auth.signOut();
}

/**
 * Fetch the caller's profile row, creating it if this is their first real
 * login after confirming their email (signUpEmail can't create it at signup
 * time — no session yet means auth.uid() is null and RLS rejects the insert).
 * Cached read-through so a returning user can boot the app with no network.
 */
export async function getOrCreateProfile(userId, fallbackName) {
  if (isDemo()) return DEMO.currentUser();
  return readThrough(`profile:${userId}`, async () => {
    const client = await supabase();
    let { data: profile, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!profile) {
      const { data: created, error: createErr } = await client.from('profiles')
        .insert({ id: userId, role: 'student', full_name: fallbackName || 'Ученик', grade: 9, lang: 'ru' })
        .select().single();
      if (createErr) throw createErr;
      profile = created;
    }
    return profile;
  });
}

/** Read-only profile lookup — used by the teacher's single-student screen. */
export async function getProfile(userId) {
  if (isDemo()) return DEMO.findProfile(userId);
  return readThrough(`profile-view:${userId}`, async () => {
    const { data, error } = await (await supabase()).from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  });
}

export async function updateProfile(userId, patch) {
  if (isDemo()) return DEMO.updateProfile(userId, patch);
  const { data, error } = await (await supabase()).from('profiles').update(patch).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

// ---------- reference data ----------
// Reads below go through readThrough(): try the network, cache the result,
// and on failure (offline, flaky connection) serve the last cached copy
// instead of just throwing and leaving the screen blank. Reference data
// barely changes, so a slightly stale cached copy is a fine trade for the
// app actually working with no connection — the whole point of this pass.
export async function listSubjects() {
  if (isDemo()) return DEMO.subjects;
  return readThrough('subjects', async () => {
    const { data, error } = await (await supabase()).from('subjects').select('*');
    if (error) throw error;
    return data;
  });
}

export async function listNodes(subjectId) {
  if (isDemo()) return DEMO.nodes.filter(n => n.subject_id === subjectId);
  return readThrough(`nodes:${subjectId}`, async () => {
    const { data, error } = await (await supabase()).from('nodes').select('*').eq('subject_id', subjectId).order('order_index');
    if (error) throw error;
    return data;
  });
}

export async function listEdges(subjectId) {
  if (isDemo()) return DEMO.edges.filter(e => e.subject_id === subjectId);
  return readThrough(`edges:${subjectId}`, async () => {
    const { data, error } = await (await supabase()).from('edges').select('*').eq('subject_id', subjectId);
    if (error) throw error;
    return data;
  });
}

export async function getNodeByCode(code) {
  if (isDemo()) return DEMO.nodes.find(n => n.code === code);
  return readThrough(`node-by-code:${code}`, async () => {
    const { data, error } = await (await supabase()).from('nodes').select('*').eq('code', code).maybeSingle();
    if (error) throw error;
    return data;
  });
}

export async function getNode(nodeId) {
  if (isDemo()) return DEMO.nodes.find(n => n.id === nodeId);
  return readThrough(`node:${nodeId}`, async () => {
    const { data, error } = await (await supabase()).from('nodes').select('*').eq('id', nodeId).single();
    if (error) throw error;
    return data;
  });
}

export async function listTasks(nodeId) {
  if (isDemo()) return DEMO.tasks.filter(t => t.node_id === nodeId);
  return readThrough(`tasks:${nodeId}`, async () => {
    const { data, error } = await (await supabase()).from('tasks').select('*').eq('node_id', nodeId);
    if (error) throw error;
    return data;
  });
}

/**
 * Which nodes actually have questions behind them. Only 17 of the 52 seeded
 * topics carry tasks, so without this the topic list and the graph both lead
 * into an empty screen two times out of three.
 */
export async function listNodeIdsWithTasks() {
  if (isDemo()) return [...new Set(DEMO.tasks.map(t => t.node_id))];
  return readThrough('nodes-with-tasks', async () => {
    const { data, error } = await (await supabase()).from('tasks').select('node_id');
    if (error) throw error;
    return [...new Set(data.map(r => r.node_id))];
  });
}

// ---------- mastery ----------
export async function getMastery(userId) {
  if (isDemo()) return DEMO.mastery(userId);
  return readThrough(`mastery:${userId}`, async () => {
    const { data, error } = await (await supabase()).from('mastery').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  });
}

export async function upsertMastery(userId, nodeId, patch) {
  if (isDemo()) return DEMO.upsertMastery(userId, nodeId, patch);
  const { error } = await (await supabase()).from('mastery').upsert({ user_id: userId, node_id: nodeId, ...patch });
  if (error) throw error;
}

// ---------- attempts ----------
export async function recordAttempt(row) {
  if (isDemo()) return DEMO.addAttempt(row);
  const { error } = await (await supabase()).from('attempts').insert(row);
  if (error) throw error;
}

export async function listAttempts(userId, limit = 50) {
  if (isDemo()) return DEMO.attempts(userId, limit);
  return readThrough(`attempts:${userId}:${limit}`, async () => {
    const { data, error } = await (await supabase()).from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  });
}

// ---------- diagnostics ----------
export async function saveDiagnostic(row) {
  if (isDemo()) return DEMO.addDiagnostic(row);
  const { data, error } = await (await supabase()).from('diagnostics').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function getDiagnostic(id) {
  if (isDemo()) return DEMO.getDiagnostic(id);
  const { data, error } = await (await supabase()).from('diagnostics').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ---------- goals ----------
export async function saveGoal(row) {
  if (isDemo()) return DEMO.saveGoal(row);
  const { data, error } = await (await supabase()).from('goals').insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function getGoal(userId) {
  if (isDemo()) return DEMO.getGoal(userId);
  return readThrough(`goal:${userId}`, async () => {
    const { data, error } = await (await supabase()).from('goals').select('*').eq('user_id', userId).order('target_date').limit(1).maybeSingle();
    if (error) throw error;
    return data;
  });
}

// ---------- classes (teacher) ----------
export async function listClasses(teacherId) {
  if (isDemo()) return DEMO.classes(teacherId);
  const { data, error } = await (await supabase()).from('classes').select('*').eq('teacher_id', teacherId);
  if (error) throw error;
  return data;
}

export async function getClass(classId) {
  if (isDemo()) return DEMO.classes().find(c => c.id === classId) || null;
  const { data, error } = await (await supabase()).from('classes').select('*').eq('id', classId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function classRoster(classId) {
  if (isDemo()) return DEMO.roster(classId);
  const { data, error } = await (await supabase()).from('class_members').select('student_id, profiles(*)').eq('class_id', classId).eq('status', 'approved');
  if (error) throw error;
  return data;
}

export async function createClass(row) {
  if (isDemo()) return DEMO.addClass(row);
  const { data, error } = await (await supabase()).from('classes').insert(row).select().single();
  if (error) throw error;
  return data;
}

// ---------- join requests: student enters a class code -> teacher accepts/rejects ----------
export async function findClassByJoinCode(code) {
  if (isDemo()) return DEMO.findClassByJoinCode(code);
  const { data, error } = await (await supabase()).from('classes').select('*').eq('join_code', code.trim().toUpperCase()).maybeSingle();
  if (error) throw error;
  return data;
}

/** Student side: ask to join a class. Lands as status='pending' until a teacher accepts it. */
export async function requestJoinClass(classId, studentId) {
  if (isDemo()) return DEMO.requestJoin(classId, studentId);
  const { data, error } = await (await supabase()).from('class_members')
    .upsert({ class_id: classId, student_id: studentId, status: 'pending' }, { onConflict: 'class_id,student_id', ignoreDuplicates: false })
    .select().single();
  if (error) throw error;
  return data;
}

/** Teacher side: everyone waiting on a decision for one of their classes. */
export async function listPendingMembers(classId) {
  if (isDemo()) return DEMO.pendingFor(classId);
  const { data, error } = await (await supabase()).from('class_members').select('student_id, profiles(*)').eq('class_id', classId).eq('status', 'pending');
  if (error) throw error;
  return data;
}

export async function setMembershipStatus(classId, studentId, status) {
  if (isDemo()) return DEMO.setMembershipStatus(classId, studentId, status);
  const { error } = await (await supabase()).from('class_members').update({ status }).eq('class_id', classId).eq('student_id', studentId);
  if (error) throw error;
}

/** Student side: which classes have I asked to join, and are they approved yet? */
export async function listMyMemberships(studentId) {
  if (isDemo()) return DEMO.myMemberships(studentId);
  const { data, error } = await (await supabase()).from('class_members').select('class_id, status, classes(*)').eq('student_id', studentId);
  if (error) throw error;
  return data;
}

// ---------- teacher-authored content (killer feature: "учитель-мультипликатор") ----------
export async function createNode(row) {
  if (isDemo()) return DEMO.addNode(row);
  const { data, error } = await (await supabase()).from('nodes').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function createTasks(rows) {
  if (isDemo()) return DEMO.addTasks(rows);
  const { data, error } = await (await supabase()).from('tasks').insert(rows).select();
  if (error) throw error;
  return data;
}

export function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
