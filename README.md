# EnveeSage — throwaway design exploration

Nigeria-first curated perfume and sample retailer. Nine directions (A–H preserved, plus the walkable Fragrance Rooms I) answer: **Which shopping/discovery structure gives beginners and enthusiasts confidence?**

Run `npm run prototype` from this directory, then visit http://localhost:4173/prototype.html?variant=A . Use the floating bottom arrows, the dropdown in the switcher, or keyboard left/right to switch between A–I. I opens its own full-screen gallery; its switcher returns to any earlier direction.

**Latest direction:** [I — The Fragrance Rooms](https://oyinkansolight.github.io/enveesage-prototype/gallery.html?variant=I). [Browse without 3D](https://oyinkansolight.github.io/enveesage-prototype/gallery.html?variant=I&mode=list). A–H remain available in the switcher.

## View on any device

- **Send the file:** `npm run build:share` writes `dist/index.html`, one self-contained file (hero image inlined). AirDrop, email or WhatsApp it; it opens in any phone, tablet or desktop browser, offline too (fonts fall back to system fonts without internet).
- **Same Wi-Fi:** `npm run prototype:lan` prints a `http://<your-mac-ip>:4173/...` URL any device on the network can open.
- **Public link:** https://oyinkansolight.github.io/enveesage-prototype/?variant=A (GitHub Pages, serving this branch). After changes, run `npm run build:all`, commit, and push to update it. Python 3 serves the prototypes. To rebuild the gallery from source, run `npm ci` once, then `npm run build:all`. The generated HTML files need no dependency install to view.

- A — Editorial boutique: photography, a curated edit, then sample education.
- B — Guided studio: a three-question finder, then paths for newcomers, gifts and enthusiasts.
- C — Scent library: searchable/filterable catalog, saved discoveries and profile comparison.

Round two (added without changing A–C):

- D — Scent swipe: one full-bleed card at a time; drag or tap keep/skip; keeps fill a five-vial sample box.
- E — Concierge chat: WhatsApp-style scripted assistant (understands e.g. “oud under 100k”, “owambe”, “delivery to Abuja”), inline product cards, and a visible “what Sage knows” panel you can edit.
- F — Scent map: tap a fresh↔warm / soft↔bold map (or use sliders) to drop a pin; scents rank by closeness, with family filters.

G — The Scent Wardrobe: campaign-led storefront with occasion edits, sample/bottle switching, optional note detail, search and bottle budget filters, saved scents, a personal 1–3 sample edit, and a gift trio. Uses the full six-scent concept catalog.

Round two adds three fictional scents (Lagos Rain, Oud Majlis, Velvet Hibiscus) used by D–G; A–C still show the original three.

Scents, prices, delivery estimates, stock and recommendations are fictional. No live payment, accounts or external mutations. State is in memory and resets on reload; the selected variant is in the URL (I also stores its mode and room). No final design is selected. Do not merge prototype code into production.

H — The Feeling Counter: independent interface and six new fictional scents. Three photographic feeling cards open pairs of scents, with plain-language and note-profile views. Pick a 1–3 sample tasting flight, review it on a yellow receipt, or open full-bottle details. Uses its own bag and native dialogs; no A–G storefront components.

I — The Fragrance Rooms: an actual Three.js gallery with an Atrium and three connected rooms (Greenhouse, Silk, Amber), shelves and clickable perfume bottles. Room tabs, a room map, mouse/touch look, keyboard walking and on-screen movement complement a full non-3D catalog. Both modes share the selected room, six scents and one bag. Cmax contributed the procedural scene; Astra built the surrounding interface and integration.

### Gallery development and sharing

- Source: `gallery/app.js`, `gallery/catalog.js`, `gallery/scene.js`, `gallery/styles.css`, `gallery/shell.html`.
- Build: `npm run build:gallery` emits both `gallery.html` and `dist/gallery.html`, each self-contained with Three.js, procedural geometry and generated labels; no runtime CDN or remote models.
- View locally: `npm run prototype`, then `http://localhost:4173/gallery.html?variant=I`.
- Share the generated `gallery.html` file for the gallery, or `dist/index.html` for A–H. To navigate between all versions offline, keep both files together (use the `dist` directory).
- `?mode=list` opens the entire catalog without initializing WebGL. Reduced-motion preferences start in this mode by default; opting into 3D preserves reduced camera travel.
- `?webgl=off` is an explicit fallback-validation URL parameter.
- No actual orders or payments. Camera position and bag are in memory. Mode and room are shareable URL values.

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

I standards and intent: `docs/research/fragrance-rooms-design.md`. The Apple-level brief is a quality goal; this prototype has no Apple affiliation or accessibility certification.
