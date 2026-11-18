import { createFileRoute } from "@tanstack/react-router";
import { SuppliersScreen } from "@/screens/suppliers";

export const Route = createFileRoute("/suppliers")({
  component: SuppliersScreen,
});
