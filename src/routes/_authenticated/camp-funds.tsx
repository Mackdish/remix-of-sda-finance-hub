import { createFileRoute } from "@tanstack/react-router";
import { FundsPage } from "@/features/funds/funds-page";

export const Route = createFileRoute("/_authenticated/camp-funds")({
  head: () => ({
    meta: [
      { title: "Camp Expense Fund — SDA Treasurer" },
      { name: "description", content: "Track camp meeting contributions and the camp expense fund balance." },
    ],
  }),
  component: () => (
    <FundsPage fundType="camp" title="Camp Expense Fund" description="Camp meeting contributions held for camp expenses." />
  ),
});
