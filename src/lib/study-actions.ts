"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schemaReady } from "@/db";
import {
  grades,
  exams,
  attendance,
  studySessions,
  topics,
  materials,
  GRADE_KINDS,
  EXAM_KINDS,
  ATTENDANCE_STATUSES,
  TOPIC_STATUSES,
  MATERIAL_KINDS,
  type TopicStatus,
} from "@/db/schema";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableId = z.string().min(1).nullable().optional();

/* ───────────────────────────  Оценки  ─────────────────────────── */

const gradeSchema = z.object({
  subjectId: z.string().min(1, "Выберите предмет"),
  value: z.coerce.number().min(0).max(1000),
  maxValue: z.coerce.number().positive().max(1000).optional(),
  weight: z.coerce.number().positive().max(100).optional(),
  kind: z.enum(GRADE_KINDS).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  date: isoDate,
  note: z.string().max(500).nullable().optional(),
});

export type GradeInput = z.input<typeof gradeSchema>;

export async function createGrade(input: GradeInput) {
  await schemaReady();
  const data = gradeSchema.parse(input);
  const [row] = await db
    .insert(grades)
    .values({
      subjectId: data.subjectId,
      value: data.value,
      maxValue: data.maxValue ?? 5,
      weight: data.weight ?? 1,
      kind: data.kind ?? "other",
      title: data.title ?? null,
      date: data.date,
      note: data.note ?? null,
    })
    .returning({ id: grades.id });
  revalidateAll();
  return row;
}

const gradePatchSchema = gradeSchema.partial();

export async function updateGrade(id: string, input: z.input<typeof gradePatchSchema>) {
  await schemaReady();
  const data = gradePatchSchema.parse(input);
  await db.update(grades).set(data).where(eq(grades.id, id));
  revalidateAll();
}

export async function deleteGrade(id: string) {
  await schemaReady();
  await db.delete(grades).where(eq(grades.id, id));
  revalidateAll();
}

/* ─────────────────────────────  Экзамены  ─────────────────────────── */

const examSchema = z.object({
  subjectId: z.string().min(1, "Выберите предмет"),
  kind: z.enum(EXAM_KINDS).optional(),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  autopass: z.boolean().optional(),
  readiness: z.coerce.number().int().min(0).max(100).optional(),
  note: z.string().max(500).nullable().optional(),
});

export type ExamInput = z.input<typeof examSchema>;

export async function createExam(input: ExamInput) {
  await schemaReady();
  const data = examSchema.parse(input);
  const [row] = await db
    .insert(exams)
    .values({
      subjectId: data.subjectId,
      kind: data.kind ?? "exam",
      date: data.date,
      time: data.time ?? null,
      location: data.location ?? null,
      autopass: data.autopass ?? false,
      readiness: data.readiness ?? 0,
      note: data.note ?? null,
    })
    .returning({ id: exams.id });
  revalidateAll();
  return row;
}

const examPatchSchema = examSchema.partial();

export async function updateExam(id: string, input: z.input<typeof examPatchSchema>) {
  await schemaReady();
  const data = examPatchSchema.parse(input);
  await db.update(exams).set(data).where(eq(exams.id, id));
  revalidateAll();
}

export async function deleteExam(id: string) {
  await schemaReady();
  await db.delete(exams).where(eq(exams.id, id));
  revalidateAll();
}

const examDoneSchema = z.object({
  done: z.boolean(),
  grade: z.coerce.number().min(0).max(1000).nullable().optional(),
  autopass: z.boolean().optional(),
});

/** Отметить экзамен сданным (с оценкой) или вернуть в предстоящие. */
export async function setExamDone(
  id: string,
  input: z.input<typeof examDoneSchema>,
) {
  await schemaReady();
  const data = examDoneSchema.parse(input);
  await db
    .update(exams)
    .set({
      passedAt: data.done ? new Date() : null,
      grade: data.done ? data.grade ?? null : null,
      autopass: data.autopass ?? undefined,
    })
    .where(eq(exams.id, id));
  revalidateAll();
}

/** Обновить готовность к экзамену (ползунок). */
export async function setExamReadiness(id: string, readiness: number) {
  await schemaReady();
  const r = Math.max(0, Math.min(100, Math.round(readiness)));
  await db.update(exams).set({ readiness: r }).where(eq(exams.id, id));
  revalidateAll();
}

/* ───────────────────────────  Посещаемость  ─────────────────────────── */

const attendanceSchema = z.object({
  subjectId: z.string().min(1),
  lessonId: nullableId,
  date: isoDate,
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().max(300).nullable().optional(),
});

