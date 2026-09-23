# BHARAT IQ — SERVICE STRUCTURE & NUMBERS REVIEW
**Review of the four-service brief and verification status of the 13 headline figures**
Run: 23 September 2026 · Companion to `03-CLAIMS-AUDIT.md`

---

## WHAT I CAN AND CANNOT CONFIRM — READ THIS FIRST

The brief asks: *"Have Claude Code confirm each number before publication."*

**I cannot confirm any of the 13 figures as accurate counts.** The Bharat IQ platform and its datasets are not in this session — this repository contains IMPACT FIELD COMMAND only (Flutter app, NestJS backend, Next.js web, Prisma migrations). I searched it: none of these numbers appear anywhere in the codebase or its seed data.

Confirming a count means running a query against the table that produced it. I cannot do that from here.

What I **have** done, and what is in this document:

| Check | Can I do it? | Result |
|---|---|---|
| Query the platform for actual counts | **No** — not in this session | Protocol in §6 for whoever can |
| External plausibility against public benchmarks | **Yes** | §1 — two findings |
| Internal consistency between the figures | **Yes** | §2 — two problems found |
| Definitional risk (what a number implies vs what it is) | **Yes** | §3 — the main structural issue |
| Review the service structure and highlight lines | **Yes** | §4, §5 |

Saying "confirmed" about numbers I have not queried is precisely the failure the last audit caught. So: **nothing below is confirmed. Two figures are externally implausible as stated, two are internally inconsistent, and the rest are plausible but unverified.**

---

## 1. EXTERNAL PLAUSIBILITY — CHECKED AGAINST PUBLIC BENCHMARKS

### 1.1 THE ONE THAT WILL COST YOU CREDIBILITY — kirana vs chemists

> `57,000+` kirana and retail outlets mapped
> `84,000+` chemists mapped

**Nationally, kirana outnumber chemists by roughly 15 to 1.** India has approximately 12–13 million kirana and neighbourhood stores, against roughly 700,000–900,000 retail chemist outlets. Your figures invert that: 1.47 chemists for every kirana.

I am fairly confident this is a **real sourcing artefact, not an error** — chemist and pharmacy licence registries are published by state drug control authorities and can be ingested wholesale, whereas kirana outlets have to be physically enumerated one at a time. If so, the number is true and the explanation is entirely respectable.

**But unexplained on a website, this is the figure that makes an FMCG reader stop trusting the table.** Your buyer is a category or distribution head who knows the kirana:chemist ratio in their sleep. They will see the inversion, conclude the numbers are decorative, and discount everything else — including the 1,111 campaigns and 5,700 cost lines, which are the figures you actually want believed.

**Fix — one of:**
- **(a)** State the provenance beside each: *"84,000+ chemists (from state drug-control licence registries) · 57,000+ kirana and general trade outlets (physically enumerated by our field teams)."* The contrast then reads as rigour — you are distinguishing what you counted from what you ingested. **This is the better answer.**
- **(b)** Drop the chemist figure from the headline table and keep it inside the Bharat Data page where there is room to explain.

Do not publish the two numbers side by side unexplained.

### 1.2 The village figure is almost certainly Census reference data, not coverage

> `5,97,483` villages in the reference universe

Census 2011 inhabited villages are cited between roughly 593,600 and 597,600 depending on which table and source you use (total villages including uninhabited: ~640,000–649,000; published figures vary by source, so confirm against the exact Census table you ingested).

**5,97,483 sits squarely in the inhabited-village range.** This is Census-derived reference geography — which is correct, legitimate and useful. Your brief says so: *"villages in the reference universe."* That wording is right.

**The risk is that the wording will not survive contact with a designer.** In a 13-row stat table, "5,97,483 villages" sitting next to "57,000+ kirana mapped" reads to every visitor as *Bharat IQ covers 5.97 lakh villages*. It does not. And a reader who does the arithmetic gets 0.1 mapped shops per village, which makes the coverage look thin rather than the reference universe look complete.

**Fix:** never put the village reference count in the same visual block as owned-data counts. See §3.

### 1.3 Plausible and defensible — good numbers

