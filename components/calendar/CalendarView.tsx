'use client';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import { useHolidays } from '@/lib/public-holidays';
import { todayStr } from '@/lib/leave';

/** Row shape from team_calendar(): who is away, without reasons or leave type. */
export interface CalendarEntry {
  id: string;
  requester_id: string;
  full_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const first = (name: string) => name.split(' ')[0];

function Chip({ entry }: { entry: CalendarEntry }) {
  const pending = entry.status !== 'approved';
  return (
    <span
      title={`${entry.full_name}${pending ? ' (pending)' : ''}`}
      className={`flex min-w-0 items-center gap-1 rounded-md border px-1 py-0.5 text-[11px] ${
        pending ? 'border-dashed border-white/15 text-zinc-500' : 'border-[#3ddc97]/20 bg-[#3ddc97]/[0.07] text-zinc-200'
      }`}
    >
      <Avatar name={entry.full_name} size={14} className="!border-0 !bg-transparent" />
      <span className="truncate">{first(entry.full_name)}</span>
    </span>
  );
}

export default function CalendarView({ month, onMonthChange, entries, loading }: {
  month: Date;
  onMonthChange: (d: Date) => void;
  entries: CalendarEntry[];
  loading: boolean;
}) {
  const holidays = useHolidays();
  const holidayName = new Map(holidays.map((h) => [h.date, h.name]));
  const today = todayStr();
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const onDay = (date: string) => entries.filter((e) => e.start_date <= date && e.end_date >= date);
  const isWorkday = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
  const outToday = isSameMonth(new Date(), month) ? onDay(today).filter((e) => e.status === 'approved') : [];

  // Agenda for small screens: only working days with someone away (or a holiday).
  const agenda = days
    .filter((d) => isSameMonth(d, month))
    .map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return { d, key, holiday: holidayName.get(key), people: isWorkday(d) ? onDay(key) : [] };
    })
    .filter((a) => a.holiday || a.people.length > 0);

  return (
    <AppShell>
      <PageHeader
        width="max-w-6xl"
        title="Team calendar"
        subtitle="Who’s away, across Spotflow"
        actions={
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => onMonthChange(subMonths(month, 1))} aria-label="Previous month" className="!px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[116px] text-center text-[13px] font-semibold text-zinc-100">{format(month, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="sm" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month" className="!px-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" icon={<CalendarDays />} hoverIcon={<CalendarCheck />} onClick={() => onMonthChange(new Date())}>Today</Button>
          </div>
        }
      />
      <PageBody width="max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-h-8 flex-wrap items-center gap-2">
            {outToday.length > 0 ? (
              <>
                <span className="text-[12px] font-medium text-zinc-500">Out today</span>
                {outToday.map((e) => (
                  <span key={e.id} className="flex items-center gap-1.5 rounded-full border border-white/[0.07] py-0.5 pl-0.5 pr-2.5 text-[12px] text-zinc-300">
                    <Avatar name={e.full_name} size={22} />
                    {first(e.full_name)}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-[12px] text-zinc-500">{isSameMonth(new Date(), month) ? 'Everyone’s in today.' : ' '}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-[#3ddc97]/30 bg-[#3ddc97]/15" />Approved</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-white/25" />Pending</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400/25" />Public holiday</span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#111114]"><SectionLoader text="Loading the calendar" /></div>
        ) : (
          <>
            {/* Month grid (tablet and up) */}
            <div className="hidden overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114] md:block">
              <div className="grid grid-cols-7 border-b border-white/[0.06]">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-3 py-2.5 text-[11px] font-medium text-zinc-500">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const key = format(d, 'yyyy-MM-dd');
                  const holiday = holidayName.get(key);
                  const people = isWorkday(d) && !holiday ? onDay(key) : [];
                  const inMonth = isSameMonth(d, month);
                  const isToday = key === today;
                  return (
                    <div
                      key={key}
                      className={`min-h-[104px] border-white/[0.05] p-2 ${i % 7 !== 6 ? 'border-r' : ''} ${i < days.length - 7 ? 'border-b' : ''} ${
                        holiday ? 'bg-amber-400/[0.05]' : !isWorkday(d) ? 'bg-black/20' : ''
                      } ${inMonth ? '' : 'opacity-35'}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${isToday ? 'bg-[#3ddc97] font-semibold text-black' : 'text-zinc-500'}`}>
                        {format(d, 'd')}
                      </span>
                      {holiday && <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-amber-300/90">{holiday}</p>}
                      <div className="mt-1 flex flex-col gap-1">
                        {people.slice(0, 3).map((e) => <Chip key={e.id} entry={e} />)}
                        {people.length > 3 && (
                          <span className="px-1 text-[11px] text-zinc-500" title={people.slice(3).map((e) => e.full_name).join(', ')}>
                            +{people.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agenda (phones) */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111114] md:hidden">
              {agenda.length === 0 ? (
                <EmptyState title="Nobody’s away" body={`No leave or holidays in ${format(month, 'MMMM')}.`} seed="calendar" />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {agenda.map((a) => (
                    <li key={a.key} className="flex gap-4 px-4 py-3">
                      <span className={`w-12 shrink-0 text-center ${a.key === today ? 'text-[#3ddc97]' : 'text-zinc-400'}`}>
                        <span className="block text-[11px] uppercase">{format(a.d, 'EEE')}</span>
                        <span className="block text-[18px] font-semibold leading-tight">{format(a.d, 'd')}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                        {a.holiday && <span className="text-[12px] font-medium text-amber-300/90">{a.holiday}</span>}
                        <span className="flex flex-wrap gap-1.5">
                          {a.people.map((e) => <Chip key={e.id} entry={e} />)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </PageBody>
    </AppShell>
  );
}
