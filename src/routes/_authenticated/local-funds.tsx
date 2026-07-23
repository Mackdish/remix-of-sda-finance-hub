import { createFileRoute } from "@tanstack/react-router";
import { FundsPage } from "@/features/funds/funds-page";

export const Route = createFileRoute("/_authenticated/local-funds")({
  head: () => ({ meta: [{ title: "Local Church Funds — SDA Treasurer" }] }),
  component: () => <FundsPage fundType="local" title="Local Church Funds" description="Offerings retained by the local church." />,
});