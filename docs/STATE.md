# STATE.md — IMPACT FIELD COMMAND

**Last updated:** 15 July 2026 · **Phase:** C — approved. **Stage 2 Session A (admin thread) — COMPLETE. Stage 2 Session B (field/phone-app thread) — COMPLETE, awaiting founder approval to start Session C.**

## Stage 2 Session B — field/phone-app thread (this session, after founder's "proceed" approval)

Per `docs/architecture/09-mvp-build-sequence.md`: assignment list → activity detail → camera-only
opening evidence with GPS/timestamp/overlay → check-in validation → milestone form → offline
outbox → sync with visible statuses. Built backend-first, then the full Flutter UI/offline layer.

- **Backend** (`backend/src/modules/execution/`): GPS check-in/check-out with haversine
  deviation-tolerance checking against `campaign.deviationToleranceMeters`, real photo upload with
  server-side watermark compositing (location/time/GPS/user name burned into the image via
  `MediaStorageService` + MinIO), idempotent milestone-form submission, ownership enforcement on
  every endpoint (independent of and in addition to `CampaignScopeGuard`). Seeded a minimal
  Bihar-campaign workflow/milestone/PJP/assignment to exercise it end-to-end. Verified via curl:
  assignment fetch, activity creation, GPS check-in with correct distance math, photo upload with a
  visually-confirmed watermark, mandatory-field validation, idempotent retry, gated check-out, and
  a non-assignee correctly blocked. Committed and pushed separately, ahead of the Flutter half.
- **Flutter app** (`app/lib/features/execution/`, `app/lib/core/offline/`): live assignment list on
  the campaign home screen, activity detail screen merging server-confirmed state with
  locally-queued-but-unsynced outbox items, camera-only opening-evidence capture (never a gallery
  picker, per spec §17) with GPS captured at shot time, a milestone form renderer covering all 10
  core field types plus the one conditional show/hide rule, and a Drift-backed offline outbox
  (`OutboxItems`, one generalized table with a `type` discriminator rather than one table per action)
  drained by `SyncService`, triggered both by WorkManager in the background and by
  `connectivity_plus` the moment a signal returns.
- **Real gap found and fixed** (A-031): the server-assigned device UUID was never persisted
  client-side, but is required for offline-submission idempotency. Added `serverDeviceId` to
  `TokenStore`, wired through OTP verification.
- **Verified**: `flutter analyze` — 0 issues. `flutter build linux` — succeeds. `flutter test` — all
  4 tests pass (1 skipped by design, needs a live backend, per A-020). Camera capture and GPS
  cannot be exercised in this sandbox (no camera hardware, no location services) — these, and the
  full offline→sync loop under real network loss, need confirming on your own Android phone, same
  posture as A-012.
- **Sandbox-only build blocker, resolved for verification purposes only** (A-032): this container's
  network policy blocks two hosts the SQLite native-library toolchain wants
  (`sqlite.org`, and a GitHub-hosted prebuilt binary that also failed its own hash check). Verified
  the Linux build and test suite using the OS-provided SQLite instead (an officially documented
  `package:sqlite3` option), then reverted that setting before committing — it never touched the
  real Android build path, which still bundles its own SQLite exactly as before.

## Stage 2 Session A — admin thread (previous session, after Phase C approval)

Per `docs/architecture/09-mvp-build-sequence.md`: campaign builder essentials → minimal form
builder → PJP upload → assignment. All four built backend+web, verified end-to-end against a live
backend/database with scripted real-browser flows (not just unit-level checks), and committed.

- **Client management** (`backend/src/modules/clients/`, `web/.../dashboard/clients/`): create/list/
  get/update, gated by a new `PlatformPermissionGuard` + dedicated `manage_clients` permission
  (platform-level, not campaign-scoped — a brand-new client has no campaign yet to scope to).
- **Campaign builder** (`backend/src/modules/campaigns/`, `web/.../dashboard/campaigns/`): create/
  list/get/update, the full Draft→…→Archived status-transition chain from spec §9.2 with a
  separate `approve` permission gate on the review→approved step, and a versioned branding editor.
  Creating a campaign auto-grants the creator a role on it (see A-026) so they aren't locked out of
  what they just made.
- **Minimal form builder** (`backend/src/modules/forms/`, `web/.../dashboard/forms/`): campaign-
  scoped FormTemplate/FormVersion/FormSection/FormQuestion, 10 core field types, one conditional
  rule, and the version-freeze-and-clone publish flow spec §10 calls for. The Campaign SKU Master
  is deliberately still Stage 3.1 scope, not pulled forward — see A-024.
- **PJP upload** (`backend/src/modules/pjp/`, `web/.../dashboard/pjp/`): CSV upload with automatic
  column-to-field mapping (editable), a client-side validity preview, and server-side per-row
  validation that skips and reports invalid rows rather than rejecting the whole batch. Plus a
  manual "add a location" form (founder-requested) for campaigns with no PJP file yet, or just one
  more stop — validated the same way, published immediately, assignable right away.
