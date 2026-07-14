# IMPACT FIELD COMMAND — Product Specification v1.0
### Single source of truth for WHAT to build. Process rules live in the Prompt Pack, not here.

---

## 1. Business context

Impact Communications executes field marketing, activation, outreach, retail, sales and branding programmes across India. Activity types managed (all must be supported as configurable templates):

Van campaigns · Roadshows · Outreach programmes · Product demonstrations · Exhibitions · Corporate and consumer events · Mela stalls · Mela branding · Wholesale activation · Retail sales programmes · Product trial generation · Product seeding programmes · Van-based seeding · Bike-based seeding · School campaigns · Haat campaigns · Retail branding · In-shop branding · Standard collateral installation · Customised retail branding (recce → measurement → production → installation)

Every client has different KPIs, SOPs, reporting fields, photographs, milestones, workflows and approval requirements. **The platform must be fully configurable — never hard-code an individual client's workflow.**

## 2. Product objective

One common Android field application and one responsive web administration and monitoring portal. After login, the Android app loads the branding, assignments, forms, workflow and reporting requirements of the user's assigned client and campaign.

Scale and conditions: hundreds of simultaneous campaigns · thousands of users · ~200+ users in one campaign · 10–20 activities running simultaneously · high-volume photo evidence · weak or no internet · personally owned Android phones, 3–4 years old · multi-level supervision · client-specific reporting · live dashboards · geographic route monitoring · secure client data isolation · future Impact IQ integration.

## 3. Core product principles

Multi-client · multi-campaign · multi-role · multi-geography · configuration-driven · offline-first · Android-first · low-bandwidth · secure · scalable · modular · audit-friendly · API-ready · analytics-ready · India-wide field execution.

Four core engines power the platform:
1. **Campaign Configuration Engine**
2. **Dynamic Form and Workflow Engine**
3. **Offline Field Execution Engine**
4. **Monitoring, Exception and Analytics Engine**

## 4. Platform components

**A. Android Field Application** — used by promoters, field executives, supervisors, vendors, drivers, auditors, regional teams, project managers.

**B. Web Administration Portal** — create clients and campaigns, configure workflows, build reporting forms, upload PJP files, allocate users, configure roles/KPIs/alerts, control client access, review audit logs.

**C. Live Operations Command Centre** — used by activity supervisors, regional operations, client servicing, Operations Director, senior management, approved client users.

**D. Backend and APIs** — authentication, campaign configuration, user allocation, forms, workflows, GPS data, media, offline sync, alerts, approvals, reports, analytics integration, audit logging.

**E. Impact IQ Integration Layer** — Field Command collects operational data; Impact IQ will later analyse campaign performance, vendor performance, route/location effectiveness, sales productivity, trial conversion, operational risks, data quality, predictive trends. Provide clean APIs and analytics-ready data structures now; do not build Impact IQ itself.

## 5. Organisational hierarchy (configurable)

Impact Organisation → Client → Campaign → Activity Type → State → Region → District → Tehsil → Location → Route/PJP → Team → User → Activity Instance → Milestone → Report

Every activity is an independent activity instance. A campaign may contain hundreds of users, but each user sees only the activities and geography assigned to them.

## 6. Client-specific branding

One common app. After login, dynamically load from the backend: client logo, campaign logo, campaign name, brand colours, client-specific home banner, campaign instructions, activity type, forms, SOP, targets, assigned geography, reporting milestones, language, contact and escalation details. Never build per-client apps.

## 7. Login and authentication

Flow: Mobile number → OTP verification → Device registration → Role resolution → Campaign resolution → Campaign home screen.

Implement: OTP login · secure sessions · refresh tokens · user blocking · remote logout · device binding · device-change approval · campaign access expiry · maximum active-device control · login history · device history · suspicious device-change alerts.

A person may hold different roles in different campaigns (e.g. Regional Manager in Campaign A, Supervisor in Campaign B, Viewer in Campaign C).

## 8. Roles and permissions

Flexible RBAC. Initial roles:
- **Platform:** Super Admin, Impact System Administrator, Data Administrator, Auditor
- **Management:** Operations Director, National Operations Head, Regional Operations Head, Client Servicing Director, Client Servicing Manager, Campaign Manager, Activity Spoke, Project Manager
- **Field:** Activity Supervisor, Field Supervisor, Promoter, Field Executive, Vendor, Vehicle Driver, Field Auditor
- **Client:** Client Administrator, Client Campaign Manager, Client Viewer, Client Auditor

