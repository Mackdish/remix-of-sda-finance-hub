import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, resolveChurchId, supabaseForUser } from "../supabase";

const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "cheque", "bank_deposit"] as const;

export default defineTool({
  name: "create_receipt",
  title: "Create receipt",
  description:
    "Record a new offering/tithe receipt for the signed-in treasurer's church. The fund type (trust or local) and the conference/local split come from the offering category. Created as a draft pending approval.",
  inputSchema: {
    category: z
      .string()
      .min(1)
      .describe("Offering category name or code, e.g. 'Tithe', 'Combined Offering', 'First Fruit'."),
    amount: z.number().positive().describe("Receipt amount in the church's currency."),
    receipt_number: z
      .string()
      .min(1)
      .describe("Receipt number. Omit to auto-generate the next number.")
      .optional(),
    date: z.string().describe("Transaction date, YYYY-MM-DD. Defaults to today.").optional(),
    fund: z
      .enum(["trust", "local"])
      .describe("Optional expected fund type; used to disambiguate categories with the same name.")
      .optional(),
    member_name: z.string().describe("Name of the member/giver.").optional(),
    payment_method: z
      .enum(PAYMENT_METHODS)
      .describe("Payment method (default cash).")
      .optional(),
    description: z.string().describe("Optional note or description.").optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

    const supabase = supabaseForUser(ctx);
    const churchId = await resolveChurchId(supabase, ctx.getUserId());
    if (!churchId) return fail("No church is linked to this account.");

    // Resolve the offering category (church-specific or global) by name or code.
    const { data: categories, error: catError } = await supabase
      .from("offering_categories")
      .select("id,name,code,fund_type,conference_split_pct,church_id,is_active")
      .or(`church_id.eq.${churchId},church_id.is.null`);
    if (catError) return fail(catError.message);

    const needle = input.category.trim().toLowerCase();
    const matches = (categories ?? []).filter((c: Record<string, any>) => {
      if (c.is_active === false) return false;
      if (input.fund && c.fund_type !== input.fund) return false;
      return (
        String(c.name ?? "").toLowerCase() === needle ||
        String(c.code ?? "").toLowerCase() === needle ||
        String(c.name ?? "").toLowerCase().includes(needle)
      );
    });
    if (matches.length === 0) {
      const available = (categories ?? [])
        .filter((c: Record<string, any>) => c.is_active !== false)
        .map((c: Record<string, any>) => c.name)
        .join(", ");
      return fail(`No offering category matched "${input.category}". Available: ${available}`);
    }
    const category =
      matches.find(
        (c: Record<string, any>) =>
          String(c.name ?? "").toLowerCase() === needle || String(c.code ?? "").toLowerCase() === needle,
      ) ?? matches[0];

    // Receipt number: use the supplied one or derive the next sequential number.
    let receiptNumber = input.receipt_number?.trim();
    if (!receiptNumber) {
      const { data: last } = await supabase
        .from("receipts")
        .select("receipt_number")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastDigits = Number(String(last?.receipt_number ?? "").replace(/\D/g, "")) || 0;
      receiptNumber = `R-${String(lastDigits + 1).padStart(5, "0")}`;
    }

    const date = (input.date ?? new Date().toISOString().slice(0, 10)).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("date must be in YYYY-MM-DD format.");

    const { data, error } = await supabase
      .from("receipts")
      .insert({
        church_id: churchId,
        receipt_number: receiptNumber,
        transaction_date: date,
        offering_category_id: category.id,
        amount: input.amount,
        payment_method: input.payment_method ?? "cash",
        member_name: input.member_name ?? null,
        description: input.description ?? null,
        recorded_by: ctx.getUserId() ?? null,
        approval_status: "draft",
      })
      .select("id,receipt_number,transaction_date,amount,payment_method,member_name,approval_status")
      .maybeSingle();
    if (error) return fail(error.message);

    const split = Number(category.conference_split_pct ?? 0);
    const result = {
      receipt: data,
      category: { name: category.name, fund_type: category.fund_type, conference_split_pct: split },
      conference_share: (Number(input.amount) * split) / 100,
      local_share: Number(input.amount) - (Number(input.amount) * split) / 100,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});