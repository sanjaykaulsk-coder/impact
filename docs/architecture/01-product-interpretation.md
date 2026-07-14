# 01 · Product Interpretation (plain language)

## What we are really building

IMPACT FIELD COMMAND is not a reporting app. It is a **field-execution operating system** where a campaign is *configuration, not code*. When Impact wins a new client — an FMCG brand running van campaigns in Bihar, a bank doing school programmes in Maharashtra — an Impact administrator sets up that client's branding, forms, milestones, workflow, geography, tolerances and KPIs entirely from the web portal. No developer touches anything. The same Android app in every field executive's pocket wakes up wearing that client's identity and rules.

## The four engines, in business terms

1. **Campaign Configuration Engine** — the "campaign factory". Client → campaign → activity template → branding → geography → targets → publish. Everything a campaign *is* lives as data in the database.
2. **Dynamic Form & Workflow Engine** — the "no-code brief". Admins build reporting forms (35+ field types, conditional logic) and workflows (stages, approvals, milestones) visually. Forms are versioned: yesterday's reports are forever frozen against yesterday's form.
3. **Offline Field Execution Engine** — the "field day that never fails". The phone downloads its assignments, forms, PJP and map corridor in the morning; the executive works all day with zero network; everything queues and syncs when signal returns. Camera-only evidence with GPS, timestamp, watermark and hash makes proof trustworthy.
4. **Monitoring, Exception & Analytics Engine** — the "control room". Every event (check-in, photo, GPS point, submission) flows through rules that raise deviations, alerts and exceptions, escalate them up the ladder, and feed dashboards from supervisor to Operations Director to client — and later, Impact IQ.

## Who touches it

Field executive (Android, Hindi-first, big buttons, offline) · Supervisor (approvals, deviations, media review, live map) · Operations & client servicing (dashboards, drill-down, reports) · Operations Director (national RAG view) · Client users (only what Impact enables) · Impact admins (the configuration factory).

## What "done" means for the MVP

The seven acceptance scenarios in the spec, passing end-to-end — from an admin publishing a new campaign to a field user completing it fully offline to a supervisor approving it, with clients unable to see across tenant walls and old reports immune to form changes.

## The one sentence

**One app, many clients; campaigns are configuration; the field works offline; head office sees everything live; nothing fake ever reaches a real user's screen.**
