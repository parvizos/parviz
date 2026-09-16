import { asc, desc } from "drizzle-orm";
import { db, schemaReady } from "@/db";
import { credentials } from "@/db/schema";

/** Метаданные записи — без пароля (шифртекст на клиент не уходит вообще). */
export type CredentialMeta = {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  category: string | null;
  note: string | null;
  favorite: boolean;
  hasPassword: boolean;
};

export async function getCredentials(): Promise<CredentialMeta[]> {
  await schemaReady();
  const rows = await db
    .select()
    .from(credentials)
    .orderBy(desc(credentials.favorite), asc(credentials.title));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    username: r.username,
    url: r.url,
    category: r.category,
    note: r.note,
    favorite: r.favorite,
    hasPassword: !!r.passwordCipher,
  }));
}
