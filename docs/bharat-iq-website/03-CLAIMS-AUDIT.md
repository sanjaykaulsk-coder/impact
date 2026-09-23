# BHARAT IQ WEBSITE — CLAIMS AUDIT
**Review of the Stitch-generated pages (`BHARAT_IQ_WEBSITE.zip`, 5 screens)**
Run: 23 September 2026 · Method: evidence-validator, FULL pass · Reviewer instruction: *"I do not want to make any claim that we don't do."*

---

## VALIDATION SUMMARY

**Overall: NEEDS REVISION — do not publish any of these five pages in their current form.**

Stitch did three things beyond what it was asked:

1. It **filled in all 41 `[FILL: X]` tokens with invented numbers.** Those tokens were deliberately blank because only Impact has the real figures. Stitch does not know them, so it generated plausible-looking ones.
2. It **invented a second layer of claims nobody asked for** — ISO certifications, DPDP compliance badges, six named client logos, three office addresses with dialable phone numbers, six published reports, a live data feed, and a named retailer's licence number.
3. It **attached fabricated numbers to the one device designed to guarantee honesty** — the COUNTED / MODELLED / ESTIMATED provenance labels. Invented rows are tagged `COUNTED · PHYSICAL ENUMERATION`.

Point 3 is the serious one. A site that overclaims is a marketing problem. A site whose *verification system itself* is fabricated is a credibility problem, and credibility is the entire product.

**Counts across the five pages:**

| Classification | Count | Action |
|---|---|---|
| **FACT** (supportable today) | 4 | Keep |
| **UNKNOWN presented as FACT** (invented figures) | 61 | Delete or replace with a verified number |
| **Legal / regulatory exposure** | 11 | Delete now, regardless of anything else |
| **RECOMMENDATION stated as FACT** (method claims) | 18 | Verify against actual SOP, then keep or cut |
| **False precision** | 14 | Delete the decimal places or the whole figure |
| **Internal contradictions** | 6 | Resolve to one canonical answer |

Only four claims on the entire site survive unchanged: that Bharat IQ is part of Impact Communications, that Impact has ~27 years in rural India, that the Impact Group includes XPAND and ICON, and the general description of what rural research methods exist.

---

## SECTION A — DELETE IMMEDIATELY (legal and regulatory exposure)

These are not overclaiming. These are statements that create liability whether or not anyone notices.

### A1. Client logos — the single highest risk on the site
**Where:** Request a Briefing page, trust row.
**What it says:** `HINDUSTAN UNILEVER · ITC LIMITED · GODREJ CONSUMER · MAHINDRA AGRI · DABUR INDIA · MARICO RURAL`
**Problem:** Six named companies' marks displayed as clients. Unauthorised use of a registered trademark plus implied endorsement. This is actionable by each company independently, and it is the kind of thing a prospect's legal team checks. Note also that "MARICO RURAL" is not a real corporate entity — which suggests the whole row was generated, not drawn from your client list.
**Action:** **Remove the entire row.** Re-add only: (a) clients who have given **written** permission to use their logo, with the permission on file, and (b) the correct legal entity name. If permission is not in hand, use unnamed descriptors — "a national personal-care brand", "a listed agri-input manufacturer".

### A2. ISO certifications
**Where:** "Institutional Research Accreditations" — `ISO 20252 Market Research Audited`; Data Stack — `ISO 27001 AUDITED`.
**Problem:** ISO 20252 (market research) and ISO 27001 (information security) are certifications issued by accredited bodies against an audit. Claiming them without holding them is a false certification claim — and it is trivially checkable, because certification registers are public.
**Action:** **Delete both.** If Impact genuinely holds either, publish the certificate number, the certifying body and the expiry date instead of a badge. If you want them, they are worth pursuing — ISO 20252 is a real differentiator in this category — but that is a 6–12 month programme, not a line of copy.

