import * as XLSX from "xlsx";
import type { CashStatementPdfInput } from "@/lib/cash-statement-pdf";

type Row = (string | number)[];

export function generateCashStatementWorkbook(input: CashStatementPdfInput): XLSX.WorkBook {
  const rows: Row[] = [];
  rows.push([input.churchName.toUpperCase()]);
  if (input.location) rows.push([input.location.toUpperCase()]);
  rows.push(["Treasurer's Cash Statement"]);
  rows.push([`PERIOD: ${input.start} TO ${input.end}`]);
  rows.push([]);

  rows.push(["Part A — Receipts (Income)"]);
  rows.push(["CATEGORY", "FUND", "SPLIT (CONF/LOCAL)", "AMOUNT (KES)", "TRUST/CONFERENCE", "LOCAL CHURCH"]);
  if (input.categories.length === 0) rows.push(["No receipts in this period"]);
  else
    for (const c of input.categories)
      rows.push([c.name, c.fund, `${c.splitPct}% / ${100 - c.splitPct}%`, c.amount, c.trust, c.local]);
  rows.push([
    "Total Receipts",
    "",
    "",
    input.totalReceipts,
    input.trust,
    input.local + (input.camp ?? 0),
  ]);
  rows.push([]);

  rows.push(["Part B — Fund Summary"]);
  rows.push(["Trust Fund — remitted to Conference", "", input.trust]);
  rows.push(["Local Church Fund", "", input.local]);
  rows.push(["Camp Expense Fund", "", input.camp ?? 0]);
  rows.push([
    input.balanced === false ? "TOTAL (does not balance with receipts)" : "TOTAL (balances with Total Receipts)",
    "",
    input.trust + input.local + (input.camp ?? 0),
  ]);
  rows.push([]);

  rows.push(["Part C — Expenses"]);
  rows.push(["DATE", "DESCRIPTION", "CATEGORY", "AMOUNT (KES)"]);
  if (input.expenses.length === 0) rows.push(["No expenses in this period"]);
  else for (const e of input.expenses) rows.push([e.date, e.description, e.category, e.amount]);
  rows.push(["Total Expenses", "", "", input.totalExpenses]);
  rows.push([]);

  rows.push(["NET BALANCE FOR PERIOD", "", "", input.net]);
  rows.push([]);
  rows.push(["TREASURER", input.signatures?.treasurerName ?? ""]);
  rows.push(["HEAD ELDER", input.signatures?.elderName ?? ""]);
  rows.push(["PASTOR", input.signatures?.pastorName ?? ""]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 46 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  for (const ref of Object.keys(sheet)) {
    if (ref.startsWith("!")) continue;
    const cell = sheet[ref] as XLSX.CellObject;
    if (cell.t === "n") cell.z = "#,##0.00;(#,##0.00);-";
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Cash Statement");
  return book;
}