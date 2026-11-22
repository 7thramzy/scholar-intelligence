# Project status

Last verified: 2026-11-23
Default branch: main
Latest merged commit: e62116ef3dfe76f83f292a60c42163d0415a0a73

## Completed
- Agent instructions, project context, architecture, security, decisions, domain model, roadmap, and handoff docs merged.
- Third-party Next.js/Supabase starter audited and rejected for blind import; see docs/STARTER_AUDIT.md.
- Next.js 15.5.29 / React 19.2.9 / TypeScript / Tailwind application scaffold.
- Arabic RTL responsive owner dashboard and local opportunity tracker route.
- Opportunity tracker supports add/remove, institution, field, deadline, official HTTPS source URL, and preliminary funding claim.
- Opportunity metadata is saved only in this browser's localStorage; stored records are validated before rendering. No applicant profile, documents, credentials, or secrets are stored there.
- Opportunity records can now be edited. Deletion is blocked when evidence records still reference the opportunity, preserving evidence links.
- Local backup export/import includes opportunities and evidence, enforces a 5 MB file cap and schema/record limits, merges by ID without overwriting, rejects conflicting IDs, and recomputes SHA-256 evidence fingerprints before restore.
- Deterministic funding evaluator covers tuition, living, housing, insurance, travel, visa, and mandatory fees; missing/unverified cost evidence prevents a full-funding result.
- Deterministic eligibility evaluator supports hard/soft criteria and explicit unknown state; empty criteria and non-finite numbers cannot produce an eligible result.
- Unit tests cover the core funding and eligibility rules.
- npm package-lock.json committed and reproducible npm ci configured.
- Dependency audit reported zero vulnerabilities in successful CI runs.
- GitHub Actions run 37 passed: npm ci, npm audit, lint, unit tests (34 total), typecheck, and production build.
- Vercel project linked to 7thramzy/scholar-intelligence. Production deployment for main commit e62116ef3dfe76f83f292a60c42163d0415a0a73 reached READY at https://scholar-intelligence.vercel.app.

## Current limitations
- Opportunity records are browser-local only and do not sync between devices.
- Source registry now contains eight curated official scholarship/study portals. Domain matching requires HTTPS and exact host/subdomain matching; lookalike suffix domains are rejected.
- Evidence workspace captures user-copied excerpts linked to a saved opportunity, classifies source-domain trust, timestamps each record, and stores a SHA-256 fingerprint. Evidence is append-only through the UI and remains browser-local.
- A constrained server-side official-page fetch endpoint now accepts only registered HTTPS domains, validates every redirect against the same registered source, reads robots.txt before the page, enforces a 1 MB body cap and 10-second timeout, and returns extracted text plus a SHA-256 content fingerprint.
- The evidence workspace can fetch a page for manual review; the user must select/copy the relevant excerpt and explicitly add it to the evidence ledger.
- Fetch snapshots are returned for review but are not yet persisted as a historical fetch log; freshness monitoring and scheduled refresh remain unimplemented.
- Funding and eligibility evaluators are tested pure modules but are not yet wired into the opportunity UI.
- Funding claim is intentionally displayed as an unverified source claim; no manually entered record is automatically confirmed as fully funded.
- No sign-in, database, AI provider, Gmail/Drive integration, private document storage, or reminders.
- No browser-based visual QA or real-device responsive testing has been completed.
- Evidence fingerprints are integrity aids, not digital signatures or proof that an excerpt genuinely appeared on the linked page.
- The fetch endpoint is read-only and restricted to the curated domain list. Its in-memory throttle is best-effort on serverless infrastructure, not a durable distributed rate limiter; durable abuse controls and owner authentication are required before broad public use.

## Integrations
- Supabase connector currently lists zero projects. Database provisioning remains deliberately deferred until the final phase.
- One Supabase organization is visible: r7-yn1's Org. No Supabase project has been created.
- Vercel project: scholar-intelligence; team plan Hobby; repository linked.
- No secrets or personal application documents are stored in the repository.

## Next actions
1. Persist source fetch history with content hashes, HTTP metadata, parser versions, and freshness state; add durable rate limiting before broad public use.
2. Add robust content parsing with provenance and user review, then connect normalized evidence to opportunity facts.
3. Wire deterministic eligibility and full-cost funding evaluation into opportunity detail and comparison screens.
4. Add applicant profile and saved-opportunity workflows with explicit review of historical personal data.
5. Add authentication and privacy boundaries before storing personal profile or documents.
6. Provision Supabase only as the final infrastructure step, after confirming the organization and that the selected plan/cost is $0; otherwise return for explicit approval.
7. Configure Supabase Auth/RLS and test anonymous denial, owner access, and cross-owner denial.
