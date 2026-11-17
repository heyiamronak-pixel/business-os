# Business Sutra — Consolidated Product Requirements & Acceptance Backlog

Last consolidated: 17 November 2026

This is the single product checklist for requirements discussed in the Business OS / Business Sutra master specification and follow-up development conversations. Preserve existing working code and the current visual direction. Do not rebuild the app from scratch.

## Product promise

Business Sutra is a multi-industry business operating system—not only a dashboard, CRM or accounting screen. It must connect day-to-day operations, use real workspace records to explain performance, identify problems and guide the owner toward the next useful action.

**Core rule:** one connected data model, accurate calculations, secure business boundaries, useful actions and honest reporting. Never create fake transactions, fake dashboard values or pretend an unfinished feature is live.

## Confirmed product and UX decisions

- Complete the local product experience before connecting paid or third-party services.
- Keep the current React + Vite + TypeScript application and active TanStack Router entry point. Do not reintroduce the legacy Wouter screens as a second active app.
- Preserve the existing Business Sutra styling, design tokens, responsive layout and tasteful motion. The product should feel like a polished application, not a marketing landing page.
- Keep a five-item mobile navigation pattern: Home, Sales, Tasks, Reports and More. More contains enabled modules, AI Advisor, Action Center, notifications, attendance and settings.
- A floating Sutra AI assistant should be available across the app, draggable, position-persistent and aware of the screen/module context.
- Common list interactions should become consistent: search, sort, filters, date range, status, assignee/owner, branch, amount range, grouping, export and saved views. Saved views should support personal and shared visibility once authenticated team access exists.
- Keep all action buttons meaningful. Use an explicit confirmation before any AI-suggested edit changes saved records.
- Avoid large empty hero areas, excessive blank space, poor mobile layouts and dead-end empty states. Empty states should guide the user to the next action.
- Do not add real payment processing or third-party integrations during the product-build stage.

## 1. Business setup, workspaces and branding

- [x] Business setup flow exists: business name, industry, type, country, currency, timezone and contact details.
- [x] Logo upload and automatic dominant-colour extraction exist.
- [x] Theme presets and light/dark/auto appearance exist.
- [ ] Complete the profile fields and validation for description, website, address, city, state, postal code and tax identity.
- [ ] Verify the accessible palette roles (primary, secondary, accent, surface, background, text, muted text and border) are consistent across all controls, charts, alerts and navigation.
- [ ] Enable/disable/reorder modules without silently restoring a module the user intentionally disabled.
- [x] Add local branch records, create/delete UI, default branch migration, team branch assignment and plan-cap enforcement.
- [ ] Extend branch ownership into every transaction, stock record, attendance entry, report and server permission scope.
- [ ] Complete multi-business switching and workspace-level export/delete/retention flows.

## 2. Owner dashboard / Business Cockpit

Show real, business-scoped figures and let every metric drill into the records behind it:
- Revenue, expenses, gross profit, net profit and profit margin.
- Cash collected, receivables and payables.
- Sales/orders, average order value and sales pace.
- Target progress, amount remaining, daily/weekly run-rate and projection.
- Product performance, inventory value, low/out-of-stock products and reorder needs.
- Pending, due-today, upcoming and overdue tasks.
- Leads, pipeline value and follow-ups.
- Marketing spend, leads, acquisition, conversion, CAC and ROAS.
- Business health and explainable alerts.

Acceptance: totals must reconcile with source records and selected date range. Distinguish accounting profit from cash flow. Empty data must show an empty state, not fabricated sample numbers.

## 3. Product catalogue and inventory

- [x] Product create/edit, SKU generation, category, price, unit and opening stock are present.
- [x] Stock movements and low-stock/out-of-stock alerts are present.
- [ ] Complete archive/restore and safe deletion rules for records with transaction history.
- [ ] Add barcode/QR generation and camera/device scanning.
- [ ] Add reason-required stock adjustments, stock-in/out, transfers between branches and movement audit history.
- [ ] Add reorder levels, supplier-based reorder recommendations and inventory valuation.
- [ ] Track listed price, negotiated price, discount and actual selling price separately.
- [ ] Verify all stock calculations against sales, purchases, returns and reversals.

