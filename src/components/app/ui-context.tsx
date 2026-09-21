"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TaskDialog, ProjectDialog, AreaDialog } from "./dialogs";
import {
  SubjectDialog,
  LessonDialog,
  type SubjectForEdit,
  type LessonForEdit,
} from "./study-dialogs";
import {
  AccountDialog,
  CategoryDialog,
  TransactionDialog,
  type AccountForEdit,
  type CategoryForEdit,
  type TransactionForEdit,
} from "./finance-dialogs";
import {
  PersonDialog,
  OrganizationDialog,
  type PersonForEdit,
  type OrganizationForEdit,
} from "./crm-dialogs";
import { CredentialDialog, type CredentialForEdit } from "./vault-dialogs";
import {
  DebtDialog,
  PlannedDialog,
  GoalDialog,
  type DebtForEdit,
  type PlannedForEdit,
  type GoalForEdit,
} from "./finance2-dialogs";
import {
  GradeDialog,
  ExamDialog,
  type GradeForEdit,
  type ExamForEdit,
} from "./study2-dialogs";
import { CommandPalette, type PageOption } from "./CommandPalette";
import { MentionProvider } from "./mention-context";
import type { MentionItem } from "./mention";
import { ToastProvider } from "./toast";
import { ReminderEngine } from "./ReminderEngine";
import { useRouter } from "next/navigation";
import { createNote, createMeeting } from "@/lib/actions";
import type {
  AreaOption,
  ProjectOption,
  SubjectOption,
  AccountOption,
  CategoryOption,
  PersonOption,
  OrganizationOption,
  TaskPrefill,
  TransactionPrefill,
} from "./types";
import type { TaskWithContext } from "@/lib/queries";
import type {
  ProjectStatus,
  CategoryKind,
  DebtDirection,
} from "@/db/schema";

type ProjectForEdit = {
  id: string;
  name: string;
  notes: string | null;
  areaId: string | null;
  dueDate: string | null;
  status: ProjectStatus;
};
type AreaForEdit = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

interface UiValue {
  openNewTask: (prefill?: TaskPrefill) => void;
  openTask: (task: TaskWithContext) => void;
  openNewProject: (defaultAreaId?: string | null) => void;
  openEditProject: (p: ProjectForEdit) => void;
  openNewArea: () => void;
  openEditArea: (a: AreaForEdit) => void;
  openNewSubject: () => void;
  openEditSubject: (s: SubjectForEdit) => void;
  openNewLesson: (opts?: { subjectId?: string | null; day?: number }) => void;
  openEditLesson: (l: LessonForEdit) => void;
  openNewNote: (opts?: { subjectId?: string | null }) => void;
  openNewMeeting: (opts?: { personId?: string | null }) => void;
  openNewTransaction: (prefill?: TransactionPrefill) => void;
  openTransaction: (tx: TransactionForEdit) => void;
  openNewAccount: () => void;
  openEditAccount: (a: AccountForEdit) => void;
  openNewCategory: (defaultKind?: CategoryKind) => void;
  openEditCategory: (c: CategoryForEdit) => void;
  openNewPerson: (defaultOrganizationId?: string | null) => void;
  openEditPerson: (p: PersonForEdit) => void;
  openNewOrganization: () => void;
  openEditOrganization: (o: OrganizationForEdit) => void;
  openNewCredential: () => void;
  openEditCredential: (c: CredentialForEdit) => void;
  openNewDebt: (opts?: {
    direction?: DebtDirection;
    personId?: string | null;
  }) => void;
  openEditDebt: (d: DebtForEdit) => void;
  openNewPlanned: () => void;
  openEditPlanned: (p: PlannedForEdit) => void;
  openNewGoal: () => void;
  openEditGoal: (g: GoalForEdit) => void;
  openNewGrade: (subjectId?: string | null) => void;
  openEditGrade: (g: GradeForEdit) => void;
  openNewExam: (subjectId?: string | null) => void;
  openEditExam: (e: ExamForEdit) => void;
  openCommand: () => void;
  toggleTheme: () => void;
  theme: "light" | "dark";
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
}

const Ctx = createContext<UiValue | null>(null);

export function useUi(): UiValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi использован вне UiProvider");
  return v;
}

