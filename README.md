# Business OS

**One platform. Connected operations. Clear business intelligence. Better decisions.**

Business OS is a multi-industry business management and business intelligence SaaS platform. It helps owners connect daily operations, understand performance, identify problems, and decide what to do next.

## Product model

- One application serves multiple businesses (organizations/workspaces).
- A user may own or participate in more than one business.
- Each organization has independent data, members, roles, settings, enabled modules, subscription, billing status, and usage.
- A failed payment or suspended subscription for one organization must not affect another organization the same user operates.
- Start with shared infrastructure and a tenant-aware data model; scale infrastructure when real usage justifies it.

## Product principles

1. Business dashboards must be based on actual business data. Never invent metrics or sample performance figures in production.
2. Preserve existing domain models and calculations when the original source code is brought into this repository.
3. Industry workflows must be modular; do not force unrelated business types into one set of calculations.
4. Authorization must be enforced by the backend/data layer, not merely by hiding UI controls.
5. Build and test small working slices. Avoid a premature microservices architecture and unnecessary paid integrations.

## Planned capability areas

Business onboarding and workspace switching; owner dashboard; products and inventory; POS and sales; customers; expenses and revenue targets; marketing analytics; tasks and team permissions; reports; Action Center; data-grounded AI Business Advisor; industry-specific modules.

## Technical direction

The existing project specification identifies React, Vite, TypeScript, a modular application architecture, Zustand state management, repository/service abstractions, and a later PostgreSQL/Supabase data layer. These are intended directions, not confirmation that the original source has been imported or that any particular implementation is already working.

See:
- [Architecture](docs/ARCHITECTURE.md)
- [Development roadmap](docs/ROADMAP.md)
- [Development rules](docs/DEVELOPMENT_RULES.md)

## Current repository status

This repository currently contains project documentation only. The original Business OS source ZIP has not yet been added, so no application code, dependencies, build, or runtime behavior has been audited or verified.

## First development milestone

Import and inspect the canonical source ZIP, compare it with any active prototype, preserve working functionality, then stabilize the existing app before introducing multi-tenant authentication and persistence.
