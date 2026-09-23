# BHARAT IQ — STITCH DESIGN PROMPTS
**Content placement · Design system · Navigation**
For Google Stitch (stitch.withgoogle.com) · Prepared 23 September 2026

---

## HOW TO USE THIS

Stitch works best when you set the design system **once**, then generate screens one at a time against it.

1. Open Stitch → **Web** mode.
2. Paste **PROMPT 0 (Design System)** first. Generate. Do not move on until the colours, type and spacing look right.
3. Paste each screen prompt in order (1 → 10). Generate each into the same project so the system carries across.
4. Paste **PROMPT M** for mobile variants of the three pages that matter most.
5. Use the refinement prompts in §6 to fix what comes back wrong.
6. Export to Figma → hand to the developer with `00-SEO-STRATEGY.md` §5 (technical spec).

**Two rules while prompting:**
- Real copy only. The headlines and body text in these prompts are the actual approved copy from `01-WEBSITE-CONTENT.md`. Never let Stitch fill with lorem ipsum — the layout will be wrong for real Indian business English, which runs longer than placeholder text.
- Every `[FILL: X]` in a prompt must be replaced with Impact's real number **before** you paste it. A design built around "500+" looks different from one built around "1,20,000+".

---

## 1. DESIGN DIRECTION — THE THINKING

**What this site must feel like:** a serious intelligence institution that has spent 27 years in the dust, not a startup dashboard and not a colonial-nostalgia "rural India" photo essay.

**Three traps to avoid:**
1. **The saffron-and-sepia trap.** Most rural marketing sites in India use terracotta, mustard, turmeric, hand-drawn folk motifs and sunset photographs of farmers. It signals "activation vendor", not "data authority" — and it is visually identical to every competitor. We go the other way.
2. **The SaaS-template trap.** Purple gradients, floating glass cards and abstract 3D blobs signal "software company" and destroy the field credibility that is our actual moat.
3. **The poverty-porn trap.** No photographs that frame rural Indians as subjects of pity. Bharat IQ's audience includes people from these markets. Every image shows agency: a retailer running his shop, a distributor checking stock, a field executive on a tablet, a woman buying with intent.

**Where we land:** **Institutional confidence with field texture.** Think the visual seriousness of a central bank publication or a top-tier consulting house — crossed with real, unstaged photography from Indian villages and mandis, and data visualisation that is the hero rather than decoration.

---

## PROMPT 0 — DESIGN SYSTEM
*Paste this first.*

```
Create a design system for "Bharat IQ", a rural and Bharat market intelligence
platform in India. The audience is senior marketers, category heads, distribution
leaders and government programme officers. The brand must feel like a serious
research institution with deep on-ground field credibility — authoritative,
evidence-led and modern. It must NOT look like a generic SaaS product, and it
must NOT use folk-art motifs, sepia tones, terracotta or sunset-farmer imagery.

COLOUR PALETTE
- Primary: deep indigo #1B2A4A — used for headers, primary buttons, data-panel
  backgrounds. Conveys institutional authority.
- Accent: signal amber #E8A317 — used sparingly, only for calls to action,
  active states, key data highlights and chart emphasis. Never for large areas.
- Secondary accent: field green #2D6A4F — used for positive data states,
  verification badges and the "counted" data label.
- Neutrals: ink #101820 for body text, slate #5A6472 for secondary text,
  mist #F4F6F8 for section backgrounds, pure white #FFFFFF for cards and
  primary page background.
- Data visualisation palette: indigo, amber, green, slate, muted clay #B07156,
  teal #2A7F8F. Must remain distinguishable in greyscale and pass WCAG AA.

TYPOGRAPHY
- Headings: a confident geometric or grotesque sans-serif with real weight
  range (e.g. Inter Tight, Plus Jakarta Sans or Archivo). Tight letter-spacing
  on large sizes. H1 is 56px desktop / 34px mobile, weight 700.
- Body: a highly legible sans-serif at 18px desktop / 16px mobile, line-height
  1.65. Generous, book-like reading comfort — pages carry long analytical text.
- Data and numbers: a tabular-figure font with heavy weight for statistics.
  Large numbers are a design element in their own right.
- The typeface must support Devanagari, since a Hindi version follows later.

LAYOUT AND SPACING
- 12-column grid, 1280px max content width, 24px gutters, 80px side margins
  on desktop and 16px on mobile.
- Generous vertical rhythm: 96px between major sections on desktop, 56px mobile.
- Left-aligned text throughout. No centred paragraphs.
- Cards: 8px radius, 1px #E3E7EC border, no drop shadow by default; a subtle
  shadow only on hover. Flat and precise, not soft and floaty.

COMPONENTS TO DEFINE
- Primary button: solid indigo, white text, 8px radius, 16px/28px padding.
- Secondary button: indigo 1.5px outline, transparent fill.
- Stat block: very large tabular number in indigo, short label beneath in
  uppercase slate at 12px with 0.08em letter-spacing.
- Data card: white, thin border, a small "counted / modelled / estimated"
  label chip in the top-right corner.
- Methodology micro-block: a small bordered strip in mist background, 13px
  slate text, used under every chart to state sample, geography and fieldwork date.
- Evidence badge: a small green outlined pill reading "Field-verified".
- Quote block: thick 4px amber left rule, no italics, attribution beneath.
- Comparison table: alternating mist row backgrounds, indigo header row,
  our column visually emphasised with a subtle amber top border.
- Form field: 1px slate border, 8px radius, 48px height, floating label.

PHOTOGRAPHY DIRECTION
Documentary, unstaged, high-contrast colour photography from real Indian rural
and small-town markets: a kirana counter mid-transaction, a weekly haat, a
distributor godown, an agri-input dealer with a farmer, a field researcher with
a tablet, a woman comparing two packs at a shop shelf. Natural light. People
shown with agency and competence, never as subjects of pity. Apply a subtle
indigo duotone only when a photograph sits behind text.

ICONOGRAPHY
Thin-line 1.5px stroke icons, geometric, no filled illustrations, no 3D.

ACCESSIBILITY
WCAG 2.1 AA minimum. All body text at least 4.5:1 contrast. Visible focus
states on every interactive element. Tap targets minimum 44x44px. Design and
test at 360px width first — a meaningful share of this audience browses on
budget Android phones over 4G.
```

