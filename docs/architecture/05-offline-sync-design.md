# 05 · Offline-Sync Design

The most failure-prone part of the product; designed first, built into the foundation, never retrofitted.

## Morning bootstrap (download side)

On login / campaign selection / pull-to-refresh with connectivity:
`GET /sync/bootstrap` returns a compact package: campaign config + branding, today's (and configurable N days of) assignments, PJP rows, published FormVersions, workflow + milestones, SOP checklist, alert contacts, and a map-corridor tile manifest. All stored in the encrypted Drift database. The app is then fully self-sufficient for the field day.

## Capture side (the outbox pattern)

Every user action that changes data — check-in, milestone form, photo, signature, deviation request, check-out — is written **locally first** as an `outbox_item`:

```
outbox_item: id (client_ref UUID) · type · payload JSON · activity_id ·
             created_at (device) · status · retry_count · last_error
media_item:  id · outbox_ref · file path (encrypted store) · sha256 ·
             size · chunk_progress · status
```

The UI reads from local state — the executive never waits for the network.

## Status model (visible to the user in the Sync Centre, per spec)

Draft → Saved offline → Pending upload → Uploading → Partially uploaded → Synced · Upload failed · Validation failed · User action required

## Upload strategy

1. **Structured data first, media second.** A submitted report becomes visible to supervisors (with "media pending" markers) even before photos finish.
2. **Chunked, resumable media:** `POST /media/init` (hash+size) → 512KB chunks → `complete` (server re-verifies hash). Interrupted uploads resume at the last confirmed chunk.
3. **Network-aware:** metered connections upload structured data + thumbnails; full media waits for WiFi or explicit "upload now" — configurable per campaign.
4. **Battery-aware:** WorkManager constraints; aggressive retry only while charging or above battery threshold.
5. **Retry:** exponential backoff with jitter (30s → 2m → 10m → 30m, cap 6h), retry_count persisted; after N failures → "User action required" + supervisor's unsynced view.

## Conflict rules (fixed policy)

- **Server wins on configuration.** If a form version, assignment or PJP row changed while the device was offline, the device re-downloads config. A report captured against a now-superseded FormVersion remains valid — it is permanently linked to the version used at capture (spec §10).
- **Device wins on field-captured data.** The server never overwrites a captured value. Duplicate submissions are impossible by design: unique (device_id, client_ref).
- **Cancelled locations:** if an activity's location was cancelled while offline, the captured report is accepted but flagged for supervisor review, never discarded.

## Safety nets (per spec §19)

- End-of-day local notification when unsynced items exist
- Warning dialog before logout with pending items
- Configurable restriction: cannot start the next assignment while *critical* unsynced data (evidence, closure reports) exists
- Supervisor dashboard feed of users with unsynced items and last-seen times
- Full sync log locally + `SyncLog` server-side for support diagnostics

## Watermarking pipeline (server-side)

Original uploaded → stored as ORIGINAL variant → BullMQ job renders the watermark strip (client, campaign, location, district, date, time, lat/long, user, activity ID — clean strip, subject never covered) → stored as WATERMARKED variant → display surfaces always serve WATERMARKED via signed URL; ORIGINAL access is a distinct permission. Device also burns a lightweight overlay at capture time so even a never-synced photo carries provenance.
