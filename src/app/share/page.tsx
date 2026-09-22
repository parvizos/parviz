import Link from "next/link";
import { QuickCapture } from "@/components/app/QuickCapture";

export const metadata = { title: "Быстрая запись" };
export const dynamic = "force-dynamic";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const { title, text, url } = await searchParams;
  const initial = [title, text, url]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-[22px] font-bold text-accent-fg shadow-[var(--shadow-md)]">
          P
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text">
          Быстрая запись
        </h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Задача или заметка — сохранится даже без сети.
        </p>
      </div>
      <QuickCapture initialText={initial} />
      <Link
        href="/segodnya"
        className="mt-5 text-center text-[13px] text-muted transition-colors hover:text-text"
      >
        В приложение →
      </Link>
    </div>
  );
}
