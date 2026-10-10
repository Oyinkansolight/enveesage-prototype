# EnveeSage — throwaway design exploration

Nigeria-first curated perfume and sample retailer. Three structurally different directions answer: **Which shopping/discovery structure gives beginners and enthusiasts confidence?**

Run `npm run prototype` from this directory, then visit http://localhost:4173/prototype.html?variant=A . Use the floating bottom arrows or keyboard left/right to switch. No dependency install; Python 3 and npm are sufficient.

- A — Editorial boutique: photography, a curated edit, then sample education.
- B — Guided studio: a three-question finder, then paths for newcomers, gifts and enthusiasts.
- C — Scent library: searchable/filterable catalog, saved discoveries and profile comparison.

Scents, prices, delivery estimates, stock and recommendations are fictional. No live payment, accounts or external mutations. State is in memory and resets on reload; only the selected variant is in the URL. No final design is selected. Do not merge prototype code into production.

## Art direction

A: warm photographic magazine, serif hierarchy, generous space. Hero → edit → sampling.
B: approachable peach studio with one question at a time. Intro → finder → discovery paths → edit.
C: evergreen catalog workspace, compact sidebar, information-rich rows. Search → filters → profiles → comparison.

Entrance fade, product hover lift and drawer transition. Reduced motion is supported. Controls have visible focus; dialogs contain keyboard focus and close on Escape. These are prototype affordances, not a production accessibility certification.

## Research & decision

See `docs/research/fragrance-standards.md` for cited primary-source standards, `docs/product-brief.md` for scope/launch gates and `docs/validation.md` for the browser checks.

Prototype source captured on `prototype/enveesage-directions`. Verdict: **pending user review**. Choose or combine directions, capture the rationale here, then rewrite production code in the implementation repository. No existing issue was supplied to attach a pointer to.

Fonts: Google Fonts DM Sans / DM Serif Display, with local system fallbacks.

Hero: AI-generated unbranded mood photography, not an actual stocked fragrance. Stored locally in `assets/editorial-hero.jpg`. Product bottle illustrations and all SKU details are concept placeholders.
