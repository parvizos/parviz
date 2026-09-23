"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import { terms, subjects } from "@/db/schema";

function reval() {
  revalidatePath("/", "layout");
}

const nameSchema = z.string().trim().min(1, "Введите название").max(120);

/** Создаёт семестр; makeActive — сразу сделать активным. */
export async function createTerm(name: string, makeActive = false) {
  await schemaReady();
  const nm = nameSchema.parse(name);
  const [{ m }] = await db
    .select({ m: sql<number>`coalesce(max(${terms.position}), -1)` })
    .from(terms);
  if (makeActive) {
    await db.update(terms).set({ active: false }).where(eq(terms.active, true));
  }
  const [row] = await db
    .insert(terms)
    .values({ name: nm, position: Number(m) + 1, active: makeActive })
    .returning();
  reval();
  return row;
}

export async function renameTerm(id: string, name: string) {
  await schemaReady();
  const nm = nameSchema.parse(name);
  await db
    .update(terms)
    .set({ name: nm, updatedAt: new Date() })
    .where(eq(terms.id, id));
  reval();
}

/** Делает семестр активным (ровно один активный). */
export async function setActiveTerm(id: string) {
  await schemaReady();
  await db.update(terms).set({ active: false }).where(eq(terms.active, true));
  await db.update(terms).set({ active: true }).where(eq(terms.id, id));
  reval();
}

/** Удаляет семестр — только пустой (иначе там история). */
export async function deleteTerm(id: string) {
  await schemaReady();
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(subjects)
    .where(eq(subjects.termId, id));
  if (Number(c) > 0) {
    throw new Error("В семестре есть предметы — сначала перенеси или удали их.");
  }
  const [row] = await db
    .select({ active: terms.active })
    .from(terms)
    .where(eq(terms.id, id))
    .limit(1);
  await db.delete(terms).where(eq(terms.id, id));
  // Если удалили активный — активируем самый свежий из оставшихся.
  if (row?.active) {
    const [last] = await db
      .select({ id: terms.id })
      .from(terms)
      .orderBy(desc(terms.position))
      .limit(1);
    if (last) {
      await db.update(terms).set({ active: true }).where(eq(terms.id, last.id));
    }
  }
  reval();
}

/** «Новый семестр»: создаёт и сразу активирует. */
export async function startNewSemester(name: string) {
  return createTerm(name, true);
}
