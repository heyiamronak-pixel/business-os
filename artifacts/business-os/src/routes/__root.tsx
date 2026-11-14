import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { HydrateGate, ThemeRuntime } from '@/components/app-shell';
import appCss from '../styles.css?url';

function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <h1 className="font-display text-3xl">Page not found</h1>
      <a className="text-primary underline underline-offset-4" href={import.meta.env.BASE_URL}>
        Return to Business Sutra
      </a>
    </main>
  );
}

function RootDocument() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary resetKey={pathname}>
          <HydrateGate>
            <ThemeRuntime />
            <Outlet />
            <Toaster position="bottom-center" richColors />
          </HydrateGate>
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: 'Business Sutra' },
      {
        name: 'description',
        content: 'A multi-business workspace for daily operations and decisions.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFoundPage,
});