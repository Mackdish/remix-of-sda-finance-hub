import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, useSiteSettings } from "@/lib/settings";

type Form = typeof DEFAULT_SETTINGS;

export function SettingsCard({ churchId }: { churchId: string }) {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings(churchId);
  const [form, setForm] = useState<Form>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!settings) return;
    setForm({
      system_name: settings.system_name ?? "",
      tagline: settings.tagline ?? "",
      marquee_enabled: settings.marquee_enabled,
      marquee_speed: settings.marquee_speed,
      support_email: settings.support_email ?? "",
      support_phone: settings.support_phone ?? "",
      whatsapp_number: settings.whatsapp_number ?? "",
      office_address: settings.office_address ?? "",
      office_hours: settings.office_hours ?? "",
      contact_note: settings.contact_note ?? "",
    });
  }, [settings]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        church_id: churchId,
        system_name: form.system_name.trim() || "SDA Treasurer",
        tagline: form.tagline.trim() || null,
        marquee_enabled: form.marquee_enabled,
        marquee_speed: Number(form.marquee_speed) || 40,
        support_email: form.support_email.trim() || null,
        support_phone: form.support_phone.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        office_address: form.office_address.trim() || null,
        office_hours: form.office_hours.trim() || null,
        contact_note: form.contact_note.trim() || null,
      };
      const { error } = await supabase
        .from("site_settings")
        .upsert(payload, { onConflict: "church_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save settings"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System settings</CardTitle>
          <CardDescription>Branding and the scrolling notice bar shown to every user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>System name</Label>
              <Input value={form.system_name} onChange={(e) => set("system_name", e.target.value)} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="marquee"
                checked={form.marquee_enabled}
                onCheckedChange={(v) => set("marquee_enabled", v)}
              />
              <Label htmlFor="marquee">Show notices marquee</Label>
            </div>
            <div className="w-40">
              <Label>Scroll duration (s)</Label>
              <Input
                type="number"
                min={10}
                max={180}
                value={form.marquee_speed}
                onChange={(e) => set("marquee_speed", Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact us details</CardTitle>
          <CardDescription>Shown on the Contact us page for members and staff.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Support email</Label>
              <Input value={form.support_email} onChange={(e) => set("support_email", e.target.value)} />
            </div>
            <div>
              <Label>Support phone</Label>
              <Input value={form.support_phone} onChange={(e) => set("support_phone", e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp number</Label>
              <Input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
            </div>
            <div>
              <Label>Office hours</Label>
              <Input value={form.office_hours} onChange={(e) => set("office_hours", e.target.value)} placeholder="Mon–Fri, 9am–4pm" />
            </div>
          </div>
          <div>
            <Label>Office address</Label>
            <Textarea rows={2} value={form.office_address} onChange={(e) => set("office_address", e.target.value)} />
          </div>
          <div>
            <Label>Note to users</Label>
            <Textarea rows={3} value={form.contact_note} onChange={(e) => set("contact_note", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
