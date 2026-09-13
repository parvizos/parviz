import { Inbox } from "lucide-react";
import { getInboxTasks } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { TaskGroup } from "@/components/app/TaskGroup";
import { QuickAdd } from "@/components/app/QuickAdd";
import { PageHeader, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Входящие" };

export default async function InboxPage() {
  const today = todayISO();
  const tasks = await getInboxTasks();

  return (
    <div>
      <PageHeader
        title="Входящие"
        subtitle="Всё, что попало сюда и ждёт, чтобы это разобрали по сферам, проектам и датам."
      />

      <div className="mb-7">
        <QuickAdd placeholder="Быстро записать мысль или задачу…" />
      </div>

      {tasks.length > 0 ? (
        <TaskGroup tasks={tasks} today={today} />
      ) : (
        <EmptyState
          icon={<Inbox size={22} />}
          title="Входящие пусты"
          description="Сюда падают задачи без проекта, сферы и даты. Отличное место, чтобы быстро скидывать всё из головы."
        />
      )}
    </div>
  );
}
