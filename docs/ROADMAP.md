# Roadmap

## Phase 0 — Foundation (complete)
- Repository instructions, product context, architecture, security, decisions, domain model, roadmap, status.
- Confirm branch protection and PR workflow.
- Select starter only after security and maintenance review. (completed: rejected unsafe template; see docs/STARTER_AUDIT.md)

## Phase 1 — Engineering baseline (substantially complete)
- Import/create Next.js TypeScript app with lockfile.
- Configure lint, typecheck, CI, and environment placeholder. (completed)
- Add unit tests for deterministic business rules. (completed)
- Add formatting enforcement and environment validation. (remaining)
- Establish design tokens, RTL, accessible layout, error handling.
- Verify production build. (completed in GitHub Actions; Vercel production deployment pending final READY check)

## Phase 2 — Identity and data security (not started)
- Supabase project/configuration and migrations.
- Auth, owner profile, RLS policies, storage boundaries.
- Automated tests proving cross-user isolation and unauthenticated denial.

## Phase 3 — Opportunity core (partially started)
- Deterministic eligibility and full-funding evaluators with unit tests. (completed; see lib/eligibility.ts and lib/funding.ts)
- Curated official source registry and strict HTTPS domain classification. (implemented locally; see lib/source-registry.ts)
- Append-only manual evidence snapshots with SHA-256 fingerprints and source metadata. (implemented locally; see lib/evidence.ts and /evidence)
- Constrained server-side HTML/text fetcher with HTTPS source allowlist, redirect validation, robots.txt checks, timeout and response-size limits. (implemented; persistence and durable throttling remain)
- Immutable server-side fetch history, parser provenance, and freshness checks. (remaining)
- Program/scholarship normalization. (remaining)
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