export function UiProvider({
  children,
  areaOptions,
  projectOptions,
  subjectOptions,
  accountOptions,
  categoryOptions,
  personOptions,
  organizationOptions,
  pageOptions = [],
  baseCurrency = "RUB",
}: {
  children: ReactNode;
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  personOptions: PersonOption[];
  organizationOptions: OrganizationOption[];
  pageOptions?: PageOption[];
  baseCurrency?: string;
}) {
  const [task, setTask] = useState<{
    open: boolean;
    task: TaskWithContext | null;
    prefill?: TaskPrefill;
  }>({ open: false, task: null });
  const [project, setProject] = useState<{
    open: boolean;
    project: ProjectForEdit | null;
    defaultAreaId?: string | null;
  }>({ open: false, project: null });
  const [area, setArea] = useState<{ open: boolean; area: AreaForEdit | null }>({
    open: false,
    area: null,
  });
  const [subject, setSubject] = useState<{
    open: boolean;
    subject: SubjectForEdit | null;
  }>({ open: false, subject: null });
  const [lesson, setLesson] = useState<{
    open: boolean;
    lesson: LessonForEdit | null;
    subjectId?: string | null;
    day?: number;
  }>({ open: false, lesson: null });
  const [transaction, setTransaction] = useState<{
    open: boolean;
    tx: TransactionForEdit | null;
    prefill?: TransactionPrefill;
  }>({ open: false, tx: null });
  const [account, setAccount] = useState<{
    open: boolean;
    account: AccountForEdit | null;
  }>({ open: false, account: null });
  const [category, setCategory] = useState<{
    open: boolean;
    category: CategoryForEdit | null;
    defaultKind?: CategoryKind;
  }>({ open: false, category: null });
  const [person, setPerson] = useState<{
    open: boolean;
    person: PersonForEdit | null;
    orgId?: string | null;
  }>({ open: false, person: null });
  const [organization, setOrganization] = useState<{
    open: boolean;
    organization: OrganizationForEdit | null;
  }>({ open: false, organization: null });
  const [credential, setCredential] = useState<{
    open: boolean;
    credential: CredentialForEdit | null;
  }>({ open: false, credential: null });
  const [debt, setDebt] = useState<{
    open: boolean;
    debt: DebtForEdit | null;
    direction?: DebtDirection;
    personId?: string | null;
  }>({ open: false, debt: null });
  const [plan, setPlan] = useState<{
    open: boolean;
    plan: PlannedForEdit | null;
  }>({ open: false, plan: null });
  const [goal, setGoal] = useState<{ open: boolean; goal: GoalForEdit | null }>({
    open: false,
    goal: null,
  });
  const [grade, setGrade] = useState<{
    open: boolean;
    grade: GradeForEdit | null;
    subjectId?: string | null;
  }>({ open: false, grade: null });
  const [exam, setExam] = useState<{
    open: boolean;
    exam: ExamForEdit | null;
    subjectId?: string | null;
  }>({ open: false, exam: null });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [focusMode, setFocusMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Читаем актуальную тему из DOM после монтирования (внешнее состояние).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("parviz-theme", next);
      } catch {}
      return next;
    });
  }, []);

  const openNewTask = useCallback(
    (prefill?: TaskPrefill) => setTask({ open: true, task: null, prefill }),
    [],
  );
  const openTask = useCallback(
    (t: TaskWithContext) => setTask({ open: true, task: t }),
    [],
  );
  const openNewProject = useCallback(
    (defaultAreaId?: string | null) =>
      setProject({ open: true, project: null, defaultAreaId }),
    [],
  );
  const openEditProject = useCallback(
    (p: ProjectForEdit) => setProject({ open: true, project: p }),
    [],
  );
  const openNewArea = useCallback(() => setArea({ open: true, area: null }), []);
  const openEditArea = useCallback(
    (a: AreaForEdit) => setArea({ open: true, area: a }),
    [],
  );
  const openNewSubject = useCallback(
    () => setSubject({ open: true, subject: null }),
    [],
  );
  const openEditSubject = useCallback(
    (s: SubjectForEdit) => setSubject({ open: true, subject: s }),
    [],
  );
  const openNewLesson = useCallback(
    (opts?: { subjectId?: string | null; day?: number }) =>
      setLesson({
        open: true,
        lesson: null,
        subjectId: opts?.subjectId ?? null,
        day: opts?.day,
      }),
    [],
  );
  const openEditLesson = useCallback(
    (l: LessonForEdit) => setLesson({ open: true, lesson: l }),
    [],
  );
  const openNewNote = useCallback(
    (opts?: { subjectId?: string | null }) => {
      void (async () => {
        try {
          const row = await createNote({ subjectId: opts?.subjectId ?? null });
          if (row?.id) router.push(`/konspekty/${row.id}`);
        } catch {}
      })();
    },
    [router],
  );
  const openNewMeeting = useCallback(
    (opts?: { personId?: string | null }) => {
      void (async () => {
        try {
          const row = await createMeeting({ personId: opts?.personId ?? null });
          if (row?.id) router.push(`/vstrechi/${row.id}`);
        } catch {}
      })();
    },
    [router],
  );
  const openNewTransaction = useCallback(
    (prefill?: TransactionPrefill) =>
      setTransaction({ open: true, tx: null, prefill }),
    [],
  );
  const openTransaction = useCallback(
    (tx: TransactionForEdit) => setTransaction({ open: true, tx }),
    [],
  );
  const openNewAccount = useCallback(
    () => setAccount({ open: true, account: null }),
    [],
  );
  const openEditAccount = useCallback(
    (a: AccountForEdit) => setAccount({ open: true, account: a }),
    [],
  );
  const openNewCategory = useCallback(
    (defaultKind?: CategoryKind) =>
      setCategory({ open: true, category: null, defaultKind }),
    [],
  );
  const openEditCategory = useCallback(
    (c: CategoryForEdit) => setCategory({ open: true, category: c }),
    [],
  );
  const openNewPerson = useCallback(
    (defaultOrganizationId?: string | null) =>
      setPerson({ open: true, person: null, orgId: defaultOrganizationId ?? null }),
    [],
  );
  const openEditPerson = useCallback(
    (p: PersonForEdit) => setPerson({ open: true, person: p }),
    [],
  );
  const openNewOrganization = useCallback(
    () => setOrganization({ open: true, organization: null }),
    [],
  );
  const openEditOrganization = useCallback(
    (o: OrganizationForEdit) => setOrganization({ open: true, organization: o }),
    [],
  );
  const openNewCredential = useCallback(
    () => setCredential({ open: true, credential: null }),
    [],
  );
  const openEditCredential = useCallback(
    (c: CredentialForEdit) => setCredential({ open: true, credential: c }),
    [],
  );
  const openNewDebt = useCallback(
    (opts?: { direction?: DebtDirection; personId?: string | null }) =>
      setDebt({
        open: true,
        debt: null,
        direction: opts?.direction,
        personId: opts?.personId ?? null,
      }),
    [],
  );
  const openEditDebt = useCallback(
    (d: DebtForEdit) => setDebt({ open: true, debt: d }),
    [],
  );
  const openNewPlanned = useCallback(
    () => setPlan({ open: true, plan: null }),
    [],
  );
  const openEditPlanned = useCallback(
    (p: PlannedForEdit) => setPlan({ open: true, plan: p }),
    [],
  );
  const openNewGoal = useCallback(() => setGoal({ open: true, goal: null }), []);
  const openEditGoal = useCallback(
    (g: GoalForEdit) => setGoal({ open: true, goal: g }),
    [],
  );
  const openNewGrade = useCallback(
    (subjectId?: string | null) =>
      setGrade({ open: true, grade: null, subjectId }),
    [],
  );
  const openEditGrade = useCallback(
    (g: GradeForEdit) => setGrade({ open: true, grade: g }),
    [],
  );
  const openNewExam = useCallback(
    (subjectId?: string | null) => setExam({ open: true, exam: null, subjectId }),
    [],
  );
  const openEditExam = useCallback(
    (e: ExamForEdit) => setExam({ open: true, exam: e }),
    [],
  );
  const openCommand = useCallback(() => setCmdOpen(true), []);

  // Что можно упомянуть (@) в любом редакторе: люди, проекты, страницы.
  const mentionOptions = useMemo<MentionItem[]>(
    () => [
      ...personOptions.map((p) => ({
        type: "person" as const,
        id: p.id,
        label: p.name,
        href: `/lyudi/${p.id}`,
      })),
      ...projectOptions.map((p) => ({
        type: "project" as const,
        id: p.id,
        label: p.name,
        href: `/proekty/${p.id}`,
      })),
      ...pageOptions.map((p) => ({
        type: "page" as const,
        id: p.id,
        label: p.title || "Без названия",
        href: `/bloknot/${p.id}`,
        icon: p.icon,
      })),
    ],
    [personOptions, projectOptions, pageOptions],
  );

  const anyOpen =
    task.open ||
    project.open ||
    area.open ||
    subject.open ||
    lesson.open ||
    transaction.open ||
    account.open ||
    category.open ||
    person.open ||
    organization.open ||
    credential.open ||
    debt.open ||
    plan.open ||
    goal.open ||
    grade.open ||
    exam.open ||
    cmdOpen;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      if (mod) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (!typing && !anyOpen && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOpen, openNewTask]);

  return (
    <MentionProvider value={mentionOptions}>
    <Ctx.Provider
      value={{
        openNewTask,
        openTask,
        openNewProject,
        openEditProject,
        openNewArea,
        openEditArea,
        openNewSubject,
        openEditSubject,
        openNewLesson,
        openEditLesson,
        openNewNote,
        openNewMeeting,
        openNewTransaction,
        openTransaction,
        openNewAccount,
        openEditAccount,
        openNewCategory,
        openEditCategory,
        openNewPerson,
        openEditPerson,
        openNewOrganization,
        openEditOrganization,
        openNewCredential,
        openEditCredential,
        openNewDebt,
        openEditDebt,
        openNewPlanned,
        openEditPlanned,
        openNewGoal,
        openEditGoal,
        openNewGrade,
        openEditGrade,
        openNewExam,
        openEditExam,
        openCommand,
        toggleTheme,
        theme,
        focusMode,
        setFocusMode,
      }}
    >
      <ToastProvider>
      <ReminderEngine />
      {children}

      {task.open && (
        <TaskDialog
          onClose={() => setTask((s) => ({ ...s, open: false }))}
          task={task.task}
          prefill={task.prefill}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          subjectOptions={subjectOptions}
          personOptions={personOptions}
        />
      )}
      {project.open && (
        <ProjectDialog
          onClose={() => setProject((s) => ({ ...s, open: false }))}
          project={project.project}
          defaultAreaId={project.defaultAreaId}
          areaOptions={areaOptions}
        />
      )}
      {area.open && (
        <AreaDialog
          onClose={() => setArea((s) => ({ ...s, open: false }))}
          area={area.area}
        />
      )}
      {subject.open && (
        <SubjectDialog
          onClose={() => setSubject((s) => ({ ...s, open: false }))}
          subject={subject.subject}
          areaOptions={areaOptions}
        />
      )}
      {lesson.open && (
        <LessonDialog
          onClose={() => setLesson((s) => ({ ...s, open: false }))}
          lesson={lesson.lesson}
          subjectOptions={subjectOptions}
          defaultSubjectId={lesson.subjectId}
          defaultDay={lesson.day}
        />
      )}
      {transaction.open && (
        <TransactionDialog
          onClose={() => setTransaction((s) => ({ ...s, open: false }))}
          tx={transaction.tx}
          prefill={transaction.prefill}
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          subjectOptions={subjectOptions}
          personOptions={personOptions}
        />
      )}
      {account.open && (
        <AccountDialog
          onClose={() => setAccount((s) => ({ ...s, open: false }))}
          account={account.account}
        />
      )}
      {category.open && (
        <CategoryDialog
          onClose={() => setCategory((s) => ({ ...s, open: false }))}
          category={category.category}
          defaultKind={category.defaultKind}
        />
      )}
      {person.open && (
        <PersonDialog
          onClose={() => setPerson((s) => ({ ...s, open: false }))}
          person={person.person}
          defaultOrganizationId={person.orgId}
          organizationOptions={organizationOptions}
        />
      )}
      {organization.open && (
        <OrganizationDialog
          onClose={() => setOrganization((s) => ({ ...s, open: false }))}
          organization={organization.organization}
        />
      )}
      {credential.open && (
        <CredentialDialog
          onClose={() => setCredential((s) => ({ ...s, open: false }))}
          credential={credential.credential}
        />
      )}
      {debt.open && (
        <DebtDialog
          onClose={() => setDebt((s) => ({ ...s, open: false }))}
          debt={debt.debt}
          defaultDirection={debt.direction}
          defaultPersonId={debt.personId}
          defaultCurrency={baseCurrency}
          personOptions={personOptions}
        />
      )}
      {plan.open && (
        <PlannedDialog
          onClose={() => setPlan((s) => ({ ...s, open: false }))}
          plan={plan.plan}
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          subjectOptions={subjectOptions}
          personOptions={personOptions}
        />
      )}
      {goal.open && (
        <GoalDialog
          onClose={() => setGoal((s) => ({ ...s, open: false }))}
          goal={goal.goal}
          accountOptions={accountOptions}
          defaultCurrency={baseCurrency}
        />
      )}
      {grade.open && (
        <GradeDialog
          onClose={() => setGrade((s) => ({ ...s, open: false }))}
          grade={grade.grade}
          defaultSubjectId={grade.subjectId}
          subjectOptions={subjectOptions}
        />
      )}
      {exam.open && (
        <ExamDialog
          onClose={() => setExam((s) => ({ ...s, open: false }))}
          exam={exam.exam}
          defaultSubjectId={exam.subjectId}
          subjectOptions={subjectOptions}
        />
      )}
      {cmdOpen && (
        <CommandPalette
          open
          onClose={() => setCmdOpen(false)}
          areas={areaOptions}
          projects={projectOptions}
          subjects={subjectOptions}
          pages={pageOptions}
          onNewTask={() => openNewTask()}
          onNewProject={() => openNewProject()}
          onNewArea={openNewArea}
          onNewSubject={openNewSubject}
          onNewNote={() => openNewNote()}
          onNewMeeting={() => openNewMeeting()}
          onNewCredential={() => openNewCredential()}
          onNewTransaction={() => openNewTransaction()}
          onNewPerson={() => openNewPerson()}
          onToggleTheme={toggleTheme}
        />
      )}
      </ToastProvider>
    </Ctx.Provider>
    </MentionProvider>
  );
}
