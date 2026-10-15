'use client';
/**
 * Four steps on a liquid track: a goo droplet travels down the markers and
 * merges with whichever step is active. Beside it, the requester (a living
 * blob) reacts while their request card changes state.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Liquid } from 'liquid-gooey';
import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import { happy, idle, surprised, type Expression } from 'blobatar/expression';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';
import { CalendarCheck, CheckCircle2, FilePlus2, UserRoundCheck } from 'lucide-react';

const STEP = 104;   // approximate row pitch until the real rows are measured
const MARKER = 44;  // marker diameter
const DROP = 56;    // travelling droplet diameter
const ADVANCE_MS = 3600;

const STEPS = [
  {
    title: 'Request',
    body: 'Pick your dates. Weekends and public holidays are skipped automatically, and you see your balance before you submit.',
    icon: FilePlus2,
    expression: idle,
  },
  {
    title: 'Review',
    body: 'It goes straight to whoever approves for your team. Engineering requests get a second look from the Engineering Manager.',
    icon: UserRoundCheck,
    expression: surprised,
  },
  {
    title: 'Approved',
    body: 'You get an email the moment it’s decided, with any note from your manager.',
    icon: CheckCircle2,
    expression: happy,
  },
  {
    title: 'Synced',
    body: 'Approved leave lands on your Google Calendar and the team calendar. Cancel before it starts and it’s removed.',
    icon: CalendarCheck,
    expression: happy,
  },
];

function RequestCard({ step }: { step: number }) {
  const status = [
    { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'border-amber-400/25 bg-amber-400/10' },
    { label: 'With Tunde · Line manager', dot: 'bg-violet-400', text: 'text-violet-300', ring: 'border-violet-400/25 bg-violet-400/10' },
    { label: 'Approved', dot: 'bg-[#3ddc97]', text: 'text-[#3ddc97]', ring: 'border-[#3ddc97]/30 bg-[#3ddc97]/10' },
    { label: 'On your calendar', dot: 'bg-[#3ddc97]', text: 'text-[#3ddc97]', ring: 'border-[#3ddc97]/30 bg-[#3ddc97]/10' },
  ][step];

  return (
    <div className="w-full rounded-2xl border border-white/[0.07] bg-[#141418] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-zinc-100">Annual leave</p>
          <p className="mt-1 text-[13px] text-zinc-500">Wed 18 – Fri 20 Nov · 3 working days</p>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status.label}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status.ring} ${status.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
          const booked = i >= 2 && i <= 4;
          const synced = step === 3 && booked;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-zinc-600">{d}</span>
              <motion.span
                className="h-7 w-full rounded-md border"
                animate={{
                  backgroundColor: synced ? 'rgba(61,220,151,0.85)' : booked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  borderColor: synced ? 'rgba(61,220,151,0.9)' : booked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                }}
                transition={{ delay: synced ? (i - 2) * 0.08 : 0, duration: 0.35 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Ada, the requester. Click her and she wakes up: her eyes lock on to the
 * cursor and her head turns to follow it. Click again (or press Esc) and she
 * goes back to glancing around on her own.
 */
