import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Church = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  pastor_name: string | null;
  treasurer_name: string | null;
  elder_name: string | null;
  auditor_name: string | null;
  currency: string | null;
  district_id: string | null;
  conference_id: string | null;
  logo_url: string | null;
};

/** Resolve the signed-in user's active church. Uses profiles.primary_church_id
 *  and falls back to the first church referenced by their user_roles. */
export function useCurrentChurch() {
  return useQuery({
    queryKey: ["current-church"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Church | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_church_id")
        .eq("id", uid)
        .maybeSingle();
      let churchId = profile?.primary_church_id ?? null;

      if (!churchId) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("church_id")
          .eq("user_id", uid)
          .not("church_id", "is", null)
          .limit(1)
          .maybeSingle();
        churchId = role?.church_id ?? null;
      }

      if (!churchId) {
        // Any church the user can read (admins see all)
        const { data: anyChurch } = await supabase
          .from("churches")
          .select("*")
          .limit(1)
          .maybeSingle();
        return (anyChurch as Church) ?? null;
      }

      const { data } = await supabase
        .from("churches")
        .select("*")
        .eq("id", churchId)
        .maybeSingle();
      return (data as Church) ?? null;
    },
  });
}