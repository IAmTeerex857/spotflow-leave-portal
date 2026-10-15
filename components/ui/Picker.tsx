'use client';
/** Styled single-choice dropdown (shadcn/Radix Select) for short option lists. */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

export default function Picker({ value, onChange, options, id, label, size = 'md', className = '' }: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  id?: string;
  /** Accessible name when there's no visible <label>. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className={`w-full rounded-lg border-white/[0.08] bg-[#0c0c0e] text-zinc-100 hover:border-white/15 data-[state=open]:border-white/25 dark:bg-[#0c0c0e] ${size === 'sm' ? 'h-9! text-[13px]' : 'h-[42px]! text-[14px]'} ${className}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className="z-[400] border border-white/[0.08] bg-[#141418] ring-0">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[13px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
