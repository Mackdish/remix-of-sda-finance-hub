import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Audit Trail" description="Every login, edit, print and export — timestamped for accountability." icon={<ShieldCheck className="h-5 w-5" />} />
  ),
});