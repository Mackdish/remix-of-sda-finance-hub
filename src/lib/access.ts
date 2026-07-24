import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "treasurer" | "auditor";

/** Which roles may access each app route path. */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/dashboard": ["admin", "treasurer", "auditor"],
  "/receipts": ["admin", "treasurer"],
  "/expenses": ["admin", "treasurer"],
  "/members": ["admin", "treasurer"],
  "/trust-funds": ["admin", "treasurer", "auditor"],
  "/local-funds": ["admin", "treasurer", "auditor"],
  "/cash-statement": ["admin", "treasurer", "auditor"],
  "/weekly-report": ["admin", "treasurer", "auditor"],
  "/monthly-statement": ["admin", "treasurer", "auditor"],
  "/remittance": ["admin", "treasurer"],
  "/reports": ["admin", "treasurer", "auditor"],
  "/church-profile": ["admin", "treasurer"],
  "/admin": ["admin"],
  "/approvals": ["admin"],
  "/audit": ["admin", "auditor"],
};

export function canAccess(path: string, roles: AppRole[]): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return roles.some((r) => allowed.includes(r));
}

/** Fetch the signed-in user's roles from public.user_roles. */
export function useUserRoles() {
  return useQuery({
    queryKey: ["current-user-roles"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) return [];
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]): boolean {
  return roles.some((r) => allowed.includes(r));
}

export function isAdmin(roles: AppRole[] | undefined): boolean {
  return !!roles?.includes("admin");
}