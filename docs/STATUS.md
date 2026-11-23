# Project status

Last verified: 2026-11-23
Default branch: main
Latest merged commit: 558f7cf513604032a5598d386b83111ae6ec44b7

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
3. Build robust extraction/normalization that maps source facts to program records while retaining reviewable provenance.
4. Persist public program cost/eligibility criteria and comparison sets without persisting applicant values before authentication.
5. Add authentication and privacy boundaries before storing any applicant profile or private documents.
6. Add Gmail/Drive integrations only after consent scopes, token storage, and access isolation are designed.
7. Provision Supabase only as the final infrastructure step, after confirming the organization and that the selected plan/cost is $0; otherwise return for explicit approval.
8. Configure Supabase Auth/RLS and test anonymous denial, owner access, and cross-owner denial.
