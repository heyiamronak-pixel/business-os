# Phase 2 — Supabase and API setup

This is the deployment runbook for the Phase 2 backend. It is intentionally separate from the application code so that database passwords and provider keys are never committed.

## Selected default

- Supabase Auth for verified sign-in identities.
- Supabase-hosted PostgreSQL as the system of record.
- The Express API server is the only application component that connects to PostgreSQL.
- The browser receives only the Supabase publishable/anon key and a short-lived user access token. It never receives a database URL or database password.

## 1. Create the Supabase project

Create a new Supabase project for Business Sutra. Enable the email sign-in method in Authentication settings and add the eventual frontend URL to the allowed redirect URLs.

From the project dashboard, note:
- Project URL.
- Publishable/anon key.
- Database connection details.

Do not use the Supabase service-role key in the browser. This API currently validates access tokens by calling Supabase Auth's `/auth/v1/user` endpoint with the anon key.

## 2. Apply the database migration

Use the Supabase SQL Editor on a new project and run:

`lib/db/migrations/0001_business_tenant_foundation.sql`

The migration creates the schema, row-level security policies, and the non-login group role `business_sutra_runtime`.

Do not apply this initial migration over an existing Business Sutra production database without a separate schema and backup review.

## 3. Create a login role for the API

Run the following as the database owner in the SQL Editor. Replace the password with a newly generated strong password; never commit it.

```sql
CREATE ROLE business_sutra_api LOGIN INHERIT PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT business_sutra_runtime TO business_sutra_api;
```

The API must connect as `business_sutra_api`, not as `postgres`, a table owner, or a `BYPASSRLS` role. The login role inherits the restricted grants and RLS policies from `business_sutra_runtime`.

## 4. Configure the API hosting environment

After deploying `artifacts/api-server` to a Node.js hosting service, add these environment variables in that service's dashboard:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Port required by the hosting provider |
| `DATABASE_URL` | PostgreSQL connection URI using `business_sutra_api` |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `CORS_ORIGINS` | `https://businessoperatingsystembyronak.netlify.app` |

Use the provider's SSL-enabled PostgreSQL connection URI. Keep the database password only in the hosting environment. Do not use the database owner's URI in the API.

## 5. Deployment and release gates

Before enabling sign-in or moving existing user data:
1. Verify `/api/healthz` on the deployed API.
2. Verify authenticated `GET /api/v1/me`, `GET /api/v1/businesses`, and business creation against the provisioned Supabase project.
3. Verify a user from one business cannot read or change another business's branches or records.
4. Complete the frontend sign-in and API repository integration.
5. Export the existing browser `business-os-state-v2` data, preview and validate the import, create a backup, and test rollback before any cloud write.
6. Confirm the legacy localStorage data remains intact until the user accepts the cloud migration.

## Current implementation boundary

The repository contains the Supabase token verifier, database identity sync function, transaction-local tenant context, business/branch routes and CI tests. The external Supabase project and API host have not been provisioned from this repository. The active frontend still uses localStorage; sign-in and cloud data migration are not enabled. Do not treat this runbook or a passing build as proof of a live deployment.
