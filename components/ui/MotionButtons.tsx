'use client';
/**
 * Pill buttons with spring-animated icon swaps.
 * SlideButton: the leading icon slides out and an arrow slides in on hover/focus.
 * MorphButton: the icon morphs into a second icon on hover/focus.
 */

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const MotionLink = motion.create(Link);

const spring = { type: 'spring', stiffness: 600, damping: 25 } as const;

const VARIANTS = {
  glass:
    'h-9 px-5 text-[13px] text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06]',
  // Black, with the engine's violet glowing rim.
  primary:
    'h-11 px-6 text-[14px] text-white bg-[#09090b] border border-violet-400/30 shadow-[0_0_0_1px_rgba(139,92,246,0.045),0_0_22px_-2px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-violet-300/80 hover:bg-[#0e0e11]',
};

const BASE =
  'relative inline-flex items-center justify-center rounded-full font-medium tracking-tight cursor-pointer select-none transition-[background-color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0e]';

interface ButtonProps {
  href: string;
  label: string;
  icon: ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}

function useHover() {
  const [on, setOn] = useState(false);
  return {
    on,
    handlers: {
      onMouseEnter: () => setOn(true),
      onMouseLeave: () => setOn(false),
      onFocus: () => setOn(true),
      onBlur: () => setOn(false),
    },
  };
}

export function SlideButton({ href, label, icon, variant = 'glass', className = '' }: ButtonProps) {
  const { on, handlers } = useHover();

  return (
    <MotionLink
      href={href}
      {...handlers}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!on && (
          <motion.span
            key="lead"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={spring}
            className="mr-2.5 flex shrink-0 items-center"
            aria-hidden="true"
          >
            {icon}
          </motion.span>
        )}
      </AnimatePresence>
      <span>{label}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {on && (
          <motion.span
            key="arrow"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={spring}
            className="ml-2.5 flex shrink-0 items-center"
            aria-hidden="true"
          >
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </MotionLink>
  );
}

export function MorphButton({ href, label, icon, hoverIcon, variant = 'glass', className = '' }: ButtonProps & { hoverIcon: ReactNode }) {
  const { on, handlers } = useHover();

  return (
    <MotionLink
      href={href}
      {...handlers}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={on ? 'b' : 'a'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={spring}
            className="absolute inset-0 flex items-center justify-center"
          >
            {on ? hoverIcon : icon}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="ml-2.5">{label}</span>
    </MotionLink>
  );
}
