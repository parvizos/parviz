import { GraduationCap } from "lucide-react";
import { getSubjectsWithCounts } from "@/lib/queries";
import { getTermsForSwitcher } from "@/lib/term-queries";
import { SubjectCard } from "@/components/app/study-items";
import { NewSubjectButton } from "@/components/app/study-buttons";
import { TermSwitcher } from "@/components/app/term-items";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Предметы" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const [subjects, terms] = await Promise.all([
    getSubjectsWithCounts(),
    getTermsForSwitcher(),
  ]);

  return (
    <div>
      <PageHeader
        title="Предметы"
        subtitle="Дисциплины, их расписание, домашка и конспекты."
        actions={
          <>
            <TermSwitcher terms={terms} />
            <NewSubjectButton />
          </>
        }
      />

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap size={22} />}
          title="Пока нет предметов"
          description="Добавь дисциплины — к ним прицепятся пары в расписании, домашка и конспекты."
          action={<NewSubjectButton />}
        />
      )}
    </div>
  );
}