Permissions are configurable, not rigidly attached to role names: view, create, edit, allocate, approve, reject, download, export, block, delete, audit, view original photographs, view reports, view raw data, view assigned geography, view financial information, manage users, manage forms, manage PJP.

## 9. Administration portal modules

**9.1 Client Management:** create client, upload logo, colour palette, client code, client users, client dashboard configuration, data visibility, download permissions, data-isolation rules, campaign-level access, activate/deactivate.

**9.2 Campaign Management:** create campaign (client, name, code, activity type, dates, geography, brand theme, reporting language, targets, SOP, milestones, form template, approval flow, escalation flow, deviation tolerance, media requirements, offline-map requirement, client visibility, download rights, data-retention rule, status). Statuses: Draft → Configuration in progress → Ready for review → Approved → Published → Live → Paused → Completed → Archived.

**9.3 User Management:** add user, bulk upload, mobile number, role, campaign, geography, reporting manager, team, vehicle, transfer, block user, block device, remove/expire campaign access, login history, device history, user activity, download user list.

**9.4 Activity Template Library:** reusable templates for van campaign, roadshow, exhibition, event, mela stall, mela branding, wholesale activation, retail sales, trial generation, seeding programme, bike activation, school campaign, haat campaign, retail branding, retail recce, custom activity. Templates editable at campaign level without modifying the master.

## 10. Dynamic form builder (critical module)

No-code form builder so Impact administrators create reporting formats without developers.

**Field types:** short text, long text, integer, decimal, currency, percentage, date, time, datetime, dropdown, radio, multi-select, checkbox, yes/no, rating, photo, multiple photos, short video, signature, document, GPS, auto timestamp, auto user, auto activity ID, auto campaign ID, auto location, SKU selector, quantity, measurement, sales value, stock value, retailer details, consumer details, remarks, approval status.

**Controls per field:** mandatory/optional, min/max value, character limit, numeric validation, photo count, video duration, allowed file type, role visibility, editable-by-role, geography visibility, stage visibility, campaign visibility, date-based visibility, default value, formula, dependency on another answer, approval requirement.

**Conditional logic** — e.g. "Was the activity conducted?" Yes → footfall, demonstrations, trials, sales, activity photos. No → reason, remarks, location evidence, raise exception.

**Form versioning:** every published form has form ID, version, created by/date, published date, status, change log. Historical reports remain permanently linked to the version used at capture time. Publishing a new version never changes old reports.

## 11. Workflow builder

Configurable stages, e.g.: Planning → PJP upload → Team allocation → Pre-activity preparation → Dispatch → Travel → Arrival → Setup → Live activity → Mid-activity reporting → Closure → Report submission → Supervisor review → Activity Spoke review → Director oversight → Client review → Approval → Archive.

Admins can add/remove/rename/reorder stages, assign roles, set mandatory fields, attach forms and SOPs, set approvals, alerts and completion rules, and configure whether users may proceed with incomplete preparation. Pre-activity preparation does NOT block activity commencement unless a campaign rule explicitly activates blocking.

## 12. Pre-activity SOP module

Configurable checklists: manpower confirmed, user trained, vehicle allocated, branding received, stock received, uniform received, equipment checked, permissions received, venue confirmed, route confirmed, PJP approved, samples available, contact person confirmed, recce completed, client instructions acknowledged.

Activity Spoke and Operations Director see readiness as: % completion, Completed, Pending, Delayed, At risk, Not applicable.

## 13. PJP and route plan

Admin uploads an approved Excel/CSV (no in-platform client approval needed pre-upload).

Minimum columns: Date, State, District, Tehsil, Location name. Optional: latitude, longitude, activity point, team, supervisor, vehicle, planned sequence, planned start/end time, target, contact person, remarks.

Functions: upload, column mapping, preview, invalid-row detection, publish, edit/add/remove/cancel/postpone/reschedule location, reassign team/supervisor, change route/target, full change history. Provide sample Excel and CSV templates.

## 14. GPS, route and deviation logic

Monitor: current GPS, planned location, planned sequence, unplanned/skipped locations, distance from planned point, route travelled vs planned, stops and stop duration, speed, GPS availability, impossible GPS jumps, unusual movement.

