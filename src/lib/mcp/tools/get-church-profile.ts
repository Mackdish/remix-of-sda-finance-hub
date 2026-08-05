import { defineTool } from "@lovable.dev/mcp-js";
import { notAuthenticated, resolveChurchId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_church_profile",
  title: "Get church profile",
  description:
    "Return the profile of the church the signed-in treasurer belongs to: name, code, contacts, officers and financial year start.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const churchId = await resolveChurchId(supabase, ctx.getUserId());
    if (!churchId) return { content: [{ type: "text", text: "No church is linked to this account." }], isError: true };
    const { data, error } = await supabase.from("churches").select("*").eq("id", churchId).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { church: data },
    };
  },
});