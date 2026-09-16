/*
 * Наполнение ДЕМО-базы «под завязку»: много данных во всех разделах, чтобы
 * показать приложение живым (для видео/демо). Пишет только в переданную базу
 * (демо), реальные данные не трогаются.
 */
import type { DrizzleDb } from "./index";
import {
  areas,
  projects,
  tasks,
  subjects,
  lessons,
  notes,
  journal,
  accounts,
  categories,
  transactions,
  exchangeRates,
  organizations,
  people,
  meetings,
  credentials,
  grades,
  exams,
  attendance,
  studySessions,
  topics,
  materials,
  files,
  links,
  tags,
  entityTags,
  debts,
  debtPayments,
  planned,
  goals,
  goalContributions,
  images,
} from "./schema";
import { encryptSecret } from "@/lib/crypto";

/** Все таблицы в порядке «дети → родители» — для полной очистки демо-базы. */
const ALL_TABLES = [
  transactions, debtPayments, goalContributions, planned, goals, debts,
  attendance, grades, exams, studySessions, topics, materials, files,
  entityTags, tags, links, lessons, notes, meetings, credentials, journal,
  tasks, people, organizations, accounts, categories, subjects, projects,
  areas, images, exchangeRates,
];

/** Полностью очистить демо-базу (для «Обновить демо-данные»). */
export async function wipeDemo(db: DrizzleDb): Promise<void> {
  for (const table of ALL_TABLES) {
    await db.delete(table);
  }
}

function iso(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
const rub = (n: number) => Math.round(n * 100);
const at = <T>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];

