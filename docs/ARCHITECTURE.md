# Architecture

## Target direction (not yet implemented)
- Web: Next.js App Router, TypeScript, Tailwind, accessible responsive RTL-first UI.
- Data/Auth: Supabase PostgreSQL and Auth with Row Level Security; Storage only for user-approved documents.
- Server operations: Next.js server routes/actions for normal workflows; introduce a separate worker (e.g. FastAPI) only when a demonstrated workload requires it.
- AI: provider abstraction with BYOK first; optional platform fallback only when explicitly enabled with visible cost controls.
- Search/evidence: source registry, fetch/parse pipeline, normalized records, immutable evidence snapshots, deduplication, freshness and provenance.
- Exports: generate user-reviewed PDF/DOCX/XLSX reports.
- PWA/offline: later milestone; never store secrets or OAuth refresh tokens in browser storage.

## Core pipeline
1. Source registry identifies approved official domains and source types.
2. Fetcher retrieves public source material within rate and robots constraints.
3. Parser extracts candidate facts and retains source URL, timestamp, excerpt, and content fingerprint.
4. Normalizer maps facts into canonical program/scholarship records.
5. Deterministic rules calculate eligibility, deadlines, and funding completeness.
6. AI assists with summarization, semantic matching, and question answering over evidence.
7. User reviews, corrects, and approves records and any outbound action.

## Boundaries
- LLMs cannot determine final eligibility or override hard exclusions.
- UI never calls privileged database operations directly.
- All user-owned records are scoped to the authenticated owner.
- OAuth tokens and provider keys stay server-side and encrypted where persisted.
- Integrations are least-privilege and revocable.

## Data model (initial)
Profiles, preferences, sources, source_fetches, evidence_items, institutions, programs, scholarships, funding_components, eligibility_rules, evaluations, saved_opportunities, application_tasks, documents_metadata, contacts, audit_events.

Do not create every table up front. Add schema with the workflow that needs it and test RLS for every user-owned table.

## Deployment
Target Vercel for the web app and Supabase for managed backend. Choose regions based on actual latency, data residency, and free-tier constraints; verify current limits before committing to a design.
