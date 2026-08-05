import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, resolveChurchId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "List expenses",
  description: "List church expenses for the signed-in treasurer's church, newest first, with an optional date range.",
  inputSchema: {
    start_date: z.string().describe("Inclusive start date, YYYY-MM-DD.").optional(),
    end_date: z.string().describe("Inclusive end date, YYYY-MM-DD.").optional(),
    limit: z.number().int().describe("Maximum rows to return (default 50, max 200).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ start_date, end_date, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const churchId = await resolveChurchId(supabase, ctx.getUserId());
    if (!churchId) return { content: [{ type: "text", text: "No church is linked to this account." }], isError: true };

    let query = supabase
      .from("expenses")
      .select("*")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (start_date) query = query.gte("transaction_date", start_date);
    if (end_date) query = query.lte("transaction_date", end_date);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      expense_number: e.expense_number,
      date: e.transaction_date ?? e.expense_date ?? null,
      amount: e.amount,
      description: e.description,
      payment_method: e.payment_method,
      approval_status: e.approval_status,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { expenses: rows },
    };
  },
});