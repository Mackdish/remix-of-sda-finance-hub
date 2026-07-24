import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Lock, Undo2, AlertTriangle } from "lucide-react";
import { useUserRoles, isAdmin, hasAnyRole } from "@/lib/access";

type PeriodTable = "weekly_reports" | "cash_statements";

export function PeriodFinalize({
  table, churchId, year, month, snapshot, label,
}: {
  table: PeriodTable;
  churchId: string;
  year: number;
  month: number;
  snapshot: Record<string, unknown>;
  label: string;
}) {
  const qc = useQueryClient();
  const { data: roles } = useUserRoles();
  const admin = isAdmin(roles);
  const canFinalize = hasAnyRole(roles ?? [], ["admin", "treasurer"]);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reason, setReason] = useState("");

  const queryKey = ["period-finalize", table, churchId, year, month] as const;

  const { data: row } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from(table)
        .select("id,is_finalized,finalized_at,finalized_by,reversed_at,reversed_by,reversal_reason")
        .eq("church_id", churchId)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();
      return data as
        | {
            id: string; is_finalized: boolean; finalized_at: string | null;
            reversed_at: string | null; reversal_reason: string | null;
          }
        | null;
    },
  });

  const finalize = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const base: Record<string, unknown> = {
        church_id: churchId,
        period_year: year,
        period_month: month,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        finalized_by: u.user?.id ?? null,
        created_by: u.user?.id ?? null,
      };
      if (table === "weekly_reports") base.data = snapshot;
      else base.totals = snapshot;
      if (table === "cash_statements") base.statement_date = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      if (row?.id) {
        const { error } = await supabase.from(table).update(base).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(base as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(`${label} finalized`); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e.message ?? "Unable to finalize"),
  });

  const reverse = useMutation({
    mutationFn: async () => {
      if (!row) return;
      if (!reason.trim()) throw new Error("Please provide a reason");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from(table).update({
        reversed_at: new Date().toISOString(),
        reversed_by: u.user?.id ?? null,
        reversal_reason: reason.trim(),
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reversal recorded");
      setReverseOpen(false); setReason("");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to reverse"),
  });

  const reversed = !!row?.reversed_at;
  const finalized = !!row?.is_finalized && !reversed;

  return (
    <Card className="no-print">
      <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">{label} status</div>
          <div className="text-muted-foreground text-xs mt-0.5">
            {reversed ? (
              <span className="text-destructive inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Reversed
                {row?.reversal_reason ? ` — ${row.reversal_reason}` : ""}
              </span>
            ) : finalized ? (
              <span className="text-primary inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Finalized on {new Date(row!.finalized_at!).toLocaleDateString()}
              </span>
            ) : (
              <span>Draft — not yet submitted</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!finalized && !reversed && canFinalize && (
            <Button onClick={() => finalize.mutate()} disabled={finalize.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize
            </Button>
          )}
          {finalized && admin && (
            <Button variant="destructive" onClick={() => setReverseOpen(true)}>
              <Undo2 className="h-4 w-4 mr-1" /> Reverse
            </Button>
          )}
        </div>
        <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reverse finalized {label.toLowerCase()}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">The record stays for audit but is marked reversed.</p>
              <Label>Reason</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReverseOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => reverse.mutate()} disabled={reverse.isPending}>
                {reverse.isPending ? "Reversing…" : "Confirm reversal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}