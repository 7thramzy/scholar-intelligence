# Architecture decision records

## D-001 — Personal-first MVP
Build for one owner account first. Keep ownership boundaries clean, but defer multi-tenant SaaS, billing, team roles, and enterprise administration.

## D-002 — BYOK-first AI
Use provider adapters and user-supplied keys as the default. A platform-paid fallback is opt-in, budget-limited, and transparent. Never expose keys to the client.

## D-003 — Owner Console
Provide a private owner workspace, not a general super-admin console.

## D-004 — Evidence before AI
Official source evidence and deterministic code govern deadlines, eligibility, and funding completeness. AI may summarize and rank but cannot invent or override facts.

## D-005 — Explicit approval for side effects
Gmail/Drive access is read-oriented by default. Sending mail, submitting applications, or changing external accounts requires explicit approval for the exact action.

## D-006 — Full funding is total-cost coverage
Assess tuition, living, housing, insurance, travel, visa/residence, mandatory fees, and compulsory costs. Unknown or uncovered items prevent a confident full-funding label.

## D-007 — Defer heavyweight orchestration
Do not add CrewAI or a separate Python service without a concrete need. Keep orchestration simple and auditable; frameworks never own authorization.

## D-008 — Starter selection is a gate
Inspect candidate templates for security, maintenance, dependency health, lockfiles, tests, and compatibility before importing. No template is approved merely because it has a dashboard.
