"use client";

import { useState, useTransition, useRef, type ChangeEvent } from "react";
import { Trash2, Camera, Loader2, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { AREA_PALETTE } from "@/lib/task-format";
import { ORG_KINDS_ORDER, ORG_KIND_META } from "@/lib/person-format";
import { SOCIAL_META, SOCIAL_KINDS_ORDER, type Social } from "@/lib/socials";
import { Avatar } from "./Avatar";
import { SocialIcon } from "./SocialIcon";
import {
  createPerson,
  updatePerson,
  deletePerson,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/actions";
import type { OrgKind, SocialKind } from "@/db/schema";
import type { OrganizationOption } from "./types";
import { uploadImage } from "@/lib/image-upload";

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

function AvatarPicker({
  name,
  avatar,
  icon,
  color,
  onPick,
  onClear,
  uploading,
}: {
  name: string;
  avatar: string | null;
  icon: string;
  color: string;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Загрузить фото"
        className="block rounded-full outline-none ring-accent transition-[box-shadow] focus-visible:ring-2"
      >
        <Avatar name={name || "?"} avatar={avatar} icon={icon} color={color} size={60} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-fg">
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
        </span>
      </button>
      {avatar && (
        <button
          type="button"
          onClick={onClear}
          title="Убрать фото"
          className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-danger text-white"
        >
          <X size={11} />
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}

function SocialsEditor({
  socials,
  setSocials,
}: {
  socials: Social[];
  setSocials: (v: Social[]) => void;
}) {
  const add = () =>
    setSocials([
      ...socials,
      { kind: socials.length ? "other" : "instagram", value: "" },
    ]);
  const update = (i: number, patch: Partial<Social>) =>
    setSocials(socials.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSocials(socials.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2">
      {socials.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
            style={{ color: SOCIAL_META[s.kind].color }}
          >
            <SocialIcon kind={s.kind} size={17} />
          </span>
          <Select
            value={s.kind}
            onChange={(e) => update(i, { kind: e.target.value as SocialKind })}
            className="w-[132px] shrink-0"
          >
            {SOCIAL_KINDS_ORDER.map((k) => (
              <option key={k} value={k}>
                {SOCIAL_META[k].label}
              </option>
            ))}
          </Select>
          <Input
            value={s.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder={SOCIAL_META[s.kind].placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            title="Убрать"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
      >
        <Plus size={15} /> Соцсеть
      </button>
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
  avatar: string | null;
  socials: Social[] | null;
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
  const [avatar, setAvatar] = useState<string | null>(person?.avatar ?? null);
  const [socials, setSocials] = useState<Social[]>(person?.socials ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    // Аватар показывается маленьким — 512px с запасом под ретину.
    const url = await uploadImage(file, {
      compress: { maxDim: 512, quality: 0.9 },
    });
    setUploading(false);
    if (url) setAvatar(url);
  }

  function submit() {
    const n = name.trim();
    if (!n) {
      setError("Введите имя");
      return;
    }
    startTransition(async () => {
      try {
        const cleanSocials = socials
          .map((s) => ({ kind: s.kind, value: s.value.trim() }))
          .filter((s) => s.value.length > 0);
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
          avatar,
          socials: cleanSocials.length ? cleanSocials : null,
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
        <div className="flex items-center gap-3">
          <AvatarPicker
            name={name}
            avatar={avatar}
            icon={icon}
            color={color}
            onPick={onPickAvatar}
            onClear={() => setAvatar(null)}
            uploading={uploading}
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
        <Field label="Соцсети и мессенджеры">
          <SocialsEditor socials={socials} setSocials={setSocials} />
        </Field>
        <Field label="Заметка">
          <Textarea
            placeholder="Где познакомились, что важно…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Field label="Оформление" hint="Эмодзи и цвет — если не загружено фото">
          <div className="flex items-center gap-3">
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              placeholder="🙂"
              className="w-14 text-center text-lg"
              aria-label="Эмодзи"
            />
            <ColorPicker value={color} onChange={setColor} />
          </div>
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