## 4. POS, sales and payments

- [x] Cart and multi-item sale workflows exist.
- [x] Sale records reduce stock and update workspace sales/revenue calculations.
- [x] Partial sale payment collection exists.
- [ ] Complete barcode scan, customer lookup, quantity changes, discounts and checkout validation.
- [ ] Add payment collection history with method, transaction reference and date.
- [ ] Add sale edit/reversal with stock and customer-history reconciliation.
- [ ] Add returns, refunds, exchange and credit-note workflows with original transaction references.
- [ ] Ensure a reversed or returned transaction cannot remain counted as normal revenue/profit.
- [ ] Add printable sales receipts and clear payment status.

## 5. Customers and leads / CRM

- [x] Customer records, sales linkage and customer history foundations exist.
- [x] A Leads pipeline branch adds stages (new, contacted, qualified, proposal, won, lost), value, assignee, expected close date, follow-up, notes, search and CSV export.
- [x] Lead-to-customer conversion and follow-up alerts are included in the integration branch.
- [ ] Complete customer profile metrics: order count, total spending, last purchase, segments and notes.
- [ ] Add customer follow-up reminders, repeat-purchase and reactivation segments.
- [ ] Add lead import/deduplication and configurable sources.
- [ ] Add CRM activity timeline and follow-up history.
- [ ] Add clients/accounts, proposals and service/project linkage for agencies.

## 6. Suppliers and purchases

- [x] Supplier directory and purchase-record foundations exist.
- [x] Purchase receipts update stock and purchase balances.
- [ ] Complete purchase order → goods receipt → supplier bill → payment workflow.
- [ ] Add supplier payment history, due dates, attachments and payables reporting.
- [ ] Support purchase returns and stock reconciliation.
- [ ] Prevent duplicate stock-in when a purchase receipt has already updated inventory.

## 7. Expenses, finance and targets

- [x] Expense entry and standard expense categories exist.
- [x] Monthly/quarterly/annual targets and actual revenue pace calculations exist.
- [ ] Add expense edit/archive, payment method, receipt attachment and recurring expenses.
- [ ] Add budgets, category-level budget tracking and approval flow.
- [ ] Add cashbook, receivables/payables, cash flow and ledger views.
- [ ] Keep cash movement separate from recognised revenue/profit.
- [ ] Add forecast, period comparison, target variance and scenario views based on actual records.

## 8. Tasks and work management

- [x] Task list, assignment, due date, reminder, status and priority foundations exist.
- [x] Current integration adds daily/weekly/monthly recurrence, task comments and status history.
- [ ] Support urgent priority consistently in UI, filters, alerts and reports.
- [ ] Add reusable task templates, subtasks/checklists, attachments and calendar view.
- [ ] Ensure recurring task completion generates exactly one next occurrence and retains series history.
- [ ] Add in-app reminders/notifications and overdue/due-today/upcoming views.
- [ ] Add team workload and task completion reports.

## 9. Team, permissions and attendance

- [x] Local team directory and Owner/Admin/Manager/Employee role labels exist.
- [x] Local GPS geofence + selfie attendance prototype exists.
- [ ] Add real invite/accept flow, employee profiles, active/inactive status and multi-business memberships.
- [ ] Add custom permission matrix by module and action (view/create/edit/delete/export/approve).
- [ ] Enforce every permission on the server/data layer; hiding a button is not security.
- [ ] Restrict employee visibility of profit, salary expenses and owner settings according to permission.
- [ ] Add branch assignment, departments, leave requests, shift/working hours, attendance corrections and approvals.
- [ ] Store attendance against authenticated user and branch, not only a free-text employee name in this browser.
- [ ] Add timesheets and staff productivity reporting.

## 10. Marketing analytics

