/*
 * EnveeSage — Prototype I, "The Gallery": the Three.js room scene.
 *
 * Four connected zones (lobby + bright / close / deep) built entirely from procedural
 * geometry, canvas-generated textures and a small generated environment map.
 * No network requests, models or image files.
 *
 * The app shell (UI, list fallback, catalog, build) lives elsewhere and talks to this
 * module only through createGallery(). See gallery/SCENE-NOTES.md.
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ constants */

const TAU = Math.PI * 2;
const EYE = 1.58; // camera height, metres
const BODY_R = 0.34; // walker radius used for wall collisions
const WALL_T = 0.3; // thickness of the walls between lobby and rooms
const DOOR_W = 1.8;
const DOOR_SPRING = 2.0; // height where the doorway arch starts; top = 2.9
const FRAME_W = 0.12; // stone portal frame width
const ROOM_H = 3.8;
const LOBBY_H = 4.4;
const MAX_PIXEL_RATIO = 1.5;
const WALK_SPEED = 1.9; // m/s for held keys
const TURN_SPEED = 1.7; // rad/s for held keys
const STEP_DISTANCE = 0.5; // move() step
const TURN_STEP = Math.PI / 8; // turn() step, 22.5°
const PITCH_LIMIT = 0.6;

const FRAG_ROOMS = ['bright', 'close', 'deep'];
const ZONE_IDS = ['lobby', ...FRAG_ROOMS];
const SIDES = ['n', 'e', 's', 'w'];

// World layout (metres). Y is up; the lobby is the hub, each room hangs off one lobby wall.
const LAYOUT = {
  lobby: { rect: { x0: -4, x1: 4, z0: -4, z1: 4 }, h: LOBBY_H },
  bright: { rect: { x0: -11.3, x1: -4.3, z0: -5.7, z1: 1.3 }, h: ROOM_H, back: 'w', front: 'e' },
  close: { rect: { x0: -3.5, x1: 3.5, z0: -11.3, z1: -4.3 }, h: ROOM_H, back: 'n', front: 's' },
  deep: { rect: { x0: 4.3, x1: 11.3, z0: -5.7, z1: 1.3 }, h: ROOM_H, back: 'e', front: 'w' },
};
// Doorway centres on the lobby face of each lobby wall.
const DOORS = {
  bright: { side: 'w', at: [-4, -2.2] },
  close: { side: 'n', at: [0, -4] },
  deep: { side: 'e', at: [4, -2.2] },
};
const PLINTH = { x: 0, z: 0.2, r: 0.56 };
const LOBBY_POSE = { x: 0, z: 3.2, yaw: 0, pitch: 0.0 };

// Niche geometry on each fragrance room's back wall (wall-local metres).
const NICHE = { w: 1.3, y0: 0.88, spring: 2.42, depth: 0.44, offset: 1.0, shelves: [1.47, 2.05] };
const TESTER = { w: 2.4, h: 0.5, y0: 1.0, depth: 0.26 };

const PALETTE = {
  lobby: { wall: '#f2eee7', trim: '#e4dbcd', ceiling: '#faf7f2', floor: '#ffffff', glow: '#ffecd6', light: '#fff6ec', ink: '#463c33', accent: '#9a8770', niche: '#f7f0e6' },
  bright: { wall: '#d8e0c9', trim: '#c7d1b6', ceiling: '#eff3e8', floor: '#f6f8f1', glow: '#f3f5e2', light: '#f7fbf2', ink: '#38422c', accent: '#74835a', niche: '#eff2e2' },
  close: { wall: '#eedbd3', trim: '#e2cabf', ceiling: '#f9efeb', floor: '#fcf4f0', glow: '#ffdccc', light: '#fff1ec', ink: '#4c342f', accent: '#a46f66', niche: '#f8eae4' },
  deep: { wall: '#cfa678', trim: '#bf956a', ceiling: '#e3cba8', floor: '#ecdcc4', glow: '#ffbf78', light: '#ffd9a8', ink: '#33220f', accent: '#87531f', niche: '#f2dcbc' },
};

const ROOM_FALLBACK = {
  lobby: { name: 'Lobby', subtitle: 'Choose a room' },
  bright: { name: 'Bright', subtitle: 'Citrus · green' },
  close: { name: 'Close', subtitle: 'Floral · musk' },
  deep: { name: 'Deep', subtitle: 'Woods · amber' },
};

// Bottle language per room: [first product, second product].
const BOTTLE_STYLES = {
  bright: [{ shape: 'tall', cap: 'steel', capShape: 'cyl' }, { shape: 'slab', cap: 'ceramic', capShape: 'cube' }],
  close: [{ shape: 'round', cap: 'ceramic', capShape: 'dome' }, { shape: 'slab', cap: 'brass', capShape: 'cyl' }],
  deep: [{ shape: 'slab', cap: 'wood', capShape: 'cube' }, { shape: 'round', cap: 'brass', capShape: 'cyl' }],
};
const BOTTLE_SHAPES = ['slab', 'round', 'tall'];
const FALLBACK_LIQUID = { bright: '#d9d27a', close: '#e9a9a3', deep: '#b8743a' };

const SERIF = '"DM Serif Display", "Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
const SANS = '"DM Sans", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

/* ------------------------------------------------------------------ small utilities */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  if (a === b) return x >= b ? 1 : 0;
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapAngle = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;
// Camera convention: yaw 0 looks toward -Z, positive yaw turns left.
const yawFromDir = (dx, dz) => Math.atan2(-dx, -dz);
const v2 = (x, y) => new THREE.Vector2(x, y);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isColorString(value) {
  return typeof value === 'string' && /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(value.trim());
}

function liquidFrom(hex, fallback) {
  const c = new THREE.Color(isColorString(hex) ? hex.trim() : fallback);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, clamp(hsl.s * 1.25 + 0.12, 0.15, 0.8), clamp(hsl.l * 0.8, 0.28, 0.66));
  return c;
}

