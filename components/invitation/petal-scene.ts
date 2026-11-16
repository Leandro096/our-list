/**
 * WebGL scene for the falling rose petals of the invitation page.
 *
 * A petal only reads as real when its surface is smoothly curved and lit per pixel, which CSS and
 * SVG cannot do. Here every petal is one tessellated sheet:
 *
 *  - Shape (vertex shader): the sheet is arched along its length like a spoon, cupped across,
 *    rolled back towards the tip, twisted and ruffled at the margin. All of it is driven by a few
 *    per-petal numbers, so no two petals share a silhouette.
 *  - Outline (fragment shader): the obovate contour is an implicit function, so the edge stays
 *    crisp at any size and can be softened by an exact number of pixels for depth of field.
 *  - Light (fragment shader): a thin-leaf model. Direct light with the shadow the margin casts
 *    into the cup, light scattered past the terminator, light transmitted through the tissue when
 *    the petal is backlit (the fleshy base blocks it), a velvet sheen at grazing angles and
 *    a soft bump from dents and the rolled margin.
 *  - Motion (JS): each petal swings like a pendulum while it falls, tilting into the swing and
 *    stalling at the turning points, the way thin plates flutter in air. A few of them tumble.
 *    A slow shared wind moves all of them together.
 *
 * World units are CSS pixels at the focal plane, FOCAL pixels in front of the camera.
 */

