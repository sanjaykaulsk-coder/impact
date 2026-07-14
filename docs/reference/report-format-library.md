# Report Format Library — distilled from `Type_of_Campaign.xlsx`

## Provenance note (read this first)

**This document is Claude's own distillation of the source workbook, not a recovered original.**
The founder referenced a pre-existing `report-format-library.md` with specific prior decisions
(DFR aggregate rules, an SKU movement-type list, a validated field-type list, a migration
acceptance test); that file never successfully uploaded after two attempts, and rather than keep
blocking, this document was built directly from `docs/reference/Type_of_Campaign.xlsx` — 21 real
historical campaign-type sheets across DFR, Profile, Stock Reconciliation and Enquiry formats. If
the founder's original document surfaces later, treat *that* as authoritative and reconcile this
one against it; until then, this is the working basis for build-plan updates. No real contact
numbers, names, or GPS coordinates from the source data are reproduced anywhere below — only
column structure and field-type patterns, with fictional placeholder examples.

## 1. Four report-format archetypes

Every one of the 21 campaign types in the workbook (Van campaigns, Roadshows, Outreach, Product
demonstrations, Exhibitions, Corporate events, Mela stalls, Wholesale activation, Van/Bike-based
seeding, School campaigns, Product trial generation, Retail branding, Standard collateral
installation, Retail Audit, etc.) expresses its field data through some combination of four
recurring formats:

### 1.1 DFR (Daily Field Report) — aggregated, one row per team/location/day
The team's numbers for a single day at a single location: footfall, leads, conversions, and —
critically — **one column-group per SKU** (see §3), each holding that SKU's quantity/amount moved
that day. Ends in **auto-computed aggregate columns** (Total Qty, Total Sales Amount) that sum
across every SKU group in the row. Example header shape (Van campaigns DFR):

```
S.No | Date | State | District | Town | Outlets Visited | Outlets Converted
  → [SKU 1: Qty] [SKU 2: Qty] [SKU 3: Qty] ... [SKU N: Qty]
  → Total Qty | Total Sales Amt. | Remarks
```

### 1.2 Profile — record-level, one row per individual/outlet/consumer visited
The same per-SKU column-group pattern as DFR, but at the granularity of one row per outlet or
consumer within a visit, carrying identity/contact fields DFR rows don't (name, mobile number,
sometimes GPS latitude/longitude). This is the "record-level capture" the founder's directive
refers to: **Profile is the source of truth; DFR is Profile aggregated up to team/location/day.**
Nearly every campaign type in the workbook has both a DFR sheet and a Profile sheet built from the
same underlying SKU columns — DFR is never entered independently, it's a rollup.

