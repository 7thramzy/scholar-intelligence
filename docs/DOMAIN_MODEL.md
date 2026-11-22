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

## Evaluation states
- Eligibility: eligible / ineligible / uncertain / needs-review.
- Funding: fully-funded-confirmed / partially-funded / self-funded / unknown.
- Deadline: open / upcoming / closed / not-published / unverified.

Unknown is not equivalent to eligible, fully funded, or open.

## Integrity
Every normalized claim links to one or more evidence items. Preserve history when a source changes; do not silently rewrite previously observed evidence.
