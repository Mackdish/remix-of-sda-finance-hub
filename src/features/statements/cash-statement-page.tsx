import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { Printer } from "lucide-react";
import { printElement } from "@/lib/print";

type ReceiptRow = {
  amount: number;
  offering_categories: {
    name: string;
    fund_type: string | null;
    conference_split_pct: number | null;
  } | null;
};

type ExpenseRow = {
  amount: number;
  transaction_date: string;
  description: string | null;
  expense_categories: { name: string } | null;
};

const TRUST_FUND_NAMES = ["sabbath school", "13th sabbath", "mission", "missions"];

export function CashStatementPage() {
  const { data: church } = useCurrentChurch();
  const [start, setStart] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["cash-statement", church?.id, start, end],
    enabled: !!church,
    queryFn: async () => {
      const [rc, ex] = await Promise.all([
        supabase.from("receipts")
          .select("amount,offering_categories(name,fund_type,conference_split_pct)")
          .eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end),
        supabase.from("expenses")
          .select("amount,transaction_date,description,expense_categories(name)")
          .eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end)
          .order("transaction_date", { ascending: true }),
      ]);
      return { receipts: (rc.data ?? []) as unknown as ReceiptRow[], expenses: (ex.data ?? []) as unknown as ExpenseRow[] };
    },
  });

  const view = useMemo(() => {
    const receipts = data?.receipts ?? [];
    const expenses = data?.expenses ?? [];

    // Aggregate receipts by category
    const catMap = new Map<string, { name: string; fund: "CONFERENCE" | "LOCAL"; amount: number }>();
    for (const r of receipts) {
      const name = r.offering_categories?.name ?? "Uncategorized";
      const split = Number(r.offering_categories?.conference_split_pct ?? 0);
      const fund: "CONFERENCE" | "LOCAL" = split >= 50 ? "CONFERENCE" : "LOCAL";
      const key = `${name}|${fund}`;
      const prev = catMap.get(key);
      const amt = Number(r.amount);
      if (prev) prev.amount += amt;
      else catMap.set(key, { name, fund, amount: amt });
    }
    const categories = Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const totalReceipts = categories.reduce((s, c) => s + c.amount, 0);

    // Fund Summary
    let conference = 0;
    let trust = 0;
    let local = 0;
    for (const r of receipts) {
      const name = (r.offering_categories?.name ?? "").toLowerCase();
      const split = Number(r.offering_categories?.conference_split_pct ?? 0);
      const amt = Number(r.amount);
      const confShare = (amt * split) / 100;
      const localShare = amt - confShare;
      conference += confShare;
      if (TRUST_FUND_NAMES.some((n) => name.includes(n))) trust += localShare;
      else local += localShare;
    }

    const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
    const net = totalReceipts - totalExpenses;

    return { categories, totalReceipts, conference, trust, local, expenses, totalExpenses, net };
  }, [data]);

  if (!church) return <><PageHeader title="Cash Statement" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Statement"
        description="SDA Church Treasurer's Cash Statement."
        actions={<Button onClick={() => printElement("cash-statement", "Cash Statement")}><Printer className="h-4 w-4 mr-1" /> Print</Button>}
      />
      <Card className="no-print">
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div id="cash-statement" className="space-y-6 bg-card p-6 rounded-md border border-border">
        <div className="text-center border-b border-border pb-3">
          <div className="font-bold text-primary text-xl uppercase">{church.name}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {[church.address, church.city].filter(Boolean).join(" · ")}
          </div>
          <div className="font-semibold mt-2 text-base">Treasurer's Cash Statement</div>
          <div className="text-xs mt-1">PERIOD: {start} TO {end}</div>
        </div>

        {/* Part A — Receipts */}
        <section>
          <h3 className="font-semibold text-sm mb-2">Part A — Receipts (Income)</h3>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 border-b border-border">CATEGORY</th>
                <th className="text-left p-2 border-b border-border">FUND</th>
                <th className="text-right p-2 border-b border-border">AMOUNT (KES)</th>
              </tr>
            </thead>
            <tbody>
              {view.categories.length === 0 ? (
                <tr><td colSpan={3} className="p-3 text-center text-muted-foreground">No receipts in this period</td></tr>
              ) : view.categories.map((c, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.fund}</td>
                  <td className="p-2 text-right">{formatCurrency(c.amount).replace(/^KES\s*/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-2 font-semibold text-sm">
            <span>Total Receipts</span>
            <span>{formatCurrency(view.totalReceipts)}</span>
          </div>
        </section>

        {/* Part B — Fund Summary */}
        <section>
          <h3 className="font-semibold text-sm mb-2">Part B — Fund Summary</h3>
          <table className="w-full text-sm border border-border">
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2">Conference (Tithe & Combined Offering)</td>
                <td className="p-2 text-right">{formatCurrency(view.conference).replace(/^KES\s*/, "")}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">Trust Funds (Sabbath School, 13th Sabbath, Missions)</td>
                <td className="p-2 text-right">{formatCurrency(view.trust).replace(/^KES\s*/, "")}</td>
              </tr>
              <tr>
                <td className="p-2">Local Church Funds</td>
                <td className="p-2 text-right">{formatCurrency(view.local).replace(/^KES\s*/, "")}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Part C — Expenses */}
        <section>
          <h3 className="font-semibold text-sm mb-2">Part C — Expenses</h3>
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 border-b border-border">DATE</th>
                <th className="text-left p-2 border-b border-border">DESCRIPTION</th>
                <th className="text-left p-2 border-b border-border">CATEGORY</th>
                <th className="text-right p-2 border-b border-border">AMOUNT (KES)</th>
              </tr>
            </thead>
            <tbody>
              {view.expenses.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No expenses in this period</td></tr>
              ) : view.expenses.map((e, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2">{e.transaction_date}</td>
                  <td className="p-2">{e.description ?? ""}</td>
                  <td className="p-2">{e.expense_categories?.name ?? "Other"}</td>
                  <td className="p-2 text-right">{formatCurrency(Number(e.amount)).replace(/^KES\s*/, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-2 font-semibold text-sm">
            <span>Total Expenses</span>
            <span>{formatCurrency(view.totalExpenses)}</span>
          </div>
        </section>

        {/* Net Balance */}
        <section className="border-t border-b border-border py-3">
          <div className="flex justify-between items-center font-bold text-base">
            <span>NET BALANCE FOR PERIOD</span>
            <span className={view.net >= 0 ? "text-primary" : "text-destructive"}>{formatCurrency(view.net)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Receipts: {formatCurrency(view.totalReceipts).replace(/^KES\s*/, "")} · Expenses: {formatCurrency(view.totalExpenses).replace(/^KES\s*/, "")}
          </div>
        </section>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-10 text-xs">
          <div className="text-center">
            <div className="border-t border-foreground pt-1">TREASURER</div>
            <div className="text-muted-foreground mt-1">{church.treasurer_name ?? ""}</div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground pt-1">HEAD ELDER</div>
            <div className="text-muted-foreground mt-1">{church.elder_name ?? ""}</div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground pt-1">PASTOR</div>
            <div className="text-muted-foreground mt-1">{church.pastor_name ?? ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}