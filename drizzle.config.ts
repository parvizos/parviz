import { defineConfig } from "drizzle-kit";

// Генерация миграций — стандартный диалект SQLite (совместим с libSQL).
// Применяются миграции в рантайме через drizzle-orm/libsql/migrator (см. src/db/index.ts).
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