- [x] Manual campaign inputs and core spend/click/lead/customer/revenue calculations exist.
- [ ] Add reach, impressions, campaign breakdowns, source-level lead quality, CPL, CPC, CAC, conversion rate and ROAS validation.
- [ ] Link leads/customers and revenue to campaign/source attribution where available.
- [ ] Add budget pacing and campaign-level comparisons.
- [ ] Add AI-assisted campaign analysis and editable copy drafts, with human approval.
- [ ] Meta Ads, Google Ads and Google Analytics connections remain deferred until product acceptance.

## 11. Reports and saved views

- [x] Date-filtered business reports, CSV export, report filters and locally saved report views exist.
- [ ] Add branch/team/assignee filters and previous-period comparisons.
- [ ] Add profit & loss, cash flow, receivables/payables, inventory valuation, customer cohorts, product profitability, marketing funnel and staff productivity.
- [ ] Add drill-downs from chart/KPI to source records.
- [ ] Add PDF/print-ready report exports and reusable report templates.
- [ ] Extend the common filter/saved-view pattern beyond Reports to all major list modules.

## 12. Invoices, quotations and credit notes

- [x] Invoice builder, templates, seller/customer details and line-item/tax calculation foundations exist.
- [x] Current integration adds payment history, outstanding balance, payment references and reason-required cancellation.
- [ ] Complete sequential invoice numbering, due-date/overdue state, print/PDF output and customer billing history.
- [ ] Add quotation/estimate creation, share/print, accept/convert-to-invoice and expiry status.
- [ ] Add credit notes and invoice adjustment/reversal links.
- [ ] Verify GSTIN/state/place-of-supply/tax calculations and configurable rates against current statutory requirements before any claim of tax compliance.
- [ ] Never describe a manual payment record as a processed payment or a cancellation as a refund.

## 13. Industry-specific modules

The app must recommend the relevant modules for the chosen industry and keep each workflow specialised rather than forcing identical calculations everywhere.

### Retail & shops
- [ ] POS, stock transfers, barcode workflows, suppliers, purchase orders, returns and reorder workflow.

### Travel & tourism
- [ ] Bookings, customers, trip itineraries, departures, vehicles, drivers, fuel logs, maintenance, vendor costs and trip profitability.

### Hotels & hospitality
- [ ] Properties, room types/inventory, rates, availability, reservations, guests, check-in/check-out, housekeeping, OTA/channel performance and occupancy/ADR/RevPAR-style reporting.

### Marketing & service agencies
- [ ] Leads, clients, services/catalogue, proposals, projects, deliverables, tasks, timesheets, retainers, invoices and project profitability.

### Manufacturing
- [ ] Raw materials, bills of materials, suppliers, production runs, work orders, quality checks, wastage and finished-goods stock.

### E-commerce
- [ ] Orders, fulfilment, shipment tracking, returns, refunds, inventory and channel performance.

### Later industry packs
- [ ] Restaurants: menu, tables, reservations, kitchen tickets and service workflow.
- [ ] Logistics: shipments, fleet, drivers, fuel and maintenance.
- [ ] Construction: projects, sites, jobs, materials and progress billing.
- [ ] General businesses: custom fields, documents, approvals, calendar and asset register.

## 14. AI, Action Center and contextual actions

- [x] Local rules-based Advisor and data-grounded Action Center foundations exist.
- [x] Draggable/persistent floating assistant exists.
- [x] Lead form has a local quick-assist suggestion/draft.
- [ ] Add contextual AI entry points in sales, products, inventory, expenses, marketing, reports, tasks and customer/lead records.
- [ ] Provide data-backed explanations with source figures and separate Facts, Calculations and Recommendations.
- [ ] Add drafts for follow-up messages, campaign copy, summaries, reports and business plans.
- [ ] Add action previews and explicit user confirmation before writing any proposed changes.
- [ ] Keep the rules-based local assistant useful without an external model. Real LLM/API provider, provider cost controls and usage metering remain deferred.
- [ ] Do not send one business's data to another user's AI context; enforce business/role scope.

## 15. Notifications, audit and activity

