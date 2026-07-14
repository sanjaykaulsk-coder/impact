# CLAUDE.md — IMPACT FIELD COMMAND

Read this file at the start of every session. It is the standing contract for this project.

## What this is
A configurable, multi-client field-execution operating system for Impact Communications (27-year-old rural marketing & activation agency, India). One common Android field app + one web admin/monitoring portal. Full specification: `docs/FIELD_COMMAND_SPEC.md` — the single source of truth for WHAT to build.

## Operating mode (permanent)
The founder is not a coder. Beginner-safe mode:
- Run every command yourself; never ask the founder to type terminal commands or edit files by hand
- Before each major step: one plain-language line on what you're doing and why
- Ask before anything destructive (deleting files, resetting databases)
- If something fails, fix it yourself, then explain in plain words
- End EVERY session: update `docs/STATE.md`, run the QA grep, give a plain-English summary forwardable to the COO

## Locked technical decisions (never re-litigate, never offer options)
- **Android app:** Flutter — Riverpod, GoRouter, Drift (encrypted offline DB), WorkManager
- **Web (admin + supervisor + command centre):** Next.js + TypeScript, responsive, role-based navigation
- **Backend:** NestJS + TypeScript, modular monolith with separable modules
- **Database:** PostgreSQL 16 + PostGIS, Prisma ORM, UUIDs everywhere, `tenant_id` (client) + `campaign_id` on all relevant tables
- **Cache/queue:** Redis + BullMQ
- **Media:** S3-compatible object storage (MinIO locally), signed URLs, originals and watermarked copies separate, binaries never in the database
- **Notifications:** adapter interfaces + mock providers for OTP and WhatsApp in development; no real credentials in code, ever
- **Deployment:** Docker Compose locally; India-region cloud later

## Standing QA rule (permanent, non-negotiable)
No test value, dummy balance, placeholder text, or mock data reachable on any screen a real user can see — except clearly-labelled seed demo data per the spec's Demo Data section. Every session ends with a grep for violations. Every mock integration is explicitly marked MOCK in code and UI.

## Process rules
1. Phase-gated with approval stops. Within a phase, don't ask broad questions — make a practical assumption, log it in `docs/ASSUMPTIONS.md`, continue.
2. No superficial demo; no big-bang build. Vertical slice first, then module by module per `docs/architecture/09-mvp-build-sequence.md`.
3. Form versioning and immutable audit logs are day-one architecture, not polish.
4. Where Android cannot technically guarantee something (e.g. absolute manipulation prevention), say so plainly and implement the spec's risk-detection approach.

## Repo layout
```
backend/   NestJS API (modular monolith)
web/       Next.js admin + supervisor + command centre
app/       Flutter field application
shared/    Shared API types / contracts
docs/      Spec, state, assumptions, architecture pack
```

## Session close checklist
1. `docs/STATE.md` updated (built / in progress / next / open issues)
2. QA grep run, violations listed or "clean"
3. Plain-English summary for the founder
4. STOP at phase boundaries; wait for written approval
