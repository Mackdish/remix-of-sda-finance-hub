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
import { Download } from "lucide-react";

export type FundType = "trust" | "local" | "camp";

export function FundsPage({ fundType, title, description }: { fundType: FundType; title: string; description: string }) {
  const { data: church } = useCurrentChurch();
  const [kind, setKind] = useState<PeriodKind>("monthly");
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const { start, end, label } = periodRange(kind, anchor);

  const { data: rows = [] } = useQuery({
    queryKey: ["funds", fundType, church?.id, start, end],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase
        .from("receipts")
        .select("id,receipt_number,transaction_date,member_name,amount,departments(name),offering_categories!inner(name,fund_type,conference_split_pct)")
        .eq("church_id", church!.id)
        .eq("offering_categories.fund_type", fundType)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: false })
        .limit(1000);
      return (data ?? []) as any[];
    },
  });

  const byCategory = useMemo(() => {
    const m = new Map<string, { name: string; total: number; conf: number; local: number }>();
    rows.forEach((r) => {
      const name = r.offering_categories?.name ?? "Other";
      const split = Number(r.offering_categories?.conference_split_pct ?? 0);
      const amt = Number(r.amount);
      const conf = amt * (split / 100);
      const cur = m.get(name) ?? { name, total: 0, conf: 0, local: 0 };
      cur.total += amt;
      cur.conf += conf;
      cur.local += amt - conf;
      m.set(name, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const byDepartment = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const name = r.departments?.name ?? "Unassigned";
      m.set(name, (m.get(name) ?? 0) + Number(r.amount));
    });
    return Array.from(m.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [rows]);

  const total = byCategory.reduce((s, r) => s + r.total, 0);
  const conf = byCategory.reduce((s, r) => s + r.conf, 0);
  const local = byCategory.reduce((s, r) => s + r.local, 0);

  if (!church) return <><PageHeader title={title} /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" onClick={() => downloadCsv(`${fundType}_fund_${start}_${end}.csv`, [
            ["Category", "Total", "Conference share", "Local share"],
            ...byCategory.map((r) => [r.name, r.total, r.conf, r.local]),
            ["TOTAL", total, conf, local],
          ])}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <PeriodPicker kind={kind} anchor={anchor} onKind={setKind} onAnchor={setAnchor} label={`${label} (${start} → ${end})`} />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total collected</div><div className="text-xl font-bold">{formatCurrency(total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Conference share</div><div className="text-xl font-bold text-primary">{formatCurrency(conf)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Local church share</div><div className="text-xl font-bold">{formatCurrency(local)}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No {fundType} offerings in {label}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2 pr-4">Category</th><th className="py-2 pr-4 text-right">Total</th><th className="py-2 pr-4 text-right">Conference</th><th className="py-2 pr-4 text-right">Local</th></tr>
                </thead>
                <tbody>
                  {byCategory.map((r) => (
                    <tr key={r.name} className="border-t border-border">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.total)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.conf)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.local)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(total)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(conf)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(local)}</td>
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
