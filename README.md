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

Requires Docker + Docker Compose, Node.js 22+, and `pnpm` (`corepack enable` gets you pnpm for free).

```bash
cp .env.example .env
pnpm install
docker compose up -d          # Postgres 16 + PostGIS, Redis, MinIO
pnpm --filter backend prisma:migrate:deploy
pnpm --filter backend prisma:seed
pnpm dev                      # runs backend (NestJS) + web (Next.js) together
```

- Web admin: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- MinIO console: http://localhost:9001 (user/pass in `.env`)

Demo login (mock OTP — see `docs/STATE.md` for the full demo user list): any seeded mobile number,
OTP is always printed to the backend console (and returned in the API response body) because the
OTP provider is a clearly-marked MOCK in development. No real SMS is ever sent.

## Flutter field app

```bash
cd app
flutter pub get
flutter run            # requires a connected device or emulator
```

See `docs/STATE.md` for exactly how to see the app running, given this build environment has no
Android emulator support.

## Repo layout

```
backend/   NestJS API (modular monolith)
web/       Next.js admin + supervisor + command centre
app/       Flutter field application
shared/    Shared API types / contracts
docs/      Spec, state, assumptions, architecture pack
```
