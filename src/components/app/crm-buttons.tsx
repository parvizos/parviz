"use client";

import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUi } from "./ui-context";
import type { PersonForEdit, OrganizationForEdit } from "./crm-dialogs";
import type { ReactNode } from "react";

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
