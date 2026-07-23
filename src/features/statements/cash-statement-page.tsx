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

export function CashStatementPage() {
  const { data: church } = useCurrentChurch();
  const [start, setStart] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState("0");
  const [openingBank, setOpeningBank] = useState("0");

  const { data } = useQuery({
    queryKey: ["cash-statement", church?.id, start, end],
    enabled: !!church,
    queryFn: async () => {
      const [rc, ex] = await Promise.all([
        supabase.from("receipts")
          .select("amount,payment_method,offering_categories(name,fund_type,conference_split_pct)")
          .eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end),
        supabase.from("expenses")
          .select("amount,payment_method,expense_categories(name)")
          .eq("church_id", church!.id).gte("transaction_date", start).lte("transaction_date", end),
      ]);
      return { receipts: (rc.data ?? []) as any[], expenses: (ex.data ?? []) as any[] };
    },
  });

  const stats = useMemo(() => {
    const r = data?.receipts ?? [];
    const ex = data?.expenses ?? [];
    const income = r.reduce((s, x) => s + Number(x.amount), 0);
    const cashIn = r.filter((x) => x.payment_method === "cash").reduce((s, x) => s + Number(x.amount), 0);
    const bankIn = income - cashIn;
    const spend = ex.reduce((s, x) => s + Number(x.amount), 0);
    const cashOut = ex.filter((x) => x.payment_method === "cash").reduce((s, x) => s + Number(x.amount), 0);
    const bankOut = spend - cashOut;
    const conf = r.reduce((s, x) => s + Number(x.amount) * Number(x.offering_categories?.conference_split_pct ?? 0) / 100, 0);
    const local = income - conf;
    const closingCash = Number(openingCash) + cashIn - cashOut;
    const closingBank = Number(openingBank) + bankIn - bankOut;
    return { income, spend, conf, local, cashIn, bankIn, cashOut, bankOut, closingCash, closingBank };
  }, [data, openingCash, openingBank]);

  if (!church) return <><PageHeader title="Cash Statement" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Statement"
        description="Digital version of the SDA Church Treasurer's Cash Statement."
        actions={<Button onClick={() => printElement("cash-statement", "Cash Statement")}><Printer className="h-4 w-4 mr-1" /> Print</Button>}
      />
      <Card className="no-print">
        <CardHeader><CardTitle className="text-base">Period & opening balances</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Start date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>End date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><Label>Opening cash</Label><Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} /></div>
          <div><Label>Opening bank</Label><Input type="number" value={openingBank} onChange={(e) => setOpeningBank(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div id="cash-statement" className="space-y-4 bg-card p-6 rounded-md border border-border">
        <div className="text-center border-b border-border pb-3">
          <div className="font-bold text-primary text-lg">{church.name}</div>
          <div className="text-xs text-muted-foreground">{[church.address, church.city].filter(Boolean).join(", ")}</div>
          <div className="font-semibold mt-1">CHURCH TREASURER'S CASH STATEMENT</div>
          <div className="text-xs">Period: {start} to {end}</div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1">Opening cash balance</td><td className="text-right">{formatCurrency(Number(openingCash))}</td></tr>
            <tr><td className="py-1">Opening bank balance</td><td className="text-right">{formatCurrency(Number(openingBank))}</td></tr>
            <tr className="border-t border-border font-medium"><td className="py-2">Total receipts</td><td className="text-right">{formatCurrency(stats.income)}</td></tr>
            <tr><td className="py-1 pl-4">— Cash</td><td className="text-right">{formatCurrency(stats.cashIn)}</td></tr>
            <tr><td className="py-1 pl-4">— Bank / M-Pesa / cheque</td><td className="text-right">{formatCurrency(stats.bankIn)}</td></tr>
            <tr className="border-t border-border font-medium"><td className="py-2">Total payments</td><td className="text-right">({formatCurrency(stats.spend)})</td></tr>
            <tr><td className="py-1 pl-4">— Cash</td><td className="text-right">({formatCurrency(stats.cashOut)})</td></tr>
            <tr><td className="py-1 pl-4">— Bank / cheque</td><td className="text-right">({formatCurrency(stats.bankOut)})</td></tr>
            <tr className="border-t border-border font-semibold"><td className="py-2">Closing cash balance</td><td className="text-right">{formatCurrency(stats.closingCash)}</td></tr>
            <tr className="font-semibold"><td className="py-1">Closing bank balance</td><td className="text-right">{formatCurrency(stats.closingBank)}</td></tr>
          </tbody>
        </table>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border text-sm">
          <div><div className="text-muted-foreground text-xs">Conference (Trust) share</div><div className="font-semibold text-primary">{formatCurrency(stats.conf)}</div></div>
          <div><div className="text-muted-foreground text-xs">Local church share</div><div className="font-semibold">{formatCurrency(stats.local)}</div></div>
        </div>
        <div className="grid grid-cols-3 gap-6 pt-8 text-xs">
          <div>____________________<br/>Treasurer: {church.treasurer_name ?? ""}</div>
          <div>____________________<br/>Elder: {church.elder_name ?? ""}</div>
          <div>____________________<br/>Auditor: {church.auditor_name ?? ""}</div>
        </div>
      </div>
    </div>
  );
}