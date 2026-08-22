// demo-data.js — self-contained dataset mirroring data/seed.sql, used whenever
// ?demo=1 is set or Supabase is unreachable. This is what makes the product
// demoable with zero network and zero registration. Node ids equal their code
// for readability; that's fine because this never talks to a real foreign key.

const MATH = 'math';
const PHYS = 'physics';

function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const mathNodes = [
  ['ALG-6-01','Доли и обыкновенные дроби',6,1],['ALG-6-02','Сложение и вычитание дробей',6,2],
  ['ALG-6-03','Умножение дробей',6,3],['ALG-6-04','Деление дробей',6,4],
  ['ALG-6-05','Десятичные дроби',6,5],['ALG-6-06','Проценты',6,6],
  ['ALG-6-07','Положительные и отрицательные числа',6,7],['ALG-6-08','Действия с отрицательными числами',6,8],
  ['ALG-7-01','Буквенные выражения',7,9],['ALG-7-02','Раскрытие скобок',7,10],
  ['ALG-7-03','Линейные уравнения',7,11],['ALG-7-04','Степень числа',7,12],
  ['ALG-7-05','Свойства степеней',7,13],['ALG-7-06','Одночлены и многочлены',7,14],
  ['ALG-7-07','Формулы сокращённого умножения',7,15],['ALG-8-01','Квадратный корень',8,16],
  ['ALG-8-02','Свойства арифметического корня',8,17],['ALG-8-03','Разложение на множители',8,18],
  ['ALG-8-04','Алгебраические дроби',8,19],['ALG-8-05','Системы линейных уравнений',8,20],
  ['ALG-9-01','Квадратные уравнения',9,21],['ALG-9-02','Теорема Виета',9,22],
  ['ALG-9-03','Квадратичная функция',9,23],['ALG-9-04','Показательные выражения',9,24],
  ['ALG-9-05','Неравенства второй степени',9,25],['ALG-9-06','Прогрессии',9,26],
];
const mathEdges = [
  ['ALG-6-01','ALG-6-02'],['ALG-6-02','ALG-6-03'],['ALG-6-03','ALG-6-04'],['ALG-6-01','ALG-6-05'],
  ['ALG-6-05','ALG-6-06'],['ALG-6-07','ALG-6-08'],['ALG-6-08','ALG-7-01'],['ALG-6-04','ALG-7-01'],
  ['ALG-7-01','ALG-7-02'],['ALG-7-02','ALG-7-03'],['ALG-6-08','ALG-7-04'],['ALG-7-04','ALG-7-05'],
  ['ALG-7-01','ALG-7-06'],['ALG-7-05','ALG-7-06'],['ALG-7-06','ALG-7-07'],['ALG-7-05','ALG-8-01'],
  ['ALG-8-01','ALG-8-02'],['ALG-7-07','ALG-8-03'],['ALG-7-06','ALG-8-03'],['ALG-8-03','ALG-8-04'],
  ['ALG-6-04','ALG-8-04'],['ALG-7-03','ALG-8-05'],['ALG-8-01','ALG-9-01'],['ALG-7-03','ALG-9-01'],
  ['ALG-8-03','ALG-9-01'],['ALG-9-01','ALG-9-02'],['ALG-9-01','ALG-9-03'],['ALG-7-06','ALG-9-03'],
  ['ALG-7-05','ALG-9-04'],['ALG-9-01','ALG-9-05'],['ALG-7-01','ALG-9-06'],
];

