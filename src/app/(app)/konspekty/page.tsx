import { BookText } from "lucide-react";
import { getNotes } from "@/lib/queries";
import { NoteCard } from "@/components/app/study-items";
import { NewNoteButton } from "@/components/app/study-buttons";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Конспекты" };
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await getNotes();

  return (
    <div>
      <PageHeader
        title="Конспекты"
        subtitle="Блокнот: заметки и конспекты, привязанные к предметам."
        actions={<NewNoteButton />}
      />

      {notes.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookText size={22} />}
          title="Пока пусто"
          description="Записывай конспекты лекций и любые заметки. Привяжешь к предмету — они появятся и на его странице."
          action={<NewNoteButton />}
        />
      )}
    </div>
  );
}
