// i18n.js — RU / KK / EN dictionaries. AI-facing text picks the same lang code
// and is passed to Gemini so explanations come back in the right language too.

const dict = {
  ru: {
    tagline: 'Находим корень, а не симптом',
    nav_home: 'Дашборд', nav_graph: 'Граф знаний', nav_modules: 'Темы', nav_tutor: 'Сократ',
    nav_scan: 'Рентген тетради', nav_settings: 'Настройки', nav_teacher: 'Класс',
    cta_start: 'Начать диагностику', cta_teacher_login: 'Войти как учитель',
    empty_tasks: 'Заданий пока нет — загляни в другую тему.',
    check: 'Проверить', continue: 'Продолжить', published: 'Опубликовано',
  },
  kk: {
    tagline: 'Симптомды емес, тамырды табамыз',
    nav_home: 'Тақта', nav_graph: 'Білім графигі', nav_modules: 'Тақырыптар', nav_tutor: 'Сократ',
    nav_scan: 'Дәптер рентгені', nav_settings: 'Баптаулар', nav_teacher: 'Сынып',
    cta_start: 'Диагностиканы бастау', cta_teacher_login: 'Мұғалім ретінде кіру',
    empty_tasks: 'Әзірге тапсырма жоқ — басқа тақырыпты қара.',
    check: 'Тексеру', continue: 'Жалғастыру', published: 'Жарияланды',
  },
  en: {
    tagline: 'Finding the root, not the symptom',
    nav_home: 'Dashboard', nav_graph: 'Knowledge graph', nav_modules: 'Topics', nav_tutor: 'Socrates',
    nav_scan: 'Notebook X-ray', nav_settings: 'Settings', nav_teacher: 'Class',
    cta_start: 'Start diagnostic', cta_teacher_login: 'Log in as teacher',
    empty_tasks: 'No tasks here yet — try another topic.',
    check: 'Check', continue: 'Continue', published: 'Published',
  },
};

let current = localStorage.getItem('tamyr_lang') || 'ru';

export function setLang(lang) { current = lang; localStorage.setItem('tamyr_lang', lang); document.documentElement.lang = lang; }
export function getLang() { return current; }
export function t(key) { return dict[current]?.[key] ?? dict.ru[key] ?? key; }
export function titleFor(row) { return row?.[`title_${current}`] || row?.title_ru || row?.title || ''; }
