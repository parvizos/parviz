"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { toggleOrganizationFavorite } from "@/lib/actions";
import { useUi } from "./ui-context";
import type { PersonForEdit, OrganizationForEdit } from "./crm-dialogs";

export function NewPersonButton({
  defaultOrganizationId,
  children = "Новый человек",
}: {
  defaultOrganizationId?: string | null;
  children?: ReactNode;
}) {
  const { openNewPerson } = useUi();
  return (
    <Button size="sm" onClick={() => openNewPerson(defaultOrganizationId)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditPersonButton({ person }: { person: PersonForEdit }) {
  const { openEditPerson } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditPerson(person)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function NewOrganizationButton({
  children = "Новая организация",
}: {
  children?: ReactNode;
}) {
  const { openNewOrganization } = useUi();
  return (
    <Button size="sm" onClick={openNewOrganization}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditOrganizationButton({
  organization,
}: {
  organization: OrganizationForEdit;
}) {
  const { openEditOrganization } = useUi();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => openEditOrganization(organization)}
    >
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function OrgFavoriteToggle({
  id,
  initial,
}: {
  id: string;
  initial: boolean;
}) {
  const [fav, setFav] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      try {
        await toggleOrganizationFavorite(id, next);
      } catch {
        setFav(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fav ? "Убрать из избранного" : "В избранное"}
      title={fav ? "В избранном" : "В избранное"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
        fav
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Star size={16} className={fav ? "fill-current" : ""} />
    </button>
  );
}
