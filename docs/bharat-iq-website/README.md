# BHARAT IQ — WEBSITE & PRODUCT PACK

Marketing and product deliverables for **Bharat IQ, powered by Impact Communications**.
Not part of the IMPACT FIELD COMMAND application build — these are content, design and
planning documents, not code.

| File | What it is | Who uses it |
|---|---|---|
| `00-SEO-STRATEGY.md` | Competitor audit, keyword architecture (8 clusters), site structure, technical SEO spec, content engine plan, 12-month targets, risks | SEO/digital lead, agency, developer |
| `01-WEBSITE-CONTENT.md` | Full page-by-page copy with meta titles, descriptions, H1/H2 structure, FAQ blocks and CTAs — ~7,900 words | Content team, developer |
| `02-STITCH-PROMPT.md` | First-run Stitch prompts. **Screen prompts superseded by `07`; §8 (the anti-fabrication guardrail) is still mandatory and must be pasted with every prompt** | Design lead |
| `03-CLAIMS-AUDIT.md` | **Review of the first Stitch output.** 61 invented figures, 11 legal exposures, 14 false-precision claims. Verdict: do not publish. Itemised fix list. | Founder, legal, content lead |
| `04-PRODUCT-DEVELOPMENT-PLAN.md` | 11-product portfolio, 24-month sequencing, 3 decision gates, and the claim ladder tying releases to permitted copy. **Carries a status notice — partly superseded by the four-service brief; claim ladder and contract/IP question still valid** | Founder, research lead, data lead |
| `05-SERVICE-STRUCTURE-AND-NUMBERS-REVIEW.md` | **Review of the four-service brief (Priority Engine / Campaign Intelligence / Cost Intelligence / Bharat Data) and verification status of the 13 headline figures.** Two externally implausible, two internally inconsistent. Includes the verification protocol | Founder, data lead, content lead |
| `06-BRIEF-REVIEW-ABOUT-AND-SERVICES.md` | **Review of the two founder briefs read together.** One factual problem (district count / Census-2011 vintage in the problem statement), three consistency drifts between the pages, the naming call, the lead line, and what's missing | Founder, content lead |
| `07-STITCH-PLAN-V2.md` | **The current Stitch plan.** Supersedes the screen prompts in `02`. Validated colour-encoding system, 7 screens, mobile, build order. Core idea: the site shows the product, not a brochure about it | Design lead, founder |
| `NUMBERS-VERIFICATION-SHEET.csv` | One row per headline figure to be filled by whoever has platform access. No figure ships until its row is complete | Data lead |

## Read in this order

New to the pack → `00` → `01` → `02`.
Reviewing the Stitch output → **`03` first.**
Deciding what to build → **`04`** (read its status notice first).
Confirming the headline numbers → **`05`**, then fill `NUMBERS-VERIFICATION-SHEET.csv`.
Writing the site from the founder briefs → **`06`** — work its §10 list first.
Running Stitch → **`07`**, with `02` §8 pasted alongside every prompt.

## Hard rules established by the audit

1. **No figure on the website without a real source.** The `[FILL: X]` tokens in `01` are
   deliberately blank. Fill them with Impact's verified numbers, each with a written
   definition beside it. Never let a generator fill them.
2. **No certification, compliance badge or accreditation** until the certificate is held.
3. **No client name or logo** without written permission on file.
4. **No report with a download button** until the PDF exists.
5. **COUNTED / MODELLED / ESTIMATED labels apply only to real data** — never to sample or
   illustrative content.
6. **No product name that is not shipped and supported.**
7. **Demo parity** — if a figure is not live in the product a client can be shown, it does not
   go on the website. It goes on the claim ladder with a target date.
8. **Provenance on every figure** — REFERENCE (public data ingested) / COUNTED (our fieldwork) /
   PROPRIETARY (our execution history) / MODELLED / ESTIMATED. Never mix them in one stat block.

The claim ladder in `04` §8 sets out exactly which sentence each product release unlocks.

## Immediate next steps

1. Resolve the five definitional questions in `05` §7 — kirana/chemist provenance, the
   touchpoint double-count, 19 vs 22 families, what a "record" is, and the founding year
2. Fill `NUMBERS-VERIFICATION-SHEET.csv` — nothing publishes without it
3. Work the close-out checklist in `03` — the "Stop" list first
4. Answer the contract/IP question in `04` §3.2 — more urgent now that a commercialisable
   asset demonstrably exists
5. Rerun Stitch with the §8 guardrail and the verified numbers filled in, then re-audit