const physNodes = [
  ['PHYS-7-01','Что изучает физика',7,1],['PHYS-7-02','Строение вещества',7,2],
  ['PHYS-7-03','Взаимодействие тел',7,3],['PHYS-7-04','Масса и плотность',7,4],
  ['PHYS-7-05','Сила. Виды сил',7,5],['PHYS-7-06','Давление твёрдых тел',7,6],
  ['PHYS-7-07','Давление жидкостей и газов',7,7],['PHYS-7-08','Закон Архимеда',7,8],
  ['PHYS-8-01','Тепловое движение',8,9],['PHYS-8-02','Количество теплоты',8,10],
  ['PHYS-8-03','Электризация тел',8,11],['PHYS-8-04','Сила тока',8,12],
  ['PHYS-8-05','Напряжение и сопротивление',8,13],['PHYS-8-06','Закон Ома',8,14],
  ['PHYS-8-07','Соединения проводников',8,15],['PHYS-9-01','Механическое движение',9,16],
  ['PHYS-9-02','Скорость. Равномерное движение',9,17],['PHYS-9-03','Ускорение',9,18],
  ['PHYS-9-04','Графики движения',9,19],['PHYS-9-05','Второй закон Ньютона',9,20],
  ['PHYS-9-06','Третий закон Ньютона',9,21],['PHYS-9-07','Закон всемирного тяготения',9,22],
  ['PHYS-9-08','Импульс тела',9,23],['PHYS-9-09','Работа и мощность',9,24],
  ['PHYS-9-10','Кинетическая и потенциальная энергия',9,25],['PHYS-9-11','Закон сохранения энергии',9,26],
];
const physEdges = [
  ['PHYS-7-01','PHYS-7-02'],['PHYS-7-02','PHYS-7-03'],['PHYS-7-03','PHYS-7-04'],['PHYS-7-04','PHYS-7-05'],
  ['PHYS-7-05','PHYS-7-06'],['PHYS-7-06','PHYS-7-07'],['PHYS-7-07','PHYS-7-08'],['PHYS-7-04','PHYS-7-08'],
  ['PHYS-8-01','PHYS-8-02'],['PHYS-7-02','PHYS-8-01'],['PHYS-7-02','PHYS-8-03'],['PHYS-8-03','PHYS-8-04'],
  ['PHYS-8-04','PHYS-8-05'],['PHYS-8-05','PHYS-8-06'],['PHYS-8-04','PHYS-8-06'],['PHYS-8-06','PHYS-8-07'],
  ['PHYS-7-01','PHYS-9-01'],['PHYS-9-01','PHYS-9-02'],['PHYS-9-02','PHYS-9-03'],['PHYS-9-03','PHYS-9-04'],
  ['PHYS-9-02','PHYS-9-04'],['PHYS-7-05','PHYS-9-05'],['PHYS-9-03','PHYS-9-05'],['PHYS-9-05','PHYS-9-06'],
  ['PHYS-7-05','PHYS-9-07'],['PHYS-9-06','PHYS-9-07'],['PHYS-9-05','PHYS-9-08'],['PHYS-9-06','PHYS-9-08'],
  ['PHYS-7-05','PHYS-9-09'],['PHYS-9-02','PHYS-9-09'],['PHYS-9-09','PHYS-9-10'],['PHYS-7-04','PHYS-9-10'],
  ['PHYS-9-10','PHYS-9-11'],['PHYS-9-08','PHYS-9-11'],
];

function toNodes(list, subject) {
  return list.map(([code, title, grade, order_index]) => ({
    id: code, subject_id: subject, code, title_ru: title, title_kk: title, title_en: title,
    grade, summary: '', order_index,
  }));
}
function toEdges(list, subject) {
  return list.map(([from, to], i) => ({ id: `${subject}-e${i}`, subject_id: subject, prerequisite_node_id: from, dependent_node_id: to, from, to }));
}

const nodes = [...toNodes(mathNodes, MATH), ...toNodes(physNodes, PHYS)];
const edges = [...toEdges(mathEdges, MATH), ...toEdges(physEdges, PHYS)];

