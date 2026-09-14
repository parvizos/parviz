"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { CommandPalette } from "./CommandPalette";
import { useRouter } from "next/navigation";
import { createNote } from "@/lib/actions";
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
import type { ProjectStatus, CategoryKind } from "@/db/schema";

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
  openCommand: () => void;
  toggleTheme: () => void;
  theme: "light" | "dark";
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
}: {
  children: ReactNode;
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
  accountOptions: AccountOption[];
  categoryOptions: CategoryOption[];
  personOptions: PersonOption[];
  organizationOptions: OrganizationOption[];
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
  const openCommand = useCallback(() => setCmdOpen(true), []);

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
        openCommand,
        toggleTheme,
        theme,
      }}
    >
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
      {cmdOpen && (
        <CommandPalette
          open
          onClose={() => setCmdOpen(false)}
          areas={areaOptions}
          projects={projectOptions}
          subjects={subjectOptions}
          onNewTask={() => openNewTask()}
          onNewProject={() => openNewProject()}
          onNewArea={openNewArea}
          onNewSubject={openNewSubject}
          onNewNote={() => openNewNote()}
          onNewTransaction={() => openNewTransaction()}
          onNewPerson={() => openNewPerson()}
          onToggleTheme={toggleTheme}
        />
      )}
    </Ctx.Provider>
  );
}
