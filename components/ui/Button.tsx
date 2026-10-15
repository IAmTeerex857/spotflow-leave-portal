'use client';
/**
 * App button with the amicro feel: spring scale on hover/press, and either
 * an icon that morphs into `hoverIcon`, or (with `arrow`) a leading icon
 * that slides out while an arrow slides in.
 */

import { forwardRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { InlineLoader } from 'generative-loaders';

const VARIANTS = {
  primary: 'bg-zinc-100 text-zinc-900 hover:bg-white border border-transparent',
  secondary: 'bg-white/[0.04] text-zinc-200 hover:bg-white/[0.07] border border-white/[0.07]',
  ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent',
  danger: 'bg-red-500/10 text-red-300 hover:bg-red-500/15 border border-red-400/20',
  success: 'bg-[#3ddc97]/10 text-[#3ddc97] hover:bg-[#3ddc97]/15 border border-[#3ddc97]/25',
};

const SIZES = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-9 px-4 text-[13px]',
};

const spring = { type: 'spring', stiffness: 600, damping: 25 } as const;

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  /** Icon to morph into on hover/focus. */
  hoverIcon?: ReactNode;
  /** Slide the icon out and an arrow in on hover/focus. */
  arrow?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, hoverIcon, arrow, loading, disabled, className = '', children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest },
  ref,
) {
  const [hot, setHot] = useState(false);
  const inactive = disabled || loading;
  const on = hot && !inactive;
  const gap = size === 'sm' ? 'mr-1.5' : 'mr-2';

  let lead: ReactNode = null;
  if (loading) {
    lead = <span className={`flex ${gap}`}><InlineLoader variant="orbit" size={14} color="currentColor" /></span>;
  } else if (icon && hoverIcon) {
    lead = (
      <span className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center ${gap}`} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={on ? 'hover' : 'rest'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={spring}
            className="absolute inset-0 flex items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5"
          >
            {on ? hoverIcon : icon}
          </motion.span>
        </AnimatePresence>
      </span>
    );
  } else if (icon) {
    lead = (
      <AnimatePresence mode="popLayout" initial={false}>
        {!(arrow && on) && (
          <motion.span
            key="lead"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={spring}
            className={`flex shrink-0 items-center [&>svg]:h-3.5 [&>svg]:w-3.5 ${gap}`}
            aria-hidden="true"
          >
            {icon}
          </motion.span>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.button
      ref={ref}
      disabled={inactive}
      whileHover={inactive ? undefined : { scale: 1.02 }}
      whileTap={inactive ? undefined : { scale: 0.96 }}
      transition={spring}
      onMouseEnter={(e) => { setHot(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHot(false); onMouseLeave?.(e); }}
      onFocus={(e) => { setHot(true); onFocus?.(e); }}
      onBlur={(e) => { setHot(false); onBlur?.(e); }}
      className={`relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {lead}
      <span>{children}</span>
      {arrow && (
        <AnimatePresence mode="popLayout" initial={false}>
          {on && (
            <motion.span
              key="arrow"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={spring}
              className="ml-2 flex shrink-0 items-center"
              aria-hidden="true"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </motion.button>
  );
});

export default Button;
