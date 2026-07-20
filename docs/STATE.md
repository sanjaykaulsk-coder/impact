# STATE.md — IMPACT FIELD COMMAND

**Last updated:** 20 July 2026 · **Phase:** C — approved. **Stage 2 (A, B, C) — ALL COMPLETE. Stage 3 (3.1–3.4) — ALL APPROVED. Full database security hardening — DONE, verified. Stage 4.1 (GPS/route/deviation engine, backend + admin half) — APPROVED. Stage 4.2 (Flutter continuous GPS + on-device deviation warning) — starting.**

## Stage 4.1 — GPS/route/deviation engine (this session, after founder approved Stage 3.4)

Per `docs/architecture/09-mvp-build-sequence.md` S4.1 and spec §14: PostGIS tolerance checks,
deviation request → supervisor decision → escalation, route trace.

**Scope note, decided this session (A-059):** this covers the backend engine and the supervisor's
web review screen — the same kind of thread-split Stage 2 used (admin/field/supervisor as separate
sessions). Continuous GPS tracking *on the phone itself*, and the on-device "you've gone off-plan,
explain why" warning screen, are a distinct, larger piece of client engineering — not touched this
session, explicitly queued as the next slice, not silently skipped.

- **Real PostGIS distance checks, replacing the placeholder math that had stood in for them since
  Session B.** Check-in's "how far from the planned spot" number, and every new GPS point's
  distance check, now run a genuine database distance calculation instead of a hand-rolled formula
  — exactly what the build-sequence line calls for.
- **New: continuous location can now be recorded and checked** — a new endpoint accepts a batch of
  GPS points for an ongoing activity, checks each one against the planned location and the
  campaign's tolerance setting, flags anything moving unrealistically fast, and groups the points
  into a running "route trace" for that visit.
