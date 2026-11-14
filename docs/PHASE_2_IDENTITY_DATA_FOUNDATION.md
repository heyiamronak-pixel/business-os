# Business Sutra — Phase 2: Identity and Data Foundation

## Architecture decisions

| Area | Decision | Reason |
|---|---|---|
| Frontend | Keep the deployed React + Vite + Wouter application as the active UI | This is the verified live entry path; do not migrate routers during the data foundation work |
| Backend | Keep the existing Express API server as a modular monolith | One backend is enough for the first release; no premature microservices |
| Database | PostgreSQL through the existing Drizzle workspace package | The repository already contains `pg`, Drizzle ORM and Drizzle Kit |
| Authentication | Better Auth stable 1.7.x line, currently pinned in the plan to 1.7.23; use the Drizzle adapter and Organization plugin | Session-based authentication, user accounts, organizations, members and invitations without writing a custom password/session system |
| Tenant model | One Organization per separately operated business; one User may belong to several Organizations | A user's active workspace is context, not the security boundary |
| Roles | Owner, Admin, Manager and Employee | Organization-specific role assignment; custom Better Auth access-control definitions will map the product roles |
| Branches | Branch rows always belong to an Organization | GPS attendance, team operations and reporting need a branch boundary under the tenant |
| Audit | Append events; no general-purpose update/delete service | Preserve a trace of important business and access changes |

Better Auth's official documentation describes its Drizzle adapter, core user/session/account/verification schema, and Organization plugin for organization, membership and invitation records. See:
- https://better-auth.com/docs/installation
- https://better-auth.com/docs/adapters/drizzle
- https://better-auth.com/docs/plugins/organization

The npm stable tag was reported as 1.7.23 on 15 November 2026. Re-check the stable line and its security advisories when the dependency is installed; do not use an 1.8 beta for the production foundation.

## Database model now added

- `user`, `session`, `account`, `verification`: authentication-compatible identity tables.
- `organization`: business tenant, profile, locale, branding, optional GST profile and enabled modules.
- `member`: user-to-organization membership, organization-specific role and active/suspended status.
- `invitation`: organization member invitations with role and expiry.
- `branch`: branch details, code, timezone and optional GPS/geofence coordinates.
- `audit_log`: organization-scoped actor/action/resource history.

The GST fields are profile metadata only. GST invoice calculations, return filing and statutory compliance are not implemented by this migration.

## Tenant access rules

1. The authenticated user ID must come from a verified server-side session, never from a request body, query string or browser local storage.
2. The requested Organization must be confirmed against an active membership before any tenant-scoped transaction begins.
3. `withTenantDbContext` performs that membership check, opens a database transaction and sets transaction-local PostgreSQL context values.
4. Row-level security is enabled and forced for `branch` and `audit_log`. Policies default to denying access when no organization context has been set.
5. Every future tenant-owned business table must receive the same RLS treatment and cross-tenant tests before its API is exposed.
6. The runtime database role must not own protected tables, be a PostgreSQL superuser or have `BYPASSRLS`. Use a separate migration/owner credential from the API runtime credential.
7. The API must authorize every read, insert, update, delete, export and background operation. UI hiding is not authorization.

The RLS context helper is only safe when its user ID comes from the authentication middleware. Do not expose it directly as an endpoint that accepts arbitrary user IDs.

## Environment and migrations

- `DATABASE_URL`: runtime database connection. Use a least-privilege non-owner role.
- `MIGRATION_DATABASE_URL`: migration/owner connection. Keep it in the server/deployment secret store; never expose it to the browser.
- `DB_POOL_MAX`: optional PostgreSQL connection pool size; defaults to 10.

Apply the checked-in migrations with:

```bash
pnpm --filter @workspace/db run migrate
```

Create a new Drizzle migration with:

```bash
pnpm --filter @workspace/db run generate
```

Do not use schema push or force-push against production. Review migration SQL and test on a disposable/staging database first.

## Deployment boundary

The current Netlify deployment serves the frontend. The Express API server and PostgreSQL database are not yet configured as production services. Authentication is not live yet. Do not turn on the sign-in UI or route business data to this schema until:
- Better Auth is installed and its lockfile is committed.
- API authentication routes are mounted before Express body parsers.
- Production trusted origins, secure cookies, rate limits and email verification are configured.
- The Node API is deployed with a stable HTTPS origin.
- PostgreSQL is provisioned with separate migration/runtime roles and backups.
- End-to-end auth, tenant isolation and session tests pass.

## Existing browser data

The active frontend still persists its prototype records in browser local storage. This phase does not delete, overwrite or silently migrate that data. A later import flow must:
- let the user export a backup first;
- show a preview of records and validation errors;
- import into the selected Organization only after confirmation;
- retain a source backup and provide a rollback path.

## Phase 2 remaining work

1. Install Better Auth and generate/check its Drizzle schema using the pinned stable release; commit the updated lockfile.
2. Configure Better Auth with email/password, email verification, secure cookie sessions and Organization plugin custom roles.
3. Mount `/api/auth/*splat` in Express before JSON body parsing, with exact trusted origins and credentialed CORS.
4. Add authenticated `/api/me`, organization creation/list/switching and membership endpoints. Validate session + membership server-side.
5. Add server-side branch APIs and audit events; make all tenant-scoped handlers call the tenant context wrapper.
6. Migrate business records to tenant-scoped PostgreSQL tables, with transactional sales/inventory writes and RLS on every tenant-owned table.
7. Add two-organization tests for guessed IDs, direct API calls, writes, exports and branch access.
8. Configure staging/production API hosting, database backups and restore verification before enabling multi-user use.

## Release gate

Phase 2 is not complete until a real authenticated user can create an Organization, invite a second member, switch between two Organizations, and prove through direct API/database tests that neither user can read or alter the other Organization's records. Data must persist across devices. Local browser storage alone does not meet this gate.
