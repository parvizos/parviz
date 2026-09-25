import { notFound } from "next/navigation";
import { getNote, getSubjectOptions } from "@/lib/queries";
import { NoteWorkspace } from "@/components/app/NoteWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = await getNote(id);
  return { title: n?.title || "Конспект" };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, subjectOptions] = await Promise.all([
    getNote(id),
    getSubjectOptions(),
  ]);
  if (!note) notFound();

  return (
    <NoteWorkspace
      note={{
        id: note.id,
        title: note.title,
        body: note.body,
        icon: note.icon,
        cover: note.cover,
        subjectId: note.subjectId,
        subjectName: note.subjectName,
        subjectColor: note.subjectColor,
        pinned: note.pinned,
      }}
      subjectOptions={subjectOptions}
    />
  );
}
