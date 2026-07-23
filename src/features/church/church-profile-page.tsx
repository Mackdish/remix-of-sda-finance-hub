import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/lib/church";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ChurchProfilePage() {
  const { data: church, refetch } = useCurrentChurch();
  const qc = useQueryClient();
  const isNew = !church;
  const [f, setF] = useState({
    name: "", code: "", address: "", city: "", country: "Kenya",
    phone: "", email: "", pastor_name: "", treasurer_name: "", elder_name: "", auditor_name: "", currency: "KES",
  });

  useEffect(() => {
    if (church) {
      setF({
        name: church.name ?? "",
        code: church.code ?? "",
        address: church.address ?? "",
        city: church.city ?? "",
        country: church.country ?? "Kenya",
        phone: church.phone ?? "",
        email: church.email ?? "",
        pastor_name: church.pastor_name ?? "",
        treasurer_name: church.treasurer_name ?? "",
        elder_name: church.elder_name ?? "",
        auditor_name: church.auditor_name ?? "",
        currency: church.currency ?? "KES",
      });
    }
  }, [church]);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error("Church name required");
      if (isNew) {
        const { data: u } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("churches").insert(f).select("id").single();
        if (error) throw error;
        if (u.user) {
          await supabase.from("profiles").update({ primary_church_id: data.id }).eq("id", u.user.id);
          await supabase.from("user_roles").insert({ user_id: u.user.id, role: "admin", church_id: data.id });
        }
      } else {
        const { error } = await supabase.from("churches").update(f).eq("id", church!.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => { toast.success("Church profile saved"); await refetch(); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Church Profile"
        description="Church name, address and officers — appears on every printed report."
        actions={<Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : (isNew ? "Create church" : "Save")}</Button>}
      />
      <Card>
        <CardHeader><CardTitle className="text-base">Church details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Church name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Church code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
          <div><Label>Currency</Label><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><Label>City / Town</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Officers</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Pastor</Label><Input value={f.pastor_name} onChange={(e) => setF({ ...f, pastor_name: e.target.value })} /></div>
          <div><Label>Treasurer</Label><Input value={f.treasurer_name} onChange={(e) => setF({ ...f, treasurer_name: e.target.value })} /></div>
          <div><Label>Head Elder</Label><Input value={f.elder_name} onChange={(e) => setF({ ...f, elder_name: e.target.value })} /></div>
          <div><Label>Auditor</Label><Input value={f.auditor_name} onChange={(e) => setF({ ...f, auditor_name: e.target.value })} /></div>
        </CardContent>
      </Card>
    </div>
  );
}