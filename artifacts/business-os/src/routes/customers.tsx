import { createFileRoute } from '@tanstack/react-router';
import { CustomersScreen } from '@/screens/customers';

export const Route = createFileRoute('/customers')({
  component: CustomersScreen,
});