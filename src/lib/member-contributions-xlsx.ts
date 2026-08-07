import * as XLSX from "xlsx";

export type MemberRankRow = {
  name: string;
  number: string | null;
  department: string;
  count: number;
  total: number;
  byCat: Record<string, number>;
  byFund: Record<string, number>;
};

export type MemberRankExport = {
  churchName: string;
  periodLabel: string;
  start: string;
  end: string;
  categories: string[];
  funds: string[];
  rows: MemberRankRow[];
};

const FUND_LABEL: Record<string, string> = {
  trust: "Trust Fund",
  local: "Local Church Fund",
  camp: "Camp Expense Fund",
};

export function memberRankHeader(input: Pick<MemberRankExport, "categories" | "funds">) {
  return [
    "Rank",
    "Member",
    "Membership #",
    "Department",
    "Receipts",
    ...input.funds.map((f) => FUND_LABEL[f] ?? f),
    ...input.categories,
    "Total",
  ];
}

export function memberRankBody(input: MemberRankExport) {
  return input.rows.map((r, i) => [
    i + 1,
    r.name,
    r.number ?? "",
    r.department,
    r.count,
    ...input.funds.map((f) => r.byFund[f] ?? 0),
    ...input.categories.map((c) => r.byCat[c] ?? 0),
    r.total,
  ]);
}

export function generateMemberContributionsWorkbook(input: MemberRankExport): XLSX.WorkBook {
  const grand = input.rows.reduce((s, r) => s + r.total, 0);
  const rows: (string | number)[][] = [
    [input.churchName.toUpperCase()],
    ["Member Contribution Ranking"],
    [`PERIOD: ${input.periodLabel} (${input.start} TO ${input.end})`],
    [],
    memberRankHeader(input),
    ...memberRankBody(input),
    [
      "",
      "Total",
      "",
      "",
      input.rows.reduce((s, r) => s + r.count, 0),
      ...input.funds.map((f) => input.rows.reduce((s, r) => s + (r.byFund[f] ?? 0), 0)),
      ...input.categories.map((c) => input.rows.reduce((s, r) => s + (r.byCat[c] ?? 0), 0)),
      grand,
    ],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 16 },
    { wch: 22 },
    { wch: 10 },
    ...[...input.funds, ...input.categories].map(() => ({ wch: 18 })),
    { wch: 16 },
  ];
  for (const ref of Object.keys(sheet)) {
    if (ref.startsWith("!")) continue;
    const cell = sheet[ref] as XLSX.CellObject;
    if (cell.t === "n") cell.z = "#,##0.00;(#,##0.00);-";
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Member Ranking");
  return book;
}
