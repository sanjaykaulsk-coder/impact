> ## ⚠ STATUS NOTICE — 23 Sep 2026, added after the four-service brief
>
> **This plan is materially out of date, in your favour.** It was written assuming Phase 0
> — harvesting 27 years of records into a structured data asset — was still to be done over
> months 1–3. The four-service brief shows it substantially **done**: a platform exists with
> a village and Census reference spine, ~3.88 lakh mapped touchpoint entities, 38,424 haats
> with market day, a retail and chemist layer, 1,111 documented campaigns and 5,700+ costed
> line items across 25 states.
>
> That moves the plan forward by roughly 6–9 months and changes the sequencing: the question
> is no longer *how do we build the asset* but *which layers are live in the product, and
> what can we therefore claim*. See `05-SERVICE-STRUCTURE-AND-NUMBERS-REVIEW.md`.
>
> **Still valid and unchanged:** the claim ladder (§8), the contract/IP question (§3.2 — which
> becomes *more* urgent now that a commercialisable asset demonstrably exists), the decision
> gates, and the risk register.
>
> **Needs rewriting against the platform's real state:** §3 (Data Stack phases), §7
> (sequencing), and the product verdicts in §2. I could not do that rewrite from this session
> — the platform is not in this repository.

---

# BHARAT IQ — PRODUCT DEVELOPMENT PLAN
**From claimed to real: sequencing the portfolio the website wants to advertise**
Prepared: 23 September 2026 · Companion to `03-CLAIMS-AUDIT.md`

---

## WHY THIS DOCUMENT EXISTS

The claims audit found the website advertising eleven products that do not exist — the Bharat IQ Index "Volume VIII", six downloadable reports, Rural Pulse, Field Force Allocation AI, an Enterprise Strategy Platform, Brand Penetration Indices.

There are two ways to close that gap. Delete the claims, or build the products. This plan takes the second route wherever the product is worth having, and kills the ones that aren't.

**The governing rule, carried forward from the audit:** a product is claimable on the website the day it ships, and not a day earlier. Section 8 sets out exactly which sentence each release unlocks.

### What I know and what I don't

This plan is built on the business description in `CLAUDE.md` and the competitive analysis in `00-SEO-STRATEGY.md`. I do **not** have Impact's headcount, revenue, current data holdings, client contracts or capital position. So:

- Effort is expressed in **roles and elapsed time**, not rupees — you can cost it against your real rates
- Every dependency on something I cannot verify is marked **`[CONFIRM]`**
- Sequencing logic is stated explicitly, so you can re-order it against facts I don't have

Do not treat any number here as a forecast. They are structural estimates for planning, and they are labelled as such — which is the same discipline the audit demanded of the website.

---

## 1. THE STRATEGIC FRAME

### 1.1 What Bharat IQ actually is

Not a research agency with a content marketing arm. **An intelligence business whose moat is a data asset that competitors cannot buy, rent or rebuild.**

Kantar can out-hire you. NielsenIQ can out-spend you. Neither can retro-fit 27 years of continuous village-level execution presence. That is the only asset in this business that compounds, and every product below either feeds it or monetises it.

### 1.2 The three revenue layers

| Layer | What it is | Margin | Scales with | Role |
|---|---|---|---|---|
| **L1 — Services** | Custom research, audits, advisory | Project margin | Headcount | Pays for everything. Feeds the data asset. |
| **L2 — Publications** | Index, Pulse, Decoders, Field Notes | Low direct revenue | Reputation | Generates demand for L1 and L3. Builds the category position. |
| **L3 — Subscriptions & data** | Continuous intelligence, panels, dashboards | Recurring, high | Data asset, not headcount | The valuation layer. Where this becomes a business worth more than its billings. |

**Most agencies in this category never leave L1.** They bill projects forever, and the business is worth a multiple of profit rather than a multiple of recurring revenue. The entire point of Bharat IQ is to use L1 cashflow to build an asset that produces L3 revenue.

