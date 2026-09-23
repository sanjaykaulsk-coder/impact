# BHARAT IQ — STITCH PLAN V2
**Built on the corrected briefs. Supersedes the screen prompts in `02-STITCH-PROMPT.md`.**
23 September 2026 · The guardrail in `02` §8 still applies and is mandatory.

---

## THE IDEA

**The first run produced a brochure about an intelligence practice. That was the wrong brief, and it is why it filled itself with invented credentials — a brochure has nothing to show, so it reaches for badges.**

Bharat IQ is not a practice. It is an engine. So:

> ### The website should look like the engine, not like an agency site about the engine.

Every competitor's site is a story with stock photography. Bharat IQ's site should be **the product's first screen** — a real district ranked, with its three scores shown separately, its evidence named, its confidence stated, and a visible gap where the data runs out.

That single decision solves four problems at once:

| Problem | How "the site is the product" solves it |
|---|---|
| Nothing to show, so it overclaims | The interface *is* the proof. No badges needed. |
| *"It says what it doesn't know"* is asserted, never demonstrated | A visible LOW CONFIDENCE flag on the homepage proves it in one glance |
| Competitors can copy claims | They cannot copy a screen that shows an honest gap — their product doesn't produce one |
| Demo parity risk | If the site shows only what the product does, the site can never outrun the demo |

**The strategic point:** your differentiator is restraint. Restraint cannot be *said* convincingly — every agency claims honesty. It can only be *shown*. One screen with a stated evidence gap does more work than the entire "What Makes It Different" section.

---

## WHAT'S DIFFERENT FROM RUN 1

| Run 1 | Run 2 |
|---|---|
| 5 service pages + 7 solution pages | **4 modules.** Map · Prioritise · Plan · Cost |
| "Intelligence practice of Impact Communications" | **"An engine. Where to go. How to reach. What it costs."** |
| Stock photography of rural India | **The interface, plus documentary photography only as texture** |
| Stat blocks with `[FILL: X]` → invented | **Verified numbers only, or a visibly labelled empty slot** |
| CTA: "Request a Briefing" | **CTA: "See it run on your category"** |
| Design system invented by the generator | **Encoding system validated before prompting — §3** |

---

## 1. THE ENCODING SYSTEM — the part worth getting right

This is the most important section in the plan, and it is where a design tool left alone will do real damage. **Bharat IQ's methodology is a set of claims about what must never be blended.** The visual system has to enforce that, or the design quietly undoes the product.

These palettes were **run through a colour validator, not chosen by eye.** Results below are real.

### 1.1 Market tiers — colour, and only tiers get colour

| Tier | Light | Dark | Rendering |
|---|---|---|---|
| **Enter Now** | `#2a78d6` blue | `#3987e5` | Solid fill |
| **Seed & Build** | `#1baf7a` aqua | `#199e70` | Solid fill |
| **Watch** | `#eda100` amber | `#c98500` | Solid fill |
| **Avoid For Now** | neutral slate, **no hue** | neutral slate | Muted + 45° hatch |

**Validated, all-pairs, both modes: PASS.** Worst CVD separation ΔE 9.1 light / 8.4 dark against a target of 8.

**Why "Avoid For Now" is grey, not red.** Two reasons, and both matter.

*Technical:* four distinct hues **cannot** clear the colourblind-separation floors in dark mode — the band is too narrow for two warm hues to stay apart. I tested it; it fails.

*Semantic, and more important:* my first instinct was a green-to-red scale. **The validator failed it at ΔE 3.8 — a red-green colourblind reader could not tell "Enter Now" from "Avoid For Now."** On a product whose entire job is telling a client where to spend, that is the worst failure available. Roughly 1 in 12 men has some red-green deficiency; your buyers are disproportionately men in sales and distribution roles.

Grey-with-hatch is also the *honest* rendering. "Avoid For Now" is not a danger warning — it is the absence of a recommendation. Neutral says that. Red says something you don't mean.

**Hard rule:** a tier chip **always** carries its name in text. Colour alone is never sufficient — on dark, amber and aqua sit below the safe threshold for one form of colour blindness, so the label is not decoration, it is the encoding.

### 1.2 The three scores — deliberately NOT colour-coded

Prosperity · Market readiness · Friction.

**All three render in the same single hue, in three separate labelled panels.**

This will look like an omission to a designer. It is the opposite. **Giving the three scores three different colours invites the reader to see them as three parts of one thing** — the visual grammar of a stacked bar, a donut, a composite score. That is precisely the blending your methodology refuses.

