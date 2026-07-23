import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { printElement } from "@/lib/print";
import { Download, Printer } from "lucide-react";

function toCsv(rows: any[][]) {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

function downloadCsv(name: string, rows: any[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsPage() {
  const { data: church } = useCurrentChurch();
  const now = new Date();
  const [start, setStart] = useState(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState(now.toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["report", church?.id, start, end],
    enabled: !!church,
    queryFn: async () => {
      const [rc, ex] = await Promise.all([
        supabase.from("receipts").select("transaction_date,receipt_number,member_name,amount,offering_categories(name,fund_type,conference_split_pct)").eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end).order("transaction_date"),
        supabase.from("expenses").select("transaction_date,amount,vendor_name,description,expense_categories(name)").eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end).order("transaction_date"),
      ]);
      return { r: (rc.data ?? []) as any[], ex: (ex.data ?? []) as any[] };
    },
  });

  const receipts = data?.r ?? [];
  const expenses = data?.ex ?? [];
  const income = receipts.reduce((s, x) => s + Number(x.amount), 0);
  const spend = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const conf = receipts.reduce((s, x) => s + Number(x.amount) * Number(x.offering_categories?.conference_split_pct ?? 0) / 100, 0);

  if (!church) return <><PageHeader title="Reports" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Comprehensive financial reports with CSV export and printing."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv(`receipts_${start}_${end}.csv`, [
              ["Date","Receipt #","Member","Category","Fund","Amount"],
              ...receipts.map((r) => [r.transaction_date, r.receipt_number, r.member_name ?? "", r.offering_categories?.name ?? "", r.offering_categories?.fund_type ?? "", r.amount]),
            ])}><Download className="h-4 w-4 mr-1" /> Receipts CSV</Button>
            <Button variant="outline" onClick={() => downloadCsv(`expenses_${start}_${end}.csv`, [
              ["Date","Category","Vendor","Description","Amount"],
              ...expenses.map((r) => [r.transaction_date, r.expense_categories?.name ?? "", r.vendor_name ?? "", r.description ?? "", r.amount]),
            ])}><Download className="h-4 w-4 mr-1" /> Expenses CSV</Button>
            <Button onClick={() => printElement("full-report", "Financial Report")}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </>
        }
      />
      <Card className="no-print">
        <CardContent className="grid gap-3 md:grid-cols-4 pt-6">
          <div><Label>From</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div id="full-report" className="space-y-4">
        <div className="text-center border-b border-border pb-3">
          <div className="font-bold text-primary text-lg">{church.name}</div>
          <div className="font-semibold mt-1">FINANCIAL REPORT — {start} to {end}</div>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Total income</div><div className="font-semibold text-primary">{formatCurrency(income)}</div></div>
          <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Total expenses</div><div className="font-semibold text-destructive">{formatCurrency(spend)}</div></div>
          <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Conference share</div><div className="font-semibold">{formatCurrency(conf)}</div></div>
          <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Net</div><div className="font-semibold">{formatCurrency(income - spend)}</div></div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Receipts</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Receipt #</th><th className="py-2 pr-4">Member</th><th className="py-2 pr-4">Category</th><th className="py-2 pr-4 text-right">Amount</th></tr></thead>
              <tbody>
                {receipts.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No receipts.</td></tr>}
                {receipts.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1 pr-4">{r.transaction_date}</td>
                    <td className="py-1 pr-4 font-mono">{r.receipt_number}</td>
                    <td className="py-1 pr-4">{r.member_name ?? "—"}</td>
                    <td className="py-1 pr-4">{r.offering_categories?.name ?? "—"}</td>
                    <td className="py-1 pr-4 text-right">{formatCurrency(Number(r.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Category</th><th className="py-2 pr-4">Vendor</th><th className="py-2 pr-4">Description</th><th className="py-2 pr-4 text-right">Amount</th></tr></thead>
              <tbody>
                {expenses.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No expenses.</td></tr>}
                {expenses.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1 pr-4">{r.transaction_date}</td>
                    <td className="py-1 pr-4">{r.expense_categories?.name ?? "—"}</td>
                    <td className="py-1 pr-4">{r.vendor_name ?? "—"}</td>
                    <td className="py-1 pr-4">{r.description ?? "—"}</td>
                    <td className="py-1 pr-4 text-right">{formatCurrency(Number(r.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}