---

## 2. NAVIGATION SPECIFICATION

### PROMPT N — GLOBAL NAVIGATION

```
Design the global site header and footer for Bharat IQ.

HEADER — sticky, 76px tall, white background, 1px bottom border in #E3E7EC.
It compresses to 60px with a subtle shadow on scroll.

Left: the Bharat IQ wordmark, with a smaller line beneath it reading
"Powered by Impact Communications" in 11px slate uppercase with 0.08em
letter-spacing. This lock-up is the core credibility signal — never hide it.

Centre: primary navigation, 15px medium weight, ink colour, 28px apart:
  What We Do   |   Solutions   |   Sectors   |   Data Stack   |   Reports   |
  Insights   |   About

Right: a text link "Contact" followed by a solid indigo primary button
"Request a Briefing".

MEGA MENUS — "What We Do", "Solutions" and "Sectors" open a full-width
dropdown panel, 380px tall, white with a thin top border, opening on hover on
desktop and tap on touch devices.

"What We Do" mega menu — three columns:
  Column 1 (heading "Research"): Rural Market Research · Rural Consumer Insights
  Column 2 (heading "Data"): Data & Analytics · Bharat Consumer Intelligence
  Column 3 (heading "Strategy"): Advisory
  Each item is a bold title with a one-line description beneath in slate.
  A fourth panel on the right, in mist background, promotes the latest
  Bharat IQ Index with a small report cover thumbnail and a "Download" link.

"Solutions" mega menu — two columns of seven items, each written as the client's
question in bold with the solution name beneath in slate:
  "Should we enter this market?" → Market Entry & Sizing
  "Why isn't distribution converting?" → Route to Market & Distribution
  "Why did the shopper choose the other brand?" → Category & Shopper
  "Did the campaign actually work?" → Brand & Campaign Effectiveness
  "How many outlets are there really?" → Rural Retail Audit & Census
  "Is Tier 2-3 a different market?" → Small-Town & Tier 2/3 Research
  "Did behaviour change, not just awareness?" → IEC & Social Impact Measurement

"Sectors" mega menu — a four-column grid of eight sectors, each with a thin-line
icon: FMCG & Foods, Agriculture & Agri-Inputs, Auto/2W/Tractors, BFSI & Fintech,
Telecom & Devices, Healthcare & Pharma, Durables & Building Materials,
Government & Development.

MOBILE HEADER — logo lock-up left, a "Briefing" pill button and a hamburger
icon right. The menu opens as a full-screen white overlay with accordion
sections in the same order, the "Request a Briefing" button pinned to the
bottom of the screen, and a WhatsApp contact link beneath it.

FOOTER — deep indigo #1B2A4A background, white and light-slate text, five columns:
  Col 1: Bharat IQ wordmark, the line "Rural and Bharat market intelligence.
         27 years in the field.", and social icons.
  Col 2 (What We Do): the five service links.
  Col 3 (Solutions): the seven solution links.
  Col 4 (Company): About, Impact Group, Case Studies, Reports, Insights,
         Glossary, Careers, Contact.
  Col 5 (Stay Current): a short line "Rural Pulse — quarterly field signal from
         Bharat", an email input with an amber "Subscribe" button, and office
         address, phone and WhatsApp beneath.
Bottom bar, separated by a 1px rule at 20% white: "© 2026 Impact Communications.
Part of the Impact Group of Companies." plus Privacy Policy and Terms links.

Keep every footer link crawlable text, not an image or an icon-only link.
```

