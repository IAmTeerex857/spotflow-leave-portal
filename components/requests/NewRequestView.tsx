'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, CalendarOff, FileText, MapPin, Send, Thermometer, User } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { inputClass, labelClass } from '@/components/ui/form';
import DateRangePicker from '@/components/ui/DateRangePicker';
import ColleaguePicker, { type Colleague } from '@/components/ui/ColleaguePicker';
import { countWorkingDays, holidaysBetween, useHolidays } from '@/lib/public-holidays';
import { LEAVE_TYPES, formatDate } from '@/lib/leave';
import type { LeaveBalance } from '@/lib/leave-balance';

export interface NewRequestValues {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  cover_notes: string;
  cover_person_email: string;
}

const TYPE_ICON: Record<string, typeof MapPin> = { annual: MapPin, sick: Thermometer, personal: User, other: FileText };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function NewRequestView({ balance, colleagues, booked, onSubmit }: {
  balance: LeaveBalance | null;
  /** People who can be named as cover. */
  colleagues: Colleague[];
  /** The requester's existing active leave, which can't overlap. */
  booked: { start_date: string; end_date: string }[];
  /** Returns an error message, or null once the request is saved. */
  onSubmit: (values: NewRequestValues) => Promise<string | null>;
}) {
  const holidays = useHolidays();
  const [v, setV] = useState<NewRequestValues>({ leave_type: 'annual', start_date: '', end_date: '', reason: '', cover_notes: '', cover_person_email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const days = countWorkingDays(v.start_date, v.end_date, holidays);
  const skipped = holidaysBetween(v.start_date, v.end_date, holidays);
  const available = balance ? Math.max(0, balance.allowance - balance.used - balance.pending) : null;
  const exceeds = available !== null && days > available;
  const canSubmit = days > 0 && !!v.reason.trim() && !exceeds && !submitting;

  const set = (k: keyof NewRequestValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setV((prev) => ({ ...prev, [k]: value, ...(k === 'start_date' && prev.end_date && prev.end_date < value ? { end_date: value } : {}) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const err = await onSubmit(v);
    if (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const pct = (n: number) => `${balance ? Math.min(100, (n / Math.max(balance.allowance, 1)) * 100) : 0}%`;

  return (
    <AppShell>
      <PageHeader title="New leave request" subtitle="Weekends and public holidays are skipped automatically" back={{ href: '/dashboard', label: 'Back to dashboard' }} />
      <PageBody>
        <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6 rounded-2xl border border-white/[0.06] bg-[#111114] p-5 sm:p-6">
            {error && (
              <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-300">{error}</p>
            )}

            <fieldset>
              <legend className={labelClass}>Leave type</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LEAVE_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t.value];
                  const on = v.leave_type === t.value;
                  return (
                    <label
                      key={t.value}
                      className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors ${
                        on ? 'border-[#3ddc97]/40 bg-[#3ddc97]/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="leave-type"
                        value={t.value}
                        checked={on}
                        onChange={() => setV((prev) => ({ ...prev, leave_type: t.value }))}
                        className="peer sr-only"
                      />
                      <Icon className={`h-4 w-4 ${on ? 'text-[#3ddc97]' : 'text-zinc-500'}`} strokeWidth={1.8} />
                      <span className={`text-[13px] font-medium ${on ? 'text-zinc-100' : 'text-zinc-400'}`}>{t.label}</span>
                      <span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-[#3ddc97]/60" />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="leave-dates" className={labelClass}>Dates</label>
              <DateRangePicker
                id="leave-dates"
                start={v.start_date}
                end={v.end_date}
                onChange={(start_date, end_date) => setV((prev) => ({ ...prev, start_date, end_date }))}
                holidays={holidays}
                booked={booked}
              />
            </div>

            {/* On small screens the summary sits below the form, so echo the essentials here. */}
            {days > 0 && (
              <p className={`-mt-3 text-[13px] lg:hidden ${exceeds ? 'text-red-300' : 'text-zinc-400'}`}>
                <span className="font-semibold text-zinc-100">{plural(days, 'working day')}</span>
                {available !== null && (exceeds ? ` · ${days - available} over your balance` : ` · ${available - days} days left after`)}
                {skipped.length > 0 && <span className="text-amber-300/90"> · {plural(skipped.length, 'holiday')} skipped</span>}
              </p>
            )}

            <label className="block">
              <span className={labelClass}>Reason</span>
              <textarea required className={`${inputClass} min-h-[96px] resize-y`} placeholder="A short note for your approver" value={v.reason} onChange={set('reason')} />
            </label>

            <div className="rounded-xl border border-white/[0.06] p-4">
              <p className="text-[13px] font-medium text-zinc-300">Cover <span className="font-normal text-zinc-600">· optional</span></p>
              <div className="mt-3 grid gap-3">
                <div>
                  <label htmlFor="cover-person" className={labelClass}>Who&rsquo;s covering</label>
                  <ColleaguePicker
                    id="cover-person"
                    value={v.cover_person_email}
                    onChange={(email) => setV((prev) => ({ ...prev, cover_person_email: email }))}
                    colleagues={colleagues}
                  />
                  <span className="mt-1.5 block text-[12px] text-zinc-600">They get an email letting them know.</span>
                </div>
                <label className="block">
                  <span className={labelClass}>Handover notes</span>
                  <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="What they should keep an eye on" value={v.cover_notes} onChange={set('cover_notes')} />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
              <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100">
                Cancel
              </Link>
              <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting} icon={<Send className="h-3.5 w-3.5" />} arrow>
                Submit request
              </Button>
            </div>
          </div>

          {/* Live summary */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5">
              <p className="text-[12px] font-medium text-zinc-500">This request</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className={`text-[36px] font-semibold leading-none tracking-tight ${exceeds ? 'text-red-300' : 'text-zinc-100'}`}>
                  {days}
                </span>
                <span className="text-[13px] text-zinc-500">working {days === 1 ? 'day' : 'days'}</span>
              </p>
              <p className="mt-1 h-5 text-[13px] text-zinc-500">
                {v.start_date && v.end_date ? `${formatDate(v.start_date, 'EEE d MMM')} – ${formatDate(v.end_date, 'EEE d MMM yyyy')}` : 'Pick your dates'}
              </p>

              {skipped.length > 0 && (
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[12px] leading-relaxed text-amber-200/90">
                  <CalendarOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{plural(skipped.length, 'public holiday')} skipped: {skipped.map((h) => h.name).join(', ')}</span>
                </div>
              )}

              {balance && (
                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-zinc-500">Balance after this</span>
                    <span className={`font-semibold ${exceeds ? 'text-red-300' : 'text-zinc-200'}`}>
                      {exceeds ? `${days - (available ?? 0)} over` : `${(available ?? 0) - days} of ${balance.allowance} left`}
                    </span>
                  </div>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <span className="h-full bg-[#3ddc97]" style={{ width: pct(balance.used) }} />
                    <span className="h-full bg-violet-400/50" style={{ width: pct(balance.pending) }} />
                    <span className={`h-full ${exceeds ? 'bg-red-400/70' : 'bg-white/30'}`} style={{ width: pct(days) }} />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600">Used · pending · this request. Every leave type counts toward your {balance.allowance} days.</p>
                </div>
              )}

              {exceeds && (
                <p className="mt-4 flex gap-2 text-[12px] leading-relaxed text-red-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  You have {plural(available ?? 0, 'day')} available once pending requests are counted. Shorten the dates or talk to your manager.
                </p>
              )}
            </div>

          </aside>
        </form>
      </PageBody>
    </AppShell>
  );
}