### 1.3 The sequencing principle

> **Harvest before you build. Publish before you productise. Prove recurring demand before you engineer software.**

Three failure modes this avoids: building a data platform before knowing what anyone pays for; publishing reports nobody reads because there is no distribution; and — the one the audit caught — marketing products before they exist.

---

## 2. THE PORTFOLIO

Eleven candidates, assessed on strategic value, buildability from what you plausibly have, and honest revenue potential.

| # | Product | Layer | Verdict | Earliest honest launch |
|---|---|---|---|---|
| P1 | Custom research & advisory | L1 | **Exists — formalise** | Now |
| P2 | Rural Data Stack (the asset) | Infra | **Build first, phased** | Continuous from M1 |
| P3 | Field Notes | L2 | **Build — fastest credibility** | M2 |
| P4 | Bharat IQ Index, Volume I | L2 | **Build — flagship** | M6–M9 |
| P5 | Rural Pulse Quarterly | L2/L3 | **Build after retailer panel** | M9 |
| P6 | Category Decoders | L2/L3 | **Build — one per year** | M12 |
| P7 | Rural Retail Census-as-a-product | L1/L3 | **Build — most defensible** | M4 |
| P8 | Retailer & distributor panel | L3 | **Build — unlocks P5** | M6–M9 |
| P9 | Intelligence subscriptions | L3 | **Build once P2 is real** | M12–M15 |
| P10 | Client dashboard / data access | L3 | **Build last** | M18+ |
| P11 | "Field Force Allocation AI", "Enterprise Strategy Platform" | — | **KILL** | Never as named |

### 2.1 On P11 — kill these

The website invented two software products. Delete both, permanently.

"Field Force Allocation AI" is a real capability sitting inside route-to-market advisory (P1) and, eventually, inside Field Command. It is not a separate product, and naming it as one commits you to building and supporting software you have no plan for. "Enterprise Strategy Platform" is not a product at all — it is consulting vocabulary attached to nothing.

If a software layer is ever right, it arrives as P10, built on infrastructure that exists, sold to clients who already pay for L3. Not as a name in a footer.

---

## 3. P2 — THE RURAL DATA STACK (build this first)

Everything else depends on it. It is also the one thing no competitor can start from where you can.

### 3.1 Phase 0 — Harvest (Months 1–3) · **highest return in the plan**

27 years of campaign records, field reports, retailer lists, village coverage sheets, audit photographs and cost matrices sit in files, drives and inboxes. Today it is history. Structured, it is Layer 1 and Layer 2 of the Data Stack — at a fraction of what primary collection would cost.

**Work:**
- Inventory every source: campaign reports, PJP records, retailer lists, activation logs, client deliverables, ICON site records, XPAND distributor data `[CONFIRM: what exists and in what form]`
- Define the canonical village and outlet schema — do this **before** ingestion, not after
- Build the ingestion pipeline (this overlaps heavily with the IMPACT IQ repository work already scoped)
- De-duplicate, geocode against Census and PMGSY references, resolve entity conflicts
- **Label every record COUNTED / MODELLED / ESTIMATED at ingestion.** Retro-fitting provenance is close to impossible; the audit showed exactly what happens when provenance is decorative

**Team:** 1 data engineer · 1 rural ops lead who knows where the records are · 2 data associates · part-time analyst
**Output:** Village Database v1 and Retailer Universe v1, with a **real, defensible count** — which is also what fills the first set of `[FILL: X]` tokens the audit flagged.

**The most important sentence in this plan:** whatever that count turns out to be, publish it. If Phase 0 yields 40,000 villages, the site says 40,000. A real 40,000 beats an invented 8,40,000, because the real one survives the question "show me."

### 3.2 The blocker you must resolve before Phase 0 completes — `[CONFIRM]`

**Do your client contracts permit campaign-derived data to be aggregated into a product you publish or sell?**

