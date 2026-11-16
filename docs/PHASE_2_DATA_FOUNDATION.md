# Business Sutra — Phase 2: Architecture & Data Foundation

## Architecture decision
- Keep the current React/Vite/Wouter client as the active UI during this phase. Do not switch to the unused TanStack Router tree or rewrite screens while persistence and authorization are being established.
- Use the existing Express API server, PostgreSQL and Drizzle workspace packages.
- PostgreSQL is the system of record. The browser must call the API and must never connect directly to PostgreSQL.
- Authentication is Supabase Auth. The API verifies bearer tokens against Supabase Auth before trusting identity.
- A user may belong to multiple businesses with a separate role in each business. A business may have multiple branches.
- Every tenant-owned record carries a business scope and every API operation must authorize membership/role on the server.

## Phase 2 delivery status
- [x] Active architecture documented.
- [x] Identity, businesses, memberships, preferences, branches and append-only audit log schema + RLS migration.
- [x] Operational PostgreSQL tables for products, customers, sales, sale items, inventory movements, expenses, revenue targets and tasks, each tenant-scoped with RLS.
- [x] Clean PostgreSQL migration and RLS tests in CI.
- [x] Supabase bearer-token verification middleware and transaction-local user context.
- [x] Business and branch listing/creation endpoints.
- [ ] Typed Drizzle schema for operational tables and complete operational CRUD API.
- [ ] Frontend signup/login and session lifecycle.
- [ ] Frontend repository switch to API-backed storage.
- [ ] Safe local-data export, preview, import, validation, backup and rollback.
- [ ] Live Supabase Auth + Render + Netlify end-to-end verification.

## Security invariants
- Never trust a browser-supplied business ID without checking the authenticated user's active membership.
- Database runtime role must not own application tables and must not have BYPASSRLS.
- API sets app.user_id transaction-locally only after validating a signed Supabase identity.
- RLS is defence in depth; API authorization remains mandatory.
- Audit logs are append-only for normal application roles. Never log passwords, tokens, payment credentials or unnecessary attendance selfie/location evidence.
- No localStorage data is deleted or overwritten during cloud migration. Import must be explicit and idempotent.

## Local data compatibility
- Active Wouter app key: `business-os-state-v2`.
- Older alternate key: `vestra.os.v1`.
- Existing local state remains readable and untouched until cloud import is explicitly confirmed.
- Sales and inventory movements must be imported in a transaction so sale totals and stock effects remain consistent.