**Navigation logic — the reasoning behind the structure:**

| Decision | Why |
|---|---|
| "Solutions" labelled as client questions | Buyers search by problem, not by methodology. It also front-loads long-tail keyword phrases into navigation anchor text. |
| "Data Stack" as a top-level item | It is the differentiator. Burying it inside About would waste the single strongest competitive proof on the site. |
| "Reports" above "Insights" | Reports convert and earn links; blog articles support. Order reflects commercial priority. |
| "Powered by Impact Communications" locked into the logo | Bharat IQ is a new entity with no search authority. It borrows credibility from a 27-year-old brand on every single page view. |
| Single persistent CTA, "Request a Briefing" | One conversion action sitewide. Competing CTAs halve conversion. |
| Max 3 clicks to any page | Crawl depth and equity distribution — see `00-SEO-STRATEGY.md` §4. |

---

## 3. SCREEN PROMPTS

### PROMPT 1 — HOMEPAGE

```
Design the homepage for Bharat IQ using the established design system.
Desktop, 1440px wide. Long-scroll page with eleven sections.

SECTION 1 — HERO (88vh)
Split layout, 55/45. Left side, on white:
  An eyebrow line in amber uppercase 12px: "RURAL & BHARAT MARKET INTELLIGENCE"
  H1, 60px, weight 700, tight leading:
    "Bharat Is Not One Market. We Help You Read All Of Them."
  Sub-headline, 20px slate, max 520px wide:
    "Bharat IQ turns 27 years of on-ground execution across India's villages,
    small towns and Tier 2-3 markets into decision-grade intelligence - so your
    next rural move is based on what is actually happening in the field, not on
    a national average."
  Two buttons side by side: solid indigo "Request a Briefing", outlined
  "Download the Bharat IQ Index".
Right side: a full-bleed documentary photograph of an Indian rural weekly market
or a kirana counter mid-transaction, with a subtle indigo gradient at its left
edge so it blends into the white. Overlaid on the lower right of the image, a
small white data card reading "Rural FMCG volume growth 8.4% vs urban 4.6%"
with a tiny source line "NielsenIQ, Q2 FY26" beneath it — showing that this site
puts evidence on screen, not stock imagery.

SECTION 2 — TRUST STRIP
Full-width, mist background, 96px tall. Five stats in a row, separated by thin
vertical rules, each a large indigo tabular number above a small uppercase
slate label: "27+ Years in rural India", "[FILL: X] Districts covered",
"[FILL: X] Villages in footprint", "[FILL: X] Retailers mapped",
"[FILL: X] Languages & dialects".

SECTION 3 — THE PROBLEM
White background. Left column, 5 of 12 grid columns: an H2 at 40px,
"Most Rural Decisions Are Made On Data That Never Left The City", and a short
intro paragraph. Right column, 6 columns: four stacked problem cards, each with
a thin-line icon, a bold 18px title and two lines of body text:
  "National averages" - hide that western UP and interior Odisha behave like
  different countries.
  "Online panels" - reach the connected semi-urban edge and miss interior India.
  "Sales data" - tells you what shipped, not what sold or why the next village
  has no stock.
  "Agency opinion" - confident, unverifiable, usually about three states.
Close the section with a single full-width line in 24px indigo:
"The result: a launch that works in two states and dies in eleven."

SECTION 4 — WHAT WE DO
Mist background. Centred H2 "Intelligence With Mud On Its Boots" with a short
sub-line. Below it, four equal cards in a row (they stack two-by-two on tablet):
Rural Market Research, Rural Consumer Insights, Data & Analytics, Advisory.
Each card: a thin-line icon, a bold title, three lines of description, and an
amber text link with a small arrow. On hover the card border turns indigo and
lifts 2px.

SECTION 5 — WHY DIFFERENT
White background. H2: "Research Firms Know Numbers. Activation Agencies Know
Villages. We Are Both." Below it a five-row comparison table with four columns:
attribute, "Global research firms", "Rural activation agencies", "Bharat IQ".
The Bharat IQ column has a light indigo tint, a 3px amber top border and bold
text. Rows: village-level reach, statistical rigour, speaks the dialect, knows
what execution costs, recommendation you can act on.
Beneath the table, a full-width quote block with an amber left rule:
"We do not hand you a finding and leave. Every Bharat IQ output ends with what
to do, where to do it first, what it will cost, and how we will know it worked."

SECTION 6 — SOLUTIONS BY QUESTION
Deep indigo background, white text. H2: "Start With Your Question, Not Our
Service List." A 3x3 grid (seven tiles plus one wider closing tile). Each tile
shows a large quotation mark, the client question in 20px white semi-bold, and
the solution name beneath in amber 14px. Tiles are bordered in 20% white and
fill with 8% white on hover.

SECTION 7 — THE RURAL DATA STACK
White background. Left column: H2 "The Asset Behind Every Answer" and body copy.
Right column: five horizontally stacked layer bars, like geological strata,
each a full-width rounded bar in a progressively deeper indigo, labelled
Village Database, Retailer & Channel Universe, Field Network, Execution
Telemetry, Category Benchmarks — with its [FILL: X] figure right-aligned inside
the bar. Below, an outlined button: "See the Rural Data Stack".

SECTION 8 — SECTORS
Mist background. H2 "Where We Go Deep". An eight-tile grid, four across, each
tile a thin-line icon above a sector name, with an indigo border on hover.

SECTION 9 — PROOF / CASE STUDIES
White background. H2 "What It Looks Like In The Field". Three cards in a row.
Each: a documentary photograph at 16:9 with a subtle indigo duotone, a small
amber category chip, then the RESULT as the headline in 22px bold — for example
"From 11 districts to 34, without adding a rupee of trade spend" — followed by
one line of context and a "Read the case" link. Headlines state outcomes, never
activities.

SECTION 10 — REPORTS
Deep indigo background. Left: an angled 3D-effect mockup of the Bharat IQ Index
report cover. Right: H2 "Bharat IQ Reports", two short paragraphs, and an amber
solid button "Download the latest edition" with a small line beneath:
"Free. No sales call attached."

SECTION 11 — FINAL CTA
White background, centred, generous padding. H2 "Bring Us Your Hardest Bharat
Question." Sub-line: "Thirty minutes with a rural strategist. No deck, no pitch."
A solid indigo "Request a Briefing" button with a WhatsApp text link beside it.

SECTION 12 — FAQ
Mist background, single centred column at 760px. H2 "Common Questions" and five
accordion items, the first expanded by default. Questions in 18px semi-bold ink,
answers in 16px slate.
```

