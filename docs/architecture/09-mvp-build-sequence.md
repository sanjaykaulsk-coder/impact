# 09 · MVP Implementation Sequence (spec's 20 modules → build sessions)

Each "session" is one Claude Code working session with an approval stop at the end. Estimates assume the founder reviews between sessions; calendar time depends on review cadence.

> **Updated per `docs/reference/report-format-library.md`** (distilled from 21 real historical
> campaign-type report sheets, `docs/reference/Type_of_Campaign.xlsx`): the form builder and PJP/
> assignment stages below now explicitly cover the four real-world report archetypes (DFR, Profile,
> Stock Reconciliation, Enquiry/Leads), record-level capture with auto-computed DFR aggregates, and
> a new Campaign SKU Master entity with movement types. See the report-format-library for the full
> field-type validation and the migration acceptance test that gates Stage 3.1's completion.

## Stage 1 — Foundation (Prompt 2) · ~2 sessions
Covers MVP modules **1 (mock-OTP login), 2 (client & campaign setup — basic), 3 (user & role management — basic)** at shell level: monorepo, Docker (PG+PostGIS/Redis/MinIO), full Prisma schema + migrations, auth with device binding, permission model, seed demo data, web shell, Flutter shell with dynamic branding.
**Founder gate:** log in on web and phone; see Shakti Consumer Products branding load dynamically.
**Status: COMPLETE** — see `docs/STATE.md`.

## Stage 2 — Vertical slice (Prompt 3) · ~3 sessions
One thread through everything, Van Campaign template:
- **Session A (admin thread) — COMPLETE, awaiting founder approval:** campaign builder essentials → minimal form builder (core field types + one conditional rule + versioning skeleton) → PJP upload with mapping/preview/invalid-row detection → assignment. *(Advances modules 2, 4, 5, 6, 7.)* Built and verified end-to-end backend+web; see `docs/STATE.md`'s Stage 2 Session A section and A-024–A-028 in `docs/ASSUMPTIONS.md`.
- **Session B (field thread):** assignment list → activity detail → camera-only opening evidence with GPS/timestamp/overlay → check-in validation → milestone form → offline outbox → sync with visible statuses. *(Advances modules 8–13.)*
- **Session C (supervisor thread + hardening):** supervisor inbox → media/GPS review → approve/reject with remarks → airplane-mode end-to-end test → demo of acceptance scenarios 2 & 3. *(Advances module 14.)*
**Founder gate:** you personally run scenario 3 (offline capture → reconnect → synced) on a real phone.

Session A's minimal form builder did **not** end up building a Profile-archetype form with a
Campaign SKU Master line-item group, despite an earlier note here suggesting that. On reflection
during the build (logged as A-024), that's genuinely Stage 3.1-scope work — S3.1 below already
owns the Campaign SKU Master entity — and pulling it into a "minimal" Session A builder would have
meant CampaignSku/SkuMovement CRUD, a movement-aware field type, and DFR rollup logic all in one
session. Session A instead ships 10 core field types spanning every non-SKU category the schema's
FieldType enum has (text, numeric, choice, media, location), one conditional rule, and the
version-freeze-and-clone publish flow — proving the versioning mechanics end-to-end without
front-loading Stage 3.1's own scope. The Campaign SKU Master remains exactly where S3.1 puts it.

