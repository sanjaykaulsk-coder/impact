# HANDOVER — IMPACT FIELD COMMAND

**For the tech team taking this over.** This document explains what the project is, how it works,
how to get it running, and what to know before you start changing things. Read this first, then
use the pointers at the end to go deeper on any specific area.

---

## 1. What this is

A configurable, multi-client field-execution platform for Impact Communications, a rural
marketing/activation agency in India. It has three parts that all work together:

- **A Flutter Android app** for field workers (promoters/vans doing on-ground activations) —
  login, see their assigned visits for the day, check in with GPS, take evidence photos, fill
  campaign-specific forms, and sync it all back (works offline, syncs when connectivity returns).
- **A Next.js web admin portal** for Impact's own staff — set up clients and campaigns, design the
  data-collection forms and workflows per campaign, upload/assign route plans (PJPs), monitor
  activity live, review and approve field submissions, run reports.
- **A NestJS backend API** both of the above talk to, backed by PostgreSQL + PostGIS, Redis, and
  S3-compatible object storage (MinIO locally).

**Campaigns are configuration, not code** — the same app and backend serve every client and
campaign; what differs is data (forms, workflows, branding, targets), not a code fork.

The full functional specification is `docs/FIELD_COMMAND_SPEC.md` — that is the source of truth for
*what* the product does. This document is about *how it's built* and *how to work on it*.

## 2. Current status

Everything in the original spec's MVP scope (20 modules, all 7 acceptance scenarios) is built and
was confirmed working by the founder before handover — including a full round-trip on a real
physical Android phone, not just an emulator.

All six items originally identified as "Post-MVP backlog" are also built and confirmed:

1. PDF/PowerPoint report exports
2. Configurable dashboard engine for clients (self-service KPI picker)
3. Offline map corridors (field app shows a route map that works with no signal)
4. Perceptual duplicate-photo detection (catches a field worker reusing an old photo)
5. Regional languages — real English/Hindi translation throughout the field app, with a language
   switcher, not just a fixed default
6. AI image analysis — real photo-quality checks (blur/exposure/resolution) on-device and
   server-side, plus a new "Media Review" supervisor screen, plus a placeholder (clearly marked
   MOCK) adapter for a future real content-classification AI service

Beyond that: real State/District suggestions and an interactive map picker were added to the PJP
(route plan) admin screen, based on direct founder feedback during testing — this was not in the
original backlog list.

**`docs/STATE.md`** is the single most useful file for "what's actually built, in what order, and
what was tested how" — it's a running log, most recent work at the top. **`docs/ASSUMPTIONS.md`**
is the parallel log of every non-obvious decision, workaround, and bug found/fixed, with reasoning
— read it before assuming something is a bug; it may be a documented, deliberate choice.

**Not built, and explicitly out of scope for this codebase:** "Impact IQ" — a separate future
system that will analyze the operational data this system collects (predictive trends, vendor
performance scoring, etc.). This system's job is to produce clean, exportable data for that; it
does not do the analysis itself (spec §33/§40).

## 3. Locked technical decisions

These were fixed at project start and used consistently throughout — don't re-litigate them
without a real reason:

| Layer | Choice |
|---|---|
| Android app | Flutter — Riverpod (state), GoRouter (nav), Drift (encrypted offline DB), WorkManager (background sync) |
| Web (admin/supervisor) | Next.js + TypeScript |
| Backend | NestJS + TypeScript, modular monolith (one deployable, cleanly separable modules) |
| Database | PostgreSQL 16 + PostGIS, Prisma ORM, UUIDs everywhere |
| Cache/queue | Redis + BullMQ |
| Media storage | S3-compatible object storage (MinIO locally) — signed URLs, originals and watermarked copies kept separate, binaries never stored in Postgres |
| Maps | OpenStreetMap throughout (field app offline corridors, web map picker) — free, no API key, no vendor lock-in. Google Maps is only ever used as an external "open in..." link, never embedded |
| Notifications | Adapter interfaces with MOCK providers in development (OTP, WhatsApp) — real credentials are never in code |
| Deployment | Docker Compose locally; a real cloud environment (India-region, per spec) is a future step not yet built |

