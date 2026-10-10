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

Later heuristic adjustment uses occasion as a fallback and gifts as a discovery-set suggestion. This is intentionally simple preference logic, not a validated fragrance predictor.

## Limits

No production WCAG conformance claim. A formal contrast, screen-reader, zoom, focus-obscuration and mobile-device audit remains necessary. No live inventory, courier, payment, product registration, medical recommendation, customer interview or real-order test occurred. Console contained state logs; no uncaught runtime errors were observed in exercised flows. Only the variant URL persists; all other state resets on reload.

## Verdict

All three directions are reviewable. No design winner has been selected. Suggested synthesis (A storefront, B optional guidance, C depth) remains an unvalidated hypothesis.
