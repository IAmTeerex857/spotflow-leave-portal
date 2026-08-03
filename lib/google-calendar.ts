import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LeaveCalendarDetails = {
  requestId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const leaveTypeLabels: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
  other: 'Leave',
};

async function getCalendarClient(userId: string) {
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('user_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (!tokenRow?.refresh_token) return null;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for calendar sync');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function upsertCalendarEvent(
  calendar: NonNullable<Awaited<ReturnType<typeof getCalendarClient>>>,
  details: LeaveCalendarDetails
) {
  const endExclusive = new Date(`${details.endDate}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const eventId = details.requestId.replaceAll('-', '');
  const requestBody = {
    summary: leaveTypeLabels[details.leaveType] ?? 'Leave',
    start: { date: details.startDate },
    end: { date: endExclusive.toISOString().slice(0, 10) },
    description: `Approved via Spotflow Leave Portal.\n\nReason: ${details.reason}`,
    status: 'confirmed',
    extendedProperties: {
      private: { spotflowLeaveRequestId: details.requestId },
    },
  };

  try {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: { id: eventId, ...requestBody },
    });
    return 'created' as const;
  } catch (error) {
    if ((error as { code?: number }).code !== 409) throw error;

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody,
    });
    return 'updated' as const;
  }
}

export async function createCalendarEvent(userId: string, details: LeaveCalendarDetails) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    console.warn(`Calendar event skipped: no Google refresh token for user ${userId}`);
    return 'skipped_no_token' as const;
  }

  return upsertCalendarEvent(calendar, details);
}

export async function syncApprovedLeaveEvents(userId: string) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return { synced: 0, status: 'skipped_no_token' as const };

  const { data: leaves, error } = await supabaseAdmin
    .from('leave_requests')
    .select('id, leave_type, start_date, end_date, reason')
    .eq('requester_id', userId)
    .eq('status', 'approved');

  if (error) throw error;

  for (const leave of leaves ?? []) {
    await upsertCalendarEvent(calendar, {
      requestId: leave.id,
      leaveType: leave.leave_type,
      startDate: leave.start_date,
      endDate: leave.end_date,
      reason: leave.reason ?? '',
    });
  }

  return { synced: leaves?.length ?? 0, status: 'synced' as const };
}