### PROMPT 2 — SERVICE PAGE TEMPLATE (Rural Market Research)

```
Design a service page for Bharat IQ titled "Rural Market Research Company In
India", following the established design system. This is the master template
for all five What We Do pages.

BREADCRUMB: Home > What We Do > Rural Market Research. 13px slate, above the H1.

HERO: not full-bleed. A contained two-column band on mist background, 60/40.
Left: H1 at 48px, a 20px intro paragraph, and a primary "Request a Briefing"
button. Right: a documentary photograph of a field researcher conducting a
tablet-based interview at a village doorstep, in a rounded 8px frame.

ON-PAGE CONTENTS: a sticky left sidebar, 220px wide, appearing from the first
content section onward. It lists the page's H2s as anchor links with the active
one marked by an amber left rule. Content occupies the remaining columns.
On mobile this becomes a horizontally scrollable chip row pinned under the header.

SECTION — "What Makes Rural Research Hard": a three-column table with a deep
indigo header row: "The field reality", "What it breaks", "How Bharat IQ handles
it". Six rows, alternating mist backgrounds. The third column is bold ink; the
first two are slate. This table is the page's credibility centrepiece — give it
full width and breathing room.

SECTION — "Our Rural Research Capabilities": three cards in a row headed
Quantitative, Qualitative and Continuous. Each contains a tick-marked list of
8-10 short capability lines in 15px, with a thin-line icon in the card header.

SECTION — "What Is A CAPI Survey": a distinct callout block on deep indigo with
white text, 760px wide and centred, presenting the question as a heading and a
60-word plain-language answer beneath. Style this as a reusable
"definition block" component - it will be used on many pages and is designed to
be quoted by AI assistants and search snippets.

SECTION — "How A Bharat IQ Study Runs": a six-step horizontal process timeline
with a connecting line, numbered circles in indigo, a step title and one line of
description each. On mobile it becomes a vertical timeline.

SECTION — "Questions We Answer": six short client questions as a two-column list,
each prefixed with a small amber arrow, set in 18px.

SECTION — FAQ: four accordion items with FAQ schema.

SECTION — RELATED: three link cards to Rural Consumer Insights, Rural Retail
Audit and the Rural Data Stack.

SECTION — CTA: the standard closing "Bring us your hardest Bharat question" band.
```

