export type PeriodKind = "daily" | "weekly" | "monthly" | "quarterly" | "annually";

export const PERIOD_KINDS: { value: PeriodKind; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Resolve a reporting period (inclusive start/end, YYYY-MM-DD) around an anchor date.
 *  Weeks run Sunday to Sabbath (Saturday), matching the SDA reporting week. */
export function periodRange(kind: PeriodKind, anchorDate: string): { start: string; end: string; label: string } {
  const [y, m, d] = anchorDate.split("-").map(Number);
  const anchor = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));

  if (kind === "daily") {
    return { start: iso(anchor), end: iso(anchor), label: anchor.toUTCString().slice(0, 16) };
  }
  if (kind === "weekly") {
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start: iso(start), end: iso(end), label: `Week of ${iso(start)} (Sun–Sabbath)` };
  }
  if (kind === "monthly") {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return {
      start: iso(start),
      end: iso(end),
      label: start.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }
  if (kind === "quarterly") {
    const q = Math.floor(anchor.getUTCMonth() / 3);
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3, 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + 3, 0));
    return { start: iso(start), end: iso(end), label: `Q${q + 1} ${anchor.getUTCFullYear()}` };
  }
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), 11, 31));
  return { start: iso(start), end: iso(end), label: `Year ${anchor.getUTCFullYear()}` };
}

export const FUND_LABELS: Record<string, string> = {
  trust: "Trust Fund (Conference)",
  local: "Local Church Fund",
  camp: "Camp Expense Fund",
};

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