### 1.3 Stock Reconciliation — SKU movement / invoice-level
Same per-SKU column-group shape again, but keyed by invoice/distributor rather than by
outlet-visit: Sale Qty, Scheme/Free Qty, Invoice Amount per SKU, reconciled against opening/
closing stock. This is where spec §22's formula (`Opening + Received − Sold − Sampled − Damaged =
Expected Closing`) is actually exercised against real SKU-level numbers.

### 1.4 Enquiry / Leads — lead capture, no SKU columns
Structurally different from the other three: no SKU column-groups at all. One row per contact,
with name, phone number, a lead-temperature or lead-type dropdown (Hot/Warm/Cold; B2B/Consumer),
company/interest fields, and a status. This maps directly to spec §29's "Lead" concept and the
existing `Lead` entity in the schema — it needs no new modelling, just a form template shaped like
this archetype.

## 2. Record-level capture with auto-computed DFR aggregates

**Directive:** DFR numbers must never be a second, independently-typed source of truth — they are
computed from Profile (or Stock Reconciliation) records, the same way the source workbook's "Total
Qty" / "Total Sales Amt." columns are spreadsheet formulas summing the SKU columns to their left,
not separately re-typed numbers.

Mapped onto the existing schema (`backend/prisma/schema.prisma`, Forms + Execution groups):
- A **Profile-archetype `FormResponse`** is captured per outlet/consumer visit — the record level.
- Each SKU's movement is a `FieldResponse` against a `FormQuestion` of type `SKU_SELECTOR` /
  `QUANTITY` / `SALES_VALUE` (already in the `FieldType` enum), scoped to one `CampaignSku` (§3).
- The **DFR view is a query, not a table**: `SUM(FieldResponse.valueJson→qty)` grouped by
  `(campaignId, locationId, date)` across that day's Profile responses. Auto-computed aggregate
  columns (Total Qty, Total Sales Amount) are `FormQuestion.formulaExpression` fields evaluated at
  read time (dashboard/report generation), the same mechanism already designed for conditional
  logic and computed fields in doc 07 — no new engine required, just a report definition that
  reads Profile-level data and rolls it up.
- This preserves spec's audit-trail principle (spec §37): the individual outlet-level capture is
  the immutable record; the daily total is always reproducible from it, never a place where a
  number can drift from its source.

## 3. Campaign SKU Master, with movement types

**Directive:** every campaign that reports sales/stock needs a per-campaign configurable list of
SKUs — never hard-coded per client, matching CLAUDE.md's "never hard-code an individual client's
workflow." The workbook's repeated column pattern (one group of sub-columns per product, with a
`Qty.` / `Amt.` sub-header row and an MRP/Selling-Price row above it) is exactly this master
applied to a form.

**New entity needed** (Campaign group, alongside the existing `Target`/`CampaignActivity`):

```
CampaignSku
  id, campaignId, skuCode, name, variantLabel (e.g. "50ml", "Baby Powder 30g"),
  category (e.g. "Baby Care", "Face Wash" — seen as the workbook's merged group headers),
  mrp, sellingPrice, packSize (e.g. "Pcs in 1 Case" — seen in Stock Recon sheets),
  isActive, createdAt, updatedAt
```

**Movement types** (the sub-columns every SKU group carries in the source data — this is the
validated list, drawn directly from what the real sheets actually capture, not invented):

| Movement type | Source-sheet column pattern | Spec §22 formula term |
|---|---|---|
| `OPENING_STOCK` | Stock Recon "Opening" | Opening Stock |
| `RECEIVED` | Stock Recon "Invoice"/received qty | Stock Received |
| `SOLD_QTY` / `SOLD_AMOUNT` | DFR/Profile "Qty." / "Amt." | Units Sold |
| `FREE_SCHEME_QTY` / `FREE_SCHEME_VALUE` | "Sc. Card Qty." / "Sc. Card Value" | (scheme, not in §22 formula — additive) |
| `SAMPLED_QTY` | Mela/School "Sample Distributed" | Units Sampled |
| `DAMAGED_QTY` | not observed in source sheets — spec §22 requires it; add as a zero-default field | Units Damaged |
| `CLOSING_STOCK_ACTUAL` | Stock Recon closing count | Actual Closing Stock (reconciled against Expected) |

A `SkuMovement` join row (`formResponseId`/`fieldResponseId`, `campaignSkuId`, `movementType`,
`quantity`, `amount`) is the natural normalized shape — queryable per SKU per movement type for
the reconciliation formula and for Impact IQ export, rather than one wide row per SKU as the
spreadsheet does it (which only works because a spreadsheet can have unlimited columns; a
relational table needs the SKU dimension as rows, not columns).

## 4. Validated field-type list

Cross-checked against the `FieldType` enum already in `backend/prisma/schema.prisma` (35+ types
per spec §10) and what the real sheets actually use. Every type below is already represented in
the schema; nothing new needs to be added to the enum — this section is a confirmation, not a
change:

| Observed in workbook | Maps to existing `FieldType` |
|---|---|
| Date (visit date, invoice date) | `DATE` |
| Time (activity start/end) | `TIME` |
| Free text (location, remarks, address) | `SHORT_TEXT` / `LONG_TEXT` |
| Mobile number (retailer, lead, consumer) | `SHORT_TEXT` with a phone-pattern `ValidationRule`, not a distinct type — matches the existing normalized `ValidationRule` table design |
| Integer counts (footfall, outlets visited) | `INTEGER` |
| Currency (sale amount, invoice amount) | `CURRENCY` |
| Quantity, per-SKU | `QUANTITY` |
| SKU line reference | `SKU_SELECTOR` |
| Sales value, per-SKU | `SALES_VALUE` |
| Stock value | `STOCK_VALUE` |
| Dropdown (Lead Type: Hot/Warm/Cold; Customer Type: B2B/Consumer; Outlet Type) | `DROPDOWN` |
| Yes/No (Massage Done?, Have you stocked X?) | `YES_NO` |
| GPS latitude/longitude (Van-based seeding Profile) | `GPS` |
| Auto-computed total (Total Qty, Total Sales Amt.) | `AUTO_*` family + `FormQuestion.formulaExpression` |
| Retailer/outlet identity block (name, address, contact) | `RETAILER_DETAILS` |
| Consumer identity block (name, contact, occupation) | `CONSUMER_DETAILS` |
| Remarks/free-text closing field | `REMARKS` |

**Finding:** the existing field-type list is sufficient for every real-world column pattern
observed across all 21 campaign types. No schema change is needed here — this validates the
Phase C form-engine design against real data rather than requiring new work.

## 5. Migration acceptance test

Concrete, reproducible pass/fail criteria for "the dynamic form engine can actually replace these
spreadsheets" — to be implemented as an automated test once the form builder module is built:

1. **Structural fidelity:** for a representative sample of 3 campaign types (Van campaign, Mela
   stall, Retail Audit — chosen to cover DFR+Profile, DFR+Stock-Recon+Profile, and Profile-only
   patterns respectively), every column in the source sheet maps to exactly one `FormQuestion`
   with a `FieldType` from §4 above. No column is silently dropped; no `FormQuestion` is invented
   that doesn't correspond to a real source column.
2. **Aggregate correctness:** given a set of captured Profile-level `FormResponse` rows equivalent
   to one day's worth of the source sheet's Profile data, the computed DFR rollup (§2) must
   exactly equal the source sheet's own Total Qty / Total Sales Amt. columns for that day — to the
   cent, not just approximately. This is the test that proves "auto-computed, not re-typed."
3. **Stock reconciliation correctness:** given Opening + Received + Sold + Free + Sampled +
   Damaged movements for one SKU, the computed Expected Closing Stock (spec §22 formula) matches
   what a manual reconciliation of the same movements would produce, and a mismatch against a
   supplied Actual Closing Stock value correctly raises an exception record.
4. **Versioning survives a mid-campaign SKU change:** adding a new SKU to `CampaignSku` mid-
   campaign must not alter the `FormVersion` of already-captured historical responses (spec §10)
   — old Profile records remain valid against the SKU list that existed when they were captured.
5. **Data-isolation holds under the new tables:** `CampaignSku` and `SkuMovement` carry
   `clientId`/`campaignId` and are covered by the same three-layer tenant isolation already built
   in Phase C (guard + Prisma tenant-scoping + Postgres RLS) — a cross-tenant read attempt against
   SKU/movement data must return zero rows, exactly like every other tenant-scoped table.

Until the form-builder and SKU-master modules are actually built (Stage 3 of the MVP sequence),
this is a specification for that future test suite, not a test that runs today.
