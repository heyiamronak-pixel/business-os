# Business OS — Consolidated Development Roadmap

This roadmap reflects the source code currently present in the repository, rather than assuming a clean-slate foundation.

## Milestone 0 — Source audit

**Code-level inspection completed: 14 November 2026.**

- Mapped the 259-file repository.
- Identified the active React/Vite frontend entry point and Wouter route table.
- Identified workspace context, domain types, local repository, and business logic.
- Identified the Express API route tree and Drizzle schema scaffold.
- Identified a separate mockup sandbox and avoided treating it as the active frontend.
- Identified implemented prototype workflows and routes still mapped to placeholders.

**Still required:** run dependency installation, typecheck, production build, and browser workflows in the actual Replit/local runtime. No runtime pass is claimed.

## Milestone 1 — Stabilize current prototype

- Preserve existing UI, domain models, and calculations.
- Reproduce dependency, typecheck, and build baseline.
- Verify workspace setup and browser persistence.
- Verify product, customer, expense, inventory, target, and task create/edit/delete flows.
- Verify sales stock deduction, insufficient-stock handling, sale update, and delete/stock restoration.
- Confirm which route is canonical and keep mockup sandbox separate.
- Add regression tests for calculations and state transitions.
- Replace stale project documentation with accurate status.

**Exit criteria:** repeatable build and successful browser tests for the existing workflows.

## Milestone 2 — Sales workflow completion

- Verify sales UI route and connect an actual sales page rather than a generic placeholder.
- Validate sale inputs and product/customer references.
- Ensure sale updates and reversals keep stock and totals consistent.
- Add history/filtering and payment status only with verified data behavior.

**Exit criteria:** complete end-to-end sales workflow and regression tests.

## Milestone 3 — Identity and organization foundation

- Implement authentication and user profiles.
- Add organizations and memberships.
- Support multiple organizations per user and workspace switching.
- Add organization-specific Owner/Admin/Manager/Employee roles.
- Enforce backend authorization and tenant isolation.
- Add organization settings (industry, currency, timezone, branding, enabled modules).

**Exit criteria:** cross-tenant read/write tests pass; client-supplied organization IDs are never trusted without membership checks.

## Milestone 4 — PostgreSQL and business API

- Define tenant-scoped Drizzle tables and migrations.
- Implement validated API contracts and business endpoints.
- Move persistence behind repository/service abstractions.
- Migrate existing local prototype data only through an explicit, tested migration/export path.
- Add transaction boundaries for sales and inventory.

**Exit criteria:** business records persist across devices and users with tested tenant isolation and transaction integrity.

## Milestone 5 — Team, reports, and Action Center

- Complete team membership and permissions.
- Build reports only from actual authorized records.
- Add date filters and transparent calculations.
- Add alerts tied to verifiable business conditions.
- Keep missing data visible rather than filling gaps with invented values.

## Milestone 6 — AI Business Advisor and industry modules

- Provide only authorized organization context to the Advisor.
- Separate stored facts, calculations, and recommendations.
- Start with transparent rules where practical.
- Add industry-specific workflows independently (retail, hospitality, travel, agencies, manufacturing, e-commerce, services).
- Evaluate paid AI/third-party integrations only after cost, privacy, and access review.

## Milestone 7 — Billing and launch readiness

- Add independent organization subscription, invoice, plan, and usage boundaries.
- Ensure suspension in one organization cannot affect another.
- Test backups, restore, security, performance, accessibility, mobile responsiveness, monitoring, and rollback.

## Delivery discipline

Keep changes reversible. Do not rebuild the app from scratch or migrate routers/storage as incidental cleanup. Record changed files and actual test outputs. A feature is not complete until its end-to-end tests pass.
