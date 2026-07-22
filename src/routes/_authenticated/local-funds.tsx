import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/local-funds")({
  head: () => ({ meta: [{ title: "Local Church Funds — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Local Church Funds" description="Track offerings retained by the local church." icon={<Landmark className="h-5 w-5" />} />
  ),
});