# Business Sutra — Phase 2: Architecture & Data Foundation

## Architecture decision
- Keep the current React/Vite/Wouter client as the active UI during this phase. Do not switch to the unused TanStack Router tree or rewrite screens while persistence and authorization are being established.
- Use the existing Express API server, PostgreSQL and Drizzle workspace packages. They already exist in this repository; the database schema package was empty.
- PostgreSQL is the system of record. The browser must call the API and must never connect directly to PostgreSQL.
- Authentication is provider-backed. `app_users` stores the provider + immutable provider subject, not passwords or provider secrets. Select and configure the provider before implementing sign-in.
- A user may belong to multiple businesses with a separate role in each business. A business may have multiple branches.
- Every tenant-owned record must carry a business scope and every API operation must authorize membership/role on the server.

## Phase 2 sequence
1. [x] Record the active architecture and avoid a blind router rewrite.
2. [x] Add typed PostgreSQL/Drizzle schema for application users, businesses, memberships, user preferences, branches and append-only audit logs.
3. [x] Add initial SQL migration with constraints, indexes and tenant Row Level Security policies.
4. [ ] Verify schema and migration against a clean PostgreSQL database; add migration execution to CI.
5. [ ] Select and provision managed PostgreSQL and an authentication provider; configure secrets only in hosting environment settings.
6. [ ] Implement verified authentication/session middleware in the API.
7. [ ] Implement tenant context and authorization helpers; require business scope for all tenant APIs.
8. [ ] Add integration tests proving one business cannot read or mutate another business's records.
9. [ ] Migrate active Wouter app repository from localStorage to API-backed repositories, with explicit export, preview, validation, backup and rollback.
10. [ ] Keep the legacy localStorage state readable until migration is accepted; never silently overwrite or delete it.

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

## Current status
This branch adds typed schema and migration source only. It does not provision a database, create an auth provider, deploy the API, enable sign-in or move production data. The SQL has not yet been executed against PostgreSQL in this environment.
