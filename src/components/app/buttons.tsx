"use client";

import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUi } from "./ui-context";
import type { TaskPrefill } from "./types";
import type { ProjectStatus } from "@/db/schema";
import type { ReactNode } from "react";

export function NewTaskButton({
  prefill,
  children = "Новая задача",
  variant = "primary",
  size = "sm",
}: {
  prefill?: TaskPrefill;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "soft" | "ghost";
  size?: "sm" | "md";
}) {
  const { openNewTask } = useUi();
  return (
    <Button variant={variant} size={size} onClick={() => openNewTask(prefill)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewProjectButton({
  defaultAreaId,
  children = "Новый проект",
}: {
  defaultAreaId?: string | null;
  children?: ReactNode;
}) {
  const { openNewProject } = useUi();
  return (
    <Button variant="primary" size="sm" onClick={() => openNewProject(defaultAreaId)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewAreaButton({
  children = "Новая сфера",
}: {
  children?: ReactNode;
}) {
  const { openNewArea } = useUi();
  return (
    <Button variant="primary" size="sm" onClick={openNewArea}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditProjectButton({
  project,
}: {
  project: {
    id: string;
    name: string;
    notes: string | null;
    areaId: string | null;
    dueDate: string | null;
    status: ProjectStatus;
    image: string | null;
  };
}) {
  const { openEditProject } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditProject(project)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function EditAreaButton({
  area,
}: {
  area: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    image: string | null;
  };
}) {
  const { openEditArea } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditArea(area)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}
