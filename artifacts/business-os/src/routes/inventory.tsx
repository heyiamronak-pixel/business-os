import { createFileRoute } from '@tanstack/react-router';
import { InventoryScreen } from '@/screens/inventory';

export const Route = createFileRoute('/inventory')({
  component: InventoryScreen,
});