- [x] In-app notifications and Action Center rules exist for key stock, task, target, payment and follow-up conditions.
- [ ] Add upcoming deadlines, margin drops, stale leads and approval-needed notifications.
- [ ] Add notification preferences and mark-read/archive actions.
- [ ] Add an audit log with actor, action, timestamp, record, previous value and new value.
- [ ] Make audit history tamper-resistant in the eventual backend.

## 16. Data, imports and exports

- [x] Local workspace persistence and JSON backup/restore foundations exist.
- [ ] Complete CSV imports with preview, column mapping, validation, duplicate handling and rollback.
- [x] Add CSV export for products, inventory, customers, sales and expenses.
- [ ] Extend CSV export to purchases, suppliers, tasks, leads and invoices; add validated CSV import workflows.
- [ ] Add sample workspace as an explicitly opt-in demo, never mix demo records into real workspaces.
- [ ] Add safe reset and restore flows with confirmation and backup.
- [ ] Test persistence/migrations for old browser records, including new leads, tasks, invoice payments and subscription metadata.

## 17. SaaS plans and workspace limits

Current plan definitions and local entitlement preview (not paid billing):
- Starter: ₹699/month or ₹6,990/year; maximum 2 team members and 1 branch.
- Growth: ₹1,999/month or ₹19,990/year; maximum 5 team members and 3 branches.
- [x] Plan cards, monthly/annual pricing, plan comparison and local selection history.
- [x] Enforce user-seat and branch caps in service methods and show usage in Settings/Team.
- [x] Active Growth trial receives Growth access; expired trial falls back to Starter until a plan is selected.
- [x] Growth-only advanced reports, saved views and team workload insights are gated in the UI.
- [x] Block downgrades that exceed the target plan's current user or branch limits; retain existing records.
- [x] Add tests for feature entitlements, trial expiry, user seats and branch caps.
- [ ] Enforce all entitlements using authenticated server-side authorization after the cloud backend is connected.
- [ ] Add per-record transaction, storage and usage metering only after limits are agreed; no arbitrary product/customer/invoice quotas are currently imposed.
- [ ] Payment gateway, renewals, tax invoices and subscription webhooks remain deferred.

## 18. Security, authentication and integrations (later stage)

- [ ] Passwordless mobile/email OTP, account recovery and verified sessions.
- [ ] Organization/business scoped backend, secure server authorization and cloud persistence.
- [ ] Multi-user real-time sync and cross-device access.
- [ ] API audit, rate limits, input validation, tenant isolation, backups, restore drills and security review.
- [ ] Payment gateway and billing provider.
- [ ] WhatsApp, SMS, email, calendar, Meta Ads, Google Ads/Analytics, OTA/channel managers and accounting/GST providers.
- [ ] External LLM/AI API only after model, data privacy, cost and access boundaries are agreed.

## 19. UI quality, mobile and release acceptance

- [ ] Test at 360px, 390px, 430px and wide desktop layouts.
- [ ] Test keyboard navigation, focus state, contrast, accessible names and touch target sizes.
- [ ] Provide consistent loading, empty, validation, error, success and destructive-confirmation states.
- [ ] Add subtle transitions and motion while respecting reduced-motion preferences.
- [ ] Add route smoke tests and end-to-end workflows for onboarding → product → purchase → stock → sale → payment → customer → invoice → report.
- [ ] Test tenant/business isolation, permission denial, data migrations and backup/restore.
- [ ] Run typecheck, unit/integration tests and a fresh production build on the integrated branch before calling the product build complete.
- [ ] Keep production/main separate until the acceptance checklist passes.

## Implementation status vocabulary

- **Present**: code is in the active product branch; it still needs acceptance testing before release.
- **In progress**: code exists on the dedicated integration branch but is not yet merged or fully verified.
- **Backlog**: requirements captured here but not yet implemented.
- **Deferred**: external connection intentionally waits until the product is built and accepted.

Never change a status to complete based on a screen existing alone. It must work end-to-end and have relevant tests.
