"use server";

import { revalidatePath } from "next/cache";
import os from "node:os";
import { existsSync } from "node:fs";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { isAuthed } from "@/lib/session";
import { listBackups } from "@/lib/backup";
import {
  restoreFromDbFile,
  restoreFromJsonString,
  safeBackupPath,
} from "@/lib/data-transfer";

export type RestoreResult =
  | { ok: true; inserted: number; tables: number }
  | { ok: false; error: string };

/** Восстановление из авто-бэкапа на диске (из списка в настройках). */
export async function restoreFromBackup(name: string): Promise<RestoreResult> {
  if (!(await isAuthed())) return { ok: false, error: "Нет доступа." };
  const path = safeBackupPath(name);
  if (
    !path ||
    !existsSync(path) ||
    !listBackups().some((b) => b.name === name)
  ) {
    return { ok: false, error: "Бэкап не найден." };
  }
  try {
    const res = await restoreFromDbFile(path);
    revalidatePath("/", "layout");
    return { ok: true, ...res };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка восстановления.",
    };
  }
}

/** Восстановление из загруженного файла (.db или .json из ParvizOS). */
export async function restoreFromUpload(
  formData: FormData,
): Promise<RestoreResult> {
  if (!(await isAuthed())) return { ok: false, error: "Нет доступа." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Файл не выбран." };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const head = buf.subarray(0, 16).toString("latin1");
    const isSqlite = head.startsWith("SQLite format 3");
    const looksJson = buf
      .subarray(0, 64)
      .toString("utf8")
      .trimStart()
      .startsWith("{");

    let res;
    if (isSqlite) {
      const dir = await mkdtemp(join(os.tmpdir(), "parviz-restore-"));
      const tmp = join(dir, "restore.db");
      await writeFile(tmp, buf);
      try {
        res = await restoreFromDbFile(tmp);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    } else if (looksJson) {
      res = await restoreFromJsonString(buf.toString("utf8"));
    } else {
      return { ok: false, error: "Нужен файл .db или .json из ParvizOS." };
    }
    revalidatePath("/", "layout");
    return { ok: true, ...res };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка восстановления.",
    };
  }
}
