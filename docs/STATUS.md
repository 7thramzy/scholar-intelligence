# Project status

Last verified: 2026-11-23
Default branch: main
Latest application feature merge: 5f444461f4de047bfca942e09dcd76279abb4edc
Latest README update: a713c03123e94e83d8ef81223ba2975d48f68656

## Completed
- Agent instructions, project context, architecture, security, decisions, domain model, roadmap, and handoff docs merged.
- Third-party Next.js/Supabase starter audited and rejected for blind import; see docs/STARTER_AUDIT.md.
- Next.js 15.5.29 / React 19.2.9 / TypeScript / Tailwind application scaffold.
- Arabic RTL responsive owner dashboard and local opportunity tracker route.
- Opportunity tracker supports add/remove, institution, field, deadline, official HTTPS source URL, and preliminary funding claim.
- Opportunity metadata is saved only in this browser's localStorage; stored records are validated before rendering. No applicant profile, documents, credentials, or secrets are stored there.
- Opportunity records can now be edited. Deletion is blocked when evidence records still reference the opportunity, preserving evidence links.
- Local backup export/import includes opportunities, evidence, and source fetch history; it enforces a 5 MB file cap and schema/record limits, merges by ID without overwriting, rejects conflicting IDs, and recomputes SHA-256 evidence fingerprints before restore.
- Deterministic funding evaluator covers tuition, living, housing, insurance, travel, visa, and mandatory fees; missing/unverified cost evidence prevents a full-funding result.
- Deterministic eligibility evaluator supports hard/soft criteria and explicit unknown state; empty criteria and non-finite numbers cannot produce an eligible result.
- Unit tests cover the core funding and eligibility rules.
- npm package-lock.json committed and reproducible npm ci configured.
- Dependency audit reported zero vulnerabilities in successful CI runs.
- GitHub Actions run 45 passed: npm ci, npm audit, lint, unit tests (44 total), typecheck, and production build.
- Vercel project linked to 7thramzy/scholar-intelligence. Last verified production deployment is READY at https://scholar-intelligence.vercel.app (deployment dpl_3BK89kV6Y5X7s8awKMfg6NpyMstB, commit ee5436fbbcd3d944bdfbbca40733e1f66c7f34ea). The newer deadline-status merge (main commit 558f7cf) passed CI but has no corresponding production deployment yet. A manual Vercel deployment request returned HTTP 402 because the team's free API deployment quota exceeded 100 deployments in 24 hours. No paid plan or billing change was made.

## Current limitations
- Opportunity records are browser-local only and do not sync between devices.
- Source registry now contains eight curated official scholarship/study portals. Domain matching requires HTTPS and exact host/subdomain matching; lookalike suffix domains are rejected.
- Evidence workspace captures user-copied excerpts linked to a saved opportunity from any HTTPS domain, classifies registered versus unregistered source trust, timestamps each record, and stores a SHA-256 fingerprint. Evidence is append-only through the UI and remains browser-local.
- Unregistered HTTPS sources can be retained for manual review but are visibly unverified. They cannot satisfy funding verification gates; only matching evidence from the curated official registry can.
- A constrained server-side official-page fetch endpoint now accepts only registered HTTPS domains, validates every redirect against the same registered source, reads robots.txt before the page, enforces a 1 MB body cap and 10-second timeout, and returns extracted text plus a SHA-256 content fingerprint.
- The evidence workspace can fetch a page for manual review; the user must select/copy the relevant excerpt and explicitly add it to the evidence ledger.
- Source fetch history is stored locally as metadata only: requested/final URL, source ID, HTTP/content type, title, retrieval time, SHA-256, and first-seen/changed/unchanged state. The full fetched page text is not persisted.
- Fetch history is included in backup export/import, capped at 500 records, and validated against registered source domains. Server-side persistence and scheduled refresh remain unimplemented.
- `/evaluation` now wires the deterministic funding and eligibility evaluators into an Arabic RTL workspace.
- `/compare` provides side-by-side comparison of up to four locally saved opportunities, including source trust, deadlines, funding claims, evidence counts, and fetch-history freshness. It does not invent scores or rank opportunities.
- Deadline states are now calculated deterministically as closed, closing soon (within 30 days), upcoming, or unknown; they are displayed in opportunity cards and comparison tables. This feature is merged to main and CI-tested, but awaits deployment due to the Vercel daily deployment quota. Funding rows cover all seven required cost categories and require a linked evidence excerpt plus an explicit user review before the category is treated as verified.
- Eligibility rules must be linked to a saved eligibility/language/program evidence excerpt; hard failures, unknowns, and soft-preference failures remain distinct.
- Applicant values and all evaluation inputs remain session-only and are not persisted to localStorage. Funding results are therefore recalculated after a page reload.
- Funding claim is intentionally displayed as an unverified source claim; no manually entered record is automatically confirmed as fully funded.
- No sign-in, database, AI provider, Gmail/Drive integration, private document storage, or reminders.
- No browser-based visual QA or real-device responsive testing has been completed.
- Evaluation is an evidence-guided planning aid, not an admissions decision or independent confirmation from a scholarship provider.
- Evidence fingerprints are integrity aids, not digital signatures or proof that an excerpt genuinely appeared on the linked page.
- The fetch endpoint is read-only and restricted to the curated domain list. Its in-memory throttle is best-effort on serverless infrastructure, not a durable distributed rate limiter; durable abuse controls and owner authentication are required before broad public use.

