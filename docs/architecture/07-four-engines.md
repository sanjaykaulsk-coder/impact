# 07 · The Four Core Engines — Configuration-Driven by Design

The test every engine must pass: **onboarding a new client with a completely different workflow requires zero code changes** — only configuration created in the admin portal.

## 1. Campaign Configuration Engine

Everything a campaign *is* lives as data: client, branding theme (logo, palette, banner — a versioned JSON theme document), activity template, geography tree, PJP, teams, targets, tolerances, media requirements, visibility and download rules, retention rule, status.

- **Campaign lifecycle** is a state machine (Draft → Configuration in progress → Ready for review → Approved → Published → Live → Paused → Completed → Archived) with permission-gated, audited transitions.
- **Publishing** compiles the campaign into an immutable **Campaign Config Snapshot** — the exact package devices download at bootstrap. Editing a live campaign creates a new snapshot version; devices pick it up at next sync (server wins on configuration).
- **Activity templates** are master configuration documents (milestones + default forms + KPI slots). Attaching one to a campaign *copies* it into campaign scope — campaign-level edits never touch the master library (spec §9.4).
- The Flutter app contains **zero client knowledge**: theming, home banner, instructions and escalation contacts all render from the snapshot.

## 2. Dynamic Form & Workflow Engine

- **Forms** are JSON documents authored in the no-code builder: sections → questions (35+ field types) → per-field controls (validation, visibility by role/geography/stage/date, defaults, formulas, dependencies, approval flags) → conditional rules (show/hide/require based on other answers).
- **One renderer, many forms:** the Flutter app and web preview share a single form-rendering engine that interprets any FormVersion JSON. New field types are added once, in the renderer — never per client.
- **Versioning is structural:** publishing freezes the FormVersion forever. FormResponses reference their FormVersion by ID: old reports render against old versions eternally; new activity instances pick up the latest published version (acceptance scenario 7).
- **Workflows** are ordered stage lists (add/remove/rename/reorder) with per-stage role assignment, attached forms/SOPs, approval rules, alert hooks and completion rules. **Milestones** hang off stages, each optionally carrying its own form, mandatory evidence (photo/GPS/signature), time window, KPI and alert rule.
- Pre-activity SOP checklists are workflow configuration too — and incomplete preparation does **not** block commencement unless a campaign rule explicitly enables blocking (spec §11).

## 3. Offline Field Execution Engine

Detailed in `05-offline-sync-design.md`. Configuration-driven aspects:
- What the device downloads at bootstrap is *decided by the campaign snapshot* (which forms, which map corridor, how many days of assignments, media sync policy).
- Evidence rules (opening-photo type, photo counts, video enablement/limits, watermark fields) come from configuration, enforced by the same capture components.
- Sync policy knobs (WiFi-only media, critical-unsynced blocking, retry ceilings) are campaign-level configuration with platform defaults.

## 4. Monitoring, Exception & Analytics Engine

An **event → rules → actions** architecture:
- **Events:** every meaningful occurrence (check-in, GPS point, submission, media upload, risk signal, missed window, sync failure) is published onto BullMQ as a typed event.
- **Rules:** per-campaign rule tables — deviation tolerances (PostGIS distance checks), alert triggers (the spec's full event list), device-risk mappings to L1–L4, escalation ladders with configurable time thresholds, stock-reconciliation exception triggers.
- **Actions:** create alert (in-app / push / WhatsApp via adapters), open exception ticket, escalate, restrict user, notify supervisor inbox, mark for mandatory review.
- **Dashboards are configuration too:** a dashboard definition (widgets, KPIs, filters, drill-down path) rendered by one dashboard engine — Ops, Client Servicing, Director and Client dashboards are four configurations of the same engine, client dashboards additionally filtered to approved-only data per Impact-controlled access rules.
- **Impact IQ layer:** every event and entity change also lands in analytics-ready export tables with watermark timestamps; the export API, webhooks and data dictionary read from these — no schema surgery needed when Impact IQ arrives.

## Why this holds up

Adding Impact's 21st activity type, a client's unusual approval chain, or a new KPI is an afternoon of configuration by an Impact admin — not a development sprint. That is the product's entire economic argument, so every module in the build order is reviewed against this test before acceptance.
