# Business OS — Development Roadmap

This roadmap is deliberately staged. Do not start later phases until their dependencies are understood and the prior milestone is tested.

## Milestone 0 — Source audit (first)

**Blocked on:** canonical source ZIP / repository export.

- Import the original ZIP and inspect its full folder tree.
- Identify package manager, scripts, dependencies, router/bootstrap, state/store, domain models, calculation engines, persistence, and UI entry points.
- Compare any active prototype infrastructure and retain only compatible pieces.
- Identify missing files, conflicting architectures, build/type errors, and unfinished modules.
- Establish a reproducible install, typecheck, build, and test baseline.
- Record what works before changing it.
- Create a checkpoint before structural edits.

**Exit criteria:** written audit, verified commands, working local setup or a precise list of blockers. No claim of functionality without a successful test.

## Milestone 1 — Stabilize the current application

- Preserve the canonical source architecture and business logic.
- Resolve dependency/toolchain compatibility.
- Restore missing bootstrap and routing files only after confirming the actual router.
- Connect existing screens and navigation.
- Preserve responsive behavior and themes.
- Run typecheck, production build, tests, route checks, and mobile viewport checks.
- Fix regressions before adding new platform capabilities.

**Exit criteria:** app starts and builds reproducibly; existing critical flows pass agreed tests.

## Milestone 2 — Identity and organization foundation

- Implement authentication and user profiles.
- Add organizations and organization memberships.
- Support users belonging to multiple organizations and switching workspaces.
- Add organization-scoped Owner/Admin/Manager/Employee roles.
- Add backend authorization and secure tenant isolation.
- Add tests that prove one organization cannot read or modify another organization's records.
- Add organization-level settings, currency, timezone, industry, and enabled modules.

**Exit criteria:** tenant boundary tests pass for reads, writes, exports, storage, and background processing.

## Milestone 3 — Core business operations

Verify and complete the connected workflows for:
- Products and categories.
- Inventory movements and low-stock alerts.
- POS and sales transactions.
- Customer purchase history.
- Expenses.
- Revenue targets.
- Tasks and team workflows.

A completed sale must update relevant stock, transaction, customer history, and reporting records consistently. Reversals and edits must preserve data integrity.

**Exit criteria:** end-to-end tests confirm the related records and calculations remain consistent.

## Milestone 4 — Reports and Action Center

- Build reports on actual authorized records.
- Add date ranges, filters, and comparisons.
- Add revenue, expenses, profitability, product, inventory, customer, marketing, and team analysis as supported by the data model.
- Generate actionable alerts from verifiable conditions.
- Make missing data visible rather than filling it with fabricated figures.

## Milestone 5 — AI Business Advisor

- Provide organization-scoped structured context retrieval.
- Distinguish facts, calculations, and recommendations.
- Begin with transparent rules where practical.
- Evaluate model provider, privacy, token costs, rate limits, and permission boundaries before connecting a paid LLM.

## Milestone 6 — Industry expansion and integrations

Add and validate hospitality, travel, agency, manufacturing, e-commerce, and other industry workflows as separate modules. Add Meta Ads, Google Ads, WhatsApp, email, and payment integrations only when permissions, pricing, value, and operational requirements are clear.

## Milestone 7 — Launch readiness

- Security and privacy review.
- Backup and restore test.
- Performance and load tests.
- Mobile responsiveness and accessibility checks.
- Monitoring, error reporting, and support process.
- Production deployment and rollback plan.
- PWA/mobile packaging only after the responsive web product is stable.

## Release discipline

Each milestone should be delivered in small, reviewable changes. Keep a rollback point. Record changed files, test commands, outcomes, and known limitations.
