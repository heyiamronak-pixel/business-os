import { createFileRoute } from '@tanstack/react-router';
import { AdvisorScreen } from '@/screens/advisor';

export const Route = createFileRoute('/advisor')({
  component: AdvisorScreen,
});