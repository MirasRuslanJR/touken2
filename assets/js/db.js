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
  const url = new URL(location.href);
  url.searchParams.set('demo', '1');
  history.replaceState(null, '', url);
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
  if (data.user) {
    await (await supabase()).from('profiles').insert({ id: data.user.id, role: 'student', full_name: profile.fullName || email.split('@')[0], grade: profile.grade || 9, lang: 'ru' });
  }
  return data;
}

export async function signOut() {
  if (isDemo()) { DEMO.clear(); return; }
  await (await supabase()).auth.signOut();
}

// ---------- reference data ----------
export async function listSubjects() {
  if (isDemo()) return DEMO.subjects;
  const { data, error } = await (await supabase()).from('subjects').select('*');
  if (error) throw error;
  return data;
}

export async function listNodes(subjectId) {
  if (isDemo()) return DEMO.nodes.filter(n => n.subject_id === subjectId);
  const { data, error } = await (await supabase()).from('nodes').select('*').eq('subject_id', subjectId).order('order_index');
  if (error) throw error;
  return data;
}

export async function listEdges(subjectId) {
  if (isDemo()) return DEMO.edges.filter(e => e.subject_id === subjectId);
  const { data, error } = await (await supabase()).from('edges').select('*').eq('subject_id', subjectId);
  if (error) throw error;
  return data;
}

export async function getNodeByCode(code) {
  if (isDemo()) return DEMO.nodes.find(n => n.code === code);
  const { data, error } = await (await supabase()).from('nodes').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNode(nodeId) {
  if (isDemo()) return DEMO.nodes.find(n => n.id === nodeId);
  const { data, error } = await (await supabase()).from('nodes').select('*').eq('id', nodeId).single();
  if (error) throw error;
  return data;
}

export async function listTasks(nodeId) {
  if (isDemo()) return DEMO.tasks.filter(t => t.node_id === nodeId);
  const { data, error } = await (await supabase()).from('tasks').select('*').eq('node_id', nodeId);
  if (error) throw error;
  return data;
}

// ---------- mastery ----------
export async function getMastery(userId) {
  if (isDemo()) return DEMO.mastery(userId);
  const { data, error } = await (await supabase()).from('mastery').select('*').eq('user_id', userId);
  if (error) throw error;
  return data;
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
  const { data, error } = await (await supabase()).from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
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
  const { data, error } = await (await supabase()).from('goals').select('*').eq('user_id', userId).order('target_date').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- classes (teacher) ----------
export async function listClasses(teacherId) {
  if (isDemo()) return DEMO.classes(teacherId);
  const { data, error } = await (await supabase()).from('classes').select('*').eq('teacher_id', teacherId);
  if (error) throw error;
  return data;
}

export async function classRoster(classId) {
  if (isDemo()) return DEMO.roster(classId);
  const { data, error } = await (await supabase()).from('class_members').select('student_id, profiles(*)').eq('class_id', classId);
  if (error) throw error;
  return data;
}

export async function createClass(row) {
  if (isDemo()) return DEMO.addClass(row);
  const { data, error } = await (await supabase()).from('classes').insert(row).select().single();
  if (error) throw error;
  return data;
}

export function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
