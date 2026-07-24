import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock, Undo2, CheckCircle2, AlertTriangle, Send, XCircle, Clock } from "lucide-react";
import { useUserRoles, isAdmin, hasAnyRole } from "@/lib/access";

type LockableTable = "receipts" | "expenses";
export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export function LockStatusBadge({
  isLocked, reversedAt, approvalStatus,
}: { isLocked: boolean; reversedAt: string | null; approvalStatus?: ApprovalStatus }) {
  if (reversedAt) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Reversed
      </Badge>
    );
  }
  if (isLocked) {
    return (
      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20 border-primary/20">
        <Lock className="h-3 w-3" /> Locked
      </Badge>
    );
  }
  if (approvalStatus === "pending") {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-400">
        <Clock className="h-3 w-3" /> Pending review
      </Badge>
    );
  }
  if (approvalStatus === "rejected") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return <Badge variant="secondary" className="gap-1">Draft</Badge>;
}

export function LockRowActions({
  table, id, isLocked, reversedAt, approvalStatus = "draft", rejectionReason, invalidateKeys,
}: {
  table: LockableTable;
  id: string;
  isLocked: boolean;
  reversedAt: string | null;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string | null;
  invalidateKeys: string[];
}) {
  const qc = useQueryClient();
  const { data: roles } = useUserRoles();
  const admin = isAdmin(roles);
  const canSubmit = hasAnyRole(roles ?? [], ["admin", "treasurer"]);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const submit = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from(table)
        .update({
          approval_status: "pending",
          submitted_at: new Date().toISOString(),
          submitted_by: u.user?.id ?? null,
          rejection_reason: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submitted for admin approval"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Unable to submit"),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from(table)
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: u.user?.id ?? null,
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: u.user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Approved — record is now locked"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Unable to approve"),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Please provide a rejection reason");
      const { error } = await supabase
        .from(table)
        .update({ approval_status: "rejected", rejection_reason: reason.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rejected — treasurer can edit and resubmit");
      setRejectOpen(false); setReason(""); invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to reject"),
  });

  const reverse = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Please provide a reason for the reversal");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from(table)
        .update({
          reversed_at: new Date().toISOString(),
          reversed_by: u.user?.id ?? null,
          reversal_reason: reason.trim(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reversal recorded");
      setReverseOpen(false); setReason(""); invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to reverse"),
  });

  if (reversedAt) {
    return <span className="text-xs text-muted-foreground italic">Reversed</span>;
  }

  // Pending admin review
  if (approvalStatus === "pending" && !isLocked) {
    if (admin) {
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => approve.mutate()} disabled={approve.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectOpen(true)}>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Reject submission</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">The treasurer will be able to edit and resubmit.</p>
                <Label>Reason</Label>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong amount, missing member…" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending}>
                  {reject.isPending ? "Rejecting…" : "Confirm rejection"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    return <span className="text-xs text-muted-foreground italic">Awaiting approval</span>;
  }

  // Draft / rejected — treasurer can (re)submit
  if (!isLocked) {
    return canSubmit ? (
      <div className="flex flex-col gap-0.5">
        <Button size="sm" variant="ghost" onClick={() => submit.mutate()} disabled={submit.isPending}>
          <Send className="h-4 w-4 mr-1" />
          {approvalStatus === "rejected" ? "Resubmit" : "Submit"}
        </Button>
        {approvalStatus === "rejected" && rejectionReason && (
          <span className="text-[10px] text-destructive px-2 truncate max-w-[180px]" title={rejectionReason}>
            {rejectionReason}
          </span>
        )}
      </div>
    ) : null;
  }

  return admin ? (
    <>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setReverseOpen(true)}>
        <Undo2 className="h-4 w-4 mr-1" /> Reverse
      </Button>
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reverse locked record</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              This keeps the original record for audit but marks it reversed. Provide a reason —
              it will be visible on the audit trail.
            </p>
            <Label>Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate entry, wrong amount…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => reverse.mutate()} disabled={reverse.isPending}>
              {reverse.isPending ? "Reversing…" : "Confirm reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) : (
    <span className="text-xs text-muted-foreground">Locked</span>
  );
}