### A3. DPDP Act compliance badges
**Where:** `DPDP 2023 Compliant Channel` (briefing form), `Data Compliance (DPDP)` (footer, all pages), `DPDP ACT COMPLIANT` (Data Stack).
**Problem:** The Digital Personal Data Protection Act 2023 imposes specific obligations — lawful consent capture, purpose limitation, a Data Protection Officer or grievance channel, breach notification, data-principal rights. "Compliant" is a legal assertion. Asserting it while not having the programme is a misrepresentation to every person who submits the form on the strength of it.
**Action:** **Delete the badges.** Replace with a factual, non-certifying line: *"We collect only what the form asks for, use it only to respond to your enquiry, and delete it on request. See our Privacy Policy."* Then actually write the Privacy Policy. Revisit the compliance claim once counsel confirms the programme is in place.

### A4. Named individual and licence number in the sample retailer record
**Where:** Data Stack, Layer 2, `OUTLET ID: BIQ-RET-884910`.
**What it says:** `Kishan Krishi Kendra · R. K. Verma` · `License No: UP/KD/AGR/2021-992` · `26.4172° N, 79.9482° E` · `Est. Monthly Turnover ₹6,80,000` · `High Credit Exposure: 45 Days`.
**Problem:** A named proprietor, a licence number, GPS coordinates to four decimals, and financial exposure — published on a public web page. If any real business sits near those coordinates, this is a personal-data and commercial-confidentiality exposure sitting directly beneath a DPDP compliance badge. If no such business exists, you have published a fabricated government licence number.
**Action:** **Delete.** If you want to show the record structure, show the **schema with field names and the value type** (`Proprietor name — text`, `Monthly turnover band — ₹ range`), never a filled row. A schema demonstrates rigour better than a fake record does.

### A5. Guarantee language
**Where:** `Confidentiality guaranteed... protected under strict institutional non-disclosure covenants`; `Enterprise Privacy Guarantee`; `The Proprietary Integrity Guarantee`; `guarantees zero field drop-off`; `Guaranteed Response Window`.
**Problem:** "Guarantee" is a contractual word. Five unqualified guarantees, none of which is backed by a stated remedy if breached.
**Action:** Replace with what you actually commit to and can meet. *"We aim to respond within one working day"* instead of "Guaranteed Response Window". *"Client information is covered by NDA where one is signed"* instead of a confidentiality guarantee.

### A6. The competitor-data contradiction
**Where:** Briefing page: `We never cross-pollinate competitor client briefs.` Data Stack, Layer 5: `Because Impact Communications orchestrates market interventions across competing conglomerates, Bharat IQ maintains anonymized normative benchmarks.`
**Problem:** These contradict each other on the same website. The second sentence states, in writing, that you build benchmark products out of data generated while working for competing clients. Whatever the anonymisation, that sentence alone can lose you an account — and it is the first thing a client's procurement or legal team will highlight.
**Action:** **Delete the Layer 5 sentence entirely.** Describe benchmarks only as coming from your own syndicated and published studies, and only if that is true. Keep the non-cross-pollination commitment if you can honour it operationally.

### A7. Office addresses and phone numbers
**Where:** Briefing page — Delhi `Impact House, Okhla Phase III... +91 (11) 4161-0000`; Mumbai `BKG Sovereign Center, Level 8, BKC... +91 (22) 6650-8800`; Patna `Maurya Lok Complex, Block B... +91 (612) 223-1490`. Footer: `New Delhi · Mumbai · Patna`.
**Problem:** These are generated. "BKG Sovereign Center" does not appear to be a real BKC building. The phone numbers are in valid Indian formats, which means each one may ring at a real, unrelated business. Publishing three offices also claims a physical footprint you may not have.
**Action:** **Replace with your real registered address and real numbers, and list only offices that exist.** One real office beats three invented ones. Also: `Docket Ref: #BIQ-2026-BRF` and `+91 98110 XXXXX` are placeholder artefacts that must not ship.

---

## SECTION B — FABRICATED SCALE FIGURES (every `[FILL]` token Stitch guessed)

None of these came from you. Each needs to be replaced with a real number or deleted.

