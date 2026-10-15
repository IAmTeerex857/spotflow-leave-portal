'use client';
import { useEffect, useState } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import CalendarView, { type CalendarEntry } from '@/components/calendar/CalendarView';
import { createClient } from '@/lib/supabase/client';

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    const load = async () => {
      setLoading(true);
      // Cover the whole visible grid, including the leading/trailing weeks.
      const from = format(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to = format(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data } = await createClient().rpc('team_calendar', { p_from: from, p_to: to });
      if (!stale) {
        setEntries((data ?? []) as CalendarEntry[]);
        setLoading(false);
      }
    };
    load();
    return () => { stale = true; };
  }, [month]);

  return <CalendarView month={month} onMonthChange={setMonth} entries={entries} loading={loading} />;
}
