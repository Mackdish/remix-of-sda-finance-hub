import { createFileRoute } from "@tanstack/react-router";
import { MyGivingPage } from "@/features/members/my-giving-page";

export const Route = createFileRoute("/_authenticated/my-giving")({
  head: () => ({
    meta: [
      { title: "My Contributions — SDA Treasurer" },
      { name: "description", content: "View your giving history by category and download your official church receipts." },
      { property: "og:title", content: "My Contributions — SDA Treasurer" },
      { property: "og:description", content: "View your giving history and download official church receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyGivingPage,
});