/*
 * Необязательные демо-данные, чтобы увидеть систему живой.
 * Запуск:  npm run db:seed
 * Сброс:   удали файл базы (data/parviz.db) и запусти снова.
 */
import { db, schemaReady } from "./index";
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
  organizations,
  people,
  exchangeRates,
  debts,
  debtPayments,
  planned,
  goals,
  goalContributions,
} from "./schema";

const rub = (n: number) => n * 100; // рубли → копейки

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

function today(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await schemaReady();

  const existing = await db.select({ id: areas.id }).from(areas).limit(1);
  if (existing.length > 0) {
    console.log("В базе уже есть данные — пропускаю. (Удали data/parviz.db, чтобы пересоздать.)");
    return;
  }

  const [study] = await db
    .insert(areas)
    .values({ name: "Универ", color: "#5b5bd6", icon: "🎓", position: 0 })
    .returning();
  const [personal] = await db
    .insert(areas)
    .values({ name: "Личное", color: "#2f9e6f", icon: "🏠", position: 1 })
    .returning();
  const [health] = await db
    .insert(areas)
    .values({ name: "Здоровье", color: "#d64545", icon: "💪", position: 2 })
    .returning();

  const [course] = await db
    .insert(projects)
    .values({
      name: "Курсовая работа",
      notes: "Тема, план, глава 1–3, защита.",
      areaId: study.id,
      dueDate: today(21),
    })
    .returning();

  await db.insert(tasks).values([
    {
      title: "Согласовать тему с научником",
      projectId: course.id,
      areaId: study.id,
      scheduledDate: today(0),
      priority: 3,
    },
    {
      title: "Составить план глав",
      projectId: course.id,
      areaId: study.id,
      scheduledDate: today(2),
      priority: 2,
    },
    {
      title: "Собрать источники и литературу",
      projectId: course.id,
      areaId: study.id,
      priority: 1,
    },
    {
      title: "Сдать лабу по матанализу",
      areaId: study.id,
      scheduledDate: today(-1),
      priority: 3,
    },
    {
      title: "Записаться в спортзал",
      areaId: health.id,
      scheduledDate: today(0),
    },
    {
      title: "Купить продукты на неделю",
      areaId: personal.id,
      scheduledDate: today(1),
    },
    { title: "Придумать, куда съездить на каникулах" },
    { title: "Разобрать заметки в телефоне" },
  ]);

  // Учёба: предметы, расписание, конспекты, домашка.
  const [ma] = await db
    .insert(subjects)
    .values({
      name: "Матанализ",
      teacher: "Иванов И. И.",
      color: "#5b5bd6",
      icon: "📐",
      areaId: study.id,
      position: 0,
    })
    .returning();
  const [prog] = await db
    .insert(subjects)
    .values({
      name: "Программирование",
      teacher: "Петров П. П.",
      color: "#3b82c4",
      icon: "💻",
      areaId: study.id,
      position: 1,
    })
    .returning();
  const [hist] = await db
    .insert(subjects)
    .values({
      name: "История",
      teacher: "Сидорова А. А.",
      color: "#c9832a",
      icon: "📜",
      areaId: study.id,
      position: 2,
    })
    .returning();

  await db.insert(lessons).values([
    { subjectId: ma.id, dayOfWeek: 1, startTime: "09:00", endTime: "10:30", kind: "lecture", location: "ауд. 312" },
    { subjectId: prog.id, dayOfWeek: 1, startTime: "10:45", endTime: "12:15", kind: "lab", location: "ауд. 401" },
    { subjectId: ma.id, dayOfWeek: 3, startTime: "09:00", endTime: "10:30", kind: "seminar", location: "ауд. 312" },
    { subjectId: hist.id, dayOfWeek: 3, startTime: "12:30", endTime: "14:00", kind: "seminar", location: "ауд. 210" },
    { subjectId: prog.id, dayOfWeek: 5, startTime: "10:45", endTime: "12:15", kind: "lecture", location: "поток" },
  ]);

  await db.insert(notes).values([
    {
      title: "Пределы и непрерывность",
      body: "<h2>Основное</h2><p>Определение предела по Коши: для любого ε&gt;0 найдётся δ&gt;0…</p><ul><li>Теоремы о непрерывных функциях</li><li>Замечательные пределы</li></ul><blockquote>Проверить на семинаре в среду.</blockquote>",
      subjectId: ma.id,
      pinned: true,
    },
    {
      title: "Рекурсия и мемоизация",
      body: "<p>База и шаг рекурсии.</p><p>Примеры: факториал, Фибоначчи.</p><p>Мемоизация — кэшируем результаты повторных вызовов.</p>",
      subjectId: prog.id,
    },
  ]);

  await db.insert(tasks).values([
    { title: "Прорешать задачи §4", subjectId: ma.id, areaId: study.id, scheduledDate: today(1), priority: 2 },
    { title: "Сдать лабу №3 по программированию", subjectId: prog.id, areaId: study.id, scheduledDate: today(0), priority: 3 },
    { title: "Подготовить доклад по истории", subjectId: hist.id, areaId: study.id, scheduledDate: today(4), priority: 1 },
  ]);

  await db.insert(journal).values([
    {
      date: today(-1),
      mood: 4,
      body: "<p>Разобрался с пределами, дошёл до практики.</p><p>Вечером устал, но день вышел продуктивным.</p>",
    },
    {
      date: today(0),
      mood: 3,
      body: "<p>План на день: лаба по программированию и продукты.</p>",
    },
  ]);

  // Финансы: счета, категории, операции.
  const [card] = await db
    .insert(accounts)
    .values({ name: "Карта", kind: "card", color: "#5b5bd6", icon: "💳", openingBalance: rub(24500), position: 0 })
    .returning();
  const [cash] = await db
    .insert(accounts)
    .values({ name: "Наличные", kind: "cash", color: "#2f9e6f", icon: "💵", openingBalance: rub(3000), position: 1 })
    .returning();
  const [piggy] = await db
    .insert(accounts)
    .values({ name: "Накопления", kind: "savings", color: "#c9832a", icon: "🐷", openingBalance: rub(50000), position: 2 })
    .returning();
  const [usd] = await db
    .insert(accounts)
    .values({ name: "Долларовый вклад", kind: "savings", currency: "USD", color: "#2f9e6f", icon: "💵", openingBalance: rub(600), position: 3 })
    .returning();

  // Курс доллара к рублю (правится вручную в Настройках/на Счетах).
  await db.insert(exchangeRates).values({ code: "USD", rateToBase: 92 });

  const [cFood] = await db.insert(categories).values({ name: "Еда", kind: "expense", color: "#d9662b", icon: "🍔", monthlyBudget: rub(15000), position: 0 }).returning();
  const [cTransport] = await db.insert(categories).values({ name: "Транспорт", kind: "expense", color: "#3b82c4", icon: "🚌", monthlyBudget: rub(3000), position: 1 }).returning();
  const [cStudy] = await db.insert(categories).values({ name: "Учёба", kind: "expense", color: "#5b5bd6", icon: "🎓", monthlyBudget: rub(5000), position: 2 }).returning();
  const [cFun] = await db.insert(categories).values({ name: "Развлечения", kind: "expense", color: "#c4488f", icon: "🎮", position: 3 }).returning();
  const [cScholar] = await db.insert(categories).values({ name: "Стипендия", kind: "income", color: "#2f9e6f", icon: "🎓", position: 0 }).returning();
  const [cSide] = await db.insert(categories).values({ name: "Подработка", kind: "income", color: "#0f9a8f", icon: "💼", position: 1 }).returning();

  await db.insert(transactions).values([
    { accountId: card.id, kind: "income", categoryId: cScholar.id, amount: rub(12000), date: today(-10), note: "Стипендия за сентябрь" },
    { accountId: card.id, kind: "income", categoryId: cSide.id, amount: rub(3500), date: today(-4), note: "Репетиторство" },
    { accountId: card.id, kind: "expense", categoryId: cFood.id, amount: rub(1250), date: today(-5), note: "Продукты", areaId: personal.id },
    { accountId: cash.id, kind: "expense", categoryId: cTransport.id, amount: rub(60), date: today(-1), note: "Проездной" },
    { accountId: card.id, kind: "expense", categoryId: cStudy.id, amount: rub(1200), date: today(-3), note: "Учебник по матанализу", subjectId: ma.id, areaId: study.id },
    { accountId: card.id, kind: "expense", categoryId: cFun.id, amount: rub(700), date: today(-2), note: "Кино с друзьями" },
    { accountId: card.id, kind: "expense", categoryId: cFood.id, amount: rub(890), date: today(0), note: "Обед в столовой" },
    { accountId: card.id, kind: "transfer", toAccountId: piggy.id, amount: rub(5000), date: today(-7), note: "Отложил" },
    { accountId: usd.id, kind: "expense", categoryId: cFun.id, amount: rub(15), date: today(-6), note: "Игра в Steam" },
  ]);

  // Люди и организации.
  const [univ] = await db
    .insert(organizations)
    .values({ name: "МГУ", kind: "university", color: "#5b5bd6", icon: "🎓", note: "Мой университет." })
    .returning();
  const [cafe] = await db
    .insert(organizations)
    .values({ name: "Кофейня «Бариста»", kind: "company", color: "#c9832a", icon: "☕", note: "Подработка по выходным." })
    .returning();

  const [supervisor] = await db
    .insert(people)
    .values({
      name: "Иванов И. И.",
      role: "Научный руководитель",
      organizationId: univ.id,
      email: "ivanov@msu.ru",
      icon: "👨‍🏫",
      color: "#5b5bd6",
      note: "Ведёт мою курсовую.",
    })
    .returning();
  const [anya] = await db
    .insert(people)
    .values({
      name: "Аня",
      role: "Одногруппница",
      organizationId: univ.id,
      phone: "+7 999 123-45-67",
      icon: "🙂",
      color: "#c4488f",
      birthday: today(9),
    })
    .returning();
  const [mark] = await db
    .insert(people)
    .values({
      name: "Марк",
      role: "Старший бариста",
      organizationId: cafe.id,
      icon: "☕",
      color: "#c9832a",
    })
    .returning();

  await db.insert(tasks).values([
    {
      title: "Обсудить курсовую с научруком",
      personId: supervisor.id,
      projectId: course.id,
      subjectId: ma.id,
      areaId: study.id,
      scheduledDate: today(2),
      priority: 2,
    },
  ]);
  await db.insert(transactions).values([
    {
      accountId: card.id,
      kind: "expense",
      categoryId: cFood.id,
      amount: rub(450),
      date: today(-2),
      note: "Кофе с Аней",
      personId: anya.id,
      areaId: personal.id,
    },
  ]);

  // Долги: мне должны и я должен, с частичным возвратом.
  const [anyaDebt] = await db
    .insert(debts)
    .values({
      direction: "owed_to_me",
      personId: anya.id,
      title: "за билеты на концерт",
      currency: "RUB",
      principal: rub(3000),
      date: today(-14),
      dueDate: today(7),
    })
    .returning();
  await db.insert(debtPayments).values({
    debtId: anyaDebt.id,
    amount: rub(1000),
    date: today(-3),
    accountId: card.id,
    note: "вернула часть",
  });
  await db.insert(debts).values([
    {
      direction: "i_owe",
      personId: mark.id,
      title: "подменил на смене, скинул на обед",
      currency: "RUB",
      principal: rub(1500),
      date: today(-6),
      dueDate: today(-1),
    },
    {
      direction: "i_owe",
      counterparty: "Брат",
      title: "занял до стипендии",
      currency: "RUB",
      principal: rub(5000),
      date: today(-9),
      dueDate: today(5),
    },
  ]);

  // Планы и подписки.
  await db.insert(planned).values([
    {
      title: "Spotify",
      kind: "expense",
      amount: rub(299),
      accountId: card.id,
      categoryId: cFun.id,
      recurrence: "month",
      nextDate: today(6),
      autopost: true,
      note: "подписка",
    },
    {
      title: "Интернет",
      kind: "expense",
      amount: rub(600),
      accountId: card.id,
      recurrence: "month",
      nextDate: today(12),
      autopost: true,
    },
    {
      title: "Абонемент в зал",
      kind: "expense",
      amount: rub(1500),
      accountId: card.id,
      categoryId: cFun.id,
      recurrence: "month",
      nextDate: today(0),
      autopost: false,
    },
    {
      title: "Стипендия за октябрь",
      kind: "income",
      amount: rub(12000),
      accountId: card.id,
      categoryId: cScholar.id,
      recurrence: "once",
      nextDate: today(4),
      autopost: false,
    },
  ]);

  // Цели накопления.
  const [laptopGoal] = await db
    .insert(goals)
    .values({
      title: "Новый ноутбук",
      targetAmount: rub(90000),
      currency: "RUB",
      accountId: piggy.id,
      dueDate: today(150),
      icon: "💻",
      color: "#5b5bd6",
      position: 0,
    })
    .returning();
  await db.insert(goalContributions).values([
    { goalId: laptopGoal.id, amount: rub(20000), date: today(-40), note: "стартовый" },
    { goalId: laptopGoal.id, amount: rub(15000), date: today(-10) },
  ]);
  await db.insert(goals).values({
    title: "Поездка летом",
    targetAmount: rub(60000),
    currency: "RUB",
    icon: "✈️",
    color: "#2f9e6f",
    dueDate: today(240),
    position: 1,
  });

  console.log(
    "Готово: демо-данные (сферы, проект, задачи, учёба, ежедневник, финансы, долги, планы, цели, люди).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
