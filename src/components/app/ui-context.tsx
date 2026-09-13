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
import { CommandPalette } from "./CommandPalette";
import type { AreaOption, ProjectOption, TaskPrefill } from "./types";
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
}: {
  children: ReactNode;
  areaOptions: AreaOption[];
  projectOptions: ProjectOption[];
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
  const openCommand = useCallback(() => setCmdOpen(true), []);

  const anyOpen = task.open || project.open || area.open || cmdOpen;

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
      {cmdOpen && (
        <CommandPalette
          open
          onClose={() => setCmdOpen(false)}
          areas={areaOptions}
          projects={projectOptions}
          onNewTask={() => openNewTask()}
          onNewProject={() => openNewProject()}
          onNewArea={openNewArea}
          onToggleTheme={toggleTheme}
        />
      )}
    </Ctx.Provider>
  );
}