### PROMPT 3 — SOLUTION PAGE TEMPLATE

```
Design a solution page for Bharat IQ titled "Rural Route To Market & Distribution
Strategy", following the established design system. This is the template for all
seven Solutions pages, which are organised around a client question rather than
a service.

HERO: deep indigo full-width band, 420px tall. Centred, max 880px:
  A large opening quotation mark in amber.
  The client question in 36px white semi-bold:
    "We have distributors. Why isn't it converting into sales?"
  Beneath it, in 15px light slate: "The question this page answers."
  H1 in 22px amber below: "Rural Route To Market & Distribution Strategy".

SECTION — "What Goes Wrong Without It": white background, two columns. Left:
the heading and body copy. Right: a simple diagnostic diagram showing the gap
between "400 outlets appointed" and "160 outlets actually serviced" as two
horizontal bars of very different lengths, the shorter one in amber, with the
gap annotated in red-slate as "the coverage illusion".

SECTION — "What We Do": mist background, an eight-item checklist in two columns,
each item with a green tick icon, a bold lead phrase and a short explanation.

SECTION — "What You Get": three deliverable cards, each with a small preview
thumbnail of the actual artefact — a distribution gap map, a territory model
table, a retailer acquisition plan.

SECTION — "The Honest Note": a bordered callout in mist with a thick amber left
rule: "If the diagnosis shows you have a demand problem rather than a
distribution problem, we will tell you. Expanding distribution for a product
nobody wants is the most expensive mistake in rural marketing."
This block appears on several pages and signals advisory integrity - design it
as a reusable component.

SECTION — TIMELINE & ENGAGEMENT: a compact three-column strip showing Typical
timeline, Typical geography scope, and Typical team.

SECTION — RELATED CASE STUDY: one full-width horizontal card with a photograph
on the left and the result headline on the right.

SECTION — FAQ, then the standard CTA band.
```

### PROMPT 4 — RURAL DATA STACK

```
Design the "Rural Data Stack" page for Bharat IQ. This is the site's
differentiator page and should be the most visually ambitious screen.

HERO: deep indigo, full-width, 520px. H1 in 56px white: "The Rural Data Stack".
Sub-headline in 20px light slate, max 700px. Behind the text, a very low-opacity
(8%) abstract map of India rendered as a dot-density grid, each dot a village —
geometric and data-like, never decorative or illustrative.

MAIN VISUAL: an interactive five-layer stack diagram, full width, occupying
560px of height. The layers sit one above another in perspective, like
transparent sheets:
  Layer 5 (top): Category Benchmarks
  Layer 4: Execution Telemetry
  Layer 3: Field Network
  Layer 2: Retailer & Channel Universe
  Layer 1 (base): Village Database
Each layer shows its name, its [FILL: X] count as a large tabular number, and a
one-line description. Hovering a layer brings it forward, raises its opacity and
dims the others. Selecting a layer scrolls to its detail section below.

DETAIL SECTIONS: one per layer, alternating white and mist backgrounds. Each has
a left column of explanatory copy and a right column containing a realistic data
artefact — a sample village record table, a map of geo-tagged outlet pins across
a district, a field-network coverage map of India shaded by depth, a screenshot
of a geo-tagged proof-of-execution capture, a benchmark chart. These artefacts
must look like real working data, with column headers and plausible values, not
like decorative abstractions.

SECTION — "Our Methodology, Published": white background, centred at 760px.
Explanatory copy, then three label chips displayed side by side as a legend:
a green "COUNTED" chip, a blue "MODELLED" chip and a slate "ESTIMATED" chip,
each with a one-line definition. Beneath, an outlined button "Read the full
methodology note".
This labelling convention is the brand's core trust device - give it prominence.

Close with the standard CTA band.
```

### PROMPT 5 — REPORTS HUB