// A compact task bank: at least 3 per node that has any, enough to drive the demo.
const taskBank = {
  'ALG-9-01': [
    { difficulty: 2, type: 'number', prompt: 'Реши: x² - 5x + 6 = 0. Введи меньший корень.', answer: '2', solution: 'D=1, x=(5±1)/2 → 2 и 3.' },
    { difficulty: 3, type: 'short', prompt: 'Реши: x² - 6x + 9 = 0. Сколько различных корней?', answer: '1', solution: 'D=0, один корень x=3.' },
  ],
  'ALG-9-04': [
    { difficulty: 1, type: 'choice', prompt: 'Чему равно a⁵ · a³?', options: ['a8','a15','a2'], answer: 'a8', solution: 'Показатели складываются: 5+3=8.' },
    { difficulty: 3, type: 'short', prompt: 'Реши уравнение: 2^x = 16.', answer: '4', solution: '16=2^4, x=4.' },
  ],
  'ALG-7-05': [
    { difficulty: 1, type: 'choice', prompt: 'Чему равно a³ · a²?', options: ['a5','a6','a1'], answer: 'a5', solution: 'Показатели складываются: 3+2=5.' },
    { difficulty: 2, type: 'short', prompt: 'Упрости: (a²)⁴.', answer: 'a^8', solution: 'Показатели перемножаются: 2·4=8.' },
  ],
  'PHYS-9-05': [
    { difficulty: 1, type: 'number', prompt: 'Найди силу, если m=2 кг, a=3 м/с².', answer: '6', solution: 'F=ma=6 Н.' },
    { difficulty: 3, type: 'short', prompt: 'На тело m=2 кг действуют силы 10 Н и 4 Н в противоположные стороны. Найди ускорение.', answer: '3', solution: 'F=10-4=6 Н, a=6/2=3 м/с².' },
  ],
  'ALG-7-04': [
    { difficulty: 1, type: 'number', prompt: 'Вычисли: 3².', answer: '9', solution: '3·3=9.' },
  ],
  'ALG-8-01': [
    { difficulty: 1, type: 'number', prompt: 'Найди √25.', answer: '5', solution: '5·5=25.' },
  ],
  'ALG-8-03': [
    { difficulty: 2, type: 'short', prompt: 'Разложи на множители: x² - 9.', answer: '(x-3)(x+3)', solution: 'Разность квадратов.' },
  ],
  'ALG-9-03': [
    { difficulty: 2, type: 'number', prompt: 'Найди абсциссу вершины параболы y=x²-4x+1.', answer: '2', solution: 'x0=-b/2a=4/2=2.' },
  ],
  'PHYS-9-02': [
    { difficulty: 1, type: 'number', prompt: 'Тело прошло 100 м за 20 с. Найди скорость (м/с).', answer: '5', solution: 'v=s/t=5 м/с.' },
  ],
  'PHYS-7-05': [
    { difficulty: 1, type: 'number', prompt: 'Найди силу тяжести тела массой 8 кг (g=10 м/с²).', answer: '80', solution: 'Fт=mg=80 Н.' },
  ],
};
Object.entries(taskBank).forEach(([nodeId, list]) => list.forEach((t, i) => { t.id = `${nodeId}-t${i}`; t.node_id = nodeId; t.options = t.options || null; }));
const tasks = Object.values(taskBank).flat();

// ---- demo user state (kept in memory + localStorage so a reload survives) ----
const LS_KEY = 'tamyr_demo_state_v1';
function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function persist(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }

function buildStudentMastery() {
  // Realistic spread: everything up to grade 8 solid, ALG-7-05 (powers) is the hidden root gap,
  // which cascades into ALG-9-04 looking broken even though the student "did the algebra fine".
  const m = {};
  const solid = ['ALG-6-01','ALG-6-02','ALG-6-03','ALG-6-04','ALG-6-05','ALG-6-06','ALG-6-07','ALG-6-08',
    'ALG-7-01','ALG-7-02','ALG-7-03','ALG-7-04','ALG-7-06','ALG-7-07','ALG-8-01','ALG-8-02','ALG-8-03','ALG-8-04','ALG-8-05'];
  solid.forEach(id => m[id] = { score: 78 + Math.floor(Math.random() * 18), status: 'mastered' });
  // Seeded high-but-still-"gap": one verified-correct answer during the live demo
  // (either of the two ALG-7-05 fixture tasks, weight 8.4 or 10.8 per mastery.js)
  // reliably crosses the 75-point "mastered" line, matching the demo script's
  // 10-second budget for the "gap closes, wave runs up the graph" beat.
  m['ALG-7-05'] = { score: 68, status: 'gap' };
  m['ALG-9-01'] = { score: 58, status: 'learning' };
  m['ALG-9-02'] = { score: 40, status: 'learning' };
  m['ALG-9-03'] = { score: 45, status: 'learning' };
  m['ALG-9-04'] = { score: 18, status: 'gap' };
  m['ALG-9-05'] = { score: 20, status: 'gap' };
  m['ALG-9-06'] = { score: 30, status: 'learning' };
  const physSolid = ['PHYS-7-01','PHYS-7-02','PHYS-7-03','PHYS-7-04','PHYS-7-05','PHYS-7-06','PHYS-7-07','PHYS-7-08',
    'PHYS-8-01','PHYS-8-02','PHYS-8-03','PHYS-8-04','PHYS-8-05','PHYS-8-06','PHYS-8-07','PHYS-9-01'];
  physSolid.forEach(id => m[id] = { score: 70 + Math.floor(Math.random() * 20), status: 'mastered' });
  ['PHYS-9-02','PHYS-9-03','PHYS-9-04'].forEach(id => m[id] = { score: 62 + Math.floor(Math.random()*15), status: 'learning' });
  ['PHYS-9-05','PHYS-9-06','PHYS-9-07','PHYS-9-08','PHYS-9-09','PHYS-9-10','PHYS-9-11'].forEach(id => m[id] = { score: 35 + Math.floor(Math.random()*20), status: 'learning' });
  return m;
}

