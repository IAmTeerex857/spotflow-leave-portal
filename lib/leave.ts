import { format } from 'date-fns';

export type LeaveStatus = 'pending' | 'pending_em_review' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
] as const;

export function leaveTypeLabel(type: string): string {
  return LEAVE_TYPES.find((t) => t.value === type)?.label ?? 'Leave';
}

/** Statuses that hold days against the allowance and block overlapping requests. */
export const ACTIVE_STATUSES: LeaveStatus[] = ['pending', 'pending_em_review', 'approved'];

/**
 * Parse a Postgres `date` (YYYY-MM-DD) as local midnight.
 * `new Date('2026-10-14')` is UTC midnight, which shows the previous day
 * anywhere west of UTC.
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Postgres `date` string without timezone drift. */
export function formatDate(dateStr: string, pattern = 'dd MMM yyyy'): string {
  return format(parseDate(dateStr), pattern);
}

/** Today as YYYY-MM-DD in local time. */
export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Supabase/PostgREST errors carry the database's message; fall back gracefully. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}
