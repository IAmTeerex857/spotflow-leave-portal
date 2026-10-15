'use client';
import type { ReactNode } from 'react';
import { Blobatar } from '@blobatar/react';
import 'blobatar/motion.css';
import { TextLoader } from 'generative-loaders';
import 'generative-loaders/styles.css';

/** Centered text loader for a section that is fetching. */
export function SectionLoader({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`flex justify-center px-6 py-14 ${className}`}>
      <TextLoader text={text} variant="wave" color="#71717a" className="max-w-xs text-center text-[13px]" aria-label={text} />
    </div>
  );
}

/** Friendly empty state with a living blob. */
export function EmptyState({ title, body, action, seed = 'Spotflow leave' }: {
  title: string;
  body?: string;
  action?: ReactNode;
  seed?: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Blobatar name={seed} size={72} background={false} animate="always" />
      <p className="mt-5 text-[15px] font-semibold text-zinc-200">{title}</p>
      {body && <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-zinc-500">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