Most agency MSAs assign work product to the client and restrict use of data generated under the engagement. If yours do, Phase 0 produces an internal asset you cannot commercialise — a materially different plan.

This is the same issue as audit finding **A6**, where the site stated in writing that benchmarks are built from work across competing conglomerates. That sentence has to go regardless. The underlying question does not.

**Resolve it now, in this order:**
1. Counsel reviews the standard MSA and the top 20 client contracts
2. Classify holdings: freely usable / usable if anonymised and aggregated / not usable
3. Amend the **forward** contract template — a clause permitting anonymised, aggregated benchmark use, with the client getting benchmark access in return. That is a fair trade and most will take it
4. Build the published asset only from the usable pool. Never retro-fit permission

Until step 1 is done, treat every harvested record as internal-only.

### 3.3 Phase 1 — Enrich (Months 3–9)

Overlay public data onto the harvested spine: Census 2011 village directory, PMGSY road records, agricultural statistics, banking and telecom penetration, electrification. All public, all legitimate, all cheap.

**Be honest about Census 2011 in the output.** It is fifteen years old. Anything derived from it is MODELLED at best. The website's claim to have superseded it with satellite and PMGSY integration was invented — but the *idea* is sound and worth actually doing, in that order and at that cost.

### 3.4 Phase 2 — Live telemetry (Months 6–18) · **the Field Command dependency**

Layer 4 — live, geo-tagged execution data — is the layer no competitor can replicate. It is also the layer the website faked most egregiously.

**It becomes real when IMPACT FIELD COMMAND is in production across campaigns.** Every geo-tagged, time-stamped proof-of-execution record that platform captures is a Bharat IQ data point. That is a genuine strategic link between the two initiatives, and it argues for Field Command rollout being treated as Bharat IQ infrastructure, not only as an operations tool.

**Required, and not yet in scope on either side:**
- An export contract from Field Command into the Bharat IQ store `[CONFIRM: not currently in the Field Command spec]`
- Tenant-level rules on which client data may flow, tied to §3.2
- Anonymisation at the boundary, not downstream
- A defined refresh cadence — and whatever it genuinely is, publish that. If it is weekly, say weekly. "Live real-time ± 4 hours" was invented and would be a support burden even if true

**Until the pipeline exists and carries real volume, the word "live" does not appear on the website.**

### 3.5 Phase 3 — Benchmarks (Months 12–24)

Normative data accumulates as studies run. It is a by-product, not a project — but it needs the schema designed early so studies deposit into it automatically. Design it in Phase 0; harvest it continuously; publish it from M12.

---

## 4. PUBLICATIONS — P3, P4, P5, P6

### P3 — Field Notes (start Month 2) · *start here*

Short, free, specific: one market, one observation, 8–20 pages. "What we saw in Muzaffarnagar in August."

**Why first:** it needs no new infrastructure. Your field teams already generate the raw material weekly. It is the cheapest possible proof that Bharat IQ has something to say, it seeds SEO and AI-citation authority months before the Index exists, and it builds the publishing muscle on low stakes.

**Cadence:** monthly. **Effort:** ~1 analyst-week each. **Gate:** client-identifying detail removed; every claim traceable to a specific field record.

Note the audit finding: the site published "Field Note #14" about 140 shops in Muzaffarnagar and Saharanpur. That study was never run — but it is a genuinely good idea for Field Note #1.

### P4 — The Bharat IQ Index, Volume I (Months 6–9)

Composite district-level rural opportunity ranking: consumption momentum, distribution density, aspiration, digital readiness.

**Why it matters:** the only branded instrument in this space today is the CII–CRIF Rural Business Confidence Index. This is the single highest-leverage authority asset available to you, and it is the reason the strategy document put it first.

**What it actually requires:**
- A defensible, **published** methodology — the composite must be reproducible by a critic
- District coverage honestly stated. If Volume I covers 180 districts well, it covers 180 districts. A partial index with stated limits is credible; a claimed-national one that cannot answer district-level questions is not
- Primary data collection to fill gaps the harvest cannot `[CONFIRM: budget]`
- An editorial and review process — at least one external methodologist before publication
- PR distribution built before launch, not after

