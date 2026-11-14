# Business OS — Current Repository Notes

## Current application entry points

- Frontend: `artifacts/business-os/src/main.tsx` → `src/App.tsx`
- Active frontend routing: Wouter route table in `src/App.tsx`
- Workspace/business state: `src/hooks/use-workspace.tsx`
- Business domain types: `src/domain/types.ts`
- Business calculations: `src/services/business-logic.ts`
- Browser persistence adapter: `src/services/business-repository.ts`
- API server: `artifacts/api-server/src/index.ts` → `src/app.ts` → `src/routes`
- Database package: `lib/db`
- Mockup sandbox: `artifacts/mockup-sandbox` (separate app; not the active Business OS entry point)

## Current frontend features found in source

- Workspace setup and local state
- Product CRUD
- Customer CRUD
- Expense CRUD
- Inventory movements
- Sales state/calculation logic
- Revenue targets
- Tasks
- Dashboard and responsive application shell

The presence of code does not mean each workflow has passed browser testing.

## Current limitations

- The active business repository persists in browser localStorage; this is not suitable for shared multi-user SaaS data.
- The Express API currently mounts a health route only.
- The Drizzle schema export is empty; no business tables are defined yet.
- Authentication, organization memberships, backend permissions, tenant isolation, subscription/billing boundaries, and production APIs are not implemented.
- Sales, marketing, team, reports, and AI Advisor route entries need workflow completion; some currently use a generic placeholder.
- Do not assume the mockup sandbox is integrated into the active app.

## Commands

From repository root:

- `pnpm install`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm --filter @workspace/business-os run dev`
- `pnpm --filter @workspace/api-server run dev`

The environment must provide the required Node/pnpm versions and configured secrets (including DATABASE_URL for database package operations). Run these commands in the project environment and record their actual results.

## Working rules

- Preserve the active Wouter app and existing business logic unless a tested migration plan justifies change.
- Do not replace local persistence with an unverified database implementation.
- Do not add seed/fake production business data.
- Do not introduce paid external services without approval.
- Implement backend authorization before claiming multi-tenant security.
