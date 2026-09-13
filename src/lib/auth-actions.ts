"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = { error?: string };

function safeNext(next: string): string {
  // Только внутренние пути, без открытых редиректов.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!verifyPassword(password)) {
    return { error: "Неверный пароль" };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect(next);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