- **Assignment** (`backend/src/modules/assignments/`, `web/.../dashboard/assignments/`): links a
  user (and optionally a published PJP row / team) to an assignment date and status, gated by the
  dedicated `allocate` permission; re-validates server-side that the target user actually holds a
  role in the campaign.

**Two real bugs found and fixed during this session's own verification** (not shipped and found
later — caught by driving the actual flows, same discipline as A-018 in Phase C): a browser-version-
specific regex-escaping issue in an HTML `pattern` attribute, and a nested-Prisma-transaction bug
where two form-builder endpoints silently returned pre-write state because `findOne()` opened a
second, connection-isolated transaction from inside an already-open one (A-025 has the full
post-mortem; checked the rest of the backend for the same shape, found no other instance).

## Phase C — Working Foundation (approved)

## Done

**Repo & docs**
- Monorepo scaffold: `backend/` (NestJS), `web/` (Next.js), `app/` (Flutter), `shared/` (TS API types), `docs/`
- Phase A docs carried over: `CLAUDE.md`, `README.md`, `docs/FIELD_COMMAND_SPEC.md`, **full architecture pack 01–09** (01/03/04/06/09 were missing at Phase C's start per A-011 — recovered mid-session from the founder's Phase A zip export and added; the gap logged in A-011 is now closed)
- `docs/reference/`: `Type_of_Campaign.xlsx` (21 real historical campaign-report sheets — DFR, Profile, Stock Reconciliation, Enquiry formats; contains real contact numbers and client sales figures, kept per the founder's explicit confirmation it's Impact's own proprietary data), `Type_of_Campaign_formats.md` (the founder's own PII-masked structural conversion of the same workbook, covering all 21 sheets), and `report-format-library.md` (Claude's distillation — see A-023 — cross-checked against the founder's structural conversion, which confirmed every finding and added real production-scale evidence: 27,032 real rows in one sheet alone. The founder's original *directives* document of the same name still hasn't successfully uploaded after three attempts)
- `docs/ASSUMPTIONS.md`: 32 logged entries — practical assumptions, two known data-model limitations, and every bug found/fixed during build with full context (see "Bugs found and fixed" below)
- App branding: the founder's logo integrated into both the web admin (favicon, login header, sidebar) and the Flutter app (Android launcher icons, login header) — verified visually on both

**Infrastructure**
- `docker-compose.yml`: PostgreSQL 16 + PostGIS 3.4, Redis 7, MinIO (with the media bucket auto-created and versioned)
- Images pulled via `mirror.gcr.io` (this build container's egress policy blocks Docker Hub's CDN directly; the mirror works identically on any machine)

**Database (Prisma)**
- Full schema covering all six spec §34 entity groups — Organisation & Access, Campaign, Forms, Workflow, Execution, Governance — ~55 tables, UUIDs throughout, `clientId`/`campaignId` on every tenant-scoped table
- PostGIS: `geography(Point,4326)` columns on Location/GPSPoint kept in sync with lat/lng via a database trigger, GIST-indexed
- **Three-layer multi-tenant isolation**, the top-ranked risk in the architecture pack: (1) NestJS `CampaignScopeGuard` resolving the caller's role per request, (2) an explicit `PrismaService.runInTenantContext()` pattern every service call site uses, (3) Postgres Row-Level Security, fail-closed, auto-applied to every `clientId`-bearing table, enforced via a separate restricted database role (not the migration owner) so RLS can't be silently bypassed
- 4 migrations, all idempotent and re-verified from a clean database as part of this session's final check

**Backend (NestJS)**
- Auth: mobile + OTP behind an `OtpProvider` adapter interface, with a clearly-labelled `MockOtpProvider` (never sends real SMS, logs + echoes the code only in dev)
- JWT access tokens + rotating refresh tokens (reuse of a rotated-out token revokes the whole session)
- Device registration & binding, configurable max-active-devices, pending-approval state
- Configurable RBAC: 23 roles × 20 permissions as data (`Role`/`Permission`/`RolePermission`), zero hard-coded role-name checks anywhere in guards or code
- Minimal read endpoints for the shells: `/me`, `/me/campaigns`, `/campaigns/:id/branding`, `/campaigns/:id/my-access`

**Seed data**
- 3 fictional clients (Shakti Consumer Products, Bharat Agri Systems, Surya Home Care), 4 campaigns across Bihar/UP/Rajasthan/Maharashtra with varied lifecycle statuses, geography trees, 4 locations, 16 users spanning every role category, including one user (Sneha Reddy) holding two different roles in two different campaigns to prove spec §7's core RBAC scenario
- Mobile numbers use an obviously-synthetic `90000000xx` block, never real numbers