**Effort:** 1 lead analyst, 1 data scientist, 1 editor, ~4 months, plus fieldwork.

**Say Volume I.** The invented "Volume VIII" implied seven editions that never existed. Volume I with a real method is worth more than Volume VIII with none, and the honest version compounds — by Volume IV you have a trend line nobody else owns.

### P5 — Rural Pulse Quarterly (Month 9, after P8)

Quarterly field signal: retailer sentiment, stocking shifts, price movement, competitive activity.

**Hard dependency: it needs the retailer panel (P8).** Without a stable panel, "Rural Pulse" is anecdote with a cover page, and quarter-on-quarter comparisons are meaningless because the base changes. This is why the site's Rural Pulse claim ("field signal from 4,50,000 retailers across 42 states") was not just wrong in its numbers but wrong in its premise.

Build P8 first. Then Pulse is a real instrument.

**Cadence:** quarterly, fixed dates, never missed. A tracker that skips an edition loses its trend value permanently.

### P6 — Category Decoders (Month 12, then annual)

One sector taken apart completely, 60–100 pages, gated. **Start with FMCG** — largest buyer pool, strongest existing data, clearest commercial pull.

Serves three purposes: lead generation, sales enablement, and forcing the organisation to consolidate everything it knows about one category once a year.

**Realistic pricing question `[CONFIRM]`:** gated-free for lead-gen, or paid? Gated-free builds the list faster and suits an entrant with no reputation yet. Revisit once the brand carries weight — probably after Index Volume III.

---

## 5. P7 & P8 — THE TWO PRODUCTS THAT MONETISE FASTEST

### P7 — Rural Retail Census-as-a-product (Month 4)

Not a report. A **deliverable data asset**: a geo-tagged, verified outlet database for a client's target geography, which the client keeps.

**Why this is the best near-term commercial product:**
- Directly sellable today, using capability Impact already has
- Priced per outlet — scales cleanly, easy to quote, easy to compare
- Every census sold **also enriches your own Layer 2**, subject to §3.2. The client pays you to build your moat
- Structurally defensible: nobody can desk-research their way to a counted outlet universe
- Recurring by nature — outlet universes decay ~15–20% a year `[CONFIRM against your own re-census data]`, so annual refresh is a genuine need, not an upsell

**Requirements:** a standard census instrument and schema, a quality protocol with a stated back-check rate (the real one), a per-outlet cost model, and a client delivery format.

This product alone can fund a large part of Phase 0.

### P8 — Retailer & distributor panel (Months 6–9)

A recruited, consented, continuously-tracked set of rural retailers and channel partners reporting on stocking, off-take, margins, competitive activity and sentiment.

**Unlocks:** P5 (Rural Pulse), P9 (subscriptions), and continuous competitive tracking sold to multiple clients from one collection cost — the best margin structure in the portfolio.

**Design decisions to make before recruiting:**
- Size and stratification. **Start small and real**: 1,500–3,000 outlets across 4–6 states, properly stratified, beats a claimed pan-India panel. Expand once retention is proven
- Incentive model and, critically, **attrition management** — panels die quietly and the numbers keep reporting
- Consent architecture under DPDP. This is where DPDP compliance genuinely becomes mandatory rather than a badge — you are collecting personal and commercial data from identifiable individuals on a recurring basis. Get counsel in at design stage
- Refresh policy — what share is replaced annually, and how that is disclosed in published outputs

**Publish the panel's real composition with every Pulse edition.** It is the credibility of the instrument.

---

## 6. P9 & P10 — THE RECURRING LAYER

### P9 — Intelligence subscriptions (Months 12–15)

A standing watch on a client's categories, geographies and competitors: monthly readout, quarterly deep-dive, analyst access, alerting on material shifts.