function formatNaira(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `₦${Math.round(value).toLocaleString('en-NG')}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fontsReady() {
  try {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    await Promise.race([
      Promise.all([
        document.fonts.load('64px "DM Serif Display"'),
        document.fonts.load('500 24px "DM Sans"'),
        document.fonts.load('700 24px "DM Sans"'),
      ]),
      wait(1200),
    ]);
  } catch {
    /* system fonts are fine */
  }
}

/* ------------------------------------------------------------------ outlines */

// Open arch outline: left foot → up → over the semicircle → right foot.
function archOutline(cx, y0, w, spring, seg = 28) {
  const r = w / 2;
  const pts = [v2(cx - r, y0), v2(cx - r, spring)];
  for (let i = 1; i < seg; i += 1) {
    const a = Math.PI - (i / seg) * Math.PI;
    pts.push(v2(cx + r * Math.cos(a), spring + r * Math.sin(a)));
  }
  pts.push(v2(cx + r, spring), v2(cx + r, y0));
  return pts;
}

// Closed rounded-rect outline, counter-clockwise, starting bottom-left after the corner.
function roundedRectOutline(x0, y0, w, h, r, seg = 8) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= seg; i += 1) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push(v2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
  };
  corner(x0 + w - r, y0 + r, -Math.PI / 2);
  corner(x0 + w - r, y0 + h - r, 0);
  corner(x0 + r, y0 + h - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

/*
 * A "tunnel": the inner surface of a recess, swept from z=0 back to z=-depth along a
 * 2D outline. Normals face toward the outline's interior (where the camera looks in).
 * uv.y follows height so a vertical light gradient can be shared with the back panel.
 */
function tunnelGeometry(points, depth, closed, yMin, yMax) {
  const n = points.length;
  const segs = closed ? n : n - 1;
  let cx = 0;
  let cy = 0;
  points.forEach((p) => {
    cx += p.x;
    cy += p.y;
  });
  cx /= n;
  cy /= n;
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const span = Math.max(1e-6, yMax - yMin);
  for (let i = 0; i < segs; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    let nx = -ey;
    let ny = ex;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (nx * (cx - mx) + ny * (cy - my) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const base = pos.length / 3;
    for (const p of [a, b]) {
      for (const z of [0, -depth]) {
        pos.push(p.x, p.y, z);
        nor.push(nx, ny, 0);
        uv.push(z === 0 ? 0 : 1, (p.y - yMin) / span);
      }
    }
    // vertices: a0, a1(back), b0, b1(back); winding is corrected by fixWinding()
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  fixWinding(g);
  return g;
}

// Flip any triangle whose geometric normal disagrees with its stored vertex normal.
function fixWinding(g) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const index = g.index.array;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(pos, index[i]);
    b.fromBufferAttribute(pos, index[i + 1]);
    c.fromBufferAttribute(pos, index[i + 2]);
    b.sub(a);
    c.sub(a);
    b.cross(c);
    n.fromBufferAttribute(nor, index[i]);
    if (b.dot(n) < 0) {
      const t = index[i + 1];
      index[i + 1] = index[i + 2];
      index[i + 2] = t;
    }
  }
  g.index.needsUpdate = true;
}

function remapUV(g, x0, y0, w, h) {
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) uv.setXY(i, (pos.getX(i) - x0) / w, (pos.getY(i) - y0) / h);
  uv.needsUpdate = true;
}

/* ------------------------------------------------------------------ main factory */

export async function createGallery({
  canvas,
  rooms = [],
  products = [],
  onRoomChange,
  onProductSelect,
  onReady,
  onError,
  onContextLost,
  onContextRestored,
  reducedMotion = false,
  initialRoom = 'lobby',
} = {}) {
  const safe = (fn, label) => (...args) => {
    if (typeof fn !== 'function') return undefined;
    try {
      return fn(...args);
    } catch (err) {
      console.error(`[gallery] ${label} callback threw`, err);
      return undefined;
    }
  };
  const emitError = safe(onError, 'onError');
  const emitRoom = safe(onRoomChange, 'onRoomChange');
  const emitProduct = safe(onProductSelect, 'onProductSelect');
  const emitReady = safe(onReady, 'onReady');

  if (!canvas || typeof canvas.getContext !== 'function') {
    const err = new Error('createGallery: a <canvas> element is required');
    err.code = 'NO_CANVAS';
    emitError(err);
    throw err;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    // The canvas may be reused after a previous dispose(); make GL state match three's cache.
    renderer.resetState();
  } catch (cause) {
    const err = new Error('WebGL is unavailable in this browser', { cause });
    err.code = 'WEBGL_UNAVAILABLE';
    emitError(err);
    throw err;
  }

  /* ---------------- resource tracking */
  const owned = { geometries: new Set(), materials: new Set(), textures: new Set(), targets: new Set() };
  const G = (g) => (owned.geometries.add(g), g);
  const M = (m) => (owned.materials.add(m), m);
  const TX = (t) => (owned.textures.add(t), t);

  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  /* ---------------- state */
  const state = {
    ready: false,
    disposed: false,
    active: true,
    contextLost: false,
    reducedMotion: !!reducedMotion,
    zone: null,
    hovered: null,
    frames: 0,
    renders: 0,
    lastRenderMs: 0,
  };
  const cam = { x: LOBBY_POSE.x, z: LOBBY_POSE.z, yaw: LOBBY_POSE.yaw, pitch: LOBBY_POSE.pitch };
  let needsRender = true;
  let atPose = null; // zone id while resting on a deterministic pose (re-framed on resize)
  let path = null; // active walk transition
  let step = null; // move() step in progress
  let turnLeft = 0; // remaining turn() radians
  const held = new Set();
  const vel = { f: 0, s: 0, t: 0 };

  const roomInfo = {};
  ZONE_IDS.forEach((id) => {
    const r = Array.isArray(rooms) ? rooms.find((x) => x && x.id === id) : null;
    roomInfo[id] = {
      id,
      name: (r && r.name) || ROOM_FALLBACK[id].name,
      subtitle: (r && r.subtitle) || ROOM_FALLBACK[id].subtitle,
      color: r && isColorString(r.color) ? r.color : null,
    };
  });
  const productsByRoom = {};
  FRAG_ROOMS.forEach((id) => {
    productsByRoom[id] = (Array.isArray(products) ? products : []).filter((p) => p && p.room === id && p.id != null).slice(0, 2);
  });

  try {
    await fontsReady();
    if (state.disposed) throw new Error('disposed during setup');

    /* ---------------- renderer */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false; // contact shadows are baked as soft blobs instead
    renderer.setClearColor('#efe8de', 1);
    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#efe8de');
    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 60);
    camera.rotation.order = 'YXZ';

    /* ---------------- generated textures */
    function canvasTexture(w, h, draw, { color = true, repeat = false } = {}) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      draw(g, w, h);
      const t = new THREE.CanvasTexture(c);
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = maxAniso;
      return TX(t);
    }

    function wrappedBlobs(g, S, rand, count, rMin, rMax, colorFn) {
      for (let i = 0; i < count; i += 1) {
        const x = rand() * S;
        const y = rand() * S;
        const r = rMin + rand() * (rMax - rMin);
        const col = colorFn(rand);
        for (const ox of [-S, 0, S]) {
          for (const oy of [-S, 0, S]) {
            const cx = x + ox;
            const cy = y + oy;
            if (cx + r < 0 || cx - r > S || cy + r < 0 || cy - r > S) continue;
            const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
            grd.addColorStop(0, col);
            grd.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); // fade to the same colour, not to black
            g.fillStyle = grd;
            g.fillRect(cx - r, cy - r, r * 2, r * 2);
          }
        }
      }
    }

    function grain(g, S, amount, rand) {
      const img = g.getImageData(0, 0, S, S);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (rand() - 0.5) * amount;
        d[i] = clamp(d[i] + n, 0, 255);
        d[i + 1] = clamp(d[i + 1] + n, 0, 255);
        d[i + 2] = clamp(d[i + 2] + n, 0, 255);
      }
      g.putImageData(img, 0, 0);
    }

    // Pale limestone, 1200×600 running bond; one texture covers 2.4 m × 2.4 m.
    const FLOOR_TILE_M = 2.4;
    const floorTex = canvasTexture(1024, 1024, (g, S) => {
      const rand = rng(11);
      const tw = S / 2;
      const th = S / 4;
      const tones = ['#ece6db', '#e9e2d6', '#eee8de', '#e7e0d3'];
      for (let row = 0; row < 4; row += 1) {
        const off = row % 2 ? tw / 2 : 0;
        for (let col = -1; col < 3; col += 1) {
          g.fillStyle = tones[(((col % 2) + 2) % 2) * 2 + (row % 2)];
          g.fillRect(off + col * tw, row * th, tw, th);
        }
      }
      wrappedBlobs(g, S, rand, 50, 40, 180, (r) => (r() > 0.5 ? 'rgba(255,252,246,0.07)' : 'rgba(176,160,136,0.035)'));
      wrappedBlobs(g, S, rand, 260, 2, 7, (r) => (r() > 0.6 ? 'rgba(150,132,108,0.10)' : 'rgba(255,255,255,0.14)'));
      grain(g, S, 9, rand);
      const grout = (x, y, w, h) => {
        g.fillStyle = 'rgba(176,162,140,0.85)';
        g.fillRect(x, y, w, h);
      };
      const lineW = 3;
      for (let row = 0; row <= 4; row += 1) {
        grout(0, row * th - lineW / 2, S, lineW);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(0, row * th + lineW / 2, S, 1);
      }
      for (let row = 0; row < 4; row += 1) {
        const off = row % 2 ? tw / 2 : 0;
        for (let col = -1; col < 4; col += 1) {
          const x = off + col * tw;
          grout(x - lineW / 2, row * th, lineW, th);
          g.fillStyle = 'rgba(255,255,255,0.3)';
          g.fillRect(x + lineW / 2, row * th, 1, th);
        }
      }
    }, { repeat: true });

    // Soft mottled plaster, near-white so material colour carries the room tint; 3 m tile.
    const plasterTex = canvasTexture(512, 512, (g, S) => {
      const rand = rng(23);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, S, S);
      g.fillStyle = '#f6f3ee';
      g.fillRect(0, 0, S, S);
      wrappedBlobs(g, S, rand, 60, 40, 150, (r) => (r() > 0.5 ? 'rgba(226,218,206,0.05)' : 'rgba(255,255,255,0.12)'));
      wrappedBlobs(g, S, rand, 160, 3, 10, () => 'rgba(214,204,190,0.05)');
      grain(g, S, 5, rand);
    }, { repeat: true });
    plasterTex.repeat.set(1 / 3, 1 / 3);

    const linear = (t) => {
      t.colorSpace = THREE.NoColorSpace;
      return t;
    };
    // Vertical fades. fadeDown: white at the top (v=1); fadeUp: white at the bottom.
    const fadeDown = linear(canvasTexture(8, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.25, '#9a9a9a');
      grd.addColorStop(0.6, '#2c2c2c');
      grd.addColorStop(1, '#000000');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }));
    const fadeUp = canvasTexture(8, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, h, 0, 0);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.3, '#8a8a8a');
      grd.addColorStop(0.7, '#262626');
      grd.addColorStop(1, '#000000');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    });
    const blobTex = linear(canvasTexture(128, 128, (g, S) => {
      const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.35, '#a0a0a0');
      grd.addColorStop(0.7, '#262626');
      grd.addColorStop(1, '#000000');
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
    }));
    // Ceiling cove wash: bright at the edges, falling off toward the centre.
    const ceilingGlowTex = canvasTexture(128, 128, (g, S) => {
      const img = g.createImageData(S, S);
      for (let y = 0; y < S; y += 1) {
        for (let x = 0; x < S; x += 1) {
          const u = (x + 0.5) / S;
          const v = (y + 0.5) / S;
          const d = Math.min(u, 1 - u, v, 1 - v);
          const val = clamp(Math.exp(-d / 0.07) * 0.95 + 0.06, 0, 1) * 255;
          const i = (y * S + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
    // Arched niche: each band is washed from an LED hidden under the shelf above it.
    const nicheTop = NICHE.spring + NICHE.w / 2;
    const nicheGlowTex = canvasTexture(16, 512, (g, w, h) => {
      const span = nicheTop - NICHE.y0;
      const py = (y) => (1 - (y - NICHE.y0) / span) * h;
      g.fillStyle = '#3a3a3a';
      g.fillRect(0, 0, w, h);
      const bands = [
        [NICHE.y0, NICHE.shelves[0], 1],
        [NICHE.shelves[0], NICHE.shelves[1], 1],
        [NICHE.shelves[1], nicheTop, 0.8],
      ];
      for (const [a, b, k] of bands) {
        const grd = g.createLinearGradient(0, py(b), 0, py(a));
        grd.addColorStop(0, `rgba(255,255,255,${k})`);
        grd.addColorStop(0.45, `rgba(200,200,200,${0.7 * k})`);
        grd.addColorStop(1, 'rgba(120,120,120,0.55)');
        g.fillStyle = grd;
        g.fillRect(0, py(b), w, py(a) - py(b));
      }
    });
    const simpleGlowTex = canvasTexture(16, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.5, '#b4b4b4');
      grd.addColorStop(1, '#545454');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    });

    function spaced(g, text, x, y, spacing, align = 'center') {
      const chars = [...String(text)];
      const widths = chars.map((ch) => g.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      const prev = g.textAlign;
      g.textAlign = 'left';
      chars.forEach((ch, i) => {
        g.fillText(ch, cx, y);
        cx += widths[i] + spacing;
      });
      g.textAlign = prev;
    }

    function fitFont(g, text, maxWidth, size, family, weight = '') {
      let s = size;
      do {
        g.font = `${weight} ${s}px ${family}`.trim();
        if (g.measureText(text).width <= maxWidth) break;
        s -= 2;
      } while (s > 10);
      return s;
    }

    function wrapLines(g, text, maxWidth, maxLines) {
      const words = String(text).split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (g.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = w;
        } else line = test;
      }
      if (line) lines.push(line);
      if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s.,;:]+$/, '')}…`;
        return kept;
      }
      return lines;
    }

    function labelTexture(p, roomId, index) {
      return canvasTexture(320, 400, (g, w, h) => {
        g.fillStyle = '#f8f4ec';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(60,48,38,0.35)';
        g.lineWidth = 2;
        g.strokeRect(14, 14, w - 28, h - 28);
        g.fillStyle = PALETTE[roomId].ink;
        g.textBaseline = 'middle';
        g.font = `600 17px ${SANS}`;
        spaced(g, 'ENVEESAGE', w / 2, 52, 5);
        const name = String(p.name || 'Untitled');
        g.font = `52px ${SERIF}`;
        const lines = wrapLines(g, name, w - 64, 3);
        const size = lines.length > 2 ? 40 : 50;
        g.font = `${size}px ${SERIF}`;
        const startY = h / 2 - ((lines.length - 1) * size * 1.05) / 2 - 8;
        lines.forEach((ln, i) => {
          fitFont(g, ln, w - 60, size, SERIF);
          g.textAlign = 'center';
          g.fillText(ln, w / 2, startY + i * size * 1.05);
        });
        g.fillRect(w / 2 - 24, h - 112, 48, 2);
        g.font = `500 15px ${SANS}`;
        spaced(g, 'EAU DE PARFUM', w / 2, h - 82, 4);
        g.font = `500 15px ${SANS}`;
        spaced(g, String(p.code || `No. 0${index + 1}`), w / 2, h - 54, 3);
      });
    }

    function textPanelTexture(w, h, draw) {
      return canvasTexture(w, h, (g) => {
        g.clearRect(0, 0, w, h);
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        draw(g, w, h);
      });
    }

    /* ---------------- environment (generated softbox room, PMREM-filtered) */
    function makeEnvironment() {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = new THREE.Scene();
      const tmp = [];
      const add = (geo, color, k, setup, side = THREE.FrontSide) => {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side });
        const mesh = new THREE.Mesh(geo, mat);
        setup(mesh);
        env.add(mesh);
        tmp.push(geo, mat);
      };
      add(new THREE.BoxGeometry(12, 6, 12), '#c6b7a2', 0.6, (m) => (m.position.y = 1.6), THREE.BackSide);
      add(new THREE.PlaneGeometry(5, 5), '#fff3e2', 3.2, (m) => {
        m.rotation.x = Math.PI / 2;
        m.position.y = 4.5;
      });
      add(new THREE.PlaneGeometry(1.4, 3.6), '#fff8ee', 2.4, (m) => {
        m.rotation.y = -Math.PI / 2;
        m.position.set(5.9, 1.8, 0);
      });
      add(new THREE.PlaneGeometry(1.4, 3.6), '#ffeeda', 1.8, (m) => {
        m.rotation.y = Math.PI / 2;
        m.position.set(-5.9, 1.8, 0);
      });
      add(new THREE.PlaneGeometry(3, 2), '#ffffff', 1.2, (m) => m.position.set(0, 2.2, -5.9));
      const target = pmrem.fromScene(env, 0.02);
      tmp.forEach((x) => x.dispose());
      pmrem.dispose();
      owned.targets.add(target);
      return target.texture;
    }
    const envMap = makeEnvironment();
    scene.environment = envMap;
    scene.environmentIntensity = 0.85;

    /* ---------------- materials */
    const shared = {
      threshold: M(new THREE.MeshStandardMaterial({ color: '#e2d7c6', map: floorTex, roughness: 0.55 })),
      ao: M(new THREE.MeshBasicMaterial({ color: '#3b2c1c', alphaMap: fadeDown, transparent: true, opacity: 0.16, depthWrite: false })),
      blob: M(new THREE.MeshBasicMaterial({ color: '#2a1f15', alphaMap: blobTex, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
      proxy: M(new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })), // raycast-only
      brass: M(new THREE.MeshStandardMaterial({ color: '#cfa96c', metalness: 1, roughness: 0.3, envMap, envMapIntensity: 1.1 })),
      steel: M(new THREE.MeshStandardMaterial({ color: '#d9dcde', metalness: 1, roughness: 0.22, envMap, envMapIntensity: 1.1 })),
      ceramic: M(new THREE.MeshStandardMaterial({ color: '#f3eee6', roughness: 0.42 })),
      wood: M(new THREE.MeshStandardMaterial({ color: '#4a3223', roughness: 0.55 })),
      stone: M(new THREE.MeshStandardMaterial({ color: '#e6dccd', roughness: 0.62 })),
      blotter: M(new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.9 })),
    };
    const zoneMats = {};
    ZONE_IDS.forEach((id) => {
      const p = PALETTE[id];
      zoneMats[id] = {
        wall: M(new THREE.MeshStandardMaterial({ color: p.wall, map: plasterTex, roughness: 0.95 })),
        trim: M(new THREE.MeshStandardMaterial({ color: p.trim, roughness: 0.75 })),
        frame: M(new THREE.MeshStandardMaterial({ color: p.trim, map: plasterTex, roughness: 0.6 })),
        // cove ledge: its underside would read as a dark band, so it carries a little bounce light
        ledge: M(new THREE.MeshStandardMaterial({ color: p.trim, roughness: 0.8, emissive: p.glow, emissiveIntensity: 0.28 })),
        floor: M(new THREE.MeshStandardMaterial({ color: p.floor, map: floorTex, roughness: 0.5 })),
        ceiling: M(new THREE.MeshStandardMaterial({ color: p.ceiling, roughness: 1, emissive: p.glow, emissiveMap: ceilingGlowTex, emissiveIntensity: 0.15 })),
        wash: M(new THREE.MeshBasicMaterial({ color: p.glow, map: fadeUp, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })),
        led: M(new THREE.MeshBasicMaterial({ color: new THREE.Color(p.glow).multiplyScalar(1.6) })),
      };
    });

    const productMats = new Map();
    const glassGeoCache = new Map();
    const nicheMatsByProduct = new Map();

    function productStyle(p, roomId, index) {
      const base = BOTTLE_STYLES[roomId][index % 2];
      const shape = typeof p.bottle === 'string' && BOTTLE_SHAPES.includes(p.bottle) ? p.bottle : base.shape;
      return { ...base, shape };
    }

    function matsForProduct(p, roomId, index) {
      if (productMats.has(p.id)) return productMats.get(p.id);
      const liquid = liquidFrom(p.color, roomInfo[roomId].color || FALLBACK_LIQUID[roomId]);
      const tint = liquid.clone().lerp(new THREE.Color('#ffffff'), 0.86);
      const label = labelTexture(p, roomId, index);
      const paper = new THREE.Color(isColorString(p.color) ? p.color : PALETTE[roomId].niche).lerp(new THREE.Color('#fbf7f0'), 0.35);
      const mats = {
        // Plain alpha-blended glass over an opaque liquid: keeps the scent colour true and
        // avoids the extra transmission render pass.
        glass: M(new THREE.MeshPhysicalMaterial({
          color: tint,
          metalness: 0,
          roughness: 0.06,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          specularIntensity: 1,
          envMap,
          envMapIntensity: 1.1,
        })),
        liquid: M(new THREE.MeshStandardMaterial({ color: liquid, roughness: 0.18, emissive: liquid, emissiveIntensity: 0.12 })),
        label: M(new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 })),
        paper: M(new THREE.MeshStandardMaterial({ color: paper, roughness: 0.85 })),
        style: productStyle(p, roomId, index),
      };
      productMats.set(p.id, mats);
      return mats;
    }

    /* ---------------- bottle geometry */
    function cached(key, make) {
      if (!glassGeoCache.has(key)) glassGeoCache.set(key, G(make()));
      return glassGeoCache.get(key);
    }

    function latheProfile(R, H, shoulder, neckR) {
      const pts = [v2(0, 0), v2(R - 0.01, 0), v2(R - 0.003, 0.003), v2(R, 0.012), v2(R, H - shoulder)];
      for (let i = 1; i <= 8; i += 1) {
        const a = (i / 8) * (Math.PI / 2);
        pts.push(v2(R - shoulder + shoulder * Math.cos(a), H - shoulder + shoulder * Math.sin(a)));
      }
      pts.push(v2(neckR, H), v2(neckR, H + 0.012), v2(0.0001, H + 0.012));
      return pts;
    }

    const BOTTLE_DIMS = {
      slab: { w: 0.14, h: 0.165, d: 0.056 },
      round: { R: 0.066, h: 0.15 },
      tall: { R: 0.043, h: 0.215 },
    };

    function bottleParts(shape) {
      if (shape === 'slab') {
        const { w, h, d } = BOTTLE_DIMS.slab;
        const b = 0.007;
        const glass = cached('slab:glass', () => {
          const s = new THREE.Shape(roundedRectOutline(-w / 2 + b, b, w - 2 * b, h - 2 * b, 0.02, 6));
          const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
          g.translate(0, 0, -(d - 2 * b) / 2);
          return g;
        });
        const liquid = cached('slab:liquid', () => {
          const i = 0.011;
          const s = new THREE.Shape(roundedRectOutline(-w / 2 + i, i, w - 2 * i, h * 0.72 - i, 0.014, 6));
          const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * i, bevelEnabled: false, curveSegments: 6 });
          g.translate(0, 0, -(d - 2 * i) / 2);
          return g;
        });
        const label = cached('slab:label', () => {
          const g = new THREE.PlaneGeometry(w * 0.6, h * 0.44);
          g.translate(0, h * 0.42, d / 2 + 0.0012);
          return g;
        });
        return { glass, liquid, label, top: h, w, d, capR: 0.026 };
      }
      const { R, h } = BOTTLE_DIMS[shape] || BOTTLE_DIMS.round;
      const shoulder = shape === 'round' ? 0.034 : 0.02;
      const glass = cached(`${shape}:glass`, () => new THREE.LatheGeometry(latheProfile(R, h, shoulder, 0.016), 40));
      const liquid = cached(`${shape}:liquid`, () => {
        const i = 0.008;
        const fill = h * 0.7;
        return new THREE.LatheGeometry([v2(0.0001, 0.01), v2(R - i, 0.01), v2(R - i, fill), v2(0.0001, fill)], 32);
      });
      const label = cached(`${shape}:label`, () => {
        const arc = shape === 'round' ? 1.25 : 1.7;
        const g = new THREE.CylinderGeometry(R + 0.0014, R + 0.0014, h * 0.42, 24, 1, true, -arc / 2, arc);
        g.translate(0, h * 0.44, 0);
        return g;
      });
      return { glass, liquid, label, top: h + 0.012, w: 2 * R, d: 2 * R, capR: shape === 'round' ? 0.03 : 0.024 };
    }

    function capGeometry(capShape, r) {
      if (capShape === 'cube') {
        return cached(`cap:cube:${r}`, () => {
          const s = r * 1.8;
          const b = 0.006;
          const shape = new THREE.Shape(roundedRectOutline(-s / 2 + b, b, s - 2 * b, s * 1.05 - 2 * b, 0.008, 4));
          const g = new THREE.ExtrudeGeometry(shape, { depth: s - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
          g.translate(0, 0, -(s - 2 * b) / 2);
          return g;
        });
      }
      if (capShape === 'dome') {
        return cached(`cap:dome:${r}`, () => {
          const pts = [v2(0.0001, 0), v2(r, 0), v2(r, 0.022)];
          for (let i = 1; i <= 10; i += 1) {
            const a = (i / 10) * (Math.PI / 2);
            pts.push(v2(Math.max(0.0001, r * Math.cos(a)), 0.022 + r * 0.95 * Math.sin(a)));
          }
          return new THREE.LatheGeometry(pts, 32);
        });
      }
      return cached(`cap:cyl:${r}`, () => {
        const g = new THREE.CylinderGeometry(r, r, 0.062, 32);
        g.translate(0, 0.031, 0);
        return g;
      });
    }
    const collarGeo = cached('collar', () => {
      const g = new THREE.CylinderGeometry(0.021, 0.021, 0.012, 24);
      g.translate(0, 0.006, 0);
      return g;
    });
    const vialParts = {
      glass: cached('vial:glass', () => new THREE.LatheGeometry(latheProfile(0.017, 0.1, 0.006, 0.01), 20)),
      liquid: cached('vial:liquid', () => new THREE.LatheGeometry([v2(0.0001, 0.006), v2(0.013, 0.006), v2(0.013, 0.068), v2(0.0001, 0.068)], 16)),
      cap: cached('vial:cap', () => {
        const g = new THREE.CylinderGeometry(0.0175, 0.0175, 0.034, 20);
        g.translate(0, 0.112 + 0.017, 0);
        return g;
      }),
    };
    const unitBox = cached('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
    const unitPlaneXZ = cached('unitPlaneXZ', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

    function capMaterial(style) {
      return shared[style.cap] || shared.brass;
    }
    function collarMaterial(style, roomId) {
      if (style.cap === 'steel' || style.cap === 'brass') return shared[style.cap];
      return roomId === 'bright' ? shared.steel : shared.brass;
    }

    function mesh(geo, mat, parent, opts = {}) {
      const m = new THREE.Mesh(geo, mat);
      if (opts.order != null) m.renderOrder = opts.order;
      if (parent) parent.add(m);
      return m;
    }

    function makeFlacon(p, roomId, index, scale = 1) {
      const mats = matsForProduct(p, roomId, index);
      const parts = bottleParts(mats.style.shape);
      const g = new THREE.Group();
      mesh(parts.liquid, mats.liquid, g);
      mesh(parts.glass, mats.glass, g);
      mesh(parts.label, mats.label, g);
      const collar = mesh(collarGeo, collarMaterial(mats.style, roomId), g);
      collar.position.y = parts.top - 0.004;
      const cap = mesh(capGeometry(mats.style.capShape, parts.capR), capMaterial(mats.style), g);
      cap.position.y = parts.top + 0.006;
      g.scale.setScalar(scale);
      const capH = mats.style.capShape === 'dome' ? 0.055 : mats.style.capShape === 'cube' ? parts.capR * 1.9 : 0.062;
      return { group: g, w: parts.w * scale, d: parts.d * scale, h: (parts.top + 0.006 + capH) * scale };
    }

    function makeVial(p, roomId, index, scale = 1) {
      const mats = matsForProduct(p, roomId, index);
      const g = new THREE.Group();
      mesh(vialParts.liquid, mats.liquid, g);
      mesh(vialParts.glass, mats.glass, g);
      mesh(vialParts.cap, capMaterial(mats.style), g);
      g.scale.setScalar(scale);
      return { group: g, w: 0.036 * scale, d: 0.036 * scale, h: 0.146 * scale };
    }

    function makeCarton(p, roomId, index, scale = 1) {
      const mats = matsForProduct(p, roomId, index);
      const w = 0.12;
      const h = 0.19;
      const d = 0.085;
      const g = new THREE.Group();
      const box = mesh(unitBox, [mats.paper, mats.paper, mats.paper, mats.paper, mats.label, mats.paper], g);
      box.scale.set(w, h, d);
      box.position.y = h / 2;
      g.scale.setScalar(scale);
      return { group: g, w: w * scale, d: d * scale, h: h * scale };
    }

    /* ---------------- pick registries */
    const occluders = [];
    const proxies = [];
    const pickTargets = [];
    const productAnchors = new Map(); // productId -> world-space Vector3 (hero bottle centre)
    const productNiches = new Map(); // productId -> { zone, wall, t }
    const roomItems = { bright: [], close: [], deep: [] }; // bottle groups, culled by line of sight
    const roomSights = { bright: [], close: [], deep: [] }; // world points that represent each room's displays
    function itemsGroup(roomId, wallGroup) {
      const g = new THREE.Group();
      wallGroup.add(g);
      roomItems[roomId].push(g);
      return g;
    }
    const doorPicks = new Map(); // room -> door pick mesh
    const tmpV = new THREE.Vector3();

    // Places an item on a surface; adds a contact shadow and an invisible pick proxy.
    function placeItem(parent, item, x, y, z, productId, rotY = 0) {
      item.group.position.set(x, y, z);
      item.group.rotation.y = rotY;
      parent.add(item.group);
      const blob = mesh(unitPlaneXZ, shared.blob, parent);
      blob.scale.set(item.w * 1.7 + 0.03, 1, item.d * 1.9 + 0.03);
      blob.position.set(x, y + 0.0015, z);
      blob.renderOrder = 1;
      if (productId != null) {
        const proxy = mesh(unitBox, shared.proxy, parent);
        proxy.scale.set(item.w * 1.25 + 0.02, item.h * 1.06, Math.max(item.d * 1.4, 0.08));
        proxy.position.set(x, y + item.h * 0.53, z);
        proxy.userData.pick = { kind: 'product', productId };
        proxies.push(proxy);
      }
      return item;
    }

    /* ---------------- architecture */
    function wallEnds(rect, side) {
      const { x0, x1, z0, z1 } = rect;
      switch (side) {
        case 'n': return [[x0, z0], [x1, z0]];
        case 'e': return [[x1, z0], [x1, z1]];
        case 's': return [[x1, z1], [x0, z1]];
        default: return [[x0, z1], [x0, z0]];
      }
    }

    function wallFrame(zoneId, side) {
      const [from, to] = wallEnds(LAYOUT[zoneId].rect, side);
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const L = Math.hypot(dx, dz);
      const dir = { x: dx / L, z: dz / L };
      const normal = { x: -dir.z, z: dir.x };
      return {
        from, L, dir, normal,
        theta: Math.atan2(-dir.z, dir.x),
        tOf: (x, z) => (x - from[0]) * dir.x + (z - from[1]) * dir.z,
        world: (t, z = 0) => ({ x: from[0] + dir.x * t + normal.x * z, z: from[1] + dir.z * t + normal.z * z }),
      };
    }

    const walls = {}; // `${zone}:${side}` -> frame info
    const zoneGroups = {};

    function buildWall(zoneId, side, { doors = [], niches = [], tester = false }) {
      const f = wallFrame(zoneId, side);
      const H = LAYOUT[zoneId].h;
      const mats = zoneMats[zoneId];
      const group = new THREE.Group();
      group.position.set(f.from[0], 0, f.from[1]);
      group.rotation.y = f.theta;
      zoneGroups[zoneId].add(group);
      const inset = side === 'e' || side === 'w' ? 0.17 : 0; // avoid overlapping trim in corners

      // plaster face (doors cut from the outline, niches as holes)
      const sorted = [...doors].sort((a, b) => a.t - b.t);
      const pts = [v2(0, 0)];
      sorted.forEach((d) => pts.push(...archOutline(d.t, 0, DOOR_W, DOOR_SPRING)));
      pts.push(v2(f.L, 0), v2(f.L, H), v2(0, H));
      const shape = new THREE.Shape(pts);
      niches.forEach((n) => shape.holes.push(new THREE.Path(n.outline)));
      const face = mesh(G(new THREE.ShapeGeometry(shape)), mats.wall, group);
      occluders.push(face);

      // skirting + floor contact shading, interrupted by doors
      const gaps = sorted.map((d) => [d.t - DOOR_W / 2 - FRAME_W - 0.01, d.t + DOOR_W / 2 + FRAME_W + 0.01]);
      const segments = [];
      let cursor = inset ? 0.02 : 0;
      gaps.forEach(([a, b]) => {
        if (a > cursor) segments.push([cursor, a]);
        cursor = b;
      });
      const end = f.L - (inset ? 0.02 : 0);
      if (end > cursor) segments.push([cursor, end]);
      segments.forEach(([a, b]) => {
        const len = b - a;
        const base = mesh(unitBox, mats.trim, group);
        base.scale.set(len, 0.12, 0.018);
        base.position.set((a + b) / 2, 0.06, 0.009);
        const ao = mesh(G(new THREE.PlaneGeometry(len, 0.5).rotateX(-Math.PI / 2)), shared.ao, group);
        ao.position.set((a + b) / 2, 0.003, 0.25);
        ao.renderOrder = 1;
      });

      // cove ledge, the wash it throws up the wall, and a small crown at the ceiling
      const ledge = mesh(unitBox, mats.ledge, group);
      ledge.scale.set(f.L - inset * 2, 0.06, 0.15);
      ledge.position.set(f.L / 2, H - 0.36, 0.075);
      const wash = mesh(G(new THREE.PlaneGeometry(f.L - inset * 2, 0.33)), mats.wash, group);
      wash.position.set(f.L / 2, H - 0.33 + 0.165, 0.002);
      wash.renderOrder = 2;
      const crown = mesh(unitBox, mats.trim, group);
      crown.scale.set(f.L - (inset ? 0.08 : 0), 0.035, 0.04);
      crown.position.set(f.L / 2, H - 0.0175, 0.02);

      sorted.forEach((d) => {
        if (d.frame) buildPortal(zoneId, group, d);
        if (d.sign) buildDoorSign(zoneId, group, d);
      });
      f.group = group;
      walls[`${zoneId}:${side}`] = f;
      return { f, group };
    }

    function buildPortal(zoneId, group, d) {
      const outer = archOutline(d.t, 0, DOOR_W + FRAME_W * 2, DOOR_SPRING);
      const inner = archOutline(d.t, 0, DOOR_W, DOOR_SPRING).reverse();
      const shape = new THREE.Shape([...outer, ...inner]);
      const depth = WALL_T + 0.06;
      const geo = G(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 1 }));
      geo.translate(0, 0, -WALL_T - 0.03);
      const frame = mesh(geo, zoneMats[zoneId].frame, group);
      occluders.push(frame);

      // threshold slab through the wall
      const sill = mesh(G(new THREE.PlaneGeometry(DOOR_W, WALL_T).rotateX(-Math.PI / 2)), shared.threshold, group);
      sill.position.set(d.t, 0.0015, -WALL_T / 2);
      const uv = sill.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * (DOOR_W / FLOOR_TILE_M), uv.getY(i) * (WALL_T / FLOOR_TILE_M));
      occluders.push(sill);
      sill.userData.floor = true;

      // invisible click target filling the opening
      const pick = mesh(G(new THREE.PlaneGeometry(DOOR_W, DOOR_SPRING + DOOR_W / 2)), shared.proxy, group);
      pick.position.set(d.t, (DOOR_SPRING + DOOR_W / 2) / 2, -WALL_T / 2);
      pick.userData.pick = { kind: 'door', room: d.room };
      doorPicks.set(d.room, pick);
    }

    function textMaterial(tex) {
      return M(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false }));
    }

    function buildDoorSign(zoneId, group, d) {
      const lobbySide = zoneId === 'lobby';
      const info = roomInfo[d.room];
      const ink = PALETTE[zoneId].ink;
      const accent = PALETTE[lobbySide ? d.room : zoneId].accent;
      const W = 1024;
      const Hpx = lobbySide ? 300 : 220;
      const tex = textPanelTexture(W, Hpx, (g, w, h) => {
        g.fillStyle = ink;
        if (lobbySide) {
          const idx = FRAG_ROOMS.indexOf(d.room) + 1;
          g.font = `600 26px ${SANS}`;
          g.fillStyle = accent;
          spaced(g, `0${idx}`, w / 2, 36, 6);
          g.fillStyle = ink;
          fitFont(g, info.name, w - 120, 132, SERIF);
          g.fillText(info.name, w / 2, 138);
          g.font = `500 30px ${SANS}`;
          spaced(g, String(info.subtitle).toUpperCase(), w / 2, 248, 7);
        } else {
          g.font = `500 28px ${SANS}`;
          g.fillStyle = accent;
          spaced(g, 'RETURN TO', w / 2, 40, 7);
          g.fillStyle = ink;
          fitFont(g, roomInfo.lobby.name, w - 160, 104, SERIF);
          g.fillText(roomInfo.lobby.name, w / 2, 140);
        }
      });
      const wM = lobbySide ? 1.9 : 1.4;
      const sign = mesh(G(new THREE.PlaneGeometry(wM, (wM * Hpx) / W)), textMaterial(tex), group);
      const top = DOOR_SPRING + DOOR_W / 2 + FRAME_W;
      sign.position.set(d.t, lobbySide ? 3.52 : top + 0.2, 0.004);
      sign.renderOrder = 2;
    }

    // Arched (or rounded) recess with lit interior; returns the wall-local recess group.
    function buildRecess(zoneId, group, { outline, closed, depth, yMin, yMax, glowTex, emissive, emissiveIntensity }) {
      const nicheMat = M(new THREE.MeshStandardMaterial({
        color: PALETTE[zoneId].niche,
        map: plasterTex,
        roughness: 0.92,
        emissive,
        emissiveMap: glowTex,
        emissiveIntensity,
      }));
      const tunnel = mesh(G(tunnelGeometry(outline, depth, closed, yMin, yMax)), nicheMat, group);
      occluders.push(tunnel);
      const back = new THREE.ShapeGeometry(new THREE.Shape(outline));
      let minX = Infinity;
      let maxX = -Infinity;
      outline.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      });
      remapUV(back, minX, yMin, maxX - minX, yMax - yMin);
      const panel = mesh(G(back), nicheMat, group);
      panel.position.z = -depth;
      occluders.push(panel);
      return nicheMat;
    }

    function buildNiche(roomId, group, t, product, index) {
      const { w, y0, spring, depth } = NICHE;
      const outline = archOutline(t, y0, w, spring);
      const glow = new THREE.Color(PALETTE[roomId].glow);
      const nicheMat = buildRecess(roomId, group, {
        outline, closed: false, depth, yMin: y0, yMax: spring + w / 2, glowTex: nicheGlowTex, emissive: glow, emissiveIntensity: 0.42,
      });
      nicheMat.userData.base = 0.42;
      // slim stone surround
      const outer = archOutline(t, y0, w + 0.12, spring);
      const inner = archOutline(t, y0, w, spring).reverse();
      const fGeo = G(new THREE.ExtrudeGeometry(new THREE.Shape([...outer, ...inner]), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 1 }));
      mesh(fGeo, zoneMats[roomId].frame, group);
      // stone sill (forms the niche floor) and shelves with hidden LED lines
      const sill = mesh(unitBox, shared.stone, group);
      sill.scale.set(w + 0.22, 0.06, depth + 0.09);
      sill.position.set(t, y0 - 0.03 + 0.002, -depth / 2 + 0.045);
      occluders.push(sill);
      NICHE.shelves.forEach((y) => {
        const shelf = mesh(unitBox, shared.stone, group);
        shelf.scale.set(w - 0.004, 0.032, depth - 0.03);
        shelf.position.set(t, y - 0.016, -depth / 2 - 0.015);
        occluders.push(shelf);
        const led = mesh(unitBox, zoneMats[roomId].led, group);
        led.scale.set(w - 0.08, 0.006, 0.012);
        led.position.set(t, y - 0.035, -0.06);
      });

      if (product) {
        const shelfItems = itemsGroup(roomId, group);
        const list = nicheMatsByProduct.get(product.id) || [];
        list.push(nicheMat);
        nicheMatsByProduct.set(product.id, list);
        const z = -depth / 2 + 0.01;
        const pid = product.id;
        const sy = y0 + 0.002;
        placeItem(shelfItems, makeFlacon(product, roomId, index, 1.3), t, sy, z - 0.02, pid);
        placeItem(shelfItems, makeCarton(product, roomId, index, 1.1), t - 0.4, sy, z, pid, 0.18);
        placeItem(shelfItems, makeVial(product, roomId, index, 1.25), t + 0.36, sy, z - 0.06, pid);
        placeItem(shelfItems, makeVial(product, roomId, index, 1.25), t + 0.45, sy, z + 0.04, pid);
        placeItem(shelfItems, makeFlacon(product, roomId, index, 0.95), t - 0.26, NICHE.shelves[0], z, pid, -0.12);
        placeItem(shelfItems, makeFlacon(product, roomId, index, 0.95), t + 0.22, NICHE.shelves[0], z, pid, 0.1);
        placeItem(shelfItems, makeFlacon(product, roomId, index, 1.0), t - 0.06, NICHE.shelves[1], z, pid);
        placeItem(shelfItems, makeVial(product, roomId, index, 1.25), t + 0.3, NICHE.shelves[1], z, pid);
        placeItem(shelfItems, makeVial(product, roomId, index, 1.25), t - 0.36, NICHE.shelves[1], z + 0.03, pid);
        productAnchors.set(pid, new THREE.Vector3());
        buildPlaque(roomId, group, t, product);
      }
      return nicheMat;
    }

    function buildPlaque(roomId, group, t, p) {
      const W = 768;
      const Hpx = 240;
      const tex = canvasTexture(W, Hpx, (g, w, h) => {
        g.fillStyle = '#f4eee4';
        g.fillRect(0, 0, w, h);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = PALETTE[roomId].ink;
        fitFont(g, String(p.name || ''), w - 80, 64, SERIF);
        g.fillText(String(p.name || ''), w / 2, 74);
        g.font = `500 25px ${SANS}`;
        const notes = String(p.notes || '').replace(/\s*[·•|]\s*/g, ' · ');
        fitFont(g, notes, w - 80, 26, SANS, '500');
        g.fillText(notes, w / 2, 140);
        const prices = [p.sample != null ? `Sample ${formatNaira(p.sample)}` : '', typeof p.bottle === 'number' ? `Bottle ${formatNaira(p.bottle)}` : ''].filter(Boolean).join('   ·   ');
        g.fillStyle = PALETTE[roomId].accent;
        g.font = `600 22px ${SANS}`;
        if (prices) spaced(g, prices.toUpperCase(), w / 2, 192, 2);
      });
      const mat = M(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
      const plaque = mesh(unitBox, [shared.stone, shared.stone, shared.stone, shared.stone, mat, shared.stone], group);
      plaque.scale.set(0.84, 0.2625, 0.014);
      plaque.position.set(t, 0.56, 0.007);
      plaque.userData.pick = { kind: 'product', productId: p.id };
      proxies.push(plaque);
    }

    function buildTester(roomId, group, t, items) {
      const { w, h, y0, depth } = TESTER;
      const outline = roundedRectOutline(t - w / 2, y0, w, h, h / 2, 10);
      buildRecess(roomId, group, {
        outline, closed: true, depth, yMin: y0, yMax: y0 + h, glowTex: simpleGlowTex, emissive: new THREE.Color(PALETTE[roomId].glow), emissiveIntensity: 0.38,
      });
      const ring = roundedRectOutline(t - w / 2 - 0.05, y0 - 0.05, w + 0.1, h + 0.1, h / 2 + 0.05, 10);
      const hole = new THREE.Path(outline);
      const s = new THREE.Shape(ring);
      s.holes.push(hole);
      mesh(G(new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 1 })), zoneMats[roomId].frame, group);
      const z = -depth / 2;
      const testerItems = itemsGroup(roomId, group);
      items.forEach((p, k) => {
        if (!p) return;
        [-1, 0, 1].forEach((j) => {
          const x = t + (k === 0 ? -1 : 1) * (0.62 + j * 0.17);
          placeItem(testerItems, makeVial(p, roomId, k, 1.3), x, y0 + 0.001, z + (j === 0 ? -0.03 : 0.02), p.id);
        });
      });
      // blotter cup between the two scents
      const cup = mesh(G(new THREE.CylinderGeometry(0.05, 0.045, 0.09, 28)), shared.ceramic, testerItems);
      cup.position.set(t, y0 + 0.045, z);
      for (let i = 0; i < 5; i += 1) {
        const strip = mesh(unitBox, shared.blotter, testerItems);
        strip.scale.set(0.012, 0.16, 0.002);
        strip.position.set(t + (i - 2) * 0.012, y0 + 0.13, z + (i % 2) * 0.01 - 0.005);
        strip.rotation.z = (i - 2) * 0.12;
      }
      placeItem(testerItems, { group: new THREE.Group(), w: 0.1, d: 0.1, h: 0 }, t, y0 + 0.001, z, null);
      // caption
      const tex = textPanelTexture(1024, 128, (g, cw, ch) => {
        g.fillStyle = PALETTE[roomId].ink;
        g.font = `600 30px ${SANS}`;
        spaced(g, 'TESTERS  ·  TRY BOTH ON A BLOTTER', cw / 2, ch / 2, 6);
      });
      const cap = mesh(G(new THREE.PlaneGeometry(1.8, 0.225)), textMaterial(tex), group);
      cap.position.set(t, y0 - 0.2, 0.003);
      cap.renderOrder = 2;
    }

    function buildWallText(zoneId, group, t, y, widthM, heightM, draw) {
      const W = 1024;
      const Hpx = Math.round((W * heightM) / widthM);
      const tex = textPanelTexture(W, Hpx, draw);
      const panel = mesh(G(new THREE.PlaneGeometry(widthM, heightM)), textMaterial(tex), group);
      panel.position.set(t, y, 0.004);
      panel.renderOrder = 2;
      return panel;
    }

    function buildFloorAndCeiling(zoneId) {
      const { rect, h } = LAYOUT[zoneId];
      const w = rect.x1 - rect.x0;
      const d = rect.z1 - rect.z0;
      const cx = (rect.x0 + rect.x1) / 2;
      const cz = (rect.z0 + rect.z1) / 2;
      const floorGeo = G(new THREE.PlaneGeometry(w + 0.02, d + 0.02).rotateX(-Math.PI / 2).translate(cx, 0, cz));
      const pos = floorGeo.attributes.position;
      const uv = floorGeo.attributes.uv;
      for (let i = 0; i < pos.count; i += 1) uv.setXY(i, pos.getX(i) / FLOOR_TILE_M, -pos.getZ(i) / FLOOR_TILE_M);
      const floor = mesh(floorGeo, zoneMats[zoneId].floor, zoneGroups[zoneId]);
      floor.userData.floor = true;
      occluders.push(floor);

      let ceilGeo;
      if (zoneId === 'lobby') {
        const s = new THREE.Shape([v2(rect.x0 - 0.01, rect.z0 - 0.01), v2(rect.x1 + 0.01, rect.z0 - 0.01), v2(rect.x1 + 0.01, rect.z1 + 0.01), v2(rect.x0 - 0.01, rect.z1 + 0.01)]);
        const hole = new THREE.Path();
        hole.absarc(PLINTH.x, PLINTH.z, 1.25, 0, TAU, false);
        s.holes.push(hole);
        ceilGeo = new THREE.ShapeGeometry(s, 48).rotateX(Math.PI / 2);
        const p2 = ceilGeo.attributes.position;
        const uv2 = ceilGeo.attributes.uv;
        for (let i = 0; i < p2.count; i += 1) uv2.setXY(i, (p2.getX(i) - rect.x0) / w, (p2.getZ(i) - rect.z0) / d);
        ceilGeo.translate(0, h, 0);
      } else {
        ceilGeo = new THREE.PlaneGeometry(w + 0.02, d + 0.02).rotateX(Math.PI / 2).translate(cx, h, cz);
      }
      mesh(G(ceilGeo), zoneMats[zoneId].ceiling, zoneGroups[zoneId]);
    }

    function buildLobbyCentre() {
      const g = zoneGroups.lobby;
      const H = LOBBY_H;
      const p = PALETTE.lobby;
      // skylight coffer
      const cofferMat = M(new THREE.MeshStandardMaterial({ color: p.ceiling, roughness: 1, emissive: p.glow, emissiveMap: simpleGlowTex, emissiveIntensity: 0.55, side: THREE.BackSide }));
      const coffer = mesh(G(new THREE.CylinderGeometry(1.25, 1.25, 0.36, 72, 1, true)), cofferMat, g);
      coffer.position.set(PLINTH.x, H + 0.18, PLINTH.z);
      const sky = mesh(G(new THREE.CircleGeometry(1.26, 72).rotateX(Math.PI / 2)), M(new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6ea').multiplyScalar(1.15) })), g);
      sky.position.set(PLINTH.x, H + 0.36, PLINTH.z);
      const ring = mesh(G(new THREE.TorusGeometry(1.27, 0.028, 10, 96).rotateX(Math.PI / 2)), zoneMats.lobby.trim, g);
      ring.position.set(PLINTH.x, H - 0.012, PLINTH.z);

      // floor inlay ring
      const inlay = mesh(G(new THREE.RingGeometry(1.18, 1.26, 96).rotateX(-Math.PI / 2)), M(new THREE.MeshStandardMaterial({ color: '#cdbfa9', roughness: 0.45 })), g);
      inlay.position.set(PLINTH.x, 0.0012, PLINTH.z);

      // plinth: shadow-gap base, drum, top slab
      const plinth = new THREE.Group();
      plinth.position.set(PLINTH.x, 0, PLINTH.z);
      g.add(plinth);
      const gap = mesh(G(new THREE.CylinderGeometry(PLINTH.r - 0.05, PLINTH.r - 0.05, 0.05, 64)), M(new THREE.MeshStandardMaterial({ color: '#8e8172', roughness: 0.9 })), plinth);
      gap.position.y = 0.025;
      const drum = mesh(G(new THREE.CylinderGeometry(PLINTH.r - 0.02, PLINTH.r - 0.02, 0.86, 72)), shared.stone, plinth);
      drum.position.y = 0.05 + 0.43;
      const top = mesh(G(new THREE.CylinderGeometry(PLINTH.r + 0.02, PLINTH.r + 0.02, 0.05, 72)), M(new THREE.MeshStandardMaterial({ color: '#efe7da', roughness: 0.35, map: plasterTex })), plinth);
      top.position.y = 0.91 + 0.025;
      occluders.push(drum, top);
      const shadow = mesh(unitPlaneXZ, shared.blob, plinth);
      shadow.scale.set(2.1, 1, 2.1);
      shadow.position.y = 0.002;

      // house bottle (decorative, not a product)
      const house = { id: '__house', name: roomInfo.lobby.name === 'Lobby' ? 'The Gallery' : roomInfo.lobby.name, notes: '', color: '#d7a259', code: 'EnveeSage' };
      const hb = makeFlacon(house, 'deep', 1, 2.3);
      placeItem(plinth, hb, -0.06, 0.96, 0, null, 0);
      const sphere = mesh(G(new THREE.SphereGeometry(0.075, 40, 24)), shared.stone, plinth);
      sphere.position.set(0.3, 0.96 + 0.075, 0.12);
      const sb = mesh(unitPlaneXZ, shared.blob, plinth);
      sb.scale.set(0.24, 1, 0.24);
      sb.position.set(0.3, 0.9615, 0.12);
    }

    /* ---------------- assemble zones */
    ZONE_IDS.forEach((id) => {
      const g = new THREE.Group();
      g.name = id;
      zoneGroups[id] = g;
      scene.add(g);
      buildFloorAndCeiling(id);
    });

    // lobby walls
    const lobbyDoorsBySide = { n: [], e: [], s: [], w: [] };
    FRAG_ROOMS.forEach((room) => {
      const d = DOORS[room];
      const f = wallFrame('lobby', d.side);
      lobbyDoorsBySide[d.side].push({ t: f.tOf(d.at[0], d.at[1]), room, frame: true, sign: true });
    });
    SIDES.forEach((side) => buildWall('lobby', side, { doors: lobbyDoorsBySide[side] }));

    // lobby wall graphics
    {
      const s = walls['lobby:s'];
      const sg = s.group;
      const ink = PALETTE.lobby.ink;
      buildWallText('lobby', sg, s.L / 2, 2.25, 3.4, 1.36, (g, w, h) => {
        g.fillStyle = PALETTE.lobby.accent;
        g.font = `600 24px ${SANS}`;
        spaced(g, 'PROTOTYPE I  ·  NIGERIA', w / 2, 40, 8);
        g.fillStyle = ink;
        g.font = `150px ${SERIF}`;
        g.fillText('EnveeSage', w / 2, 158);
        g.font = `500 30px ${SANS}`;
        spaced(g, 'THE GALLERY', w / 2, 272, 12);
        g.fillStyle = PALETTE.lobby.accent;
        g.fillRect(w / 2 - 40, 318, 80, 2);
        g.fillStyle = ink;
        g.font = `30px ${SERIF}`;
        g.fillText(FRAG_ROOMS.map((r) => roomInfo[r].name).join('   ·   '), w / 2, 368);
      });

      // floor plan (east wall, south half) and how-to (west wall, south half)
      const e = walls['lobby:e'];
      const eg = e.group;
      buildWallText('lobby', eg, e.tOf(4, 1.9), 1.75, 1.3, 1.3, (g, w, h) => drawPlan(g, w, h));
      const wl = walls['lobby:w'];
      const wg = wl.group;
      buildWallText('lobby', wg, wl.tOf(-4, 1.9), 1.75, 1.5, 1.0, (g, w, h) => {
        g.fillStyle = PALETTE.lobby.accent;
        g.font = `600 24px ${SANS}`;
        spaced(g, 'HOW TO VISIT', w / 2, 70, 8);
        g.fillStyle = ink;
        const lines = ['Drag to look around.', 'Walk with W A S D or the arrow keys.', 'Tap a doorway to walk through it.', 'Tap any bottle to meet the scent.'];
        g.font = `40px ${SERIF}`;
        lines.forEach((ln, i) => {
          fitFont(g, ln, w - 90, 40, SERIF);
          g.fillText(ln, w / 2, 170 + i * 118);
        });
      });
    }

    function drawPlan(g, w, h) {
      const ink = PALETTE.lobby.ink;
      g.fillStyle = PALETTE.lobby.accent;
      g.font = `600 24px ${SANS}`;
      spaced(g, 'THE ROOMS', w / 2, 56, 8);
      // map world x[-11.3, 11.3], z[-11.3, 4] into the panel
      const pad = 70;
      const x0 = -11.6;
      const x1 = 11.6;
      const z0 = -11.6;
      const z1 = 4.3;
      const sc = Math.min((w - pad * 2) / (x1 - x0), (h - 150 - pad) / (z1 - z0));
      const ox = w / 2 - ((x0 + x1) / 2) * sc;
      const oz = 110 + (h - 150 - pad) / 2 - ((z0 + z1) / 2) * sc;
      const P = (x, z) => [ox + x * sc, oz + z * sc];
      ZONE_IDS.forEach((id) => {
        const r = LAYOUT[id].rect;
        const [ax, az] = P(r.x0, r.z0);
        const [bx, bz] = P(r.x1, r.z1);
        g.fillStyle = id === 'lobby' ? 'rgba(255,255,255,0.35)' : PALETTE[id].wall;
        g.fillRect(ax, az, bx - ax, bz - az);
        g.strokeStyle = ink;
        g.lineWidth = 3;
        g.strokeRect(ax, az, bx - ax, bz - az);
        g.fillStyle = ink;
        g.font = `${id === 'lobby' ? 34 : 38}px ${SERIF}`;
        g.fillText(roomInfo[id].name, (ax + bx) / 2, (az + bz) / 2);
      });
      FRAG_ROOMS.forEach((room) => {
        const d = DOORS[room];
        const horizontal = d.side === 'n';
        const [cx, cz] = P(d.at[0], d.at[1]);
        g.fillStyle = '#f4eee4';
        if (horizontal) g.fillRect(cx - (DOOR_W / 2) * sc, cz - (WALL_T + 0.1) * sc - 3, DOOR_W * sc, (WALL_T + 0.2) * sc + 6);
        else {
          const off = d.side === 'w' ? -(WALL_T + 0.1) * sc - 3 : -0.1 * sc - 3;
          g.fillRect(cx + off, cz - (DOOR_W / 2) * sc, (WALL_T + 0.2) * sc + 6, DOOR_W * sc);
        }
      });
      const [px, pz] = P(LOBBY_POSE.x + 1.2, LOBBY_POSE.z - 0.1);
      g.fillStyle = PALETTE.lobby.accent;
      g.beginPath();
      g.arc(px, pz, 9, 0, TAU);
      g.fill();
      g.font = `500 20px ${SANS}`;
      g.textAlign = 'left';
      g.fillText('you are here', px + 16, pz);
      g.textAlign = 'center';
      g.font = `500 22px ${SANS}`;
      g.fillStyle = ink;
      g.fillText('Each room holds two scents.', w / 2, h - 40);
    }

    // fragrance rooms
    FRAG_ROOMS.forEach((roomId) => {
      const L = LAYOUT[roomId];
      const backIdx = SIDES.indexOf(L.back);
      const right = SIDES[(backIdx + 1) % 4];
      const left = SIDES[(backIdx + 3) % 4];
      const items = productsByRoom[roomId];
      const lobbyDoor = DOORS[roomId];

      SIDES.forEach((side) => {
        const f = wallFrame(roomId, side);
        if (side === L.front) {
          buildWall(roomId, side, { doors: [{ t: f.tOf(lobbyDoor.at[0], lobbyDoor.at[1]), room: 'lobby', frame: false, sign: true }] });
        } else if (side === L.back) {
          const ts = [f.L / 2 - NICHE.offset, f.L / 2 + NICHE.offset];
          const niches = ts.map((t) => ({ t, outline: archOutline(t, NICHE.y0, NICHE.w, NICHE.spring) }));
          const { group } = buildWall(roomId, side, { niches });
          ts.forEach((t) => roomSights[roomId].push(f.world(t, 0)));
          ts.forEach((t, i) => {
            buildNiche(roomId, group, t, items[i], i);
            if (items[i]) productNiches.set(items[i].id, { zone: roomId, wall: `${roomId}:${side}`, t });
          });
        } else if (side === right) {
          const t = f.L / 2;
          const outline = roundedRectOutline(t - TESTER.w / 2, TESTER.y0, TESTER.w, TESTER.h, TESTER.h / 2, 10);
          const { group } = buildWall(roomId, side, { niches: [{ t, outline }] });
          roomSights[roomId].push(f.world(t, 0));
          buildTester(roomId, group, t, items);
        } else if (side === left) {
          const { group } = buildWall(roomId, side, {});
          const info = roomInfo[roomId];
          const idx = FRAG_ROOMS.indexOf(roomId) + 1;
          buildWallText(roomId, group, f.L / 2, 1.8, 2.5, 1.25, (g, w, h) => {
            const ink = PALETTE[roomId].ink;
            g.fillStyle = PALETTE[roomId].accent;
            g.font = `600 24px ${SANS}`;
            spaced(g, `ROOM 0${idx}  ·  ${String(info.subtitle).toUpperCase()}`, w / 2, 48, 7);
            g.fillStyle = ink;
            fitFont(g, info.name, w - 120, 190, SERIF);
            g.fillText(info.name, w / 2, 190);
            g.fillStyle = PALETTE[roomId].accent;
            g.fillRect(w / 2 - 40, 312, 80, 2);
            g.fillStyle = ink;
            const names = items.map((p) => p.name).filter(Boolean);
            g.font = `40px ${SERIF}`;
            if (names.length) {
              const line = names.join('   ·   ');
              fitFont(g, line, w - 100, 40, SERIF);
              g.fillText(line, w / 2, 380);
            }
            g.font = `500 24px ${SANS}`;
            g.fillText('Tap a bottle to meet the scent.', w / 2, 452);
          });
        }
      });
    });

    buildLobbyCentre();

    /* ---------------- lights: one hemisphere + one point per zone (no shadow maps) */
    const hemi = new THREE.HemisphereLight('#fff6ea', '#d9c9b0', 0.9);
    scene.add(hemi);
    const lights = [hemi];
    ZONE_IDS.forEach((id) => {
      const { h } = LAYOUT[id];
      const light = new THREE.PointLight(PALETTE[id].light, id === 'lobby' ? 16 : id === 'deep' ? 8.5 : 11, 9, 2);
      if (id === 'lobby') light.position.set(PLINTH.x, h - 1.0, PLINTH.z + 0.6);
      else {
        const back = wallFrame(id, LAYOUT[id].back);
        const p = back.world(back.L / 2, 2.3);
        light.position.set(p.x, h - 0.9, p.z);
      }
      scene.add(light);
      lights.push(light);
    });

    pickTargets.push(...occluders, ...proxies, ...doorPicks.values());

    // freeze static transforms
    scene.traverse((o) => {
      o.updateMatrix();
      o.matrixAutoUpdate = false;
    });
    scene.updateMatrixWorld(true);
    // pick/projection anchor: the hero bottle in each product's niche
    productAnchors.forEach((v, id) => {
      const n = productNiches.get(id);
      if (!n) return;
      const f = walls[n.wall];
      const p = f.world(n.t, -NICHE.depth / 2);
      v.set(p.x, NICHE.y0 + 0.16, p.z);
    });

    /* ================================================================ navigation */

    const walkRects = [];
    ZONE_IDS.forEach((id) => {
      const r = LAYOUT[id].rect;
      walkRects.push({ x0: r.x0 + BODY_R, x1: r.x1 - BODY_R, z0: r.z0 + BODY_R, z1: r.z1 - BODY_R });
    });
    const doorGeo = {};
    FRAG_ROOMS.forEach((room) => {
      const d = DOORS[room];
      const f = wallFrame('lobby', d.side);
      const n = f.normal; // into the lobby
      const half = DOOR_W / 2 - BODY_R;
      const a = { x: d.at[0] + n.x * (BODY_R + 0.06), z: d.at[1] + n.z * (BODY_R + 0.06) };
      const b = { x: d.at[0] - n.x * (WALL_T + BODY_R + 0.06), z: d.at[1] - n.z * (WALL_T + BODY_R + 0.06) };
      const across = { x: f.dir.x * half, z: f.dir.z * half };
      walkRects.push({
        x0: Math.min(a.x, b.x) - Math.abs(across.x),
        x1: Math.max(a.x, b.x) + Math.abs(across.x),
        z0: Math.min(a.z, b.z) - Math.abs(across.z),
        z1: Math.max(a.z, b.z) + Math.abs(across.z),
      });
      doorGeo[room] = {
        out: { x: d.at[0] + n.x * 1.0, z: d.at[1] + n.z * 1.0 },
        in: { x: d.at[0] - n.x * (WALL_T + 1.0), z: d.at[1] - n.z * (WALL_T + 1.0) },
        centre: { x: d.at[0] - n.x * (WALL_T / 2), z: d.at[1] - n.z * (WALL_T / 2) },
      };
    });
    const obstacles = [{ x: PLINTH.x, z: PLINTH.z, r: PLINTH.r + 0.04 + BODY_R }];

    const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
    function walkable(x, z) {
      for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r) return false;
      return walkRects.some((r) => inRect(r, x, z));
    }
    function pushOut(x, z) {
      for (const o of obstacles) {
        const dx = x - o.x;
        const dz = z - o.z;
        const d = Math.hypot(dx, dz);
        if (d < o.r) {
          const k = (o.r + 0.001) / (d || 1);
          x = o.x + (d ? dx : 1) * k;
          z = o.z + (d ? dz : 0) * k;
        }
      }
      return [x, z];
    }
    // Moves the camera with wall sliding; returns the distance actually travelled.
    function tryMove(dx, dz) {
      const dist = Math.hypot(dx, dz);
      if (dist < 1e-6) return 0;
      const n = Math.max(1, Math.ceil(dist / 0.08));
      const sx = dx / n;
      const sz = dz / n;
      const sx0 = cam.x;
      const sz0 = cam.z;
      for (let i = 0; i < n; i += 1) {
        let [nx, nz] = pushOut(cam.x + sx, cam.z + sz);
        if (walkable(nx, nz)) {
          cam.x = nx;
          cam.z = nz;
        } else if (walkable(...pushOut(cam.x + sx, cam.z))) {
          [nx, nz] = pushOut(cam.x + sx, cam.z);
          cam.x = nx;
          cam.z = nz;
        } else if (walkable(...pushOut(cam.x, cam.z + sz))) {
          [nx, nz] = pushOut(cam.x, cam.z + sz);
          cam.x = nx;
          cam.z = nz;
        } else break;
      }
      return Math.hypot(cam.x - sx0, cam.z - sz0);
    }
    function zoneAt(x, z) {
      for (const id of ZONE_IDS) if (inRect(LAYOUT[id].rect, x, z)) return id;
      return null;
    }
    function clampToZone(zone, x, z) {
      const r = walkRects[ZONE_IDS.indexOf(zone)];
      let px = clamp(x, r.x0, r.x1);
      let pz = clamp(z, r.z0, r.z1);
      [px, pz] = pushOut(px, pz);
      return { x: px, z: pz };
    }

    /* ---------------- camera framing */
    const fovFor = (aspect) => (aspect >= 1 ? 52 : clamp(52 + (1 - aspect) * 30, 52, 70));
    const hfov = () => 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);

    function poseFor(zone) {
      if (zone === 'lobby') {
        if (camera.aspect >= 0.8) return { ...LOBBY_POSE };
        // portrait: step aside so the plinth doesn't block the view into Close
        const x = 1.15;
        const z = 3.35;
        return { x, z, yaw: yawFromDir(DOORS.close.at[0] - x, DOORS.close.at[1] - z), pitch: 0.02 };
      }
      const back = wallFrame(zone, LAYOUT[zone].back);
      const half = Math.tan(hfov() / 2);
      const depth = LAYOUT[zone].rect;
      const roomDepth = zone === 'close' ? depth.z1 - depth.z0 : depth.x1 - depth.x0;
      const d = clamp(1.75 / Math.max(half, 0.05), 3.7, roomDepth - BODY_R - 0.25);
      const p = back.world(back.L / 2, d);
      return { x: p.x, z: p.z, yaw: yawFromDir(-back.normal.x, -back.normal.z), pitch: Math.atan2(1.8 - EYE, d) * 0.6 };
    }

    function productPose(id) {
      const n = productNiches.get(id);
      if (!n) return null;
      const f = walls[n.wall];
      const d = clamp(1.25 / Math.max(Math.tan(hfov() / 2), 0.05), 1.5, 4.5);
      const p = f.world(n.t, d);
      const c = clampToZone(n.zone, p.x, p.z);
      return { x: c.x, z: c.z, yaw: yawFromDir(-f.normal.x, -f.normal.z), pitch: Math.atan2(1.5 - EYE, d), zone: n.zone };
    }

    function applyCamera() {
      camera.position.set(cam.x, EYE, cam.z);
      camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');
      camera.updateMatrixWorld();
      updateCulling();
      needsRender = true;
    }

    // Does the segment camera→point pass through `room`'s doorway (with a margin)?
    function throughDoor(room, px, pz, margin) {
      const d = DOORS[room];
      const f = walls[`lobby:${d.side}`];
      const cx = d.at[0] - f.normal.x * (WALL_T / 2);
      const cz = d.at[1] - f.normal.z * (WALL_T / 2);
      const na = (cam.x - cx) * f.normal.x + (cam.z - cz) * f.normal.z;
      const nb = (px - cx) * f.normal.x + (pz - cz) * f.normal.z;
      const latCam = (cam.x - cx) * f.dir.x + (cam.z - cz) * f.dir.z;
      if (Math.abs(na) < WALL_T && Math.abs(latCam) < DOOR_W / 2) return true; // standing in the doorway
      if (na * nb >= 0) return false;
      const t = na / (na - nb);
      const lx = cam.x + (px - cam.x) * t;
      const lz = cam.z + (pz - cam.z) * t;
      return Math.abs((lx - cx) * f.dir.x + (lz - cz) * f.dir.z) < DOOR_W / 2 + margin;
    }

    // Portal culling for the bottle displays: a room's items render only from inside it or
    // when one of its displays can be seen through the doorway(s).
    function updateCulling() {
      const here = zoneAt(cam.x, cam.z) || state.zone;
      FRAG_ROOMS.forEach((room) => {
        let visible = here === room;
        if (!visible) {
          visible = roomSights[room].some((p) => throughDoor(room, p.x, p.z, 0.9) && (here === 'lobby' || !here || !doorGeo[here] || throughDoor(here, p.x, p.z, 0.9)));
        }
        roomItems[room].forEach((g) => {
          g.visible = visible;
        });
      });
    }

    function updateZone() {
      const z = zoneAt(cam.x, cam.z);
      if (z && z !== state.zone) {
        state.zone = z;
        emitRoom(z, { ...roomInfo[z] });
      }
    }

    /* ---------------- paths */
    function planPoints(from, fromZone, to, toZone) {
      const pts = [{ x: from.x, z: from.z }];
      if (fromZone !== toZone) {
        if (fromZone !== 'lobby' && doorGeo[fromZone]) pts.push(doorGeo[fromZone].in, doorGeo[fromZone].out);
        if (toZone !== 'lobby' && doorGeo[toZone]) pts.push(doorGeo[toZone].out, doorGeo[toZone].in);
      }
      pts.push({ x: to.x, z: to.z });
      // drop near-duplicates and reversals (e.g. a pose closer to the door than the door waypoint)
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 1; i < pts.length - 1; i += 1) {
          const a = pts[i - 1];
          const b = pts[i];
          const c = pts[i + 1];
          const ab = Math.hypot(b.x - a.x, b.z - a.z);
          const bc = Math.hypot(c.x - b.x, c.z - b.z);
          const dot = ab > 1e-3 && bc > 1e-3 ? ((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z)) / (ab * bc) : 1;
          if (ab < 0.05 || dot < -0.5) {
            pts.splice(i, 1);
            changed = true;
            break;
          }
        }
      }
      // walk around the plinth
      const o = obstacles[0];
      const clear = o.r + 0.3;
      for (let i = 0; i < pts.length - 1; i += 1) {
        const a = pts[i];
        const b = pts[i + 1];
        const abx = b.x - a.x;
        const abz = b.z - a.z;
        const len2 = abx * abx + abz * abz;
        if (len2 < 1e-6) continue;
        const t = clamp(((o.x - a.x) * abx + (o.z - a.z) * abz) / len2, 0, 1);
        const cx = a.x + abx * t;
        const cz = a.z + abz * t;
        const dd = Math.hypot(cx - o.x, cz - o.z);
        if (dd < clear && t > 0 && t < 1) {
          let nx = cx - o.x;
          let nz = cz - o.z;
          if (dd < 1e-3) {
            const len = Math.sqrt(len2);
            nx = -abz / len;
            nz = abx / len;
            if (nx < 0) {
              nx = -nx;
              nz = -nz;
            }
          } else {
            nx /= dd;
            nz /= dd;
          }
          pts.splice(i + 1, 0, { x: o.x + nx * (clear + 0.25), z: o.z + nz * (clear + 0.25) });
          i += 1;
        }
      }
      return pts;
    }

    function filletPath(pts) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length - 1; i += 1) {
        const a = pts[i - 1];
        const p = pts[i];
        const b = pts[i + 1];
        const la = Math.hypot(p.x - a.x, p.z - a.z);
        const lb = Math.hypot(b.x - p.x, b.z - p.z);
        const r = Math.min(0.8, la * 0.45, lb * 0.45);
        if (r < 0.03) {
          out.push(p);
          continue;
        }
        const p1 = { x: p.x + ((a.x - p.x) / la) * r, z: p.z + ((a.z - p.z) / la) * r };
        const p2 = { x: p.x + ((b.x - p.x) / lb) * r, z: p.z + ((b.z - p.z) / lb) * r };
        for (let k = 0; k <= 10; k += 1) {
          const t = k / 10;
          const u = 1 - t;
          out.push({ x: u * u * p1.x + 2 * u * t * p.x + t * t * p2.x, z: u * u * p1.z + 2 * u * t * p.z + t * t * p2.z });
        }
      }
      out.push(pts[pts.length - 1]);
      const cum = [0];
      for (let i = 1; i < out.length; i += 1) cum.push(cum[i - 1] + Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z));
      return { pts: out, cum, total: cum[cum.length - 1] };
    }

    function sampleAt(poly, s) {
      const { pts, cum } = poly;
      if (s <= 0) return pts[0];
      if (s >= poly.total) return pts[pts.length - 1];
      let lo = 0;
      let hi = cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= s) lo = mid;
        else hi = mid;
      }
      const seg = cum[hi] - cum[lo] || 1;
      const t = (s - cum[lo]) / seg;
      return { x: lerp(pts[lo].x, pts[hi].x, t), z: lerp(pts[lo].z, pts[hi].z, t) };
    }

    function finishPath(arrived) {
      if (!path) return;
      const p = path;
      path = null;
      if (arrived) {
        cam.x = p.end.x;
        cam.z = p.end.z;
        cam.yaw = p.end.yaw;
        cam.pitch = p.end.pitch;
        atPose = p.poseZone || null;
        applyCamera();
        updateZone();
      }
      p.resolve(arrived);
    }

    function cancelMotion() {
      if (path) finishPath(false);
      step = null;
      turnLeft = 0;
    }

    // Walks the camera to `end` ({x,z,yaw,pitch}); instant when reduced motion or asked.
    function travelTo(end, endZone, { instant = false, poseZone = null } = {}) {
      cancelMotion();
      const startZone = state.zone || zoneAt(cam.x, cam.z) || 'lobby';
      return new Promise((resolve) => {
        if (instant || state.reducedMotion || !state.active) {
          cam.x = end.x;
          cam.z = end.z;
          cam.yaw = end.yaw;
          cam.pitch = end.pitch;
          atPose = poseZone;
          vel.f = vel.s = vel.t = 0;
          applyCamera();
          updateZone();
          resolve(true);
          return;
        }
        const poly = filletPath(planPoints({ x: cam.x, z: cam.z }, startZone, end, endZone));
        const yawDelta = Math.abs(wrapAngle(end.yaw - cam.yaw));
        const duration = poly.total < 0.05 ? clamp(0.35 + yawDelta * 0.35, 0.35, 0.9) : clamp(poly.total / 2.3 + 0.55, 0.75, 5.5);
        path = { poly, t: 0, duration, start: { yaw: cam.yaw, pitch: cam.pitch }, end, poseZone, resolve };
        atPose = null;
        needsRender = true;
      });
    }

    function updatePath(dt) {
      if (!path) return false;
      path.t += dt;
      const u = clamp(path.t / path.duration, 0, 1);
      const e = easeInOut(u);
      const { poly, start, end } = path;
      const total = poly.total;
      const s = e * total;
      const p = sampleAt(poly, s);
      let yaw;
      let pitch;
      if (total < 1.0) {
        yaw = lerpAngle(start.yaw, end.yaw, e);
        pitch = lerp(start.pitch, end.pitch, e);
      } else {
        const ahead = sampleAt(poly, Math.min(total, s + 1.2));
        const travel = Math.hypot(ahead.x - p.x, ahead.z - p.z) > 0.05 ? yawFromDir(ahead.x - p.x, ahead.z - p.z) : end.yaw;
        const wStart = smoothstep(0, Math.min(0.9, total * 0.3), s);
        const wEnd = smoothstep(total - Math.min(1.8, total * 0.45), total - 0.05, s);
        yaw = lerpAngle(lerpAngle(start.yaw, travel, wStart), end.yaw, wEnd);
        pitch = lerp(lerp(start.pitch, 0, wStart), end.pitch, wEnd);
      }
      cam.x = p.x;
      cam.z = p.z;
      cam.yaw = yaw;
      cam.pitch = pitch;
      if (u >= 1) finishPath(true);
      return true;
    }

    /* ---------------- per-frame update */
    function keyAxes() {
      const has = (...codes) => codes.some((c) => held.has(c));
      return {
        f: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
        s: (has('KeyD') ? 1 : 0) - (has('KeyA') ? 1 : 0),
        t: (has('ArrowLeft', 'KeyQ') ? 1 : 0) - (has('ArrowRight', 'KeyE') ? 1 : 0),
      };
    }

    function update(dt) {
      let moved = false;
      const axes = keyAxes();
      if (axes.f || axes.s || axes.t) {
        if (path) cancelMotion();
        atPose = null;
      }
      const k = state.reducedMotion ? 1 : 1 - Math.exp(-dt * 11);
      vel.f += (axes.f * WALK_SPEED - vel.f) * k;
      vel.s += (axes.s * WALK_SPEED * 0.8 - vel.s) * k;
      vel.t += (axes.t * TURN_SPEED - vel.t) * k;
      if (Math.abs(vel.f) < 0.005 && !axes.f) vel.f = 0;
      if (Math.abs(vel.s) < 0.005 && !axes.s) vel.s = 0;
      if (Math.abs(vel.t) < 0.005 && !axes.t) vel.t = 0;
      if (vel.t) {
        cam.yaw += vel.t * dt;
        moved = true;
      }
      if (vel.f || vel.s) {
        const sin = Math.sin(cam.yaw);
        const cos = Math.cos(cam.yaw);
        const dx = (-sin * vel.f + cos * vel.s) * dt;
        const dz = (-cos * vel.f - sin * vel.s) * dt;
        tryMove(dx, dz);
        moved = true;
      }
      if (step) {
        const want = step.remaining * (1 - Math.exp(-dt * 13));
        const d = Math.max(Math.min(step.remaining, 0.35 * dt), want);
        const got = tryMove(step.dir.x * d, step.dir.z * d);
        step.remaining -= d;
        if (step.remaining < 0.003 || got < d * 0.25) step = null;
        moved = true;
      }
      if (turnLeft) {
        const want = turnLeft * (1 - Math.exp(-dt * 14));
        const d = Math.abs(turnLeft) < 0.002 ? turnLeft : Math.sign(turnLeft) * Math.max(Math.abs(want), Math.min(Math.abs(turnLeft), 0.3 * dt));
        cam.yaw += d;
        turnLeft -= d;
        if (Math.abs(turnLeft) < 0.0005) turnLeft = 0;
        moved = true;
      }
      if (updatePath(dt)) moved = true;
      if (updateHover(dt)) needsRender = true;
      if (moved) {
        cam.yaw = wrapAngle(cam.yaw);
        applyCamera();
        updateZone();
      }
    }

    /* ---------------- hover glow */
    let hoverPending = null;
    function updateHover(dt) {
      let changed = false;
      if (hoverPending && !drag) {
        const hit = pickAt(hoverPending.x, hoverPending.y);
        hoverPending = null;
        const id = hit && hit.kind === 'product' ? hit.productId : null;
        if (id !== state.hovered) {
          state.hovered = id;
          changed = true;
        }
        canvas.style.cursor = hit && (hit.kind === 'product' || hit.kind === 'door') ? 'pointer' : 'grab';
      }
      const k = state.reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
      nicheMatsByProduct.forEach((list, id) => {
        list.forEach((m) => {
          const target = m.userData.base * (id === state.hovered ? 1.75 : 1);
          if (Math.abs(m.emissiveIntensity - target) > 0.002) {
            m.emissiveIntensity += (target - m.emissiveIntensity) * k;
            changed = true;
          } else if (m.emissiveIntensity !== target) {
            m.emissiveIntensity = target;
            changed = true;
          }
        });
      });
      return changed;
    }

    /* ---------------- picking */
    const raycaster = new THREE.Raycaster();
    raycaster.far = 40;
    const ndc = new THREE.Vector2();
    function pickNdc(x, y) {
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      for (const h of hits) {
        const d = h.object.userData;
        if (d.pick) return { ...d.pick, point: h.point, distance: h.distance };
        return { kind: d.floor ? 'floor' : 'solid', point: h.point, distance: h.distance };
      }
      return null;
    }
    function pickAt(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return pickNdc(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    }

    function handleClick(clientX, clientY) {
      const hit = pickAt(clientX, clientY);
      if (!hit) return;
      if (hit.kind === 'product') {
        const p = (products || []).find((x) => x && x.id === hit.productId);
        emitProduct(hit.productId, { room: p ? p.room : null, source: 'pointer' });
      } else if (hit.kind === 'door') {
        const target = state.zone === hit.room ? 'lobby' : hit.room;
        api.goToRoom(target);
      } else if (hit.kind === 'floor' && hit.distance > 0.6) {
        const zone = zoneAt(hit.point.x, hit.point.z) || state.zone;
        if (!zone) return;
        const c = clampToZone(zone, hit.point.x, hit.point.z);
        if (Math.hypot(c.x - cam.x, c.z - cam.z) < 0.3) return;
        const startZone = state.zone || zone;
        const pts = planPoints({ x: cam.x, z: cam.z }, startZone, c, zone);
        const last = pts[pts.length - 2] || { x: cam.x, z: cam.z };
        const yaw = Math.hypot(c.x - last.x, c.z - last.z) > 0.05 ? yawFromDir(c.x - last.x, c.z - last.z) : cam.yaw;
        travelTo({ x: c.x, z: c.z, yaw, pitch: 0 }, zone);
      }
    }

    /* ---------------- input */
    let drag = null;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';

    listen(canvas, 'pointerdown', (e) => {
      if (!state.active || state.disposed) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (drag) return; // ignore second finger
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false, t: performance.now(), type: e.pointerType };
      ensureLoop();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* not fatal */
      }
    });
    listen(canvas, 'pointermove', (e) => {
      if (!state.active) return;
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        drag.x = e.clientX;
        drag.y = e.clientY;
        const threshold = drag.type === 'mouse' ? 5 : 10;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > threshold) {
          drag.moved = true;
          cancelMotion();
          atPose = null;
          canvas.style.cursor = 'grabbing';
        }
        if (drag.moved) {
          const w = canvas.clientWidth || 1;
          const k = hfov() / w;
          cam.yaw = wrapAngle(cam.yaw + dx * k);
          cam.pitch = clamp(cam.pitch + dy * k, -PITCH_LIMIT, PITCH_LIMIT);
          applyCamera();
        }
      } else if (e.pointerType === 'mouse') {
        hoverPending = { x: e.clientX, y: e.clientY };
        ensureLoop();
      }
    });
    const endDrag = (e, cancelled) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasClick = !cancelled && !drag.moved && performance.now() - drag.t < 800;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      drag = null;
      canvas.style.cursor = 'grab';
      if (wasClick && state.active) handleClick(e.clientX, e.clientY);
    };
    listen(canvas, 'pointerup', (e) => endDrag(e, false));
    listen(canvas, 'pointercancel', (e) => endDrag(e, true));
    listen(canvas, 'pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !drag && state.hovered) {
        state.hovered = null;
        needsRender = true;
      }
    });

    const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    listen(canvas, 'keydown', (e) => {
      if (!state.active || e.target !== canvas) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!KEYS.has(e.code)) return;
      e.preventDefault();
      held.add(e.code);
      ensureLoop();
    });
    listen(canvas, 'keyup', (e) => {
      if (KEYS.has(e.code)) held.delete(e.code);
    });
    const clearHeld = () => {
      held.clear();
      vel.f = vel.s = vel.t = 0;
    };
    listen(canvas, 'blur', clearHeld);
    listen(window, 'blur', clearHeld);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) {
        clearHeld();
        stopLoop();
      } else ensureLoop();
    });

    listen(canvas, 'webglcontextlost', (e) => {
      e.preventDefault();
      state.contextLost = true;
      stopLoop();
      clearHeld();
      const err = new Error('The WebGL context was lost');
      err.code = 'WEBGL_CONTEXT_LOST';
      err.recoverable = true;
      if (typeof onContextLost === 'function') safe(onContextLost, 'onContextLost')(err);
      else emitError(err);
    });
    listen(canvas, 'webglcontextrestored', () => {
      state.contextLost = false;
      needsRender = true;
      safe(onContextRestored, 'onContextRestored')();
      ensureLoop();
    });

    /* ---------------- sizing */
    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Hidden catalog-mode canvas has no CSS size. Keep the existing buffer;
      // using canvas.width here would multiply it by DPR on each resize.
      if (!w || !h) return;
      const pr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
      const aspect = w / h;
      const fov = fovFor(aspect);
      if (camera.aspect !== aspect || camera.fov !== fov) {
        camera.aspect = aspect;
        camera.fov = fov;
        camera.updateProjectionMatrix();
        if (atPose && !path) {
          const p = atPose === 'lobby' ? poseFor('lobby') : poseFor(atPose);
          Object.assign(cam, { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch });
          applyCamera();
        }
      }
      needsRender = true;
    }
    let ro = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => {
        resize();
        ensureLoop();
      });
      ro.observe(canvas);
      cleanups.push(() => ro.disconnect());
    }
    listen(window, 'resize', () => {
      resize();
      ensureLoop();
    });

    /* ---------------- loop */
    let raf = 0;
    let last = 0;
    let idleFrames = 0;
    function render() {
      const t0 = performance.now();
      renderer.render(scene, camera);
      state.lastRenderMs = performance.now() - t0;
      state.renders += 1;
      needsRender = false;
    }
    function busy() {
      return !!(path || step || turnLeft || held.size || vel.f || vel.s || vel.t || hoverPending || drag);
    }
    function frame(now) {
      raf = 0;
      if (!state.active || state.disposed || state.contextLost || document.hidden) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      state.frames += 1;
      update(dt);
      if (needsRender) render();
      // keep ticking while anything is in motion; idle a few frames for easing tails, then sleep
      if (busy() || needsRender) idleFrames = 0;
      else idleFrames += 1;
      if (idleFrames < 20) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function ensureLoop() {
      if (raf || !state.active || state.disposed || state.contextLost || document.hidden) return;
      idleFrames = 0;
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }

    /* ================================================================ public API */
    const api = {
      goToRoom(id, { instant = false } = {}) {
        if (state.disposed || !ZONE_IDS.includes(id)) return Promise.resolve(false);
        const pose = poseFor(id);
        const done = travelTo(pose, id, { instant, poseZone: id });
        ensureLoop();
        return done;
      },
      goToProduct(id, { instant = false } = {}) {
        const pose = productPose(id);
        if (state.disposed || !pose) return Promise.resolve(false);
        const done = travelTo(pose, pose.zone, { instant });
        ensureLoop();
        return done;
      },
      move(direction) {
        if (state.disposed || !state.active) return false;
        const sign = { forward: [1, 0], backward: [-1, 0], left: [0, -1], right: [0, 1] }[direction];
        if (!sign) return false;
        if (path) cancelMotion();
        atPose = null;
        const sin = Math.sin(cam.yaw);
        const cos = Math.cos(cam.yaw);
        const dir = { x: -sin * sign[0] + cos * sign[1], z: -cos * sign[0] - sin * sign[1] };
        if (state.reducedMotion) {
          tryMove(dir.x * STEP_DISTANCE, dir.z * STEP_DISTANCE);
          applyCamera();
          updateZone();
        } else if (step && Math.abs(step.dir.x - dir.x) < 1e-6 && Math.abs(step.dir.z - dir.z) < 1e-6) {
          step.remaining = Math.min(step.remaining + STEP_DISTANCE, STEP_DISTANCE * 2);
        } else {
          step = { dir, remaining: STEP_DISTANCE };
        }
        ensureLoop();
        return true;
      },
      turn(direction) {
        if (state.disposed || !state.active) return false;
        const sign = direction === 'left' ? 1 : direction === 'right' ? -1 : 0;
        if (!sign) return false;
        if (path) cancelMotion();
        atPose = null;
        if (state.reducedMotion) {
          cam.yaw = wrapAngle(cam.yaw + sign * TURN_STEP);
          applyCamera();
        } else {
          turnLeft = clamp(turnLeft + sign * TURN_STEP, -TURN_STEP * 2, TURN_STEP * 2);
        }
        ensureLoop();
        return true;
      },
      resetView({ instant = false } = {}) {
        return api.goToRoom(state.zone || 'lobby', { instant });
      },
      setActive(on) {
        on = !!on;
        if (state.disposed || on === state.active) return;
        state.active = on;
        clearHeld();
        drag = null;
        hoverPending = null;
        if (!on) {
          if (path) finishPath(true);
          step = null;
          turnLeft = 0;
          stopLoop();
        } else {
          resize();
          needsRender = true;
          ensureLoop();
        }
      },
      setReducedMotion(on) {
        state.reducedMotion = !!on;
        if (state.reducedMotion) {
          if (path) finishPath(true);
          if (step) {
            tryMove(step.dir.x * step.remaining, step.dir.z * step.remaining);
            step = null;
          }
          if (turnLeft) {
            cam.yaw = wrapAngle(cam.yaw + turnLeft);
            turnLeft = 0;
          }
          applyCamera();
          updateZone();
          ensureLoop();
        }
      },
      getState() {
        const info = renderer.info;
        const size = renderer.getSize(new THREE.Vector2());
        return {
          ready: state.ready,
          active: state.active,
          disposed: state.disposed,
          contextLost: state.contextLost,
          reducedMotion: state.reducedMotion,
          room: state.zone,
          roomName: state.zone ? roomInfo[state.zone].name : null,
          position: { x: +cam.x.toFixed(3), y: EYE, z: +cam.z.toFixed(3) },
          heading: +(((THREE.MathUtils.radToDeg(-cam.yaw) % 360) + 360) % 360).toFixed(1), // compass-style, clockwise from -Z
          yaw: +cam.yaw.toFixed(4),
          pitch: +THREE.MathUtils.radToDeg(cam.pitch).toFixed(1),
          moving: busy(),
          transitioning: !!path,
          atPose,
          hoveredProductId: state.hovered,
          viewport: { width: size.x, height: size.y, pixelRatio: renderer.getPixelRatio(), fov: +camera.fov.toFixed(1), aspect: +camera.aspect.toFixed(3) },
          diagnostics: {
            frames: state.frames,
            renders: state.renders,
            lastRenderMs: +state.lastRenderMs.toFixed(2),
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            programs: info.programs ? info.programs.length : null,
            lights: lights.length,
            shadows: renderer.shadowMap.enabled,
            products: productAnchors.size,
            pickables: pickTargets.length,
          },
        };
      },
      projectProduct(id) {
        const v = productAnchors.get(id);
        if (!v) return null;
        return project(v, (h) => h && h.kind === 'product' && h.productId === id);
      },
      projectRoom(id) {
        let room = id;
        if (id === 'lobby') room = state.zone && state.zone !== 'lobby' ? state.zone : null;
        if (!room || !doorGeo[room]) return null;
        const c = doorGeo[room].centre;
        return project(new THREE.Vector3(c.x, 1.3, c.z), (h) => h && h.kind === 'door' && h.room === room);
      },
      dispose() {
        if (state.disposed) return;
        state.disposed = true;
        stopLoop();
        cancelMotion();
        clearHeld();
        cleanups.splice(0).forEach((fn) => fn());
        canvas.style.cursor = '';
        disposeAll();
      },
    };

    function project(world, matches) {
      const v = world.clone();
      const camSpace = v.clone().applyMatrix4(camera.matrixWorldInverse);
      v.project(camera);
      const r = canvas.getBoundingClientRect();
      const inFront = camSpace.z < 0;
      const onScreen = inFront && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      let visible = false;
      if (onScreen) visible = matches(pickNdc(v.x, v.y));
      const x = ((v.x + 1) / 2) * r.width;
      const y = ((1 - v.y) / 2) * r.height;
      return { x, y, clientX: r.left + x, clientY: r.top + y, onScreen, visible, distance: +camera.position.distanceTo(world).toFixed(3) };
    }

    function disposeAll() {
      scene.traverse((o) => {
        if (o.geometry) owned.geometries.add(o.geometry);
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => owned.materials.add(m));
      });
      owned.materials.forEach((m) => {
        Object.values(m).forEach((val) => {
          if (val && val.isTexture) owned.textures.add(val);
        });
        m.dispose();
      });
      owned.geometries.forEach((g) => g.dispose());
      owned.textures.forEach((t) => t.dispose());
      owned.targets.forEach((t) => t.dispose());
      scene.clear();
      scene.environment = null;
      renderer.resetState(); // leave the shared context clean for a later createGallery()
      renderer.dispose();
    }

    /* ---------------- first frame */
    resize();
    const startZone = ZONE_IDS.includes(initialRoom) ? initialRoom : 'lobby';
    const startPose = poseFor(startZone);
    Object.assign(cam, { x: startPose.x, z: startPose.z, yaw: startPose.yaw, pitch: startPose.pitch });
    atPose = startZone;
    applyCamera();
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      /* falls back to compiling on first render */
    }
    if (state.disposed) throw new Error('disposed during setup');
    render();
    updateZone();
    state.ready = true;
    emitReady(api.getState());
    ensureLoop();
    return api;
  } catch (cause) {
    if (state.disposed && cause && cause.message === 'disposed during setup') throw cause;
    const err = cause instanceof Error ? cause : new Error(String(cause));
    if (!err.code) err.code = 'GALLERY_SETUP_FAILED';
    emitError(err);
    try {
      owned.geometries.forEach((g) => g.dispose());
      owned.materials.forEach((m) => m.dispose());
      owned.textures.forEach((t) => t.dispose());
      owned.targets.forEach((t) => t.dispose());
      cleanups.splice(0).forEach((fn) => fn());
      renderer.dispose();
    } catch {
      /* best effort */
    }
    throw err;
  }
}

export default createGallery;