Three identical bars in three separate frames says, structurally: *these are three separate readings. Read each one.* The design enforces the method rather than decorating it.

**Never:** stack them · sum them · put them on one axis · draw them as a radar or donut · show a single "overall score" anywhere on the site.

**One required label:** Friction runs the opposite way to the other two. A long bar reads as "good" by default, so the axis must say **"higher = harder to execute"** in visible text, every time.

### 1.3 Confidence — form, never colour

Colour is fully committed to tiers. So confidence uses a different channel entirely — which is correct, because **confidence is orthogonal to tier.** A district can be Enter Now at low confidence, and that combination is exactly what a client needs to see.

```
HIGH      ●●●   "Field-verified, 2026"
MEDIUM    ●●○   "Modelled from 14 comparable districts"
LOW       ●○○   "Limited evidence — 2 data points"
NO DATA   ╱╱╱   "We don't have this. Here's what it would take."
```

Three filled dots, a word, and on hover the reason. Always all three: glyph, word, reason. Never the glyph alone.

**The NO DATA state is a designed component, not an error state.** It is the single most valuable pixel on the site. Give it the same visual care as a populated cell — bordered, legible, with the gap named and a next step offered. Every competitor's product renders missing data as a blank or a zero. Yours renders it as a sentence.

---

## PROMPT 0 — DESIGN SYSTEM

*Paste first. Generate. Do not proceed until it looks right.*

```
Create a design system for "Bharat IQ", a market intelligence engine for
companies selling into rural and small-town India. Users are category heads,
sales and distribution leaders, and marketing planners.

The brand must feel like a precise working instrument — a tool a professional
uses to make a decision — not a marketing website and not a consulting brochure.
Closer to a well-made analytical product than to an agency site.

DO NOT USE: folk-art motifs, terracotta, mustard, sepia, sunset imagery,
hand-drawn illustration, gradients, glassmorphism, 3D shapes, floating cards,
or any decorative flourish. Nothing that reads as "rural India" as a theme.

COLOUR
- Structure: deep indigo #14243F — headers, primary buttons, data panel frames
- Action: amber #E8A317 — calls to action and active states ONLY, never as a
  background wash, never for large areas
- Ink #101820 body text, slate #5A6472 secondary, mist #F4F6F8 section
  backgrounds, white #FFFFFF cards and page background
- Rule lines #E3E7EC at 1px

DATA COLOUR — these are fixed and must not be altered or extended:
- Tier "Enter Now" #2a78d6 · "Seed & Build" #1baf7a · "Watch" #eda100
- Tier "Avoid For Now" renders in neutral slate #8A929E with a 45-degree
  hatch texture — NO hue. It is the absence of a recommendation, not a warning.
- Every tier chip always displays its name as text. Colour is never the only
  signal.
- Score bars (Prosperity, Market readiness, Friction) all use a SINGLE hue
  #2a78d6 in three separate labelled panels. Do not give them different
  colours. Do not stack, sum, combine or total them anywhere.
- Confidence never uses colour. It renders as three dots (filled / half /
  hollow) plus a word: HIGH, MEDIUM, LOW, or NO DATA.

TYPOGRAPHY
- Headings: Inter Tight or Plus Jakarta Sans, tight letter-spacing on large
  sizes. H1 56px desktop / 34px mobile, weight 700.
- Body: 18px desktop / 16px mobile, line-height 1.65, comfortable for long
  analytical reading.
- Numbers: tabular lining figures everywhere (font-variant-numeric:
  tabular-nums), so columns align. Large figures are a design element.
- Must support Devanagari — a Hindi version follows.

LAYOUT
- 12 columns, 1280px max width, 24px gutters, 80px desktop / 16px mobile margins
- 96px between major sections desktop, 56px mobile
- Left-aligned throughout. No centred paragraphs.
- Cards: 8px radius, 1px #E3E7EC border, no shadow at rest

COMPONENTS TO DEFINE
- Tier chip: rounded 4px, tier colour fill, name in text, 22px tall
- Confidence glyph: three 6px dots + uppercase word at 11px, 0.06em tracking
- Score panel: label, single-hue horizontal bar, value, and an axis note
- Evidence line: 13px slate, format "Source · sample · geography · date"
- NO DATA block: neutral hatch fill, bordered, with the gap stated in a full
  sentence and a next step offered. Design this with the same care as a
  populated data cell — it is a feature, not an error.
- Primary button: solid indigo, white text, 8px radius
- Data table: indigo header row, 40px rows, right-aligned tabular numbers

ACCESSIBILITY
WCAG 2.1 AA. Body text minimum 4.5:1. Visible focus states. 44x44px minimum
tap targets. Design at 360px width first — many users browse on budget Android
over 4G. Dark mode is designed separately, not an automatic inversion.
```

