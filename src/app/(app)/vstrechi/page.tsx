import { Handshake } from "lucide-react";
import { getMeetings } from "@/lib/queries";
import { MeetingCard, NewMeetingButton } from "@/components/app/meeting-items";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Встречи" };
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await getMeetings();

  return (
    <div>
      <PageHeader
        title="Встречи"
        subtitle="Большой конспект каждой встречи: с кем виделся, о чём говорили, что решили."
        actions={<NewMeetingButton />}
      />

      {meetings.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Handshake size={22} />}
          title="Пока пусто"
          description="Сохраняй встречи как большие заметки: с кем виделся, о чём говорили, что решили и что дальше. Привяжешь человека — встреча появится и в его карточке."
          action={<NewMeetingButton />}
        />
      )}
    </div>
  );
}
