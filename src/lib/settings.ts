import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: string;
  church_id: string;
  system_name: string;
  tagline: string | null;
  marquee_enabled: boolean;
  marquee_speed: number;
  support_email: string | null;
  support_phone: string | null;
  whatsapp_number: string | null;
  office_address: string | null;
  office_hours: string | null;
  contact_note: string | null;
};

export type Notice = {
  id: string;
  church_id: string;
  title: string;
  message: string;
  category: string;
  show_in_marquee: boolean;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
};

export const DEFAULT_SETTINGS = {
  system_name: "SDA Treasurer",
  tagline: "Church cash flow",
  marquee_enabled: true,
  marquee_speed: 40,
  support_email: "",
  support_phone: "",
  whatsapp_number: "",
  office_address: "",
  office_hours: "",
  contact_note: "",
};

export function useSiteSettings(churchId?: string | null) {
  return useQuery({
    queryKey: ["site-settings", churchId],
    enabled: !!churchId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("church_id", churchId!)
        .maybeSingle();
      return (data as SiteSettings) ?? null;
    },
  });
}

/** Notices that are active today, optionally only marquee ones. */
export function useNotices(churchId?: string | null, marqueeOnly = false) {
  return useQuery({
    queryKey: ["notices", churchId, marqueeOnly],
    enabled: !!churchId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Notice[]> => {
      let q = supabase.from("notices").select("*").eq("church_id", churchId!);
      if (marqueeOnly) q = q.eq("is_active", true).eq("show_in_marquee", true);
      const { data } = await q.order("sort_order").order("created_at", { ascending: false });
      const today = new Date().toISOString().slice(0, 10);
      const rows = (data ?? []) as Notice[];
      if (!marqueeOnly) return rows;
      return rows.filter(
        (n) => (!n.starts_on || n.starts_on <= today) && (!n.ends_on || n.ends_on >= today),
      );
    },
  });
}