---

## PROMPT N — NAVIGATION

```
Design the header and footer for Bharat IQ.

HEADER — sticky, 72px, white, 1px bottom border #E3E7EC, compressing to 58px
on scroll.

Left: "Bharat IQ" wordmark, with "Powered by Impact Communications" beneath in
11px slate uppercase, 0.08em tracking.

Centre, 15px medium, 28px apart:
  Map | Prioritise | Plan | Cost | Method | About

Right: "Contact" text link, then a solid indigo button "See it run on your
category".

No mega menus. Four modules, four pages. If a dropdown is needed anywhere it
means the structure is wrong.

Each module nav item shows a one-line description on hover:
  Map — where your consumer actually gathers
  Prioritise — which districts, for your category
  Plan — the campaign, grounded in what we have run
  Cost — what it will actually cost

MOBILE: wordmark left, a "See it run" pill and hamburger right. Full-screen
overlay menu, six items, the CTA pinned to the bottom with a WhatsApp link
beneath it.

FOOTER — deep indigo #14243F, four columns:
  1: wordmark, "Where to go. How to reach. What it costs.", and
     "Part of the Impact Group — Impact Communications, XPAND, ICON"
  2 (The engine): Map, Prioritise, Plan, Cost
  3 (Company): Method, About, Impact Group, Contact
  4: a short line about the field dispatch, an email field, an amber
     Subscribe button, and the real registered office address and phone.

Do not invent any address, phone number, email or office location. If a real
value is not supplied in this prompt, render "[ TO BE SUPPLIED ]" as visible
grey placeholder text.

Bottom bar: "© 2026 Impact Communications." plus Privacy Policy and Terms.
All footer links must be crawlable text.
```

---

## 2. SCREEN PROMPTS

### SCREEN 1 — HOMEPAGE · *the one that matters*

