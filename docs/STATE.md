# STATE.md — IMPACT FIELD COMMAND

**Last updated:** 23 July 2026 · **Phase:** C — approved. **Stage 2 (A, B, C) — ALL COMPLETE. Stage 3 (3.1–3.4) — ALL APPROVED. Full database security hardening — DONE, verified. Stage 4 (4.1, 4.2, 4.3) — ALL APPROVED. S5.1 — APPROVED. S5.2 — APPROVED. S5.3 — APPROVED. S5.4 — CONFIRMED WORKING on founder's machine, 23 July 2026 — this completed the entire planned MVP build sequence. Post-MVP backlog: PDF/PowerPoint report exports — CONFIRMED WORKING. Configurable dashboard engine for clients — CONFIRMED WORKING, 23 July 2026. Four items remain on the backlog.**

## Post-MVP backlog — Configurable dashboard engine for clients (this session, founder picked this after PDF/PPT exports)

Per spec §26: "Dashboards (configurable engine; all KPIs client-specific)." This is the piece `docs/ASSUMPTIONS.md` A-058 flagged during Stage 5 planning as the one real gap in the dashboard work — S5.3's Overview page is a fixed set of KPIs for Impact's own staff; this is a genuinely configurable dashboard for your clients, where you choose what they see.

- **A new "Client Dashboard" page**, reachable by every role in the system (including a real, already-existing "Client Viewer" role that's had no dashboard of its own until now) — but showing only the specific widgets you've turned on for that campaign.
- **A "Configure Widgets" panel** (visible only to admin-level roles) lets you pick from 13 available widgets — today's numbers, geography covered, target vs achievement, sales, leads, team performance, and more — and set the order they appear in, with a simple checklist and up/down arrows.
- **Nothing new was calculated** — every widget shows the exact same numbers already on the Overview and Reports pages, just curated and reordered for whichever audience you're sharing the dashboard with.
- **Honest scope note**: the fuller spec bullet also describes controlling exactly which geography/date range a client can see and whether they get raw data or just summaries — that deeper access-control layer isn't built yet, only the "which KPIs show up" part. Flagged plainly, not silently done partway.
- **Verified**: builds clean (backend + web); full regression suite still passing (13/13); every new piece tested live end-to-end against a real running backend — including confirming a field-level login can see the dashboard but correctly cannot change what's configured on it.

### Reviewing — Configurable dashboard engine for clients

1. Restart with `./scripts/bootstrap.sh` if needed (no new setup required otherwise; a new database table was added and already applied).
2. Log in as Rohan Mehta (`9000000001`) and open the new **Client Dashboard** page in the sidebar. It'll say no widgets are configured yet — that's the correct starting state.
3. Click **Configure Widgets**, check a few (e.g. "Today's Summary", "Target vs Achievement"), use the arrows to set an order, then **Save widget selection**.
4. The dashboard below should now show exactly those widgets, in that order, with real numbers.

## Post-MVP backlog — PDF/PowerPoint report exports (this session, after founder said "Start the work on Post MVP Backlog", chose "PDF / PPT reports" first)

Per spec §32: "Report service must be extensible to PDF and PowerPoint later." All four reports (DFR, Stock Reconciliation, Weekly, Campaign Closure) get a **Download PDF** button; the Campaign Closure Report additionally gets a **Download PowerPoint** button, since that's the one report that's actually presented in a room, not read as a data grid.

- **No new numbers anywhere** — every PDF/PPT is built from the exact same data the Excel exports already compute. Only the presentation layer is new.
- **Verified**: builds clean (backend + web); full regression suite still passing (13/13); every new endpoint tested live end-to-end against a real running backend — all five downloads confirmed as genuine files (checked page counts and actual extracted text for the PDFs, actual slide content for the PowerPoint), including your own real Target showing up correctly.
- **A formatting bug was caught and fixed during this session's own testing, before you ever saw it** — campaign dates initially printed in a raw, ugly format; fixed to a clean date before this was handed to you.

### Reviewing — PDF/PowerPoint report exports

1. Restart with `./scripts/bootstrap.sh` if needed (no new setup required otherwise).
2. Open **Reports**, any tab — you'll see a new **Download PDF** button next to Download Excel.
3. On the **Campaign Closure Report** tab specifically, you'll also see **Download PowerPoint**.
4. Try a few — each should open correctly in your normal PDF viewer or PowerPoint/Keynote/Google Slides.

## S5.4 — Excel reporting service, full (this session, after founder said "Go ahead and build weekly and closure reports too")

Per `docs/architecture/09-mvp-build-sequence.md` S5.4: "Module 19: Excel reporting service (daily/weekly/closure) — extensible for PDF/PPT later." The daily piece (DFR + Stock Reconciliation Excel export) was built and confirmed working earlier this session. This second slice adds the remaining two: Weekly and Campaign Closure reports, both on the web page and as downloadable Excel files.

- **A new "Targets" page.** Every KPI-driven report needs something to measure against — this campaign-wide page lets you set a target (e.g. "10,000 units sold") with an optional date range, which both new reports compare real numbers against. No targets set yet? Both reports say so plainly rather than showing a fake number.
- **Weekly Report tab**: day-by-day trends, target vs achievement, state-by-state comparison, team performance, data quality (stops missing photos, late form submissions), recurring problem categories, and a log of what was actually done about resolved issues.
- **Campaign Closure Report tab**: a full end-of-campaign summary — overview, geography covered, planned vs actually executed, KPI achievement, sales and samples given out, leads, activity completion by type, evidence captured, route compliance, and operational issues. One section — Learnings & Recommendations — is left blank on purpose, both on screen and in the Excel file: no system can honestly write your team's own conclusions for you.
- **Both download as real, multi-sheet Excel files** — one sheet per section, matching the spec's own bullet list.
- **Verified**: builds clean (backend + web); full regression suite still passing (13/13); every new endpoint tested live end-to-end against a real running backend — a real target was created, confirmed to show up correctly in both reports with a genuinely computed number (checked directly against the database, not assumed), then removed; both Excel files downloaded and independently checked — genuine Excel files, all 7 and 11 expected sheets present with correct data.
- **A process note, not a feature bug**: partway through this session, a one-off `pnpm build` run (done only to verify the code compiles) collided with the already-running dev server and briefly broke the login page. Diagnosed and fixed within the same session — nothing about the actual features was at fault. Full detail in `docs/ASSUMPTIONS.md` A-072.

- **A "Download Excel" button on the existing Reports page.** Both the Daily Field Report and Stock Reconciliation tabs you already know about now have a real `.xlsx` download, matching the same date-range filter already on the page. No new page needed.
- **The Excel layout matches the format your team already knows** — the same one used in `Type_of_Campaign.xlsx`: one merged header per product spanning its Qty/Amt. columns, ending in Total Qty/Total Sales Amount columns. Nothing is re-typed for the Excel file — it's built from the exact same numbers already shown on the web page.
- **Verified**: builds clean (backend + web); full regression suite still passing; both downloads tested against a real running backend — the files that came back opened correctly as genuine Excel files, and their internal structure was checked directly (the merged header cells span the right columns, and the numbers match the web page). **Confirmed by you on your own machine, 23 July 2026** — downloaded and opened correctly.

### Reviewing S5.4 — Excel reporting, daily slice

1. `git pull` and restart (`./scripts/bootstrap.sh`).
2. Log in as Rohan Mehta (`9000000001`) and open the **Reports** page.
3. On either the "Daily Field Report (DFR)" or "Stock Reconciliation" tab, click **Download Excel** — a real `.xlsx` file should download and open correctly in Excel/Google Sheets/Numbers, matching what's shown on the page.

### Reviewing S5.4 — Weekly + Campaign Closure reports, Targets

1. `git pull` and restart (`./scripts/bootstrap.sh`).
2. Log in as Rohan Mehta (`9000000001`) and open the new **Targets** page in the sidebar. Add a target (e.g. "Units Sold", target value 100) — you can leave the period blank so it applies to any date range.
3. Open **Reports** and click the new **Weekly Report** tab. Your target should appear under "Target vs Achievement" with a real (likely 0, on a quiet day) actual value next to it. Try **Download Excel** here too.
4. Click the new **Campaign Closure Report** tab — this one has no date range, since it always covers the whole campaign. Scroll through its sections; the last one, "Learnings & Recommendations," is intentionally blank for your team to fill in. Try **Download Excel** here as well.

## S5.3 — Live dashboard, drill-down, live map command centre (this session, after founder said "Approve S5.2, please go ahead")

Per `docs/architecture/09-mvp-build-sequence.md` S5.3: "Module 16 full: Live dashboard + drill-down (National→…→Evidence) + live map command centre feed."

- **A new Overview page** — one screen with today's key numbers for the campaign (stops planned/started/completed/delayed/missed, how many people have started their day, pending approvals, pending deviation requests, open exceptions, offline/unsynced users), plus a click-through map of the campaign: click a state to see its districts, click a district to see its tehsils, click a tehsil to see its locations, click a location to see every stop planned there today, click a stop to see everything about it — who's assigned, its status, any forms/stock/sales reports filed, and any photos taken.
- **A new Live Map page** — one row per field worker with an assignment today, showing where they are (or last were), whether they're travelling, on-site, running late, flagged with a problem, or not heard from in a while, plus their team's van/bike if one is on file. Each row has a "View on map" link that opens their last known location in Google Maps.
- **Honest scope decision — no "national" cross-campaign view.** Everything above works one campaign at a time, the same way every other page in this system already does. A true "see every campaign for this client at once" view needs a genuinely different kind of access-control check this project doesn't have anywhere yet — not something to bolt on as an afterthought. This is a real, stated gap, not a silently narrowed feature; ask if you'd like it prioritized for a future stage.
- **Honest scope decision — no interactive embedded map.** No map-drawing library (the kind that shows an actual scrollable map with pins) is part of this project yet — adding one is a real new decision (which provider, whether it needs a paid API key) that shouldn't be snuck in as a side effect of this feature. Every location is still shown as text with a "View on map" link that opens Google Maps in a new tab, so you can still see it on a real map — just not embedded directly in the page.
- **Verified**: builds clean (backend + web); full regression suite still passing; all three new views tested live end-to-end against a real backend — the full drill-down walked start to finish from campaign down to a single stop's evidence, and the live map's six statuses (needs attention, offline, active, delayed, travelling, not started) each confirmed to show correctly and in the right priority order when more than one applies at once.

### Reviewing S5.3 — Live dashboard, drill-down, live map command centre

1. `git pull` and restart (`./scripts/bootstrap.sh`).
2. Log in as Rohan Mehta (`9000000001`) and open the new **Overview** page in the sidebar. You'll see today's numbers at the top (likely all zero or small, since this is a fresh day), and below that, click through **Bihar → Patna → Patna Sadar → Patna City Haat Ground** to see the one seeded stop there.
3. Open the new **Live Map** page. If no one has an assignment for today, this will show "No one is assigned today" — that's correct, not broken. If you'd like to see it populated, run the terminal command below to create a fresh test assignment for today, then refresh the page.
4. To create a fresh test assignment for today (so Overview and Live Map both have something to show), open a Terminal tab and run:
   ```
   cd ~/Desktop/impact-field-command
   docker exec -it impact-field-command-postgres-1 psql -U impact -d impact_field_command -c "
   WITH camp AS (SELECT id AS campaign_id, \"clientId\" AS client_id FROM campaigns WHERE name = 'Bihar Rural Van Outreach'),
   rahul AS (SELECT id AS user_id FROM users WHERE \"fullName\" = 'Rahul Kumar'),
   pjp AS (SELECT id AS pjp_id FROM pjps p, camp WHERE p.\"campaignId\" = camp.campaign_id LIMIT 1),
   new_row AS (
     INSERT INTO pjp_rows (id, \"clientId\", \"pjpId\", \"campaignId\", date, \"stateName\", \"districtName\", \"tehsilName\", \"locationName\", \"plannedStartTime\", \"plannedEndTime\", status, \"createdAt\", \"updatedAt\")
     SELECT gen_random_uuid(), camp.client_id, pjp.pjp_id, camp.campaign_id, now(), 'Bihar', 'Patna', 'Patna Sadar', 'Live Map Test Stop', now() - interval '1 hour', now() + interval '2 hour', 'ACTIVE', now(), now()
     FROM camp, pjp
     RETURNING id, \"campaignId\", \"clientId\"
   )
   INSERT INTO user_assignments (id, \"campaignId\", \"clientId\", \"userId\", \"pjpRowId\", \"assignedById\", \"assignmentDate\", status, \"createdAt\", \"updatedAt\")
   SELECT gen_random_uuid(), new_row.\"campaignId\", new_row.\"clientId\", rahul.user_id, new_row.id, rahul.user_id, now(), 'ASSIGNED', now(), now()
   FROM new_row, rahul
   RETURNING id;
   "
   ```
   Refresh the Live Map page — Rahul Kumar should now appear, most likely marked "Offline / no recent location" (no phone signal for this test row yet, which is correct).

## S5.2 — Exception tickets, in-app alerts, WhatsApp verification (this session, after founder said "please go ahead")

Per `docs/architecture/09-mvp-build-sequence.md` S5.2: "Exception tickets (full lifecycle) + Module 17 in-app alerts + Module 18 WhatsApp adapter with escalation ladders."

- **A real Exceptions page.** The system has quietly been detecting real problems since early in the build (like a stock count that doesn't add up) but there was nowhere to actually see and work through them. Now there is: a ticket moves through Detected → Assigned → Acknowledged → Under review → Action taken → Resolved → Closed (or Reopened if something new comes up), with a full history of who did what.
- **A general Alerts page.** The Device Risk page you already know about is actually a special-purpose view of a broader "alerts" system — this adds the general view, so anything flagged anywhere in the system (not just device problems) has somewhere to be seen and cleared.
- **Escalation is now real, not just a counter.** If a supervisor doesn't act on something, escalating it now genuinely notifies their manager (using the reporting-line structure already set up for each campaign) — both as an in-app notification and a WhatsApp message (still using the same safe MOCK system as OTP login — no real WhatsApp messages are sent in development, everything is logged to the terminal instead). If no manager is configured for someone, escalating still marks the ticket as escalated so nothing gets stuck, it just won't have anyone new to notify.
- **What's still honestly not there yet**: escalation only happens when a supervisor clicks the button — the fancier "escalates itself automatically after 15/30/60 minutes" version needs a scheduling system this project doesn't have yet, and isn't worth building just for this one feature. Also, the WhatsApp and in-app channels are real; a "push notification to your phone" channel is not — no app on any phone can currently receive one.
- **WhatsApp verification.** On the Approvals page, opening any submission now shows a "Start Verification Call" button — click it and it opens WhatsApp addressed to that field worker, for cases where a supervisor wants to see something live (a stall setup, a branding install) rather than just from photos. Nothing about the call itself is recorded — only that it happened and what the supervisor decided afterward.
- **Verified**: builds clean (backend + web); full regression suite still passing; every new feature tested live end-to-end against a real backend, including walking a test exception through its entire life from detection to closure, and testing escalation both with and without a manager configured.

### Reviewing S5.2 — Exception tickets, in-app alerts, WhatsApp verification

1. `git pull` and restart (`./scripts/bootstrap.sh`).
2. Log in as Rohan Mehta (`9000000001`) and open the new **Exceptions** and **Alerts** pages in the sidebar. With the current seed data these will likely both be empty — that's correct, not broken. If you want to see one populated, ask and a test exception can be added for you to walk through.
3. On the **Approvals** page, click into any submission — scroll down and you'll see the new "WhatsApp verification" section with a "Start Verification Call" button. Try it — it should open WhatsApp addressed to the field worker's number.

## S5.1 — Supervisor module (this session, after founder said "please go ahead" to start Stage 5)

Per `docs/architecture/09-mvp-build-sequence.md` S5.1: "Supervisor module complete (attendance, unsynced users, delayed activities, team performance, reassignment)."

- **A new Team Dashboard page** for supervisors — four views in one place: **Attendance** (everyone's day-start/day-end for the day, at a glance), **Unsynced users** (field workers who haven't been heard from by the server in a while — a check-in, check-out, GPS ping, or attendance mark), **Delayed activities** (today's stops running behind their planned check-in/check-out time), and **Team performance** (assigned/in-progress/completed counts and completion rate per person).
- **Reassignment was actually already half-built** from early in the project — the Assignments page could technically change who a stop was assigned to, just without two things a real tool needs: it would happily let you reassign a visit the original person had *already started or finished* (silently leaving their check-in/photos stranded under the old name), and it didn't leave a record of who reassigned what. Both fixed — reassigning a started/finished visit is now refused with a clear message, and every reassignment is logged. The Assignments page now has a proper "Reassign to" option.
- **Honest note on "unsynced users":** the server can only ever know when it last *heard* from someone's phone — it has no way to see data still sitting on the phone that hasn't been sent yet (that's the whole point of working offline). This view is a "haven't heard from this device in a while" proxy, not a literal count of pending items, and says so on the page itself.
- **Deliberately not built yet**, per the build plan's own staging: the live map, the exceptions inbox, WhatsApp verification, and team communication — all explicitly later pieces (S5.2/S5.3), not silently skipped.
- **Verified**: builds clean (backend + web); full regression suite still passing; all four dashboard views and the hardened reassignment tested live against a real backend — including deliberately creating a test stop that was overdue, confirming it showed up correctly in three different views, then confirming reassignment works before a visit starts and is correctly refused once it's started.

### Reviewing S5.1 — Supervisor module

1. `git pull` and restart (`./scripts/bootstrap.sh`).
2. Log in as Rohan Mehta (`9000000001`) and open the new **Team Dashboard** page in the sidebar.
3. **Attendance tab**: you should see everyone with a role on the campaign, with today's start/end times if they've marked them (try it yourself on your phone from the S4.3 review steps, then refresh this tab).
4. **Unsynced users / Delayed activities / Team performance tabs**: these depend on today's assignments — with the current seed data these may show empty, which is correct, not broken (nothing is scheduled for today yet). If you want to see them populated, ask and a fresh test PJP row can be added for today.
5. On the **Assignments** page, click any assignment to edit it — you should now see a "Reassign to" dropdown alongside the status field. Try reassigning one that hasn't been checked in yet — it should succeed. (Reassigning one that's already in progress or completed should be refused with a clear message — this needs a checked-in test visit to try, not something the current seed data has ready-made.)

## S4.3 — Sales & stock reconciliation + Attendance

Per `docs/architecture/09-mvp-build-sequence.md` S4.3: "Sales & stock — SKU reporting, reconciliation formula, mismatch exceptions. Attendance day-start/day-end."

- **A survey before building turned up that most of this was already done.** SKU-level stock reporting and the reconciliation formula (Opening + Received − Sold − Sampled − Damaged, compared against the actual physical count) were built back in Stage 3.1. What this session found, that hadn't been called out before: **the "mismatch generates an exception" part was also already built**, in that same Stage 3.1 work — the moment a field visit reports an actual closing-stock count that doesn't match the formula, the system already quietly records it as an internal exception. There's no supervisor screen to *see* that list yet (that's a later, dedicated stage — the full Exceptions inbox), but the underlying detection and recording has been working correctly since Stage 3.1. This was a documentation gap, not a missing feature — logged and corrected.
- **The one genuinely new piece this session: Attendance (day-start / day-end).** A field worker's phone app now has a simple "Start my day" / "End my day" card on its home screen — independent of any specific visit or location. Tapping it records the time (and GPS, if available — it won't block you if your phone's location is off, unlike check-in for an actual visit). The system won't let you start your day twice, or end a day you never started, or end it twice.
- **Deliberately no web admin page for Attendance yet** — the full Supervisor module (attendance rosters, unsynced users, team performance, etc.) is its own dedicated future stage, and building one screen from it early would be exactly the kind of half-finished, out-of-order work this project avoids. For now, Attendance is something the field worker sees on their own phone; a supervisor view comes later, as one part of that larger module.
- **Verified**: backend and web builds clean; full backend test suite still 13/13; `flutter analyze` 0 issues. All three new endpoints tested live end-to-end: a fresh day correctly shows nothing marked; starting the day records it and returns the time; trying to start twice is correctly refused; ending a day before starting it is correctly refused; ending the day records it; trying to end twice is correctly refused. The no-phone testing script has a new `--attendance` mode. QA grep clean.

### Reviewing S4.3 — Sales & stock reconciliation + Attendance

The stock reconciliation half needs no new testing — it's been working since Stage 3.1 (see the Reports page). The new piece to test is Attendance, and the best way is on your own phone, not the no-phone script.

1. On your phone: `git pull` isn't needed there — just make sure your backend is up to date (`git pull` on your computer, then restart with `./scripts/bootstrap.sh`).
2. Open the app on your phone and go to the home screen (where you see "Today's assignments").
3. You should see a new card near the top: "You haven't started your day yet" with a **Start my day** button.
4. Tap it. The card should update to show the time you started.
5. The button should now say **End my day**. Tap it, and the card should show both the start and end time.
6. Close and reopen the app (or pull down to refresh) — the times should still be there; they don't reset until the next calendar day.
7. If you don't have your phone handy: `node backend/scripts/simulate-field-visit.mjs --attendance` marks the next step (start, then end, on separate runs) and prints the result in the terminal — there's no web page to see it on yet, so the phone is the real test.

## S4.2 — Device-risk controls (this session, after founder said "please go ahead")

Per `docs/architecture/09-mvp-build-sequence.md` S4.2 and spec §18: "personally owned phones;
absolute prevention is impossible — implement risk detection, restriction and audit instead."

- **The system now automatically notices two kinds of suspicious device behaviour** and does
  something about it: a phone whose clock is significantly wrong, and a location reading that
  looks manipulated (reusing the same "impossible jump" detection built for Stage 4.1). When
  either happens, the device gets flagged at an escalating level — Warning → Flagged → Restricted
  → Blocked — and a supervisor sees it on a new **Device Risk** page.
- **A Restricted device is actually stopped** — it can't start or complete a field visit until a
  supervisor looks at it and either clears it (back to normal) or blocks it outright (locks the
  user out of that device entirely, reusing the device-blocking your team already had from day
  one). This isn't just a warning label — verified live that check-out genuinely fails with a
  clear message until a supervisor acts.
- **Deliberately narrow scope, stated plainly**: the full spec lists 18 different things to watch
  for — rooted phones, fake GPS apps, tampered app installs, screenshot evidence, and more. Most of
  those need specialized phone-level detection code that's a substantial, separate effort (and,
  like Stage 4.2's tracking work, genuinely can't be verified without real devices in hand) — not
  attempted this session. What's built today catches two real, meaningful signals; the rest are a
  known, tracked gap for a future session, not something quietly skipped. **Please don't assume a
  rooted or tampered phone would be caught today — it wouldn't be, yet.**
- **Verified**: backend and web build clean; full regression suite still 13/13; tested live against
  a real running backend — a genuinely clock-skewed check-in correctly flagged a device, a
  genuinely impossible GPS jump escalated it further to Restricted, a check-out attempt was
  correctly blocked with a clear message, the device correctly appeared in the new Device Risk
  page, "Clear" correctly un-blocked it and check-out then succeeded, and "Block" correctly
  prevented that device from logging in again afterward.

## Stage 4.2 — Flutter continuous GPS + on-device deviation warning (previous session, after founder approved Stage 4.1)

Per `docs/architecture/09-mvp-build-sequence.md` S4.1 and spec §14 — the phone-side half of the
engine built last session.

- **The field app now tracks location continuously while a visit is checked in**, not just at
  check-in/check-out — a location reading every 45 seconds while the activity screen is open,
  sent to the server in small batches. If a reading looks off (wrong location, unusual speed, an
  impossible jump between two readings), a warning banner appears right on the phone with an
  "Explain" button.
- **New "Report a deviation" button**, always available during an active visit — lets the field
  worker explain something the system wouldn't catch on its own (skipped a stop, had to leave
  early, GPS wasn't working), not just react to an automatic warning. Goes straight to the same
  Deviations review screen built last session.
- **Important, deliberate limitation — please read before testing**: tracking only runs while the
  visit screen is open on the phone. If the field worker locks their phone or switches to another
  app, tracking pauses until they come back. Building true "keeps tracking even with the phone in
  their pocket" tracking is real, separate phone-engineering work (it needs Google Play–level
  permissions and a persistent notification, the same kind of extra approval Play Store requires
  for banking/delivery apps) — deliberately not attempted this session, since there's currently no
  phone available to test it on and building something unverifiable felt like the wrong call. Logged
  as a clear next step, not a shortcut.
