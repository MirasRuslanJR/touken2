// i18n.js — RU / KK / EN dictionaries. AI-facing text picks the same lang code
// and is passed to Gemini so explanations come back in the right language too.
//
// Keys are grouped by screen. Every user-visible string that a judge or a
// student actually reads on the main flow lives here — an earlier version only
// held ~12 nav keys, which made switching to Қазақша look completely broken
// because the whole interface stayed Russian.

const dict = {
  ru: {
    tagline: 'Находим корень, а не симптом',
    // nav
    nav_home: 'Дашборд', nav_graph: 'Граф знаний', nav_modules: 'Темы', nav_tutor: 'Сократ',
    nav_scan: 'Скан тетради', nav_xray: 'Рентген', nav_settings: 'Настройки', nav_teacher: 'Класс',
    nav_signout: 'Выйти',
    // common
    cta_start: 'Начать диагностику', cta_teacher_login: 'Войти как учитель',
    empty_tasks: 'Заданий пока нет — загляни в другую тему.',
    check: 'Проверить', continue: 'Продолжить', published: 'Опубликовано',
    all_topics: 'Все темы', student: 'ученик', teacher: 'Учитель', grade: 'класс',
    online: 'онлайн', offline: 'офлайн',
    // dashboard
    dash_welcome: 'С возвращением', dash_take_diagnostic: 'Пройти диагностику',
    dash_overall: 'общее освоение', dash_streak: 'дней подряд', dash_to_goal: 'до цели',
    dash_attempts: 'попыток за месяц', dash_weak: 'Слабые места по приоритету',
    dash_history: 'История попыток', dash_your_graph: 'Твой граф',
    dash_no_gaps: 'Пробелов не найдено', dash_no_gaps_sub: 'Похоже, всё закрыто — пройди диагностику ещё раз, чтобы проверить.',
    dash_empty: 'Пока пусто',
    // xray
    xray_title: 'Рентген', xray_root_found: 'Корень найден', xray_root_node: 'Корневой узел',
    xray_close_gap: 'Закрыть пробел', xray_chain: 'Цепочка',
    xray_need_diag: 'Сначала диагностика', xray_need_diag_head: 'Рентген появится после диагностики',
    xray_need_diag_sub: 'Рентген показывает не ошибку, а её причину — тему, из-за которой всё посыпалось. Чтобы её найти, нужны твои ответы.',
    // task
    task_level: 'Уровень', task_your_answer: 'Твой ответ', task_wrong: 'Не в этот раз',
    task_explain_simpler: 'Не понял, объясни проще', task_next: 'Следующее задание',
    task_correct: 'Верно.', task_checking: 'Проверяем, что это не угадано…',
    task_ask_socrates: 'Спросить Сократа', task_explain_own: 'Объяснить своими словами',
    // feynman
    feynman_mode: 'Режим Фейнмана', feynman_explain: 'Объясни',
    feynman_speak: 'Говорить', feynman_stop: 'Остановить', feynman_analyze: 'Проверить понимание',
    // settings
    set_title: 'Настройки', set_profile: 'Профиль', set_school_class: 'Школа и класс',
    set_school: 'Школа', set_class_code: 'Код класса от учителя', set_save: 'Сохранить',
    set_lang: 'Язык интерфейса', set_a11y: 'Режимы доступности', set_signout: 'Выйти из аккаунта',
    set_lang_changed: 'Язык изменён',
  },
  kk: {
    tagline: 'Симптомды емес, тамырды табамыз',
    nav_home: 'Тақта', nav_graph: 'Білім графигі', nav_modules: 'Тақырыптар', nav_tutor: 'Сократ',
    nav_scan: 'Дәптер сканері', nav_xray: 'Рентген', nav_settings: 'Баптаулар', nav_teacher: 'Сынып',
    nav_signout: 'Шығу',
    cta_start: 'Диагностиканы бастау', cta_teacher_login: 'Мұғалім ретінде кіру',
    empty_tasks: 'Әзірге тапсырма жоқ — басқа тақырыпты қара.',
    check: 'Тексеру', continue: 'Жалғастыру', published: 'Жарияланды',
    all_topics: 'Барлық тақырыптар', student: 'оқушы', teacher: 'Мұғалім', grade: 'сынып',
    online: 'желіде', offline: 'желіден тыс',
    dash_welcome: 'Қайта келуіңізбен', dash_take_diagnostic: 'Диагностикадан өту',
    dash_overall: 'жалпы меңгеру', dash_streak: 'күн қатарынан', dash_to_goal: 'мақсатқа дейін',
    dash_attempts: 'айдағы әрекет', dash_weak: 'Басымдық бойынша әлсіз тұстар',
    dash_history: 'Әрекеттер тарихы', dash_your_graph: 'Сенің графигің',
    dash_no_gaps: 'Олқылық табылмады', dash_no_gaps_sub: 'Бәрі жабылған сияқты — тексеру үшін диагностиканы қайта өт.',
    dash_empty: 'Әзірге бос',
    xray_title: 'Рентген', xray_root_found: 'Тамыр табылды', xray_root_node: 'Түбірлік түйін',
    xray_close_gap: 'Олқылықты жабу', xray_chain: 'Тізбек',
    xray_need_diag: 'Алдымен диагностика', xray_need_diag_head: 'Рентген диагностикадан кейін шығады',
    xray_need_diag_sub: 'Рентген қатені емес, оның себебін көрсетеді — бәрі содан бұзылған тақырыпты. Оны табу үшін сенің жауаптарың қажет.',
    task_level: 'Деңгей', task_your_answer: 'Сенің жауабың', task_wrong: 'Бұл жолы емес',
    task_explain_simpler: 'Түсінбедім, қарапайым түсіндір', task_next: 'Келесі тапсырма',
    task_correct: 'Дұрыс.', task_checking: 'Кездейсоқ емес екенін тексерудеміз…',
    task_ask_socrates: 'Сократтан сұрау', task_explain_own: 'Өз сөзіңмен түсіндір',
    feynman_mode: 'Фейнман режимі', feynman_explain: 'Түсіндір',
    feynman_speak: 'Сөйлеу', feynman_stop: 'Тоқтату', feynman_analyze: 'Түсінікті тексеру',
    set_title: 'Баптаулар', set_profile: 'Профиль', set_school_class: 'Мектеп және сынып',
    set_school: 'Мектеп', set_class_code: 'Мұғалімнен алынған сынып коды', set_save: 'Сақтау',
    set_lang: 'Интерфейс тілі', set_a11y: 'Қолжетімділік режимдері', set_signout: 'Аккаунттан шығу',
    set_lang_changed: 'Тіл өзгертілді',
  },
  en: {
    tagline: 'Finding the root, not the symptom',
    nav_home: 'Dashboard', nav_graph: 'Knowledge graph', nav_modules: 'Topics', nav_tutor: 'Socrates',
    nav_scan: 'Notebook scan', nav_xray: 'X-ray', nav_settings: 'Settings', nav_teacher: 'Class',
    nav_signout: 'Sign out',
    cta_start: 'Start diagnostic', cta_teacher_login: 'Log in as teacher',
    empty_tasks: 'No tasks here yet — try another topic.',
    check: 'Check', continue: 'Continue', published: 'Published',
    all_topics: 'All topics', student: 'student', teacher: 'Teacher', grade: 'grade',
    online: 'online', offline: 'offline',
    dash_welcome: 'Welcome back', dash_take_diagnostic: 'Take the diagnostic',
    dash_overall: 'overall mastery', dash_streak: 'day streak', dash_to_goal: 'to goal',
    dash_attempts: 'attempts this month', dash_weak: 'Weak spots by priority',
    dash_history: 'Attempt history', dash_your_graph: 'Your graph',
    dash_no_gaps: 'No gaps found', dash_no_gaps_sub: 'Looks all closed — retake the diagnostic to be sure.',
    dash_empty: 'Nothing yet',
    xray_title: 'X-ray', xray_root_found: 'Root found', xray_root_node: 'Root node',
    xray_close_gap: 'Close the gap', xray_chain: 'Chain',
    xray_need_diag: 'Diagnostic first', xray_need_diag_head: 'The X-ray appears after a diagnostic',
    xray_need_diag_sub: 'The X-ray shows not the mistake but its cause — the topic everything broke from. Finding it needs your answers.',
    task_level: 'Level', task_your_answer: 'Your answer', task_wrong: 'Not this time',
    task_explain_simpler: "Didn't get it, explain simpler", task_next: 'Next task',
    task_correct: 'Correct.', task_checking: 'Checking this was not a guess…',
    task_ask_socrates: 'Ask Socrates', task_explain_own: 'Explain in your own words',
    feynman_mode: 'Feynman mode', feynman_explain: 'Explain',
    feynman_speak: 'Speak', feynman_stop: 'Stop', feynman_analyze: 'Check my understanding',
    set_title: 'Settings', set_profile: 'Profile', set_school_class: 'School and class',
    set_school: 'School', set_class_code: 'Class code from your teacher', set_save: 'Save',
    set_lang: 'Interface language', set_a11y: 'Accessibility modes', set_signout: 'Sign out',
    set_lang_changed: 'Language changed',
  },
};

let current = localStorage.getItem('tamyr_lang') || 'ru';

export function setLang(lang) { current = lang; localStorage.setItem('tamyr_lang', lang); document.documentElement.lang = lang; }
export function getLang() { return current; }
export function t(key) { return dict[current]?.[key] ?? dict.ru[key] ?? key; }
export function titleFor(row) { return row?.[`title_${current}`] || row?.title_ru || row?.title || ''; }

/** BCP-47 tag for Intl/speech APIs, which don't accept our bare 'kk'/'ru' codes. */
export function localeTag() { return { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }[current] || 'ru-RU'; }
