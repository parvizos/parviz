import { LoginForm } from "./LoginForm";
import { usingDefaultSecrets } from "@/lib/auth";

export const metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const demo = usingDefaultSecrets();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-fg shadow-[var(--shadow-md)]">
            P
          </div>
          <h1 className="text-[20px] font-semibold text-text">ParvizOS</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Личная система. Вход только для тебя.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
          <LoginForm next={next ?? "/"} />
        </div>

        {demo && (
          <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
            Пароль по умолчанию — <span className="font-mono text-muted">parviz</span>.
            <br />
            Поменяй <span className="font-mono">APP_PASSWORD</span> и{" "}
            <span className="font-mono">AUTH_SECRET</span> в{" "}
            <span className="font-mono">.env.local</span>.
          </p>
        )}
      </div>
    </div>
  );
}