```
Design the Bharat IQ homepage, desktop 1440px. It must read as a working
instrument, not a marketing page. The hero is a real piece of output.

SECTION 1 — HERO, split 50/50, 88vh
Left, on white:
  Eyebrow, amber, 12px uppercase: "MARKET INTELLIGENCE FOR BHARAT"
  H1, 60px, weight 700, three lines:
    "Where to go.
     How to reach.
     What it costs."
  Sub-headline 20px slate, max 520px:
    "An intelligence engine for companies selling into rural and small-town
    India, built on 27 years of what actually happened on the ground."
  Two buttons: solid indigo "See it run on your category", outlined "How it
  works".

Right — NOT a photograph. A live-looking product panel, white card, 1px
border, titled "Detergent · Uttar Pradesh · district priority":
  A ranked list of 5 districts. Each row carries:
    - district name, 16px semi-bold
    - a tier chip with its name in text (two "Enter Now" blue, one "Seed &
      Build" aqua, one "Watch" amber, one "Avoid For Now" in neutral slate
      with a 45-degree hatch)
    - three small separate score bars labelled Prosperity, Market readiness,
      Friction — all in the SAME single hue #2a78d6, never stacked or summed
    - a confidence glyph: three dots plus the word HIGH, MEDIUM or LOW
  The FOURTH row must show LOW confidence, and beneath it an inline neutral
  hatched NO DATA block reading:
    "Retail density for this district is 2 data points old. We would need a
    4-day outlet count to raise this above LOW."
  Under the panel, a small slate line: "Illustrative output. Your category,
  your geography."

This NO DATA block is the single most important element on the page. It
proves the product's central claim in one glance. Do not hide it, shrink it,
or move it below the fold.

SECTION 2 — PROOF STRIP
Full-width mist band, 96px. Four items separated by thin rules, each a large
tabular number over a small uppercase slate label:
  "27 years — of execution on the ground"
  "38,000 — of India's ~47,000 weekly haats mapped, with market day"
  "57,000 — kirana and general trade outlets mapped"
  "25 states — of real cost data"
Use exactly these figures. Do not add, round up, or invent additional
statistics. If another number is wanted later it will be supplied.

SECTION 3 — THE PROBLEM
White. Left 5 columns: H2 40px "Rural India is not one market." and a short
paragraph. Right 6 columns: three stacked statements in 20px ink, each with
a thin amber left rule:
  "Spend spread thin across districts that behave nothing alike."
  "Activity where it can be executed, rather than where it matters."
  "And no way to tell the difference afterwards."
Close with one 24px indigo line: "Bharat IQ replaces that with evidence."

SECTION 4 — THE FOUR MODULES
Mist background. H2 "Four questions, answered in order." Four cards in a row,
each with a thin-line icon, the verb as a 22px title, a one-line promise, and
three short capability lines:
  MAP — where your consumer actually gathers
  PRIORITISE — which districts, for your category
  PLAN — the campaign, grounded in what we have run
  COST — what it will actually cost
Mark the PLAN card with a small slate chip reading "In build" — it is the
newest module and the site must not imply it is as mature as the others.

SECTION 5 — WHY IT IS DIFFERENT
White. H2 "It tells you what it knows, and what it doesn't."
Four blocks, each a bold lead line and two lines of body:
  "It says what it doesn't know." — every number carries its source, its
    vintage and its confidence. A confident wrong number costs more than an
    honest gap.
  "It is built on execution, not opinion." — the data comes from vans that
    ran, haats that were covered, retailers that were onboarded, and invoices
    that were paid.
  "It separates what most people blend." — prosperity is not reachability. A
    district where households can afford your product but you cannot service
    it is not a priority market.
  "It is category-first." — a plan for biscuits is not a plan for lubricants.
Set the second block ("vans that ran...") larger than the others — it is the
strongest sentence on the site.

SECTION 6 — THE GROUND
Deep indigo. Left: H2 "A map of where your consumer actually gathers", short
copy, outlined button "Explore the map". Right: a stylised district map
rendered as a dot-density field — each dot a mapped entity, coloured by type
in muted tones, geometric and data-like. Not an illustration, not a
decorative India silhouette.

SECTION 7 — COST
White. H2 "An honest estimate, not a guess dressed as a quotation."
Show a compact worked example: a brief on the left as a short text block, an
arrow, and on the right a cost breakdown table with line items (manpower,
vehicles, material, venue, logistics, reporting), each showing a RANGE not a
single figure, each with a small confidence glyph, and a total expressed as a
range. Beneath: "Drawn from real invoices and vendor estimates across 25
states."

SECTION 8 — CLOSING CTA
White, centred, generous padding. H2 "See it run on your category."
Sub-line: "Bring a category and a geography. We will run it live and show you
where the evidence is thin."
Solid indigo button "See it run on your category", WhatsApp link beside it.
```

### SCREEN 2 — MAP (Bharat Data)

```
Design the "Map" page for Bharat IQ — the ground layer.

HERO: contained, mist. H1 "A map of where your consumer actually gathers."
Sub-line: "Not a database of places." Right: the dot-density district map.

PROOF ROW: three items only — "38,000 of India's ~47,000 weekly haats, with
market day" · "57,000 kirana and general trade outlets" · "Mandis, melas,
chemists, dhabas, transport nagars, schools, ASHA and Anganwadi networks".
Beneath each, a small provenance chip: COUNTED (our field teams) or
REFERENCE (public data we maintain). Do not invent counts for any category
not listed here.

LAYER SECTIONS: one per layer, alternating white and mist, each with copy on
the left and on the right a SCHEMA table — field names and value types
("Market day — day of week", "Outlet type — category"), NOT filled example
rows. If a filled example is unavoidable it must carry the visible on-screen
label "ILLUSTRATIVE — NOT A REAL RECORD".

Do not display any named individual, proprietor, licence number, GPS
coordinate or record ID.

PRIVACY BLOCK: a bordered mist callout: "Influencer networks are mapped as
density and reach. We do not hold personal data on ASHA workers, Anganwadi
staff or any individual."

Close with the standard CTA band.
```

### SCREEN 3 — PRIORITISE