/** Наполнить демо-базу. Возвращает число созданных задач (для лога). */
export async function seedDemo(db: DrizzleDb): Promise<void> {
  /* ── Сферы ── */
  const areaRows = await db
    .insert(areas)
    .values([
      {
        name: "Универ",
        color: "#5b5bd6",
        icon: "🎓",
        position: 0,
        body: "<h2>Цель на семестр</h2><p>Закрыть сессию без хвостов, средний балл <strong>≥ 4.5</strong>.</p><ul><li>Не пропускать пары без причины</li><li>Курсовую сдать за неделю до дедлайна</li></ul>",
      },
      { name: "Здоровье", color: "#d64545", icon: "💪", position: 1, body: "<h2>Режим</h2><p>Зал 3 раза в неделю, сон 7–8 часов, вода.</p><blockquote>Тело — это тоже проект.</blockquote>" },
      { name: "Личное", color: "#2f9e6f", icon: "🏠", position: 2 },
      { name: "Работа", color: "#c9832a", icon: "💼", position: 3 },
      { name: "Хобби", color: "#c4488f", icon: "🎧", position: 4 },
      { name: "Финансы", color: "#0f9a8f", icon: "💰", position: 5 },
    ])
    .returning({ id: areas.id });
  const [aUni, aHealth, aPersonal, aWork, aHobby] = areaRows.map((a) => a.id);

  /* ── Предметы ── */
  const subjRows = await db
    .insert(subjects)
    .values([
      { name: "Матанализ", teacher: "Иванов И. И.", color: "#5b5bd6", icon: "📐", areaId: aUni, credits: 6, position: 0, body: "<h2>Формат экзамена</h2><p>Устно, два теоретических вопроса + задача.</p><ul><li>Разрешён один рукописный лист</li><li>Главные темы: пределы, ряды, интегралы</li></ul><blockquote>Иванов любит строгие определения.</blockquote>" },
      { name: "Программирование", teacher: "Петров П. П.", color: "#0f9a8f", icon: "💻", areaId: aUni, credits: 5, position: 1, body: "<h2>Зачёт</h2><p>Защита проекта + мини-собеседование по алгоритмам.</p><ul><li>Курс на Stepik — обязателен</li><li>Сдавать через GitHub</li></ul>" },
      { name: "История", teacher: "Сидорова А. В.", color: "#c9832a", icon: "📜", areaId: aUni, credits: 3, position: 2 },
      { name: "Физика", teacher: "Кузнецов Д. С.", color: "#3b82c4", icon: "⚛️", areaId: aUni, credits: 5, position: 3 },
      { name: "Английский", teacher: "Смирнова Е. Н.", color: "#c4488f", icon: "🇬🇧", areaId: aUni, credits: 3, position: 4 },
    ])
    .returning({ id: subjects.id });
  const subj = subjRows.map((s) => s.id);
  const [ma, prog, hist, phys, eng] = subj;

  /* ── Расписание (недельная сетка) ── */
  const lessonKinds = ["lecture", "seminar", "lab", "practice"] as const;
  const lessonVals: (typeof lessons.$inferInsert)[] = [];
  const times = [
    ["09:00", "10:30"],
    ["10:45", "12:15"],
    ["13:00", "14:30"],
    ["14:45", "16:15"],
  ];
  let li = 0;
  for (let day = 1; day <= 5; day++) {
    const count = 2 + (day % 3); // 2–4 пары в день
    for (let k = 0; k < count; k++) {
      lessonVals.push({
        subjectId: at(subj, li),
        dayOfWeek: day,
        startTime: times[k][0],
        endTime: times[k][1],
        location: `ауд. ${300 + ((li * 7) % 120)}`,
        kind: at(lessonKinds as unknown as string[], li) as (typeof lessonKinds)[number],
      });
      li++;
    }
  }
  // У первой пары — подробные заметки (база знаний с фото).
  lessonVals[0].body =
    "<h2>Особенности пары</h2><p>Лекцию ведёт сам профессор, отмечает посещаемость в начале.</p><ul><li>Приносить ноутбук</li><li>Слайды выкладывает после лекции</li><li>Иногда мини-опрос в конце</li></ul><blockquote>Сидеть ближе — плохо слышно в конце аудитории.</blockquote>";
  await db.insert(lessons).values(lessonVals);

  /* ── Организации и люди ── */
  const orgRows = await db
    .insert(organizations)
    .values([
      { name: "МГУ", kind: "university", color: "#5b5bd6", icon: "🎓" },
      { name: "Кофейня «Бариста»", kind: "company", color: "#c9832a", icon: "☕", note: "Подработка по выходным." },
      { name: "IT-стартап «Кодзилла»", kind: "company", color: "#0f9a8f", icon: "🚀" },
      { name: "Спортзал «Титан»", kind: "other", color: "#d64545", icon: "🏋️" },
    ])
    .returning({ id: organizations.id });
  const [univ, cafe, startup, gym] = orgRows.map((o) => o.id);

  const socialsFor = (i: number) =>
    i % 3 === 0
      ? [{ kind: "telegram" as const, value: `user${i}` }]
      : i % 3 === 1
        ? [
            { kind: "instagram" as const, value: `insta.${i}` },
            { kind: "telegram" as const, value: `tg${i}` },
          ]
        : [{ kind: "whatsapp" as const, value: `+7999${100000 + i}` }];
  const personNames = [
    ["Иванов И. И.", "Научный руководитель", univ, "👨‍🏫", "#5b5bd6"],
    ["Аня", "Одногруппница", univ, "🙂", "#c4488f"],
    ["Марк", "Старший бариста", cafe, "☕", "#c9832a"],
    ["Дима", "Друг детства", null, "🎮", "#0f9a8f"],
    ["Лена", "Сестра", null, "🌸", "#2f9e6f"],
    ["Тимур", "Тимлид", startup, "💻", "#3b82c4"],
    ["Ольга", "Староста", univ, "📋", "#8b5cd6"],
    ["Костя", "Сосед по общаге", univ, "🎸", "#d9662b"],
    ["Настя", "Девушка", null, "❤️", "#d64545"],
    ["Ринат", "Тренер", gym, "🏋️", "#6a6a76"],
    ["Мама", "Семья", null, "💛", "#c9832a"],
    ["Профессор Кузнецов", "Преподаватель физики", univ, "⚛️", "#3b82c4"],
  ] as const;
  // Досье (база знаний) у нескольких людей — свободный текст с разметкой.
  const personBodies: Record<number, string> = {
    0: "<h2>Научрук</h2><p>Ведёт курсовую по <strong>рядам Фурье</strong>. Любит чёткий план и ссылки на источники.</p><ul><li>Консультации — по средам после семинара</li><li>Ответы в почте — в течение дня</li><li>Не любит воду во введении</li></ul><blockquote>«Сначала гипотеза, потом расчёт.»</blockquote>",
    1: "<h2>Аня</h2><p>Одногруппница, вместе готовимся к сессии. Сильна в матанализе, я помогаю с программированием.</p><ul><li>Скидывает свои конспекты</li><li>Договорились заниматься по субботам</li></ul>",
    5: "<h2>Тимлид на стажировке</h2><p>Тимур — тимлид в «Кодзилле». Даёт задачи по фронту, ревьюит PR.</p><ul><li>Стендапы в 11:00</li><li>Любит маленькие коммиты и понятные описания</li></ul>",
    8: "<h2>Настя ❤️</h2><p>Годовщина — в мае. Любит рамен, прогулки у реки и настолки.</p><ul><li>Аллергия на кошек</li><li>Мечтает съездить в Питер</li></ul>",
    10: "<h2>Мама</h2><p>Созваниваемся по выходным. Приготовить список, что привезти домой.</p><blockquote>Не забыть поздравить с днём рождения заранее.</blockquote>",
  };
  const peopleRows = await db
    .insert(people)
    .values(
      personNames.map(([name, role, orgId, icon, color], i) => ({
        name,
        role,
        organizationId: orgId as string | null,
        icon,
        color,
        birthday: iso(((i * 37) % 300) - 150).replace(/^\d{4}/, String(2000 + (i % 6))),
        phone: i % 2 === 0 ? `+7 999 ${100 + i}-${20 + i}-${30 + i}` : null,
        email: i % 3 === 0 ? `person${i}@example.com` : null,
        socials: socialsFor(i),
        note: i % 4 === 0 ? "Познакомились в универе." : null,
        body: personBodies[i] ?? null,
        position: i,
      })),
    )
    .returning({ id: people.id });
  const ppl = peopleRows.map((p) => p.id);

  /* ── Проекты ── */
  const projRows = await db
    .insert(projects)
    .values([
      { name: "Курсовая работа", notes: "Тема, план, глава 1–3, защита.", areaId: aUni, dueDate: iso(24), body: "<h2>Тема</h2><p>Ряды Фурье и их применение.</p><h2>План</h2><ul><li>Введение и обзор литературы</li><li>Глава 1 — теория</li><li>Глава 2 — расчёты</li><li>Глава 3 — примеры</li><li>Защита</li></ul><blockquote>Дедлайн у научрука — за неделю до сдачи.</blockquote>" },
      { name: "Подготовка к сессии", notes: "Закрыть все хвосты и экзамены.", areaId: aUni, dueDate: iso(20) },
      { name: "Марафон 10 км", notes: "Пробежать первый забег к весне.", areaId: aHealth, dueDate: iso(60) },
      { name: "Ремонт в комнате", notes: "Покраска, полка, лампа.", areaId: aPersonal, dueDate: iso(15) },
      { name: "Пет-проект: трекер привычек", notes: "MVP на выходные.", areaId: aHobby, dueDate: iso(30), body: "<h2>Идея</h2><p>Простой трекер привычек с напоминаниями и стриками.</p><h2>Стек</h2><ul><li>Next.js + SQLite</li><li>Графики прогресса</li><li>PWA, чтобы работало с телефона</li></ul>" },
      { name: "Стажировка в стартапе", notes: "Онбординг и первые задачи.", areaId: aWork, dueDate: iso(10) },
      { name: "Накопить на ноутбук", areaId: aPersonal, dueDate: iso(120) },
    ])
    .returning({ id: projects.id });
  const proj = projRows.map((p) => p.id);

  /* ── Задачи (много, вперемешку статусов/дат/приоритетов) ── */
  const taskTitles = [
    "Согласовать тему с научруком", "Собрать источники для курсовой", "Написать введение",
    "Прорешать задачи §4", "Сдать лабу №3", "Подготовить доклад по истории",
    "Купить продукты на неделю", "Записаться к врачу", "Оплатить интернет",
    "Пробежка 5 км", "Позвонить маме", "Забрать посылку",
    "Разобрать входящие письма", "Сделать презентацию", "Повторить английские слова",
    "Встретиться с Тимуром по стажировке", "Купить краску для стен", "Настроить CI для пет-проекта",
    "Прочитать главу по физике", "Заплатить за общагу", "Сходить в зал",
    "Написать отчёт за неделю", "Забронировать столик", "Обновить резюме",
    "Разобрать шкаф", "Сделать бэкап телефона", "Заказать книгу",
    "Подготовиться к контрольной", "Полить цветы", "Продлить подписку",
  ];
  const taskVals: (typeof tasks.$inferInsert)[] = taskTitles.map((title, i) => {
    const done = i % 4 === 0;
    const offset = (i % 6) - 2; // от -2 до +3 дней
    const withTime = i % 5 === 0;
    return {
      title,
      status: done ? ("done" as const) : ("open" as const),
      completedAt: done ? new Date() : null,
      priority: ((i * 3) % 4) as 0 | 1 | 2 | 3,
      scheduledDate: i % 3 === 0 ? iso(offset) : i % 3 === 1 ? iso(offset + 3) : null,
      scheduledTime: withTime ? at(["09:30", "12:00", "15:00", "18:30", "20:00"], i) : null,
      dueDate: i % 7 === 0 ? iso(offset + 5) : null,
      projectId: i % 2 === 0 ? at(proj, i) : null,
      areaId: at([aUni, aHealth, aPersonal, aWork, aHobby], i),
      subjectId: i % 4 === 1 ? at(subj, i) : null,
      personId: i % 5 === 2 ? at(ppl, i) : null,
    };
  });
  // Пара задач с подробным описанием (база знаний с фото).
  taskVals[2].body =
    "<h2>Введение курсовой</h2><p>Обосновать актуальность, поставить цель и задачи.</p><ul><li>Актуальность — 1 абзац</li><li>Цель + 3–4 задачи</li><li>Объект и предмет исследования</li></ul><blockquote>Согласовать формулировки с научруком до написания глав.</blockquote>";
  taskVals[17].body =
    "<h2>CI для пет-проекта</h2><p>Настроить автосборку и тесты на каждый пуш.</p><ul><li>GitHub Actions: lint + build + test</li><li>Кэш зависимостей</li><li>Бейдж статуса в README</li></ul>";
  // Несколько гарантированно просроченных и «на сегодня».
  taskVals.push(
    { title: "Сдать лабу по матанализу", areaId: aUni, subjectId: ma, scheduledDate: iso(-1), priority: 3 },
    { title: "Записаться в спортзал", areaId: aHealth, scheduledDate: iso(0), scheduledTime: "19:00", priority: 1 },
    { title: "Перезвонить в банк", scheduledDate: iso(0), scheduledTime: "14:00", priority: 2 },
  );
  await db.insert(tasks).values(taskVals);

  /* ── Оценки / сессия / посещаемость / фокус / темы / материалы ── */
  const gradeKinds = ["exam", "homework", "test", "project", "quiz"] as const;
  const gradeVals: (typeof grades.$inferInsert)[] = [];
  for (let i = 0; i < 28; i++) {
    gradeVals.push({
      subjectId: at(subj, i),
      value: 3 + (i % 3),
      maxValue: 5,
      weight: 1 + (i % 2),
      kind: at(gradeKinds as unknown as string[], i) as (typeof gradeKinds)[number],
      title: at(["Коллоквиум", "ДЗ", "Контрольная", "Проект", "Опрос", "Семинар"], i),
      date: iso(-(3 + i * 2)),
    });
  }
  await db.insert(grades).values(gradeVals);

  await db.insert(exams).values([
    { subjectId: prog, kind: "credit", date: iso(3), time: "10:00", location: "ауд. 401", readiness: 65 },
    { subjectId: ma, kind: "exam", date: iso(8), time: "09:00", location: "ауд. 312", readiness: 40, note: "Повторить ряды и пределы" },
    { subjectId: phys, kind: "exam", date: iso(12), time: "11:00", location: "ауд. 220", readiness: 25 },
    { subjectId: hist, kind: "exam", date: iso(17), readiness: 15 },
    { subjectId: eng, kind: "credit", date: iso(5), time: "13:00", readiness: 80 },
    { subjectId: hist, kind: "credit", date: iso(-12), passedAt: new Date(), grade: 5, autopass: true, readiness: 100 },
  ]);

  const attStatuses = ["present", "present", "present", "late", "absent", "excused"] as const;
  const attVals: (typeof attendance.$inferInsert)[] = [];
  for (let i = 0; i < 45; i++) {
    attVals.push({
      subjectId: at(subj, i),
      date: iso(-(2 + i)),
      status: at(attStatuses as unknown as string[], i) as (typeof attStatuses)[number],
    });
  }
  await db.insert(attendance).values(attVals);

  const focusVals: (typeof studySessions.$inferInsert)[] = [];
  for (let i = 0; i < 24; i++) {
    focusVals.push({ subjectId: at(subj, i), seconds: (25 + (i % 3) * 25) * 60, date: iso(-i) });
  }
  await db.insert(studySessions).values(focusVals);

  const topicStatuses = ["known", "known", "learning", "review", "not_started"] as const;
  const topicTitles = [
    "Пределы", "Производная", "Ряды", "Интегралы", "Функции многих переменных",
    "Массивы", "Рекурсия", "Динамическое программирование", "Графы", "Хеш-таблицы",
    "Кинематика", "Динамика", "Электричество", "Оптика",
    "Present Perfect", "Модальные глаголы", "Пассивный залог",
    "Древний мир", "Средние века", "Новое время",
  ];
  await db.insert(topics).values(
    topicTitles.map((title, i) => ({
      subjectId: at(subj, Math.floor(i / 4)),
      title,
      status: at(topicStatuses as unknown as string[], i) as (typeof topicStatuses)[number],
      position: i % 4,
    })),
  );

  await db.insert(materials).values([
    { subjectId: ma, title: "Методичка по матанализу", kind: "link", url: "https://drive.google.com/file/methodichka" },
    { subjectId: ma, title: "Лекция: ряды", kind: "video", url: "https://www.youtube.com/watch?v=ryady" },
    { subjectId: prog, title: "Курс на Stepik", kind: "link", url: "https://stepik.org/course/123" },
    { subjectId: prog, title: "Документация по алгоритмам", kind: "link", url: "https://ru.algorithmica.org" },
    { subjectId: phys, title: "Разбор задач Иродова", kind: "video", url: "https://youtu.be/irodov" },
    { subjectId: eng, title: "Тренажёр слов", kind: "link", url: "https://quizlet.com/demo" },
  ]);

  /* ── Конспекты ── */
  const noteBodies = [
    "<h2>Основное</h2><p>Определение предела по Коши: для любого ε&gt;0 найдётся δ&gt;0…</p><ul><li>Теоремы о непрерывных функциях</li><li>Замечательные пределы</li></ul><blockquote>Проверить на семинаре в среду.</blockquote>",
    "<p>База и шаг рекурсии.</p><p>Примеры: факториал, Фибоначчи.</p><p>Мемоизация — кэшируем результаты повторных вызовов.</p>",
    "<h2>Графы</h2><p>Обход в ширину (BFS) и в глубину (DFS).</p><ul><li>Список смежности</li><li>Очередь / стек</li></ul>",
    "<p>Второй закон Ньютона: <strong>F = ma</strong>.</p><p>Разобрать блоки и наклонную плоскость.</p>",
    "<h2>Present Perfect</h2><p>have/has + V3. Опыт, результат, недавнее действие.</p>",
  ];
  await db.insert(notes).values(
    Array.from({ length: 10 }, (_, i) => ({
      title: at(["Пределы и непрерывность", "Рекурсия и мемоизация", "Графы и обходы", "Законы Ньютона", "Времена в английском", "Ряды Фурье", "Динамическое программирование", "Оптика", "Средние века", "Интегралы"], i),
      body: at(noteBodies, i),
      subjectId: at(subj, i),
      pinned: i < 2,
    })),
  );

  /* ── Ежедневник ── */
  const journalVals: (typeof journal.$inferInsert)[] = [];
  const moods = [5, 4, 3, 4, 5, 2, 4, 3, 5, 4];
  const journalTagSets = [
    ["учёба", "матан"],
    ["настя"],
    ["друзья"],
    ["спорт", "зал"],
    ["работа", "стажировка"],
    ["дом"],
    ["учёба", "код"],
    ["настя", "кино"],
  ];
  for (let i = 0; i < 35; i++) {
    if (i % 5 === 3) continue; // не каждый день
    journalVals.push({
      date: iso(-i),
      mood: at(moods, i),
      body: `<p>${at(["Продуктивный день — закрыл пару задач.", "Учился весь вечер, устал.", "Гулял с друзьями, отдохнул.", "Тренировка + немного кода.", "Ничего особенного, обычный день."], i)}</p>`,
      tags: i % 2 === 0 ? at(journalTagSets, i) : null,
    });
  }
  await db.insert(journal).values(journalVals);

  /* ── Финансы ── */
  const accRows = await db
    .insert(accounts)
    .values([
      { name: "Карта Т-Банк", kind: "card", currency: "RUB", openingBalance: rub(12000), color: "#5b5bd6", icon: "💳", position: 0 },
      { name: "Наличные", kind: "cash", currency: "RUB", openingBalance: rub(9000), color: "#2f9e6f", icon: "💵", position: 1 },
      { name: "Копилка", kind: "savings", currency: "RUB", openingBalance: rub(45000), color: "#c9832a", icon: "🐷", position: 2 },
      { name: "Долларовый счёт", kind: "card", currency: "USD", openingBalance: rub(500), color: "#0f9a8f", icon: "💲", position: 3 },
    ])
    .returning({ id: accounts.id });
  const acc = accRows.map((a) => a.id);
  const [card, cash, piggy] = acc;

  await db.insert(exchangeRates).values([
    { code: "USD", rateToBase: 92 },
    { code: "EUR", rateToBase: 100 },
  ]);

  const expRows = await db
    .insert(categories)
    .values([
      { name: "Еда", kind: "expense", color: "#d9662b", icon: "🍔", monthlyBudget: rub(15000), position: 0 },
      { name: "Транспорт", kind: "expense", color: "#3b82c4", icon: "🚌", monthlyBudget: rub(3000), position: 1 },
      { name: "Учёба", kind: "expense", color: "#5b5bd6", icon: "🎓", monthlyBudget: rub(5000), position: 2 },
      { name: "Развлечения", kind: "expense", color: "#c4488f", icon: "🎮", monthlyBudget: rub(4000), position: 3 },
      { name: "Здоровье", kind: "expense", color: "#d64545", icon: "💊", position: 4 },
      { name: "Дом", kind: "expense", color: "#0f9a8f", icon: "🏠", position: 5 },
    ])
    .returning({ id: categories.id });
  const expCats = expRows.map((c) => c.id);
  const incRows = await db
    .insert(categories)
    .values([
      { name: "Стипендия", kind: "income", color: "#2f9e6f", icon: "🎓", position: 0 },
      { name: "Подработка", kind: "income", color: "#0f9a8f", icon: "💼", position: 1 },
      { name: "Родители", kind: "income", color: "#c9832a", icon: "💛", position: 2 },
    ])
    .returning({ id: categories.id });
  const incCats = incRows.map((c) => c.id);

  const txVals: (typeof transactions.$inferInsert)[] = [];
  const rubAcc = [card, cash]; // расходы только по рублёвым счетам
  // [категория, мин₽, макс₽, раз в N дней, заметки]
  const plan: [string, number, number, number, string[]][] = [
    [expCats[0], 120, 380, 1, ["кофе", "обед в столовой", "продукты", "перекус", "шаверма"]],
    [expCats[1], 55, 110, 2, ["проездной", "автобус", "метро", "самокат"]],
    [expCats[2], 300, 1200, 12, ["учебник", "распечатки", "онлайн-курс", "тетради"]],
    [expCats[3], 200, 800, 5, ["кино", "игра", "бар с друзьями", "подписка"]],
    [expCats[4], 250, 900, 13, ["аптека", "витамины", "стоматолог"]],
    [expCats[5], 300, 1500, 17, ["бытовая химия", "лампа", "мелочи для дома"]],
  ];
  for (let d = 0; d < 95; d++) {
    plan.forEach(([catId, lo, hi, every, notes], ci) => {
      if ((d + ci * 3) % every !== 0) return;
      const amount = lo + ((d * 97 + ci * 53) % (hi - lo));
      txVals.push({
        // Большинство расходов с карты, четверть — наличными.
        accountId: (d + ci) % 4 === 0 ? rubAcc[1] : rubAcc[0],
        kind: "expense",
        categoryId: catId,
        amount: rub(amount),
        date: iso(-d),
        note: at(notes, d + ci),
        areaId: ci === 2 ? aUni : null,
        subjectId: ci === 2 && d % 3 === 0 ? at(subj, d) : null,
        personId: ci === 3 && d % 6 === 0 ? at(ppl, d) : null,
      });
    });
  }
  // Небольшие покупки по долларовому счёту — суммы в реальных $.
  txVals.push(
    { accountId: acc[3], kind: "expense", categoryId: expCats[3], amount: rub(9), date: iso(-8), note: "Spotify" },
    { accountId: acc[3], kind: "expense", categoryId: expCats[2], amount: rub(29), date: iso(-22), note: "курс на Udemy" },
    { accountId: acc[3], kind: "expense", categoryId: expCats[3], amount: rub(15), date: iso(-44), note: "игра в Steam" },
  );
  // Доходы: стипендия + подработка ежемесячно, иногда от родителей.
  for (let m = 0; m < 4; m++) {
    txVals.push(
      { accountId: card, kind: "income", categoryId: incCats[0], amount: rub(9000), date: iso(-m * 30 - 3), note: "стипендия" },
      { accountId: card, kind: "income", categoryId: incCats[1], amount: rub(7000 + m * 500), date: iso(-m * 30 - 12), note: "смены в кофейне" },
    );
    if (m % 2 === 0) txVals.push({ accountId: cash, kind: "income", categoryId: incCats[2], amount: rub(6000), date: iso(-m * 30 - 18), note: "от мамы" });
  }
  // Накопления: переводы в копилку.
  txVals.push(
    { accountId: card, toAccountId: piggy, kind: "transfer", amount: rub(4000), date: iso(-15), note: "в копилку" },
    { accountId: card, toAccountId: piggy, kind: "transfer", amount: rub(3000), date: iso(-45), note: "в копилку" },
  );
  await db.insert(transactions).values(txVals);

  /* ── Встречи ── */
  await db.insert(meetings).values([
    { title: "Обсудили тему курсовой", date: iso(-3), personId: at(ppl, 0), location: "Кафедра, ауд. 512", body: "<p>Научрук одобрил направление — <strong>ряды Фурье</strong>.</p><h2>Что решили</h2><ul><li>Собрать 5 источников</li><li>План из трёх глав</li></ul>" },
    { title: "Кофе с Аней перед сессией", date: iso(-2), personId: at(ppl, 1), location: "Кофейня «Бариста»", body: "<p>Договорились готовиться вместе в субботу. Аня скинет конспекты.</p>" },
    { title: "Онбординг в стартапе", date: iso(-5), personId: at(ppl, 5), location: "Zoom", body: "<p>Познакомили с командой, дали доступы, первая задача — поправить баг в форме.</p>" },
    { title: "Тренировка с Ринатом", date: iso(-1), personId: at(ppl, 9), location: "Спортзал «Титан»", body: "<p>Разобрали технику приседа. План на месяц готов.</p>" },
    { title: "Звонок с мамой", date: iso(-4), personId: at(ppl, 10), body: "<p>Рассказал про универ, договорились приехать на выходные.</p>" },
    { title: "Смена с Марком", date: iso(-6), personId: at(ppl, 2), location: "Кофейня «Бариста»", body: "<p>Показал, как держать темп в час пик.</p>" },
  ]);

  /* ── Долги / планы / цели ── */
  await db.insert(debts).values([
    { direction: "owed_to_me", personId: at(ppl, 1), title: "за билеты на концерт", currency: "RUB", principal: rub(3000), date: iso(-14), dueDate: iso(7) },
    { direction: "i_owe", personId: at(ppl, 2), title: "скинул на обед", currency: "RUB", principal: rub(1500), date: iso(-6), dueDate: iso(-1) },
    { direction: "i_owe", counterparty: "Брат", title: "занял до стипендии", currency: "RUB", principal: rub(5000), date: iso(-9), dueDate: iso(5) },
    { direction: "owed_to_me", personId: at(ppl, 3), title: "за игру в Steam", currency: "RUB", principal: rub(1200), date: iso(-3), dueDate: iso(20) },
  ]);
  await db.insert(planned).values([
    { title: "Spotify", kind: "expense", amount: rub(299), accountId: card, categoryId: at(expCats, 3), recurrence: "month", nextDate: iso(6), autopost: true, note: "подписка" },
    { title: "Интернет", kind: "expense", amount: rub(600), accountId: card, recurrence: "month", nextDate: iso(12), autopost: true },
    { title: "Абонемент в зал", kind: "expense", amount: rub(1500), accountId: card, categoryId: at(expCats, 4), recurrence: "month", nextDate: iso(2) },
    { title: "Netflix", kind: "expense", amount: rub(599), accountId: card, categoryId: at(expCats, 3), recurrence: "month", nextDate: iso(9), autopost: true },
    { title: "Стипендия", kind: "income", amount: rub(8000), accountId: card, categoryId: at(incCats, 0), recurrence: "month", nextDate: iso(4), autopost: true },
  ]);
  await db.insert(goals).values([
    { title: "Новый ноутбук", targetAmount: rub(90000), currency: "RUB", accountId: piggy, dueDate: iso(150), icon: "💻", color: "#5b5bd6", position: 0 },
    { title: "Поездка летом", targetAmount: rub(60000), currency: "RUB", icon: "✈️", color: "#2f9e6f", dueDate: iso(240), position: 1 },
    { title: "Подушка безопасности", targetAmount: rub(120000), currency: "RUB", accountId: piggy, icon: "🛡️", color: "#0f9a8f", position: 2 },
  ]);

  /* ── Пароли ── */
  const creds: [string, string, string, string, string][] = [
    ["Gmail", "parviz@gmail.com", "mail.google.com", "Почта", "demo-Gmail-42!"],
    ["Telegram", "+7 999 100-20-30", "web.telegram.org", "Соцсети", "tg_demo_9931"],
    ["Steam", "parviz_game", "steampowered.com", "Игры", "st3am!Demo"],
    ["ВКонтакте", "parviz", "vk.com", "Соцсети", "vkDemoPass77"],
    ["Т-Банк", "+7 999 100-20-30", "tbank.ru", "Банки", "b@nkDemo2026"],
    ["Личный кабинет МГУ", "s.parviz", "lk.msu.ru", "Учёба", "uniPass2026#"],
    ["GitHub", "parvizos", "github.com", "Работа", "gh_demo_token!"],
    ["Netflix", "parviz@gmail.com", "netflix.com", "Развлечения", "netflixDemo1"],
    ["Wi-Fi дома", "PARVIZ_5G", "", "Дом", "homeWifiDemo"],
    ["Epic Games", "parviz.epic", "epicgames.com", "Игры", "epicDemo!22"],
  ];
  await db.insert(credentials).values(
    creds.map(([title, username, url, category, pass], i) => ({
      title,
      username,
      url: url || null,
      category,
      passwordCipher: encryptSecret(pass),
      favorite: i < 2,
      position: i,
    })),
  );
}
