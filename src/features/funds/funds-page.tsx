import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import { periodRange, downloadCsv, type PeriodKind } from "@/lib/periods";
import { splitReceipts } from "@/lib/funds";
import { Download } from "lucide-react";

export type FundType = "trust" | "local" | "camp";

export function FundsPage({ fundType, title, description }: { fundType: FundType; title: string; description: string }) {
  const { data: church } = useCurrentChurch();
  const [kind, setKind] = useState<PeriodKind>("monthly");
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const { start, end, label } = periodRange(kind, anchor);

  const { data: rows = [] } = useQuery({
    queryKey: ["funds", church?.id, start, end],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase
        .from("receipts")
        .select("id,receipt_number,transaction_date,member_name,amount,departments(name),offering_categories!inner(name,fund_type,conference_split_pct)")
        .eq("church_id", church!.id)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: false })
        .limit(1000);
      return (data ?? []) as any[];
    },
  });

  // Every category can feed more than one fund: the conference share goes to the
  // trust fund and the remainder stays with the local church (or the camp fund
  // for camp categories). Each page shows only the share belonging to its fund.
  const shareOf = (r: any) => {
    const cat = r.offering_categories ?? {};
    const catFund = (cat.fund_type ?? "local") as FundType;
    const pct = Number(cat.conference_split_pct ?? 0);
    const amt = Number(r.amount ?? 0);
    const confShare = (amt * pct) / 100;
    if (fundType === "trust") return confShare;
    if (fundType === "camp") return catFund === "camp" ? amt - confShare : 0;
    return catFund === "camp" ? 0 : amt - confShare;
  };

  const byCategory = useMemo(() => {
    const m = new Map<string, { name: string; pct: number; gross: number; share: number }>();
    rows.forEach((r) => {
      const share = shareOf(r);
      if (share === 0) return;
      const name = r.offering_categories?.name ?? "Other";
      const pct = Number(r.offering_categories?.conference_split_pct ?? 0);
      const cur = m.get(name) ?? { name, pct, gross: 0, share: 0 };
      cur.gross += Number(r.amount ?? 0);
      cur.share += share;
      m.set(name, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.share - a.share);
  }, [rows, fundType]);

  const byDepartment = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const share = shareOf(r);
      if (share === 0) return;
      const name = r.departments?.name ?? "Unassigned";
      m.set(name, (m.get(name) ?? 0) + share);
    });
    return Array.from(m.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [rows, fundType]);

  const overall = useMemo(() => splitReceipts(rows), [rows]);
  const total = byCategory.reduce((s, r) => s + r.share, 0);
  const gross = byCategory.reduce((s, r) => s + r.gross, 0);

  if (!church) return <><PageHeader title={title} /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={() => downloadCsv(`${fundType}_fund_${start}_${end}.csv`, [
            ["Category", "Conference split %", "Gross collected", `${title} share`],
            ...byCategory.map((r) => [r.name, r.pct, r.gross, r.share]),
            ["TOTAL", "", gross, total],
          ])}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <PeriodPicker kind={kind} anchor={anchor} onKind={setKind} onAnchor={setAnchor} label={`${label} (${start} → ${end})`} />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{title} balance</div><div className="text-xl font-bold text-primary">{formatCurrency(total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gross receipts feeding this fund</div><div className="text-xl font-bold">{formatCurrency(gross)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Share of all receipts</div><div className="text-xl font-bold">{overall.total ? Math.round((total / overall.total) * 100) : 0}%</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Fund reconciliation — {label}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Trust fund (conference)</span><span>{formatCurrency(overall.trust)}</span></div>
          <div className="flex justify-between"><span>Local church fund</span><span>{formatCurrency(overall.local)}</span></div>
          <div className="flex justify-between"><span>Camp expense fund</span><span>{formatCurrency(overall.camp)}</span></div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total receipts</span><span>{formatCurrency(overall.total)}</span>
          </div>
          <div className={`text-xs ${overall.balanced ? "text-primary" : "text-destructive"}`}>
            {overall.balanced ? "Balanced — trust + local + camp equals total receipts." : `Out of balance by ${formatCurrency(overall.difference)}.`}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No {fundType} fund contributions in {label}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2 pr-4">Category</th><th className="py-2 pr-4 text-right">Split</th><th className="py-2 pr-4 text-right">Gross collected</th><th className="py-2 pr-4 text-right">{title} share</th></tr>
                </thead>
                <tbody>
                  {byCategory.map((r) => (
                    <tr key={r.name} className="border-t border-border">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4 text-right">{r.pct}% / {100 - r.pct}%</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.gross)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.share)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4"></td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(gross)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">By department</CardTitle></CardHeader>
        <CardContent>
          {byDepartment.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nothing to show.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2 pr-4">Department</th><th className="py-2 pr-4 text-right">Amount</th></tr></thead>
              <tbody>
                {byDepartment.map((d) => (
                  <tr key={d.name} className="border-t border-border">
                    <td className="py-2 pr-4">{d.name}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