```
Design the "Bharat IQ Reports" hub page.

HERO: mist background, contained. H1 "Bharat IQ Reports" with a sub-line:
"We publish what we learn. Free where it is useful to the market."

FEATURED REPORT: a full-width card on deep indigo, 420px tall, split 40/60.
Left: a large angled 3D mockup of the Bharat IQ Index report cover with a soft
shadow. Right: an amber uppercase eyebrow "FLAGSHIP · BI-ANNUAL", a 36px white
title "The Bharat IQ Index", three lines of description, a horizontal row of
four small pillar labels (Consumption Momentum, Distribution Density,
Aspiration, Digital Readiness) separated by thin rules, and an amber solid
"Download the latest edition" button.

REPORT GRID: white background, three columns. Each card: a report cover
thumbnail at 3:4, a series chip (Rural Pulse / Category Decoder / Field Notes),
a title, a publication date, a short description, and either a "Download" link
for free assets or a small amber lock icon with "Free with email" for gated ones.

FILTER BAR: above the grid, a horizontal row of filter chips — All, Bharat IQ
Index, Rural Pulse, Category Decoders, Field Notes, and by sector.

SUBSCRIBE BAND: mist background, centred. "Rural Pulse — quarterly field signal
from Bharat." An email field and an amber Subscribe button, with a small line
beneath: "Four emails a year. Field data only. Unsubscribe any time."
```

### PROMPT 6 — INSIGHTS ARTICLE (pillar page)

```
Design a long-form article template for Bharat IQ, titled "Rural Consumer
Behaviour In India: A Field Guide". The page runs to 3,000+ words and must be
comfortable to read for fifteen minutes.

HEADER: contained, no hero image. A breadcrumb, an amber category chip
"RURAL CONSUMER", an H1 at 48px with a max width of 900px, a 20px slate standfirst,
then a byline row: a circular author photograph, the author name in bold, their
role, the publication date, and an estimated reading time. The named author with
a real photograph is required on every article - it is a trust signal for both
readers and AI search engines.

LAYOUT: three columns. Left (200px): a sticky table of contents listing the H2s,
with the active section marked by an amber rule, plus share icons beneath.
Centre (680px): the article body. Right (200px): a sticky card promoting the
Bharat IQ Index, replaced further down the page by a "Talk to a rural strategist"
card.

BODY TYPOGRAPHY: 19px body text at 1.7 line-height with 28px paragraph spacing.
H2s at 32px with 64px of space above. H3s at 24px. Bulleted lists indented with
custom amber markers.

IN-ARTICLE COMPONENTS TO DESIGN:
- A "key stat" pull-out: a full-width mist band with a very large tabular number,
  a one-line interpretation, and a small source-and-date line.
- A chart block: white card, a title, the chart itself, and the standard
  methodology micro-block beneath stating sample, geography, fieldwork date
  and method.
- A "Myth vs Field Reality" two-column comparison block: the myth in struck-through
  slate on the left, the field reality in bold ink on the right.
- A quote block from a named field respondent, with an amber left rule and an
  attribution line such as "Kirana retailer, Barabanki district, Uttar Pradesh".
- An inline CTA that appears once mid-article: a slim mist band with one line of
  text and a link.

ARTICLE FOOTER: an author bio card, then a "Related reading" row of three
article cards, then the standard CTA band.
```

### PROMPT 7 — CASE STUDY

```
Design a case study page for Bharat IQ.

HERO: deep indigo, 480px. An amber sector chip, then the RESULT as the H1 in
44px white: "From 11 districts to 34, without adding a rupee of trade spend."
Beneath it, three stat blocks in a row, each a large amber tabular number over a
small white uppercase label.

STRUCTURE, alternating white and mist backgrounds, each section a two-column
split with a heading on the left and content on the right:
  1. The Situation - what the client faced.
  2. What We Found - the diagnosis, with one chart.
  3. What We Recommended - a numbered list.
  4. What Happened - outcomes, with a before-and-after comparison chart.
  5. Methodology - a bordered mist block stating study type, sample, geography,
     fieldwork dates and method. Always visible, never hidden behind a click.

CLIENT QUOTE: full-width mist band, a 28px quote with an amber left rule, and an
attribution line with the client's name, role and organisation.

Close with two related case-study cards and the standard CTA band.

If the client cannot be named, use a sector descriptor such as "A national
personal-care brand" and state clearly that the client is anonymised. Never
imply a named client who has not given written permission.
```

### PROMPT 8 — REQUEST A BRIEFING