| Figure | Public benchmark | Verdict |
|---|---|---|
| `38,424` haats mapped, with market day | India is commonly cited at ~47,000 rural haats | **~82% of the national universe. Genuinely strong.** Confirm the source: if mapped from a government GrAM/APMC list it is reference data; if the **market day** is your own field-collected attribute, that is the defensible part and should be the claim. |
| `765` districts with verified code-level geography | India has ~784–802 districts (2026; sources vary as states create new ones, and LGD codes lag) | **Plausible.** LGD code assignment trails district creation, so 765 verified is a realistic figure. Say "code-level geography" exactly as written — not "765 districts covered". |
| `5,700+` cost line items across 25 states | No public benchmark exists | **Plausible and uncopyable.** 25 of 28 states is specific and honestly short of "pan-India", which reads as credible. |
| `6,25,538` Census records across 5 geographic grains | Consistent with Census hierarchy | **Plausible.** Reference data. |
| `27 years` | — | **Fine**, once the founding year is settled — the earlier audit found the site saying 1999 while your CLAUDE.md says 1998. Pick one. |

### 1.4 Vague units — not wrong, but not yet publishable

| Figure | Problem |
|---|---|
| `5 million+` indexed intelligence records | **"Record" is undefined.** A row? A document? A retrieval chunk? A page? This is the single most elastic number in the set, and elastic numbers are what sceptical buyers probe first. Either define it in the same breath — *"5 million+ indexed records (document chunks across decks, reports and datasets)"* — or drop it. As written it can neither be verified nor defended. |
| `16` external signal families | Fine internally; means nothing to a visitor without naming two or three. |
| `19` distinct touchpoint and influencer families | See §2.2 — the count does not match the list. |

---

## 2. INTERNAL CONSISTENCY — TWO PROBLEMS

### 2.1 Possible double-count in the touchpoint headline

> `3,88,250` mapped touchpoint and influencer entities

The table separately lists `38,424` haats, `57,000+` kirana, `84,000+` chemists — **179,424 entities that are themselves touchpoints.**

Two possibilities, and they cannot both be true:
- If 3,88,250 **includes** those, then the four numbers cannot be presented as if they add up, and 3,88,250 is the only total.
- If it **excludes** them, your true entity count is ~5,67,674 and you are under-claiming your strongest asset by a third.

**Someone will add these up.** Determine which it is, then state the relationship explicitly — either *"3,88,250 total entities, of which…"* with the breakdown nested beneath, or *"…plus 1,79,424 trade outlets"* stated separately.

### 2.2 The family count does not match the list

> `19` distinct touchpoint and influencer families

The Bharat Data section lists **22**: Stores & Trade (kirana, wholesale/feeder markets, chemists, mandis, dealer clusters = 5) · Congregation (haats, melas, transport nagars, dhabas, schools, Anganwadi centres, panchayat bhawans, highway corridors = 8) · Influencers (ASHA, AWW, RMP, masons, mechanics, electricians, truckers, SHG, FPO = 9).

Either some of those 22 group into 19 families, or the figure is stale. Reconcile before publishing — a visitor can count the list on the same page.

---

## 3. THE STRUCTURAL ISSUE — THREE KINDS OF NUMBER IN ONE TABLE

This is the most important point in this review.

"THE NUMBERS THAT MATTER" mixes three fundamentally different assets and presents them identically:

| Type | Which figures | What it proves | Can a competitor copy it? |
|---|---|---|---|
| **A — Reference data you ingested** | 5,97,483 villages · 6,25,538 Census records · 765 districts · probably the haat base list | You built a working spine | **Yes.** It is public. Anyone with a data engineer can have it in a month. |
| **B — Data you mapped yourself** | 3,88,250 touchpoints · 57,000 kirana · 84,000 chemists (partly A) · market-day attributes | You have been on the ground | **Hard.** Years of fieldwork. |
| **C — Your execution archive** | 1,111 campaign case studies · 5,700 cost line items across 25 states · 27 years | **The actual moat** | **No. Never.** It does not exist anywhere else and cannot be reconstructed at any price. |

Presented as thirteen undifferentiated rows, a sophisticated buyer assumes it is all category B, discovers some is category A, and then discounts category C — **which is the only part no competitor on earth can match.**

You lose most by hiding C inside a list that contains public Census counts.

### The fix — add a fourth provenance label

The earlier pack established **COUNTED / MODELLED / ESTIMATED**. Add **REFERENCE** — public data we have integrated and maintain.

```
REFERENCE   Public data, ingested and maintained    (Census, LGD, GrAM lists)
COUNTED     Physically enumerated by our field teams (kirana, touchpoints, market days)
PROPRIETARY Our own operating history                (campaigns, invoices, costs)
MODELLED    Derived from counted baselines
ESTIMATED   Directional only
```

Then split the stat table into three visually distinct blocks, in this order:

