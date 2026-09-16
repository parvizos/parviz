"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import { credentials } from "@/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { isAuthed } from "@/lib/session";

function revalidateVault() {
  revalidatePath("/", "layout");
}

const credentialSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  username: z.string().max(320).nullable().optional(),
  url: z.string().max(500).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  // undefined — не трогаем; "" — очистить; строка — задать/заменить.
  password: z.string().max(4000).nullable().optional(),
  favorite: z.boolean().optional(),
});

export type CredentialInput = z.input<typeof credentialSchema>;

export async function createCredential(input: CredentialInput) {
  await schemaReady();
  const d = credentialSchema.parse(input);
  const [row] = await db
    .insert(credentials)
    .values({
      title: d.title,
      username: d.username?.trim() || null,
      url: d.url?.trim() || null,
      category: d.category?.trim() || null,
      note: d.note?.trim() || null,
      passwordCipher: d.password ? encryptSecret(d.password) : null,
      favorite: d.favorite ?? false,
    })
    .returning({ id: credentials.id });
  revalidateVault();
  return row;
}

const updateSchema = credentialSchema.partial();
export type CredentialUpdate = z.input<typeof updateSchema>;

export async function updateCredential(id: string, input: CredentialUpdate) {
  await schemaReady();
  const d = updateSchema.parse(input);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) patch.title = d.title;
  if (d.username !== undefined) patch.username = d.username?.trim() || null;
  if (d.url !== undefined) patch.url = d.url?.trim() || null;
  if (d.category !== undefined) patch.category = d.category?.trim() || null;
  if (d.note !== undefined) patch.note = d.note?.trim() || null;
  if (d.favorite !== undefined) patch.favorite = d.favorite;
  // password: undefined — оставить как есть; иначе задать/очистить.
  if (d.password !== undefined) {
    patch.passwordCipher = d.password ? encryptSecret(d.password) : null;
  }
  await db.update(credentials).set(patch).where(eq(credentials.id, id));
  revalidateVault();
}

export async function deleteCredential(id: string) {
  await schemaReady();
  await db.delete(credentials).where(eq(credentials.id, id));
  revalidateVault();
}

export async function toggleCredentialFavorite(id: string, favorite: boolean) {
  await schemaReady();
  await db.update(credentials).set({ favorite }).where(eq(credentials.id, id));
  revalidateVault();
}

/**
 * Расшифровать пароль по требованию — для показа, копирования или
 * редактирования. Явно проверяем сессию (это самый чувствительный вызов).
 */
export async function revealCredential(id: string): Promise<string> {
  if (!(await isAuthed())) throw new Error("unauthorized");
  await schemaReady();
  const [row] = await db
    .select({ cipher: credentials.passwordCipher })
    .from(credentials)
    .where(eq(credentials.id, id))
    .limit(1);
  return decryptSecret(row?.cipher ?? null);
}
