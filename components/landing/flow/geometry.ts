/**
 * Isometric geometry for the landing-page flow engine.
 *
 * World units are "grid" units on the ground plane (x runs down-right on
 * screen, y runs down-left, z is up). One fixed 30° isometric camera, no
 * perspective, so parallel edges stay parallel and the projection is affine:
 * translating in the world is translating on screen, and Bézier control
 * points can be projected directly.
 */

export const U = 28; // px per grid unit
export const C = U * Math.cos(Math.PI / 6);
export const S = U * 0.5;
export const H = U;

export type Vec2 = [number, number];

export function iso(x: number, y: number, z = 0): Vec2 {
  return [(x - y) * C, (x + y) * S - z * H];
}

const f = (n: number) => n.toFixed(1);

export function polygon(points: Vec2[]): string {
  return points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
}

/** Rounded rectangle outline on the ground plane (grid coordinates). */
export function roundedRect(x0: number, x1: number, y0: number, y1: number, r: number, seg = 6): Vec2[] {
  const corners: [number, number, number][] = [
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
    [x1 - r, y0 + r, 270],
  ];
  const out: Vec2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((start + (90 * i) / seg) * Math.PI) / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return out;
}

export function circle(r: number, seg = 32): Vec2[] {
  return Array.from({ length: seg }, (_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return [r * Math.cos(a), r * Math.sin(a)] as Vec2;
  });
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(ar, br)},${m(ag, bg)},${m(ab, bb)})`;
}

export interface Shades {
  top: string;
  left: string;  // faces pointing +y (front-left)
  right: string; // faces pointing +x (front-right)
}

export interface Prism {
  sides: { d: string; fill: string }[];
  top: string;
}

/**
 * Extrude a convex ground outline from z0 to z1. Returns the visible side
 * quads (shaded by which way they face) and the top polygon, ready to paint
 * back-to-front.
 */
export function prism(outline: Vec2[], z0: number, z1: number, shades: Shades): Prism {
  const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length;
  const cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
  const sides: Prism['sides'] = [];

  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    let nx = b[1] - a[1];
    let ny = a[0] - b[0];
    const mx = (a[0] + b[0]) / 2 - cx;
    const my = (a[1] + b[1]) / 2 - cy;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    if (nx + ny <= 0.01) continue; // faces away from the camera

    const towardRight = Math.min(1, Math.max(0, (nx - ny + 1) / 2));
    const quad = [iso(a[0], a[1], z1), iso(b[0], b[1], z1), iso(b[0], b[1], z0), iso(a[0], a[1], z0)];
    sides.push({ d: `M${polygon(quad).replaceAll(' ', 'L')}Z`, fill: mix(shades.left, shades.right, towardRight) });
  }

  return { sides, top: polygon(outline.map(([x, y]) => iso(x, y, z1))) };
}

/**
 * SVG transforms that lay flat 2D content onto a plane. Content is authored
 * in 1/100 grid units, so a 100×100 square covers one grid cell.
 */
export function onTop(x: number, y: number, z: number): string {
  const [X, Y] = iso(x, y, z);
  return `matrix(${C / 100} ${S / 100} ${-C / 100} ${S / 100} ${f(X)} ${f(Y)})`;
}

/** Plane facing +y (front-left wall): u runs along +x, v runs down. */
export function onFrontLeft(x: number, y: number, z: number): string {
  const [X, Y] = iso(x, y, z);
  return `matrix(${C / 100} ${S / 100} 0 ${H / 100} ${f(X)} ${f(Y)})`;
}

/** Plane facing +x (front-right wall): u runs along −y, v runs down. */
export function onFrontRight(x: number, y: number, z: number): string {
  const [X, Y] = iso(x, y, z);
  return `matrix(${C / 100} ${-S / 100} 0 ${H / 100} ${f(X)} ${f(Y)})`;
}

// ── Paths ──────────────────────────────────────────────────────

type Segment =
  | { kind: 'line'; to: Vec2 }
  | { kind: 'cubic'; c1: Vec2; c2: Vec2; to: Vec2 };

export interface Lane {
  d: string;
  /** Point at progress 0..1 by arc length: screen position + ground depth (x+y). */
  at: (p: number) => { X: number; Y: number; depth: number };
}

/** A ground-plane path sampled by arc length so movers keep an even pace. */
export function lane(start: Vec2, segments: Segment[]): Lane {
  const samples: { g: Vec2; s: Vec2 }[] = [];
  let cur = start;
  let d = `M${polygon([iso(...start)])}`;

  const push = (g: Vec2) => samples.push({ g, s: iso(g[0], g[1]) });
  push(start);

  for (const seg of segments) {
    if (seg.kind === 'line') {
      for (let i = 1; i <= 20; i++) {
        const t = i / 20;
        push([cur[0] + (seg.to[0] - cur[0]) * t, cur[1] + (seg.to[1] - cur[1]) * t]);
      }
      d += `L${polygon([iso(...seg.to)])}`;
    } else {
      const p0 = cur;
      for (let i = 1; i <= 60; i++) {
        const t = i / 60;
        const u = 1 - t;
        const b = (k: 0 | 1) =>
          u * u * u * p0[k] + 3 * u * u * t * seg.c1[k] + 3 * u * t * t * seg.c2[k] + t * t * t * seg.to[k];
        push([b(0), b(1)]);
      }
      d += `C${polygon([iso(...seg.c1), iso(...seg.c2), iso(...seg.to)])}`;
    }
    cur = seg.to;
  }

  const lengths = [0];
  for (let i = 1; i < samples.length; i++) {
    const [ax, ay] = samples[i - 1].s;
    const [bx, by] = samples[i].s;
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = lengths[lengths.length - 1];

  return {
    d,
    at(p) {
      const target = Math.min(1, Math.max(0, p)) * total;
      let lo = 0;
      let hi = lengths.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (lengths[mid] < target) lo = mid; else hi = mid;
      }
      const span = lengths[hi] - lengths[lo] || 1;
      const t = (target - lengths[lo]) / span;
      const a = samples[lo];
      const b = samples[hi];
      return {
        X: a.s[0] + (b.s[0] - a.s[0]) * t,
        Y: a.s[1] + (b.s[1] - a.s[1]) * t,
        depth: a.g[0] + a.g[1] + (b.g[0] + b.g[1] - a.g[0] - a.g[1]) * t,
      };
    },
  };
}