function buildAttempts() {
  const list = [];
  const now = Date.now();
  const pool = ['ALG-6-02','ALG-6-05','ALG-7-02','ALG-7-05','ALG-7-06','ALG-8-01','ALG-8-03','ALG-9-01','ALG-9-04','PHYS-7-05','PHYS-9-02','PHYS-9-05'];
  for (let i = 0; i < 44; i++) {
    const nodeId = pool[Math.floor(Math.random() * pool.length)];
    const isGapNode = nodeId === 'ALG-7-05' || nodeId === 'ALG-9-04';
    const correct = isGapNode ? Math.random() < 0.3 : Math.random() < 0.82;
    list.push({
      id: `demo-a${i}`, user_id: 'demo-student', node_id: nodeId, task_id: `${nodeId}-t0`,
      is_correct: correct, answer_given: correct ? 'ok' : 'x',
      time_spent_ms: 8000 + Math.floor(Math.random() * 40000), hints_used: correct ? 0 : Math.floor(Math.random() * 3),
      created_at: new Date(now - i * 3 * 3600 * 1000).toISOString(),
    });
  }
  return list;
}

function buildClassRoster() {
  const names = ['Айгерим Т.','Данияр С.','Жанна К.','Ерлан М.','Алина Б.','Нурсултан Ж.','Дария А.','Тимур О.',
    'Камила Р.','Бекзат Н.','Сара И.','Максат У.'];
  return names.map((full_name, i) => ({
    id: `demo-student-${i}`, full_name, role: 'student', grade: 9,
    accuracy: Math.round(30 + Math.random() * 65),
    trend: Math.random() > 0.6 ? 'down' : (Math.random() > 0.5 ? 'up' : 'flat'),
    lastActive: Math.floor(Math.random() * 12),
  }));
}

// A couple of students already "knocking" on the demo class so the teacher's
// accept/reject screen has something real to show without needing the
// student-side join flow to be exercised first in the same demo session.
function buildPendingRequests() {
  return [
    { student_id: 'demo-pending-0', class_id: 'demo-class', status: 'pending', profiles: { id: 'demo-pending-0', full_name: 'Асель Нурлановна', role: 'student', grade: 9, school: 'Школа-лицей №5, Алматы' } },
    { student_id: 'demo-pending-1', class_id: 'demo-class', status: 'pending', profiles: { id: 'demo-pending-1', full_name: 'Ринат Ахметов', role: 'student', grade: 9, school: 'НИШ ФМН, Караганда' } },
  ];
}

