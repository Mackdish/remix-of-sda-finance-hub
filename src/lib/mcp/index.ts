import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getChurchProfileTool from "./tools/get-church-profile";
import listReceiptsTool from "./tools/list-receipts";
import listExpensesTool from "./tools/list-expenses";
import cashSummaryTool from "./tools/cash-summary";
import createReceiptTool from "./tools/create-receipt";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "sda-finance-hub",
  title: "SDA Finance Hub",
  version: "0.1.0",
  instructions:
    "Treasury tools for a Seventh-day Adventist church. Use `get_church_profile` for church details, `list_receipts` and `list_expenses` for transactions, `cash_summary` for period totals with conference/local fund splits, and `create_receipt` to record a new offering/tithe receipt (created as a draft pending approval). All data is scoped to the signed-in treasurer's church.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getChurchProfileTool, listReceiptsTool, listExpensesTool, cashSummaryTool, createReceiptTool],
});