**Prerequisites, all of them:** P2 real, P8 running, P4 at Volume II or later, and at least three clients who have bought the same thing twice as a custom engagement. **Do not launch a subscription until repeat custom demand proves the need.** Subscriptions launched on hypothesis churn in year one and burn the relationships.

**Structure:** annual contract, tiered by category and geography count `[CONFIRM: pricing against your custom-research rates]`.

### P10 — Client dashboard (Month 18+)

Role-based access to the client's own data plus relevant benchmark layers.

**Deliberately last.** It is the most expensive thing in the plan, the most easily copied, and the least valuable without everything beneath it. A dashboard on a thin data asset is a liability — it makes the thinness visible and puts you in a software support business you did not plan for.

**When it comes, build it on the Field Command stack** — Next.js, NestJS, Postgres/PostGIS, the same team. That is a real and material saving, and the strongest argument for treating Field Command and Bharat IQ as one technical programme `[CONFIRM: engineering capacity]`.

---

## 7. SEQUENCING

```
MONTHS 1-3    P2 Phase 0 — HARVEST          ██████
              Contract/IP review (§3.2)     ██████   ← blocks everything downstream
              P3 Field Notes begin              ███
              P7 census product design          ███

MONTHS 4-9    P2 Phase 1 — ENRICH           ██████████████
              P7 Retail Census SELLING      ██████████████   ← first new revenue
              P8 Panel design & recruit         ██████████
              P4 Index Volume I build              ███████
              P3 Field Notes monthly        ██████████████

MONTHS 9-12   P4 INDEX VOLUME I PUBLISHES        ★
              P5 Rural Pulse Edition 1              ★
              P2 Phase 2 — Field Command telemetry ████████
              P6 FMCG Decoder build                 ██████

MONTHS 12-18  P6 DECODER PUBLISHES               ★
              P9 Subscriptions pilot (3 clients) ████████
              P2 Phase 3 — Benchmarks live       ████████
              P4 Index Volume II                       ★

MONTHS 18-24  P9 Subscriptions general            ████████
              P10 Dashboard build                 ████████
              P4 Index Volume III — trend line          ★
```

### The three decision gates

**Gate 1 — end of Month 3.** Did the harvest produce a defensible village and outlet count, and does the contract review permit commercial use? *If the count is thin, the Index slips and P7 becomes the priority. If contracts block use, the whole L2/L3 plan is re-scoped — better to know at month 3 than month 12.*

**Gate 2 — end of Month 9.** Did the Index land — press pickup, downloads, inbound? Is the panel retaining? *If the Index does not land, fix distribution before Volume II. Publishing into silence twice is worse than publishing once.*

**Gate 3 — end of Month 15.** Are three clients paying for subscriptions and renewing? *If not, stay in L1 + L2. There is an honourable, profitable business there. Forcing L3 against no demand is how intelligence businesses die.*

---

## 8. THE CLAIM LADDER

**This is the section that ties the plan to the audit.** Each release unlocks specific website language — and nothing before it. Print this and put it next to whoever writes copy.

