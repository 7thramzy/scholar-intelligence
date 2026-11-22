# Project status

Last verified: 2026-11-23
Default branch: main
Latest merged commit: a0d5b1be131f403b7793203f468b91e3c1967bbe

## Completed
- Agent instructions, project context, architecture, security, decisions, domain model, roadmap, and handoff docs merged.
- Third-party Next.js/Supabase starter audited and rejected for blind import; see docs/STARTER_AUDIT.md.
- Next.js 15.5.29 / React 19.2.9 / TypeScript / Tailwind application scaffold.
- Arabic RTL responsive owner dashboard and local opportunity tracker route.
- Opportunity tracker supports add/remove, institution, field, deadline, official HTTPS source URL, and preliminary funding claim.
- Opportunity metadata is saved only in this browser's localStorage; stored records are validated before rendering. No applicant profile, documents, credentials, or secrets are stored there.
- Deterministic funding evaluator covers tuition, living, housing, insurance, travel, visa, and mandatory fees; missing/unverified cost evidence prevents a full-funding result.
- Deterministic eligibility evaluator supports hard/soft criteria and explicit unknown state; empty criteria and non-finite numbers cannot produce an eligible result.
- Unit tests cover the core funding and eligibility rules.
- npm package-lock.json committed and reproducible npm ci configured.
- Dependency audit reported zero vulnerabilities in successful CI runs.
- GitHub Actions run 30 passed: npm ci, npm audit, lint, unit tests, typecheck, and production build.
- Vercel project linked to 7thramzy/scholar-intelligence. Production deployment from main commit 44b4c0fae1fbe51d06b995f6e8f4265141372d6c reached READY. The latest opportunity-tracker merge is awaiting its own production deployment check.

## Current limitations
- Opportunity records are browser-local only and do not sync between devices.
- The tracker is manual entry; no official source discovery, scraping, parsing, evidence snapshots, freshness checks, or automatic updates yet.
- Funding and eligibility evaluators are tested pure modules but are not yet wired into the opportunity UI.
- Funding claim is intentionally displayed as an unverified source claim; no manually entered record is automatically confirmed as fully funded.
- No sign-in, database, AI provider, Gmail/Drive integration, private document storage, or reminders.
- No browser-based visual QA or real-device responsive testing has been completed.

## Integrations
- Supabase connector currently lists zero projects. Database provisioning remains deliberately deferred until the final phase.
- One Supabase organization is visible: r7-yn1's Org. No Supabase project has been created.
- Vercel project: scholar-intelligence; team plan Hobby; repository linked.
- No secrets or personal application documents are stored in the repository.

## Next actions
1. Verify the latest main-branch Vercel deployment reaches READY and inspect the deployed page.
2. Add edit/update capability and a safe local export/import for public opportunity metadata.
3. Build official source registry, evidence capture, immutable snapshots, parser provenance, and freshness tracking.
4. Wire deterministic eligibility and full-cost funding evaluation into opportunity detail and comparison screens.
5. Add applicant profile and saved-opportunity workflows with explicit review of historical personal data.
6. Add authentication and privacy boundaries before storing personal profile or documents.
7. Provision Supabase only as the final infrastructure step, after confirming the organization and that the selected plan/cost is $0; otherwise return for explicit approval.
8. Configure Supabase Auth/RLS and test anonymous denial, owner access, and cross-owner denial.
