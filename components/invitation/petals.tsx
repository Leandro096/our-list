import type { CSSProperties } from 'react';

/**
 * Realistic falling rose petals with real 3D curvature.
 *
 * Each petal is drawn once as a layered SVG (pale base → saturated edge, veins, velvet
 * texture, sheen) and then sliced into vertical strips. Every strip is placed on a
 * circular arc in 3D (translateZ + rotateY), so the petal is genuinely cupped (or curled
 * backwards) instead of a flat card. The strips live inside a preserve-3d element that
 * tumbles in perspective, so the curvature is visible from every angle.
 *
 * Motion layers:
 *   .px-petal       → vertical fall + fade (linear)
 *   .px-petal-sway  → side-to-side pendulum drift (ease-in-out)
 *   .px-petal-spin  → perspective tumble on X/Y/Z (preserve-3d, holds the curved strips)
 *   .px-petal-shade → per-strip darkening synced with the tumble
 * Petals are split into far / mid / near depth layers (size, speed, blur, opacity).
 *
 * All values are derived from the index so server and client render the same markup.
 */

type Palette = { base: string; mid: string; edge: string; vein: string; sheen: number };

const PALETTES: Palette[] = [
  { base: '#ec7b6c', mid: '#bd1c2c', edge: '#7c0c1b', vein: '#4d0611', sheen: 0.55 }, // 0 red rose
  { base: '#c75662', mid: '#8e1d31', edge: '#580d1c', vein: '#33050f', sheen: 0.45 }, // 1 burgundy / wine
  { base: '#f2b48e', mid: '#c97752', edge: '#93482d', vein: '#653020', sheen: 0.7 }, // 2 terracotta
  { base: '#f4d9b2', mid: '#c99b63', edge: '#8c6337', vein: '#664423', sheen: 0.8 }, // 3 caramel / brown
  { base: '#fcf4e6', mid: '#e7d3b2', edge: '#bb9c74', vein: '#87704d', sheen: 1 }, // 4 beige / sand
  { base: '#fffdf7', mid: '#f6ecdb', edge: '#e0cdab', vein: '#b19a72', sheen: 1 }, // 5 ivory
  { base: '#fff3ec', mid: '#f1c1bb', edge: '#d98a92', vein: '#b35d6a', sheen: 1 }, // 6 blush
  { base: '#e9cfb6', mid: '#a9805c', edge: '#6f4a2e', vein: '#4a2f1c', sheen: 0.7 }, // 7 mocha
];

/** Weighted order: reds and the wedding browns/beiges appear most often. */
const PALETTE_SEQUENCE = [0, 4, 3, 0, 1, 5, 7, 0, 2, 4, 6, 3, 0, 1, 4, 7];

const SHAPES = [
  // classic rose petal with a soft notch at the top
  'M50 118 C34 112 8 90 5 58 C2 28 18 6 38 6 C45 6 48 10 50 14 C52 10 55 6 62 6 C82 6 98 28 95 58 C92 90 66 112 50 118 Z',
  // narrower, oval petal
  'M50 119 C38 110 18 86 14 54 C10 24 26 2 50 4 C74 2 90 24 86 54 C82 86 62 110 50 119 Z',
  // asymmetric, slightly wavy edge
  'M50 118 C30 110 4 86 6 52 C8 22 26 4 44 8 C50 9 52 4 60 4 C80 4 96 26 94 56 C92 88 70 110 50 118 Z',
];

const VEINS =
  'M50 116 Q38 80 18 42 M50 116 Q42 74 30 22 M50 116 Q47 70 44 14 M50 116 Q53 70 56 14 M50 116 Q58 74 70 22 M50 116 Q62 80 82 42';

// far, mid, near
const DEPTHS = [
  { scale: 0.6, fall: 24, blur: 0.7, op: 0.6 },
  { scale: 1, fall: 17, blur: 0, op: 0.95 },
  { scale: 1.55, fall: 12, blur: 1.4, op: 0.97 },
];

/** Number of vertical strips each petal is sliced into to build its curvature. */
const STRIPS = 5;

function PetalDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        {PALETTES.map((p, i) => (
          <radialGradient
            key={i}
            id={`pxp-fill-${i}`}
            cx="50%"
            cy="98%"
            r="105%"
            fx="50%"
            fy="100%"
          >
            <stop offset="0%" stopColor={p.base} />
            <stop offset="16%" stopColor={p.base} />
            <stop offset="60%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.edge} />
          </radialGradient>
        ))}
        {/* specular sheen near the top-left lobe */}
        <radialGradient id="pxp-sheen" cx="34%" cy="26%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* warm crease where the petal attached to the flower */}
        <radialGradient id="pxp-base" cx="50%" cy="100%" r="22%">
          <stop offset="0%" stopColor="#e2c27a" stopOpacity=".5" />
          <stop offset="100%" stopColor="#e2c27a" stopOpacity="0" />
        </radialGradient>
        {/* velvety fibre texture, clipped to the petal by the composite */}
        <filter id="pxp-tex" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4 .35" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 .4  0 0 0 0 .12  0 0 0 0 .14  .45 0 0 0 -.15" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        {SHAPES.map((d, i) => (
          <clipPath key={i} id={`pxp-clip-${i}`}>
            <path d={d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}

function PetalArt({ shape, palette, side }: { shape: number; palette: number; side: number }) {
  const d = SHAPES[shape];
  const p = PALETTES[palette];
  return (
    <svg viewBox="0 0 100 120" className="px-petal-art" focusable="false">
      <g clipPath={`url(#pxp-clip-${shape})`}>
        <path d={d} fill={`url(#pxp-fill-${palette})`} />
        <path d={d} fill="#000" filter="url(#pxp-tex)" />
        <path
          d={VEINS}
          fill="none"
          stroke={p.vein}
          strokeOpacity=".25"
          strokeWidth=".9"
          strokeLinecap="round"
        />
        <path d={d} fill="url(#pxp-base)" />
        <path d={d} fill="url(#pxp-sheen)" opacity={p.sheen} />
        {/* static light falloff across the curve (light from the upper left) */}
        <path d={d} fill="#1e0c0a" opacity={side} />
        {/* soft inner rim: the edge curls slightly and catches light */}
        <path d={d} fill="none" stroke="#fff" strokeOpacity={0.3 * p.sheen} strokeWidth="3" />
      </g>
      <path d={d} fill="none" stroke={p.edge} strokeOpacity=".6" strokeWidth="1" />
    </svg>
  );
}

/**
 * Places strip `k` of a petal of width `w` on a circular arc spanning `arcDeg` degrees.
 * `cup` = 1 bends the edges toward the viewer (cupped), -1 curls them away.
 */
function stripTransform(k: number, w: number, arcDeg: number, cup: number) {
  const stripW = w / STRIPS;
  const x = (k - (STRIPS - 1) / 2) * stripW; // strip centre relative to petal centre
  const r = w / ((arcDeg * Math.PI) / 180); // arc length == petal width
  const theta = x / r;
  const dx = r * Math.sin(theta) - x;
  const dz = cup * r * (1 - Math.cos(theta));
  const rot = (-cup * theta * 180) / Math.PI;
  const left = Math.max(0, (k / STRIPS) * 100 - 0.8);
  const right = Math.max(0, 100 - ((k + 1) / STRIPS) * 100 - 0.8);
  return {
    transformOrigin: `${((k + 0.5) / STRIPS) * 100}% 50%`,
    transform: `translate3d(${dx.toFixed(2)}px,0,${dz.toFixed(2)}px) rotateY(${rot.toFixed(2)}deg)`,
    clipPath: `inset(0 ${right.toFixed(2)}% 0 ${left.toFixed(2)}%)`,
  } satisfies CSSProperties;
}

export function Petals({ count = 14, className = '' }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <PetalDefs />
      {Array.from({ length: count }, (_, i) => {
        const depth = DEPTHS[(i * 2 + 1) % 3];
        const shape = (i * 7) % SHAPES.length;
        const palette = PALETTE_SEQUENCE[i % PALETTE_SEQUENCE.length];
        const width = Math.round((20 + ((i * 5) % 12)) * depth.scale);
        const height = Math.round(width * (1.1 + ((i * 3) % 4) * 0.06));
        const fall = depth.fall + ((i * 7) % 6);
        const spin = 5 + ((i * 11) % 6);
        // most petals are cupped; every fourth one curls backwards
        const cup = i % 4 === 3 ? -1 : 1;
        const arc = 70 + ((i * 17) % 60); // 70°–130° of curvature
        const style = {
          left: `${(i * 37 + 8) % 100}%`,
          width,
          height,
          '--fall': `${fall}s`,
          '--delay': `${-((i * 2.3) % fall)}s`,
          '--op': depth.op,
          '--drift': `${((i * 13) % 17) - 8}vw`,
          '--sway': `${18 + ((i * 9) % 30)}px`,
          '--swayd': `${2.6 + ((i * 5) % 4) * 0.6}s`,
          '--spin': `${spin}s`,
          '--dir': i % 2 ? 'reverse' : 'normal',
          '--blur': `${depth.blur}px`,
        } as CSSProperties;

        return (
          <span key={i} className="px-petal" style={style}>
            <span className="px-petal-sway">
              <span className="px-petal-spin">
                {Array.from({ length: STRIPS }, (_, k) => {
                  // light comes from the upper left: strips facing away get darker
                  const t = k / (STRIPS - 1);
                  const side = cup > 0 ? 0.03 + 0.2 * t : 0.03 + 0.2 * (1 - t);
                  return (
                    <span
                      key={k}
                      className="px-petal-strip"
                      style={stripTransform(k, width, arc, cup)}
                    >
                      <PetalArt shape={shape} palette={palette} side={side} />
                      <span className="px-petal-shade">
                        <svg viewBox="0 0 100 120" focusable="false">
                          <path d={SHAPES[shape]} fill="#1e0c0a" />
                        </svg>
                      </span>
                    </span>
                  );
                })}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
