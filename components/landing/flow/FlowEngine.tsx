'use client';
/**
 * Hero illustration: teammates (blob avatars carrying a leave type) travel
 * along green lanes into the Spotflow engine; approved leave cards ride a
 * belt out the other side and land on the team calendar as lit days.
 *
 * Everything is a pure function of time `t`, so the scene is deterministic:
 * the server renders a still frame, the client animates from the same frame,
 * and reduced-motion users keep that still frame.
 */

import { memo, useMemo, useRef, useState } from 'react';
import { useAnimationFrame, useInView, useReducedMotion } from 'framer-motion';
import { blobatarUri } from 'blobatar/uri';
import { SPOTFLOW_LOGO_PATH } from '@/components/brand/SpotflowLogo';
import {
  circle, iso, lane, onFrontRight, onTop, polygon, prism, roundedRect,
  type Lane, type Prism, type Shades,
} from './geometry';

// ── Timing (seconds) ─────────────────────────────────────────
const GAP = 1.6;         // one teammate reaches the engine every GAP
const TRAVEL = 11;       // time to walk a lane
const PROCESS = 0.4;     // engine thinks, then a card comes out
const BELT = 2.8;        // card ride along the belt (cards stay ~0.5 apart)
const LAND = 0.9;        // card hop onto the calendar
const SLOTS = 7;         // cards per calendar "month" before it clears
const START = TRAVEL + SLOTS * GAP + 3.4; // a full, busy first frame

// ── Cast (fictional) ─────────────────────────────────────────
const NAMES = [
  'Ada Okafor', 'Tunde Bello', 'Zainab Musa', 'Chidi Eze', 'Ngozi Ade',
  'Femi Olu', 'Amara Obi', 'Kemi Lawal', 'Ife Johnson', 'Seyi Danjuma', 'Bisi Coker',
];
const TYPES = [
  { label: 'Annual', long: 'Annual leave', color: '#3ddc97' },
  { label: 'Sick', long: 'Sick leave', color: '#a78bfa' },
  { label: 'Annual', long: 'Annual leave', color: '#3ddc97' },
  { label: 'Personal', long: 'Personal leave', color: '#60a5fa' },
  { label: 'Other', long: 'Other leave', color: '#a1a1aa' },
];

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (v: number) => v * v * (3 - 2 * v);

// ── World layout (grid units) ────────────────────────────────
const ENGINE = { half: 2.9, height: 1.15 };
const BELT_Y = 1.85;
const BELT_X = [ENGINE.half, 11.0] as const;
const BELT_Z = 0.22;
const CARD = { hx: 1.3, hy: 1.55, h: 0.16 };
// The calendar sits up-right of the belt's end, balancing the lanes on the left.
const CAL = { x0: 11.5, x1: 16.6, y0: -10.2, y1: -3.0, z: 0.3 };
const PITCH = 0.98;
const cellX = (i: number) => 12.0 + i * PITCH;
const cellY = (j: number) => -3.5 - j * PITCH; // Monday on the viewer's left
const CELL = 0.4;

/** Where each card of a month lands: [row, first weekday, days]. */
const SLOT_LAYOUT: [number, number, number][] = [
  [0, 1, 2], [1, 3, 1], [2, 0, 3], [3, 2, 2], [1, 0, 1], [4, 1, 3], [2, 4, 1],
];

// Lanes run along the isometric x axis (down-right on screen), each starting
// just off the left edge, then ease into the engine's far wall on a gentle S —
// no sharp turn at the end. Blobs slip behind the engine as they arrive.
const LANES: Lane[] = [
  { y: 3.0, end: 0.6 },
  { y: 6.0, end: 1.3 },
  { y: 9.0, end: 2.0 },
  { y: 12.0, end: 2.6 },
].map(({ y, end }) => {
  const startX = y - 26.8; // screen x ≈ -650, just outside the frame
  return lane([startX, y], [
    { kind: 'line', to: [-14.5, y] },
    { kind: 'cubic', c1: [-9, y], c2: [-8.5, end], to: [-ENGINE.half - 0.4, end] },
  ]);
});

