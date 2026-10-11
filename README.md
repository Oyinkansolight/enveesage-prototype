# EnveeSage — throwaway design exploration

Nigeria-first curated perfume and sample retailer. Eight directions (A–F, Astra’s Scent Wardrobe G, and the independent Feeling Counter H) answer: **Which shopping/discovery structure gives beginners and enthusiasts confidence?**

Run `npm run prototype` from this directory, then visit http://localhost:4173/prototype.html?variant=A . Use the floating bottom arrows, the dropdown in the switcher, or keyboard left/right to switch between A–H.

**Latest direction:** [H — The Feeling Counter](https://oyinkansolight.github.io/enveesage-prototype/?variant=H). All seven earlier directions remain available in the switcher.

## View on any device

- **Send the file:** `npm run build:share` writes `dist/index.html`, one self-contained file (hero image inlined). AirDrop, email or WhatsApp it; it opens in any phone, tablet or desktop browser, offline too (fonts fall back to system fonts without internet).
- **Same Wi-Fi:** `npm run prototype:lan` prints a `http://<your-mac-ip>:4173/...` URL any device on the network can open.
- **Public link:** https://oyinkansolight.github.io/enveesage-prototype/?variant=A (GitHub Pages, serving this branch). After changes, run `npm run build:share`, commit, and push to update it. No dependency install; Python 3 and npm are sufficient.

- A — Editorial boutique: photography, a curated edit, then sample education.
- B — Guided studio: a three-question finder, then paths for newcomers, gifts and enthusiasts.
- C — Scent library: searchable/filterable catalog, saved discoveries and profile comparison.

Round two (added without changing A–C):

- D — Scent swipe: one full-bleed card at a time; drag or tap keep/skip; keeps fill a five-vial sample box.
- E — Concierge chat: WhatsApp-style scripted assistant (understands e.g. “oud under 100k”, “owambe”, “delivery to Abuja”), inline product cards, and a visible “what Sage knows” panel you can edit.
- F — Scent map: tap a fresh↔warm / soft↔bold map (or use sliders) to drop a pin; scents rank by closeness, with family filters.

G — The Scent Wardrobe: campaign-led storefront with occasion edits, sample/bottle switching, optional note detail, search and bottle budget filters, saved scents, a personal 1–3 sample edit, and a gift trio. Uses the full six-scent concept catalog.

Round two adds three fictional scents (Lagos Rain, Oud Majlis, Velvet Hibiscus) used by D–G; A–C still show the original three.

Scents, prices, delivery estimates, stock and recommendations are fictional. No live payment, accounts or external mutations. State is in memory and resets on reload; only the selected variant is in the URL. No final design is selected. Do not merge prototype code into production.

H — The Feeling Counter: independent interface and six new fictional scents. Three photographic feeling cards open pairs of scents, with plain-language and note-profile views. Pick a 1–3 sample tasting flight, review it on a yellow receipt, or open full-bottle details. Uses its own bag and native dialogs; no A–G storefront components.

## Art direction

A: warm photographic magazine, serif hierarchy, generous space. Hero → edit → sampling.
B: approachable peach studio with one question at a time. Intro → finder → discovery paths → edit.
C: evergreen catalog workspace, compact sidebar, information-rich rows. Search → filters → profiles → comparison.
D: aubergine night, coral accents, mobile-first card deck. Instinct → keep/skip → sample box.
E: deep-green messaging app on cream. Conversation → suggestions → transparent profile → human hand-off.
F: off-white with a mint-to-amber gradient map. Pin → ranked closeness → sample.

G: warm ivory, ink and oxblood; large serif wordmark over original campaign photography. Campaign → occasion edit → sample ritual → fragrance guides. The question: can a visually distinctive storefront make sampling feel like a natural part of shopping? User feedback: too close to the earlier storefront; retained for comparison.

H: cobalt grotesk typography, acid-yellow sample receipt and three newly generated ingredient photographs. A working counter: choose a feeling → reveal a pair → pull samples into a flight. Staggered card entrance, image hover and contracting cards keep the interaction tactile.

Entrance fade, product hover lift and drawer transition. Reduced motion is supported. Controls have visible focus; dialogs contain keyboard focus and close on Escape. These are prototype affordances, not a production accessibility certification.

## Research & decision

See `docs/research/fragrance-standards.md` for cited primary-source standards, `docs/product-brief.md` for scope/launch gates and `docs/validation.md` for the browser checks.

Prototype source captured on `prototype/enveesage-directions`. Verdict: **pending user review**. Choose or combine directions, capture the rationale here, then rewrite production code in the implementation repository. No existing issue was supplied to attach a pointer to.

Fonts: Google Fonts DM Sans / DM Serif Display, with local system fallbacks.

Hero: AI-generated unbranded mood photography, not an actual stocked fragrance. Stored locally in `assets/editorial-hero.jpg`. Product bottle illustrations and all SKU details are concept placeholders.

Additional campaign asset: `assets/wardrobe-campaign.jpg`, AI-generated unbranded concept photography for G. Both campaign images are embedded by `build:share`; the offline bundle is about 1.1 MB.

H campaign images: `assets/counter-bright.jpg`, `counter-close.jpg` and `counter-deep.jpg`. All five local images, including JavaScript catalog references, are embedded in the portable build (about 1.8 MB). H remains a throwaway concept; its scent names and specifications are invented.