**Block 1 — What only we have** (lead with this)
1,111 campaigns · 5,700+ cost line items across 25 states · 27 years of execution

**Block 2 — What we mapped**
3,88,250 touchpoint and influencer entities · 38,424 haats with market day · 57,000+ kirana · 84,000+ chemists *(with the §1.1 provenance line)*

**Block 3 — The reference spine**
5,97,483 villages · 6,25,538 Census records · 765 districts with code-level geography

Block 3 is the least impressive and it is currently sitting in the middle of your strongest asset. Labelling it honestly costs you nothing and makes Blocks 1 and 2 believable — which is the whole trade.

---

## 4. THE FOUR-SERVICE STRUCTURE — a clear improvement

**Priority Engine · Campaign Intelligence · Cost Intelligence · Bharat Data.**

This is better than the structure in `01-WEBSITE-CONTENT.md` and should replace it. Four named products organised around four sequential questions — *where to go · how to reach them · what it will cost · the ground itself* — is cleaner than five service pages plus seven solution pages, easier to sell, easier to price, and easier to build a site around. It also reflects something real: these are products, not service descriptions.

**Three things in the brief are genuinely strong and should survive into the copy verbatim:**

1. **Keeping prosperity, market readiness and friction separate.** Refusing to blend them into one composite score is a real methodological position, and it is a direct attack on every competitor who sells a single "rural opportunity score". Make this an explicit, named position on the site — it is the most defensible idea in the brief.
2. **"Category-first: the same district ranks differently for detergent than for confectionery."** One sentence that disqualifies most competing products. Use it in the hero.
3. **"Historical execution shows what was done, not proof that it worked. Bharat IQ states the difference."** This is the single best sentence in the document. It is the honesty position made concrete, and it is exactly what the last audit found missing. Give it prominence rather than burying it as a caveat — restraint stated openly is a differentiator in a category full of overclaiming.

**Two cautions:**

- **"Influencer Networks… mapped as density and reach, never as personal data"** — correct and important. Make sure the platform actually enforces this, because ASHA workers, RMPs and SHG members are identifiable individuals and this is where DPDP obligations genuinely bite. The claim is good; it must be operationally true.
- **Cost Intelligence — "an estimate with its assumptions visible, not a quotation pretending to be precise."** Right framing. Keep the word *estimate* everywhere in the UI and the output, never *quote*, or you will eventually be held to a number the system produced.

### 4.1 Where I disagree with the brief

The brief says: *lead with the ground, then prioritisation, then cost; position Campaign Intelligence as capability.*

**I agree on Campaign Intelligence and on the visual lead. I disagree on the commercial lead.**

Bharat Data is the most *visual* and most immediately impressive asset — correct, lead the homepage with it. But **Cost Intelligence is the most defensible and the most commercially urgent.** Reasons:

- 5,700 real invoice and estimate line items across 25 states is category C — genuinely uncopyable. The touchpoint map is category B, which is hard but not impossible to replicate.
- "What will this cost?" is the question that actually blocks decisions. Buyers browse market maps; they *act* on budget numbers.
- It is the sharpest wedge against consultancies, who will give you a strategy and no idea what execution costs, and against activation agencies, whose costing is a quote with a margin in it rather than a benchmark.

**So: lead visually with Bharat Data, lead commercially with Cost Intelligence.** Homepage hero shows the ground; the first thing the sales conversation offers is a costed plan. Priority Engine sits between them as the reason to believe. That ordering costs nothing to implement and puts your best commercial argument in front of the buyer earlier.

### 4.2 What this does to the earlier documents

- **`01-WEBSITE-CONTENT.md` — superseded in structure, not in substance.** The four services replace the 5+7 architecture. The page copy, meta descriptions, FAQ blocks and voice rules still apply and should be remapped onto the four products.
- **`00-SEO-STRATEGY.md` — keyword clusters still valid**, but map them onto the new four: Priority Engine takes market-entry/sizing terms, Campaign Intelligence takes rural marketing strategy terms, Cost Intelligence takes budgeting/cost terms *(a cluster the original strategy under-weighted, and which has almost no competition — worth expanding)*, Bharat Data takes village/retail/touchpoint data terms.
- **`04-PRODUCT-DEVELOPMENT-PLAN.md` — materially out of date, in your favour.** It assumed Phase 0 (harvesting 27 years of records into a structured asset) was still to be done over months 1–3. This brief shows it substantially **done**. I have flagged this at the top of that document; it needs a rewrite against the platform's actual state, which I cannot see from here.

