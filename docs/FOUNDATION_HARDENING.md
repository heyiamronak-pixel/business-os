# Business Sutra — Foundation Hardening Plan

## Product decisions
- Audience: universal businesses (retail, services, hospitality, travel, agencies, manufacturing, ecommerce and more).
- GST: optional during onboarding; non-GST businesses must be able to issue non-GST documents where legally appropriate.
- Attendance: GPS + selfie, with employee identity, consent, server-side validation, secure evidence storage and audit history.
- UX: responsive mobile experience and a distinct desktop workspace layout.

## Verified current implementation observations
- The active client entry point is `src/main.tsx`, which renders `src/App.tsx`.
- `src/App.tsx` uses Wouter routing and `BusinessProvider`.
- The Vite configuration also includes the TanStack Start plugin; this coexistence needs an intentional decision and build verification before changing routing.
- The current business repository persists workspace data in browser local storage. It is not a shared cloud database.
- Sales now has a dedicated active Wouter page for creating sales, selecting customers/products, recording payment status and reviewing/deleting sales. Marketing, Team, Reports and AI Advisor remain placeholders.
- Product, Inventory, Customers, Expenses, Revenue Targets, Tasks and Dashboard have dedicated page components.
- Sales creation and inventory adjustment are coupled in the current client-side business context. Regression tests now cover duplicate cart rows, stock validation, sale totals, stock decrement/movement creation and stock restoration.
- An Attendance prototype has been added. Its geofence coordinates, selfies and attendance records are stored in the browser and are not tamper-resistant or shared across devices.
- Optional GST registration fields have been added to workspace onboarding. GST invoice generation, tax calculation, numbering and compliance checks are not yet implemented.

## Foundation principles
1. Preserve current user data and provide explicit, tested migrations before changing storage schemas.
2. Never treat browser local storage as an authentication, authorization, audit or multi-tenant security boundary.
3. Every business-owned record must be scoped to a tenant/business ID on the server; enforce authorization server-side.
4. Keep money in integer minor units (paise) or a decimal-safe representation; never use floating point for ledger arithmetic.
5. Keep inventory movements, sales, invoices, payments and ledger postings auditable and transactionally consistent.
6. Attendance evidence is sensitive personal data. Minimize collection, obtain clear employee consent, restrict access, define retention/deletion, and validate location on the server with timestamps and anti-replay controls.
7. GST treatment must be configurable per business and document; validate GSTIN and tax rules against authoritative sources before claiming compliance.
8. Desktop and mobile should share data and capabilities but use layouts optimized for each form factor.

## Work sequence and acceptance criteria

### 0. Stabilize the current app — technical checks passed; manual acceptance remains
- [x] Install from the lockfile and run workspace typecheck + production build in GitHub Actions.
- [x] Add six focused sales/inventory regression tests and run them in CI.
- [x] Connect the Sales route to a dedicated active page; sale creation validates stock and the existing business logic synchronizes inventory.
- [x] Widen shared page containers and dashboard workspace for desktop displays; preserve responsive mobile navigation.
- [x] Confirm Attendance route and navigation entry; keep the prototype limitation visible until it is server-backed.
- [x] Generate a Netlify Deploy Preview for the pull request: https://deploy-preview-1--businessoperatingsystembyronak.netlify.app
- [ ] Perform manual browser acceptance on desktop and mobile for onboarding, product CRUD, inventory movements, sale creation/deletion, customer CRUD, expenses, tasks, backup export, direct route refresh and camera/location permissions. The preview is deployed, but this environment cannot render the site in an interactive browser, so this final visual/permission check remains outstanding.
- [ ] Verify the production deployment only after the pull request is reviewed and merged; production was intentionally not changed.

### 1. Architecture and data foundation
- Select one active routing/rendering architecture after build and deployment review; do not perform a blind rewrite.
- Define tenant, user, membership, role, branch and audit-log entities.
- Add authentication, session management, server-side authorization and tenant isolation.
- Select and provision a managed relational database, migrations, backups and restore testing.
- Import/migrate existing local data with preview, validation, backup and rollback.

### 2. Core business workflows
- Complete sales/POS, purchase, inventory, customers and suppliers.
- Implement invoice documents, sequential numbering, PDF/print and payment status.
- Implement optional GST profile, HSN/SAC, place-of-supply, CGST/SGST/IGST and tax summaries only after rules are validated.
- Implement finance ledger, cash/bank, receivables, payables, expenses, P&L and cash-flow reconciliation.

### 3. People and automation
- Employee accounts, invitations, roles, shifts, leave and payroll.
- GPS + selfie attendance backed by server validation and secure media storage.
- Rules engine with event triggers, approvals, reminders and delivery logs.

### 4. Release readiness
- Automated unit, integration and end-to-end tests.
- Security review, tenant-isolation tests, backup/restore drill and privacy review.
- Desktop/mobile accessibility and performance checks.
- Staging deployment, acceptance testing and controlled production release.

## Current release gate
Do not describe the app as production-ready until cloud authentication, server-side tenant isolation, database backups, audit logs, security tests and deployment verification pass.
