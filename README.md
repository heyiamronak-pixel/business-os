# Business OS

**One platform. Connected operations. Clear business intelligence. Better decisions.**

Business OS is a multi-industry business management and business intelligence SaaS foundation. The current application includes an operational prototype with browser-local business records and a roadmap toward secure multi-tenant SaaS.

## Product model

- One application serves multiple businesses (organizations/workspaces).
- A user may own or participate in more than one business.
- Each organization must have independent data, members, roles, settings, enabled modules, subscription, billing status, and usage.
- A failed payment or suspended subscription for one organization must not affect another organization the same user operates.

## Current source status (repository audit: 14 November 2026)

The repository contains 259 tracked files, including the React/Vite frontend, Express API workspace, shared library packages, a mockup sandbox, and project documentation.

### Implemented in the current frontend prototype

- Workspace setup and browser-local workspace state.
- Product create, edit, delete, search, and catalog display.
- Customer and expense record management.
- Inventory stock movements and movement history.
- Sales calculation/state logic, including stock deduction and stock restoration when a sale is deleted.
- Revenue targets and task record management.
- Responsive application shell and dashboard empty states.

These are code-level findings, not a claim that every flow has passed runtime/browser testing.

### Known limitations and gaps

- The active frontend entry point is `artifacts/business-os/src/main.tsx`, which loads `App.tsx`; its route table currently uses Wouter.
- Sales, marketing, team, reports, and AI Advisor routes are currently mapped to a generic placeholder rather than complete workflows.
- The operational business repository currently uses browser-local persistence. This is suitable only for a local prototype and is not shared, authenticated, or secure multi-tenant storage.
- The Express API currently exposes a health route; business CRUD APIs and server-side authorization are not yet implemented.
- The Drizzle database package has a connection setup, but its schema index currently exports no business tables.
- Authentication, organization memberships, tenant-scoped permissions, independent subscriptions/billing, audit events, and production data isolation remain future work.
- The repository also contains a separate mockup sandbox. Do not assume its components or routes are part of the active Business OS app.

## Product principles

1. Production dashboards must use actual authorized business data. Never invent metrics.
2. Preserve existing domain models and calculations when stabilizing the prototype.
3. Keep industry workflows and calculations modular.
4. Enforce authorization in the backend/data layer, not merely by hiding UI controls.
5. Start with a modular monolith and shared infrastructure; do not introduce microservices prematurely.
6. Do not add paid services or external integrations without an agreed business case and approval.

## Technical stack found in source

- pnpm workspaces
- React, Vite, TypeScript
- Wouter in the active app route table
- React Query
- Express API workspace
- Drizzle ORM / PostgreSQL package scaffold
- Browser-local repository for current operational prototype
- Separate mockup sandbox workspace

Preserve the current active architecture during stabilization. Do not migrate routers or storage as an incidental cleanup.

## Development commands

From repository root, using pnpm:

- `pnpm install`
- `pnpm run typecheck`
- `pnpm run build`
- Frontend: `pnpm --filter @workspace/business-os run dev`
- API: `pnpm --filter @workspace/api-server run dev`

Runtime success and database connectivity still need to be verified in the actual development environment.

## Next milestones

1. Reproduce and fix current frontend build/typecheck issues.
2. Verify the existing local workflows end-to-end and add regression tests.
3. Complete and verify the Sales workflow; replace placeholder routes only when their workflows exist.
4. Design and implement authenticated users, organizations, memberships, and tenant isolation.
5. Add tenant-scoped PostgreSQL schema and business APIs.
6. Add billing, reports, Action Center, AI Advisor, and industry modules behind verified authorization.

See [Architecture](docs/ARCHITECTURE.md), [Roadmap](docs/ROADMAP.md), and [Development Rules](docs/DEVELOPMENT_RULES.md).
