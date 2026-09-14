import { isAuthed } from "@/lib/session";
import { getTransactions } from "@/lib/queries";
import { TX_KIND_META } from "@/lib/finance-format";

export const runtime = "nodejs";

/** Экранирование поля CSV (разделитель «;», кавычки удваиваются). */
function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Минорные единицы → строка с точкой-разделителем, без символа валюты. */
function money(minor: number | null | undefined): string {
  if (minor == null) return "";
  return (minor / 100).toFixed(2);
}

export async function GET() {
  if (!(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }

  const txs = await getTransactions();

  const headers = [
    "Дата",
    "Вид",
    "Сумма",
    "Валюта",
    "Счёт",
    "Счёт получателя",
    "Зачислено",
    "Категория",
    "Комментарий",
    "Сфера",
    "Проект",
    "Предмет",
    "Человек",
  ];

  const rows = txs.map((t) =>
    [
      t.date,
      TX_KIND_META[t.kind].label,
      money(t.amount),
      t.accountCurrency ?? "",
      t.accountName ?? "",
      t.kind === "transfer" ? t.toAccountName ?? "" : "",
      t.kind === "transfer" ? money(t.amountTo ?? t.amount) : "",
      t.categoryName ?? "",
      t.note ?? "",
      t.areaName ?? "",
      t.projectName ?? "",
      t.subjectName ?? "",
      t.personName ?? "",
    ]
      .map(cell)
      .join(";"),
  );

  // BOM — чтобы кириллица открывалась в Excel корректно.
  const csv = "﻿" + [headers.map(cell).join(";"), ...rows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="parviz-finance-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
