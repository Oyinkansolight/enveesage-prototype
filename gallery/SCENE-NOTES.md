# Gallery scene (prototype I): notes for the app shell

`gallery/scene.js` is the only 3D code. It imports `three` (0.186.1) and nothing else. There are no network requests, models or image files: every texture is drawn on a canvas at startup and the reflections come from a small generated PMREM environment.

## Contract

```js
import { createGallery } from './scene.js';
const gallery = await createGallery({
  canvas,                 // <canvas tabindex="0">; the parent sizes it with CSS
  rooms,                  // [{ id: 'lobby'|'bright'|'close'|'deep', name, subtitle, color }]
  products,               // [{ id, room, name, notes, color, sample, bottle, code? }], first 2 per room are shown
  onRoomChange,           // (roomId, { id, name, subtitle, color }), fires only on change; lobby included; also fires once at startup
  onProductSelect,        // (productId, { room, source: 'pointer' })
  onReady,                // (state), after the first frame has rendered
  onError,                // (error), error.code: 'NO_CANVAS' | 'WEBGL_UNAVAILABLE' | 'GALLERY_SETUP_FAILED' | 'WEBGL_CONTEXT_LOST'
  onContextLost,          // optional (error). If given, context loss calls this instead of onError
  onContextRestored,      // optional ()
  reducedMotion = false,
  initialRoom = 'lobby',  // optional
});
```

If setup fails, `onError(err)` is called **and** the promise rejects with the same error. Handle one of them, not both, to avoid two fallback messages. All callbacks are optional and wrapped in try/catch.

| Method | Notes |
| --- | --- |
| `goToRoom(id, { instant })` → `Promise<boolean>` | Animated walk along a planned route (out through the current room's doorway, across the lobby around the plinth, into the target room) to the room's framing pose. Instant when `instant`, reduced motion or inactive. Resolves `false` if interrupted by user input. |
| `goToProduct(id, { instant })` | Walks to stand in front of that product's niche. Optional extra. |
| `move('forward'\|'backward'\|'left'\|'right')` | Eased 0.5 m step relative to the current heading, with wall sliding. Repeated calls queue up to two steps, so calling it every ~150 ms gives a smooth walk. |
| `turn('left'\|'right')` | Eased 22.5° yaw step; up to two steps queue. |
| `resetView({ instant })` | Returns to the current room's framing pose. |
| `setActive(bool)` | `false` stops the render loop and key handling, clears held keys and finishes any walk instantly. `true` resizes and resumes. |
| `setReducedMotion(bool)` | Completes any in-flight motion immediately. |
| `getState()` | `{ ready, active, disposed, contextLost, reducedMotion, room, roomName, position{x,y,z}, heading (compass degrees: 0 = north/−Z, 90 = east), yaw, pitch (degrees), moving, transitioning, atPose, hoveredProductId, viewport{width,height,pixelRatio,fov,aspect}, diagnostics{frames, renders, lastRenderMs, drawCalls, triangles, geometries, textures, programs, lights, shadows, products, pickables} }` |
| `projectProduct(id)` / `projectRoom(id)` | `{ x, y, clientX, clientY, onScreen, visible, distance }` for the hero bottle or the doorway centre. `visible` means a click at `(clientX, clientY)` would hit that target right now. `projectRoom('lobby')` returns the current room's doorway, or `null` when you are already in the lobby. Note: from the lobby, a bottle seen *through* a doorway reports `visible: false`, because clicking there walks you into the room. |
| `dispose()` | Idempotent. Removes all listeners and the ResizeObserver, disposes geometries, materials, textures and the environment target, resets GL state, then disposes the renderer. The same canvas can be passed to a new `createGallery()` (tested). |

## Input behaviour

- **Drag** anywhere on the canvas to look (grab-the-view; mouse, touch and pen through pointer events, no pointer lock). Pitch is clamped to ±34°. The scene sets `canvas.style.touchAction = 'none'` and manages `cursor`.
- **Click or tap** (less than 5 px of mouse movement or 10 px of touch): a bottle, box or plaque calls `onProductSelect`. A doorway walks through it: into that room from the lobby, back to the lobby from inside a room, or across the lobby into the room opposite. The floor walks to that point.
- **Keys**, only while the canvas itself is focused: W/S or ↑/↓ walk; A/D strafe; ←/→ (or Q/E) turn. Keys with ⌘, Ctrl or Alt held are ignored. Handled keys call `preventDefault`. Held keys are cleared on canvas blur, window blur, a hidden tab and `setActive(false)`.
- Hovering a product brightens its niche and switches the cursor to a pointer.
- There is no idle animation: no orbit, drift, head bob or tour. Rendering is on demand, and the rAF loop sleeps about 20 frames after the last change. It pauses while `document.hidden` is true.

## Space

World units are metres and the eye height is 1.58 m.

- **Lobby:** 8 × 8 m, 4.4 m high, warm alabaster. It has a central stone plinth with a decorative house bottle (not a product), a skylight coffer, and a floor-plan panel and a how-to panel on the side walls. The south wall carries the wordmark.
- **Rooms:** each is 7 × 7 m and 3.8 m high, reached through an arched doorway with a stone portal.
  - **Bright** (sage) is to the west.
  - **Close** (rose) is to the north.
  - **Deep** (amber) is to the east.
- **Room contents:**
  - The back wall has two lit arched niches, one per product, each holding 9 objects: flacons, a box and sample vials. A plaque underneath gives the name, notes and prices.
  - The right wall has a lit tester recess with three vials of each scent.
  - The left wall carries the room's wall text.
- **Collision:** walkable space is the room rectangles inset by a 0.34 m body radius, plus the door passages, minus the plinth. Movement slides along walls and nothing clips into walls or bottles.
- **Framing poses:** these are deterministic and depend on aspect ratio. Vertical FOV is 52° on landscape, rising to about 68° on portrait. Room poses back off until both niches fit the width (tested at 1280×760 and 390×844). On portrait the lobby pose steps aside so the plinth doesn't hide the Close doorway. While you are resting on a pose, a resize re-frames it.

## Budget

- Pixel ratio is capped at 1.5, with MSAA on.
- No shadow maps; contact shadows are soft blob decals.
- Lights: one hemisphere light plus one point light per zone (5 in total), each with a limited range.
- Glass is alpha-blended (no transmission pass).
- Bottles in other rooms are portal-culled: they render only when a line of sight through the doorway(s) reaches them.
- Measured at 1280×760: about 150 draw calls and about 20k triangles inside a room; about 300 draw calls and 40k triangles in the lobby. 10–11 shader programs.

## Caveats

- Canvas text uses `"DM Serif Display"` and `"DM Sans"` if those fonts have loaded (it waits up to 1.2 s via `document.fonts`), otherwise system serif and sans fonts. Load the fonts before calling `createGallery()` for the intended look.
- Only the first two products per room are placed. Product `color` drives the liquid, the glass tint and the box. If `bottle` is a string `'slab'|'round'|'tall'`, it overrides that product's flacon shape; a numeric `bottle` is shown as a price.
- Source contains non-ASCII characters (·, ₦, …). esbuild's default `charset=ascii` escapes them in the bundle.
