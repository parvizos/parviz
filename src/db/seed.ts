/*
 * Необязательные демо-данные, чтобы увидеть систему живой.
 * Запуск:  npm run db:seed
 * Сброс:   удали файл базы (data/parviz.db) и запусти снова.
 */
import { db, schemaReady } from "./index";
import { areas, projects, tasks } from "./schema";

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
    .values({ name: "Учёба", color: "#5b5bd6", icon: "🎓", position: 0 })
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

  console.log("Готово: добавлены демо-сферы, проект и задачи.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
