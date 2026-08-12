import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["admin", "pastor", "elder", "treasurer", "auditor", "member"]),
  churchId: z.string().uuid(),
  memberId: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const createChurchUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can create accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Could not create the account");
    }
    const uid = created.data.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: uid,
      full_name: data.fullName,
      phone: data.phone ?? null,
      primary_church_id: data.churchId,
      member_id: data.memberId ?? null,
      is_active: true,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role, church_id: data.churchId });
    if (roleError) throw new Error(roleError.message);

    return { userId: uid };
  });

export const listChurchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ churchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can view accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id,user_id,role")
      .eq("church_id", data.churchId);
    if (error) throw new Error(error.message);

    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const listed = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map((listed.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return (roles ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role as string,
      fullName: nameById.get(r.user_id) ?? "—",
      email: emailById.get(r.user_id) ?? "—",
    }));
  });
const bulkSchema = z.object({
  churchId: z.string().uuid(),
  defaultRole: z.enum(["admin", "pastor", "elder", "treasurer", "auditor", "member"]),
  invites: z
    .array(
      z.object({
        email: z.string().email(),
        fullName: z.string().min(2),
        role: z.enum(["admin", "pastor", "elder", "treasurer", "auditor", "member"]).optional(),
      }),
    )
    .min(1)
    .max(200),
});

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Creates many accounts at once. Returns per-row status plus the temporary
 *  password so the administrator can hand credentials to each person. */
export const bulkInviteChurchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can invite users");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: Array<{
      email: string;
      fullName: string;
      role: string;
      password?: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const invite of data.invites) {
      const role = invite.role ?? data.defaultRole;
      const password = tempPassword();
      try {
        const created = await supabaseAdmin.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: invite.fullName },
        });
        if (created.error || !created.data.user) {
          throw new Error(created.error?.message ?? "Could not create the account");
        }
        const uid = created.data.user.id;

        const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
          id: uid,
          full_name: invite.fullName,
          primary_church_id: data.churchId,
          is_active: true,
        });
        if (profileError) throw new Error(profileError.message);

        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: uid, role, church_id: data.churchId });
        if (roleError) throw new Error(roleError.message);

        results.push({ email: invite.email, fullName: invite.fullName, role, password, ok: true });
      } catch (e) {
        results.push({
          email: invite.email,
          fullName: invite.fullName,
          role,
          ok: false,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }

    return results;
  });
