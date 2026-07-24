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
import { Lock, Undo2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useUserRoles, isAdmin, hasAnyRole } from "@/lib/access";

type LockableTable = "receipts" | "expenses";

export function LockStatusBadge({
  isLocked, reversedAt,
}: { isLocked: boolean; reversedAt: string | null }) {
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
  return <Badge variant="secondary" className="gap-1">Draft</Badge>;
}

export function LockRowActions({
  table, id, isLocked, reversedAt, invalidateKeys,
}: {
  table: LockableTable;
  id: string;
  isLocked: boolean;
  reversedAt: string | null;
  invalidateKeys: string[];
}) {
  const qc = useQueryClient();
  const { data: roles } = useUserRoles();
  const admin = isAdmin(roles);
  const canFinalize = hasAnyRole(roles ?? [], ["admin", "treasurer"]);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reason, setReason] = useState("");

  const finalize = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from(table)
        .update({ is_locked: true, locked_at: new Date().toISOString(), locked_by: u.user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Finalized — record is now locked");
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to finalize"),
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
      setReverseOpen(false);
      setReason("");
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: any) => toast.error(e.message ?? "Unable to reverse"),
  });

  if (reversedAt) {
    return <span className="text-xs text-muted-foreground italic">Reversed</span>;
  }

  if (!isLocked) {
    return canFinalize ? (
      <Button size="sm" variant="ghost" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
        <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize
      </Button>
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