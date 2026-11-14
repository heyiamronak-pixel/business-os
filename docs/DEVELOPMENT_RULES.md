# Business OS — Development Rules

These rules apply to every contributor and coding agent.

1. Inspect the current code before modifying it.
2. Never rebuild the application from scratch without an explicit, evidence-based reason and approval.
3. Preserve working functionality, domain models, and business calculations.
4. Do not add duplicate components, services, repositories, or calculation engines.
5. Do not invent business records or dashboard metrics.
6. Keep industry-specific workflows and calculations modular.
7. Never rely on UI-only permissions; enforce authorization in the backend and data layer.
8. Treat every organization as an independent security and billing boundary.
9. Do not introduce expensive external services without a clear business case and approval.
10. Do not attempt to implement every future feature in one task.
11. Build small, working vertical slices.
12. Run relevant tests, typecheck, and production build after significant changes.
13. Preserve mobile responsiveness and touch-friendly controls.
14. Create a rollback/checkpoint before major changes.
15. Explain what files changed and why.
16. Report unfinished work and blockers honestly.
17. Do not claim a feature is complete unless it has been tested.
18. Ask before destructive changes or changes that discard existing behavior.
19. Keep secrets out of source code and Git history. Use environment variables and deployment secret stores.
20. Validate organization membership and permissions for every server-side operation; never assume a browser-provided organization ID is trusted.
