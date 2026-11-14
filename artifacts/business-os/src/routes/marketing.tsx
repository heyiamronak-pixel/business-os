import { createFileRoute } from '@tanstack/react-router';
import { MarketingScreen } from '@/screens/marketing';

export const Route = createFileRoute('/marketing')({
  component: MarketingScreen,
});