Deviation types: outside permitted radius, unplanned location, skipped location, wrong sequence, late arrival, early departure, unplanned stoppage, GPS disabled/unavailable, abnormal speed, suspected location manipulation.

Tolerance configurable per campaign (100m / 250m / 500m / 1km / custom).

Deviation workflow: detected → user warned → user selects reason + remarks → submits deviation request → Activity Supervisor alerted → approve/reject → **activity continues while approval is pending** → decision stored in audit history. Escalation: Activity Supervisor → Activity Spoke → Regional Operations → Operations Director.

## 15. Field app start flow

Open app → mobile number → OTP → device validation → campaign selection (if multiple) → campaign-branded home → today's assignments → select activity → location/route/target/instructions → SOP status → capture configurable live opening photograph → GPS + timestamp → location validation → start activity.

Opening evidence types (configurable): selfie, team photo, vehicle photo, venue photo, shopfront photo, setup photo, branded stall photo. **No gallery upload for mandatory evidence.**

## 16. Milestone reporting

Milestones are template-specific. Examples:
- **Van campaign:** vehicle departure → location arrival → setup complete → activity start → product demonstration → sales update → activity closure → vehicle departure
- **Mela stall:** stall handover → branding completed → opening photo → midday activity → sales update → closing stock → final photo
- **School campaign:** school arrival → authority permission → setup → session start → session completion → participation count → authority signature → closure
- **Retail branding:** shop identified → shopkeeper consent → measurements → before images → material installation → after images → quality approval → shopkeeper acknowledgement

Every milestone may carry its own form, mandatory photos, mandatory GPS, mandatory signature, time window, approval, KPI and alert rule.

## 17. Photo and video evidence

Mandatory evidence is camera-only. Implement: live camera capture, no gallery for evidence fields, GPS at capture, device + server timestamps, user/campaign/activity/location IDs, media hash, duplicate-photo detection, screenshot-risk detection, metadata validation, original image storage, watermarked display copy.

**Watermark:** clean strip that does not cover the subject; fields may include client, campaign, location, district, date, time, lat/long, user, activity ID. Originals stored securely unwatermarked.

**Video (only when configured):** max duration, max size, resolution restriction, camera-only, audio on/off, mandatory/optional, milestone attachment, optimised before upload.

## 18. Device and manipulation-risk controls

Personally owned phones; absolute prevention is impossible — implement risk detection, restriction and audit instead.

Detect/flag: mock location, fake GPS, rooted device, emulator, APK tampering, invalid signature, debug mode, developer options, suspicious overlay, suspicious accessibility service, VPN/proxy where detectable, device-time manipulation, server-time mismatch, screenshot evidence, duplicate photo, old photograph, abnormal GPS jump, impossible travel speed, multiple devices per account, multiple users per device, repeated failed device checks.

Configurable risk levels: **L1 Warning** (continue) · **L2 Flagged** (allowed, mandatory supervisor review) · **L3 Restricted** (cannot start/complete without supervisor action) · **L4 Blocked** (user/device barred).

## 19. Offline-first requirement

Works in low or zero connectivity. Offline functions: view downloaded assignments, PJP, route, SOP; open forms; save drafts; capture photo/short video/GPS/signature; check in/out; complete report; submit to offline queue. Encrypted local storage for campaign config, forms, PJP, assignments, offline map tiles, reports, media, signatures, sync status, retry counts, error logs.

**Sync flow:** complete report → save locally → sync queue → detect connectivity → upload structured data first → media in chunks → retry failed chunks → server validates → mark synced → retain local status.

**Sync statuses:** Draft · Saved offline · Pending upload · Uploading · Partially uploaded · Synced · Upload failed · Validation failed · User action required.

Also: automatic background retry, end-of-day pending-sync notification, supervisor view of unsynced users, warning before logout, restriction on starting the next assignment when critical unsynced data exists, resumable media upload, compression, network-aware and battery-aware background tasks.

## 20. Offline maps

Store only relevant areas: district, tehsil, route corridor, assigned locations. Show current GPS, planned route, location sequence, completed/pending locations, distance to next, activity status. External navigation apps may be opened when available.

## 21. Activity-specific configuration templates

