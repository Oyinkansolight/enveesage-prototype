# EnveeSage I — fragrance rooms design notes

11 October 2026. User requested another prototype using Three.js or similar, with walkable fragrance rooms, shelves, easy navigation and a complete option without 3D. User authorized Cmax delegation. “Apple Inc standard” is interpreted as an aspirational quality target, not a certification or claim of affiliation.

## Experience contract

- The Atrium connects the Greenhouse, Silk Room and Amber Room. Six fictional catalog scents are shared by both modes.
- Direct room buttons and a room map complement pointer/keyboard/on-screen movement. Bottle selection and the equivalent named product controls open the same details.
- A persistent “Browse without 3D” control replaces the canvas with a searchable, room-filtered catalog. Selected room and bag carry between modes.
- Reduced-motion users start in the catalog. If they opt into 3D, room travel uses instant changes. No autoplay tour, camera bobbing or involuntary orbit.
- WebGL failure routes to the catalog. No product or purchase control requires interacting with the canvas.
- Use native modal dialogs, keyboard focus containment, focus outlines, named movement controls and approximately 44 px mobile touch targets. Viewport checks do not constitute an accessibility audit.
- Only in-memory prototype commerce. NGN pricing, sample/bottle sizes and clearly illustrative delivery totals. No real transactions.

## Primary references consulted

- [Apple Human Interface Guidelines — Motion](https://developer.apple.com/design/human-interface-guidelines/motion). General motion quality reference. Page requires JavaScript; do not treat it as a completed audit.
- [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Accessibility design target, not certification.
- [Apple Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria). The supporting guidance recommends detecting the system preference rather than requiring an extra setting. This prototype uses `prefers-reduced-motion` plus an explicit motion preference.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Renderer lifecycle and animation-loop reference.
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html). Geometry selection and picking reference.

The installed library versions are pinned in package-lock.json. Three.js and all generated scene geometry, labels and shaders are bundled into a standalone HTML artifact; no runtime CDN is required. The existing regulatory and perfumery research still applies to eventual production launch.
