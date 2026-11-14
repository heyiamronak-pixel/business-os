import { createFileRoute } from '@tanstack/react-router';
import { ActionsScreen } from '@/screens/actions';

export const Route = createFileRoute('/actions')({
  component: ActionsScreen,
});