- **Van campaign / roadshow:** vehicle, driver, route, GPS trail, setup, branding, demonstrations, footfall, leads, trials, sales, stock, distance, stops, time per location, deviation, closure
- **Exhibition / event:** venue readiness, stall setup, branding, visitors, leads, enquiries, sessions, VIP visits, collateral, event photos, closure
- **Mela stall:** stall location/size, branding, attendance, trials, sales, stock, competitor presence, daily closure
- **Mela branding:** branding inventory, location, placement, dimensions, installation, visibility, damage, replacement, quality approval
- **Wholesale activation:** wholesaler, retailer participation, demonstration, orders, sales, leads, stock, scheme communication, feedback
- **Retail sales & trials:** outlet, SKU, opening stock, stock received, trials, sales, closing stock, damage, consumer interaction, retailer feedback
- **Seeding programme:** vehicle/bike, route, outlet coverage, sample distribution, quantity, retailer acknowledgement, repeat visit
- **School campaign:** school, authority, permission, student count, session, engagement, samples, feedback, signature, evidence
- **Haat campaign:** haat, market day, setup, footfall, trials, sales, retailers, consumer response, competitor activity, stock
- **Retail branding:** shop, shopkeeper consent, collateral, quantity, placement, before/after images, installation approval
- **Custom retail recce:** shopkeeper consent, shopfront + surface measurements, multi-angle photos, branding opportunity, installation feasibility, production notes, before/after images, quality approval

## 22. Sales and stock

SKU-level stock reporting when configured. Formula: Opening Stock + Stock Received − Units Sold − Units Sampled − Units Damaged = Expected Closing Stock. Compare against Actual Closing Stock; where the campaign requires reconciliation, mismatch generates an exception. Configurable predefined heads.

## 23. Retail recce and branding workflow

Shop assigned → user visits → GPS + shop photo → shopkeeper consent → measurements → multi-angle photos → recce submission → production brief generated → material production stage → installation assigned → before image → installation → after image → remote review → approval → closure.

Generate a downloadable recce sheet: shop details, address, GPS, district, tehsil, measurements, consent, photos, notes, branding recommendation, approval status. Support before/after comparison.

## 24. Remote approval

For configured campaigns, final closure requires remote approval: submit completion → Awaiting Approval → supervisor reviews data + photos → approve (user may close) or reject (reason → correction request → user corrects → resubmits). Use for retail branding, mela stall setup, exhibitions, fabrication, custom installations, high-value activities.

## 25. Supervisor module

Screens: team dashboard, attendance, today's assignments, live map, user status, activity progress, PJP adherence, route deviation, approval requests, media review, exceptions, unsynced reports, delayed activities, performance, WhatsApp verification, team communication.

Actions: approve/reject deviation, approve/reject activity, comment, reassign activity where authorised, review route/photos, raise/close exception, start WhatsApp verification.

## 26. Dashboards (configurable engine; all KPIs client-specific)

- **Operations:** planned/started/in-progress/completed/missed/delayed, attendance, route adherence, deviations, pending approvals, open exceptions, offline users, unsynced reports, state/district/team/supervisor/vendor performance
- **Client Servicing:** target vs achievement, geographic coverage, campaign progress, photo evidence, footfall, demonstrations, trials, sales, leads, branding completion, pending issues, daily summary
- **Operations Director:** national campaign health, RAG status, live national map, campaign/state/region comparison, vendor risk, route compliance, data quality, critical escalations, KPI trend, cost-vs-output placeholder
- **Client dashboard (enabled only by Impact):** configure campaign/geography/date access, approved reports and photos only, aggregated KPIs, raw-data visibility, view-only, Excel download, media download, original-image access

## 27. Drill-down

National → Client → Campaign → State → District → Tehsil → Location → Activity → User → Report → Evidence.

## 28. Live map command centre

Show planned/completed/active/missed/delayed locations, deviated users, vans, bikes, last-known user location, planned vs actual route, stops, unplanned stops, offline users.

Status system (configurable, not colour-dependent for accessibility): Grey not started · Blue travelling · Green active/completed · Amber delayed · Red exception · Black offline/no recent location.

## 29. Alert engine

Channels: in-app, push, WhatsApp (adapter interface + mock provider; never hard-code credentials).

Events: user absent, activity not started, late start, route deviation, unplanned location, location skipped, GPS disabled, mock location suspected, device risk, missing photo, incomplete report, early closure, low performance/sales/trials, stock mismatch, pending approval, offline too long, unsynced report, repeated underperformance, supervisor not responding.

