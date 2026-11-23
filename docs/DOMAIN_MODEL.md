# Domain model

## Primary records
- **Source**: official domain, source category, trust tier, allowed fetch policy, last checked.
- **SourceFetch**: source, fetched_at, HTTP status, parser version, content hash, freshness.
- **EvidenceItem**: source URL, exact excerpt, observed_at, fact type, confidence, content hash.
- **Institution**: canonical institution identity and official domains.
- **Program**: degree level, field, language, duration, intake, application URL.
- **Scholarship**: provider, award type, coverage conditions, eligible countries, deadlines.
- **FundingComponent**: tuition, stipend, housing, insurance, travel, visa, fees; amount/currency/period and evidence.
- **EligibilityRule**: explicit criterion, comparator, normalized value, hard/soft classification, evidence.
- **Evaluation**: rule outcomes, missing data, exclusions, evaluated_at, ruleset version.
- **SavedOpportunity**: owner, program/scholarship references, priority, notes, stage.
- **ApplicationTask**: owner, due date, status, dependencies, related opportunity.
- **DocumentMetadata**: owner, storage key, type, verification status; never expose private file contents by default.
- **AuditEvent**: actor, action, target, timestamp, safe metadata.

## Local backup format
Version 1 backup bundles public opportunity metadata, evidence snapshots, and source fetch metadata history. Import validates schema and references, merges by stable IDs, rejects conflicting IDs, and verifies evidence fingerprints before writing. This is a portability mechanism for local browser data, not a server backup.

## Source fetch records
The source fetch pipeline returns source ID, requested/final URL, retrieval timestamp, HTTP status, content type, extracted title/text, robots-policy result, and SHA-256 of the raw response. Fetch metadata history is stored locally with the content fingerprint and a first-seen/changed/unchanged comparison against the previous fetch for the same opportunity and URL. Server-side persistence, parser versioning, and scheduled freshness transitions are not yet implemented.

## Evidence snapshot integrity
An evidence snapshot stores the opportunity reference, source URL, fact type, exact normalized excerpt, capture timestamp, registered/unregistered source trust, optional source registry match, schema version, and SHA-256 content fingerprint. The fingerprint detects accidental changes to the captured payload; it is not a digital signature and does not prove source authenticity. The current browser-local ledger is append-only through the UI but is not protected against browser storage edits or deletion.

## Evaluation interaction boundary
The current evaluation workspace reads opportunity/evidence records from browser-local storage. Funding inputs, applicant values, and calculated results are session-only and are not persisted. A funding category is marked verified only when a matching evidence excerpt exists and the user explicitly confirms review. This is user-attested evidence review, not independent provider verification.

## Evaluation states
- Eligibility: eligible / ineligible / uncertain / needs-review.
- Funding: fully-funded-confirmed / partially-funded / self-funded / unknown.
- Deadline: open / upcoming / closed / not-published / unverified.

Unknown is not equivalent to eligible, fully funded, or open.

## Integrity
Every normalized claim links to one or more evidence items. Preserve history when a source changes; do not silently rewrite previously observed evidence.
