import { createFileRoute } from "@tanstack/react-router";
import { ChurchProfilePage } from "@/features/church/church-profile-page";

export const Route = createFileRoute("/_authenticated/church-profile")({
  head: () => ({ meta: [{ title: "Church Profile — SDA Treasurer" }] }),
  component: ChurchProfilePage,
});