Every alert carries: client, campaign, activity, user, location, issue type, timestamp, severity, owner, status, remarks, evidence, resolution deadline, escalation level, closure approver.

Escalation example (thresholds configurable): 0 min Activity Supervisor → 15 min Activity Spoke → 30 min Regional Operations → 60 min Operations Director.

## 30. Exception management

Every exception is an operational ticket. Statuses: Detected → Assigned → Acknowledged → Under review → Action taken → Resolved → Closure approved → Reopened. Fields: exception ID, category, severity, trigger, campaign, activity, user, location, owner, escalation level, evidence, remarks, resolution, resolution time, closure approval, audit history.

## 31. WhatsApp video verification (v1 approach)

Supervisor opens activity → Start Verification Call → app opens WhatsApp conversation/call intent → supervisor conducts call → returns → marks verification complete → selects outcome → adds remarks. Supports one-to-one, group (shared link/manual group), setup verification, branding inspection, remote support. Never store WhatsApp call recordings or private call data.

## 32. Reporting

- **Daily:** planned vs completed, state/district/activity summaries, KPI achievement, exceptions, deviations, stock, sales, photo evidence, pending reports
- **Weekly:** trends, target vs achievement, state comparison, team/supervisor/vendor performance, data quality, recurring exceptions, corrective actions
- **Campaign closure:** overview, geography, planned vs executed, KPI achievement, sales, trials, leads, installations, evidence, route compliance, operational issues, learnings, recommendations

Initial formats: Excel, dashboard, WhatsApp summary. Report service must be extensible to PDF and PowerPoint later.

## 33. Impact IQ integration layer

Output datasets: campaign master, user master, activity master, PJP, GPS history, KPI targets/achievements, sales, stock, leads, media metadata, approvals, deviations, exceptions, vendor performance, supervisor performance, data quality. Provide secure API, incremental export, webhooks, scheduled batch export, analytics event schema, data dictionary. Do not build Impact IQ itself.

## 34. Database entities (minimum)

- **Organisation & access:** Organisation, Client, User, MobileCredential, Role, Permission, RolePermission, UserCampaignRole, Device, LoginSession
- **Campaign:** Campaign, CampaignBranding, ActivityType, CampaignActivity, Geography, Location, PJP, PJPRow, Route, RouteLocation, Team, UserAssignment, Target
- **Forms:** FormTemplate, FormVersion, FormSection, FormQuestion, QuestionOption, ValidationRule, ConditionalRule, FormResponse, FieldResponse
- **Workflow:** Workflow, WorkflowStage, Milestone, StageAssignment, StageApprovalRule
- **Execution:** ActivityInstance, Attendance, CheckIn, CheckOut, GPSPoint, RouteTrace, Media, Signature, StockReport, StockItem, SalesReport, SalesItem, Lead, Retailer, Consumer
- **Governance:** Approval, DeviationRequest, Exception, Alert, Escalation, Comment, AuditLog, Report, DownloadPermission, Notification

UUIDs throughout. Tenant (client) and campaign identifiers on all relevant records.

## 35. Media architecture

No binaries in the relational database — object storage only. Database stores: media ID, object key, client, campaign, activity, user, device, timestamp, lat/long, hash, original-or-watermarked, validation status, approval status, download permission, file size, MIME type, upload status. Short-lived signed URLs. Originals and watermarked copies stored separately.

## 36. Security

India-region hosting capable. Encryption in transit and at rest · OTP login · RBAC · campaign-level isolation · client-level tenant isolation · device binding · signed API tokens with expiry · audit logs · admin 2FA · admin session timeout · secure media URLs · download control · backup and DR readiness · input validation · rate limiting · secure secret management · API logging · error monitoring. No sensitive configuration in source code; no production secrets in environment examples — placeholders only.

## 37. Audit trail (immutable to ordinary administrators)

Audit: user creation/blocking, device blocking, role changes, campaign creation/publication, PJP upload/changes, form changes, target changes, assignment changes, report submission/modification, approvals, rejections, deviation requests/decisions, exception resolution, data downloads, media downloads, device changes.

## 38. Technical stack (LOCKED — see Prompt Pack; do not offer alternatives)

