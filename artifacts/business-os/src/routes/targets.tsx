import { createFileRoute } from '@tanstack/react-router';
import { TargetsScreen } from '@/screens/targets';

export const Route = createFileRoute('/targets')({
  component: TargetsScreen,
});