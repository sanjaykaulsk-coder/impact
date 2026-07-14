# 04 · API Structure Overview

REST, versioned under `/api/v1`. JWT bearer + device header on field endpoints. Every request passes the tenancy guard; every response is scoped to the caller's client/campaign/geography permissions. OpenAPI spec generated from NestJS decorators — the Flutter and Next.js clients consume generated types from `shared/`.

## Route groups

### Identity
```
POST /auth/otp/request            mobile → OTP (MOCK provider in dev)
POST /auth/otp/verify             OTP → tokens + device registration
POST /auth/refresh                rotate tokens
POST /auth/logout                 revoke session (supports remote logout)
GET  /me                          profile, campaign roles, permissions
GET  /me/campaigns                campaigns for selection screen
```

### Campaign configuration (admin)
```
CRUD /clients                      + branding upload, palette, access rules
CRUD /campaigns                    + status transitions (draft→…→archived)
CRUD /campaigns/:id/branding
CRUD /activity-templates           master library + campaign-level overrides
CRUD /campaigns/:id/forms          templates
POST /forms/:id/versions           publish new immutable version
CRUD /campaigns/:id/workflow       stages, milestones, approval rules
POST /campaigns/:id/pjp/upload     file → column mapping → preview → publish
PATCH /pjp/:id/rows/:rowId         edit/cancel/postpone/reschedule/reassign (audited)
CRUD /campaigns/:id/assignments    users, teams, geography, vehicles
CRUD /campaigns/:id/targets
CRUD /users                        + bulk upload, block, device block, transfer
CRUD /roles /permissions
CRUD /alert-rules /escalation-rules
```

### Field sync (the offline backbone)
```
GET  /sync/bootstrap               everything the device needs for the day:
                                   config, branding, assignments, PJP,
                                   form versions, SOP, map corridor manifest
POST /sync/batch                   array of offline actions, each with
                                   client_ref idempotency key; per-item
                                   accept/reject results
POST /media/init                   declare file (hash, size, type) → upload id
PUT  /media/:id/chunks/:n          resumable chunked upload
POST /media/:id/complete           server validates hash, queues watermark job
GET  /sync/status                  server view of device's pending items
```

### Execution & governance
```
POST /activities/:id/check-in      GPS validated against tolerance (PostGIS)
POST /activities/:id/milestones/:mid/submit
POST /activities/:id/deviations    reason + remarks → supervisor queue
POST /deviations/:id/decision      approve/reject (audited)
GET  /supervisor/inbox             approvals + deviations + flagged media
POST /approvals/:id/decision       approve / reject-with-reason → correction loop
CRUD /exceptions                   ticket lifecycle + escalation
POST /verifications                WhatsApp verification outcome logging
```

### Insight
```
GET  /dashboards/:key              config-driven dashboard payloads
GET  /map/live                     command-centre feed (statuses, last GPS)
GET  /reports/daily|weekly|closure?format=xlsx
GET  /audit                        filtered audit queries (permission-gated)
```

### Impact IQ export layer
```
GET  /export/:dataset?since=…      incremental, watermark-timestamp based
POST /webhooks                     subscription management
GET  /export/dictionary            machine-readable data dictionary
```

## Cross-cutting behaviours

- **Idempotency:** all device writes carry `client_ref`; replays return the original result.
- **Timestamps:** device timestamp and server timestamp stored side by side; server time authoritative for SLA/alert logic; large drift raises a device-risk flag.
- **Pagination:** cursor-based on all list endpoints (field data volumes are large).
- **Errors:** consistent envelope `{code, message, hint, field_errors[]}`; Hindi+English user-facing messages resolved client-side by code.
- **Rate limiting:** per-device and per-user buckets on auth and sync routes.
- **Audit:** mutating endpoints emit audit events automatically via interceptor — auditing is not left to individual module authors' discipline.
