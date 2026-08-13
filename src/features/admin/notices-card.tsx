import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNotices, type Notice } from "@/lib/settings";

export function NoticesCard({ churchId }: { churchId: string }) {
  const qc = useQueryClient();
  const { data: notices = [] } = useNotices(churchId);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("info");
  const [marquee, setMarquee] = useState(true);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["notices"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error("Title and message are required");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("notices").insert({
        church_id: churchId,
        title: title.trim(),
        message: message.trim(),
        category,
        show_in_marquee: marquee,
        is_active: true,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice published");
      setTitle(""); setMessage(""); setStartsOn(""); setEndsOn("");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not publish the notice"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Notice> }) => {
      const { error } = await supabase.from("notices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.message ?? "Could not update the notice"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notice removed"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove the notice"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notices</CardTitle>
        <CardDescription>Publish announcements; marquee notices scroll across the top of every page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Camp meeting offering" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="warning">Important</SelectItem>
                <SelectItem value="success">Good news</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Message</Label>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <Label>Show from (optional)</Label>
            <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div>
            <Label>Show until (optional)</Label>
            <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <Switch id="new-marquee" checked={marquee} onCheckedChange={setMarquee} />
            <Label htmlFor="new-marquee">Include in marquee</Label>
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Publish notice</Button>
        </div>

        <ul className="divide-y divide-border">
          {notices.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">No notices yet.</li>
          )}
          {notices.map((n) => (
            <li key={n.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                  <Badge variant={n.is_active ? "default" : "secondary"} className="capitalize">
                    {n.is_active ? n.category : "inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground break-words">{n.message}</p>
                {(n.starts_on || n.ends_on) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.starts_on ?? "—"} → {n.ends_on ?? "—"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={n.show_in_marquee}
                    onCheckedChange={(v) => update.mutate({ id: n.id, patch: { show_in_marquee: v } })}
                  />
                  Marquee
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={n.is_active}
                    onCheckedChange={(v) => update.mutate({ id: n.id, patch: { is_active: v } })}
                  />
                  Active
                </label>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(n.id)} aria-label="Remove notice">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
