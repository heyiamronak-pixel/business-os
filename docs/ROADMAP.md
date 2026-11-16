# Business Sutra — Product-first development roadmap

## Delivery rule

Build the complete product experience before connecting external services. The app must be useful and testable with its own workspace data first. Supabase/Auth, CRM, payment gateways, WhatsApp, email, accounting, and third-party AI providers are deliberately deferred until the product build and acceptance checks are complete.

## Stage 0 — Activate the intended workspace app

- [x] Activate the TanStack workspace experience as the application entry point.
- [x] Keep the existing workspace store and local persistence as the development data layer.
- [x] Expose the main workspace screens: overview, sell, sales, products, inventory, customers, expenses, targets, tasks, team, marketing, inbox, settings, and advisor.
- [x] Add a dedicated reports route and CSV export.
- [x] Expose GPS/selfie attendance in the workspace.
- [x] Add contextual AI guidance to Action Center.

## Stage 1 — Finish universal business workflows

- [ ] Complete end-to-end create, view, edit, archive, delete, search, sort, filter, and export behaviour for every core record.
- [ ] Complete sales checkout, discounts, partial payments, payment collection, refunds/reversals, and stock reconciliation.
- [ ] Complete product catalogue, SKU/barcode, inventory adjustment, stock transfer, supplier, and purchase workflows.
- [ ] Complete customer profiles, notes, history, segmentation, and follow-ups.
- [ ] Complete expenses, categories, recurring expense UX, budgets, and approvals.
- [ ] Complete revenue targets, period comparisons, forecasting, and variance views.
- [ ] Complete tasks, reminders, assignments, recurring tasks, comments, and status history.
- [ ] Complete team directory, roles, branch assignment, leave and attendance management.
- [ ] Complete invoice/quotation creation, PDF/print layout, taxes, payment status, and credit notes using editable local data.

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

- [x] Provide a data-grounded rule-based advisor and contextual Action Center guidance.
- [ ] Add AI actions to sales, inventory, expenses, marketing, reports, tasks, and customer records.
- [ ] Add explainable recommendations with the source figures shown alongside each suggestion.
- [ ] Add draft generation for follow-up messages, campaign copy, reports, and business plans.
- [ ] Add user confirmation before any AI-proposed change is written to business records.
- [ ] Add AI provider abstraction, privacy controls, usage limits, and cost visibility only after the product workflows are stable.

## Stage 4 — Complete reports and management tools

- [x] Initial financial and marketing report with CSV export.
- [ ] Add date-range filters, branch and team filters, comparisons, drill-downs, and scheduled report layouts.
- [ ] Add cash flow, receivables/payables, profit and loss, inventory valuation, customer cohort, campaign and staff productivity reports.
- [ ] Add PDF/print-ready report and invoice exports.

## Stage 5 — Product quality and release readiness

- [ ] Desktop-first wide workspace layouts and purpose-built compact mobile layouts.
- [ ] Accessibility, keyboard support, loading, empty, validation, error, and confirmation states.
- [ ] Consistent permissions and audit-friendly activity history across all modules.
- [ ] Import/export, sample workspace, onboarding checklist, and safe reset controls.
- [ ] Unit, integration, workflow, and browser regression tests for all major actions.
- [ ] Performance, security, privacy, backup, restore, and release checks.

## Stage 6 — External connections (last)

Only after Stages 1–5 are accepted:
- Authentication, hosted database, multi-user sync, and cross-device persistence.
- Payment gateways, accounting, GST/e-invoice providers.
- CRM, WhatsApp, email, SMS, calendars, OTA and advertising platforms.
- Hosted AI model provider and other external APIs.

## Current implementation notes

- The product UI and workflows are being developed on `phase-2/data-foundation`.
- Local workspace persistence remains the active product data layer during this build.
- The PostgreSQL tenant schema/API foundation is separate groundwork; it is not yet connected to the frontend.
- Do not merge or publish unfinished work to the production branch merely to make intermediate screens visible.
- A module is complete only after its main user actions work end-to-end and are covered by tests.
