import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cash-statement")({
  head: () => ({ meta: [{ title: "Cash Statement — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Cash Statement" description="Digital version of the SDA Church Treasurer's Cash Statement form." icon={<FileSpreadsheet className="h-5 w-5" />} />
  ),
});