import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/remittance")({
  head: () => ({ meta: [{ title: "Conference Remittance — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Conference Remittance" description="Submit trust funds to the conference with printable remittance." icon={<Send className="h-5 w-5" />} />
  ),
});