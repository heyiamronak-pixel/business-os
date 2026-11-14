# Business Sutra — Phase 2: Architecture & Data Foundation

## Architecture decision
- Keep the current React/Vite/Wouter client as the active UI during this phase. Do not switch to the unused TanStack Router tree or rewrite screens while persistence and authorization are being established.
- Use the existing Express API server, PostgreSQL and Drizzle workspace packages. They already exist in this repository; the database schema package was empty.
- PostgreSQL is the system of record. The browser must call the API and must never connect directly to PostgreSQL.
- Authentication is provider-backed. Supabase Auth + Supabase PostgreSQL is the selected default. `app_users` stores the provider + immutable provider subject, not passwords or provider secrets. Tokens are verified with Supabase Auth before the API trusts the identity.
- A user may belong to multiple businesses with a separate role in each business. A business may have multiple branches.
- Every tenant-owned record must carry a business scope and every API operation must authorize membership/role on the server.

## Phase 2 sequence
1. [x] Record the active architecture and avoid a blind router rewrite.
2. [x] Add typed PostgreSQL/Drizzle schema for application users, businesses, memberships, user preferences, branches and append-only audit logs.
3. [x] Add initial SQL migration with constraints, indexes and tenant Row Level Security policies.
4. [x] Verify the migration against clean PostgreSQL in CI; run tenant-isolation, owner-escalation and audit immutability checks on every branch push.
5. [~] Select Supabase Auth + PostgreSQL. External project provisioning, runtime credentials and API hosting configuration remain deployment gates.
6. [x] Implement Supabase Auth token verification in the API. Runtime verification requires the project URL and public anon key in API environment settings.
7. [x] Add transaction-local verified user context, business listing/creation, branch listing/creation and server-side PostgreSQL RLS enforcement.
8. [~] Add database-level cross-tenant and role-escalation tests plus API auth middleware tests. Full HTTP-to-PostgreSQL integration tests remain a release gate.
9. [ ] Migrate the active Wouter app repository from localStorage to API-backed repositories, with explicit export, preview, validation, backup and rollback.
10. [x] Keep the legacy localStorage state readable and untouched until the cloud migration is accepted; never silently overwrite or delete it.

## Security invariants
- No browser-supplied business ID is trusted without checking the authenticated user's active membership.
- No public API endpoint accepts an arbitrary tenant ID and returns data without server-side membership checks.
- Database runtime role is not a table owner and does not have `BYPASSRLS`.
- API sets `app.user_id` transaction-locally only after validating a signed authentication-provider identity.
- RLS is defence in depth; API authorization remains mandatory.
- Audit logs are append-only for normal application roles. Never log passwords, tokens, payment credentials or unnecessary attendance selfie/location evidence.
- Do not store password hashes or invent a custom password authentication flow in this application.

## Data migration safety
- The active Wouter app uses localStorage key `business-os-state-v2`.
- An alternate Zustand/TanStack-era repository uses `vestra.os.v1`; it is not the active Wouter data store.
- These stores are not interchangeable. Migration must identify the active user's source, validate every record, map stable IDs and preserve a downloadable source backup before any server write.
- Do not run a migration against a live database until the schema has been applied to a disposable database and tenant-isolation tests pass.

## Current status (2026-11-15)
- Implemented in this branch: typed schema, SQL migration, restricted non-login API role, verified Supabase token middleware, server-side identity sync, transaction-local user context, business and branch endpoints, CORS allow-listing, database-level RLS tests and API auth middleware tests.
- Verified in GitHub Actions: clean PostgreSQL migration, tenant visibility checks, cross-tenant insert rejection, owner-role escalation rejection, append-only audit check, workspace typecheck and production build. The latest verification run is linked from the Phase 2 pull request.
- Not yet live: no Supabase project or API hosting environment has been provisioned/configured by this repository. The API is not deployed and sign-in is not enabled in the production frontend.
- Not yet migrated: active Wouter data is still in browser localStorage (`business-os-state-v2`). No user data has been uploaded, copied or deleted.
- Phase 2 is not considered production-complete until project provisioning, HTTP/database integration tests, active-client migration and rollback acceptance are completed.

See [PHASE_2_SETUP.md](./PHASE_2_SETUP.md) for the exact environment setup and deployment gate.