Android: **Flutter** (Riverpod, GoRouter, Drift encrypted local DB, WorkManager, camera/GPS/background sync/offline maps/low-bandwidth upload/device-integrity checks) · Web: **Next.js + TypeScript** · Backend: **NestJS + TypeScript, modular monolith** with separable modules · Database: **PostgreSQL 16 + PostGIS**, Prisma · Cache/jobs: **Redis + BullMQ** · Media: **S3-compatible** (MinIO locally) · Containers: **Docker**, staging/production-ready configuration · Cloud-neutral with India-region deployment configuration for one provider.

## 39. User-experience requirements

Field app: large tap targets, minimal typing, clear Hindi-English labels, icon-assisted navigation, visible sync/GPS/camera-requirement/completion states, low memory, fast loading, clear error recovery, small-screen support, minimal animation, no decorative slow interfaces. Clean professional Impact brand language; neutral placeholders where brand assets unavailable. Dashboards: usable and professional, not dark/futuristic at the cost of usability.

## 40. Required screens

**Android (29):** Splash · Mobile login · OTP · Device verification · Campaign selection · Campaign home · Today's assignments · Calendar · PJP · Route map · Activity details · SOP checklist · Start activity · Camera · Milestone list · Dynamic form · Photo capture · Video capture · Sales & stock · Signature · Deviation request · Exceptions · WhatsApp verification · Submit report · Sync centre · Notifications · Help · Profile · Device information

**Web admin (24):** Login · Executive dashboard · Client management · Client details · Campaign list · Campaign builder · Activity templates · Form builder · Form preview · Workflow builder · User management · Role management · PJP upload · PJP preview · Map configuration · Assignment · Targets · Alert rules · Escalation rules · Client access · Reports · Device risk · Audit logs · System settings

**Supervisor (12):** Supervisor dashboard · Team list · Attendance · Live activity map · Activity progress · Approval inbox · Deviation inbox · Exceptions · Media review · Route history · Unsynced users · Team performance

## 41. Demo data

Realistic Indian demonstration data. Fictional clients (e.g. Shakti Consumer Products, Bharat Agri Systems, Surya Home Care). Campaigns (e.g. Bihar Rural Van Outreach, Uttar Pradesh Haat Trial Programme, Rajasthan Retail Branding Drive, Maharashtra School Contact Programme). Realistic states/districts/tehsils/locations, Indian-style user names, targets, routes, KPI data, exceptions, alerts. Never real personal phone numbers.

## 42. MVP scope (20 modules)

1. OTP-style login (development mock) · 2. Client and campaign setup · 3. User and role management · 4. Dynamic form builder · 5. Form versioning · 6. PJP upload · 7. Assignment · 8. Android field-user workflow · 9. GPS-based check-in · 10. Camera-only evidence architecture · 11. Milestone reporting · 12. Offline local storage · 13. Sync queue · 14. Supervisor approval · 15. Deviation request · 16. Basic live dashboard · 17. In-app alerts · 18. WhatsApp notification adapter · 19. Excel reporting · 20. Audit trail.

No AI image analysis or predictive features in MVP; keep the architecture ready for them.

## 43. Engineering standards

Clean modular code · strict TypeScript where applicable · no placeholder code disguised as working functionality · no non-functional major buttons · mock integrations clearly marked MOCK · seed data · database migrations · validation · error handling · loading/empty/permission-denied/offline/retry states everywhere · test coverage on critical logic · README · environment-variable documentation (placeholders only) · Docker setup · simple local development setup · no insecure shortcuts to finish a demo.

## 44. Acceptance scenarios (the MVP must pass all seven)

1. **New campaign:** admin creates client → campaign → selects activity template → applies branding → defines milestones → builds dynamic form → uploads PJP → allocates users → publishes.
2. **Field user online:** login → sees campaign branding → opens today's assignment → sees PJP → captures live opening evidence → GPS check-in → completes milestones → submits → sees successful sync.
3. **Field user offline:** opens downloaded assignment → views PJP → captures evidence → completes forms → submits offline → sees pending sync → reconnects → auto-upload → synced status.
4. **Deviation:** system detects out-of-tolerance → notifies user → accepts reason → notifies supervisor → supervisor approves → activity continues → decision stored.
5. **Supervisor review:** views team progress → reviews media and GPS → approves/rejects with remarks → raises and closes an exception.
6. **Data isolation:** a client user can never see another client's campaigns, users, media or reports.
7. **Form versioning:** form change leaves old reports untouched; new activity instances use the new version; audit history records the change.
