'use client';
/**
 * Public holidays are stored in the `public_holidays` table so they can be
 * updated without a deploy. The database computes the authoritative
 * `duration_days`; the helpers here only power live previews in forms.
 */

import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { parseDate } from '@/lib/leave';

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

  useEffect(() => {
    createClient()
      .from('public_holidays')
      .select('date, name')
      .order('date')
      .then(({ data }) => setHolidays(data ?? []));
  }, []);

  return holidays;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Working days between two YYYY-MM-DD dates (inclusive), excluding weekends and holidays. */
export function countWorkingDays(startDate: string, endDate: string, holidays: PublicHoliday[]): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const holidaySet = new Set(holidays.map((h) => h.date));
  const end = parseDate(endDate);
  let count = 0;
  for (let d = parseDate(startDate); d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d) && !holidaySet.has(format(d, 'yyyy-MM-dd'))) count++;
  }
  return count;
}

export function holidaysBetween(startDate: string, endDate: string, holidays: PublicHoliday[]): PublicHoliday[] {
  if (!startDate || !endDate) return [];
  return holidays.filter((h) => h.date >= startDate && h.date <= endDate);
}