class DemoStore {
  constructor() {
    this.subjects = [
      { id: MATH, slug: 'math', title_ru: 'Математика', title_kk: 'Математика', title_en: 'Mathematics' },
      { id: PHYS, slug: 'physics', title_ru: 'Физика', title_kk: 'Физика', title_en: 'Physics' },
    ];
    this.nodes = nodes;
    this.edges = edges;
    this.tasks = tasks;
    const saved = load();
    this.state = {
      role: saved.role || 'student',
      mastery: saved.mastery || { 'demo-student': buildStudentMastery() },
      attempts: saved.attempts || { 'demo-student': buildAttempts() },
      diagnostics: saved.diagnostics || [],
      roster: saved.roster || buildClassRoster(),
      pending: saved.pending || buildPendingRequests(),
      profileOverrides: saved.profileOverrides || {},
    };
    this.save();
  }
  save() { persist(this.state); }
  setRole(role) { this.state.role = role; this.save(); }
  clear() { localStorage.removeItem(LS_KEY); }
  currentUser() {
    const base = this.state.role === 'teacher'
      ? { id: 'demo-teacher', full_name: 'Айнур Serikovna', role: 'teacher', grade: null }
      : { id: 'demo-student', full_name: 'Демо Ученик', role: 'student', grade: 9 };
    return { ...base, ...(this.state.profileOverrides[base.id] || {}) };
  }
  updateProfile(userId, patch) {
    this.state.profileOverrides[userId] = { ...(this.state.profileOverrides[userId] || {}), ...patch };
    this.save();
    return { ...this.currentUser(), ...patch };
  }
  mastery(userId) {
    const m = this.state.mastery[userId] || {};
    return Object.entries(m).map(([node_id, v]) => ({ user_id: userId, node_id, ...v }));
  }
  upsertMastery(userId, nodeId, patch) {
    if (!this.state.mastery[userId]) this.state.mastery[userId] = {};
    this.state.mastery[userId][nodeId] = { ...(this.state.mastery[userId][nodeId] || {}), ...patch };
    this.save();
  }
  addAttempt(row) {
    if (!this.state.attempts[row.user_id]) this.state.attempts[row.user_id] = [];
    this.state.attempts[row.user_id].unshift({ id: `a-${Date.now()}`, created_at: new Date().toISOString(), ...row });
    this.save();
  }
  attempts(userId, limit) { return (this.state.attempts[userId] || []).slice(0, limit); }
  saveGoal(row) { const r = { id: `g-${Date.now()}`, ...row }; this.state.goal = r; this.save(); return r; }
  getGoal() { return this.state.goal || { kind: 'ent', title: 'Подготовка к ЕНТ', target_date: '2026-11-23', target_score: 130 }; }
  addDiagnostic(row) { const r = { id: `d-${Date.now()}`, created_at: new Date().toISOString(), ...row }; this.state.diagnostics.unshift(r); this.save(); return r; }
  getDiagnostic(id) { return this.state.diagnostics.find(d => d.id === id) || this.state.diagnostics[0]; }
  classes() {
    if (!this.state.classes) this.state.classes = [{ id: 'demo-class', teacher_id: 'demo-teacher', title: '9 «Ә» класс', subject_id: MATH, join_code: 'TAMYR9' }];
    return this.state.classes;
  }
  addClass(row) {
    this.classes();
    const c = { id: `class-${Date.now()}`, join_code: genJoinCode(), ...row };
    this.state.classes.push(c);
    this.save();
    return c;
  }
  roster() { return this.state.roster.map(s => ({ student_id: s.id, profiles: s })); }
  findProfile(userId) {
    return this.state.roster.find(s => s.id === userId)
      || (this.currentUser().id === userId ? this.currentUser() : null);
  }
  findClassByJoinCode(code) {
    return this.classes().find(c => c.join_code === code.trim().toUpperCase()) || null;
  }
  requestJoin(classId, studentId) {
    this.state.pending = this.state.pending.filter(p => !(p.class_id === classId && p.student_id === studentId));
    const me = this.currentUser();
    const entry = { student_id: studentId, class_id: classId, status: 'pending', profiles: { ...me, id: studentId } };
    this.state.pending.push(entry);
    this.save();
    return entry;
  }
  pendingFor(classId) { return this.state.pending.filter(p => p.class_id === classId); }
  myMemberships(studentId) {
    const results = this.state.pending
      .filter(p => p.student_id === studentId)
      .map(p => ({ class_id: p.class_id, status: 'pending', classes: this.classes().find(c => c.id === p.class_id) }));
    if (this.state.roster.some(s => s.id === studentId)) {
      const cls = this.classes()[0];
      if (cls) results.push({ class_id: cls.id, status: 'approved', classes: cls });
    }
    return results;
  }
  setMembershipStatus(classId, studentId, status) {
    const entry = this.state.pending.find(p => p.class_id === classId && p.student_id === studentId);
    this.state.pending = this.state.pending.filter(p => !(p.class_id === classId && p.student_id === studentId));
    if (status === 'approved' && entry) {
      this.state.roster.push({
        id: studentId, full_name: entry.profiles.full_name, role: 'student', grade: entry.profiles.grade || 9,
        school: entry.profiles.school, accuracy: Math.round(40 + Math.random() * 50), trend: 'flat', lastActive: 0,
      });
    }
    this.save();
  }
  addNode(row) {
    const n = { id: `node-${Date.now()}`, ...row };
    this.nodes.push(n);
    return n;
  }
  addTasks(rows) {
    const withIds = rows.map((t, i) => ({ ...t, id: `task-${Date.now()}-${i}`, options: t.options || null }));
    this.tasks.push(...withIds);
    return withIds;
  }
}

