import { createFileRoute } from "@tanstack/react-router";
import { FundsPage } from "@/features/funds/funds-page";

export const Route = createFileRoute("/_authenticated/trust-funds")({
  head: () => ({ meta: [{ title: "Trust Funds — SDA Treasurer" }] }),
  component: () => <FundsPage fundType="trust" title="Trust Funds" description="Conference-bound offerings with automatic split calculations." />,
});