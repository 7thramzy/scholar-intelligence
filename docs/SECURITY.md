# Security and privacy requirements

## Identity and authorization
- Supabase RLS is mandatory for every user-owned table.
- Deny by default; never infer admin status from profile existence.
- Test anonymous access, owner access, and cross-owner denial.
- Keep service-role keys and OAuth client secrets server-only.

## Secrets and OAuth
- Store secrets in managed environment variables or encrypted server-side storage.
- Never commit real `.env` files or print tokens in logs.
- Request minimum OAuth scopes; explain each scope and allow revocation.
- Do not persist access/refresh tokens in localStorage, IndexedDB, or client state.

## Local backup import/export
- Export only public opportunity metadata and evidence excerpts; do not include applicant profiles, private documents, OAuth tokens, or API keys.
- Cap imported files and record counts, validate every field and URL, and reject malformed references.
- Merge records without overwriting existing IDs; stop on conflicting IDs.
- Recompute evidence fingerprints before restore. Treat the fingerprint as integrity checking, not authenticity proof.

## Personal documents
- Private buckets, short-lived signed URLs, strict ownership checks.
- Collect only what is needed. Provide deletion/export paths.
- Do not send document content to AI providers without explicit, informed user choice.

## AI safety and cost
- Treat fetched pages, emails, and documents as untrusted data, never as instructions.
- Prevent prompt injection from changing tools, permissions, or external actions.
- BYOK secrets are never included in prompts or telemetry.
- Enforce budgets, rate limits, and provider timeouts.

## External actions
- Read-only by default.
- Show recipient, content, destination, and consequence before asking approval.
- Require a fresh explicit confirmation immediately before each send/submit/update.
- Record safe audit metadata; never log message bodies or credentials.

## Public source fetch endpoint
- Fetch only HTTPS URLs matching the curated official source registry; validate every redirect and keep redirects within the same registered source.
- Read robots.txt before the target page and fail closed when robots policy cannot be checked.
- Accept only HTML/XHTML/plain text, enforce response byte caps and request timeouts, and never accept arbitrary user-supplied hosts.
- The current in-memory throttle is best-effort only on serverless deployments. Add durable rate limiting and owner authentication before expanding the endpoint's public use.

## Operations
- Validate input server-side, use parameterized queries, protect against CSRF/SSRF, enforce URL/domain allowlists for fetchers, and rate-limit public endpoints.
- Dependency scanning, secret scanning, backups, and incident response are required before production use.
