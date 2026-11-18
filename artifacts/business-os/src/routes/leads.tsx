import { createFileRoute } from "@tanstack/react-router";
import { LeadsScreen } from "@/screens/leads";

export const Route = createFileRoute("/leads")({
  component: LeadsScreen,
});
