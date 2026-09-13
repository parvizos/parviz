/*
 * Необязательные демо-данные, чтобы увидеть систему живой.
 * Запуск:  npm run db:seed
 * Сброс:   удали файл базы (data/parviz.db) и запусти снова.
 */
import { db, schemaReady } from "./index";
import { areas, projects, tasks, subjects, lessons, notes } from "./schema";

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
      body: "Определение предела по Коши.\nТеоремы о непрерывных функциях.\nЗамечательные пределы.",
      subjectId: ma.id,
      pinned: true,
    },
    {
      title: "Рекурсия и мемоизация",
      body: "База и шаг рекурсии.\nПримеры: факториал, Фибоначчи.\nМемоизация как оптимизация повторных вызовов.",
      subjectId: prog.id,
    },
  ]);

  await db.insert(tasks).values([
    { title: "Прорешать задачи §4", subjectId: ma.id, areaId: study.id, scheduledDate: today(1), priority: 2 },
    { title: "Сдать лабу №3 по программированию", subjectId: prog.id, areaId: study.id, scheduledDate: today(0), priority: 3 },
    { title: "Подготовить доклад по истории", subjectId: hist.id, areaId: study.id, scheduledDate: today(4), priority: 1 },
  ]);

  console.log("Готово: добавлены демо-данные (сферы, проект, задачи, учёба).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
