/**
 * Nigerian Public Holidays — 2025 & 2026
 * These dates are excluded from leave day counts (alongside weekends).
 */

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const PUBLIC_HOLIDAYS: PublicHoliday[] = [
  // ── 2025 ──────────────────────────────────────────
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-03-30', name: 'Eid al-Fitr' },
  { date: '2025-03-31', name: 'Eid al-Fitr (Holiday)' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-21', name: 'Easter Monday' },
  { date: '2025-05-01', name: "Workers' Day" },
  { date: '2025-06-06', name: 'Eid al-Adha' },
  { date: '2025-06-07', name: 'Eid al-Adha (Holiday)' },
  { date: '2025-06-12', name: 'Democracy Day' },
  { date: '2025-10-01', name: 'Independence Day' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-12-26', name: 'Boxing Day' },

  // ── 2026 ──────────────────────────────────────────
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-03-20', name: 'Eid al-Fitr' },
  { date: '2026-03-21', name: 'Eid al-Fitr (Holiday)' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-01', name: "Workers' Day" },
  { date: '2026-05-27', name: 'Eid al-Adha' },
  { date: '2026-05-28', name: 'Eid al-Adha (Holiday)' },
  { date: '2026-06-12', name: 'Democracy Day' },
  { date: '2026-10-01', name: 'Independence Day' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-26', name: 'Boxing Day' },
];

/** Set of holiday date strings for fast O(1) lookup */
const HOLIDAY_SET = new Set(PUBLIC_HOLIDAYS.map((h) => h.date));

/** Returns true if a date string (YYYY-MM-DD) is a public holiday */
export function isPublicHoliday(dateStr: string): boolean {
  return HOLIDAY_SET.has(dateStr);
}

/** Returns true if a date is a weekend (Saturday or Sunday) */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Counts working days between two dates (inclusive).
 * Excludes weekends and Nigerian public holidays.
 */
export function countWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current)) {
      const dateStr = current.toISOString().split('T')[0];
      if (!isPublicHoliday(dateStr)) {
        count++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Returns the name of a public holiday for a given date string, or null.
 */
export function getHolidayName(dateStr: string): string | null {
  const holiday = PUBLIC_HOLIDAYS.find((h) => h.date === dateStr);
  return holiday ? holiday.name : null;
}
