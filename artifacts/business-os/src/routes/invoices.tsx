import { createFileRoute } from "@tanstack/react-router";
import { InvoicesScreen } from "@/screens/invoices";

export const Route = createFileRoute("/invoices")({
  component: InvoicesScreen,
});
