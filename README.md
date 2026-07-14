# IMPACT FIELD COMMAND

Configurable, multi-client field-execution operating system for Impact Communications.
One common Android field app + web admin/monitoring portal. Campaigns are configuration, not code.

**Start here:**
1. `CLAUDE.md` — standing rules for every working session
2. `docs/FIELD_COMMAND_SPEC.md` — complete product specification (source of truth)
3. `docs/architecture/` — approved architecture pack (02, 05, 07, 08; see note below)
4. `docs/STATE.md` — current build state · `docs/ASSUMPTIONS.md` — running assumptions log

**Status:** Phase A (architecture) approved. Phase C (working foundation) built — see `docs/STATE.md`.

> Architecture docs 01, 03, 04, 06, 09 were referenced in Phase A's STATE.md as existing but were not
> available to the Phase C session. Phase C was built directly from `docs/FIELD_COMMAND_SPEC.md`
> (the source of truth) plus the docs that were available. See `docs/ASSUMPTIONS.md` A-011.

## One-command startup

Prerequisites (install once, both are standard downloads):
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20 or newer](https://nodejs.org/)

Then, from the repo root:

```bash
./scripts/bootstrap.sh
```

This copies the environment placeholders, installs dependencies, starts Postgres 16 + PostGIS +
Redis + MinIO in Docker, runs database migrations, seeds realistic demo data (three fictional
clients, four campaigns, geography trees, ~16 users across every role category), and starts the
backend + web admin portal. Leave it running; press `Ctrl+C` to stop.

- Web admin: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- MinIO console: http://localhost:9001 (user/pass in `.env`)

Demo login (mock OTP — see `docs/STATE.md` for the full demo user list): any seeded mobile number,
OTP is always shown on screen (and printed to the backend console) because the OTP provider is a
clearly-marked MOCK in development. No real SMS is ever sent.

**Try the admin thread yourself:** log in as `9000000001` (Rohan Mehta, Super Admin), then Clients →
Campaigns → Forms → PJP Upload → Assignments in the sidebar. `samples/sample-pjp.csv` is a ready-
made file to upload on the PJP Upload screen — four valid rows plus one deliberately invalid row
(missing state) so you can see the invalid-row detection flag it without failing the whole upload.

## Flutter field app

Requires the [Flutter SDK](https://docs.flutter.dev/get-started/install) and either an Android
emulator (via Android Studio) or a physical Android phone with USB debugging enabled — see
`docs/STATE.md` for exactly how to see it running, since the environment that built this had
neither available and had to verify a different way (documented there in full).

```bash
cd app
flutter pub get
flutter run   # pick your emulator/device when prompted
```

The app talks to `http://10.0.2.2:4000/api/v1` by default on the Android emulator (the special
alias for the host machine) and `http://localhost:4000/api/v1` elsewhere. For a physical phone on
the same WiFi network, override it: `flutter run --dart-define=API_BASE_URL=http://<your-computer's-lan-ip>:4000/api/v1`.

## Repo layout

```
backend/   NestJS API (modular monolith)
web/       Next.js admin + supervisor + command centre
app/       Flutter field application
shared/    Shared TypeScript API types (backend + web)
docs/      Spec, state, assumptions, architecture pack
scripts/   bootstrap.sh (one-command startup) · qa-grep.sh (QA rule check)
```