```
Design the "Prioritise" page for Bharat IQ.

HERO: deep indigo, 420px. Centred, max 880px. The client question in 34px
white: "Which districts, and why?" Below in 22px amber: "Prioritise".

THE METHOD BLOCK — the most important section. White background.
H2: "Three things that stay separate."
Three panels side by side, each with a title, a one-line definition, and a
single-hue horizontal bar:
  Prosperity — can households afford it?
  Market readiness — can you reach and sell there?
  Friction — how hard is execution on the ground?
All three bars use the SAME hue #2a78d6. Do not colour them differently.
Do not combine them into a composite score, a radar chart, a donut, or a
single number anywhere on this page.
The Friction panel carries a visible axis note: "higher = harder to execute".
Beneath the three panels, one 22px indigo line:
  "Most tools blend these into one score. A district where households can
  afford your product but you cannot service it is not a priority market."

THE TIERS: four tier chips displayed as a legend with a one-line definition
each — Enter Now, Seed & Build, Watch, Avoid For Now. "Avoid For Now" renders
neutral slate with a 45-degree hatch, not red.

WORKED EXAMPLE: a full ranked district table, 8 rows, with columns for
district, tier chip, the three separate score bars, confidence glyph, and a
"what drove this" text cell. At least two rows must show MEDIUM or LOW
confidence, and one row must carry a NO DATA block. Label the table
"Illustrative output."

CATEGORY-FIRST BLOCK: show the SAME district ranked differently under two
category headings — "Detergent" and "Confectionery" — side by side, with
different tiers. Caption: "The same district ranks differently for detergent
than for confectionery, because the category decides."
This comparison is the page's strongest argument. Give it full width.

FAQ, then the standard CTA band.
```

### SCREEN 4 — COST

```
Design the "Cost" page for Bharat IQ.

HERO: deep indigo, 420px. "What will it actually cost?" in 34px white,
"Cost" in 22px amber beneath.

THE FLOW: a three-step horizontal diagram — "A brief, an SOP or a plan" →
"Broken into an execution plan" → "Costed, element by element, as a range".
Numbered circles in indigo, connecting line, one line of description each.

THE WORKED EXAMPLE, full width, the page's centrepiece:
Left: a short brief as plain text in a bordered card.
Right: a cost table. Columns: element, unit, quantity, rate range, total
range, confidence glyph. Rows: manpower, vehicles, material, venue,
logistics, travel, reporting. EVERY figure is a range, never a single number.
The total is a range. At least one row shows LOW confidence with a visible
note explaining why.
Beneath the table, a bordered mist block:
  "This is an estimate with its assumptions visible, not a quotation. Ranges
  widen where our evidence is thinner. We will tell you which is which."

PROVENANCE BLOCK: "Drawn from real invoices and vendor estimates across 25
states." Do not state a count of line items unless one is supplied.

Close with the standard CTA band.
```

### SCREEN 5 — PLAN *(position as newest)*

```
Design the "Plan" page for Bharat IQ.

Identical structure to the Prioritise page, but carry a visible slate chip
beside the H1 reading "In build — available as a guided engagement".
The site must not imply this module is as mature as Map, Prioritise and Cost.

Content: builds the campaign from the market up — objective, audience,
geography, touchpoints, activity mix, execution plan, risks.

THE HONESTY BLOCK, given prominence rather than buried as a caveat — a
bordered callout with a thick amber left rule:
  "Historical execution shows what was done, not proof that it worked.
  Bharat IQ states the difference."
Design this as a reusable component; it appears on several pages.

Show one worked recommendation card: the activity, the best practice behind
it, and the named precedent — with a confidence glyph on the precedent, not
on the recommendation.
```

### SCREEN 6 — METHOD *(replaces "About" as the credibility page)*

```
Design the "Method" page for Bharat IQ. This page replaces a conventional
About page as the place a sceptical buyer goes.

H1: "How we know what we know."

PROVENANCE LEGEND, the centrepiece: four label chips shown side by side, each
with a one-line definition:
  COUNTED — physically enumerated by our field teams
  REFERENCE — public data we ingest and maintain
  MODELLED — derived from counted baselines
  ESTIMATED — directional only, flagged as such
Beneath: "Every figure we show carries one of these. Including the ones we
don't have."

CONFIDENCE LEGEND: the four confidence states with their glyphs and what each
means, including NO DATA rendered exactly as it appears in the product.

THE SEPARATION PRINCIPLE: restate the three scores and why they are never
blended, with the three single-hue panels.

WHERE OUR DATA IS THIN: a genuinely honest section naming categories or
geographies where coverage is weaker, and what it would take to close each
gap. This section will feel uncomfortable to publish. Publish it — it is the
most persuasive thing on the site, and no competitor will copy it.

POWERED BY IMPACT COMMUNICATIONS: short block, 27 years, the Impact Group
(Impact Communications, XPAND, ICON).

No certifications, no accreditations, no compliance badges, no client logos.
```

### SCREEN 7 — SEE IT RUN