```
Design the "Request a Briefing" conversion page for Bharat IQ.

Two-column layout with no site navigation distractions beyond the standard
header. Left column (7 of 12): H1 "Request A Briefing" at 48px, then the
intro paragraph, then a three-item list with green tick icons:
  "Thirty minutes with a rural strategist, not a salesperson."
  "We will tell you what data would actually answer your question."
  "If you don't need us, we will say so."
Beneath, a small "Response within one working day" line with a clock icon.

Right column (5 of 12): a white form card with a thin border sitting on a mist
page background. Fields: Name, Company, Work email, Phone (with an India +91
prefix and a small "WhatsApp preferred" hint), and a four-line textarea labelled
"What's the Bharat question you're trying to answer?" — this textarea is the
most important field, so give it visual weight. A full-width solid indigo submit
button reading "Request a Briefing". Beneath it, a privacy line in 13px slate
and a WhatsApp link as an alternative contact route.

Below both columns, a full-width mist band: "Not ready for a conversation?" with
two outlined buttons — "Download the Bharat IQ Index" and "Subscribe to Rural Pulse".

Bottom strip: office addresses, phone and email, plus a small trust row of
client logos in greyscale.
```

### PROMPT 9 — GLOSSARY

```
Design the "Bharat Glossary" page for Bharat IQ.

HERO: mist, contained. H1 "The Bharat Glossary", a sub-line, and a prominent
search field with a magnifier icon reading "Search a term".

A-Z JUMP BAR: a sticky horizontal row of letters beneath the header; unavailable
letters are shown at 30% opacity.

ENTRIES: a single column at 820px, grouped under large amber letter headings.
Each entry is a bordered white card: the term in 22px bold ink, the definition in
17px slate at two to four sentences, and then a final line in ink prefixed by a
small amber arrow: "Why it matters:" followed by the decision implication. Where
relevant, the entry ends with a link to the related service page.

SIDEBAR on desktop: a sticky card promoting the Rural Pulse subscription.

Close with the standard CTA band.
```

### PROMPT 10 — ABOUT

```
Design the "About Bharat IQ" page.

HERO: white, contained, single column at 860px, left-aligned. H1 "About Bharat
IQ" at 52px, then the origin-story paragraph in 22px — set larger than normal
body text because this paragraph carries the brand's reason for existing.

SECTION — POWERED BY IMPACT COMMUNICATIONS: mist background, two columns. Left:
copy. Right: a documentary photograph of a field team at work.

SECTION — THE IMPACT GROUP: white background. Four cards in a row for Impact
Communications, XPAND, ICON and Bharat IQ. The Bharat IQ card is visually
emphasised with an indigo fill and white text; the other three are white with
thin borders. Each card carries a logo, a one-line descriptor and three service
keywords. Beneath the row, a single centred line in 24px indigo: "Research,
distribution, visibility and execution under one roof. That is why our
recommendations come costed."

SECTION — HOW WE WORK: deep indigo background. Four principles in a row, each
with a large amber numeral, a bold white title and two lines of light-slate
text: Diagnose before prescribing · Label our certainty · Say the uncomfortable
thing · Finish at the decision.

SECTION — LEADERSHIP: white background, a three-column grid of profile cards.
Each: a square documentary-style portrait, a name in 20px bold, a role in amber,
a three-line bio and a LinkedIn icon. Full named bios with real credentials are
required, not stock silhouettes.

SECTION — TIMELINE: a horizontal milestone timeline from 1998 to 2026, marking
the founding of Impact Communications, the launch of ICON, the launch of XPAND
and the launch of Bharat IQ.

Close with the standard CTA band.
```

---

## PROMPT M — MOBILE VARIANTS

```
Generate mobile versions at 390px width of the Bharat IQ homepage, the Rural
Market Research service page and the Request a Briefing page, keeping the
established design system.

Mobile rules to apply throughout:
- H1 drops to 34px, body text to 16px at 1.65 line-height, section spacing to 56px.
- All multi-column grids collapse to a single column; the four "What We Do" cards
  become a horizontally swipeable carousel with a dot indicator.
- The homepage hero becomes text-first: eyebrow, H1, sub-headline, then the two
  buttons stacked full width, with the photograph below rather than beside.
- The trust strip becomes a 2x3 stat grid rather than a single scrolling row -
  these numbers are the credibility proof and must not be swiped past.
- Wide comparison tables become stacked cards, one per row, with each column
  shown as a labelled line inside the card. Never allow a horizontally scrolling
  table on mobile.
- The on-page contents sidebar becomes a horizontally scrollable chip row pinned
  under the sticky header.
- A persistent bottom bar appears after 40% scroll depth: a solid indigo
  "Request a Briefing" button occupying 70% of the width and a green WhatsApp
  icon button occupying the rest.
- Form fields are 52px tall with 16px text so iOS does not zoom on focus.
- Every tap target is at least 44x44px.
- Images are sized for a 4G connection - design assuming the hero photograph may
  arrive a second after the text.
```

