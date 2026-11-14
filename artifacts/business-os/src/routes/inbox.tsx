import { createFileRoute } from '@tanstack/react-router';
import { InboxScreen } from '@/screens/inbox';

export const Route = createFileRoute('/inbox')({
  component: InboxScreen,
});