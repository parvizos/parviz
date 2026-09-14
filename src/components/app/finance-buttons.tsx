"use client";

import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUi } from "./ui-context";
import type { TransactionPrefill } from "./types";
import type { AccountForEdit, CategoryForEdit } from "./finance-dialogs";
import type { CategoryKind } from "@/db/schema";
import type { ReactNode } from "react";

export function NewTransactionButton({
  prefill,
  children = "Операция",
  variant = "primary",
  size = "sm",
}: {
  prefill?: TransactionPrefill;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "soft";
  size?: "sm" | "md";
}) {
  const { openNewTransaction } = useUi();
  return (
    <Button variant={variant} size={size} onClick={() => openNewTransaction(prefill)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function NewAccountButton({
  children = "Новый счёт",
}: {
  children?: ReactNode;
}) {
  const { openNewAccount } = useUi();
  return (
    <Button size="sm" onClick={openNewAccount}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditAccountButton({ account }: { account: AccountForEdit }) {
  const { openEditAccount } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditAccount(account)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}

export function NewCategoryButton({
  defaultKind,
  children = "Категория",
}: {
  defaultKind?: CategoryKind;
  children?: ReactNode;
}) {
  const { openNewCategory } = useUi();
  return (
    <Button size="sm" onClick={() => openNewCategory(defaultKind)}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

export function EditCategoryButton({ category }: { category: CategoryForEdit }) {
  const { openEditCategory } = useUi();
  return (
    <Button variant="secondary" size="sm" onClick={() => openEditCategory(category)}>
      <Pencil size={15} />
      Изменить
    </Button>
  );
}
