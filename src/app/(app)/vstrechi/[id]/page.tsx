import { notFound } from "next/navigation";
import { getMeeting, getPersonOptions } from "@/lib/queries";
import { MeetingWorkspace } from "@/components/app/MeetingWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMeeting(id);
  return { title: m?.title || "Встреча" };
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meeting, personOptions] = await Promise.all([
    getMeeting(id),
    getPersonOptions(),
  ]);
  if (!meeting) notFound();

  return (
    <MeetingWorkspace
      meeting={{
        id: meeting.id,
        title: meeting.title,
        body: meeting.body,
        date: meeting.date,
        personId: meeting.personId,
        location: meeting.location,
      }}
      personOptions={personOptions}
    />
  );
}