## Integrations
- Supabase connector currently lists zero projects. Database provisioning remains deliberately deferred until the final phase.
- One Supabase organization is visible: r7-yn1's Org. No Supabase project has been created.
- Vercel project: scholar-intelligence; team plan Hobby; repository linked.
- No secrets or personal application documents are stored in the repository.

## Next actions
1. Verify and smoke-test the deadline-status deployment when the Vercel free deployment quota resets.
2. Persist source fetch history server-side, add parser version provenance, scheduled freshness checks, and durable rate limiting.
3. Expand extraction/normalization using reviewed real-page fixtures, improve multilingual and table layouts, and measure precision before wider automation.
4. Persist public program cost/eligibility criteria and comparison sets without persisting applicant values before authentication.
5. Add authentication and privacy boundaries before storing any applicant profile or private documents.
6. Add Gmail/Drive integrations only after consent scopes, token storage, and access isolation are designed.
7. Provision Supabase only as the final infrastructure step, after confirming the organization and that the selected plan/cost is $0; otherwise return for explicit approval.
8. Configure Supabase Auth/RLS and test anonymous denial, owner access, and cross-owner denial.


## Source extraction and parser QA — merged
- PR #16 added deterministic parser v0.1.0 and review-only candidate flow; merge commit 7801f2666d8f44287aea4715b8d5bd3779191980.
- PR #17 added concise official-page regression fixtures for all eight curated source IDs and parser v0.2.0 improvements; merge commit 082f81d3fe100539c24c92e73946162e5c9aecfe.
- Parser profiles cover DAAD, Erasmus Mundus, Study in Japan/MEXT, Türkiye Scholarships, Chevening, Commonwealth, Stipendium Hungaricum, and Campus France.
- Candidate types cover deadline, tuition, stipend, living, housing, insurance, travel, visa, mandatory fees, eligibility, language, duration, and intake.
- Normalization accepts validated ISO/month-name dates, explicit currency codes/symbols/words, and typed currency ranges. Malformed number grouping, reversed ranges, ambiguous numeric dates, and amounts without explicit currency remain unnormalized.
- Every candidate retains its excerpt, parser version, confidence hint, and needs-review state. Candidates are not auto-saved, auto-approved, or used to determine eligibility/funding completeness.
- GitHub Actions run 50 (45156375438) passed: dependency audit reported zero vulnerabilities, ESLint passed, 54 unit tests passed, TypeScript typecheck passed, and production build passed.
- Vercel preview deployment dpl_DG6uPHfaHYTtUktRhUNaCwvCHhhj is READY for the PR #17 head commit. Vercel production deployment dpl_9PZhUEeYXZELV1RQ6hZTKyxwMWxW is confirmed READY on main at commit 80a87b7e47e777b117827615ec627e0002342150; this deployment includes PR #17 parser QA changes and is live at https://scholar-intelligence.vercel.app.
- Browser interaction testing and live page extraction are not verified. The official excerpts are short regression fixtures, not a full-page coverage benchmark.
- Next: verify production deployment, perform browser smoke tests when an authenticated browser is available, and add representative table/PDF/multilingual page fixtures. Keep Supabase deferred.


## Official opportunity discovery — merged in PR #18
- Added `/discover` as a local-first workspace that scans the fixed base URLs of the eight curated official sources one at a time.
- Added `POST /api/source-discover`, which accepts only a registered source ID and never an arbitrary URL. It uses the existing robots.txt checks, redirect validation, timeout and response-size limits.
- HTML link extraction keeps only relevant HTTPS links whose host remains within the same registered official source domain. External domains, non-HTTPS links, file downloads, duplicates, and irrelevant labels are excluded.
- Results are presented as discovery candidates with deterministic text relevance hints, not verified opportunities. The owner must review the link and manually enter the institution/program details before explicitly saving a local opportunity. Funding remains unknown.
- No database, search-engine provider, AI provider, account, or paid service added.
- PR #18 merged to main at commit 5f444461f4de047bfca942e09dcd76279abb4edc after GitHub Actions run 51 passed: dependency audit, ESLint, 63 unit tests, TypeScript, and production build.
- Vercel has not yet deployed the merge commit. The project's free deployment/build quota check is failing with a build-rate-limit response; no paid upgrade was made.
- Live source scans and browser interaction remain unverified. Root-page coverage may be limited; no claim is made that all programmes are discovered.


## Latest verification — 2026-11-23
- PR #18 is merged to main at `5f444461f4de047bfca942e09dcd76279abb4edc`.
- GitHub Actions run 51 (`45158017410`) passed: dependency audit, ESLint, 63 unit tests, TypeScript typecheck, and production build.
- Latest confirmed Vercel production deployment remains `dpl_8qs69JKhMuyG2PQ3VSzGbKDeBNwd` at the earlier commit `7309d9a047d168dfd852f3fd5dd78144354c9407`.
- A new deployment request was rejected with HTTP 402 `api-deployments-free-per-day` (more than 100 deployments in 24 hours; retry-after 86400 seconds). No CLI session or local linked checkout is available for a safe CLI fallback. No plan/billing change was made.
- Confirmed live runtime consequence: `/discover` and `/api/source-discover` still return HTTP 404 on production until a new deployment succeeds.
- Feature is merged and CI-verified, but not deployed or live-tested. Retry deployment after the quota window resets; then test all eight sources with real network responses.
