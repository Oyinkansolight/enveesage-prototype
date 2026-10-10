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