- **New: the deviation-request workflow is real, not just modeled.** A field worker can submit a
  reason for going off-plan (wrong location, late arrival, etc.) — the activity is never blocked or
  paused by this, exactly as designed. It lands in a new **Deviations** screen for supervisors,
  who can approve, reject (with remarks), or escalate it. Every decision is permanently recorded
  (reusing the same tamper-proof history mechanism built for Stage 3.4's PJP changes).
- **A real, previously invisible gap found and fixed**: the "route trace" database table had never
  had the security backstop the founder asked to have added to every other client-data table back
  in the "fix it now" decision — because nothing had ever written to it before, so the gap was
  invisible until this session was about to become its first real user. Fixed before any data
  exists in it, at zero cost or risk.
- **Automatic timed escalation (spec's 0/15/30/60-minute ladder) is not built this session** — that
  needs a scheduling system this project doesn't have yet, and building just enough of one for this
  single feature would be wasted, throwaway work ahead of a later stage that needs to build it
  properly for several features at once. A supervisor can escalate a stuck request by hand today;
  automatic promotion is queued for later.
- **Verified**: backend and web build clean; full regression test suite still 13/13; every new
  piece tested live against a real running backend — including proving an out-of-tolerance point,
  an unrealistic speed, and an "impossible jump" between two GPS readings all get correctly flagged
  (and a normal reading correctly doesn't); a route trace correctly links every point to it,
  including a bug in that exact linking that was caught and fixed before this was called done, not
  left for you to find; a submitted deviation correctly appears in the new Deviations screen,
  gets escalated, decided, and the decision correctly can't be changed afterward.

## Stage 3.4 — PJP management depth (previous session, after founder approved Stage 3.3)

Per `docs/architecture/09-mvp-build-sequence.md` S3.4 and spec §13: edit / cancel / postpone /
reschedule / reassign a planned visit, with full change history, plus sample upload templates.

- **No schema migration needed** — `PJPRow.status` already had all four states this needed
  (`ACTIVE`/`CANCELLED`/`POSTPONED`/`RESCHEDULED`) since the very first foundation session. The
  `audit_logs` table also already existed (spec §37's immutable-audit-log requirement, called out
  in CLAUDE.md as day-one architecture) but nothing had ever written to it before — this stage adds
  the first real writer, a small shared `AuditService`, and every PJP row action from here now
  leaves a permanent, unchangeable record of exactly what changed, when, and by whom.
- **Backend**: five new actions per PJP row — edit (location/contact/remarks/sequence), cancel,
  postpone (short delay, same plan), reschedule (a plan change, may move sequence too), and
  reassign supervisor — plus a history endpoint that reads back every change ever made to that
  row. A stop that already has field activity genuinely in progress or completed can no longer be
  edited, cancelled, postponed, or rescheduled (protects the field record from becoming
  inconsistent with what actually happened); reassigning the supervisor is deliberately exempt
  from that lock, since a mid-day handover is a normal, legitimate need.
- **Web admin**: the PJP detail view now shows each stop's status and current supervisor, with a
  "Manage" button opening edit/cancel/postpone/reschedule/reassign/history in place. A "Download a
  sample CSV" link on the upload screen gives a ready-to-fill template (opens directly in Excel).
- **Explicitly not built this session**: team reassignment (only supervisor) — there's no Team
  management feature anywhere yet to pick a team from, so a team picker would point at nothing;
  and a separate multi-stop Route entity — this stage covers a single visit's own fields, not a
  bigger structured route object, matching what the build-sequence document actually calls for at
  this stage.
- **Verified**: backend `tsc --noEmit` clean; `next build` clean; all six new endpoints tested live
  against a real running backend and a real logged-in session — including proving the
  in-progress-activity lock actually blocks edit/cancel/postpone/reschedule but correctly still
  allows reassigning the supervisor, and reading back a correct, time-ordered history for a row
  that had been edited, postponed, and rescheduled in sequence; full backend test suite still
  13/13; QA grep clean.

## Stage 3.3 — activity template library (previous session, after founder approved Stage 3.2)

Per `docs/architecture/09-mvp-build-sequence.md` S3.3 and spec §9.4: all 16 named campaign
templates as real configuration, and "campaign-level override behaviour" — applying a template
never modifies the master.

- **No new database tables needed** — `ActivityType`, `ActivityTemplate`, and `CampaignActivity`
  already existed from the very first foundation session, fully shaped for exactly this (including
  a `defaultConfigJson`/`configJson` pair), just never used by any real feature until now.
- **Backend**: all 16 templates seeded as real rows — Van Campaign, Roadshow, Exhibition, Event,
  Mela Stall, Mela Branding, Wholesale Activation, Retail Sales, Trial Generation, Seeding
  Programme, Bike Activation, School Campaign, Haat Campaign, Retail Branding, Retail Recce, Custom
  Activity. Four (Van Campaign, Mela Stall, School Campaign, Retail Branding) use the real
  milestone lists spec §16 itself gives as examples; the other twelve get an honest, generic
  two-milestone starter since the spec never lists their milestones — flagged, not disguised as
  equally detailed. New `GET .../activity-templates` (browse) and `POST .../activity-templates/apply`
  (apply to the current campaign) — applying reuses Stage 3.2's `WorkflowsService.upsert()`
  directly, so it automatically inherits that screen's safety guard (refuses to replace a workflow
  while any activity is mid-visit) rather than needing a second copy of that logic.
- **Web admin**: new **Activity Templates** page — a card per template with an "Apply to this
  campaign" button, clearly warning it replaces the campaign's current workflow before it proceeds
  (confirmation dialog), and pointing the admin to Workflow Builder afterward to review/customize
  what got generated.
- **Explicitly not built this session**: an editor for the master template library itself (adding
  a 17th template, or changing what a given template defaults to) — the 16 are fixed seeded
  content today; a new one is a future ask, same posture as Stage 3.1's report archetypes.
- **Verified**: backend `tsc --noEmit` clean; the seed script re-run with real type-checking
  (not the fast/unchecked mode) against a live Postgres, confirmed all 16 templates present with
  correct content; the list and apply endpoints tested live end-to-end against a real running
  backend — applying a template genuinely built a real workflow with the right stages and
  milestones, and correctly refused when a live activity was in the way, proving the reused
  Stage 3.2 guard actually fires, not just compiles; `next build` clean; the full backend test
  suite still passes 13/13 after the change.

## Stage 3.2 — workflow builder, milestone engine, SOP checklists (previous session, after founder approved Stage 3.1 and said "start stage 3.2")

## Database security hardening — full backstop closed (this session, founder decision)

The founder asked for a plain-language explanation of the known database security gap (first found
in Stage 2, tracked as A-043) and decided: fix it in full now, rather than patch it piecemeal as
future stages happen to touch one of the affected tables.

**In plain terms:** the system has two locks that keep one client's data separate from another's.
Lock #1 is the everyday app code — always active, already tested by the founder. Lock #2 is a
backup check built into the database itself, so that even if a bug ever slipped past Lock #1, the
database would refuse to hand over the wrong client's data anyway. 15 tables (things like route
plans, stock reports, sales reports, attendance records) only had Lock #1. All 15 now have both.

No real client data was ever at risk — everything in the system today is demo/test data — but the
next few build stages (trip planning, GPS tracking, sales & stock reporting) would have built
directly on several of these unprotected tables, making the eventual fix bigger and riskier the
longer it waited. It's done now, verified working, at no cost to the founder beyond the normal pull
and rebuild.

Migration `20260719070000_full_tenant_isolation_hardening`. Full detail in `docs/ASSUMPTIONS.md`
(A-051) for anyone who wants the technical record — every table in the system that holds
campaign-specific data now has the database-level backstop, not just the app-level one. Confirmed
by running the full backend test suite (13 tests) against a real database with this protection
switched on, all passing, and by directly checking the database itself that the protection is
active on every one of the 15 tables. Nothing else changed — no screens, no behavior, purely a
behind-the-scenes safety improvement.

## Stage 3.2 — workflow builder, milestone engine, SOP checklists (this session, after founder approved Stage 3.1 and said "start stage 3.2")

Per `docs/architecture/09-mvp-build-sequence.md` S3.2 and spec §§11/12/16: configurable stages
(add/remove/reorder, role assignment, approval rules, `allowIncompletePreparation`), the milestone
engine (binding a stage's milestones to any of the campaign's PUBLISHED forms, with per-milestone
mandatory photo/GPS/signature/KPI settings), and the pre-activity SOP checklist module with its
five-status readiness view.

- **Closes the gap flagged at the end of Stage 3.1**: nothing built in S3.1 (the SKU Master, the
  archetype form presets) had a path onto the phone, because the field app's milestone flow only
  ever saw the one form the seed script hard-wired. Now an admin can build a real workflow in the
  web builder, bind a stage's milestone to any published form — including an S3.1 archetype form —
  and it reaches the phone the same way the Session B milestone always has. This is real, but it's
  still a single-milestone-per-activity flow (see "explicitly not built" below).
- **A second RLS gap fix, same pattern as Session C's `Approval` fix (A-043/A-049)**: this session
  builds directly on `Workflow`, one of the 16 tables A-043 flagged as missing the tenant-isolation
  backstop. Fixed in migration `20260718090000_workflow_client_id_sop_checklist` — unlike
  `Approval`, `Workflow` already had seeded rows, so this needed a real backfill (`UPDATE ... FROM
  campaigns`), not just `ADD COLUMN NOT NULL` on an empty table. Verified live against the local
  Postgres: RLS policy present, spatial indexes untouched, backfill correct. 14 of the original 16
  gap tables remain, logged as before.
- **Backend** (`backend/src/modules/workflows/`): the whole workflow tree (stages → milestones →
  role assignments → approval rule → SOP checklist items) is replaced on every save, mirroring the
  proven `FormsService.upsertDraft` pattern. One workflow per campaign, enforced in the service
  layer. Editing is blocked while any activity is `PLANNED`/`IN_PROGRESS` against the current
  workflow, so an edit can never silently orphan a field worker mid-visit. New SOP checklist
  models (`SopChecklistItem`/`SopChecklistResponse`, RLS-covered from their first migration) plus
  a mark-item endpoint on the execution side, and check-in is now blocked when a stage's
  `allowIncompletePreparation` is false and mandatory items are unresolved — spec §11's own
  explicit rule, opt-in, not the default.
- **Readiness view**: a pure, unit-tested rollup (`workflows/readiness.ts`) into spec §12's exact
  five statuses (Completed/Pending/Delayed/At risk/Not applicable) — the spec names the values but
  not their triggers, so a documented practical reading was used (see A-048). Served at
  `GET .../workflow/readiness` and shown on the new **Readiness** web page.
- **Web admin**: new **Workflow Builder** page (stages, milestones with a form-version picker
  restricted to published versions, role checkboxes, approval-rule toggle, SOP checklist editor)
  and new **Readiness** page (date-filtered, read-only).
- **Flutter app**: the activity screen now shows a pre-activity checklist (when the current stage
  has one) before check-in, with Done/N/A buttons per item; a blocked check-in surfaces the
  backend's exact reason (which items are still outstanding).
- **Explicitly not built this session** (see A-050 for the full accounting): true multi-stage
  progression on the phone — the field app still executes exactly one stage's milestones per
  activity, same as Session B; the multi-level approval escalation ladder from spec §14 (only a
  single required-approver role is recorded here, no chain or timeout); offline support for SOP
  checklist marking (a direct online call today, same tradeoff already accepted for `resubmit()`).
- **Verified**: backend `tsc --noEmit` clean; `next build` clean (two new routes); `flutter
  analyze` 0 issues, `flutter test` all passing, `flutter build linux` clean; the full backend test
  suite — S3.1's 7-test acceptance gate plus this session's 6-test readiness-rollup unit suite —
  passes **13/13** against the real local Postgres (this build container has PostgreSQL 16
  installed, A-045), including a fixture fix the S3.1 suite needed once `Workflow.clientId` became
  required. Zero database residue after a run. **What's still unverified**: the founder's own
  hands-on test — build a real workflow, bind an S3.1 archetype form to a milestone, run the whole
  thing on the phone — needs their device time, same as every prior stage.

## Stage 3.1 — dynamic form builder full, Campaign SKU Master, DFR/reconciliation reporting (previous session, after founder approved Stage 3 start)

Per `docs/architecture/09-mvp-build-sequence.md` S3.1 and `docs/reference/report-format-library.md`
in full — the scope explicitly listed for this stage: the full 35+ field-type form builder, the
Campaign SKU Master with movement types, record-level (Profile) capture with auto-computed DFR
aggregates, the four report-format archetypes as builder presets, and the §5 migration acceptance
test as the stage's completion gate.

- **A capability change worth noting**: this build container turns out to have PostgreSQL 16
  installed, so for the first time a real, fully-migrated Postgres ran inside the sandbox itself —
  all 9 migrations applied cleanly, the seed script ran, and the acceptance test below exercised
  genuine Row-Level Security through the same restricted `field_command_app` role production uses,
  not just `tsc --noEmit`. Docker/MinIO/Redis are still absent here, so the media pipeline and
  queue behavior remain founder-machine-only, same as every prior session.
- **Backend**: `CampaignSku` + `SkuMovement` (migration `20260717074734_campaign_sku_master`, RLS
  wired in from day one — the block was copied from the current correct source per A-041's lesson,
  and verified live, not just by inspection); a new `SkusModule` for SKU CRUD; `archetypes.ts`
  building the DFR/Profile/Stock-Reconciliation/Enquiry-Leads presets as real question trees bound
  to the campaign's active SKUs; `ExecutionService` now writes a `SkuMovement` row for every
  SKU-bound answer at submission time and raises an `Exception` immediately if a reported physical
  closing stock count disagrees with spec §22's formula; `ReportsModule` serves the DFR as a true
  rollup query (never a typed total) and the stock reconciliation view.
- **Web admin**: the Forms builder now offers the full field-type palette (grouped), per-field
  controls (min/max, character limit, photo count, video duration), regex validation with a
  message, and multiple conditional rules (previously one). New "Start from" archetype picker on
  form creation, and a "Sync SKU fields" action that rebuilds only a draft's SKU-bound sections
  after the SKU Master changes — published versions are never touched. New **SKU Master** page
  (create/edit/deactivate) and new **Reports** page (DFR + Stock Reconciliation tables, read-only,
  date-range filtered).
- **Flutter app**: the milestone form renderer now covers the full palette the web builder can
  produce — every text/number/date/choice/rating/identity-block type renders a real input;
  AUTO_CALCULATED fields show a live client-side preview of the SKU total they'll compute to.
  Media/signature/document types still route through the dedicated camera-only evidence flow
  rather than a second, weaker inline capture path — shown as an honest note, not a crash.
- **Migration acceptance test** (`backend/test/acceptance/report-format-library.spec.ts`, gate for
  this stage per report-format-library §5): **7/7 passing**, run twice consecutively against the
  real local Postgres with zero database residue after cleanup (the suite deletes every fixture it
  creates, honoring the standing QA rule even for its own test data). Covers: structural fidelity
  for 3 representative campaign types (Van/DFR+Profile, Mela stall/Stock-Recon, Retail
  Audit+Enquiry); DFR aggregate correctness to the cent (integer-cents comparison, not float
  equality, so a one-ulp drift can't silently pass); the §22 reconciliation formula plus the
  mismatch-raises-an-Exception behavior; a published `FormVersion`'s exact question set proven
  unchanged after a mid-campaign SKU addition and draft sync; and cross-tenant reads of the new
  SKU/movement tables returning zero rows through the real restricted database role.
- **Explicitly not built this session** (staged later per `docs/architecture/09`, not silent
  gaps): a workflow-builder UI to attach a new archetype form to a field milestone (S3.2 — so
  nothing built here is reachable from the phone yet; the acceptance test wires milestones at the
  service level only); the activity template library (S3.3); PJP management depth (S3.4); the
  sales/stock module's own UI on top of these tables (S4.3); Excel export in the workbook's layout
  (S5.4). See A-046/A-047 in `docs/ASSUMPTIONS.md` for the full design-decision and
  architecture-section accounting, including several practical assumptions logged per process
  rule 1 (e.g. how a quantity+amount pair becomes two additive movement rows, why SKU management
  shares the `manage_forms` permission).
- **Verified**: backend `tsc --noEmit` clean; web `next build` clean (new `/dashboard/skus` and
  `/dashboard/reports` routes, extended `/dashboard/forms`); Flutter `analyze` 0 issues, `test` all
  passing, `build linux` clean; acceptance suite 7/7 green. **Nothing in this stage has a
  founder-facing UI path to test on a real phone yet** — S3.2's workflow builder is what makes a
  new archetype form assignable to a milestone. What the founder CAN see today: log into the web
  admin, add SKUs under the new **SKU Master** page for the Bihar campaign (four demo SKUs are
  seeded — clearly a fictional Shakti product list, per the spec's Demo Data section), create a
  form from one of the four archetypes under **Forms** and see the generated question tree, and
  view the (currently empty, since no new data has been captured against it) **Reports** page.

## Stage 2 Session C — supervisor thread (previous session, after founder approved Session B)

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
  here — needed the founder's own real-device test, which they explicitly asked to run themselves:
  their field submission from today appears in the inbox → review the photo with its GPS stamp →
  reject with a reason → it comes back to the field app for correction → resubmit → supervisor
  approves. **This full loop was run and confirmed working by the founder on 17 July 2026, on
  their own devices, in both roles.** One extra step was needed for that test: the already-completed activities
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

## Next (after founder review of Stage 3.2)
- **Stage 3.3**: activity template library as configuration (all 16 templates, campaign-level override behaviour).
- **Stage 3.4**: PJP management depth (edit/cancel/postpone/reschedule/reassign with change history).
- Founder decisions still pending from Phase A (spec §08): production OTP provider, cloud region, first shadow-pilot campaign.
- 14 of the 16 tables originally missing the RLS `clientId` backstop (A-043) remain a known, logged gap — `Approval` (Session C) and `Workflow` (this session) are now both fixed; the rest are unscheduled.
- Two things this session deliberately deferred, not silently dropped (A-050): true multi-stage progression on the phone, and the full multi-level approval escalation ladder (spec §14).

## Open items for the founder
1. Stage 2 (Sessions A, B, C) — **approved and confirmed on your real devices**
2. Stage 3.1 (form builder + SKU Master + reporting) — **approved**
3. **Stage 3.2 (workflow builder + milestone engine + SOP checklists) — APPROVED**, 19 July 2026. You personally confirmed: the full reject → resubmit → approve loop on the web admin (Danapur Cantt Market, using the no-phone script to stand in for the field side); the Workflow Builder screen (attached a form to a milestone, added and saved a mandatory checklist item, added and saved a non-mandatory one, both survived a hard page reload); and the Readiness screen (correctly shows "no activities" for a date with nothing scheduled — working as designed, not broken).
4. **Database security hardening — DONE.** You asked for a plain-language recommendation and chose "fix it now" — it's fixed and verified.
5. **A no-phone testing tool exists now** (`backend/scripts/simulate-field-visit.mjs`, with a `--resubmit` mode) — plays a full field visit against your own backend without needing a phone in hand. Keep using it for future testing sessions.
6. **Stage 3.3 (activity template library) — APPROVED**, 19 July 2026. You personally confirmed on your own machine: the Activity Templates tab listing all 16 templates, applying "Mela Stall" to the Bihar campaign, and the resulting workflow (stage "Execution" with milestones Stall handover, Branding completed, Opening photo, Midday activity, and more) appearing correctly in Workflow Builder.
7. All work is committed and pushed to branch `claude/phase-c-foundation-sfqijm` on GitHub
8. **Stage 3.4 (PJP management depth) — APPROVED**, 19 July 2026 ("resume the build" → confirmed via clarifying question as approval to move to Stage 4).
9. **Architecture addendum (multi-angle analysis + unlimited templates) — answered, logged as A-058.** One open decision remains for later: whether the client self-service KPI-picker dashboard gets pulled into the main build now or stays a post-MVP add-on. Not blocking — flagged, not urgent.
10. **Stage 4.1 (GPS/route/deviation engine, backend + admin half) — APPROVED**, 20 July 2026. You personally confirmed: running the `--deviation` test script, seeing the resulting request appear on the new Deviations page with the right location/field-user/type, escalating it, and approving it with a comment — confirmed it correctly moved to the Approved tab.
11. **Stage 4.2 (Flutter continuous GPS + on-device deviation warning) is now starting** — this is the phone-side half of Stage 4.1: tracking location continuously during a visit (not just at check-in/check-out), and warning the field worker on the spot if they've gone off-plan, with a way to explain why right there in the app.

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

### Reviewing Stage 3.1 — SKU Master, form builder presets, reports

This stage has no new field-app screen — the workflow builder that would attach a new form to an
actual milestone is Stage 3.2, next. What you can look at today, in the web admin, after pulling
this branch and re-running `./scripts/bootstrap.sh` (it applies the two new migrations
automatically):

1. **SKU Master** (new sidebar item): select the Bihar campaign, and you'll see four demo products
   already seeded (Shakti Herbal Soap, Amla Shampoo, Power Detergent, Gold Tea — clearly fictional,
   per the spec's Demo Data rules) with MRP/selling price/pack size. Try adding one of your own,
   editing one, or deactivating one.
2. **Forms → + New form**: the "Start from" dropdown now offers Profile, DFR, Stock Reconciliation,
   or Enquiry/Leads, alongside a blank form. Pick "Profile" and it generates a full outlet-visit
   form with one quantity + one sales-value question per active SKU, plus an auto-calculated total
   — open it to see the generated question tree, or add a field yourself from the now-full type
   list (35+ types, grouped in the dropdown).
3. **Reports**: DFR and Stock Reconciliation tabs, date-range filtered — currently empty for real
   data since no new capture has happened against this yet (that arrives with Stage 3.2).

There's no SQL step needed for this one — it's additive, new tables only.

### Reviewing Stage 3.2 — build a real workflow and run it on your phone

Pull this branch and re-run `./scripts/bootstrap.sh` (applies the new migration automatically — no
SQL step needed here either, additive only). This is the first Stage 3 piece with something new to
actually test on your phone, since a milestone can now point at any published form you build.

1. **Web admin → SKU Master**: confirm the Bihar campaign still has its four demo SKUs (unchanged
   from Stage 3.1).
2. **Web admin → Forms → + New form**: create one from the "Profile" archetype if you haven't
   already, name it something like "Test Outlet Visit", then **Publish** it (the builder's Publish
   button) — a milestone can only bind to a *published* form, never a draft.
3. **Web admin → Workflow Builder**: you'll see the existing seeded "Bihar Van Outlet Visit
   Workflow" with its one stage and one milestone (exactly what Session B tested). Either edit that
   milestone's "Bound form" dropdown to point at your new Profile form, or add a second milestone —
   both are safe as long as no visit is currently `PLANNED`/`IN_PROGRESS` (the builder will refuse
   to save otherwise, with a clear message, rather than silently breaking an in-progress visit).
   While you're there, try adding a checklist item under "Pre-activity SOP checklist" and ticking
   "Allow check-in with incomplete preparation" off, to see the blocking behavior — then turn it
   back on before saving if you don't want check-in gated yet.
4. **Web admin → Readiness**: pick today's date — you'll see Rahul Kumar's assignment(s) listed
   with a status (Not applicable if the stage has no checklist yet, or Pending/At risk/Delayed once
   it does).
5. **Field app, on your phone**: open Rahul Kumar's assignment. If you added a checklist, you'll
   see it above the check-in button with Done/N/A buttons per item — mark them, then check in as
   usual. If you rebound the milestone to your new Profile form, the milestone form screen should
   now show real SKU quantity/sales-value fields per product, exactly like the ones you saw
   generated in the Forms page.

That closes the loop the founder's own words described when Stage 3.1 finished: something built in
config now genuinely reaches the phone.

### Reviewing Stage 3.3 — activity template library

Pull this branch (no new migration this time — no database change needed at all, so a plain
`git pull` + `./scripts/bootstrap.sh` is enough). This one's web-only, no phone needed:

1. Log in as Rohan Mehta (`9000000001`, Super Admin) and open **Activity Templates** in the
   sidebar. You'll see all 16 standard campaign types as cards — Van Campaign, Roadshow,
   Exhibition, Mela Stall, School Campaign, Retail Branding, and the rest.
2. Pick one you haven't used yet — **Mela Stall** is a good one, since it has a real milestone
   list (stall handover → branding → opening photo → midday activity → sales update → closing
   stock → final photo), not a generic placeholder.
3. Click **Apply to this campaign** — you'll get a confirmation warning first, since this replaces
   whatever workflow the campaign currently has (your Bihar campaign's existing "Outlet Visit"
   workflow, in this case).
4. Once applied, open **Workflow Builder** — you should see the Mela Stall milestones sitting
   there as a real, editable workflow, exactly as if you'd typed them in by hand.
5. If you want your original Bihar Van workflow back afterward, you can rebuild it manually in
   Workflow Builder, or apply the **Van Campaign** template instead — it has the same real
   milestone list your original Session B testing used (vehicle departure → location arrival →
   setup → activity start → demonstration → sales → closure → return).

### Reviewing Stage 3.4 — PJP management depth

Also web-only, no phone needed. No database change this time either.

1. Log in as Rohan Mehta (`9000000001`, Super Admin) and open **PJP Upload**. Click into the
   "Seed data — Bihar Van route" file to open it.
2. You'll now see a **Status** and **Supervisor** column on each stop, and a **Manage** button.
   Click Manage on any stop (e.g. "Patna City Haat Ground").
3. Try **Edit** — change the contact person or remarks, save, and see it update in the table.
4. Try **Postpone** — pick a new date and save. The stop's status badge should change to
   POSTPONED and its date should move.
5. Try **Reassign supervisor** — pick a name from the dropdown (anyone with a role on this
   campaign) and save.
6. Click **History** — you should see every change you just made listed newest-first, with who
   made it and when: reassign, then postpone, then edit.
7. Try **Cancel** on a different stop — confirm it moves to CANCELLED status.
8. On the upload screen, there's now a **"Download a sample CSV"** link — click it to see the
   ready-to-fill template you can hand to whoever prepares your route plans.

### Reviewing Stage 4.1 — GPS/route/deviation engine

This one needs the no-phone script, same as the reject/resubmit/approve test earlier — there's no
phone side built yet to test through the app itself (see the note above). Two terminal commands,
then everything else is in the browser.

1. In a fresh Terminal tab: `cd ~/Desktop/impact-field-command && git pull origin claude/phase-c-foundation-sfqijm`
2. Then: `node backend/scripts/simulate-field-visit.mjs --deviation`
   — this logs in as Rahul Kumar, checks in if needed, sends a GPS reading far from the planned
   spot, and submits a deviation request explaining why (a simulated "market relocated for the
   day" reason).
3. In the browser, log in as Rohan Mehta (`9000000001`) and open the new **Deviations** page in
   the sidebar.
4. You should see the new request — Danapur Cantt Market, "Outside permitted radius," with Rahul's
   explanation. Click it.
5. Try **Escalate** — the request should get a small "escalated ×1" badge in the list.
6. Try **Approve** (or Reject, with a remark) — the request should move out of the Pending tab.
   Check the Approved (or Rejected) tab to confirm it landed there.
7. Optional: run the script again — it reuses the same Danapur visit, so you can generate another
   test deviation any time you want to re-test the screen.

## Open issues / P0-P1
- None outstanding — every issue found during this build was root-caused and fixed (see "Bugs found and fixed" above), not worked around.
