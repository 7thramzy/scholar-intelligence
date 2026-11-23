# Agent instructions

You are working on Scholar Intelligence. Preserve the product decisions and user context in this repository.

## Mandatory reading order
1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/DECISIONS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/SECURITY.md`
6. `docs/ROADMAP.md`
7. `docs/STATUS.md`

## Working rules
- Inspect the repository before editing. Do not assume a starter, database, deployment, or integration exists.
- Work in small, verifiable increments. Run relevant lint, typecheck, tests, and build; report exact commands and outcomes.
- Update `docs/STATUS.md` after each meaningful milestone, including changed files, validation, blockers, and next action.
- Preserve existing user data. Never run destructive migrations or overwrite secrets.
- Never commit credentials, OAuth tokens, service-role keys, private documents, or personal records.
- Do not invent scholarship facts. Every material claim needs a source URL, retrieval time, evidence excerpt/hash, and confidence/status.
- Treat AI output as a hypothesis. Deterministic rules decide eligibility, deadlines, funding completeness, and hard exclusions.
- No outbound email, application submission, account mutation, or other external side effect without the user's explicit approval for that exact action.
- Ask only when a missing decision blocks safe progress. Otherwise choose the simplest reversible implementation and document the choice.
- Do not expose private applicant data in logs, analytics, client bundles, or public endpoints.

## Product scope
Build a personal-first scholarship and graduate-program intelligence workspace. It is not a generic scholarship listing site and not a multi-user SaaS in the first release.

## Definition of done
A change is done only when implementation, relevant tests, security implications, docs/status, and actual deployment/runtime evidence (when applicable) are checked. Clearly distinguish implemented, tested, deployed, and verified.


## Source extraction rules
- Parser output is always a review candidate, never an approved fact. Preserve exact excerpts, source provenance, and parser version.
- Never auto-save parser candidates to the evidence ledger. Require explicit owner selection, review, and save.
- Normalize dates only when unambiguous and calendar-valid. Normalize money only with an explicit supported currency; do not infer currencies or periods.
- A parser miss is not proof that a fact is absent. A heuristic match is not proof that the claim is true.
