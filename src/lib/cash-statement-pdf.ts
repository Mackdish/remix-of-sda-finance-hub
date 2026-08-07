import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";

export type PdfCategory = {
  name: string;
  fund: string;
  splitPct: number;
  amount: number;
  trust: number;
  local: number;
};
export type PdfExpense = { date: string; description: string; category: string; amount: number };
export type PdfSignatures = {
  treasurer?: string | null;
  elder?: string | null;
  pastor?: string | null;
  treasurerName?: string | null;
  elderName?: string | null;
  pastorName?: string | null;
};

export type CashStatementPdfInput = {
  churchName: string;
  location: string;
  start: string;
  end: string;
  categories: PdfCategory[];
  totalReceipts: number;
  trust: number;
  local: number;
  camp?: number;
  balanced?: boolean;
  expenses: PdfExpense[];
  totalExpenses: number;
  net: number;
  signatures?: PdfSignatures;
};

const money = (n: number) => formatCurrency(n).replace(/^KES\s*/, "");

export function generateCashStatementPdf(input: CashStatementPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 60, 40);
  doc.text(input.churchName.toUpperCase(), pageWidth / 2, 50, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (input.location) doc.text(input.location.toUpperCase(), pageWidth / 2, 66, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Treasurer's Cash Statement", pageWidth / 2, 86, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`PERIOD: ${input.start} TO ${input.end}`, pageWidth / 2, 100, { align: "center" });

  let y = 120;

  // Part A — Receipts
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Part A — Receipts (Income)", marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["CATEGORY", "FUND", "SPLIT", "AMOUNT", "TRUST/CONF", "LOCAL"]],
    body:
      input.categories.length > 0
        ? input.categories.map((c) => [
            c.name,
            c.fund,
            `${c.splitPct}% / ${100 - c.splitPct}%`,
            money(c.amount),
            money(c.trust),
            money(c.local),
          ])
        : [[{ content: "No receipts in this period", colSpan: 6, styles: { halign: "center", textColor: 120 } } as any]],
    foot: [[
      { content: "Total Receipts", colSpan: 3, styles: { halign: "left", fontStyle: "bold" } },
      { content: money(input.totalReceipts), styles: { halign: "right", fontStyle: "bold" } },
      { content: money(input.trust), styles: { halign: "right", fontStyle: "bold" } },
      { content: money(input.local + (input.camp ?? 0)), styles: { halign: "right", fontStyle: "bold" } },
    ]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [20, 60, 40], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Part B — Fund Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Part B — Fund Summary", marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    body: [
      ["Trust Fund — remitted to Conference", money(input.trust)],
      ["Local Church Fund", money(input.local)],
      ["Camp Expense Fund", money(input.camp ?? 0)],
      [
        input.balanced === false
          ? "TOTAL (does not balance with receipts)"
          : "TOTAL (balances with Total Receipts)",
        money(input.trust + input.local + (input.camp ?? 0)),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 1: { halign: "right", cellWidth: 140 } },
    margin: { left: marginX, right: marginX },
    theme: "grid",
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Part C — Expenses
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Part C — Expenses", marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["DATE", "DESCRIPTION", "CATEGORY", "AMOUNT (KES)"]],
    body:
      input.expenses.length > 0
        ? input.expenses.map((e) => [e.date, e.description, e.category, money(e.amount)])
        : [[{ content: "No expenses in this period", colSpan: 4, styles: { halign: "center", textColor: 120 } } as any]],
    foot: [[{ content: "Total Expenses", colSpan: 3, styles: { halign: "left", fontStyle: "bold" } }, { content: money(input.totalExpenses), styles: { halign: "right", fontStyle: "bold" } }]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [20, 60, 40], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  // Net balance
  doc.setDrawColor(180);
  doc.line(marginX, y - 6, pageWidth - marginX, y - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("NET BALANCE FOR PERIOD", marginX, y + 10);
  doc.setTextColor(input.net >= 0 ? 20 : 180, input.net >= 0 ? 90 : 40, 40);
  doc.text(formatCurrency(input.net), pageWidth - marginX, y + 10, { align: "right" });
  doc.setTextColor(20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Receipts: ${money(input.totalReceipts)}  ·  Expenses: ${money(input.totalExpenses)}`, marginX, y + 26);
  doc.line(marginX, y + 34, pageWidth - marginX, y + 34);

  // Signatures
  const sigY = Math.min(y + 90, doc.internal.pageSize.getHeight() - 90);
  const colW = (pageWidth - marginX * 2) / 3;
  const sigs: Array<{ img?: string | null; role: string; name?: string | null }> = [
    { img: input.signatures?.treasurer, role: "TREASURER", name: input.signatures?.treasurerName },
    { img: input.signatures?.elder, role: "HEAD ELDER", name: input.signatures?.elderName },
    { img: input.signatures?.pastor, role: "PASTOR", name: input.signatures?.pastorName },
  ];
  sigs.forEach((s, i) => {
    const x = marginX + colW * i;
    if (s.img) {
      try {
        doc.addImage(s.img, "PNG", x + 10, sigY - 30, colW - 20, 30);
      } catch {
        /* ignore */
      }
    }
    doc.setDrawColor(30);
    doc.line(x + 10, sigY + 4, x + colW - 10, sigY + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(s.role, x + colW / 2, sigY + 16, { align: "center" });
    if (s.name) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(s.name, x + colW / 2, sigY + 28, { align: "center" });
      doc.setTextColor(20);
    }
  });

  return doc;
}