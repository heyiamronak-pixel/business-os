# Business OS — Initial Architecture

## 1. Product and tenancy model

The product is a multi-tenant SaaS application.

Core entities (conceptual; exact schemas must be confirmed against the source code before implementation):

- **User**: a person who signs in.
- **Organization**: a separately operated and billed business.
- **Membership**: connects a user to an organization and carries that user's role and permissions in that organization.
- **Organization settings**: currency, timezone, industry, profile, branding, and enabled modules.
- **Subscription**: belongs to exactly one organization.
- **Usage and invoices**: measured and billed per organization.

A user can have memberships in several organizations. The active organization is a workspace context, not a security boundary by itself. The server must verify membership and permissions on every organization-scoped request.

## 2. Data isolation

Initial deployment should use a shared application and a shared managed PostgreSQL database rather than provisioning a server/database per customer.

Every tenant-owned record must be scoped to an organization, normally using a non-null `organization_id` column. Global records (for example, system-wide industry definitions) must be explicitly distinguished from tenant-owned records.

Security requirements:

- Derive the effective organization from authenticated, validated membership context.
- Never trust an arbitrary organization ID sent by the browser without checking membership and role.
- Enforce tenant boundaries in backend queries and, where PostgreSQL is used, database row-level security policies.
- Validate organization scope for inserts, updates, deletes, joins, exports, file storage, background jobs, notifications, and AI context retrieval.
- Use least-privilege database credentials and deny access by default.
- Test cross-tenant access attempts, including guessed IDs and direct API calls.

A client-side workspace selector improves usability but does not provide tenant security.

## 3. Roles and authorization

The product specification identifies Owner, Admin, Manager, and Employee roles, with the possibility of custom permissions.

Roles are organization-specific: a user may be an Owner in one organization and an Employee in another. Permissions should be checked server-side for every protected operation. UI visibility should follow those decisions but must not replace authorization.

## 4. Billing boundaries

Each organization has an independent subscription, invoice history, renewal date, payment status, plan, and usage record.

A billing issue in organization A must not automatically suspend organization B. Subscription checks should be performed against the organization whose resources are being accessed.

Do not add a payment provider until pricing, tax requirements, plan limits, cancellation, failed-payment behavior, and provider costs are agreed and documented.

## 5. Application structure

Prefer a modular monolith initially. Keep domain boundaries clear without introducing separate deployable services prematurely.

Logical layers:

- Screens and UI components
- Routing and navigation
- Domain models and validation
- Business calculation engines
- Application services/use cases
- Repository/data-access interfaces
- Persistence adapters
- State management
- Theme/design tokens
- Authentication and authorization

The project specification names React, Vite, TypeScript, and Zustand. Preserve the existing stack unless an audit demonstrates a concrete reason to change it. Avoid coupling business logic directly to localStorage; use repository/service abstractions so persistence can later move to a secure backend.

## 6. Industry modules

Industry configurations should determine relevant workflows and enabled modules. Initial target categories named in the project specification are Retail & Shops, Travel & Tourism, Hotels & Hospitality, Marketing & Digital Agencies, Manufacturing, E-commerce, and Service Businesses.

Do not assume all categories share identical business rules. Keep industry-specific calculations and workflows isolated behind appropriate domain boundaries.

## 7. AI and business intelligence

AI should receive only the authenticated user's authorized organization context and the minimum structured data needed for the requested task.

Insights should distinguish:
1. Actual facts from stored business records.
2. Calculations derived from those records.
3. Recommendations or hypotheses.

Do not invent missing inputs, metrics, or outcomes. The initial Advisor may use transparent rule-based insights before a paid LLM integration is considered.

## 8. Cost and scaling approach

Start with one shared app deployment and a low-cost managed database/hosting plan after comparing current provider limits and production requirements. Monitor database size, storage, traffic, background jobs, and query performance. Upgrade capacity when measured usage requires it; do not claim free-tier capacity is unlimited or suitable forever.

## 9. Decisions that remain open

- Final authentication provider and account recovery approach.
- Database provider, region, backup policy, and restore testing.
- Exact source-code router/bootstrap setup.
- Subscription plans, pricing, metering, taxes, and payment provider.
- Organization deletion/export/retention policy.
- Audit-log retention and access policy.
- Data import/migration strategy from the prototype.