## Stage 3 — Configuration depth · ~4 sessions
- **S3.1 · Module 4 full:** Dynamic form builder — all 35+ field types, all controls, conditional logic builder, publishing flow. *(+ module 5 form versioning completed.)* **Now scoped to explicitly include:**
  - The **Campaign SKU Master** entity (`CampaignSku` + `SkuMovement`, report-format-library §3) — configurable per campaign, never hard-coded, with the validated movement-type list (opening/received/sold/free-scheme/sampled/damaged/closing).
  - **Record-level (Profile) capture with auto-computed DFR aggregates** (report-format-library §2): DFR is built as a rollup query/report definition over Profile-level `FormResponse` data, never a second independently-entered number.
  - The four report-format archetypes (DFR, Profile, Stock Reconciliation, Enquiry/Leads) as form-builder presets/templates, so an admin configuring a new campaign's forms starts from the shape that already matches 27 years of Impact's actual field-report formats.
  - **Gate for completing this stage:** the migration acceptance test in report-format-library §5 passes — structural fidelity against 3 representative real campaign types, exact aggregate-rollup correctness, stock-reconciliation formula correctness, form-version stability under a mid-campaign SKU change, and tenant isolation on the new SKU/movement tables.
- **S3.2:** Workflow builder + milestone engine (stages, approvals, SOP checklists, readiness view).
- **S3.3:** Activity template library — all 16 templates as configuration; campaign-level override behaviour.
- **S3.4 · Module 6 full:** PJP management — edit/cancel/postpone/reschedule/reassign with full change history; sample templates.

## Stage 4 — Field integrity · ~3 sessions
- **S4.1 · Module 15:** GPS/route/deviation engine — PostGIS tolerance checks, deviation request → supervisor decision → escalation ladder; route trace.
- **S4.2:** Device-risk controls — signal collection, per-campaign L1–L4 rules, supervisor review queue.
- **S4.3:** Sales & stock — SKU reporting, reconciliation formula, mismatch exceptions. Attendance day-start/day-end. **Builds directly on the Campaign SKU Master and movement types delivered in S3.1** rather than a separate stock model — Stock Reconciliation (report-format-library §1.3) is one more consumer of the same SKU/movement tables the form builder already populates, not a parallel data model.

## Stage 5 — Command & control · ~4 sessions
- **S5.1 · Module 14 full:** Supervisor module complete (attendance, unsynced users, delayed activities, team performance, reassignment).
- **S5.2:** Exception tickets (full lifecycle) + **Module 17 in-app alerts** + **Module 18 WhatsApp adapter** with escalation ladders.
- **S5.3 · Module 16 full:** Live dashboard + drill-down (National→…→Evidence) + live map command centre feed.
- **S5.4 · Module 19:** Excel reporting service (daily/weekly/closure) — extensible for PDF/PPT later. **The DFR export format should match the source workbook's own layout** (per-SKU column groups with Qty/Amount sub-columns, Total row) since that is the format Impact's clients already know how to read — the underlying data comes from the auto-computed rollup (S3.1), only the presentation layer is new.

## Stage 6 — Trust & handover · ~3 sessions
- **S6.1:** Remote approval gating + retail recce & branding workflow + downloadable recce sheet + WhatsApp verification flow.
- **S6.2 · Module 20 + hardening:** audit trail completion (immutability verified), client access controls, tenant-isolation hardening, Impact IQ export layer (APIs, webhooks, data dictionary).
- **S6.3 · Phase E (Prompt 5):** full validation — all test suites + all 7 acceptance scenarios with a pass/fail evidence table, **plus the report-format-library's migration acceptance test (§5) re-run against the final schema**.

## Post-MVP backlog (explicitly deferred, architecture-ready)
Offline map corridors (module 13 full) · configurable dashboard engine for clients (client self-service KPI picker — distinct from S5.3's Impact-defined live dashboard/drill-down, which already covers cross-location, time-trend and deviation surfacing; see `docs/ASSUMPTIONS.md` A-058) · perceptual duplicate detection · PDF/PPT reports · regional languages · AI image analysis · predictive features (Impact IQ side).

Also flagged in A-058, not yet assigned to a stage: saving a campaign's custom workflow + form combination back as a new, reusable master Activity Template (distinct from applying one of the existing 16 — that part already works, Stage 3.3).

## Total: ~19 Claude Code sessions to a validated MVP
At 3–4 reviewed sessions per week, this is a 5–7 week build to Phase E — before the shadow pilot on a real campaign.
