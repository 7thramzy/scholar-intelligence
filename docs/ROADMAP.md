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
- Local fetch history with raw-content fingerprints and changed/unchanged detection, included in backups. (implemented)
- Immutable server-side fetch history, parser provenance, scheduled freshness checks, and durable throttling. (remaining)
- Program/scholarship normalization. (remaining)
- Deterministic eligibility and total-cost funding evaluators with UI wiring and evidence review gates. (implemented)
- Deadline state evaluator and program/scholarship normalization. (remaining)
- Opportunity add/edit/save and safe local export/import with integrity verification. (implemented)
- Side-by-side comparison of up to four opportunities with evidence and source freshness metadata. (implemented)
- Deterministic deadline status (closed, closing soon, upcoming, unknown). (implemented)
- Automated opportunity search/discovery, detailed opportunity records, and persisted comparisons. (remaining)

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


### Source extraction milestone (implemented; merged in PR #16)
- Deterministic parser with shared labelled-fact rules and source-specific profiles for the eight curated portals.
- Candidate fields cover deadlines, funding cost categories, eligibility, language, duration, and intake.
- ISO date and explicit-currency amount normalization only; ambiguous values remain raw.
- Every candidate includes the source excerpt, confidence hint, parser version, and needs-review state.
- Evidence UI allows selecting a candidate into the manual evidence form; nothing is saved automatically.
- Remaining: broaden official-source fixtures, improve multilingual layouts, add parser regression fixtures from reviewed real pages, and evaluate extraction precision before claiming production coverage.


### Parser QA and normalization (feature branch: test/official-source-parser-fixtures)
- Added short, reviewed official-page regression excerpts for all eight curated source IDs.
- Expanded source-specific patterns for MEXT stipend/age eligibility, Chevening post-degree work-experience wording, DAAD scholarship-payment wording, and Campus France grant components.
- Added explicit JPY and currency-word parsing, typed currency ranges, and validation for malformed amounts and reversed ranges.
- UI renders a range as a range; no midpoint or single-value estimate is inferred.
- Remaining: run CI, review failures, merge only on green CI, and continue collecting page-layout fixtures (tables, PDFs, multilingual pages) before claiming broad recall.
