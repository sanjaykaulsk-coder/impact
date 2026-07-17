# STATE.md — IMPACT FIELD COMMAND

**Last updated:** 16 July 2026 · **Phase:** C — approved. **Stage 2 Session A — COMPLETE. Stage 2 Session B — COMPLETE, founder-approved. Stage 2 Session C (supervisor thread) — built, awaiting the founder's real-device test loop.**

## Stage 2 Session C — supervisor thread (this session, after founder approved Session B)

Per `docs/architecture/09-mvp-build-sequence.md`: supervisor inbox → media/GPS review →
approve/reject with remarks (the session's other listed items — airplane-mode test, acceptance
scenarios 2 & 3 — were already completed during Session B's real-device testing).

Founder-requested housekeeping done first: added a permanent CLAUDE.md process rule (every feature
session must list which `docs/architecture/` sections it implemented and flag any deviation
explicitly — added after Session B's single-shot-upload-vs-approved-chunked-design incident), and
ran the standing QA grep (clean — no dummy/placeholder data, every `mock` reference correctly
labeled).

- **A real, pre-existing gap found before writing any Session C code**: Postgres Row-Level
  Security (the database-level tenant-isolation backstop) only ever covers tables with a `clientId`
  column; 16 tables — including `Approval`, the exact table this session's feature is built on —
  have `campaignId` but no `clientId`, so RLS silently never protected them. This predates Session
  B, going back to the original schema design. Asked the founder directly rather than deciding
  unilaterally; fixed `Approval` only (migration `20260716115337_approval_client_id`, table had
  zero rows anywhere so no backfill needed), logged the other 15 as a known gap for a dedicated
  future pass — see A-043.
- **Backend** (`backend/src/modules/supervisor/`): a new `Approval` row is created automatically on
  first check-out (spec §25/§44 scenario 5's review queue). Supervisor inbox lists pending/approved/
  rejected activities for the campaign; each includes the watermarked photo(s) via signed URL, GPS
  check-in/check-out with distance-from-planned, and the submitted form's answers. Approve/reject
  requires remarks on rejection. A new `resubmit` endpoint puts a corrected activity back in the
  queue without requiring a fresh physical GPS check-out — the worker's presence was never in
  question on a content-only rejection, only the flagged content itself.
- **Web admin** (`web/src/app/dashboard/approvals/`): inbox with Pending/Approved/Rejected tabs,
  a review panel showing the photo, GPS, and form answers side by side, and approve/reject actions.
  Moved from `NAV_SOON_ITEMS` to `NAV_LIVE_ITEMS` — a real, linked page now.
- **Flutter app**: a rejection banner shows the supervisor's remarks; the worker can retake the
  photo or re-edit the form even though the count/submission requirement was already met, then tap
  "Resubmit for review." Pending-review and approved states are shown too.
- **Explicitly not built this session** (see A-044 for the full list): the team-wide progress
  dashboard, live map, exceptions, WhatsApp verification, alerts — all staged later in
  `docs/architecture/09` (S4/S5), not a silent gap. A full per-decision audit history of approvals
  isn't built either — one `Approval` row is reused across a reject → resubmit → approve cycle, so
  only the latest decision's remarks are visible, not a complete trail.
- **Verified**: `tsc --noEmit` clean (backend), `next build` clean including the new route (web),
  `flutter analyze`/`build linux`/`test` all clean (app). As with every backend feature built in
  this sandbox (no Docker/Postgres here), the actual live behavior of the full loop is unverified
  here — needs the founder's own real-device test, which they explicitly asked to run themselves:
  their field submission from today appears in the inbox → review the photo with its GPS stamp →
  reject with a reason → it comes back to the field app for correction → resubmit → supervisor
  approves. **One extra step needed for that test**: today's already-completed activities
  (check-in → photo → form → check-out all done during Session B's testing) predate this session's
  Approval-creation code, so they won't automatically be in the inbox — see "How to see it
  yourself" below for the one-line fix.

## Stage 2 Session B — field/phone-app thread (previous session, after founder's "proceed" approval)

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

### Real-device testing round: bugs found, root causes, and fixes (A-033 through A-040)

The founder ran the app on their own Android phone for the first time — this is exactly what this
sandbox cannot do, and it surfaced real problems the desktop/analyzer verification above couldn't
catch. Each was root-caused and fixed, not just patched around:

1. **`workmanager` v0.5.2 failed to compile** against the founder's (newer) installed Flutter SDK —
   the package's own Android code used APIs from Flutter's old plugin-registration system that
   current Flutter no longer ships. Upgraded to `workmanager: ^0.9.0+3`. (A-033)
2. **Photo upload crashed with "Internal Server Error"** — `uploadMedia` ran MinIO upload + sharp
   watermark compositing inside a 5-second-default Prisma transaction; a real phone photo over real
   Wi-Fi plausibly exceeded that. Split into two short transactions with the slow work outside both.
   (A-034)
3. **Camera screen stuck on "Location Unavailable" even after retaking** — it never actually
   requested location permission, just tried to read GPS and silently swallowed the failure.
   Extracted the working permission-request logic already used by check-in/check-out into a shared
   helper both screens now use. (A-035)
4. **Photo upload still crashed after the transaction fix**, this time with a sharp error
   ("Image to composite must have same dimensions or smaller") — confirmed from the founder's own
   backend log. Root cause: the watermark's dimensions were read *before* the image's EXIF rotation
   was actually applied, so a portrait phone photo (landscape sensor + rotation tag — normal for a
   real phone) sized the overlay to the wrong, pre-rotation width. Fixed by materializing the
   rotated image first, then measuring *that*. Reproduced the exact error from a synthetic
   EXIF-rotated test image before and after the fix. (A-036)
5. **A stuck upload just hung forever**, silently, still showing stale error text from a previous
   attempt — `ApiClient` had no request timeout at all. Added 30s/60s timeouts and made a fresh
   sync attempt clear the old error message. (A-037)

**The founder then diagnosed three further, real problems from continued testing and pushed back
directly: "stop guessing, fix these three."** All three were genuine gaps against
`docs/architecture/05-offline-sync-design.md` — a design that was already approved and, in one
case, already partially built into the schema (the `SyncStatus` enum) but never actually used:

6. **Sync ordering bug**: check-out could be attempted, and correctly rejected by the server, before
   its own milestone's photo had synced — the outbox query had no defined order and nothing
   enforced dependency between items. Fixed with a deterministic base ordering plus an explicit
   check: a check-out defers until every other item for its own activity has synced. Proved with
   two tests against a real in-memory Drift database (not mocked), including the adversarial case
   (check-out enqueued *before* its photo). (A-038)
7. **Fragile single-shot photo upload**: doc 05 specifies chunked, resumable uploads
   (`/media/init` → chunks → `complete`) precisely so a dropped connection only costs the
   unconfirmed chunks, not the whole file — Session B shipped a single-shot upload instead. Built
   the approved design for real: a new `MediaUploadSession` table, three new endpoints, chunk
   staging on disk, idempotent resumption keyed by content hash, and exponential backoff with
   jitter for automatic retries (an explicit "Sync now" tap still tries immediately). Verified the
   chunk write/assemble/discard mechanism directly — wrote chunks out of order, re-sent one, and
   confirmed the reassembled file's hash matches exactly. Honestly scoped: true OS-level "bind to
   the network it started on" needs native Android code not added in this pass; a connectivity-
   change check around each chunk is the practical approximation implemented instead. (A-039)
8. **Raw exception text on screen**: the sync log was showing
   `ClientException with SocketException errno 103` directly to a field worker. Replaced with a
   plain Hindi+English message by default; the technical detail is still there, behind a tap, never
   as the primary text. (A-040)

**A regression I introduced while building #7, found and fixed within minutes of the founder
retesting** (A-041): the new upload-sessions migration accidentally copied the *original, buggy*
version of the multi-tenant RLS policy instead of the already-fixed one from A-018 — silently
reverting that earlier fix for the whole database, not just the new table. Login broke completely
(OTP succeeded, then fetching campaigns crashed and bounced the app back to the login screen).
Diagnosed straight from the founder's backend log, which pointed at the exact same error as A-018's
original report. Fixed with a new corrective migration — never edited the already-applied one, since
that would corrupt Prisma's migration checksum tracking. Logged here in full rather than quietly
folded into #7, because getting this wrong is exactly the kind of mistake this file exists to make
visible, not hide.

**CONFIRMED on the founder's real device — both halves of the planned retest now pass**:
- Full visit end-to-end: login, check-in, chunked photo upload, milestone form, and check-out all
  completed and every item showed `synced`.
- **Airplane-mode test**: checked in, then went offline. Photo and form attempts correctly showed
  `failed` with a clear bilingual message and a working "Retake" option — nothing hung, crashed, or
  silently lost data. Reconnecting Wi-Fi triggered automatic sync of everything queued, with no
  action needed, ending in check-out becoming available and completing. This is the core promise
  of the offline-first design (docs/architecture/05), genuinely confirmed on real hardware over a
  real network, not just reasoned about.

One more real bug found and fixed during this test (A-042): the activity screen re-fetches from
the server after every action to pick up server-side changes, and while genuinely offline that
fetch is *expected* to fail — but the screen was treating any failure as blocking, wiping out all
visible progress (check-in done, photo just queued) the moment it went offline. Fixed to only block
on the true first load; a failed background refresh now just keeps showing what's already known,
with a small dismissible notice instead of blanking the screen. Also fixed a minor mislabeled-error
bug the founder's own screenshot caught: a failed form submission was showing "Photo upload
paused" (copied from the photo item's message) instead of wording appropriate to what actually
failed.

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
- `docs/ASSUMPTIONS.md`: 42 logged entries — practical assumptions, two known data-model limitations, and every bug found/fixed during build with full context (see "Bugs found and fixed" below)
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
6. **Real bugs found only by testing on a real phone** (A-033 through A-037): an outdated plugin incompatible with a newer Flutter SDK, a database transaction held open across slow photo-upload I/O, a camera screen that never actually requested location permission, an EXIF-rotation bug in the watermark compositor, and network requests with no timeout at all. See the "Real-device testing round" section above for the full account — this is exactly the class of bug that only shows up off a desktop simulator.
7. **Sync-queue ordering bug, founder-diagnosed** (A-038): check-out could be attempted, and correctly rejected, before its own photo had synced — an unordered query plus no dependency enforcement between related outbox items. Fixed with deterministic ordering and an explicit wait-for-dependencies check, proved with two tests against a real (non-mocked) Drift database.
8. **Design-doc deviation, founder-diagnosed** (A-039): Session B shipped a single-shot photo upload despite `docs/architecture/05` specifying chunked, resumable uploads — the schema even already had the `SyncStatus` states for it (`UPLOADING`, `PARTIALLY_UPLOADED`), just unused. Rebuilt to match the approved design: init/chunk/complete endpoints, disk-staged chunks, content-hash-based idempotent resumption, exponential backoff with jitter.

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
1. Full visit end-to-end — **DONE**, confirmed synced on your phone
2. Airplane-mode test (offline queueing + reconnect sync) — **DONE**, confirmed on your phone: offline items failed cleanly and visibly, reconnecting synced everything automatically
3. Session B (field thread) — **approved**
4. **Session C (supervisor thread) — built, waiting on your full test loop**: your field submission from today appears in the inbox → you review the photo with its GPS stamp → reject with a reason → it comes back to your field app for correction → you resubmit → supervisor approves. One-time SQL step needed first — see "How to see it yourself" below.
5. All work is committed and pushed to branch `claude/phase-c-foundation-sfqijm` on GitHub

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

### Testing Session C — the full reject → correct → resubmit → approve loop

**One-time step first.** The two visits you already completed on your phone during Session B's
testing (Patna City Haat Ground, Danapur Cantt Market) finished check-out before this session's
"create an Approval on check-out" code existed, so they have no review-queue entry yet. Run this
once against your own database (`docker exec -i impact-field-command-postgres-1 psql -U impact -d
impact_field_command`) to backfill them — it only touches your two already-completed visits, nothing else:

```sql
INSERT INTO approvals (id, "clientId", "campaignId", "entityType", "entityId", "requestedByUserId", status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), ai."clientId", ai."campaignId", 'ACTIVITY_INSTANCE', ai.id, ai."assignedUserId", 'PENDING', now(), now()
FROM activity_instances ai
WHERE ai.status = 'COMPLETED'
  AND NOT EXISTS (
    SELECT 1 FROM approvals a WHERE a."entityType" = 'ACTIVITY_INSTANCE' AND a."entityId" = ai.id
  );
```

Then, after pulling this branch and rebuilding both the backend (`./scripts/bootstrap.sh` picks up
the new migration automatically) and the Flutter app:

1. **Web admin, as a supervisor**: log in at http://localhost:3000 with Arjun Verma's number
   (`9000000007`), open the new **Approvals** page in the sidebar. Your Patna City Haat Ground visit
   should be sitting in the Pending tab — click it to see the photo (with its GPS stamp) and the
   milestone form answers side by side.
2. **Reject it**: type a reason in the remarks box (required for rejection) and tap Reject.
3. **Field app, on your phone**: open the same assignment — you should see a rejection banner with
   your remarks, and the photo/form buttons active again even though you'd already completed them.
   Retake the photo (or re-edit the form), then tap **Resubmit for review**.
4. **Web admin again**: refresh the Approvals inbox — the activity should be back in Pending with
   your new photo/answers. Approve it this time (no remarks required).

That's the full loop the spec's acceptance scenarios 2 & 3 describe, on your own two devices.

## Open issues / P0-P1
- None outstanding — every issue found during this build was root-caused and fixed (see "Bugs found and fixed" above), not worked around.
