# Agent workflow

## Start of every session
1. Read all mandatory files listed in `AGENTS.md`.
2. Inspect git status, current branch, recent commits, repository tree, package manifests, and environment examples.
3. Read the latest status entry. Verify it against the actual repository rather than trusting stale notes.
4. State the next bounded milestone internally and execute it.

## During work
- Prefer small commits with descriptive messages.
- Keep secrets out of source control. Use `.env.example` with placeholders only.
- Use migrations for schema changes; include rollback or recovery notes.
- Add tests for eligibility rules, funding calculations, parsers, and security boundaries.
- Do not silently broaden scope or change a recorded decision.
- When a provider/API is unavailable, preserve source attribution and mark data stale/unknown rather than fabricate.

## Handoff format
Update `docs/STATUS.md` with:
- date and branch/commit
- completed work and exact paths
- validation commands and results
- known defects, blockers, and unverified assumptions
- one recommended next action
- instructions for the next agent

## User-facing reporting
Separate facts into: completed, tested, deployed, verified, blocked, and awaiting user action. Never claim a deployment or integration works without testing it.
