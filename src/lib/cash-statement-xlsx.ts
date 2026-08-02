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
  rows.push(["CATEGORY", "FUND", "AMOUNT (KES)"]);
  if (input.categories.length === 0) rows.push(["No receipts in this period"]);
  else for (const c of input.categories) rows.push([c.name, c.fund, c.amount]);
  rows.push(["Total Receipts", "", input.totalReceipts]);
  rows.push([]);

  rows.push(["Part B — Fund Summary"]);
  rows.push(["Conference (Tithe & Combined Offering)", "", input.conference]);
  rows.push(["Trust Funds (Sabbath School, 13th Sabbath, Missions)", "", input.trust]);
  rows.push(["Local Church Funds", "", input.local]);
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
  sheet["!cols"] = [{ wch: 46 }, { wch: 26 }, { wch: 20 }, { wch: 16 }];
  for (const ref of Object.keys(sheet)) {
    if (ref.startsWith("!")) continue;
    const cell = sheet[ref] as XLSX.CellObject;
    if (cell.t === "n") cell.z = "#,##0.00;(#,##0.00);-";
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Cash Statement");
  return book;
}