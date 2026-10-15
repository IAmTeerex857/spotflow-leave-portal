'use client';
/** Pick a colleague from the directory (search by name or email). */

import { useState } from 'react';
import { ChevronsUpDown, UserRound, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import Avatar from '@/components/ui/Avatar';
import { teamLabel } from '@/lib/roles';

export interface Colleague {
  id: string;
  full_name: string;
  email: string;
  team: string;
}

export default function ColleaguePicker({ value, onChange, colleagues, id, placeholder = 'Choose a colleague', defaultOpen = false }: {
  /** Selected colleague's email, or '' for none. */
  value: string;
  onChange: (email: string) => void;
  colleagues: Colleague[];
  id?: string;
  defaultOpen?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const selected = colleagues.find((c) => c.email === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            className={`flex w-full items-center gap-2.5 rounded-lg border bg-[#0c0c0e] py-2 pl-2.5 pr-9 text-left text-[14px] outline-none transition-[border-color,box-shadow] hover:border-white/15 focus-visible:border-white/25 focus-visible:ring-4 focus-visible:ring-white/[0.04] ${open ? 'border-white/25' : 'border-white/[0.08]'}`}
          >
            {selected ? (
              <>
                <Avatar name={selected.full_name} size={24} />
                <span className="min-w-0 flex-1 truncate text-zinc-100">
                  {selected.full_name} <span className="text-zinc-500">· {selected.email}</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/15 text-zinc-600">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-zinc-600">{placeholder}</span>
              </>
            )}
          </button>
        </PopoverTrigger>
        {selected ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove cover person"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        )}
      </div>
      <PopoverContent align="start" sideOffset={6} className="z-[400] w-(--radix-popover-trigger-width) min-w-72 border border-white/[0.08] bg-[#141418] p-0 ring-0">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search by name or email" />
          <CommandList className="max-h-64">
            <CommandEmpty>No one matches that.</CommandEmpty>
            <CommandGroup>
              {colleagues.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.full_name} ${c.email}`}
                  data-checked={c.email === value}
                  onSelect={() => {
                    onChange(c.email);
                    setOpen(false);
                  }}
                  className="gap-2.5 py-2"
                >
                  <Avatar name={c.full_name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-zinc-100">{c.full_name}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{teamLabel(c.team)} · {c.email}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
