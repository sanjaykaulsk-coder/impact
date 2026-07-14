# 02 · System & Module Diagrams

## System diagram

```mermaid
flowchart LR
  subgraph Field["Field (offline-capable)"]
    A[Flutter Android App\nDrift encrypted DB\nSync queue + WorkManager]
  end
  subgraph Office["Office / Client"]
    W[Next.js Web Portal\nAdmin · Supervisor · Command Centre · Client views]
  end
  subgraph Core["Backend — NestJS modular monolith"]
    API[REST API /api/v1\nJWT + device binding\ntenant guard on every request]
    ENG1[Campaign Config Engine]
    ENG2[Form & Workflow Engine]
    ENG3[Sync & Execution Engine]
    ENG4[Monitoring / Exception / Analytics Engine]
    JOBS[BullMQ workers\nwatermarking · risk rules · alerts · escalations · exports]
  end
  subgraph Data["Data layer"]
    PG[(PostgreSQL 16 + PostGIS\nRLS tenant isolation)]
    RD[(Redis\ncache + queues)]
    S3[(MinIO / S3\noriginals + watermarked\nsigned URLs)]
  end
  subgraph Adapters["Adapter interfaces (MOCK in dev)"]
    OTP[OTP provider]
    WA[WhatsApp provider]
    PUSH[Push notifications]
  end
  IQ[Impact IQ\nexport API · webhooks · batch]

  A -->|sync batches, chunked media| API
  W --> API
  API --> ENG1 & ENG2 & ENG3 & ENG4
  ENG1 & ENG2 & ENG3 & ENG4 --> PG
  API --> RD
  JOBS --> PG & S3
  API -->|signed upload/download URLs| S3
  API --> OTP & WA & PUSH
  ENG4 --> IQ
```

## Backend module diagram (NestJS modules — separable by design)

```mermaid
flowchart TB
  subgraph Identity
    auth[auth · OTP · sessions]
    device[device binding & risk]
    rbac[roles & permissions]
    tenant[tenancy guard]
  end
  subgraph Configuration
    client[client mgmt & branding]
    campaign[campaign lifecycle]
    template[activity templates]
    forms[form builder + versioning]
    workflow[workflow & milestones]
    pjp[PJP & routes]
    assign[teams & assignment]
    target[targets & KPIs]
  end
  subgraph Execution
    activity[activity instances]
    sync[offline sync & outbox]
    media[media + watermark pipeline]
    gps[GPS trace + PostGIS deviation]
    stock[sales & stock]
    recce[retail recce & branding flow]
  end
  subgraph Governance
    approval[approvals & remote approval]
    deviation[deviation requests]
    exception[exception tickets]
    alert[alert engine + escalation]
    audit[append-only audit log]
  end
  subgraph Insight
    dash[dashboard engine]
    report[report service - Excel first, extensible]
    export[Impact IQ export layer]
  end
  tenant -.guards.-> Configuration & Execution & Governance & Insight
```

## Flutter app structure (feature-first)

```
app/lib/
  core/        theming from server branding · localization (hi default) · sync engine · camera service · gps service · risk checks
  features/
    auth/  campaign_select/  home/  assignments/  pjp_route/
    activity/ (milestones, dynamic form renderer)  evidence/
    sales_stock/  deviation/  exceptions/  verification/
    sync_centre/  notifications/  profile/
```

The dynamic form renderer is one engine that draws any FormVersion JSON — the app never contains a client-specific form.
