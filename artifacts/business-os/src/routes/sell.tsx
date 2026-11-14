import { createFileRoute } from '@tanstack/react-router';
import { SellScreen } from '@/screens/sell';

export const Route = createFileRoute('/sell')({
  component: SellScreen,
});