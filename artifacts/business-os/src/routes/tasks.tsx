import { createFileRoute } from '@tanstack/react-router';
import { TasksScreen } from '@/screens/tasks';

export const Route = createFileRoute('/tasks')({
  component: TasksScreen,
});