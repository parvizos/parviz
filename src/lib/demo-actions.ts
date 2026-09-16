"use server";

import { revalidatePath } from "next/cache";
import {
  ensureWorkspace,
  setWorkspace,
  currentWorkspace,
  demoDb,
  demoAvailable,
  type Workspace,
} from "@/db";
import { areas } from "@/db/schema";
import { isAuthed } from "@/lib/session";
import { seedDemo, wipeDemo } from "@/db/demo-seed";

async function demoHasData(): Promise<boolean> {
  if (!demoDb) return false;
  const rows = await demoDb.select({ id: areas.id }).from(areas).limit(1);
  return rows.length > 0;
}

/** Войти в демо: отдельная база наполняется (если пуста) и становится активной. */
export async function enterDemo(): Promise<void> {
  if (!(await isAuthed())) throw new Error("unauthorized");
  if (!demoAvailable || !demoDb) return;
  await ensureWorkspace("demo");
  if (!(await demoHasData())) await seedDemo(demoDb);
  setWorkspace("demo");
  revalidatePath("/", "layout");
}

/** Вернуться к своим настоящим данным. */
export async function exitDemo(): Promise<void> {
  setWorkspace("real");
  revalidatePath("/", "layout");
}

/** Перезалить демо-данные заново (очистить и наполнить). */
export async function refreshDemo(): Promise<void> {
  if (!(await isAuthed())) throw new Error("unauthorized");
  if (!demoAvailable || !demoDb) return;
  await ensureWorkspace("demo");
  await wipeDemo(demoDb);
  await seedDemo(demoDb);
  setWorkspace("demo");
  revalidatePath("/", "layout");
}

/** Текущий воркспейс — для баннера и настроек. */
export async function getWorkspace(): Promise<Workspace> {
  return currentWorkspace();
}