/** Отметить посещение. Для слота расписания (lessonId) — upsert по (lessonId, date). */
export async function setAttendance(input: z.input<typeof attendanceSchema>) {
  await schemaReady();
  const data = attendanceSchema.parse(input);
  if (data.lessonId) {
    await db
      .insert(attendance)
      .values({
        subjectId: data.subjectId,
        lessonId: data.lessonId,
        date: data.date,
        status: data.status,
        note: data.note ?? null,
      })
      .onConflictDoUpdate({
        target: [attendance.lessonId, attendance.date],
        set: { status: data.status, subjectId: data.subjectId },
      });
  } else {
    await db.insert(attendance).values({
      subjectId: data.subjectId,
      lessonId: null,
      date: data.date,
      status: data.status,
      note: data.note ?? null,
    });
  }
  revalidateAll();
}

/** Снять отметку со слота расписания за дату (для быстрой отметки в «Сегодня»). */
export async function clearAttendanceSlot(lessonId: string, date: string) {
  await schemaReady();
  await db
    .delete(attendance)
    .where(and(eq(attendance.lessonId, lessonId), eq(attendance.date, date)));
  revalidateAll();
}

export async function deleteAttendance(id: string) {
  await schemaReady();
  await db.delete(attendance).where(eq(attendance.id, id));
  revalidateAll();
}

/* ───────────────────────────  Таймер / фокус  ─────────────────────────── */

const studySessionSchema = z.object({
  subjectId: nullableId,
  seconds: z.coerce.number().int().positive().max(24 * 3600),
  date: isoDate,
  note: z.string().max(300).nullable().optional(),
});

export async function logStudySession(
  input: z.input<typeof studySessionSchema>,
) {
  await schemaReady();
  const data = studySessionSchema.parse(input);
  await db.insert(studySessions).values({
    subjectId: data.subjectId ?? null,
    seconds: data.seconds,
    date: data.date,
    note: data.note ?? null,
  });
  revalidateAll();
}

export async function deleteStudySession(id: string) {
  await schemaReady();
  await db.delete(studySessions).where(eq(studySessions.id, id));
  revalidateAll();
}

/* ─────────────────────────  Программа курса (темы)  ───────────────────────── */

const topicSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1, "Введите тему").max(300),
  status: z.enum(TOPIC_STATUSES).optional(),
  note: z.string().max(1000).nullable().optional(),
});

export async function createTopic(input: z.input<typeof topicSchema>) {
  await schemaReady();
  const data = topicSchema.parse(input);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(topics)
    .where(eq(topics.subjectId, data.subjectId));
  const [row] = await db
    .insert(topics)
    .values({
      subjectId: data.subjectId,
      title: data.title,
      status: data.status ?? "not_started",
      note: data.note ?? null,
      position: n ?? 0,
    })
    .returning({ id: topics.id });
  revalidateAll();
  return row;
}

const topicPatchSchema = topicSchema.partial();

export async function updateTopic(id: string, input: z.input<typeof topicPatchSchema>) {
  await schemaReady();
  const data = topicPatchSchema.parse(input);
  await db.update(topics).set(data).where(eq(topics.id, id));
  revalidateAll();
}

export async function setTopicStatus(id: string, status: TopicStatus) {
  await schemaReady();
  await db.update(topics).set({ status }).where(eq(topics.id, id));
  revalidateAll();
}

export async function deleteTopic(id: string) {
  await schemaReady();
  await db.delete(topics).where(eq(topics.id, id));
  revalidateAll();
}

/* ───────────────────────────  Материалы  ─────────────────────────── */

const materialSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1, "Введите название").max(300),
  kind: z.enum(MATERIAL_KINDS).optional(),
  url: z.string().trim().max(1000).nullable().optional(),
  fileId: z.string().min(1).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function createMaterial(input: z.input<typeof materialSchema>) {
  await schemaReady();
  const data = materialSchema.parse(input);
  const [row] = await db
    .insert(materials)
    .values({
      subjectId: data.subjectId,
      title: data.title,
      kind: data.kind ?? "link",
      url: data.url || null,
      fileId: data.fileId ?? null,
      note: data.note ?? null,
    })
    .returning({ id: materials.id });
  revalidateAll();
  return row;
}

const materialPatchSchema = materialSchema.partial();

export async function updateMaterial(
  id: string,
  input: z.input<typeof materialPatchSchema>,
) {
  await schemaReady();
  const data = materialPatchSchema.parse(input);
  await db.update(materials).set(data).where(eq(materials.id, id));
  revalidateAll();
}

export async function deleteMaterial(id: string) {
  await schemaReady();
  await db.delete(materials).where(eq(materials.id, id));
  revalidateAll();
}
