"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" defaultValue={next} />
      <Input
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Пароль"
        className="h-11 text-[15px]"
      />
      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
