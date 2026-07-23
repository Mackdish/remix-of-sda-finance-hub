import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { printElement } from "@/lib/print";
import { Printer } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Split a month into up to 5 Sabbath-based weeks (Sun–Sat buckets). */
function weekBuckets(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const buckets: { label: string; start: string; end: string }[] = [];
  let cursor = new Date(first);
  let idx = 1;
  while (cursor <= last && idx <= 5) {
    // week end = next Saturday or last day of month
    const day = cursor.getDay();
    const saturday = new Date(cursor);
    saturday.setDate(cursor.getDate() + (6 - day));
    const end = saturday > last ? last : saturday;
    buckets.push({
      label: `Week ${idx}`,
      start: cursor.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
    cursor = new Date(end);
    cursor.setDate(cursor.getDate() + 1);
    idx++;
  }
  return buckets;
}

export function WeeklyReportPage() {
  const { data: church } = useCurrentChurch();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: rows = [] } = useQuery({
    queryKey: ["weekly-report", church?.id, year, month],
    enabled: !!church,
    queryFn: async () => {
      const s = new Date(year, month, 1).toISOString().slice(0, 10);
      const e = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("receipts")
        .select("transaction_date,amount,offering_categories(name,fund_type)")
        .eq("church_id", church!.id).gte("transaction_date", s).lte("transaction_date", e);
      return (data ?? []) as any[];
    },
  });

  const weeks = useMemo(() => weekBuckets(year, month), [year, month]);
  const table = useMemo(() => {
    const categories = Array.from(new Set(rows.map((r) => r.offering_categories?.name ?? "Other")));
    const grid = categories.map((cat) => {
      const perWeek = weeks.map((w) =>
        rows.filter((r) => r.transaction_date >= w.start && r.transaction_date <= w.end && (r.offering_categories?.name ?? "Other") === cat)
          .reduce((s, r) => s + Number(r.amount), 0),
      );
      return { cat, perWeek, total: perWeek.reduce((s, n) => s + n, 0) };
    });
    const weekTotals = weeks.map((_, i) => grid.reduce((s, g) => s + g.perWeek[i], 0));
    const grand = weekTotals.reduce((s, n) => s + n, 0);
    return { categories, grid, weekTotals, grand };
  }, [rows, weeks]);

  if (!church) return <><PageHeader title="Weekly Report" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Cash Count & Offerings"
        description="Weeks 1–5 with automatic totals per offering category."
        actions={<Button onClick={() => printElement("weekly-report", "Weekly Report")}><Printer className="h-4 w-4 mr-1" /> Print</Button>}
      />
      <Card className="no-print">
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        </CardContent>
      </Card>

      <div id="weekly-report" className="bg-card border border-border rounded-md p-6">
        <div className="text-center border-b border-border pb-3 mb-3">
          <div className="font-bold text-primary text-lg">{church.name}</div>
          <div className="font-semibold mt-1">CASH COUNT & OFFERINGS REPORT SUMMARY</div>
          <div className="text-xs">{MONTHS[month]} {year}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1 pr-4">Offering</th>
                {weeks.map((w) => <th key={w.label} className="py-1 pr-4 text-right">{w.label}</th>)}
                <th className="py-1 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {table.grid.length === 0 && (
                <tr><td colSpan={weeks.length + 2} className="py-6 text-center text-muted-foreground">No receipts this month.</td></tr>
              )}
              {table.grid.map((g) => (
                <tr key={g.cat} className="border-t border-border">
                  <td className="py-1 pr-4">{g.cat}</td>
                  {g.perWeek.map((v, i) => <td key={i} className="py-1 pr-4 text-right">{formatCurrency(v)}</td>)}
                  <td className="py-1 pr-4 text-right font-medium">{formatCurrency(g.total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary font-semibold">
                <td className="py-2 pr-4">Weekly totals</td>
                {table.weekTotals.map((v, i) => <td key={i} className="py-2 pr-4 text-right">{formatCurrency(v)}</td>)}
                <td className="py-2 pr-4 text-right text-primary">{formatCurrency(table.grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-8 text-xs">
          <div>____________________<br/>Treasurer: {church.treasurer_name ?? ""}</div>
          <div className="text-right">____________________<br/>Elder: {church.elder_name ?? ""}</div>
        </div>
      </div>
    </div>
  );
}