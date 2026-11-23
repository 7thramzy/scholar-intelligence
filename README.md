# Scholar Intelligence

Personal-first graduate scholarship and master's opportunity workspace. The product is being built evidence-first: official source references and deterministic rules take precedence over AI-generated claims.

## Workspaces

- `/opportunities` — add, edit, and manage scholarship/program records.
- `/evidence` — capture source excerpts, inspect official pages from the curated registry, and track source-content changes.
- `/evaluation` — evaluate full-program funding coverage and hard/soft eligibility rules using deterministic evaluators.
- `/compare` — compare up to four saved opportunities without invented scores or unsupported rankings.

## Data, trust, and current limitations

- Opportunity records, evidence excerpts, and source-fetch metadata are stored locally in the current browser. They do not sync between devices.
- Use the JSON backup export/import in the opportunities workspace to move local records between browsers. Imports are validated and merged without overwriting conflicting records.
- Automatic page fetching is restricted to the curated HTTPS source registry and checks `robots.txt`. Manual excerpts from other HTTPS domains are allowed but remain visibly unverified.
- Funding confirmation requires a matching source from the curated registry and explicit user review of each cost category. A provider's claim that a scholarship is fully funded is not itself proof.
- Applicant values and evaluation inputs are session-only; they are not saved in browser storage.
- No Supabase database, authentication, applicant-document storage, AI provider, Gmail/Drive integration, or reminders are connected yet.
- The deadline-state evaluator is merged to `main`; production deployment is pending the Vercel free deployment quota window.

## Development

- Node.js 20+
- npm 10+
- `npm install`
- `npm run dev`

## Validation

- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Agent handoff

Before changing the project, read:

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/STATUS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/SECURITY.md`
6. `docs/ROADMAP.md`

Supabase provisioning remains deliberately deferred to the final phase. Do not create paid resources or connect a database without checking the current plan and cost first.


## Source extraction and normalization (review-first)
The official source fetch flow now runs a deterministic, versioned parser over the fetched text. It produces candidate facts for application deadlines, tuition, stipends, living costs, housing, insurance, travel, visa/residence, mandatory fees, eligibility, language, duration, and intake. Source-specific rule profiles supplement shared labels for the eight registered portals.

Each candidate retains its exact excerpt, raw value, optional normalized date or currency amount, confidence hint, and parser version. Candidates are never automatically written to the evidence ledger or treated as verified. The user must select a candidate, review the source excerpt, and explicitly save it as evidence. Ambiguous dates and currency-less amounts remain unnormalized. The parser is heuristic and incomplete; absence of a candidate does not mean the source lacks the information.