export const DEMO = new DemoStore();

// ---- pre-baked AI responses so every killer feature still works with the network off ----
export const OFFLINE_AI_FALLBACKS = {
  xray_summary: (p) => ({
    headline: 'Корень найден: свойства степеней за 7 класс',
    explanation: 'Ты не решаешь показательные уравнения не потому, что не понял тему — а потому что не закрыты свойства степеней за 7 класс. Закрой этот узел, и показательные уравнения станут заметно проще.',
    root_title: 'Свойства степеней',
  }),
  scan_notebook: () => ({
    recognized_steps: [
      { line: 1, content: '2(x + 3) = 14' },
      { line: 2, content: '2x + 6 = 14' },
      { line: 3, content: '2x = 14 + 6' },
      { line: 4, content: 'x = 10' },
    ],
    error_line: 3,
    error_type: 'знак при переносе слагаемого',
    what_happened: 'На третьей строке при переносе 6 в другую часть уравнения знак не поменялся на противоположный — должно быть 2x = 14 − 6.',
    hint: 'Когда слагаемое переходит через знак равенства, его знак меняется на противоположный. Перепиши третью строку.',
    root_node_code: 'ALG-7-03',
  }),
  tutor_reply: (p) => {
    const asksForAnswer = /ответ|реши за меня|скажи число|дай решение/i.test(p?.message || '');
    if (asksForAnswer) {
      return { reply: 'Готовое решение я не дам — так оно не останется в голове. Давай по шагам: с чего вообще начинается решение этого уравнения?', escalation_level: 1, gave_answer: false };
    }
    return { reply: 'Хорошее начало. А что нужно сделать с числом при переменной, чтобы оставить x одного?', escalation_level: 1, gave_answer: false };
  },
  comprehension_check: () => ({ question: 'Почему на этом шаге ты перенёс слагаемое именно с таким знаком?', expected_answer: 'При переносе через знак равенства знак меняется на противоположный' }),
  feynman_map: () => ({ coverage_percent: 62, correct_points: ['Определение через отношение силы к площади', 'Единица измерения — паскаль'], missing_points: ['Связь с законом Паскаля', 'Зависимость от глубины в жидкости'], confusions: ['Путает давление и силу'] }),
  teacher_radar: () => ({ signals: [
    { student: 'Айгерим Т.', message: 'Точность по физике упала с 78% до 41% за две недели, заходы сместились на ночь', risk: 'high' },
    { student: 'Данияр С.', message: 'Три дня не заходил, до этого ровный прогресс', risk: 'med' },
  ] }),
  module_builder: (p) => ({
    topic_title: 'Новая тема (офлайн-черновик)',
    microtopics: ['Определение', 'Базовые свойства', 'Применение в задачах'],
    linked_node_codes: [],
    tasks: Array.from({ length: 10 }, (_, i) => ({
      difficulty: Math.min(5, Math.floor(i / 2) + 1), type: 'short',
      prompt: `Черновик задания ${i + 1} по загруженному конспекту — уточните формулировку после подключения интернета.`,
      answer: '—', solution: 'Заполнится после генерации онлайн.',
    })),
  }),
  explain_simpler: () => ({ explanation: 'Представь это так: если тема — это лестница, то этот шаг — просто одна ступенька пониже. Смотри на неё отдельно от остальных и не думай о следующих шагах.' }),
};