```
Design the "See it run on your category" conversion page.

Two columns. Left (7 of 12): H1 "See it run on your category." Then:
  "Bring a category and a geography. We will run it live, show you the
  ranking, and show you where the evidence is thin."
Three green-tick lines:
  "A working session, not a pitch."
  "Real output on your category, not a demo dataset."
  "We will show you the gaps, not hide them."

Right (5 of 12): a white form card on mist. Fields: Name, Company, Work
email, Phone with +91 prefix and a "WhatsApp preferred" hint, a Category
field, a Geography field, and a four-line textarea "What decision are you
trying to make?" — give the textarea visual weight, it qualifies better than
any dropdown. Full-width indigo submit: "Book the session".

Below: a mist band — "Not ready?" with one outlined button, "Read the method".

Do not invent office addresses, phone numbers or response-time guarantees.
Render "[ TO BE SUPPLIED ]" for any value not given in this prompt.
```

---

## 3. MOBILE

```
Generate 390px versions of the homepage, Prioritise and See It Run.

- H1 34px, body 16px, section spacing 56px
- The hero product panel becomes full-width and sits BELOW the headline and
  buttons, but above the fold's end — it must still be seen without scrolling
  twice
- The ranked district list becomes stacked cards, one district per card, with
  the tier chip, the three score bars and the confidence glyph inside each.
  Never a horizontally scrolling table.
- The NO DATA block stays at full width and is never collapsed behind a tap
- Proof strip becomes a 2x2 grid, not a swipe carousel — these four numbers
  must not be scrolled past
- Persistent bottom bar after 40% scroll: indigo "See it run" at 70% width,
  green WhatsApp icon button for the rest
- Form fields 52px tall, 16px text, so iOS does not zoom on focus
```

---

## 4. THE NON-NEGOTIABLES

Check every output against these before it goes further:

- [ ] **No invented number, anywhere.** Only the figures written into these prompts. Everything else renders as a visible `[ TO BE SUPPLIED ]`
- [ ] No certification, accreditation or compliance badge
- [ ] No client name or logo
- [ ] No office address, phone or email that wasn't supplied
- [ ] No named individual, licence number, GPS coordinate or record ID
- [ ] No live feed, timestamp or version indicator
- [ ] Every tier chip carries its name in text
- [ ] The three scores are one hue, in separate panels, never summed
- [ ] No composite or overall score exists anywhere on the site
- [ ] Friction carries its "higher = harder" axis note
- [ ] Confidence is never colour
- [ ] A NO DATA block appears on the homepage, above the fold
- [ ] The word "guarantee" appears nowhere
- [ ] Works at 360px

Full guardrail — paste **PROMPT Z from `02-STITCH-PROMPT.md` §8 with every screen prompt.** It is not optional.

---

## 5. BUILD ORDER

1. **PROMPT 0**, iterate until the encoding system is right. Nothing else until then.
2. **SCREEN 1 (homepage).** If the hero panel and the NO DATA block work, the site works. If they don't, fix them before generating anything else — every other screen inherits these components.
3. **PROMPT N (navigation).**
4. **Screens 3 (Prioritise) and 4 (Cost)** — the two most mature modules.
5. **Screens 2 (Map) and 6 (Method).**
6. **Screens 5 (Plan) and 7 (See it run).**
7. **Mobile.**
8. **Extract the text and read it as a plain list, separately from the design.** Fabrications are nearly invisible inside a good-looking layout — that is exactly how the first run's eleven legal exposures survived review. Re-audit against `03-CLAIMS-AUDIT.md`.
9. Export to Figma, build the component library first, hand to the developer with `00-SEO-STRATEGY.md` §5.

---

## 6. WHAT'S STILL BLOCKING

These prompts use only figures that are safe: 27 years, 38,000 haats of ~47,000, 57,000 outlets, 25 states. **Deliberately excluded** — 1,111 campaigns, 5,700 cost line items, 3.88 lakh touchpoints, district counts — because they are unresolved in `NUMBERS-VERIFICATION-SHEET.csv` and `06` §1.

They are good numbers and they should go in. Fill the sheet and add them to the prompts as verified values. **Never as a blank** — a blank is what produced the first run's invented "45,000+ villages sampled yearly".

---

## CLOSING

Your instinct to under-promise and let the demo over-deliver is right, and this plan makes it structural rather than a matter of discipline: **if the website only ever shows what the product actually does, it cannot outrun the demo.**

The one thing worth protecting through every design review: **the NO DATA block on the homepage.** Someone will want to remove it — it looks like a flaw, it interrupts a clean hero, and every instinct in marketing says hide the gap. It is the most valuable element on the site. It is the only thing on it a competitor cannot copy, and it is the proof of the one claim you have built the entire brand on.