function WatchingBlob({ expression }: { expression: Expression }) {
  const head = useRef<HTMLButtonElement>(null);
  const [watching, setWatching] = useState(false);
  const { ref: eyes, lookAt } = useGaze({ travel: 4 });
  const spring = { stiffness: 140, damping: 16, mass: 0.6 };
  const turnX = useSpring(0, spring);
  const turnY = useSpring(0, spring);
  const rotateY = useTransform(turnX, (v) => v * 22);
  const rotateX = useTransform(turnY, (v) => v * -16);
  const x = useTransform(turnX, (v) => v * 7);
  const y = useTransform(turnY, (v) => v * 5);

  useEffect(() => {
    lookAt(watching ? 'pointer' : null);
    if (!watching) {
      turnX.set(0);
      turnY.set(0);
      return;
    }
    // Turn towards the cursor: the direction sets which way she faces, and
    // the distance how far (all the way once it's ~400px off).
    const onMove = (e: PointerEvent) => {
      const r = head.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 400);
      turnX.set((dx / dist) * reach);
      turnY.set((dy / dist) * reach);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setWatching(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [watching, lookAt, turnX, turnY]);

  return (
    <div style={{ perspective: 600 }}>
      <motion.button
        ref={head}
        type="button"
        onClick={() => setWatching((w) => !w)}
        aria-pressed={watching}
        aria-label={watching ? 'Stop Ada watching the cursor' : 'Wake Ada up'}
        style={{ x, y, rotateX, rotateY }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        className="relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60"
      >
        <span aria-hidden="true" className="absolute inset-0 -z-10 scale-125 rounded-full bg-[#3ddc97]/10 blur-2xl" />
        <Blobatar ref={eyes} name="Ada Okafor" size={116} background={false} animate="always" expression={expression} title="Ada, the requester" />
      </motion.button>
    </div>
  );
}

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Markers line up with each step's text, which wraps differently per screen width.
  const listRef = useRef<HTMLOListElement>(null);
  const [tops, setTops] = useState(() => STEPS.map((_, i) => i * STEP));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () =>
      setTops(Array.from(list.children, (li) => (li as HTMLElement).offsetTop));
    measure();
    // Re-measure when any step reflows (resize, or the web font swapping in).
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    Array.from(list.children).forEach((li) => ro.observe(li));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduceMotion || paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), ADVANCE_MS);
    return () => clearInterval(id);
  }, [inView, reduceMotion, paused]);

  const select = (i: number) => {
    setActive(i);
    setPaused(true);
  };

  return (
    <section id="how-it-works" ref={ref} className="relative scroll-mt-24 px-4 pb-28 pt-10 sm:pb-36 sm:pt-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-[13px] font-medium text-[#3ddc97]">How it works</p>
        <h2 className="mt-3 max-w-xl text-[clamp(30px,4vw,44px)] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-100">
          From request to calendar, without the back-and-forth.
        </h2>

        <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_420px] lg:items-center">
          {/* Liquid step track: each marker sits in its step's row, so markers
              line up with the text even before JavaScript runs. Only the
              travelling droplet needs the measured row offsets. */}
          <Liquid
            blur={10}
            contrast={22}
            fill="#1d1d24"
            shadow="inset 0 1px 0 rgba(255,255,255,0.09), 0 0 0 1px rgba(255,255,255,0.05)"
            className="relative"
          >
            <Liquid.Item effect="move" move={{ springiness: 0.45, wobble: 0.55, trail: 0.6 }}>
              <div
                className="absolute left-0 top-0 rounded-full"
                style={{
                  width: DROP,
                  height: DROP,
                  transform: `translateY(${tops[active]}px)`,
                  transition: reduceMotion ? 'none' : 'transform 650ms cubic-bezier(0.65, 0, 0.25, 1)',
                }}
              />
            </Liquid.Item>

            <ol ref={listRef} className="flex flex-col gap-7">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const on = i === active;
                return (
                  <li key={s.title} className="grid grid-cols-[56px_1fr] gap-x-6">
                    <div className="flex h-14 w-14 items-center justify-center">
                      {/* Plain items are measured from their wrapper, so size the item itself. */}
                      <Liquid.Item className="rounded-full" style={{ width: MARKER, height: MARKER }}>
                        <button
                          type="button"
                          onClick={() => select(i)}
                          aria-label={`Step ${i + 1}: ${s.title}`}
                          aria-current={on ? 'step' : undefined}
                          className="flex h-full w-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/70"
                        >
                          <Icon className={`h-[18px] w-[18px] transition-colors duration-300 ${on ? 'text-[#3ddc97]' : 'text-zinc-500'}`} />
                        </button>
                      </Liquid.Item>
                    </div>
                    <button type="button" onClick={() => select(i)} className="group pt-1 text-left outline-none" tabIndex={-1}>
                      <span className={`block text-[15px] font-semibold transition-colors ${on ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                        {s.title}
                      </span>
                      <span className={`mt-1 block max-w-md text-[14px] leading-relaxed transition-colors ${on ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {s.body}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Liquid>

          {/* The requester and their request */}
          <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-white/[0.06] bg-[#101013] p-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-3xl bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.04),transparent_70%)]" />
            <WatchingBlob expression={STEPS[active].expression} />
            <RequestCard step={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
