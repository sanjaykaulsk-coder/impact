# 06 · Security & Tenant-Isolation Model

## Tenant isolation (the spec's Scenario 6 — treated as a P0 architectural property)

Three independent layers; any one failing still leaves two standing:
1. **Application guard:** every authenticated request resolves the caller's tenant + campaign scopes; a NestJS guard rejects any route lacking scope resolution. Client-role users additionally pass geography/date/approved-only filters configured by Impact (spec §26).
2. **Data layer:** Prisma middleware auto-injects `tenant_id` filters on every query for tenant-scoped models; queries without tenant context throw in development and fail closed in production.
3. **Database:** PostgreSQL Row-Level Security policies on tenant-scoped tables keyed to a session variable set per request. Even raw SQL cannot cross tenants.

Tenant-isolation tests (cross-client read attempts across campaigns, media, reports, exports) run in CI from the foundation phase onward.

## Identity & device trust

- OTP login (adapter interface; MOCK provider in dev, clearly labelled)
- Short-lived access JWT (15 min) + rotating refresh tokens; refresh reuse detection revokes the session family
- **Device binding:** device fingerprint registered at first login; new-device login triggers the device-change approval flow; max-active-devices enforced per user; suspicious device-change alerts to supervisors
- User blocking, device blocking, remote logout, campaign-access expiry — all effective within one access-token lifetime
- Login and device history retained per spec §7
- Admin portal: TOTP two-factor + session timeout

## Device-risk framework (spec §18 — detection, not false guarantees)

Signals collected client-side (Play Integrity API + local checks): mock location, root/emulator indicators, APK signature validity, debug/developer options, overlay and accessibility anomalies, time drift vs server, GPS-jump/impossible-speed (computed server-side with PostGIS), duplicate media hash, multi-device/multi-user patterns.

Signals feed a per-campaign configurable rules table mapping to the four risk levels: **L1 Warn → L2 Flag for review → L3 Restrict pending supervisor action → L4 Block.** Every signal and decision lands in the audit log. We state plainly in-product and in docs that Android cannot make manipulation impossible; the system makes it detectable, reviewable and auditable.

## Media security

Binaries only in object storage; DB holds metadata + SHA-256. Buckets private; access exclusively via short-lived signed URLs (5 min) issued after permission checks. ORIGINAL vs WATERMARKED are separate permissions; client users see approved WATERMARKED media only unless Impact grants more. Download events audited (who, what, when).

## Secrets, transport, at rest

TLS everywhere; PostgreSQL and MinIO encrypted at rest; Drift local database encrypted (SQLCipher) with key in Android Keystore. Secrets only via environment/secret manager; `.env.example` contains placeholders only; CI secret-scan blocks accidental commits. Rate limiting on auth and sync; input validation via DTO schemas on every endpoint; structured API logging + error monitoring hooks.

## Audit immutability (spec §37)

`AuditLog` is INSERT-only at the database-grant level for the application role; rows hash-chain to their predecessor; ordinary administrators can read, never modify. Auditing is emitted by a global interceptor on mutating endpoints, so coverage is systemic rather than per-developer discipline.

## Data residency & DR

All components deployable in an India cloud region (final provider = founder decision). Nightly encrypted Postgres backups + object-storage versioning; restore procedure documented and rehearsed before production pilot; data-retention jobs honour per-campaign retention rules.