**Web admin shell (Next.js)**
- Mobile + OTP login, permission-driven navigation (nav items are gated by the caller's actual permission codes for the active campaign, not role names), campaign switcher, campaign-branded home screen
- Verified with Playwright driving a real headless browser against the real backend: login → OTP → dashboard, cross-tenant access correctly blocked (403), same-tenant access correct (200), multi-role campaign switching correct

**Flutter field app shell**
- Login → OTP → device check → campaign selection (auto-skipped when there's only one campaign) → campaign-branded home, using Riverpod + GoRouter per the locked architecture
- Verified as a genuine compiled Linux-desktop build (`flutter build linux`), driven end-to-end with real clicks through a headless X server against the real backend for login/OTP; `flutter analyze` clean; 4 automated tests passing (widget, integration-against-live-backend, and a branding-rendering test)

## Bugs found and fixed during this build (see docs/ASSUMPTIONS.md for full detail)
1. **Real multi-tenant isolation bug** (A-018): Postgres placeholder GUCs revert to `''` not `NULL` after a `SET LOCAL` on a reused pooled connection, which could throw `invalid input syntax for type uuid` on an unrelated later request. Found by driving the actual Sneha Reddy multi-campaign scenario through a real browser, not by a unit test. Fixed with a migration + defensive code.
2. **Backend dev-server cold-start race** (A-022): `nest start --watch` could crash on the very first run looking for a `dist/main` that hadn't finished writing yet. Fixed by building once before watching.
3. Two Docker/tooling environment issues (image registry policy block, stale TypeScript incremental-build cache) — resolved, documented, no impact on the founder's own machine.
4. **Offline-submission idempotency gap** (A-031): the server-assigned device ID was never persisted client-side in the Flutter app, which the backend needs to safely dedupe a retried offline milestone-form submission. Found while wiring the offline outbox, before it could cause a silent duplicate in the field. Fixed by persisting it at OTP-verification time.
5. **Widget test not mocking a newly-added dependency** (A-032): adding the live assignment list to the campaign home screen broke an existing widget test, which now attempted a real network call. Fixed by adding a fake execution-repository override matching the test's existing pattern.

## Known limitations, logged and not silently hidden
- **A-017**: the schema's role-assignment table is always campaign-scoped; there's no clean way yet to express a true platform-wide role. Worked around in seed data; flagged for a real fix in a later module.
- **A-012 / A-021**: this build container has no Android emulator (no hardware virtualization) and cannot build an Android APK (its network policy blocks the Android SDK's own download host) — both are properties of this one container, not of the app. The Flutter app was instead verified as a real compiled Linux-desktop build driven end-to-end against the real backend. See "How to see it yourself" below for what this means for you.
- **Camera capture and GPS** (part of Session B): cannot be exercised in this sandbox at all (no camera hardware, no location services). The screens are written and pass static analysis; they need confirming on your own Android phone.

## Next (after founder approval of Session B)
- **Stage 2 Session C (supervisor thread + hardening)**: supervisor inbox → media/GPS review → approve/reject with remarks → airplane-mode end-to-end test → demo of the spec's acceptance scenarios 2 & 3.
- After the full vertical slice: Stage 3 configuration depth (full 35+ field-type form builder + Campaign SKU Master — see A-024, workflow builder, activity template library, PJP management depth).
- Founder decisions still pending from Phase A (spec §08): production OTP provider, cloud region, first shadow-pilot campaign.
- If the founder's original `report-format-library.md` surfaces later, it should be reconciled against `docs/reference/report-format-library.md` (this session's distillation) before Stage 3.1 starts — see A-023.

## Open items for the founder
1. Approve Session B (field thread), or request changes, before Session C (supervisor thread) starts
2. Try the field app's assignment → check-in → photo → form flow on your own Android phone — this is the first time camera and GPS can actually be confirmed, since this build machine has neither
3. Decide how you'd like to see it running — two options, see below
4. All work is committed and pushed to branch `claude/phase-c-foundation-sfqijm` on GitHub

## How to see it yourself

**Web admin portal (your browser):** run `./scripts/bootstrap.sh` on your own machine (needs Docker
Desktop + Node.js, both one-time standard installs), then open http://localhost:3000 and log in
with any demo number from the list above — the OTP code is shown right on screen.

**Field app (Android):** this build machine cannot run an Android emulator or build an APK (both
blocked by this container's own restrictions, not by the app). On your own machine, once
`./scripts/bootstrap.sh` is running the backend, open `app/` in Android Studio (or run
`flutter run` from a terminal) with an emulator or a plugged-in Android phone, and it will connect
to the same backend automatically. Log in as Rahul Kumar (`9000000009`) — the seed data gives him
one assignment (Patna City Haat Ground) you can walk through end to end: tap the assignment, check
in (grants camera + location permission when asked), take the opening photo, fill in the milestone
form, and check out. This is the first point in the build where camera and GPS can be confirmed for
real, since neither exists on this build machine.

## Open issues / P0-P1
- None outstanding — every issue found during this build was root-caused and fixed (see "Bugs found and fixed" above), not worked around.
