import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trust-funds")({
  head: () => ({ meta: [{ title: "Trust Funds — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Trust Funds" description="Manage conference-bound offerings with automatic split calculations." icon={<Coins className="h-5 w-5" />} />
  ),
});