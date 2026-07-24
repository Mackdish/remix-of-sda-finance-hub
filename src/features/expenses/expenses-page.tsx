import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader, NoChurch } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Plus, Search, Wallet } from "lucide-react";
import { LockRowActions, LockStatusBadge } from "@/components/lock-actions";

const PAY = ["cash", "mpesa", "bank_transfer", "cheque", "bank_deposit"] as const;
type Cat = { id: string; name: string };
type Row = {
  id: string; expense_number: string; transaction_date: string; description: string | null;
  vendor: string | null; amount: number; payment_method: string;
  is_locked: boolean; reversed_at: string | null;
  expense_categories: { name: string } | null;
};

export function ExpensesPage() {
  const { data: church } = useCurrentChurch();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: ["expense-cats", church?.id],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("id,name").eq("is_active", true).order("name");
      return (data ?? []) as Cat[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["expenses", church?.id],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id,expense_number,transaction_date,description,vendor,amount,payment_method,is_locked,reversed_at,expense_categories(name)")
        .eq("church_id", church!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      r.expense_number.toLowerCase().includes(t) ||
      (r.description ?? "").toLowerCase().includes(t) ||
      (r.vendor ?? "").toLowerCase().includes(t),
    );
  }, [rows, q]);

  const total = filtered.reduce((s, r) => s + Number(r.amount), 0);

  if (!church) return <><PageHeader title="Expenses" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Church expenditures with vendor, category and approval."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Expense</Button></DialogTrigger>
            <NewExpense church={church} cats={cats} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }} />
          </Dialog>
        }
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">All expenses · <span className="text-primary">{formatCurrency(total)}</span></CardTitle>
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Wallet className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No expenses recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Ref #</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Vendor</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Method</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 pr-4 font-mono">{r.expense_number}</td>
                      <td className="py-2 pr-4">{r.transaction_date}</td>
                      <td className="py-2 pr-4">{r.description ?? "—"}</td>
                      <td className="py-2 pr-4">{r.vendor ?? "—"}</td>
                      <td className="py-2 pr-4">{r.expense_categories?.name ?? "—"}</td>
                      <td className="py-2 pr-4 capitalize">{r.payment_method.replace("_", " ")}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(r.amount)}</td>
                      <td className="py-2 pr-4">
                        <LockStatusBadge isLocked={r.is_locked} reversedAt={r.reversed_at} />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <LockRowActions
                          table="expenses"
                          id={r.id}
                          isLocked={r.is_locked}
                          reversedAt={r.reversed_at}
                          invalidateKeys={["expenses", "dashboard"]}
                        />
                      </td>
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

function NewExpense({ church, cats, onDone }: { church: { id: string }; cats: Cat[]; onDone: () => void }) {
  const [f, setF] = useState({
    transaction_date: new Date().toISOString().slice(0, 10),
    category_id: "",
    description: "",
    vendor: "",
    amount: "",
    payment_method: "cash" as (typeof PAY)[number],
    reference_number: "",
    approved_by: "",
    remarks: "",
  });
  const create = useMutation({
    mutationFn: async () => {
      const amount = Number(f.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      const { data: u } = await supabase.auth.getUser();
      const expense_number = `E-${Date.now().toString().slice(-8)}`;
      const { error } = await supabase.from("expenses").insert({
        church_id: church.id,
        expense_number,
        transaction_date: f.transaction_date,
        category_id: f.category_id || null,
        description: f.description || null,
        vendor: f.vendor || null,
        amount,
        payment_method: f.payment_method,
        reference_number: f.reference_number || null,
        approved_by: f.approved_by || null,
        remarks: f.remarks || null,
        recorded_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Expense recorded"); onDone(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Date</Label><Input type="date" value={f.transaction_date} onChange={(e) => setF({ ...f, transaction_date: e.target.value })} /></div>
        <div>
          <Label>Category</Label>
          <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><Label>Vendor / Payee</Label><Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></div>
        <div><Label>Amount (KES) *</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div>
          <Label>Payment method</Label>
          <Select value={f.payment_method} onValueChange={(v) => setF({ ...f, payment_method: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAY.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Reference #</Label><Input value={f.reference_number} onChange={(e) => setF({ ...f, reference_number: e.target.value })} /></div>
        <div><Label>Approved by</Label><Input value={f.approved_by} onChange={(e) => setF({ ...f, approved_by: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}