| Milestone | What the website may then say | What it still may NOT say |
|---|---|---|
| **Today** | "The intelligence practice of Impact Communications, 27 years in rural India." Services, methods, thinking. | Any village/outlet/district count. Any report. Any certification. Any client name. Any "live" data. |
| **Gate 1 (M3)** | The real counts, each with a stated definition: "X villages in our database", "Y outlets mapped as of [month]". | "Live". "Real-time". Anything about published research. |
| **P3 ships (M2+)** | "Read our Field Notes." Link to real PDFs. | "Our research library" until there are 6+. |
| **P7 ships (M4)** | "We build counted outlet universes for clients." Anonymised scale: "censused X outlets across Y districts in the last 12 months." | Named clients without written permission. |
| **P4 Volume I (M9)** | "The Bharat IQ Index — Volume I, [month year], covering X districts." Published methodology. | "Volume VIII". "The industry benchmark" until others cite it. |
| **P8 live (M9)** | "Our retailer panel of X outlets across Y states." Composition published. | Any panel number not currently maintained and back-checked. |
| **P5 ships (M9+)** | "Rural Pulse, quarterly since [date]." | "Continuous", "always-on" until at least 4 consecutive editions have shipped on time. |
| **P2 Phase 2 (M12–18)** | "Execution telemetry from live campaigns, refreshed [real cadence]." | "Live real-time". Any COUNTED label on anything not physically verified. |
| **P9 (M15)** | "Intelligence subscriptions." | Client logos without permission. Ever. |
| **P10 (M18+)** | "Client dashboards." | "Platform", "AI", any product name not shipped and supported. |
| **Never, unless earned** | — | ISO 20252 / ISO 27001 until certified. DPDP "compliant" until counsel signs off. "India's leading" until you can cite the basis. |

---

## 9. WHAT COULD BREAK THIS

| Risk | Honest assessment | Mitigation |
|---|---|---|
| **Contracts block commercialising harvested data** | The single largest structural risk. Would re-scope L2 and L3 entirely. | §3.2, month 1, before anything else. |
| **Phase 0 yields far less than hoped** | Plausible. 27 years of records does not mean 27 years of *structured* records. | Gate 1 exists for this. Publish whatever is real; lead with P7 to build the asset commercially. |
| **The Index is ignored** | Very possible for a first edition from an unknown brand. | Build distribution before publication — journalists, industry bodies, B-schools lined up in advance. Budget for PR, not just production. |
| **Panel attrition** | Panels degrade quietly and keep producing numbers. | Publish composition every edition; hard refresh policy; treat retention as the panel manager's primary KPI. |
| **Services cashflow absorbs the build** | The default outcome. Urgent client work always beats important asset work. | Ring-fence the data team from billable delivery. If the same people do both, the asset never gets built. |
| **Field Command slips** | Layer 4 slips with it. | Layers 1–3 do not depend on it. Sequence so the Index needs no telemetry. |
| **Key-person dependency** | Much of the 27 years lives in people's heads, not files. | Phase 0 is partly a debriefing exercise. Structured interviews with long-tenure field staff — treat as data collection, not nostalgia. |
| **Building L3 before demand exists** | The classic way this business model fails. | Gate 3. Three paying, renewing clients or no general launch. |

---

## 10. THE FIRST THIRTY DAYS

1. **Legal review of client contracts and the MSA template** — §3.2. Nothing downstream is safe until this is answered. *Owner: founder + counsel.*
2. **Data inventory** — what records exist, where, in what format, covering what period. One spreadsheet. *Owner: rural ops lead.*
3. **Design the canonical schema** — village, outlet, study, benchmark — with provenance labelling built in from record one. *Owner: data engineer + analyst.*
4. **Fill the audit's `[FILL: X]` tokens with preliminary real numbers**, each with its definition written beside it. Even rough-but-real unblocks the website. *Owner: rural ops lead.*
5. **Commission Field Note #1** — the Muzaffarnagar kirana credit study the website invented. It was a good idea. Make it real. *Owner: analyst.*
6. **Scope P7** — census instrument, quality protocol, per-outlet cost model, delivery format. First sellable new product. *Owner: research lead.*
7. **Decide the ring-fence** — who works on the asset and is protected from billable work. *Owner: founder. This one is not delegable.*

---

## CLOSING NOTE

The website got the *portfolio* broadly right. The Index, Rural Pulse, Decoders, Field Notes, the five-layer Data Stack — that is a sound product architecture, and it is the right one for this market. What went wrong is that it published the two-year state as though it were today's.

The gap between the two is roughly eighteen months of deliberate work, and most of the hard input — 27 years of field presence that nobody else has — already exists. It is sitting in files rather than in a database.

Build it in the order above and every claim on that website becomes true, one release at a time, with a date next to it.
