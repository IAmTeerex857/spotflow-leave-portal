import { Blobatar } from '@blobatar/react';

/** A person's blob avatar, generated from their name (same name, same blob). */
export default function Avatar({ name, size = 32, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Blobatar name={name || '?'} size={Math.round(size * 0.78)} background={false} alt="" />
    </span>
  );
}
