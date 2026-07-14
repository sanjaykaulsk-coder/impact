# 08 · Risks, Assumptions & Recommended Spec Modifications

## Top risks (ranked) and mitigations

| # | Risk | Why it matters | Mitigation |
|---|------|----------------|------------|
| 1 | **Offline sync edge cases** (partial uploads, config changed mid-day, device clock wrong, storage full) | This is where field platforms die in the real world | Outbox pattern + idempotency keys from day one; dedicated offline test suite; airplane-mode testing is a gate for the vertical slice, not an afterthought |
| 2 | **Old low-RAM devices** (3–4 years, personally owned) | App killed mid-capture, camera memory pressure, background sync throttled by aggressive OEM battery managers (Xiaomi/Oppo/Vivo common in field teams) | Save-on-every-keystroke drafts; capture pipeline streams to disk; WorkManager + user-visible Sync Centre as the fallback when OEMs kill background work; test matrix must include real budget devices |
| 3 | **Scope gravity** — 20 activity types, 65 screens, 4 engines | The platform is genuinely large; enthusiasm to build everything at once produces nothing usable | Phase gates + vertical slice discipline (already our process); MVP module order fixed in doc 09 |
| 4 | **Form builder complexity** (35+ field types, conditional logic, versioning) | The single most complex module; a weak form engine poisons every campaign | Built as MVP module #1 straight after the slice, with its own test suite of representative Impact forms (van campaign, retail recce, school programme) |
| 5 | **GPS quality in rural India** | Slow locks, drift, dead zones → false deviations that destroy field-team trust | Accuracy-aware capture (store accuracy radius with every point); deviation rules evaluate accuracy; supervisors see confidence, not just red flags; tolerance defaults generous until tuned per campaign |
| 6 | **Device-integrity arms race** | Determined manipulation cannot be fully prevented on Android | Spec already takes the right posture (detect/flag/restrict/audit); we never claim prevention; Play Integrity API + server-side plausibility checks (speed, jumps, duplicates) |
| 7 | **Multi-tenant data leak** | One cross-client leak ends client trust permanently | Three-layer isolation (guard + Prisma middleware + Postgres RLS); isolation tests in CI from the foundation phase |
| 8 | **Media volume and cost** | 200 users × many photos/day × hundreds of campaigns | Client-side compression targets; chunked resumable uploads; lifecycle policies per campaign retention rule; thumbnails for review screens |

## Working assumptions (logged; correct me where wrong)

1. Single Impact organisation as root tenant; clients are sub-tenants (no white-labelling of the platform itself in v1).
2. Languages: Hindi + English in v1; the localisation architecture supports adding regional languages later without redesign.
3. PJP files up to ~10,000 rows; larger files processed as background jobs with progress display.
4. Video: default cap 60s / 720p unless a campaign configures otherwise.
5. Offline map corridors use OpenStreetMap tiles; per-assignment corridor packages capped (~50MB) to respect device storage.
6. Push notifications via FCM (standard for Android); WhatsApp via Business API adapter later, mock now.
7. Attendance = day-start/day-end check-in with GPS + configurable selfie; no biometric integration in v1.
8. "Finance" visibility exists as a permission flag; no accounting/invoicing module in MVP (cost-vs-output is a Director-dashboard placeholder per spec §26).
9. Client users never receive Android field app access in v1 — web portal only.
10. English admin portal; Hindi-English field app.

## Recommended spec modifications (nothing removed — sequencing and honesty adjustments)

1. **Screenshot detection → "screenshot-risk indicators."** Android cannot reliably detect that an uploaded image is a screenshot of a photo. We implement heuristics (metadata absence, hash reuse, aspect/EXIF anomalies) as risk signals feeding L1–L4 — recommend the spec language say "risk indicators," which §18 already implies. *(Adopted unless you object.)*
2. **Dashboard engine phasing.** MVP ships the basic live dashboard (module 16 of spec §42); the fully *configurable* dashboard engine with client-specific widget definitions lands right after MVP. The data model supports it from day one. *(Consistent with the spec's own MVP list.)*
3. **Offline maps sequenced after the slice.** The vertical slice uses online maps + cached last-view; full corridor-download offline maps arrive as module 13. Field usability is preserved because assignments/PJP/forms are fully offline regardless.
4. **WhatsApp summary reports** ship as formatted text via the notification adapter in MVP; rich media summaries post-MVP.
5. **Duplicate-photo detection scope:** exact-hash duplicates in MVP; perceptual similarity (near-duplicates) post-MVP as an IQ-adjacent capability.

## Founder decisions needed before the MVP pilot (not blockers today)

1. Production OTP provider (MSG91 / Twilio / other) — MOCK until then
2. Cloud + India region for staging (AWS Mumbai / GCP Mumbai / Azure Central India)
3. First real campaign to shadow-pilot the vertical slice, with a small team
