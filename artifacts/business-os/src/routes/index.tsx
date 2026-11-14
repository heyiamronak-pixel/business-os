import { createFileRoute } from '@tanstack/react-router';
import { CockpitScreen } from '@/screens/cockpit';

export const Route = createFileRoute('/')({
  component: CockpitScreen,
});