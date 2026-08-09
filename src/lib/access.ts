import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "pastor" | "elder" | "treasurer" | "auditor" | "member";

/** Roles with full rights across the app. */
export const FULL_ACCESS: AppRole[] = ["admin", "treasurer", "elder"];
/** Roles that may view (read-only) reporting surfaces. */
const VIEWERS: AppRole[] = [...FULL_ACCESS, "pastor", "auditor"];

/** Which roles may access each app route path. */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/dashboard": VIEWERS,
  "/receipts": FULL_ACCESS,
  "/expenses": FULL_ACCESS,
  "/members": FULL_ACCESS,
  "/member-contributions": VIEWERS,
  "/departments": VIEWERS,
  "/trust-funds": VIEWERS,
  "/local-funds": VIEWERS,
  "/camp-funds": VIEWERS,
  "/cash-statement": VIEWERS,
  "/weekly-report": VIEWERS,
  "/monthly-statement": VIEWERS,
  "/remittance": FULL_ACCESS,
  "/reports": VIEWERS,
  "/church-profile": FULL_ACCESS,
  "/admin": ["admin"],
  "/approvals": FULL_ACCESS,
  "/audit": ["admin", "auditor", "elder", "treasurer"],
  "/my-giving": ["member", ...VIEWERS],
};

export function canAccess(path: string, roles: AppRole[]): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return roles.some((r) => allowed.includes(r));
}

/** First route the given roles may open — used for post-login landing. */
export function landingRoute(roles: AppRole[]): string {
  if (canAccess("/dashboard", roles)) return "/dashboard";
  return "/my-giving";
}

export function isMemberOnly(roles: AppRole[]): boolean {
  return roles.length > 0 && roles.every((r) => r === "member");
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