// ── Palette ──────────────────────────────────────────────────
const GREEN = '#3ddc97';
const ENGINE_SHADES: Shades = { top: '#1c1c23', left: '#18181e', right: '#101014' };
const SLAB_SHADES: Shades = { top: '#16161b', left: '#121216', right: '#0d0d10' };
const PUCK_SHADES: Shades = { top: '#1e1e25', left: '#17171c', right: '#111115' };
const CARD_SHADES: Shades = { top: '#1d1d25', left: '#16161b', right: '#101014' };
const CELL_SHADES: Shades = { top: '#1f1f26', left: '#18181d', right: '#121216' };
const WEEKEND_SHADES: Shades = { top: '#18181d', left: '#141418', right: '#0f0f12' };
const LIT_SHADES: Shades = { top: '#3ddc97', left: '#22a06b', right: '#167a50' };

function Solid({ shape, shades, topFill, topStroke }: { shape: Prism; shades: Shades; topFill?: string; topStroke?: string }) {
  return (
    <>
      {shape.sides.map((s, i) => (
        <path key={i} d={s.d} fill={s.fill} stroke={s.fill} strokeWidth={0.6} strokeLinejoin="round" />
      ))}
      <polygon
        points={shape.top}
        fill={topFill ?? shades.top}
        stroke={topStroke ?? 'rgba(255,255,255,0.06)'}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </>
  );
}

// Shapes built once at the origin and moved with translate().
const PUCK = prism(circle(1.0), 0, 0.3, PUCK_SHADES);
const CARD_SHAPE = prism(roundedRect(-CARD.hx, CARD.hx, -CARD.hy, CARD.hy, 0.28), 0, CARD.h, CARD_SHADES);
const LIT_CELL = prism(roundedRect(-CELL, CELL, -CELL, CELL, 0.12, 4), 0, 0.14, LIT_SHADES);

