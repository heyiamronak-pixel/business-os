import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell } from '@/components/app-shell.legacy';
import { BusinessProvider } from '@/hooks/use-workspace';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Dashboard from '@/pages/dashboard';
import Customers from '@/pages/customers';
import Expenses from '@/pages/expenses';
import Inventory from '@/pages/inventory';
import ModulePlaceholder from '@/pages/module-placeholder';
import ModulesOverview from '@/pages/modules-overview';
import Products from '@/pages/products';
import RevenueTargets from '@/pages/revenue-targets';
import Setup from '@/pages/setup';
import Sales from '@/pages/sales';
import Settings from '@/pages/settings';
import Tasks from '@/pages/tasks';
import Attendance from '@/pages/attendance';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
      <BusinessProvider>
      <AppShell>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/setup" component={Setup} />
            <Route path="/modules" component={ModulesOverview} />
            <Route path="/sales" component={Sales} />
            <Route path="/products" component={Products} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/customers" component={Customers} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/revenue-targets" component={RevenueTargets} />
            <Route path="/marketing" component={ModulePlaceholder} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/team" component={ModulePlaceholder} />
            <Route path="/attendance" component={Attendance} />
            <Route path="/reports" component={ModulePlaceholder} />
            <Route path="/ai-advisor" component={ModulePlaceholder} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </AppShell>
      </BusinessProvider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
