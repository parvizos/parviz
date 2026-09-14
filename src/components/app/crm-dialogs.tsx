"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { AREA_PALETTE } from "@/lib/task-format";
import { ORG_KINDS_ORDER, ORG_KIND_META } from "@/lib/person-format";
import {
  createPerson,
  updatePerson,
  deletePerson,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/actions";
import type { OrgKind } from "@/db/schema";
import type { OrganizationOption } from "./types";

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AREA_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          onClick={() => onChange(c.value)}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
          style={{
            background: c.value,
            boxShadow: value === c.value ? `0 0 0 2px ${c.value}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export type PersonForEdit = {
  id: string;
  name: string;
  role: string | null;
  organizationId: string | null;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  note: string | null;
  color: string | null;
  icon: string | null;
};

export function PersonDialog({
  onClose,
  person,
  organizationOptions,
  defaultOrganizationId,
}: {
  onClose: () => void;
  person?: PersonForEdit | null;
  organizationOptions: OrganizationOption[];
  defaultOrganizationId?: string | null;
}) {
  const editing = !!person;
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [organizationId, setOrganizationId] = useState(
    person?.organizationId ?? defaultOrganizationId ?? "",
  );
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [birthday, setBirthday] = useState(person?.birthday ?? "");
  const [note, setNote] = useState(person?.note ?? "");
  const [color, setColor] = useState(person?.color ?? AREA_PALETTE[0].value);
  const [icon, setIcon] = useState(person?.icon ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите имя");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name: n,
          role: role.trim() || null,
          organizationId: organizationId || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          birthday: birthday || null,
          note: note.trim() || null,
          color,
          icon: icon || null,
        };
        if (editing && person) await updatePerson(person.id, payload);
        else await createPerson(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!person) return;
    if (!confirm("Удалить человека? Связи в задачах и операциях обнулятся."))
      return;
    startTransition(async () => {
      await deletePerson(person.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Человек" : "Новый человек"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder="🙂"
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Кто это">
            <Input
              placeholder="Научрук, друг…"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </Field>
          <Field label="Организация">
            <Select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">—</option>
              {organizationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Телефон">
            <Input
              inputMode="tel"
              placeholder="+7…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Почта">
            <Input
              inputMode="email"
              placeholder="mail@…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
        <Field label="День рождения">
          <Input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="max-w-[200px]"
          />
        </Field>
        <Field label="Заметка">
          <Textarea
            placeholder="Где познакомились, что важно…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </Modal>
  );
}

export type OrganizationForEdit = {
  id: string;
  name: string;
  kind: OrgKind;
  note: string | null;
  url: string | null;
  color: string | null;
  icon: string | null;
};

export function OrganizationDialog({
  onClose,
  organization,
}: {
  onClose: () => void;
  organization?: OrganizationForEdit | null;
}) {
  const editing = !!organization;
  const [name, setName] = useState(organization?.name ?? "");
  const [kind, setKind] = useState<OrgKind>(organization?.kind ?? "university");
  const [note, setNote] = useState(organization?.note ?? "");
  const [url, setUrl] = useState(organization?.url ?? "");
  const [color, setColor] = useState(
    organization?.color ?? AREA_PALETTE[0].value,
  );
  const [icon, setIcon] = useState(organization?.icon ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите название");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          name: n,
          kind,
          note: note.trim() || null,
          url: url.trim() || null,
          color,
          icon: icon || null,
        };
        if (editing && organization)
          await updateOrganization(organization.id, payload);
        else await createOrganization(payload);
        onClose();
      } catch {
        setError("Не удалось сохранить");
      }
    });
  }

  function remove() {
    if (!organization) return;
    if (!confirm("Удалить организацию? У людей связь с ней обнулится.")) return;
    startTransition(async () => {
      await deleteOrganization(organization.id);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Организация" : "Новая организация"}
      footer={
        <div className="flex w-full items-center justify-between">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={15} /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Отмена
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            placeholder={ORG_KIND_META[kind].icon}
            className="w-14 text-center text-lg"
            aria-label="Эмодзи"
          />
          <div className="flex-1">
            <Field error={error ?? undefined}>
              <Input
                autoFocus
                placeholder="Например, МГУ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-[15px]"
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Тип">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as OrgKind)}
            >
              {ORG_KINDS_ORDER.map((k) => (
                <option key={k} value={k}>
                  {ORG_KIND_META[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Сайт">
            <Input
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Заметка">
          <Textarea
            placeholder="Что за организация, чем связаны…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </Modal>
  );
}
