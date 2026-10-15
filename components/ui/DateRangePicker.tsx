'use client';
/**
 * One field for a leave period: opens a calendar where you click the first
 * and last day. Weekends are dimmed, public holidays are marked, days you
 * already have leave on can't be picked, and working days update live.
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Check, CheckCheck, RotateCcw, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/shadcn/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import Button from '@/components/ui/Button';
import { countWorkingDays, holidaysBetween, type PublicHoliday } from '@/lib/public-holidays';
import { formatDate, parseDate } from '@/lib/leave';

const toStr = (d: Date) => format(d, 'yyyy-MM-dd');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

export function rangeLabel(start: string, end: string) {
  if (!start) return '';
  if (!end || end === start) return formatDate(start, 'EEE d MMM yyyy');
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, sameYear ? 'EEE d MMM' : 'EEE d MMM yyyy')} – ${formatDate(end, 'EEE d MMM yyyy')}`;
}

export default function DateRangePicker({ start, end, onChange, holidays, booked = [], id, invalid, defaultOpen = false }: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  holidays: PublicHoliday[];
  /** Leave you already have; those days can't be selected. */
  booked?: { start_date: string; end_date: string }[];
  id?: string;
  defaultOpen?: boolean;
  invalid?: boolean;
}) {
  const wide = useWide();
  const [open, setOpen] = useState(defaultOpen);
  const days = countWorkingDays(start, end || start, holidays);
  const skipped = holidaysBetween(start, end || start, holidays);

  const bookedRanges = booked.map((b) => ({ from: parseDate(b.start_date), to: parseDate(b.end_date) }));
  const holidayDates = holidays.map((h) => parseDate(h.date));
  const holidayName = new Map(holidays.map((h) => [h.date, h.name]));
  const selected: DateRange | undefined = start ? { from: parseDate(start), to: end ? parseDate(end) : undefined } : undefined;

  const select = (range: DateRange | undefined) => {
    if (!range?.from) return onChange('', '');
    onChange(toStr(range.from), range.to ? toStr(range.to) : toStr(range.from));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          className={`flex w-full items-center gap-2.5 rounded-lg border bg-[#0c0c0e] px-3 py-2.5 text-left text-[14px] outline-none transition-[border-color,box-shadow] hover:border-white/15 focus-visible:border-white/25 focus-visible:ring-4 focus-visible:ring-white/[0.04] ${
            invalid ? 'border-red-400/40' : open ? 'border-white/25' : 'border-white/[0.08]'
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" />
          <span className={`flex-1 truncate ${start ? 'text-zinc-100' : 'text-zinc-600'}`}>
            {start ? rangeLabel(start, end) : 'Pick your first and last day'}
          </span>
          {start && days > 0 && (
            <span className="shrink-0 rounded-full border border-[#3ddc97]/25 bg-[#3ddc97]/10 px-2 py-0.5 text-[11px] font-medium text-[#3ddc97]">
              {plural(days, 'day')}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="z-[400] w-auto border border-white/[0.08] bg-[#141418] p-0 ring-0">
        <Calendar
          mode="range"
          weekStartsOn={1}
          numberOfMonths={wide ? 2 : 1}
          defaultMonth={selected?.from ?? new Date()}
          selected={selected}
          onSelect={select}
          disabled={bookedRanges}
          excludeDisabled
          modifiers={{ holiday: holidayDates, weekend: { dayOfWeek: [0, 6] }, booked: bookedRanges }}
          modifiersClassNames={{
            weekend: '[&_button]:text-zinc-600',
            holiday: '[&_button]:text-amber-300 [&_button]:after:absolute [&_button]:after:bottom-1 [&_button]:after:h-1 [&_button]:after:w-1 [&_button]:after:rounded-full [&_button]:after:bg-amber-300',
            booked: '[&_button]:line-through [&_button]:opacity-40',
          }}
          // Selected days in the brand green; the in-between days a soft tint.
          className="bg-transparent p-3 [--muted:rgb(61_220_151/0.12)] [--primary-foreground:#0c0c0e] [--primary:#3ddc97] [--cell-size:--spacing(9)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <div className="min-w-0 text-[12px]">
            {start ? (
              <>
                <span className="font-semibold text-zinc-100">{plural(days, 'working day')}</span>
                {skipped.length > 0 && (
                  <span className="text-amber-300/90" title={skipped.map((h) => holidayName.get(h.date)).join(', ')}>
                    {' '}· {plural(skipped.length, 'holiday')} skipped
                  </span>
                )}
              </>
            ) : (
              <span className="text-zinc-500">Click your first day, then your last.</span>
            )}
          </div>
          <div className="flex gap-2">
            {start && (
              <Button size="sm" variant="ghost" icon={<X />} hoverIcon={<RotateCcw />} onClick={() => onChange('', '')}>Clear</Button>
            )}
            <Button size="sm" variant="primary" disabled={!start} icon={<Check />} hoverIcon={<CheckCheck />} onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
