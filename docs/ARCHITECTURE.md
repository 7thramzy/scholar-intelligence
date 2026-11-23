# Architecture

## Target direction (not yet implemented)
- Web: Next.js App Router, TypeScript, Tailwind, accessible responsive RTL-first UI.
- Data/Auth: Supabase PostgreSQL and Auth with Row Level Security; Storage only for user-approved documents.
- Server operations: Next.js server routes/actions for normal workflows; introduce a separate worker (e.g. FastAPI) only when a demonstrated workload requires it.
- AI: provider abstraction with BYOK first; optional platform fallback only when explicitly enabled with visible cost controls.
- Search/evidence: source registry, fetch/parse pipeline, normalized records, immutable evidence snapshots, deduplication, freshness and provenance.
- Exports: generate user-reviewed PDF/DOCX/XLSX reports.
- PWA/offline: later milestone; never store secrets or OAuth refresh tokens in browser storage.

## Current implementation status
- Curated source-domain registry exists in `lib/source-registry.ts`.
- `/evidence` records user-provided excerpts against locally saved opportunities from any HTTPS URL. Records include source URL, fact type, capture time, registered/unregistered source classification, schema version, and SHA-256 fingerprint.
- Manual evidence from an unregistered domain remains unverified. Funding confirmation gates only accept evidence from the curated registry; unregistered excerpts can be retained for preliminary eligibility review with an explicit warning.
- `POST /api/source-fetch` can retrieve HTML/text from the curated registry only, after robots.txt checks and redirect revalidation. It caps response bodies and timeouts, and returns a content hash for review.
- The evidence workspace persists fetch metadata locally (not full page content), compares the new raw-response hash to the previous fetch for the same opportunity/source URL, and marks first-seen/changed/unchanged state.
- Fetch history is included in local backup export/import. It is not stored server-side and there is no scheduled refresh. The user manually selects a relevant excerpt before adding it to the evidence ledger.
- `/evaluation` consumes the deterministic evaluators. Funding evidence is mapped by cost category and requires an explicit user review before being treated as verified. Eligibility rules must reference a saved evidence snapshot.
- Applicant values and evaluation inputs are session-only; they are not written to browser storage. Funding totals are total-program amounts, and mixed currencies are rejected.
- `/compare` renders a side-by-side matrix for up to four saved opportunities, using only stored fields and evidence/fetch-history counts. It deliberately avoids automatic ranking while funding/eligibility data is incomplete.
- This first evidence ledger is browser-local and not tamper-proof. Supabase and server-side snapshots remain deferred.

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


## Source extraction and normalization
lib/source-parser.ts implements a deterministic, versioned extraction layer over text already fetched by the constrained official-source fetcher. Shared labelled patterns are combined with source-specific rule profiles keyed by the curated source ID. It extracts review candidates only; it does not create EvidenceItems, update opportunity facts, calculate eligibility, or confirm funding.

Candidate records retain factType, exact excerpt, rawValue, optional normalizedValue, confidence hint, reviewStatus=needs-review, and parserVersion. Only unambiguous ISO or month-name dates and amounts with explicit supported currency codes/symbols are normalized. Ambiguous numeric dates and currency-less amounts remain unnormalized. The evidence UI requires an explicit user selection and a separate save action before a candidate becomes an evidence snapshot.

The current parser is a conservative heuristic, not a general-purpose document understanding system. It can miss facts in tables, PDFs, scripts, image-only pages, and unusual layouts; it may surface false positives. Candidate absence is not evidence of absence. Parser version and source excerpt must remain attached to every reviewable candidate.
