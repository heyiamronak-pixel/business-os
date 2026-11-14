# Business OS

Business OS is a modular foundation for multi-organization business management and business intelligence across industries.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/business-os/` — responsive web application and shared application shell.
- `artifacts/business-os/src/data/modules.ts` — current module registry and navigation metadata.
- `artifacts/business-os/src/components/app-shell.tsx` — route-aware shell, workspace context area, and mobile navigation.
- `artifacts/business-os/src/pages/` — page-level surfaces; feature pages are intentionally placeholders in the foundation phase.
- `lib/api-spec/openapi.yaml` — shared API contract source of truth when backend endpoints are introduced.
- `lib/db/src/schema/` — Drizzle schema source of truth when persisted domain models are introduced.
- `docs/foundation-architecture.md` — modular SaaS architecture decisions and future boundaries.

## Architecture decisions

- The web app is a shell-first foundation: navigation and route boundaries exist before feature workflows or business data.
- Module navigation is registry-driven so future industry modules can be enabled without coupling the shell to a specific industry.
- Organization context and authorization are future server-owned concerns; the UI does not pretend a user or workspace is signed in.
- API contracts will be defined in OpenAPI before implementation, and persistence will use tenant-scoped PostgreSQL models through Drizzle.
- The first build intentionally contains no seed data, payment integrations, messaging APIs, ad APIs, or AI provider calls.

## Product

The long-term product will give business owners and teams a shared operating layer for sales, products, inventory, customers, expenses, targets, marketing, tasks, reporting, AI guidance, and industry-specific modules. This first build only establishes the application foundation.

## User preferences

- Build in deliberate phases; explain architecture before starting major feature work.
- Keep the experience mobile-first, modern, clean, and professional.
- Do not add fake business data during the foundation phase.

## Gotchas

- Do not add domain tables, authentication flows, or feature APIs until the user approves the next phase.
- Keep `lib/api-spec/openapi.yaml` as the source of truth for any future backend endpoint and regenerate clients after changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