const VERTEX_SHADER = /* glsl */ `
attribute vec2 aUv; // x: -1..1 across the petal, y: 0..1 from the base to the tip

uniform mat4 uProj;
uniform mat3 uRot;
uniform vec3 uPos;
uniform vec2 uSize; // x: half width of the sheet, y: length of the sheet
uniform vec2 uBend; // lengthwise tangent angle: (x + y * v) * v
uniform vec2 uCup;  // transverse arc in radians at the edge of the sheet: near the base, at the tip
uniform vec4 uWave; // x: ruffle amplitude, y: ruffle frequency, z: ruffle phase, w: twist

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormal;
varying float vCup;

const int SPINE_STEPS = 8;

// Midrib of the petal: a planar curve of unit length whose tangent turns by uBend.
// Returns (along, up, tangent angle).
vec3 spine(float v) {
  vec2 p = vec2(0.0);
  float ds = v / float(SPINE_STEPS);
  for (int i = 0; i < SPINE_STEPS; i++) {
    float s = (float(i) + 0.5) * ds;
    float psi = (uBend.x + uBend.y * s) * s;
    p += vec2(cos(psi), sin(psi)) * ds;
  }
  return vec3(p, (uBend.x + uBend.y * v) * v);
}

float cupAt(float v) {
  return mix(uCup.x, uCup.y, smoothstep(0.2, 1.0, v));
}

vec3 surface(vec2 uv) {
  float u = uv.x;
  float v = uv.y;
  vec3 sp = spine(v);

  // cross-section: an arc that keeps its length, so cupping never stretches the petal
  float th = u * cupAt(v);
  float sinc = abs(th) < 1e-3 ? 1.0 - th * th / 6.0 : sin(th) / th;
  float cosc = abs(th) < 1e-3 ? th * 0.5 : (1.0 - cos(th)) / th;
  vec2 sec = uSize.x * u * vec2(sinc, cosc);
  sec.y += uSize.x * uWave.x * u * u * sin(uWave.y * v + uWave.z + 1.7 * u);

  float tw = uWave.w * v * v;
  sec = vec2(sec.x * cos(tw) - sec.y * sin(tw), sec.x * sin(tw) + sec.y * cos(tw));

  float c = cos(sp.z);
  float s = sin(sp.z);
  return vec3(sec.x, uSize.y * sp.x - sec.y * s, uSize.y * sp.y + sec.y * c);
}

void main() {
  const float e = 0.01;
  vec3 centre = surface(vec2(0.0, 0.5));
  vec3 p = surface(aUv);
  vec3 du = surface(aUv + vec2(e, 0.0)) - p;
  vec3 dv = surface(aUv + vec2(0.0, e)) - p;

  vec3 world = uRot * (p - centre) + uPos;
  vUv = aUv;
  vPos = world;
  vNormal = uRot * normalize(cross(du, dv));
  vCup = cupAt(aUv.y);
  gl_Position = uProj * vec4(world, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormal;
varying float vCup;

uniform vec3 uColBase;
uniform vec3 uColMid;
uniform vec3 uColEdge;
uniform vec4 uOutline;   // x: body exponent, y: side exponent, z: notch depth, w: skew
uniform float uOutlineK; // normalises the outline so its widest half-width is 1
uniform vec4 uLook;      // x: seed, y: streak frequency, z: edge tint, w: translucency
uniform vec4 uRender;    // x: defocus radius in device px, y: opacity, z: exposure, w: face
uniform float uBump;     // bump height in world units
uniform vec3 uKeyDir;    // key light, view space
uniform vec3 uKeyLocal;  // key light, in the frame of the petal
uniform vec2 uCamera;    // x: haze (aerial perspective) 0..1, y: canvas height in device px

// Part of the sheet the outline occupies; the rest is room for the defocus blur.
const float V0 = 0.08;
const float V1 = 0.92;
const float UMAX = 0.8;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

// Smooth gradient noise, roughly -0.7..0.7. The quintic fade keeps its slope continuous,
// which matters because it is used as a height field for the bump.
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

// Perturbs the normal by a height field without needing tangents (Mikkelsen).
vec3 bumpNormal(vec3 n, float h) {
  vec3 dpx = dFdx(vPos);
  vec3 dpy = dFdy(vPos);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  grad *= min(1.0, 1.2 * abs(det) / (length(grad) + 1e-9));
  return normalize(abs(det) * n - grad);
}

// One light on a thin, scattering sheet. vis is how much of the light reaches the lit face.
vec3 shade(vec3 n, vec3 v, vec3 l, vec3 lc, float vis, vec3 alb, vec3 deep, vec3 trn, float sheenAmt, float specAmt) {
  float ndl = dot(n, l);
  float front = clamp(ndl, 0.0, 1.0);
  // light scattered inside the tissue creeps past the terminator and comes out more saturated
  float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  float back = clamp((-ndl + 0.1) / 1.1, 0.0, 1.0);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float sheen = pow(1.0 - nv, 4.0) * sheenAmt * wrap;
  float spec = pow(clamp(dot(n, normalize(l + v)), 0.0, 1.0), 20.0) * specAmt * front;
  vec3 reflected = alb * front + deep * (wrap - front) * 0.7 + mix(alb, vec3(1.0), 0.2) * sheen + spec;
  return lc * (reflected * vis + trn * back);
}

void main() {
  float blur = uRender.x;
  float face = uRender.w;
  float seed = uLook.x;

  // ---- outline ---------------------------------------------------------------------------
  float s = (vUv.y - V0) / (V1 - V0);
  float sc = clamp(s, 0.0, 1.0);
  float u = vUv.x / UMAX - uOutline.w * sc * (1.0 - sc);
  // the tip dips at the midrib (soft notch)
  float sn = sc + uOutline.z * exp(-u * u * 9.0) * smoothstep(0.5, 1.0, sc);
  float body = uOutlineK * pow(max(sn, 1e-4), uOutline.x) * (1.0 - sn);
  float wobble = gnoise(vec2(u * 2.6 + seed, sc * 3.1 - seed));
  float f = body - pow(u * u + 1e-5, 0.5 * uOutline.y) - 3.0 * abs(s - sc) + wobble * 0.06 * sc;

  // distance to the outline in pixels
  float dist = f / max(length(vec2(dFdx(f), dFdy(f))), 1e-6);
  // never razor sharp: the photograph behind has the softness of a real lens
  float band = 1.4 + blur;
  float alpha = smoothstep(-band, band, dist);
  // a blurred edge must die out before it reaches the border of the sheet
  vec2 fw = max(fwidth(vUv), vec2(1e-6));
  float border = min((1.0 - abs(vUv.x)) / fw.x, min(vUv.y, 1.0 - vUv.y) / fw.y);
  alpha *= clamp(border / (1.0 + blur), 0.0, 1.0) * uRender.y;
  if (alpha < 0.003) discard;

  // ---- tissue ----------------------------------------------------------------------------
  float inside = smoothstep(0.0, 0.5, f);            // 0 at the margin, 1 deep inside
  float fan = u / (0.14 + 0.92 * pow(sc, 0.9));      // fans out from below the base, like the veins
  // the last stretch before the margin, except around the base
  float lip = (1.0 - smoothstep(0.0, 0.2, f)) * smoothstep(0.05, 0.3, sc);

  // Soft streaks that follow the fan of the veins. They are broad and low in contrast on
  // purpose: drawn as lines, veins read as stripes on a petal this small.
  float vein = gnoise(vec2(fan * uLook.y, sc * 0.8) + seed) * smoothstep(0.05, 0.4, sc);

  float mott = gnoise(vec2(u * 2.2, sc * 2.4) + seed * 1.3);
  float und = gnoise(vec2(u * 2.6, sc * 2.2) - seed * 0.7)
    + 0.45 * gnoise(vec2(u * 5.3, sc * 4.9) + seed * 2.1);

  // pale claw, coloured body, deeper margin
  vec3 alb = mix(uColBase, uColMid, smoothstep(-0.03, 0.15, sc + mott * 0.05));
  alb = mix(alb, uColEdge, (1.0 - inside) * smoothstep(0.12, 0.55, sc) * uLook.z);
  alb *= 1.0 + mott * 0.1 + vein * 0.05;
  if (face < 0.0) {
    // the underside is a little paler and duller
    alb = mix(alb, vec3(dot(alb, vec3(0.3, 0.59, 0.11))), 0.1) + 0.006;
  }

  // ---- light -----------------------------------------------------------------------------
  // gentle dents and a margin that rolls back a little
  float h = (und - lip * lip * (0.4 + mott)) * uBump;
  vec3 n = bumpNormal(normalize(vNormal), h) * face;
  vec3 v = normalize(-vPos);

  // thin margins let more light through; the fleshy base blocks it
  float thin = mix(1.15, 0.8, inside) * mix(0.5, 1.0, smoothstep(0.0, 0.4, sc)) * (1.0 + vein * 0.12);
  vec3 trn = pow(alb, vec3(1.4)) * uLook.w * thin;
  vec3 deep = pow(alb, vec3(2.2));
  float occ = face > 0.0
    ? mix(0.55, 1.0, smoothstep(0.0, 0.6, sc)) * mix(0.9, 1.0, 1.0 - inside)
    : mix(0.85, 1.0, smoothstep(0.0, 0.5, sc));
  float sheenAmt = face > 0.0 ? 0.5 : 0.2;
  float specAmt = face > 0.0 ? 0.012 : 0.035;

  // Shadow the margin casts into the cup, for the key light. On a circular cross-section the
  // light is blocked when it arrives lower than the chord from this point to the margin on its side.
  float vis = 1.0;
  if (vCup * face > 0.0) {
    float side = uKeyLocal.x < 0.0 ? -1.0 : 1.0;
    float halfWidth = pow(max(body, 1e-5), 1.0 / uOutline.y) * UMAX;
    float chord = 0.5 * abs(vCup) * (vUv.x * side + halfWidth);
    float elevation = atan(uKeyLocal.z * face, abs(uKeyLocal.x) + 1e-4);
    vis = smoothstep(-0.12, 0.22, elevation - chord);
  }

  // dim surroundings, a warm key, a warm light from behind for the glow, a faint cool fill
  vec3 sky = vec3(0.12, 0.115, 0.125);
  vec3 ground = vec3(0.05, 0.04, 0.032);
  float up = n.y * 0.5 + 0.5;
  vec3 lit = alb * occ;
  vec3 col = lit * mix(ground, sky, up) + trn * mix(sky, ground, up) * 0.5;
  col += shade(n, v, uKeyDir, vec3(1.15, 1.06, 0.95), vis, lit, deep * occ, trn, sheenAmt, specAmt);
  col += shade(n, v, normalize(vec3(0.35, 0.55, -0.76)), vec3(0.85, 0.72, 0.58), 1.0, lit, deep * occ, trn, sheenAmt, specAmt);
  col += shade(n, v, normalize(vec3(0.75, -0.15, 0.64)), vec3(0.075, 0.085, 0.105), 1.0, lit, deep * occ, trn, sheenAmt, 0.0);
  col *= uRender.z;

  // soft shoulder instead of a hard clip, keeping the hue
  float peak = max(col.r, max(col.g, col.b));
  if (peak > 0.7) col *= (0.7 + 0.3 * (1.0 - exp(-(peak - 0.7) / 0.3))) / peak;
  col = pow(col, vec3(1.0 / 2.2));

  // ---- camera: develop the petal like the photograph it is composited over ---------------
  // Rendered colour is cleaner than anything a camera records; without this the petals read
  // as stickers on the photo.
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, 0.9);                                     // muted, like the photo
  col = mix(vec3(0.05, 0.04, 0.035), vec3(0.9, 0.87, 0.82), col);      // lifted blacks, warm soft whites
  // the light falls off towards the bottom of the frame, as on the page behind
  col *= mix(0.6, 1.0, smoothstep(0.0, 0.8, gl_FragCoord.y / uCamera.y));
  // distant petals sink into the warm haze of the room
  col = mix(col, vec3(0.3, 0.26, 0.23), uCamera.x);
  // dither: breaks gradient banding without visible grain
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

// ----------------------------------------------------------------------

/** Distance from the camera (CSS px) at which one world unit is one CSS pixel. */
const FOCAL = 900;
const MAX_PIXEL_RATIO = 2;
/**
 * Overall brightness of the light on the petals. The page behind them is a dim, warm scene;
 * at full exposure the pale petals glow like cut-outs instead of sitting in it.
 */
const EXPOSURE = 0.74;
const GRID_U = 22;
const GRID_V = 30;
/** Share of the sheet the outline occupies. Must match UMAX, V0 and V1 in the fragment shader. */
const OUTLINE_WIDTH = 0.8;
const OUTLINE_LENGTH = 0.84;

/** Direction towards the key light in view space (upper left, slightly in front), normalised. */
const KEY_LIGHT = (() => {
  const dir = [-0.62, 0.72, 0.3];
  const length = Math.hypot(dir[0], dir[1], dir[2]);
  return new Float32Array(dir.map((c) => c / length));
})();

/** Albedo at the base (claw), the body and the margin of the petal. */
const PALETTES: [string, string, string][] = [
  ['#c9584a', '#a3101a', '#6e0810'], // 0 red rose
  ['#9a3a3c', '#6c0d1a', '#430611'], // 1 burgundy / wine
  ['#e6c0a0', '#c07650', '#9c5636'], // 2 terracotta
  ['#ead2ac', '#c79a66', '#a9784a'], // 3 caramel
  ['#ece0c8', '#d9c4a0', '#c4a77f'], // 4 beige / sand
  ['#f0e8d6', '#e6dbc4', '#d4c3a3'], // 5 ivory
  ['#efdcd0', '#e0aea6', '#cc8a8a'], // 6 blush
  ['#e9d2b8', '#b48c66', '#93694a'], // 7 mocha
];

/** Weighted order: reds and the wedding browns/beiges appear most often. */
const PALETTE_SEQUENCE = [0, 4, 3, 0, 1, 5, 7, 0, 2, 4, 6, 3, 0, 1, 4, 7];

const UNIFORMS = [
  'uProj',
  'uRot',
  'uPos',
  'uSize',
  'uBend',
  'uCup',
  'uWave',
  'uColBase',
  'uColMid',
  'uColEdge',
  'uOutline',
  'uOutlineK',
  'uLook',
  'uRender',
  'uBump',
  'uKeyDir',
  'uKeyLocal',
  'uCamera',
] as const;

type UniformName = (typeof UNIFORMS)[number];

interface GlResources {
  program: WebGLProgram;
  vertices: WebGLBuffer;
  indices: WebGLBuffer;
  indexCount: number;
  uniforms: Record<UniformName, WebGLUniformLocation | null>;
}

interface Petal {
  // ---- shape and look, fixed for the life of the petal
  colBase: Float32Array;
  colMid: Float32Array;
  colEdge: Float32Array;
  outline: Float32Array;
  outlineK: number;
  look: Float32Array;
  size: Float32Array;
  bend: Float32Array;
  cup: Float32Array;
  wave: Float32Array;
  bump: number;
  /** Bounding radius in world units. */
  radius: number;
  /** True when the upper face is the inside of the cup. */
  cuppedFront: boolean;
  // ---- depth of field
  /** Distance from the camera of the path the petal falls along. */
  dist: number;
  /** Defocus radius in CSS px. */
  blur: number;
  exposure: number;
  /** How far the petal has faded into the haze of the room, 0..1. */
  haze: number;
  // ---- motion
  /** Point the petal swings around; it falls and drifts with the wind. */
  x: number;
  y: number;
  /** Current offset along the swing direction, and the resulting depth. */
  sway: number;
  z: number;
  fall: number;
  drag: number;
  glide: number;
  phase: number;
  omega: number;
  /** Phase of the slow changes in pace and reach that keep the flutter from repeating. */
  mood: number;
  swing: number;
  heading: number;
  headingRate: number;
  tilt: number;
  wobble: number;
  wobbleRate: number;
  yaw: number;
  yawRate: number;
  pitch: number;
  spin: number;
  spinRate: number;
  roll: number;
  tumble: number;
}

export interface PetalSceneOptions {
  /** How many petals are in the air at once. */
  count: number;
  /** Size multiplier for the petals. */
  scale?: number;
}

// ----------------------------------------------------------------------

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** '#rrggbb' in sRGB to linear RGB. */
function hexToLinear(hex: string) {
  return new Float32Array(
    [1, 3, 5].map((start) => {
      const c = parseInt(hex.slice(start, start + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
  );
}

function makePetal(order: number, scale: number): Petal {
  const [base, mid, edge] = PALETTES[PALETTE_SEQUENCE[order % PALETTE_SEQUENCE.length]];

  const width = rand(26, 36) * scale;
  const length = width * rand(0.98, 1.2);
  // Outline: half-width ∝ s^wedge · (1 - s)^tip, with s running from the base to the tip.
  // A small wedge rounds the base; a small tip exponent squares the shoulders.
  const wedge = rand(0.65, 0.9);
  const tip = rand(0.3, 0.42);
  const exponent = wedge / tip;

  // most petals are cupped towards their upper face; a few curl the other way
  const reflexed = Math.random() < 0.18;
  const cupBase = reflexed ? -rand(0.35, 0.8) : rand(0.5, 1.3);
  const bendStart = reflexed ? -rand(0.3, 0.9) : rand(0.5, 1.6);

  // 0.5 (far, small) … 1.75 (near, large); 1 is the focal plane
  const depth = 0.5 + 1.25 * Math.random() ** 1.7;
  const tumbles = Math.random() < 0.22;
  const direction = Math.random() < 0.5 ? -1 : 1;

  return {
    colBase: hexToLinear(base),
    colMid: hexToLinear(mid),
    colEdge: hexToLinear(edge),
    outline: new Float32Array([
      exponent,
      1 / tip,
      Math.random() < 0.45 ? rand(0.02, 0.06) : 0,
      rand(-0.25, 0.25),
    ]),
    outlineK: (1 + exponent) ** (1 + exponent) / exponent ** exponent,
    look: new Float32Array([rand(0, 10), rand(1.2, 2), rand(0.5, 1), rand(0.55, 0.75)]),
    size: new Float32Array([width / (2 * OUTLINE_WIDTH), length / OUTLINE_LENGTH]),
    bend: new Float32Array([bendStart, reflexed ? rand(-0.2, 0.6) : rand(-2, -0.2)]),
    cup: new Float32Array([cupBase, cupBase * rand(-0.5, 0.7)]),
    wave: new Float32Array([rand(0, 0.1), rand(5, 10), rand(0, 6.28), rand(-0.5, 0.5)]),
    bump: width * 0.03,
    radius: length * 0.62,
    cuppedFront: !reflexed,

    dist: FOCAL / depth,
    blur: depth > 1 ? Math.max(0, depth - 1.1) * 3.5 : Math.max(0, 0.9 - depth) * 4.5,
    // distant petals sit deeper in the dim room
    exposure: EXPOSURE * (0.72 + 0.28 * smoothstep(0.5, 0.95, depth)),
    haze: Math.max(0, 0.95 - depth) * 0.5,

    x: 0,
    y: 0,
    sway: 0,
    z: -FOCAL / depth,
    fall: rand(46, 78) * (tumbles ? 1.15 : 1),
    drag: rand(0.75, 1.25),
    glide: tumbles ? direction * rand(10, 22) : 0,
    phase: rand(0, 6.28),
    omega: rand(1.3, 2.3),
    mood: rand(0, 6.28),
    swing: tumbles ? rand(6, 16) : rand(18, 52),
    heading: rand(-0.5, 0.5),
    headingRate: rand(-0.12, 0.12),
    tilt: rand(0.45, 1),
    wobble: rand(0.1, 0.35),
    wobbleRate: rand(1.3, 2.1),
    yaw: rand(0, 6.28),
    yawRate: direction * rand(0.15, 0.7),
    pitch: -Math.PI / 2 + rand(-0.9, 1.3),
    spin: rand(0, 6.28),
    spinRate: rand(-0.25, 0.25),
    roll: 0,
    tumble: tumbles ? direction * rand(1, 2) : 0,
  };
}

// ---- 3×3 rotation helpers (row-major) ---------------------------------

function setRotation(out: Float32Array, x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  out[0] = t * x * x + c;
  out[1] = t * x * y - s * z;
  out[2] = t * x * z + s * y;
  out[3] = t * x * y + s * z;
  out[4] = t * y * y + c;
  out[5] = t * y * z - s * x;
  out[6] = t * x * z - s * y;
  out[7] = t * y * z + s * x;
  out[8] = t * z * z + c;
  return out;
}

/** out = a · b. `out` must not be `a` or `b`. */
function multiply(out: Float32Array, a: Float32Array, b: Float32Array) {
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row * 3 + col] =
        a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col];
    }
  }
  return out;
}

// ---- GL setup ----------------------------------------------------------

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[petals] shader failed to compile:', gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createResources(gl: WebGLRenderingContext): GlResources | null {
  // screen-space derivatives drive the anti-aliased outline and the bump
  if (!gl.getExtension('OES_standard_derivatives')) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.bindAttribLocation(program, 0, 'aUv');
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[petals] program failed to link:', gl.getProgramInfoLog(program));
    }
    gl.deleteProgram(program);
    return null;
  }

  // one sheet shared by every petal; the shaders give each its own shape
  const columns = GRID_U + 1;
  const vertexData = new Float32Array(columns * (GRID_V + 1) * 2);
  for (let j = 0, o = 0; j <= GRID_V; j += 1) {
    for (let i = 0; i <= GRID_U; i += 1, o += 2) {
      vertexData[o] = (i / GRID_U) * 2 - 1;
      vertexData[o + 1] = j / GRID_V;
    }
  }
  const indexData = new Uint16Array(GRID_U * GRID_V * 6);
  for (let j = 0, o = 0; j < GRID_V; j += 1) {
    for (let i = 0; i < GRID_U; i += 1, o += 6) {
      const a = j * columns + i;
      const d = a + columns;
      // counter-clockwise seen from the upper face
      indexData.set([a, a + 1, d + 1, a, d + 1, d], o);
    }
  }

  const vertices = gl.createBuffer();
  const indices = gl.createBuffer();
  if (!vertices || !indices) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

  const uniforms = {} as GlResources['uniforms'];
  UNIFORMS.forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });

  return { program, vertices, indices, indexCount: indexData.length, uniforms };
}

// ----------------------------------------------------------------------

/**
 * Starts the petal scene on `canvas` and returns a function that tears it down.
 * Draws nothing when WebGL is unavailable or the visitor prefers reduced motion.
 */
export function createPetalScene(
  canvas: HTMLCanvasElement,
  { count, scale = 1 }: PetalSceneOptions
): () => void {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    depth: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  if (!gl) return () => {};

  let resources = createResources(gl);
  if (!resources) return () => {};

  let spawned = 0;
  const nextPetal = () => {
    spawned += 1;
    return makePetal(spawned - 1, scale);
  };
  const petals = Array.from({ length: count }, nextPetal);

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const projection = new Float32Array(16);
  const rotation = new Float32Array(9);
  const step = new Float32Array(9);
  const scratch = new Float32Array(9);
  const columnMajor = new Float32Array(9);

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let scattered = false;
  let visible = false;
  let frameId = 0;
  let lastTime = 0;
  let time = 0;

  /** World units covered by half the canvas at the depth of `petal`. */
  const halfExtent = (petal: Petal, cssSize: number) => ((cssSize / 2) * petal.dist) / FOCAL;

  const scatter = () => {
    petals.forEach((petal) => {
      const halfH = halfExtent(petal, height) + petal.radius;
      petal.x = rand(-1, 1) * halfExtent(petal, width);
      petal.y = rand(-halfH, halfH);
    });
  };

  const respawn = (petal: Petal) => {
    Object.assign(petal, nextPetal());
    petal.x = rand(-1, 1) * halfExtent(petal, width);
    // a little above the top edge, staggered so recycled petals do not arrive in step
    petal.y = halfExtent(petal, height) * rand(1, 1.25) + petal.radius * 1.5;
  };

  const advance = (dt: number) => {
    time += dt;
    // a light breeze that never quite settles (world units per second)
    const wind = 4 + 9 * Math.sin(time * 0.11) + 6 * Math.sin(time * 0.27 + 1.9);

    petals.forEach((petal) => {
      // the flutter breathes instead of ticking like a metronome
      petal.phase += petal.omega * (1 + 0.22 * Math.sin(time * 0.43 + petal.mood)) * dt;
      petal.heading += petal.headingRate * dt;
      petal.yaw += petal.yawRate * dt;
      petal.spin += petal.spinRate * dt;
      petal.roll += petal.tumble * dt;
      // a fluttering plate drops fastest mid-swing and stalls at the turning points
      petal.y -= petal.fall * (1 + 0.32 * Math.cos(2 * petal.phase)) * dt;
      petal.x += (wind * petal.drag + petal.glide) * dt;

      const limit = halfExtent(petal, width) + petal.radius + petal.swing;
      if (petal.x > limit) petal.x -= 2 * limit;
      else if (petal.x < -limit) petal.x += 2 * limit;
      if (petal.y < -halfExtent(petal, height) - petal.radius * 1.5) respawn(petal);

      const reach = petal.swing * (0.8 + 0.2 * Math.sin(time * 0.29 + petal.mood * 1.7));
      petal.sway = reach * Math.sin(petal.phase);
      petal.z = -petal.dist + Math.sin(petal.heading) * petal.sway;
    });
  };

  const draw = () => {
    if (!resources || !width || !height) return;
    const { uniforms, indexCount } = resources;

    // eslint-disable-next-line no-bitwise
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.uProj, false, projection);
    gl.uniform3fv(uniforms.uKeyDir, KEY_LIGHT);

    // far to near, so soft edges blend over whatever is behind them
    petals.sort((a, b) => a.z - b.z);

    petals.forEach((petal) => {
      // fade in under the top edge and out above the bottom edge
      const zoom = FOCAL / -petal.z;
      const fromTop = height / 2 - petal.y * zoom;
      const reach = petal.radius * zoom;
      const opacity = Math.min(
        clamp01((fromTop + reach) / 60),
        clamp01((height - fromTop + reach) / 90)
      );
      if (opacity <= 0) return;

      // in-plane spin → lie down → yaw → wobble → pendulum tilt (and tumble) about the swing axis
      const cosH = Math.cos(petal.heading);
      const sinH = Math.sin(petal.heading);
      const wobble = petal.wobble * Math.sin(petal.phase * petal.wobbleRate + 1.3);
      const tilt = petal.tilt * Math.sin(petal.phase) + petal.roll;
      setRotation(rotation, 0, 0, 1, petal.spin);
      multiply(scratch, setRotation(step, 1, 0, 0, petal.pitch), rotation);
      multiply(rotation, setRotation(step, 0, 1, 0, petal.yaw), scratch);
      multiply(scratch, setRotation(step, cosH, 0, sinH, wobble), rotation);
      multiply(rotation, setRotation(step, -sinH, 0, cosH, tilt), scratch);
      for (let i = 0; i < 9; i += 1) columnMajor[i] = rotation[(i % 3) * 3 + Math.floor(i / 3)];

      gl.uniformMatrix3fv(uniforms.uRot, false, columnMajor);
      // the key light seen from the petal: rotationᵀ · KEY_LIGHT
      gl.uniform3f(
        uniforms.uKeyLocal,
        rotation[0] * KEY_LIGHT[0] + rotation[3] * KEY_LIGHT[1] + rotation[6] * KEY_LIGHT[2],
        rotation[1] * KEY_LIGHT[0] + rotation[4] * KEY_LIGHT[1] + rotation[7] * KEY_LIGHT[2],
        rotation[2] * KEY_LIGHT[0] + rotation[5] * KEY_LIGHT[1] + rotation[8] * KEY_LIGHT[2]
      );
      gl.uniform3f(uniforms.uPos, petal.x + cosH * petal.sway, petal.y, petal.z);
      gl.uniform2fv(uniforms.uSize, petal.size);
      gl.uniform2fv(uniforms.uBend, petal.bend);
      gl.uniform2fv(uniforms.uCup, petal.cup);
      gl.uniform4fv(uniforms.uWave, petal.wave);
      gl.uniform3fv(uniforms.uColBase, petal.colBase);
      gl.uniform3fv(uniforms.uColMid, petal.colMid);
      gl.uniform3fv(uniforms.uColEdge, petal.colEdge);
      gl.uniform4fv(uniforms.uOutline, petal.outline);
      gl.uniform1f(uniforms.uOutlineK, petal.outlineK);
      gl.uniform4fv(uniforms.uLook, petal.look);
      // surface detail blurs away with the outline
      gl.uniform1f(uniforms.uBump, petal.bump / (1 + petal.blur * 0.5));
      gl.uniform2f(uniforms.uCamera, petal.haze, canvas.height);

      // The inside of the cup can only be hidden by the outside, never the other way round,
      // so drawing the inside first lets the soft edges of the outside blend over it.
      const blurPx = petal.blur * pixelRatio;
      const insideFace = petal.cuppedFront ? 1 : -1;
      [insideFace, -insideFace].forEach((face) => {
        gl.cullFace(face > 0 ? gl.BACK : gl.FRONT);
        gl.uniform4f(uniforms.uRender, blurPx, opacity, petal.exposure, face);
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
      });
    });
  };

  const frame = (now: number) => {
    frameId = requestAnimationFrame(frame);
    // clamped so a stalled tab does not teleport the petals
    advance(Math.min(Math.max(now - lastTime, 0) / 1000, 0.05));
    lastTime = now;
    draw();
  };

  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  /** Runs the loop only while there is something to show and someone to see it. */
  const sync = () => {
    const shouldRun = visible && !motionQuery.matches && !!resources && width > 0 && height > 0;
    if (shouldRun && !frameId) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    } else if (!shouldRun && frameId) {
      stop();
    }
    if (motionQuery.matches && resources) gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    if (width && height) {
      pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);

      const near = FOCAL * 0.2;
      const far = FOCAL * 4;
      projection.fill(0);
      projection[0] = (2 * FOCAL) / width;
      projection[5] = (2 * FOCAL) / height;
      projection[10] = -(far + near) / (far - near);
      projection[11] = -1;
      projection[14] = (-2 * far * near) / (far - near);

      if (!scattered) {
        scatter();
        scattered = true;
      }
    }

    sync();
    // resizing clears the canvas; repaint now instead of flashing empty until the next frame
    if (frameId) draw();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault(); // lets the browser restore the context later
    resources = null;
    sync();
  };

  const onContextRestored = () => {
    resources = createResources(gl);
    resize();
  };

  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });

  resizeObserver.observe(canvas);
  visibilityObserver.observe(canvas);
  motionQuery.addEventListener?.('change', sync); // missing in Safari < 14
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  resize();

  return () => {
    stop();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    motionQuery.removeEventListener?.('change', sync);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    if (resources) {
      gl.deleteProgram(resources.program);
      gl.deleteBuffer(resources.vertices);
      gl.deleteBuffer(resources.indices);
    }
  };
}