| Claim on site | Appears | Verdict |
|---|---|---|
| `45,000+ villages sampled yearly` / `45,000 Villages` / `Verified Across 45,000 Villages` | 6 places | UNKNOWN — invented |
| `600+ Districts` **and** `680 Districts` / `680+ Districts` | 9 places | UNKNOWN — and **self-contradictory**: two different numbers on the same site |
| `8,40,000+ Indexed Habitations` | Data Stack L1 | UNKNOWN — invented |
| `4,50,000+ Verified Retail Points` / `4,50,000 Retailers` | 4 places | UNKNOWN — invented |
| `8,500+ Direct Field Cadre`, `740+ District Supervisors`, `7,800+ Field Enumerators` | Data Stack L3 | UNKNOWN — invented, including the supervisor/enumerator split |
| `18 states` **and** `18 dialects` **and** `22 Dialects` **and** `18 regional languages` | 7 places | UNKNOWN — and **self-contradictory** (18 vs 22) |
| `220+ Brand Baselines` | Data Stack L5 | UNKNOWN — invented |
| `3.2M Annual Touchpoints` | Data Stack L4 | UNKNOWN — invented |
| `128,400 km van route logged this week` | Data Stack L4 | UNKNOWN — invented |
| Channel split: `Kirana 280,000+ · Agri-input 62,000+ · Chemists 44,000+ · Haat stalls 64,000+` | Data Stack L2 | UNKNOWN — invented (sums neatly to 450,000, which is how you can tell) |
| Zone table: `88 / 114 / 132 / 126 districts`, `1,840 / 2,210 / 1,960 / 1,480 cadre` | Data Stack L3 | UNKNOWN — invented, tagged `COUNTED` |
| `Over 48 Attributes Per Habitation` | Data Stack L1 | UNKNOWN — invented |
| `N=500 to N=25,000+` sample range | Research page | UNKNOWN — verify against largest study actually run |

### B1. The one that will be caught first
**`42 States & UTs`** (Reports page, Rural Pulse Q3 card).
India has **28 states and 8 union territories — 36 in total.** There is no arrangement of Indian administrative geography that produces 42. On a site whose proposition is "we count instead of estimating", this single number tells a visitor the numbers are decorative. Delete it.

### B2. Founding year inconsistency
Footer says `established 1999`. Your own brief and CLAUDE.md say Impact Communications is 27+ years old, founded 1998. The site also carries `27 Yrs` and `27 Years` throughout.
**Action:** pick one canonical founding year, confirm it against your incorporation record, and use it everywhere. Then let "27 years" roll forward automatically rather than hard-coding it.

---

## SECTION C — FALSE PRECISION

Numbers stated to a precision nobody could support, which read as fabricated to anyone who works with data — which is precisely your audience.

| Claim | Problem |
|---|---|
| `Sampling error below ±1.4%`, `±1.5% @ 95% CI`, `Standard Deviation: ±1.4% (95% CI)` | Margin of error is a property of a specific sample on a specific question, not a company-wide constant. Stated as a standing guarantee it is statistically meaningless. |
| `Field Discrepancy Rate < 0.2%` | Presented with no definition of "discrepancy" and no measurement period. |
| `99.4% Pass` (photo geo-audits), `99.2% Provenance` | Two-decimal quality rates with no audit behind them. |
| `Published model r² > 0.88`, `88% – 94% r² Bound` | Claims a published model. There is no published model. |
| `Confidence 94.8%` on the Index "Key Deduction" | A precise confidence score on an invented finding. |
| `100% GPS`, `100% CAPI Geotagged Fieldwork` | "100%" of anything operational is very hard to defend and only needs one exception to be false. |
| `Accuracy: ± 4 meters`, `within 15-meter village polygon` | Consumer GPS accuracy varies widely; 4m is optimistic as a standing claim. |
| `20% random telephonic + audio supervisor audits` within `48 hours` | A specific SOP. Keep **only if** this is your documented, actually-enforced back-check rate. |
| `1 supervisor per 10 enumerators` | Same — verify against real deployment ratios. |
| `Deployment SLA < 48 Hours / < 72 Hours` by zone | Presented as a contractual SLA. Do you offer this? |
| `Avg Wait < 4 hrs` on the advisory queue | Implies a live queue system that does not exist. |

**Rule to adopt:** if a number has a decimal point on this website, it must trace to a specific study with a stated sample and date, shown next to it. Otherwise round it, band it, or drop it.

---

## SECTION D — PRODUCTS AND CONTENT THAT DO NOT EXIST

The Reports page is the most dangerous page on the site, because everything on it has a download button.

