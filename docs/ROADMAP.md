# Business Sutra — Product-first development roadmap

## Delivery rule

Build the complete product experience before connecting external services. The app must be useful and testable with its own workspace data first. Supabase/Auth, CRM, payment gateways, WhatsApp, email, accounting, and third-party AI providers are deliberately deferred until the product build and acceptance checks are complete.

## Stage 0 — Stabilise the active workspace app

- [x] Keep the active React/Vite/TanStack Router application entry point (`artifacts/business-os/src/main.tsx` → `router.tsx` → `routeTree.gen.ts`) stable. Do not reintroduce the legacy Wouter shell as a second active application.
- [x] Keep the existing workspace store and local persistence as the development data layer.
- [x] Expose the current workspace screens: overview, sales, products, inventory, suppliers, purchases, customers, expenses, targets, tasks, team, marketing, attendance, reports, Action Center, settings, and Advisor.
- [x] Add a dedicated reports route and CSV export.
- [x] Expose GPS/selfie attendance in the workspace.
- [x] Add contextual AI guidance to Action Center.

## Stage 1 — Finish universal business workflows

- [ ] Complete end-to-end create, view, edit, archive, delete, search, sort, filter, and export behaviour for every core record.
- [ ] Complete sales checkout, discounts, partial payments, payment collection, refunds/reversals, and stock reconciliation.
- [ ] Complete product catalogue, SKU/barcode, inventory adjustment, stock transfer, supplier and purchase workflows. Initial supplier/purchase CRUD, stock-in receipt and payment-balance tracking are implemented.
- [ ] Complete customer profiles, notes, history, segmentation, and follow-ups.
- [ ] Complete expenses, categories, recurring expense UX, budgets, and approvals.
- [ ] Complete revenue targets, period comparisons, forecasting, and variance views.
- [ ] Complete tasks, reminders, assignments, recurring tasks, comments, and status history.
- [ ] Complete team directory, authenticated roles, branch assignment, leave and attendance management. Local team directory and GPS/selfie attendance prototype exist; neither provides secure shared employee access.
- [ ] Complete invoice/quotation creation, PDF/print layout, taxes, payment status, and credit notes using editable local data. A non-tax sales receipt can be printed; GST tax calculation and compliant invoice numbering are not implemented.

## Stage 2 — Complete industry modules

Build real workflows, not placeholder tiles, for:
- Retail and POS: suppliers, purchase orders, stock transfers, returns, barcode workflows.
- Hospitality: properties, rooms, rates, reservations, guests, housekeeping, OTA performance.
- Travel and tourism: leads, bookings, itineraries, vehicles, drivers, trips, fuel, maintenance.
- Agencies and services: leads, clients, projects, service catalogue, timesheets, proposals, invoices.
- Manufacturing: raw materials, suppliers, bills of materials, production runs, quality checks, finished goods.
- E-commerce: orders, fulfilment, shipments, returns, refunds, channel performance.
- General business: branches, approvals, documents, calendar, assets, and custom fields.

## Stage 3 — AI across the product

- [x] Provide a local question-and-answer Advisor, data-grounded recommendations, and contextual Action Center guidance. This is transparent rules-based intelligence, not an external generative AI model.
- [ ] Add AI actions to sales, inventory, expenses, marketing, reports, tasks, and customer records.
- [ ] Add explainable recommendations with the source figures shown alongside each suggestion.
- [ ] Add draft generation for follow-up messages, campaign copy, reports, and business plans.
- [ ] Add user confirmation before any AI-proposed change is written to business records.
- [ ] Add AI provider abstraction, privacy controls, usage limits, and cost visibility only after the product workflows are stable.

## Stage 4 — Complete reports and management tools

- [x] Initial date-filtered financial and marketing report with CSV export. Campaign data is entered manually and is not synced from ad platforms.
- [ ] Add date-range filters, branch and team filters, comparisons, drill-downs, and scheduled report layouts.
- [ ] Add cash flow, receivables/payables, profit and loss, inventory valuation, customer cohort, campaign and staff productivity reports.
- [ ] Add PDF/print-ready report and invoice exports.

## Stage 5 — Product quality and release readiness

- [ ] Desktop-first wide workspace layouts and purpose-built compact mobile layouts.
- [ ] Accessibility, keyboard support, loading, empty, validation, error, and confirmation states.
- [ ] Consistent permissions and audit-friendly activity history across all modules.
- [ ] Import/export, sample workspace, onboarding checklist, and safe reset controls. JSON backup export and preview-before-restore with pre-restore backup are implemented; a sample workspace and safe reset flow remain outstanding.
- [ ] Unit, integration, workflow, and browser regression tests for all major actions.
- [ ] Performance, security, privacy, backup, restore, and release checks.

## Stage 6 — External connections (last)

Only after Stages 1–5 are accepted:
- Authentication, hosted database, multi-user sync, and cross-device persistence.
- Payment gateways, accounting, GST/e-invoice providers.
- CRM, WhatsApp, email, SMS, calendars, OTA and advertising platforms.
- Hosted AI model provider and other external APIs.

## Current implementation notes

- Product-first UI development is being integrated on `codex/integrated-development-completion`, based on `development/phase-completion`. The integration branch is not yet validated or merged.
- Local workspace persistence remains the active product data layer during this build.
- The PostgreSQL tenant schema/API foundation is separate groundwork; the active Wouter frontend still uses local browser storage and has not been switched to cloud persistence.
- Do not merge or publish unfinished work to the production branch merely to make intermediate screens visible.
- A module is complete only after its main user actions work end-to-end and are covered by tests.
