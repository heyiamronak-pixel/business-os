import { createFileRoute } from '@tanstack/react-router';
import { TeamScreen } from '@/screens/team';

export const Route = createFileRoute('/team')({
  component: TeamScreen,
});