| Item | Claim | Reality |
|---|---|---|
| `The Bharat IQ Index 2026` | `Volume VIII · Spring Ed. · 148 Pages PDF · 2.4MB · Released Q1 2026` | Does not exist. "Volume VIII" implies seven prior editions. |
| Index finding | `Tier-5 consumption velocity outpaced Tier-2 suburban rings by +340 bps in Q4 2025` | An invented research finding, quotable, with a confidence score attached. This is the kind of line that gets screenshotted into someone else's deck. |
| `Rural Pulse Q3 2026` | `38 pages · field signal from 4,50,000 retailers across 42 states` | Does not exist. |
| `Bharat FMCG Decoder 2026` | `86 pages` | Does not exist. |
| `Agri-Input Market Potential Index: Kharif 2026` | `112 pages · 12 grain and cash crop belts` | Does not exist. |
| `Two-Wheeler & Tractor Rural Replacement Cycles 2026` | `74 pages` | Does not exist. |
| `Field Note #14: The Kirana Credit Shift in Western UP` | `22 pages · 140 village shops in Muzaffarnagar and Saharanpur` | Does not exist. "#14" implies thirteen prior notes. A named-district study that was never run. |
| `Rural BFSI & Micro-Lending Adoption Report` | `98 pages · 8 aspirational states` | Does not exist. |
| Footer products | `Field Force Allocation AI`, `Enterprise Strategy Platform`, `Tier-3 to Tier-6 Heatmaps`, `Econometric Forecasting`, `Brand Penetration Indices` | Named products that do not exist. |
| Footer | `Leadership & Fellows`, `Careers & Grants` | Implies a fellowship programme and a grants programme. |

**Action:** **Take the Reports page down to what exists.** If that is nothing yet, the page should say so honestly and convert instead: *"Our first Bharat IQ Index publishes in [month]. Join the list to receive it."* An empty-but-honest reports page with a waitlist converts respectably. A page of six fake PDFs with dead download buttons converts once and burns the relationship.

**Sequencing note:** the Bharat IQ Index is still the right flagship — it is the strongest authority asset available to you. It just has to be Volume I, dated honestly, after the work is actually done.

---

## SECTION E — THE FAKE LIVE DATA FEED

**Where:** Data Stack, Layer 4, `Live Field Ingestion Feed · STREAM ID: RUR-EXEC-094`.

**What it shows:** four entries with second-level timestamps (`14:22:08 IST`), named real villages and districts — `Village Chhata (Mathura, UP)`, `Bhabua Rural Hub (Kaimur, Bihar)`, `Village Shahada (Nandurbar, MH)`, `Sinnar Outpost (Nashik, MH)` — activity descriptions (`180 Sachet Trials`, `14 Stock-outs Logged`), each tagged **`COUNTED`**.

Also on the page: `INFRASTRUCTURE STATUS: LIVE (WEEK 11, 2026)`, `DATASET VERSION: B-IQ 4.8.2`, `Update Frequency: Live Real-time ± 4 Hours`.

**Why this is the worst item in the pack.** The COUNTED / MODELLED / ESTIMATED labelling is the brand's central trust device — the thing that says *we will always tell you which numbers are real*. Here it is applied to four fabricated events in named villages, on a page headed **"RADICAL METHODOLOGICAL HONESTY"**. If a client ever asks to see the Mathura record behind that 14:22:08 entry, there is no answer that survives the conversation.

Related fabrications on the same page: `Sarpanch / Village Head sign-off photo with embedded OCR token` and `Cellular tower triangulation cross-checked against device telemetry` — two specific verification capabilities that need to be confirmed against what your field platform actually does.

**Action:**
- Remove the live feed, the version number and the "LIVE" status bar.
- Re-introduce a feed **only** if it is wired to real data from the Field Command platform. That would be a genuine, hard-to-copy differentiator — worth building properly.
- Until then, show the **schema and the verification chain** rather than fake instances, and label any illustrative row `ILLUSTRATIVE — not a live record` in visible text, not a tooltip.
- Confirm the two verification capabilities above against Field Command's actual proof-of-execution implementation before either appears in copy.

---

## SECTION F — THE ROUTE-TO-MARKET PAGE: illustration hardened into evidence

