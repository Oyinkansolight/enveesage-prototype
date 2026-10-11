# Prototype validation — 10 October 2026

Checked with the T3 collaborative browser and HTML preview. No unit tests were added for this throwaway design artifact.

## Exercised

- Switched A → B → C with the bottom controls; URL reflects selection, in-memory bag preserved between variants.
- Guided flow: Woody + ₦50,000–₦75,000 + work gave Quiet Woods, a ₦62,000 bottle / ₦3,500 sample. Selected choices and back/restart affordances work.
- Added that sample to the bag. Lagos demo total: ₦7,000 (₦3,500 sample + ₦3,500 delivery). FCT demo total: ₦8,500 after destination change.
- Payment preview states explicitly that no payment is taken or order placed.
- Searched “cedar”: one matching row, Quiet Woods. Saved it and added its profile to comparison.
- Detail drawer: focus wraps to Close after the last visible control; Escape closes; background and switcher become inert while open and restore after close.
- A/B/C measured at 390px mobile and 1280px desktop: document width equaled viewport width, without horizontal overflow.
- Visual review of all three layouts, image loading, Google-font fallback setup and inline HTML rendering at 728px.

Verified the later gift branch: Warm + under ₦50,000 + gift suggests the three-scent ₦10,500 discovery set. Occasion is otherwise a fallback after mood/budget. This is intentionally simple preference logic, not a validated fragrance predictor. Inline HTML variant cycling A → B → C → A completed without runtime errors at 390px.

## Limits

No production WCAG conformance claim. A formal contrast, screen-reader, zoom, focus-obscuration and mobile-device audit remains necessary. No live inventory, courier, payment, product registration, medical recommendation, customer interview or real-order test occurred. Console contained state logs; no uncaught runtime errors were observed in exercised flows. Only the variant URL persists; all other state resets on reload.

## Verdict

All three directions are reviewable. No design winner has been selected. Suggested synthesis (A storefront, B optional guidance, C depth) remains an unvalidated hypothesis.

# Round two (D–F) validation — 11 October 2026

Checked in the T3 browser at 1280px and the iPhone 12 Pro preset (390px), using the bundled `dist/index.html`.

- All six variants: no horizontal overflow at 390px; switcher arrows wrap F → A; the dropdown selects any variant directly; no uncaught errors.
- D: keep/skip/undo update the deck state; a simulated 160px pointer drag counted as a keep; “Add box to bag” moved two samples into the bag and opened it.
- E: “Something for owambe” → “Oud” → “Up to ₦120k” recorded occasion, warm mood, oud preference and budget, then suggested Oud Majlis and Amber After Hours (oud first). Typed “delivery to Abuja” returned the delivery estimates. “Forget” on budget removed it from the profile.
- F: a pin near fresh/soft ranked Lagos Rain nearest (93%); a pin top-right ranked Oud Majlis nearest; the Fresh filter dimmed four non-fresh dots. After moving two dots inward, all map labels stay inside the map at 390px.

Not checked: real touch hardware, screen readers, landscape phones. The chat is keyword matching, not an AI model.


## G — The Scent Wardrobe (11 October 2026)

Added an independent seventh direction; A–F render functions and styles are preserved. Shared wiring adds G, a body variant marker for scoped colors, and the seven-option switcher. The share builder now embeds both local images.

Browser checks on the actual self-contained `dist/index.html`:

- All A–G render at 1280 px and 390 px without horizontal page overflow. G also checked at 320, 640 and 768 px. Desktop and phone hero/collection layouts inspected visually.
- Select Lagos Rain, Citrus Daybreak and Quiet Woods: three samples total ₦9,000. Reject a fourth. Remove Citrus, choose Amber After Hours: ₦11,000. Add edit once, selection clears, three items enter bag. FCT demo delivery produces ₦16,000. Payment step explicitly ends in simulation.
- Search “hibiscus” across all six scents returns Velvet Hibiscus. Save it and open the saved list; the newer catalog scent is present.
- Bottle budget ≤ ₦50,000 returns Lagos Rain and Citrus Daybreak. Bottle format uses full bottle pricing; adding Lagos Rain enters the bag at ₦45,000.
- Gift trio adds three distinct samples, ₦9,000 before delivery. Notes toggle reveals the note profile; ingredient guidance remains separate. Escape closes the guide dialog.
- Switcher wraps G→A and A→G. The selected variant remains in the URL. Both campaign assets are embedded in the portable build; no relative image files are required.
- JavaScript syntax checked with `node --check`; no runtime errors captured during the sample flow. Inline HTML preview checked separately.

Limits: browser viewport emulation, not physical-device testing. No screen-reader audit, usability interviews, real catalog, authentication, orders or payments. All monetary values and scent claims are fictional examples. Verdict remains pending user review.


## H — The Feeling Counter (11 October 2026)

User rejected G as too similar to earlier work. H starts with an independent visual system, catalog, cart, modal and sample-flight UI. A–G are retained.

- Desktop 1440/1280, tablet 768, phone 390 and narrow phone 320 inspected or measured; no horizontal overflow. Phone cards change from portrait columns to stacked landscape strips.
- Bright opens two scents. Mix Yuzu, Please., Skin / 01 and Midnight Standard: ₦11,100. A fourth is rejected. Replace Skin / 01 with Afterglow: ₦11,800. Flight transfers once to H bag and clears; FCT illustrative delivery produces ₦16,800. The A–G bag stays independent.
- Nose view reveals the note profile. Full-bottle Skin / 01 is ₦64,000. Detail-to-sample, flight-modal removal, flight-modal add-to-bag, and removal of a bottle were exercised.
- Native dialog receives focus and contains Tab navigation; ArrowRight does not switch variants while the dialog is open; Escape closes it.
- Portable build inspected: all three H image URLs are data URIs and loaded at all measured widths. Builder now resolves literal image paths inside JavaScript as well as HTML.
- No runtime errors captured during the selection/cart flow. Syntax checked with Node. Checkout explicitly stops without creating an order or collecting payment.

Limits remain: no actual users, physical-device tests or formal accessibility audit; fictional catalog/pricing and illustrative delivery only. This is a new proposal awaiting user judgment, not a validated winner.
