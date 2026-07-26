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
import { CheckCircle2, Send, XCircle, Clock } from "lucide-react";
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
  const canSubmit = hasAnyRole(roles ?? [], ["admin", "treasurer"]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const queryKey = ["period-finalize", table, churchId, year, month] as const;

  const { data: row } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from(table)
        .select("id,approval_status,rejection_reason,submitted_at,approved_at")
        .eq("church_id", churchId)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();
      return data as
        | {
            id: string;
            approval_status: "draft" | "pending" | "approved" | "rejected";
            rejection_reason: string | null;
            submitted_at: string | null; approved_at: string | null;
          }
        | null;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const base: Record<string, unknown> = {
        church_id: churchId,
        period_year: year,
        period_month: month,
        approval_status: "pending",
        submitted_at: new Date().toISOString(),
        submitted_by: u.user?.id ?? null,
        rejection_reason: null,
        created_by: u.user?.id ?? null,
      };
      if (table === "weekly_reports") base.data = snapshot;
      else base.totals = snapshot;
      if (table === "cash_statements") base.statement_date = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      if (row?.id) {
        const { error } = await supabase.from(table).update(base as any).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(base as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(`${label} submitted for approval`); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e.message ?? "Unable to submit"),
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!row) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from(table).update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: u.user?.id ?? null,
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${label} approved`); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e.message ?? "Unable to approve"),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!row) return;
      if (!reason.trim()) throw new Error("Please provide a rejection reason");
      const { error } = await supabase.from(table).update({
        approval_status: "rejected",
        rejection_reason: reason.trim(),
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rejected — treasurer can resubmit");
      setRejectOpen(false); setReason(""); qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to reject"),
  });

  const approved = row?.approval_status === "approved";
  const pending = row?.approval_status === "pending";
  const rejected = row?.approval_status === "rejected";

  return (
    <Card className="no-print">
      <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">{label} status</div>
          <div className="text-muted-foreground text-xs mt-0.5">
            {approved ? (
              <span className="text-primary inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Approved on {row?.approved_at ? new Date(row.approved_at).toLocaleDateString() : ""}
              </span>
            ) : pending ? (
              <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pending admin approval
              </span>
            ) : rejected ? (
              <span className="text-destructive inline-flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Rejected{row?.rejection_reason ? ` — ${row.rejection_reason}` : ""}
              </span>
            ) : (
              <span>Draft — not yet submitted</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!approved && !pending && canSubmit && (
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              <Send className="h-4 w-4 mr-1" /> {rejected ? "Resubmit" : "Submit for approval"}
            </Button>
          )}
          {pending && admin && (
            <>
              <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject {label.toLowerCase()}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">The treasurer will be able to edit and resubmit.</p>
              <Label>Reason</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending}>
                {reject.isPending ? "Rejecting…" : "Confirm rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}