---

## 5. THE HIGHLIGHT LINES — checked

| Line | Verdict |
|---|---|
| *"38,424 weekly haats. We know which day each one runs."* | **Best line in the document.** Specific, verifiable, impossible to say unless true. Keep exactly as written — but confirm the market-day attribute is populated for all 38,424, not a subset. If it covers 31,000 of them, say 31,000. |
| *"3.88 lakh touchpoints. Not a list of places — a map of where your consumer actually gathers."* | Strong. Resolve §2.1 first so the number is right. |
| *"Costed from real invoices across 25 states, not a rate card."* | **Strong, and this is your commercial lead.** Confirm "invoices" is accurate — the brief also says "invoices and estimates". If it is a mix, say *"real invoices and vendor estimates"*. The distinction matters and costs you nothing. |
| *"1,111 campaigns. Every recommendation traces back to one."* | Good — **but verify the second clause literally.** Does every recommendation the system makes actually carry a traceable precedent, or do most? If most, say *"traces back to documented precedent"* without the absolute. Absolutes are the easiest claims to disprove in a demo. |
| *"Every number carries its source, its date and its confidence. Including the ones we don't have."* | **Keep, and make it the site's governing promise** — it is the direct answer to what the last audit found wrong. But it is now a commitment the product must meet on every screen. If any output anywhere lacks a source, date and confidence, do not publish this line. |

---

## 6. VERIFICATION PROTOCOL — for whoever has platform access

I cannot run these. Whoever can should produce, for each of the 13 figures, a one-row record:

```
FIGURE          | 38,424 weekly haats
EXACT COUNT     | [query result, not rounded]
QUERY / SOURCE  | [table + query, or the source file ingested]
AS-OF DATE      | [when this count was taken]
PROVENANCE      | REFERENCE / COUNTED / PROPRIETARY / MODELLED / ESTIMATED
DEFINITION      | [one line: what is and is not included]
LIVE IN DEMO?   | YES / NO — can a client see this in the product today?
ATTRIBUTE FILL  | [% of rows with the attribute being claimed, e.g. market day]
PUBLISH AS      | [the exact wording approved for the site]
```

**Three rules for that sheet:**

1. **The demo-parity rule.** Your own note says some layers are still being wired in. So: **if `LIVE IN DEMO = NO`, the number does not go on the website yet.** It goes on the claim ladder in `04` §8 with a target date. A figure the demo cannot stand behind is the exact scenario that turns a good meeting bad — and you will be showing this product to people who will ask.
2. **Attribute fill is a separate claim from row count.** 38,424 haats in the table is one claim; 38,424 haats *with market day populated* is a stronger and different one. Never let the second be implied by the first. Same for touchpoints, kirana and chemists.
3. **Round down, never up.** 38,424 publishes as 38,424 or "over 38,000" — never "nearly 40,000". Precision that is exact is credible; precision that is generous is not.

---

## 7. WHAT TO DO, IN ORDER

**Before any of this reaches a designer:**
1. Resolve §1.1 — the kirana/chemist provenance line
2. Resolve §2.1 — does 3,88,250 include the trade outlets?
3. Resolve §2.2 — 19 families or 22?
4. Define "record" in the 5 million+ claim, or drop it
5. Settle the founding year — 1998 or 1999, one answer everywhere

**Then:**
6. Run the §6 verification sheet for all 13 figures
7. Drop every figure where `LIVE IN DEMO = NO` onto the claim ladder instead of the site
8. Restructure the stat table into the three blocks in §3
9. Remap the four services onto the copy in `01-WEBSITE-CONTENT.md`
10. Rerun Stitch **with the §8 guardrail in `02-STITCH-PROMPT.md`** and the verified numbers filled in — never blank
11. Re-audit against `03-CLAIMS-AUDIT.md` before a developer sees it

---

## CLOSING

This brief is a substantially stronger starting point than the Stitch output, for one reason: these numbers came from a real platform rather than from a generator. The work now is definitional, not inventive — deciding what each number means, labelling where it came from, and confirming the demo can show it.

Two things to hold onto. **The kirana/chemist inversion is the detail that will decide whether a knowledgeable buyer believes the rest of the table** — it is worth getting right more than any other single fix here. And **your uncopyable asset is the execution archive, not the map** — 1,111 campaigns and 5,700 costed line items across 25 states is the thing no competitor can ever assemble, and right now it is sitting in the middle of a list that includes public Census counts.

Lead with what only you have.
