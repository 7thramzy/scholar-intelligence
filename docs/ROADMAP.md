# Roadmap

## Phase 0 — Foundation (current)
- Repository instructions, product context, architecture, security, decisions, domain model, roadmap, status.
- Confirm branch protection and PR workflow.
- Select starter only after security and maintenance review.

## Phase 1 — Engineering baseline
- Import/create Next.js TypeScript app with lockfile.
- Configure lint, typecheck, unit tests, CI, formatting, environment validation.
- Establish design tokens, RTL, accessible layout, error handling.
- Verify production build.

## Phase 2 — Identity and data security
- Supabase project/configuration and migrations.
- Auth, owner profile, RLS policies, storage boundaries.
- Automated tests proving cross-user isolation and unauthenticated denial.

## Phase 3 — Opportunity core
- Source registry and evidence model.
- Program/scholarship normalization.
- Deterministic eligibility, deadline, and full-funding evaluators.
- Opportunity search, detail, save, compare.

## Phase 4 — Personal workflow
- Applicant profile and preferences with user confirmation.
- Tasks, documents metadata, contacts, reminders, audit trail.
- Evidence-backed exports.

## Phase 5 — AI and integrations
- BYOK provider abstraction, retrieval over approved evidence, usage limits.
- Gmail/Drive OAuth with minimum scopes and explicit user consent.
- AI-assisted drafting with user approval; no autonomous sending/submission.

## Phase 6 — Reliability and PWA
- Observability without sensitive payloads, backup/restore, rate limits.
- Offline read-only cache where safe, PWA installability, accessibility and performance audit.

Each phase requires acceptance criteria and verified tests before moving on. Reorder only when a dependency or measured risk justifies it.