**Where:** RTM page, "Field Audit Comparison Matrix".

`N=24 Districts Audited` · `400 Outlets Appointed` vs `160 Actually Serviced` · `60% Coverage Blindspot` · `240 ghost outlets` · `Primary-to-Secondary Lag: 54 Days` · `Channel Capital Locked: ₹1.84 Cr / District`.

Then in "What You Get": `84% Void Identified` · `ROCE: 22.4%` · `Van Operating Cost/Km ₹14.20` · `Sub-Stockist Gross Margin 6.8%` · `Min Drop Break-Even ₹1,450/Drop` · `28 Calls/Day` · `Beat 04A: Sector Mandi → Ramnagar → 12 Kiranas`.

**Partly my doing, and I'll own it.** My Stitch prompt used "400 outlets appointed vs 160 actually serviced" as an illustration of the coverage-illusion concept. Stitch hardened it into a sourced audit finding by attaching `N=24 Districts Audited` to it, then generated a further ten operating metrics in the same style. That is the predictable failure: a design tool cannot tell an illustrative figure from an evidenced one, so it renders both with equal authority. The fix is to never put an unlabelled number in a design prompt.

**Action:** Either
- **(a)** label the whole block visibly as illustrative — *"Illustrative pattern, not a specific client audit"* — and round every figure (400 vs 160 stays; ₹1.84 Cr and 22.4% go); or
- **(b)** replace it with one real anonymised engagement, with sample, geography and period stated, under client permission.

**(b) is worth far more**, and you likely have several to choose from. One real anonymised audit beats ten invented metrics.

---

## SECTION G — CAPABILITY AND POSITIONING CLAIMS TO VERIFY

Not necessarily false — but each asserts something operational. Confirm each against how Impact actually runs before it ships. Cut anything you cannot demonstrate to a client who asks.

| Claim | Check |
|---|---|
| `India's leading rural marketing and execution firm` | Unsubstantiated superlative. Your own brand rules ban "No. 1" without a citable basis. Replace with something verifiable — "one of India's longest-running rural marketing agencies, founded [year]". |
| `Zero sub-contracting policy` | Is all fieldwork genuinely own-cadre, in every state, always? |
| `All enumerators undergo biometric verification` | Does this happen? |
| `Native proficiency in Bhojpuri, Maithili, Awadhi, Bundeli, Marwari, Chhattisgarhi, Odia, Marathi, Telugu, and 9 other vernaculars` | Nine named plus nine unnamed. List only languages you can staff on demand. |
| `Fortune 500 leadership` | Implies Fortune 500 clients. Only if true and permitted. |
| `our strategy fellows`, `senior practice partners`, `Senior Strategy Desk`, `partner with category jurisdiction` | Implies a partner/fellow structure. Does this exist as roles, or is it borrowed consulting vocabulary? |
| `Mutual NDAs executed prior to confidential category discussions` | Is this standard practice or aspiration? |
| `Counterfeit & Lookalike Risk` methodology | Have you run this study type? |
| `Dual-moderator field protocols`, `separate male/female respondent zones` | Standard SOP or described capability? |
| `4–6 weeks for 3,000–5,000 respondents across 4 states`; `fast-track pulses under 14 days` | Committed timelines. Check against actual delivery history — this is a promise clients will hold you to. |
| `Satellite grid stratification` for sampling | Do you use satellite imagery in sampling design? |
| `Tier-2 to Tier-6` framing throughout | Tier 5/6 is a bank-branch classification, not a consumer-market one. Used loosely it invites a knowledgeable prospect to question the rest. |

---

## SECTION H — TONE DRIFT (not a claim problem, but it works against you)

The approved voice was plain-spoken, Class-10 reading level, specific, no jargon. What came back is heavy consulting cosplay: **"telemetry" appears 30+ times**, alongside *sovereign authority, radical capital honesty, Briefing Docket Initiated, Terms of Intelligence Access, Docket Ref, strategic dossier, non-attribution policy, unvarnished data telemetry, Bharat Crimson*.

