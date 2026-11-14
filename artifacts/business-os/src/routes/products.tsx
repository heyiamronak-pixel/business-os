import { createFileRoute } from '@tanstack/react-router';
import { ProductsScreen } from '@/screens/products';

export const Route = createFileRoute('/products')({
  component: ProductsScreen,
});