// ── Static scenery ───────────────────────────────────────────
const Scenery = memo(function Scenery({ layer }: { layer: 'ground' | 'structures' }) {
  const engine = prism(roundedRect(-ENGINE.half, ENGINE.half, -ENGINE.half, ENGINE.half, 0.6), 0, ENGINE.height, ENGINE_SHADES);
  const disc = prism(circle(1.6, 40), ENGINE.height, ENGINE.height + 0.14, { top: '#0b0b0d', left: '#18181d', right: '#101013' });
  const belt = prism(roundedRect(BELT_X[0], BELT_X[1], -BELT_Y, BELT_Y, 0.25), 0, BELT_Z, SLAB_SHADES);
  const plate = prism(roundedRect(CAL.x0, CAL.x1, CAL.y0, CAL.y1, 0.45), 0, CAL.z, SLAB_SHADES);

  const cells = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 7; j++) {
      const [X, Y] = iso(cellX(i), cellY(j), CAL.z);
      const shades = j >= 5 ? WEEKEND_SHADES : CELL_SHADES;
      cells.push({ key: `${i}-${j}`, depth: cellX(i) + cellY(j), X, Y, shape: prism(roundedRect(-CELL, CELL, -CELL, CELL, 0.12, 4), 0, 0.06, shades), shades });
    }
  }
  cells.sort((a, b) => a.depth - b.depth);

  const gridLines = [];
  for (let x = -20; x <= 18; x++) gridLines.push(`M${polygon([iso(x, -12)])}L${polygon([iso(x, 14)])}`);
  for (let y = -12; y <= 14; y++) gridLines.push(`M${polygon([iso(-20, y)])}L${polygon([iso(18, y)])}`);

  const [gx, gy] = iso(0, 0);
  const [cgx, cgy] = iso((CAL.x0 + CAL.x1) / 2, (CAL.y0 + CAL.y1) / 2);

  if (layer === 'ground') return (
    <>
      {/* Ground grid, fading out from the engine */}
      <g mask="url(#flow-grid-fade)" stroke="rgba(255,255,255,0.045)" strokeWidth={1}>
        {gridLines.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* Lanes: green dots drifting toward the engine */}
      {LANES.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill="none" stroke={GREEN} strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" strokeDasharray="0 7" className="flow-dash" />
        </g>
      ))}

      {/* Glow + shadow under the engine and calendar */}
      <ellipse cx={gx} cy={gy + 10} rx={220} ry={110} fill="url(#flow-engine-glow)" />
      <ellipse cx={gx + 8} cy={gy + 16} rx={135} ry={70} fill="rgba(0,0,0,0.55)" filter="url(#flow-soft)" />
      <ellipse cx={cgx} cy={cgy + 12} rx={175} ry={95} fill="rgba(0,0,0,0.5)" filter="url(#flow-soft)" />
    </>
  );

  return (
    <>

      {/* Engine */}
      <polygon points={engine.top} fill="none" stroke="#8b5cf6" strokeWidth={6} strokeOpacity={0.09} filter="url(#flow-glow)" />
      <Solid shape={engine} shades={ENGINE_SHADES} topStroke="rgba(167,139,250,0.3)" />
      <g transform={onTop(0, 0, ENGINE.height)}>
        <rect x={-240} y={-240} width={480} height={480} rx={56} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </g>
      <polygon points={disc.top} fill="none" stroke="#8b5cf6" strokeWidth={8} strokeOpacity={0.15} filter="url(#flow-glow)" />
      <Solid shape={disc} shades={ENGINE_SHADES} topFill="#0b0b0d" topStroke="#a78bfa" />
      <g transform={onTop(0, 0, ENGINE.height + 0.14)}>
        <g transform="translate(-82 -76) scale(6.3)">
          <path d={SPOTFLOW_LOGO_PATH} fill="#ffffff" />
        </g>
      </g>
      {/* Exit port (front-right wall) */}
      <g transform={onFrontRight(ENGINE.half, 0, ENGINE.height)}>
        <rect x={-150} y={22} width={300} height={68} rx={16} fill="#060608" />
      </g>

      {/* Calendar */}
      <Solid shape={plate} shades={SLAB_SHADES} />
      {cells.map((c) => (
        <g key={c.key} transform={`translate(${c.X.toFixed(1)} ${c.Y.toFixed(1)})`}>
          <Solid shape={c.shape} shades={c.shades} topStroke="rgba(255,255,255,0.04)" />
        </g>
      ))}
      {/* Belt */}
      <Solid shape={belt} shades={SLAB_SHADES} />
      {[-BELT_Y + 0.3, BELT_Y - 0.3].map((y) => (
        <path key={y} d={`M${polygon([iso(BELT_X[0] + 0.2, y, BELT_Z)])}L${polygon([iso(BELT_X[1] - 0.2, y, BELT_Z)])}`} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      <path
        d={`M${polygon([iso(BELT_X[0] + 0.3, 0, BELT_Z)])}L${polygon([iso(BELT_X[1] - 0.3, 0, BELT_Z)])}`}
        stroke={GREEN} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" strokeDasharray="0 7" className="flow-dash"
      />

    </>
  );
});

// ── Moving parts ─────────────────────────────────────────────
function Frame({ t, avatars, layer }: { t: number; avatars: string[]; layer: 'walkers' | 'overlay' }) {
  // Engine pulse: each arrival flashes the disc and sends a ripple out.
  const lastArrival = Math.floor(t / GAP) * GAP;
  const sinceArrival = t - lastArrival;
  const pulse = Math.exp(-sinceArrival / 0.45);
  const lastEmit = Math.floor((t - PROCESS) / GAP) * GAP + PROCESS;
  const emitGlow = Math.exp(-(t - lastEmit) / 0.5);

  // Teammates on their way in.
  const walkers = [];
  for (let n = Math.ceil(t / GAP); n <= Math.floor((t + TRAVEL) / GAP); n++) {
    const p = 1 - (n * GAP - t) / TRAVEL;
    const at = LANES[mod(n, LANES.length)].at(p);
    const shrink = p > 0.92 ? 1 - (p - 0.92) / 0.08 : 1;
    walkers.push({ n, p, ...at, scale: 0.55 + 0.45 * shrink, opacity: clamp01(p / 0.06) * clamp01(shrink * 1.4) });
  }
  walkers.sort((a, b) => a.depth - b.depth);

  // Approved cards on the belt or hopping onto the calendar.
  const cards = [];
  const firstCard = Math.floor((t - PROCESS - BELT - LAND) / GAP);
  for (let n = firstCard; n <= Math.floor((t - PROCESS) / GAP); n++) {
    const age = t - (n * GAP + PROCESS);
    if (age < 0 || age > BELT + LAND) continue;
    const [row, col, days] = SLOT_LAYOUT[mod(n, SLOTS)];
    let x: number, y: number, z: number, scale = 1, opacity = 1;
    if (age <= BELT) {
      x = BELT_X[0] + CARD.hx + (BELT_X[1] - 0.2 - 2 * CARD.hx - BELT_X[0]) * (age / BELT);
      y = 0;
      z = BELT_Z;
      const appear = clamp01(age / 0.3);
      scale = 0.7 + 0.3 * appear;
      opacity = appear;
    } else {
      const h = easeInOut((age - BELT) / LAND);
      const tx = cellX(row);
      const ty = (cellY(col) + cellY(col + days - 1)) / 2;
      x = BELT_X[1] - 0.2 - CARD.hx + (tx - (BELT_X[1] - 0.2 - CARD.hx)) * h;
      y = ty * h;
      z = BELT_Z + (CAL.z + 0.1 - BELT_Z) * h + Math.sin(Math.PI * h) * 2.2;
      scale = 1 - 0.5 * h;
      opacity = 1 - clamp01((h - 0.55) / 0.45);
    }
    cards.push({ n, x, y, z, scale, opacity, days });
  }

  // Calendar: days light up as cards land; the month clears and starts again.
  const landedAt = (n: number) => n * GAP + PROCESS + BELT + LAND * 0.85;
  const latest = Math.floor((t - PROCESS - BELT - LAND * 0.85) / GAP);
  const month = Math.floor(latest / SLOTS);
  const lit = [];
  for (let s = 0; s < SLOTS; s++) {
    const [row, col, days] = SLOT_LAYOUT[s];
    const n = month * SLOTS + s;
    for (let k = 0; k < days; k++) {
      let level: number;
      if (n <= latest) {
        level = clamp01((t - landedAt(n) - k * 0.08) / 0.3);
      } else {
        level = 1 - clamp01((t - landedAt(month * SLOTS)) / 0.6); // previous month fading out
        if (month === 0) level = 0;
      }
      if (level > 0.01) {
        const [X, Y] = iso(cellX(row), cellY(col + k), CAL.z);
        lit.push({ key: `${row}-${col + k}`, X, Y, level, depth: cellX(row) + cellY(col + k) });
      }
    }
  }
  lit.sort((a, b) => a.depth - b.depth);

  if (layer === 'walkers') return (
    <>
      {/* Teammates */}
      {walkers.map((w) => {
        const type = TYPES[mod(w.n, TYPES.length)];
        const chip = clamp01((w.p - 0.08) / 0.06) * clamp01((0.86 - w.p) / 0.06);
        const chipW = type.label.length * 5.6 + 26;
        return (
          <g key={w.n} transform={`translate(${w.X.toFixed(1)} ${w.Y.toFixed(1)})`} opacity={w.opacity}>
            <g transform={`scale(${w.scale.toFixed(3)})`}>
              <ellipse cx={3} cy={6} rx={34} ry={18} fill="rgba(0,0,0,0.45)" />
              <Solid shape={PUCK} shades={PUCK_SHADES} topStroke="rgba(61,220,151,0.45)" />
              <g transform={onTop(0, 0, 0.3)}>
                <image href={avatars[mod(w.n, NAMES.length)]} x={-72} y={-72} width={144} height={144} />
              </g>
            </g>
            {chip > 0.01 && (
              <g transform={`translate(0 ${-40 - Math.sin(w.p * 40) * 1.5})`} opacity={chip}>
                <rect x={-chipW / 2} y={-10} width={chipW} height={20} rx={10} fill="#121217" stroke="rgba(255,255,255,0.09)" />
                <circle cx={-chipW / 2 + 10} cy={0} r={3} fill={type.color} />
                <text x={-chipW / 2 + 17} y={3.5} fontSize={10} fontWeight={500} fill="rgba(255,255,255,0.8)">{type.label}</text>
              </g>
            )}
          </g>
        );
      })}
    </>
  );

  return (
    <>
      {/* Engine pulse */}
      <g transform={onTop(0, 0, ENGINE.height + 0.14)} pointerEvents="none">
        <circle r={160} fill="#8b5cf6" opacity={0.05 * pulse} />
        <circle r={160 + sinceArrival * 170} fill="none" stroke="#c4b5fd" strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.15 * clamp01(1 - sinceArrival / 0.9)} />
      </g>
      <g transform={onFrontRight(ENGINE.half, 0, ENGINE.height)}>
        <rect x={-150} y={22} width={300} height={68} rx={16} fill={GREEN} opacity={0.45 * emitGlow} />
      </g>

      {/* Lit calendar days */}
      {lit.map((c) => (
        <g key={c.key} transform={`translate(${c.X.toFixed(1)} ${c.Y.toFixed(1)})`} opacity={c.level}>
          <Solid shape={LIT_CELL} shades={LIT_SHADES} topStroke="rgba(255,255,255,0.35)" />
        </g>
      ))}

      {/* Cards */}
      {cards.map((c) => {
        const [X, Y] = iso(c.x, c.y, c.z);
        const name = NAMES[mod(c.n, NAMES.length)];
        const type = TYPES[mod(c.n, TYPES.length)];
        return (
          <g key={c.n} transform={`translate(${X.toFixed(1)} ${Y.toFixed(1)}) scale(${c.scale.toFixed(3)})`} opacity={c.opacity}>
            <Solid shape={CARD_SHAPE} shades={CARD_SHADES} topStroke="rgba(61,220,151,0.35)" />
            <g transform={onTop(0, 0, CARD.h)}>
              <rect x={-112} y={-136} width={112} height={34} rx={17} fill="rgba(61,220,151,0.16)" stroke="rgba(61,220,151,0.55)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
              <text x={-56} y={-113} textAnchor="middle" fontSize={17} fontWeight={600} fill={GREEN}>Approved</text>
              <text x={112} y={-113} textAnchor="end" fontSize={17} fill="rgba(255,255,255,0.5)">{c.days} day{c.days > 1 ? 's' : ''}</text>
              <image href={avatars[mod(c.n, NAMES.length)]} x={-114} y={-82} width={56} height={56} />
              <text x={-46} y={-52} fontSize={23} fontWeight={600} fill="#f4f4f5">{name.split(' ')[0]}</text>
              <text x={-46} y={-28} fontSize={16} fill="rgba(255,255,255,0.45)">{type.long}</text>
              <rect x={-112} y={14} width={190} height={13} rx={6.5} fill="rgba(255,255,255,0.07)" />
              <rect x={-112} y={42} width={130} height={13} rx={6.5} fill="rgba(255,255,255,0.05)" />
              <circle cx={88} cy={110} r={19} fill="none" stroke={GREEN} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
              <path d="M79 110 l6.5 6.5 l12 -13" fill="none" stroke={GREEN} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        );
      })}

    </>
  );
}

export default function FlowEngine({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { margin: '120px' });
  const reduceMotion = useReducedMotion();
  const [t, setT] = useState(START);

  const avatars = useMemo(() => NAMES.map((n) => blobatarUri(n, { background: false })), []);

  useAnimationFrame((_, delta) => {
    if (!inView || reduceMotion) return;
    setT((prev) => prev + Math.min(delta, 64) / 1000);
  });

  return (
    <svg
      ref={ref}
      viewBox="-600 -180 1260 470"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Illustration: teammates' leave requests flow into the Spotflow engine, come out approved, and land on the team calendar."
    >
      <defs>
        <radialGradient id="flow-engine-glow">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="flow-grid-fade-g" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id="flow-grid-fade" maskUnits="userSpaceOnUse" x={-600} y={-180} width={1260} height={470}>
          <rect x={-600} y={-180} width={1260} height={470} fill="url(#flow-grid-fade-g)" />
        </mask>
        <filter id="flow-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
        <filter id="flow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      <Scenery layer="ground" />
      <Frame t={t} avatars={avatars} layer="walkers" />
      <Scenery layer="structures" />
      <Frame t={t} avatars={avatars} layer="overlay" />
    </svg>
  );
}
