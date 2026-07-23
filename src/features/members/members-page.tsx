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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Users, Pencil, Trash2 } from "lucide-react";

type Member = {
  id: string; full_name: string; membership_number: string | null; phone: string | null;
  email: string | null; department: string | null; family_name: string | null; status: string | null; notes: string | null;
};

export function MembersPage() {
  const { data: church } = useCurrentChurch();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Member> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["members-full", church?.id],
    enabled: !!church,
    queryFn: async () => {
      const { data } = await supabase.from("church_members").select("*").eq("church_id", church!.id).order("full_name");
      return (data ?? []) as Member[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("church_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Member removed"); qc.invalidateQueries({ queryKey: ["members-full"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((m) =>
      m.full_name.toLowerCase().includes(t) ||
      (m.membership_number ?? "").toLowerCase().includes(t) ||
      (m.phone ?? "").toLowerCase().includes(t),
    );
  }, [rows, q]);

  if (!church) return <><PageHeader title="Members" /><NoChurch /></>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Maintain member records for quick receipt entry and contribution history."
        actions={<Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-1" /> Add Member</Button>}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{rows.length} member{rows.length === 1 ? "" : "s"}</CardTitle>
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No members yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Membership #</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-2 pr-4 font-medium">{m.full_name}</td>
                      <td className="py-2 pr-4 font-mono">{m.membership_number ?? "—"}</td>
                      <td className="py-2 pr-4">{m.phone ?? "—"}</td>
                      <td className="py-2 pr-4">{m.department ?? "—"}</td>
                      <td className="py-2 pr-4 capitalize">{m.status ?? "active"}</td>
                      <td className="py-2 pr-4 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remove ${m.full_name}?`)) del.mutate(m.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        {editing !== null && (
          <MemberDialog
            church={church}
            member={editing}
            onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["members-full"] }); qc.invalidateQueries({ queryKey: ["members"] }); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function MemberDialog({ church, member, onDone }: { church: { id: string }; member: Partial<Member>; onDone: () => void }) {
  const [f, setF] = useState({
    full_name: member.full_name ?? "",
    membership_number: member.membership_number ?? "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    department: member.department ?? "",
    family_name: member.family_name ?? "",
    status: member.status ?? "active",
    notes: member.notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!f.full_name.trim()) throw new Error("Name required");
      const payload = {
        church_id: church.id,
        full_name: f.full_name.trim(),
        membership_number: f.membership_number || null,
        phone: f.phone || null,
        email: f.email || null,
        department: f.department || null,
        family_name: f.family_name || null,
        status: f.status,
        notes: f.notes || null,
      };
      if (member.id) {
        const { error } = await supabase.from("church_members").update(payload).eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("church_members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{member.id ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Full name *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>Membership #</Label><Input value={f.membership_number} onChange={(e) => setF({ ...f, membership_number: e.target.value })} /></div>
        <div><Label>Family name</Label><Input value={f.family_name} onChange={(e) => setF({ ...f, family_name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Department</Label><Input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
        <div><Label>Status</Label><Input value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}