Two costs:
1. **It undercuts the positioning.** The strategy was to win by being the plain-spoken, evidence-labelled alternative to firms that hide behind vocabulary. "Radical capital honesty" is not honest-sounding; it is the opposite.
2. **It reads as overclaiming even where the claim is true.** "27 years of rural field telemetry" sounds less credible than "27 years in rural India", because the dressing invites doubt.

Also inconsistent: the footer offers a **"bi-weekly rural executive intelligence memorandum"** while the subscribe block on the same page says **"Four emails a year."**

**Action:** a full copy pass against the voice rules in `01-WEBSITE-CONTENT.md`. Strip "telemetry" to near zero. Delete "docket", "sovereign", "fellows", "jurisdiction", "radical". Say what you mean.

**Design note:** Stitch also swapped the approved palette — indigo `#1B2A4A` + amber `#E8A317` — for navy + crimson `#D92228`. Not a claims issue, and the crimson is defensible, but it is a brand decision that should be made deliberately rather than inherited from a generator.

---

## SECTION I — WHAT SURVIVES

Four claims, currently, stand up without modification:

1. Bharat IQ is the intelligence practice of Impact Communications — **FACT**
2. Impact Communications has ~27 years in rural marketing and execution in India — **FACT**, once the founding year is confirmed to one canonical value
3. The Impact Group includes XPAND (distribution) and ICON (outdoor/visibility) — **FACT**
4. The general description of rural research methods and why rural fieldwork is hard — **FACT / INFERENCE**, this is category knowledge, not a claim about Impact

Plus, with light verification, most of the *narrative* content from `01-WEBSITE-CONTENT.md` survives — the coverage-illusion argument, the six things brands get wrong, the addressable/reachable/winnable distinction, the demand-vs-distribution diagnosis. **The thinking is intact. It is the numbers that are fabricated.** That is a recoverable position.

---

## REQUIRED DISCLOSURES

If any version of these pages goes live before the audit is closed out:

- No figure may appear without a source or an "illustrative" label visible on screen
- No certification, compliance or accreditation badge until the certificate is held
- No client name or logo without written permission on file
- No report with a download button until the PDF exists
- The COUNTED / MODELLED / ESTIMATED labels apply **only** to real data; never to illustrative or sample content
- Third-party statistics carry source and year next to the number

---

## CLOSE-OUT CHECKLIST

**Stop — before anything else**
- [ ] Remove all six client logos
- [ ] Remove ISO 20252 and ISO 27001 claims
- [ ] Remove all DPDP compliance badges
- [ ] Remove the named retailer record with the licence number
- [ ] Remove the fabricated office addresses and phone numbers
- [ ] Remove the "competing conglomerates" sentence
- [ ] Remove the live field ingestion feed
- [ ] Remove all six non-existent reports and their download buttons

**Then — supply the real numbers**
- [ ] Districts covered (one number, used everywhere)
- [ ] Villages in footprint — and define it: covered ever, covered annually, or in the database
- [ ] Retail outlets mapped — and define: mapped, audited, or active
- [ ] Field cadre — permanent vs on-demand, stated separately
- [ ] States and languages — one number each
- [ ] Founding year, confirmed against the incorporation record
- [ ] For each: write the one-line definition next to it, so it can never drift again

**Then — verify the method claims**
- [ ] Walk Section G line by line with the field operations head
- [ ] Delete anything that cannot be demonstrated to a client who asks
- [ ] Confirm the back-check rate, supervisor ratio and turnaround times against actual delivery records

**Then — rebuild**
- [ ] Rerun Stitch with the guardrail in `02-STITCH-PROMPT.md` §8
- [ ] Re-run this audit on the new output before it reaches a developer
- [ ] Final read by someone who was not involved in writing it

---

## THE UNDERLYING LESSON

Stitch is a design generator. Handed a blank where a number belongs, it will always produce a number, because an empty stat block looks broken and a filled one looks finished. It has no concept of a claim it is not entitled to make.

So the `[FILL: X]` convention is not enough on its own. From here: **no generator ever sees a blank where a number goes.** Either the real number goes into the prompt, or the prompt says the slot must render as a labelled gap. The updated guardrail in `02-STITCH-PROMPT.md` §8 enforces this.

The instinct to check this before publishing was the right one. Everything found here is fixable in a few days of work. None of it would have been fixable after a client's legal team found it.