## 4. Repo layout

```
backend/   NestJS API (modular monolith) — see backend/src/modules/* for one folder per feature
web/       Next.js admin + supervisor + command centre — web/src/app/dashboard/* is one folder per screen
app/       Flutter field application — app/lib/features/* is one folder per screen area
shared/    TypeScript types shared between backend and web (imported as @impact/shared)
           NOTE: the Flutter app does NOT share these — it hand-maintains its own mirror in
           app/lib/core/api/models.dart, since there's no cross-language codegen step. If you
           change an API response shape, update both.
docs/      Spec, state log, assumptions log, architecture pack (see §7 below)
scripts/   bootstrap.sh (one-command local setup), qa-grep.sh (placeholder/mock-content scanner)
```

Package manager is **pnpm**, with a workspace covering `backend`, `web`, and `shared` (see root
`package.json` / `pnpm-workspace.yaml`). The Flutter app is a separate toolchain, not part of the
pnpm workspace.

## 5. Getting set up locally

### Backend + web admin

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Node.js 20+](https://nodejs.org/).

```bash
./scripts/bootstrap.sh
```

This copies `.env.example` → `.env` (and into `backend/.env`, `web/.env.local`), installs
dependencies, starts Postgres+PostGIS/Redis/MinIO in Docker, runs migrations, seeds realistic demo
data (three fictional clients, four campaigns, ~16 users across every role), and starts both
servers. Leave it running; `Ctrl+C` stops it. Re-running it later is safe — it won't re-seed or
re-copy env files that already exist.

- Web admin: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- MinIO console: http://localhost:9001

To restart the servers without re-running the whole bootstrap (Docker containers already up):
```bash
pnpm dev   # from repo root — runs backend + web concurrently
```

**Demo login** — mock OTP, the code is shown on screen and printed to the backend console, no real
SMS is ever sent. A few useful accounts (full list in `docs/STATE.md`):

| Mobile | Name | Role |
|---|---|---|
| 9000000001 | Rohan Mehta | Super Admin — sees everything |
| 9000000009 | Rahul Kumar | Promoter — the field-app persona |
| 9000000007 | Arjun Verma | Activity Supervisor |
| 9000000014 | Rajesh Agarwal | Client Administrator |

### Flutter field app

Requires the [Flutter SDK](https://docs.flutter.dev/get-started/install) and either an Android
emulator (via Android Studio) or a physical Android phone with USB debugging enabled.

```bash
cd app
flutter pub get
flutter run   # pick your emulator/device when prompted
```

**JDK version matters.** A modern system JDK (e.g. JDK 21+/26) is often too new for this project's
pinned Gradle version and will fail with `Unsupported class file major version ...`. Install JDK 17
alongside whatever else you have, and point Flutter at it specifically:
```bash
flutter config --jdk-dir=/path/to/jdk-17
```
Setting `JAVA_HOME` alone is not enough — Flutter's own config needs to point at it too.

**Emulator vs physical device — API base URL:**
- Android emulator: no flag needed, the app defaults to `http://10.0.2.2:4000/api/v1` (the
  emulator's special alias for the host machine).
- Physical phone on the same network: `flutter run --dart-define=API_BASE_URL=http://<lan-ip>:4000/api/v1`
- Physical phone via USB (no shared Wi-Fi needed, most reliable for testing): run
  `adb reverse tcp:4000 tcp:4000` once per connection, then
  `flutter run --dart-define=API_BASE_URL=http://localhost:4000/api/v1`

## 6. How the system actually works

### Multi-tenancy — two independent layers

Every campaign-specific table carries `clientId` and, where relevant, `campaignId`. Isolation is
enforced **twice**, deliberately:

1. **Application layer** — `CampaignScopeGuard` on every campaign-scoped controller checks the
   caller actually has a role in the requested campaign; `PrismaService.runInTenantContext(clientId, fn)`
   wraps the actual query in a real transaction that sets a Postgres session variable
   (`set_config('app.tenant_id', ...)`) for the duration of `fn`.
2. **Database layer (Postgres Row-Level Security)** — every tenant-scoped table has a
   `tenant_isolation` RLS policy that reads that same session variable. If the application layer
   ever had a bug that forgot to scope a query, the database itself would still refuse to return
   another client's rows. This was completed as a deliberate hardening pass across every
   campaign-data-bearing table (see `docs/STATE.md`'s "Database security hardening" entry) — it is
   not partial.

A small number of endpoints legitimately need to bypass tenant scoping (e.g. "give me my own user
profile across every campaign I'm in") — these use `runWithBypass`, always hard-filtered to the
caller's own id, never client-controlled input. Every such bypass is commented explaining why.

### Auth flow

Mobile number → OTP (mock provider in dev, logs the code rather than sending SMS) → device
fingerprint check (each account allows a configurable max of simultaneously-active devices; a new
device beyond that limit is registered `PENDING_APPROVAL` and refused login until cleared) → JWT
access token (15 min) + refresh token (30 days, rotates on every use — presenting an
already-used refresh token is treated as compromised and clears the session).

### Field app flow (the Flutter app)

Login → device check → pick a campaign (if more than one) → home screen (today's assignments,
attendance, route map) → tap an assignment → GPS check-in → mandatory evidence photo (camera-only,
never a gallery picker — this is a deliberate anti-fraud constraint) → campaign-specific dynamic
form → GPS check-out → synced to the server. Everything after check-in works fully offline: writes
go into a local encrypted queue (Drift) and sync out via WorkManager + a manual "sync now," with
exponential backoff on failure. The UI always reads from local state first, never blocks on network.

### Web admin flow

Client → Campaign → Activity Template → Workflow/Milestones → Dynamic Form Builder → branding →
PJP (route plan) upload or manual entry → Assignment (link a user to a planned stop) → publish.
Then, ongoing: Live Map / Overview for monitoring, Approvals for reviewing field submissions,
Device Risk / Media Review for fraud-adjacent signals, Reports for Excel/PDF/PPT exports.

### Risk/fraud-detection signals (not full prevention — spec is explicit that absolute prevention
on a personally-owned phone is impossible)

A device accumulates risk level (`L1_WARNING` → `L4_BLOCKED`, never downgrades automatically) from
signals: clock mismatch vs server time, GPS jump implying mock/spoofed location, and a photo whose
perceptual hash closely matches one already uploaded by the same device (a re-used old photo).
Rules are configurable per campaign. A supervisor clears or blocks from the Device Risk page.

### Offline-first media pipeline

Photos upload via a chunked, resumable protocol (`init` → chunked POST → `complete`, hash-verified)
— not single-shot — specifically so a dropped connection mid-upload resumes rather than restarting.
On completion, the backend computes a perceptual hash (duplicate detection) and real quality metrics
(blur/brightness/resolution) and stores a permanent watermark (GPS/time/user burned into the image)
separately from the original.

## 7. Where to find more detail

- **`docs/FIELD_COMMAND_SPEC.md`** — the complete product spec. Source of truth for *what* to build.
- **`docs/architecture/`** — the approved architecture pack, one file per concern (product
  interpretation, system/modules, database design, API structure, offline sync design, security/
  tenant isolation, the "four engines," risks/assumptions, MVP build sequence). Read `06` before
  touching anything tenant-isolation-related, and `05` before touching the offline sync/outbox code.
- **`docs/STATE.md`** — chronological build log. What's built, in what order, what was tested and
  how, exact reproduction steps for re-testing anything. Most recent entries at the top.
- **`docs/ASSUMPTIONS.md`** — chronological decision/bug log. Every non-obvious call this project
  made, and why — including several real bugs found on real devices, root-caused, and fixed.
  **Read this before assuming something is broken** — it may be a documented, deliberate trade-off.
- **`CLAUDE.md`** — the standing operating rules this project was built under (mainly relevant if
  you continue using an AI coding assistant on this repo, but also a good summary of house rules:
  no placeholder/mock data reachable by a real user without a clear MOCK label, phase-gated
  approval process, etc.)

## 8. Mock integrations — what needs real setup before production

These are fully wired, adapter-pattern implementations with a MOCK provider swapped in for
development. Switching to a real one means writing a new class implementing the same interface and
changing one environment variable — no changes needed elsewhere:

| What | Interface | Mock lives at | Env var |
|---|---|---|---|
| OTP delivery (SMS) | `OtpProvider` | `backend/src/modules/auth/otp/mock-otp.provider.ts` | `OTP_PROVIDER=mock` |
| WhatsApp notifications | `WhatsAppProvider` | `backend/src/core/notifications/mock-whatsapp.provider.ts` | `WHATSAPP_PROVIDER=mock` |
| AI photo-content classification (e.g. "does this show real branding") | `ImageContentClassifier` | `backend/src/core/media-ai/mock-image-content-classifier.provider.ts` | `IMAGE_CONTENT_CLASSIFIER_PROVIDER=mock` |

The real photo **quality** checks (blur/exposure/resolution) are NOT mocked — those are genuinely
computed, both on-device and server-side, using a standard image-processing technique. Only the
smarter "what does this photo actually show" classification is a placeholder, because that
genuinely needs a paid cloud vision API (Google Vision, AWS Rekognition, Azure Computer Vision, or
similar) and this project has a hard rule against any real credential ever living in code.

Before going to production, someone needs to: pick and account for a real SMS/OTP gateway, decide
on WhatsApp Business API access (spec flags this as a founder decision still pending), and decide
whether the AI content-classification feature is worth building for real (it's architected and
ready, but genuinely not started).

## 9. Known operational gotchas (save yourself the debugging time)

These are real issues hit during development, with root causes understood — documented here so
nobody rediscovers them the hard way:

- **Prisma migrations sometimes want to `DROP INDEX` two hand-created PostGIS indexes**
  (`gps_points_geo_point_gix`, `locations_geo_point_gix`). These exist in the database but aren't
  representable in `schema.prisma`'s syntax, so Prisma's diff tool doesn't know about them and
  proposes dropping them on every unrelated migration. **Always review a generated migration's SQL
  before applying it** and delete any `DROP INDEX` line referencing these two.
- **Running a manual `tsc`/build command in `backend/` while `pnpm dev`'s watch process is also
  running can corrupt its incremental build cache** (`tsconfig.tsbuildinfo`), leaving the API
  silently non-functional (health check refuses connections) even though the watcher logs "0
  errors." Fix: stop the dev process, `rm -f tsconfig.tsbuildinfo && rm -rf dist`, restart.
- **The same applies to the web app's `.next` folder** — running `pnpm build` in `web/` while
  `next dev` is also running corrupts it. Kill the dev server, `rm -rf web/.next`, restart.
- **`prisma migrate dev` can appear to hang indefinitely** on a stale shadow-database cleanup
  (`DROP DATABASE ... WITH (FORCE)`) left over from a previous run that didn't exit cleanly. Check
  `SELECT * FROM pg_stat_activity` for an old, idle session holding the advisory lock
  (`pg_advisory_lock`) and `pg_terminate_backend()` it — the actual migration has usually already
  succeeded by the time this happens; check `_prisma_migrations` before assuming otherwise.
- **Flutter/Android JDK version** — see §5 above.

## 10. Suggested next steps for this team

Roughly in order of what would matter most to tackle first:

1. **Decide the real cloud environment** (spec says India-region; nothing is deployed anywhere yet
   — this has only ever run via Docker Compose locally).
2. **Replace the mock OTP/WhatsApp providers** with real ones once vendor decisions are made (see §8).
3. **Set up CI** — there is currently no automated pipeline; `pnpm test`, `pnpm build`, and
   `scripts/qa-grep.sh` all exist and pass locally, and are a natural starting point for a GitHub
   Actions (or similar) workflow.
4. **Decide on the AI content-classification provider** if that capability is wanted for real (see §8).
5. Read `docs/ASSUMPTIONS.md` in full at least once — it's long, but it's the fastest way to absorb
   a huge amount of hard-won context about this specific codebase's decisions and edge cases.
