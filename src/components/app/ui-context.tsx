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
  NoteDialog,
  type SubjectForEdit,
  type LessonForEdit,
  type NoteForEdit,
} from "./study-dialogs";
import { CommandPalette } from "./CommandPalette";
import type {
  AreaOption,
  ProjectOption,
  SubjectOption,
  TaskPrefill,
} from "./types";
import type { TaskWithContext } from "@/lib/queries";
import type { ProjectStatus } from "@/db/schema";

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
  openEditNote: (n: NoteForEdit) => void;
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
}: {
  children: ReactNode;
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
  subjectOptions: SubjectOption[];
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
  const [note, setNote] = useState<{
    open: boolean;
    note: NoteForEdit | null;
    subjectId?: string | null;
  }>({ open: false, note: null });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
    (opts?: { subjectId?: string | null }) =>
      setNote({ open: true, note: null, subjectId: opts?.subjectId ?? null }),
    [],
  );
  const openEditNote = useCallback(
    (n: NoteForEdit) => setNote({ open: true, note: n }),
    [],
  );
  const openCommand = useCallback(() => setCmdOpen(true), []);

  const anyOpen =
    task.open ||
    project.open ||
    area.open ||
    subject.open ||
    lesson.open ||
    note.open ||
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
        openEditNote,
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
      {note.open && (
        <NoteDialog
          onClose={() => setNote((s) => ({ ...s, open: false }))}
          note={note.note}
          subjectOptions={subjectOptions}
          defaultSubjectId={note.subjectId}
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
          onToggleTheme={toggleTheme}
        />
      )}
    </Ctx.Provider>
  );
}
