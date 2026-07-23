import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export function FundsPage({ fundType, title, description }: { fundType: "trust" | "local"; title: string; description: string }) {
  const { data: church } = useCurrentChurch();
  const { data: rows = [] } = useQuery({
    queryKey: ["funds", fundType, church?.id],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase
        .from("receipts")
        .select("id,receipt_number,transaction_date,member_name,amount,offering_categories!inner(name,fund_type,conference_split_pct)")
        .eq("church_id", church!.id)
        .eq("offering_categories.fund_type", fundType)
        .order("transaction_date", { ascending: false })
        .limit(500);
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

  const total = byCategory.reduce((s, r) => s + r.total, 0);
  const conf = byCategory.reduce((s, r) => s + r.conf, 0);
  const local = byCategory.reduce((s, r) => s + r.local, 0);

  if (!church) return <><PageHeader title={title} /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total collected</div><div className="text-xl font-bold">{formatCurrency(total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Conference share</div><div className="text-xl font-bold text-primary">{formatCurrency(conf)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Local church share</div><div className="text-xl font-bold">{formatCurrency(local)}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No {fundType} offerings yet.</div>
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
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}