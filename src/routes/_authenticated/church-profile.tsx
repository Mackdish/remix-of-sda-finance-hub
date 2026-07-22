import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/church-profile")({
  head: () => ({ meta: [{ title: "Church Profile — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Church Profile" description="Church name, district, conference, logo and officer details for all printed reports." icon={<Building2 className="h-5 w-5" />} />
  ),
});