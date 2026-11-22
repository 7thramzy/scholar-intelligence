# Starter audit — 2026-11-23

## Candidate
Repository: https://github.com/raj-khan/nextjs-supabase-saas-boilerplate

## Verdict
Do not import this repository unchanged. It is a useful reference, but its current state has blockers that make a blind template import unsafe.

## Confirmed positives
- Next.js 15 App Router, TypeScript, React 19, Supabase SSR/Auth, Tailwind, Vitest.
- Server/browser Supabase clients and a protected dashboard shell are present.
- CI workflow, security headers, and basic profile migration are present.

## Confirmed blockers and risks
1. `pnpm-lock.yaml` is absent, while CI runs `pnpm install --frozen-lockfile`; clean CI cannot be relied on.
2. `supabase/config.toml` is absent, so local Supabase CLI workflow is incomplete.
3. `supabase/migrations/002_rls_helpers.sql` defines `public.is_admin()` as SECURITY DEFINER and returns true for any existing profile. This is an authorization vulnerability if used; it must not be imported.
4. `app/auth/callback/route.ts` redirects to `${origin}${next}` without validating `next`; this permits an untrusted redirect destination. Replace with strict same-origin relative-path validation.
5. Package script uses `next lint`; confirm compatibility with the selected Next.js version and use ESLint CLI if needed.
6. The migration creates `handle_new_user()` as SECURITY DEFINER. Review function ownership, execute grants, and trigger behavior before production; keep search_path pinned and avoid public callable privileged functions.
7. Middleware relies on non-null environment assertions; add validated environment handling and fail closed.
8. README's “production-ready” claim is not independently verified. No build, tests, or live Supabase runtime were run during this audit.

## Decision
Build a clean, minimal application foundation rather than importing the starter wholesale. Reuse only individually reviewed patterns (Supabase SSR cookie handling, accessible auth UX, test conventions). Do not copy the admin helper or callback redirect logic.

## Required gates before Supabase integration
- Pin dependency versions and commit a generated lockfile.
- Verify current Supabase SSR and CLI documentation.
- Add `supabase/config.toml` and reproducible migrations.
- Implement auth callback with validated local redirect paths.
- Add RLS tests for anonymous denial, owner access, and cross-owner denial.
- Ensure no service-role client can enter client bundles; use server-only guards.
- Run lint, typecheck, tests, production build, and Supabase advisors.