---

## 4. CONTENT PLACEMENT PRINCIPLES

The design must serve the conversion and SEO logic, not the other way round.

| Principle | Applied as |
|---|---|
| **Evidence above the fold** | The hero carries a real data card, not only a claim. A visitor sees proof within one second. |
| **The differentiator gets the best real estate** | The comparison table (Section 5) and the Data Stack page are the two screens that win deals. Give them the most design investment. |
| **Questions before services** | Section 6 and the whole Solutions structure lead with the buyer's question. This mirrors search behaviour and lifts long-tail relevance. |
| **Numbers are a visual element** | Large tabular figures do the work that stock photography does on competitor sites. This is a data brand — the data should be the art. |
| **Methodology is always visible** | Every chart carries its sample, geography and fieldwork date on screen. Never behind a tooltip. It is the single strongest trust differentiator available to us. |
| **One CTA, everywhere** | "Request a Briefing" appears in the header, at least twice per page and in the mobile sticky bar. No competing primary actions. |
| **Credibility travels** | The "Powered by Impact Communications" lock-up and the 27-year marker appear in the header, the footer and every credibility strip. |
| **Honest notes are designed, not buried** | The "we'll tell you if you don't need us" blocks get a real component treatment. In a category full of overclaiming, visible restraint converts. |
| **Text is text** | No headline, statistic or body copy baked into an image. Everything must be crawlable, selectable and translatable for the Hindi version. |

---

## 5. WHAT TO CHECK BEFORE YOU ACCEPT A STITCH OUTPUT

- [ ] Real copy, no lorem ipsum anywhere
- [ ] Every `[FILL: X]` replaced with a real, verified Impact number
- [ ] Amber used only for CTAs, active states and data emphasis — never as a background wash
- [ ] No folk motifs, no sepia, no sunset farmers, no pity-framing photography
- [ ] Body text at 4.5:1 contrast minimum; check amber-on-white especially (it usually fails — use amber for fills and rules, ink or indigo for text)
- [ ] Every chart has a methodology line beneath it
- [ ] "Powered by Impact Communications" present in the header lock-up
- [ ] Tested at 360px width, not only at 1440px
- [ ] Devanagari renders correctly in the chosen typeface
- [ ] One H1 per screen, headings in hierarchical order

---

## 6. REFINEMENT PROMPTS
*Use these when Stitch returns something close but wrong.*

- `"Too much amber. Restrict amber to buttons, active states and single data highlights only. Everything else in indigo, ink, slate, white and mist."`
- `"This looks like a SaaS product. Remove gradients, glassmorphism and floating 3D shapes. Make it flatter, more editorial, more like a research institution publication."`
- `"Replace the illustrations with documentary photography from real Indian rural markets — a kirana counter, a weekly haat, a distributor godown — shot in natural light, people shown working with competence."`
- `"Make the statistics larger and the decorative elements smaller. The numbers are the hero of this brand."`
- `"Add the methodology micro-block beneath every chart: sample size, geography, fieldwork dates, method."`
- `"Increase whitespace between sections to 96px on desktop and tighten heading letter-spacing."`
- `"Convert this table into stacked cards for mobile. No horizontal scrolling tables."`
- `"The hero photograph is dominating the headline. Reduce it to 45% width and increase the H1 to 60px."`
- `"Add a sticky bottom CTA bar on mobile that appears after 40% scroll."`
- `"Make the Bharat IQ column in the comparison table visually dominant with a light indigo tint and an amber top border."`

---

## 7. AFTER STITCH — HANDOFF

1. Export to Figma; name layers and components properly before handing over.
2. Build the component library first: buttons, stat block, data card, methodology micro-block, definition block, honest-note block, comparison table, form field, accordion, report card.
3. Give the developer this file plus `00-SEO-STRATEGY.md` §5 (technical spec), and `01-WEBSITE-CONTENT.md` for the copy.
4. Build in Next.js with static generation — it matches the in-house stack, so the team can maintain the site without an external agency.
5. Before launch, run the pre-launch check in `00-SEO-STRATEGY.md` §9, particularly the `[FILL]` and `[VERIFY]` sweeps. **Do not launch with a single unfilled proof number or an unverified statistic.** For a business whose product is evidence, that is the one unrecoverable mistake.
