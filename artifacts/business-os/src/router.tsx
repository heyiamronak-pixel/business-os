import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { AppErrorComponent } from './lib/error-component';

const basepath =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

function PendingScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <p className="font-display text-lg">Loading Business Sutra…</p>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    ...(basepath ? { basepath } : {}),
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: PendingScreen,
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}