- **This is genuinely the first time this stage can't be verified on my end at all** — every
  automatic check I have access to (`flutter analyze`, the code-quality check) passed clean, but
  the two checks that actually run the app (`flutter test`, `flutter build linux`) are blocked by an
  unrelated download problem specific to this sandbox, not something in the code itself. **This
  stage needs your phone (or an Android emulator on your Mac) to properly confirm it works** — the
  no-phone script can't simulate walking around with GPS on. If a phone becomes available again,
  this is the natural next thing to test for real.

## Stage 4.1 — GPS/route/deviation engine (previous session, after founder approved Stage 3.4)

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
9. **Web login-refresh race condition, founder-diagnosed** (A-064): clicking Clear on the Device Risk page intermittently failed with a genuine "Unauthorized" error, even right after a confirmed-fresh login. Root cause: refresh tokens are single-use and rotate on every login-refresh, but the web app could fire two refresh attempts at once (e.g. a page's own background check plus a button click) — whichever one lost the race presented an already-used token, failed, and wiped out the other one's brand-new valid session, silently signing the founder out mid-click. Fixed so concurrent refresh attempts now share one single attempt instead of racing. Found entirely from the founder's own screenshots (DevTools Network tab showing the real 401), not from a log or a test. **This fix was real but turned out to be incomplete — see #10.**
10. **The actual, always-reproducible cause of "Could not clear this device"** (A-065): Clear and Block were both succeeding on the server every time — the device really was being cleared/blocked — but the response body was empty, and the web app's request code only knew how to handle an empty body on a `204` status, not the `201` these two actions actually return. Any empty-body success anywhere crashed with a JSON parsing error, which the Device Risk page showed as its generic "Could not clear/block this device" message. Reproduced live in this sandbox with a real backend, a real browser, and a scripted click on the real Clear/Block buttons — confirmed the exact failure, then confirmed it's gone after the fix (device correctly cleared, then correctly blocked, checked directly in the database both times). This is a general fix, not specific to Device Risk — it protects every button in the app that calls an action with no response body.

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
11. **Stage 4.2 (Flutter continuous GPS + on-device deviation warning) — APPROVED**, 20 July 2026. You tested on a real Android phone end to end: created a fresh test assignment for Rahul Kumar, checked in, confirmed a deviation reported from the phone appeared correctly on the web admin's Deviations page. This is the first Stage 4 piece confirmed on real hardware, not just code checks.
12. **Note on stage numbering**: what an earlier update called "Stage 4.2" was actually the phone-side half of Stage 4.1 (GPS/route/deviation). This entry (13) is the real, build-plan S4.2.
13. **S4.2 (Device-risk controls) — built, all checks passing, awaiting your review.** See "Reviewing S4.2" below — no phone needed, the no-phone script has a new `--device-risk` mode. Please read the "deliberately narrow scope" note above before testing — this catches 2 of the 18 signals the full spec describes (clock mismatch, manipulated location), not rooted phones or tampered apps yet.
14. **Approve S4.2, or request changes, before the next stage starts** — per process rules, this is a phase boundary.
15. **Bug you found while testing S4.2, "Could not clear this device" on the Device Risk page — fixed and personally confirmed working by you ("It works now"), 20 July 2026.** The first fix (a login-session timing issue) was real but didn't fully explain what you were hitting. The actual cause: the device really was being cleared/blocked correctly every single time, but the app showed an error anyway because of how it read the server's (empty, but successful) response. Fixed, verified with a live run before pushing, and now confirmed on your own machine too.
16. **S4.2 (Device-risk controls) is now fully APPROVED** — built, bug found during your testing, fixed, and confirmed working.
17. **Correction to item 16**: Stage 4 actually has three parts per the build plan (S4.1, S4.2, S4.3), not two — S4.3 was still open, not a separate later stage. You said "Please go ahead" and S4.3 has now been built (see below); Stage 4 is only fully closed once you approve this too.
18. **S4.3 (Sales & stock reconciliation + Attendance) — CONFIRMED WORKING on your phone**, 20 July 2026. Good news found along the way: the "mismatch generates an exception" part of stock reconciliation was actually already working since Stage 3.1 — just never called out clearly before. The one genuinely new piece, Attendance (day-start/day-end), you tested yourself: logged in, tapped "Start my day" (recorded 12:31 PM), then "End my day" (recorded 12:32 PM) — both worked correctly.
19. **The "session timeout" you saw along the way turned out not to be a bug in the app.** The actual causes were three separate, ordinary test-setup snags, found and cleared one by one with you: (a) `flutter run` needed to be pointed at your computer's network address for a real phone, not the default emulator-only address; (b) your Wi-Fi wouldn't let the phone and computer talk directly, worked around with a USB connection instead; (c) your test account had hit its device-registration limit from repeated reinstalls during troubleshooting, and one device was stuck pending approval. All three are resolved now. A genuine, separate login-refresh bug (A-067) was also found and fixed along the way — real, but not what caused what you saw.
20. **Stage 4 (4.1 + 4.2 + 4.3) — APPROVED**, 20 July 2026 ("Please go ahead" after confirming S4.3 working on your phone).
21. **Stage 5 (Command & control) starting now.** First piece: S5.1, the full Supervisor module (attendance, unsynced users, delayed activities, team performance, reassignment).
22. **S5.1 (Supervisor module) — APPROVED**, 21 July 2026. You personally tested reassignment on your own machine (correctly blocked on an already-started test visit, then correctly succeeded on a freshly created one) and confirmed it works as intended.
23. **S5.2 (Exception tickets + in-app alerts + WhatsApp verification) — CONFIRMED WORKING on your own machine, all three pieces**, 21 July 2026. WhatsApp verification: created a fresh test visit, found it in Approvals, approved it, started a verification call (correctly opened WhatsApp Web), then marked it complete. Exceptions: a test exception was added to your data and you walked it through its stages. Alerts: a test alert was added and you confirmed it works. This is a phase boundary — please approve or request changes before the next stage starts.
24. **S5.2 — APPROVED**, 21 July 2026 ("Approve S5.2, please go ahead"). Stage 5 continues with S5.3: live dashboards, drill-down (National → Client → Campaign → State → District → Tehsil → Location → Activity → User → Report → Evidence), and the live map command centre.
25. **S5.3 (live dashboard + drill-down + live map command centre) — built, all checks passing, awaiting your review.** Two new pages: **Overview** (today's numbers + click-through drill-down from state all the way to a single stop's evidence) and **Live Map** (where every field worker with an assignment today is, or last was, at a glance). One honest, stated gap: this works one campaign at a time like everything else in the system — a true "see every campaign for this client at once" view is a bigger piece of work not included here. See "Reviewing S5.3" above for how to try it, including a terminal command to create fresh test data since a normal day may show mostly zeros. This is a phase boundary — please approve or request changes before the next stage starts.
26. **S5.3 — APPROVED**, 22 July 2026. You created a fresh test assignment, opened Live Map, and confirmed Rahul Kumar showed correctly as "Offline / no recent location" (expected, since the test row has no real phone signal behind it), then said "let's move to the next step."
27. **S5.4 (Excel reporting, daily slice) — built, all checks passing, awaiting your review.** The Reports page's DFR and Stock Reconciliation tabs now have a real "Download Excel" button, producing a genuine `.xlsx` file matching your team's existing report format (per-product Qty/Amt. columns, Total row). Weekly and campaign-closure reports are a separate, bigger next step within S5.4, not built yet — stated plainly, not silently skipped. See "Reviewing S5.4" above for how to try it.
28. **S5.4 daily slice — CONFIRMED WORKING on your own machine**, 23 July 2026. You downloaded the Excel file from the Reports page and confirmed it opened correctly. Along the way, a stale `.next` build cache (left over from a production `pnpm build` run during this session's own verification, on top of the already-running dev server) briefly broke the web app's login page entirely (every static asset 404ing) — cleared and restarted cleanly; not a bug in any feature code.
29. **S5.4 second slice (Weekly + Campaign Closure reports, Targets) — built, all checks passing, awaiting your review.** A new Targets page lets you set KPI targets for the campaign; the Reports page gets two new tabs (Weekly Report, Campaign Closure Report), each with its own Excel download. This completes S5.4 (Module 19: Excel reporting service) end to end. See "Reviewing S5.4 — Weekly + Campaign Closure reports, Targets" above for how to try it. This is a phase boundary — please approve or request changes before the next stage starts.
30. **S5.4 — CONFIRMED WORKING on your own machine, both pieces**, 23 July 2026 ("just tested, weekly report and closure report both work"). This completes S5.4, which completes Stage 5, which completes the entire planned MVP build sequence in `docs/architecture/09-mvp-build-sequence.md` — every remaining item in that document is explicitly Post-MVP backlog (offline map corridors, a client-configurable dashboard-picker, PDF/PPT export, regional languages, AI image analysis, Impact IQ predictive features). Along the way, a git push from this session hit a real-world snag worth recording: the sandbox this build ran in has no way to authenticate to GitHub directly (no Keychain/credential access from its shell), so the S5.4 commit had to be pushed from your own Terminal instead, using a personal access token you generated — a one-time setup that your Mac should now remember via Keychain for future pushes. This is the biggest phase boundary yet — please confirm you're happy with the MVP as a whole before deciding what Post-MVP work (if any) to prioritise next.
31. **Post-MVP backlog started — you picked PDF/PowerPoint report exports first.** Built and all checks passing: every report (DFR, Stock Reconciliation, Weekly, Campaign Closure) now has a "Download PDF" button, and Campaign Closure additionally has "Download PowerPoint" — the one report actually meant to be presented in a room. Nothing new was calculated; both formats reuse the exact same numbers the Excel exports already compute. See "Reviewing — PDF/PowerPoint report exports" above for how to try it.
32. **PDF/PowerPoint report exports — CONFIRMED WORKING on your own machine**, 23 July 2026 ("just tested, both PDF and PowerPoint work fine"). This closes out the first Post-MVP backlog item. Remaining backlog: offline map corridors, configurable dashboard engine for clients, perceptual duplicate detection, regional languages, AI image analysis, and the Impact IQ predictive side (which the spec is explicit Impact builds separately — this system only needs to keep exposing clean data to it).
33. **Configurable dashboard engine for clients — built, all checks passing, awaiting your review.** A new Client Dashboard page, reachable by every role including the "Client Viewer" role that's existed since early in the project with nowhere to land — shows only the specific widgets you turn on per campaign, in whatever order you choose, from a set of 13 (today's numbers, geography, target vs achievement, sales, leads, team performance, and more). Nothing new was calculated; every widget reuses numbers already on Overview/Reports. One honest, stated gap: the deeper access-control half of this spec item (restricting a client to specific geography/dates, raw-vs-aggregated data) isn't built yet, only the "which KPIs show up" half. See "Reviewing — Configurable dashboard engine for clients" above for how to try it.
34. **Configurable dashboard engine — CONFIRMED WORKING on your own machine**, 23 July 2026 ("It looks fine" — confirmed the Team Performance widget's table matched expectations). This closes out the second Post-MVP backlog item. Remaining backlog: offline map corridors, perceptual duplicate detection, regional languages, AI image analysis, and the Impact IQ predictive side (built separately by Impact).

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

### Reviewing S4.2 — Device-risk controls

Also the no-phone script, plus the web admin. No phone needed, and this one doesn't even need a
check-in first.

1. In a fresh Terminal tab: `cd ~/Desktop/impact-field-command && git pull origin claude/phase-c-foundation-sfqijm`
2. Then: `node backend/scripts/simulate-field-visit.mjs --device-risk`
   — this logs in as Rahul Kumar and sends two location readings that are 6.6km apart but only 10
   seconds apart (physically impossible), which should flag his test device.
3. In the browser, log in as Rohan Mehta (`9000000001`) and open the new **Device Risk** page.
4. You should see the flagged device — Rahul Kumar, "Mock/manipulated location suspected," with a
   current level of L3_RESTRICTED.
5. Open **PJP Upload**, find any of Rahul's stops, and check its activity — if he tries to check in
   or check out from that same (now-restricted) device, it should be refused with a clear message.
   (The simplest way to see this: run `node backend/scripts/simulate-field-visit.mjs` — the full
   version — right after step 2, and confirm the check-in step fails with a "restricted" message.)
6. Back on the Device Risk page, try **Clear** — the device should disappear from the list.
7. Re-run step 2 to flag it again, then try **Block** instead — this time, a login attempt for that
   same device should be refused outright (same message you'd see for any blocked device).
8. To undo the block afterward: the device stays visible on the Device Risk page even after
   blocking (the underlying alert is still open) — click **Clear** on it and it goes back to
   normal, unblocked and ready for the next test.

## Open issues / P0-P1
- None outstanding — every issue found during this build was root-caused and fixed (see "Bugs found and fixed" above), not worked around.
