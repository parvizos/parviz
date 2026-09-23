/*
 * Дашборд «всего и вся» — единый агрегат по всем доменам ParvizOS.
 * Всё считается параллельно и возвращается плоскими данными для
 * клиентского компонента (со счётчиками, кольцами и лентой).
 */

import { schemaReady } from "@/db";
import {
  getTodayTasks,
  getUpcomingTasks,
  getSidebarCounts,
  getProjectsWithCounts,
  getTodayLessons,
  getMeetings,
  getMonthSummary,
} from "@/lib/queries";
import {
  getNetWorth,
  getCapitalSeries,
  getMonthlyCommitment,
  getDuePlannedCount,
  getGoals,
  getPlanned,
} from "@/lib/finance-queries";
import {
  getAcademicOverview,
  getStudyStats,
  getUpcomingExams,
} from "@/lib/study-queries";
import { getActiveTerm } from "@/lib/term-queries";
import { todayISO, currentMonth, addDaysISO, diffDays } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

const HORIZON_DAYS = 21;

export type DashTask = {
  id: string;
  title: string;
  color: string | null;
  priority: number;
  overdue: boolean;
};

export type DashUpcoming = {
  kind: "exam" | "payment" | "task" | "meeting";
  title: string;
  subtitle: string | null;
  date: string;
  daysLeft: number;
};

export type DashProject = {
  id: string;
  name: string;
  color: string | null;
  done: number;
  total: number;
  pct: number;
};

export type DashData = {
  base: string;
  tasks: {
    todayCount: number;
    overdueCount: number;
    inbox: number;
    list: DashTask[];
  };
  finance: {
    net: number;
    onAccounts: number;
    month: { income: number; expense: number; net: number };
    capitalSeries: number[];
    commitmentExpense: number;
    dueCount: number;
    missingRates: number;
    topGoal: {
      title: string;
      pct: number;
      icon: string | null;
      color: string | null;
    } | null;
  };
  study: {
    hasTerm: boolean;
    termName: string | null;
    gpa5: number;
    gradeCount: number;
    nextExam: { title: string; date: string; daysLeft: number } | null;
    todayLessons: number;
    weekFocusSeconds: number;
  };
  upcoming: DashUpcoming[];
  projects: DashProject[];
};

export async function getDashboard(): Promise<DashData> {
  await schemaReady();
  const today = todayISO();
  const month = currentMonth();
  const horizon = addDaysISO(today, HORIZON_DAYS);

  const [
    todayTasks,
    upTaskGroups,
    counts,
    netWorth,
    monthSum,
    capSeries,
    commitment,
    dueCount,
    goals,
    planned,
    term,
    overview,
    study,
    todayLessons,
    exams,
    meetings,
    projects,
  ] = await Promise.all([
    getTodayTasks(),
    getUpcomingTasks(),
    getSidebarCounts(),
    getNetWorth(),
    getMonthSummary(month),
    getCapitalSeries(8),
    getMonthlyCommitment(),
    getDuePlannedCount(),
    getGoals(),
    getPlanned(),
    getActiveTerm(),
    getAcademicOverview(),
    getStudyStats(),
    getTodayLessons(),
    getUpcomingExams(HORIZON_DAYS),
    getMeetings(),
    getProjectsWithCounts(),
  ]);

  const base = netWorth.base;

  /* Задачи: просроченные впереди, затем сегодняшние. */
  const list: DashTask[] = [
    ...todayTasks.overdue.map((t) => ({ t, overdue: true })),
    ...todayTasks.today.map((t) => ({ t, overdue: false })),
  ]
    .slice(0, 6)
    .map(({ t, overdue }) => ({
      id: t.id,
      title: t.title,
      color: t.areaColor ?? t.subjectColor ?? null,
      priority: t.priority,
      overdue,
    }));

  /* Топ-цель накопления (незавершённая, ближе всех к финишу). */
  const topGoalRow = goals
    .filter((g) => !g.achieved)
    .sort((a, b) => b.pct - a.pct)[0];
  const topGoal = topGoalRow
    ? {
        title: topGoalRow.title,
        pct: topGoalRow.pct,
        icon: topGoalRow.icon,
        color: topGoalRow.color,
      }
    : null;

  /* Ближайший экзамен. */
  const upExam = exams.find((e) => !e.done);
  const nextExam = upExam
    ? {
        title: upExam.subjectName,
        date: upExam.date,
        daysLeft: upExam.daysLeft ?? diffDays(today, upExam.date),
      }
    : null;

  /* Единая лента «Предстоящее»: экзамены, платежи, задачи, встречи. */
  const upcoming: DashUpcoming[] = [];
  for (const e of exams) {
    if (e.done) continue;
    upcoming.push({
      kind: "exam",
      title: e.subjectName,
      subtitle: "Сессия",
      date: e.date,
      daysLeft: e.daysLeft ?? diffDays(today, e.date),
    });
  }
  for (const p of planned) {
    if (!p.active || p.recurrence === "once") {
      if (!(p.active && p.nextDate >= today && p.nextDate <= horizon)) continue;
    }
    if (p.nextDate < today || p.nextDate > horizon) continue;
    upcoming.push({
      kind: "payment",
      title: p.title,
      subtitle: formatMoney(p.amount, p.currency),
      date: p.nextDate,
      daysLeft: diffDays(today, p.nextDate),
    });
  }
  for (const g of upTaskGroups) {
    if (g.date > horizon) continue;
    for (const t of g.tasks) {
      upcoming.push({
        kind: "task",
        title: t.title,
        subtitle: t.projectName ?? t.areaName ?? t.subjectName ?? null,
        date: g.date,
        daysLeft: diffDays(today, g.date),
      });
    }
  }
  for (const m of meetings) {
    if (m.date < today || m.date > horizon) continue;
    upcoming.push({
      kind: "meeting",
      title: m.title || "Встреча",
      subtitle: m.personName,
      date: m.date,
      daysLeft: diffDays(today, m.date),
    });
  }
  upcoming.sort(
    (a, b) => a.date.localeCompare(b.date) || a.daysLeft - b.daysLeft,
  );

  /* Проекты с задачами, ещё не завершённые. */
  const projs: DashProject[] = projects
    .filter((p) => p.status !== "done" && p.totalCount > 0)
    .map((p) => {
      const done = p.totalCount - p.openCount;
      return {
        id: p.id,
        name: p.name,
        color: p.areaColor,
        done,
        total: p.totalCount,
        pct: p.totalCount > 0 ? done / p.totalCount : 0,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  return {
    base,
    tasks: {
      todayCount: todayTasks.today.length,
      overdueCount: todayTasks.overdue.length,
      inbox: counts.inbox,
      list,
    },
    finance: {
      net: netWorth.net,
      onAccounts: netWorth.onAccounts,
      month: monthSum,
      capitalSeries: capSeries.map((c) => c.capital),
      commitmentExpense: commitment.expense,
      dueCount,
      missingRates: netWorth.missingRates.length,
      topGoal,
    },
    study: {
      hasTerm: !!term,
      termName: term?.name ?? null,
      gpa5: overview.gpa5,
      gradeCount: overview.gradeCount,
      nextExam,
      todayLessons: todayLessons.length,
      weekFocusSeconds: study.weekSeconds,
    },
    upcoming: upcoming.slice(0, 8),
    projects: projs,
  };
}
