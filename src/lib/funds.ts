/**
 * SDA fund split rules — driven by offering_categories.conference_split_pct.
 *
 * Trust / Conference share  = amount * conference_split_pct / 100
 * Local church share        = amount - conference share
 *
 * Categories whose fund_type is "camp" keep their local share in the
 * Camp Expense fund instead of the general local church fund.
 *
 * Invariant: trust + local + camp === total receipts.
 */
export type SplitCategoryRow = {
  name: string;
  fundType: "trust" | "local" | "camp";
  splitPct: number;
  amount: number;
  trust: number;
  local: number;
};

export type SplitTotals = {
  categories: SplitCategoryRow[];
  total: number;
  trust: number;
  local: number;
  camp: number;
  balanced: boolean;
  difference: number;
};

type RawReceipt = {
  amount: number | string;
  offering_categories?: {
    name?: string | null;
    fund_type?: string | null;
    conference_split_pct?: number | string | null;
  } | null;
};

export function splitReceipts(rows: RawReceipt[]): SplitTotals {
  const map = new Map<string, SplitCategoryRow>();
  let total = 0;
  let trust = 0;
  let local = 0;
  let camp = 0;

  for (const r of rows) {
    const cat = r.offering_categories ?? {};
    const name = cat.name ?? "Uncategorized";
    const fundType = (cat.fund_type ?? "local") as SplitCategoryRow["fundType"];
    const splitPct = Number(cat.conference_split_pct ?? 0);
    const amount = Number(r.amount ?? 0);
    const confShare = (amount * splitPct) / 100;
    const localShare = amount - confShare;

    const row = map.get(name) ?? { name, fundType, splitPct, amount: 0, trust: 0, local: 0 };
    row.amount += amount;
    row.trust += confShare;
    row.local += localShare;
    map.set(name, row);

    total += amount;
    trust += confShare;
    if (fundType === "camp") camp += localShare;
    else local += localShare;
  }

  const difference = Math.round((total - (trust + local + camp)) * 100) / 100;
  return {
    categories: Array.from(map.values()).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
    total,
    trust,
    local,
    camp,
    balanced: Math.abs(difference) < 0.01,
    difference,
  };
}

export const FUND_LABEL: Record<SplitCategoryRow["fundType"], string> = {
  trust: "Trust / Conference",
  local: "Local church",
  camp: "Camp expense",
};