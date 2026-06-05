import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { google } from 'googleapis';
import {
  submittedEmail,
  approvedEmail,
  rejectedEmail,
  emVettingEmail,
  lineManagerActionEmail,
  headOfProductObserverEmail,
  coverPersonEmail,
} from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM = 'Spotflow Leave <support@spotflow.one>';

type NotifyEvent = 'submitted' | 'approved' | 'rejected' | 'em_review';

const LINE_MANAGER_ROLES = ['frontend_line_manager', 'backend_line_manager', 'line_manager'];

const ENGINEERING_ROLES = [
  'frontend_engineer', 'backend_engineer', 'qa_engineer',
  'frontend_line_manager', 'backend_line_manager', 'line_manager', 'engineer',
];
const ENGINEERING_TEAMS = ['frontend', 'backend'];

function getApproverRole(requesterRole: string, requesterTeam: string): string {
  if (requesterRole === 'frontend_engineer') return 'frontend_line_manager';
  if (requesterRole === 'backend_engineer') return 'backend_line_manager';
  if (requesterRole === 'engineer' && requesterTeam === 'frontend') return 'frontend_line_manager';
  if (requesterRole === 'engineer' && requesterTeam === 'backend') return 'backend_line_manager';
  if (requesterRole === 'qa_engineer') return 'engineering_manager';
  if (requesterRole === 'operations') return 'head_of_operations';
  if (requesterRole === 'marketing') return 'head_of_operations';
  if (requesterRole === 'product_designer') return 'head_of_product';
  if (requesterRole === 'product_manager') return 'head_of_product';
  if (LINE_MANAGER_ROLES.includes(requesterRole)) return 'engineering_manager';
  if (requesterRole === 'engineering_manager') return 'head_of_product';
  return 'engineering_manager';
}

async function getProfilesByRole(role: string): Promise<{ full_name: string; email: string }[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('role', role)
    .limit(10);
  return data ?? [];
}

/** Create a Google Calendar event on the requester's primary calendar */
async function createCalendarEvent(userId: string, details: {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}) {
  const { data: tokenRow } = await supabaseAdmin
    .from('user_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (!tokenRow?.refresh_token) return; // no token stored yet — skip silently

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });

  const leaveTypeLabels: Record<string, string> = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    other: 'Leave',
  };

  // Google Calendar all-day events use an exclusive end date
  const endExclusive = new Date(details.endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const endDateStr = format(endExclusive, 'yyyy-MM-dd');

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: leaveTypeLabels[details.leaveType] ?? 'Leave',
      start: { date: details.startDate },
      end: { date: endDateStr },
      description: `Approved via Spotflow Leave Portal.\n\nReason: ${details.reason}`,
      status: 'confirmed',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { event, requestId } = (await req.json()) as { event: NotifyEvent; requestId: string };

    if (!event || !requestId) {
      return NextResponse.json({ error: 'Missing event or requestId' }, { status: 400 });
    }

    const { data: leave, error: leaveErr } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id, leave_type, start_date, end_date, duration_days, reason,
        cover_notes, cover_person_email, status, approver_comment,
        requester:profiles!leave_requests_requester_id_fkey(id, full_name, email, role, team),
        approver:profiles!leave_requests_approver_id_fkey(id, full_name, role)
      `)
      .eq('id', requestId)
      .single();

    if (leaveErr || !leave) {
      console.error('Leave fetch error:', leaveErr);
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const requester = leave.requester as unknown as {
      id: string; full_name: string; email: string; role: string; team: string;
    };
    const approver = leave.approver as unknown as {
      id: string; full_name: string; role: string;
    } | null;

    const leaveDetails = {
      requesterName: requester.full_name,
      leaveType: leave.leave_type,
      startDate: leave.start_date,
      endDate: leave.end_date,
      durationDays: leave.duration_days,
      reason: leave.reason ?? '',
      coverNotes: leave.cover_notes ?? '',
      status: leave.status,
      approverComment: leave.approver_comment ?? '',
    };

    // ------------------------------------------------------------------
    // SUBMITTED
    // ------------------------------------------------------------------
    if (event === 'submitted') {
      const approverRole = getApproverRole(requester.role, requester.team);
      const primaryApprovers = await getProfilesByRole(approverRole);

      if (primaryApprovers.length === 0) {
        console.warn(`No approver found for role: ${approverRole}`);
        return NextResponse.json({ ok: true, warning: 'No approver found' });
      }

      await Promise.all(
        primaryApprovers.map((a) => {
          const { subject, html } = submittedEmail(leaveDetails, a.full_name);
          return resend.emails.send({ from: FROM, to: a.email, subject, html });
        })
      );

      const isEngineeringRequest =
        ENGINEERING_ROLES.includes(requester.role) ||
        (requester.role === 'engineer' && ENGINEERING_TEAMS.includes(requester.team));

      if (isEngineeringRequest && approverRole !== 'engineering_manager') {
        const engManagers = await getProfilesByRole('engineering_manager');
        await Promise.all(
          engManagers.map((m) => {
            const { subject, html } = submittedEmail(leaveDetails, m.full_name);
            return resend.emails.send({ from: FROM, to: m.email, subject, html });
          })
        );
      }

      const coverEmail = leave.cover_person_email as string | null;
      if (coverEmail) {
        const { subject, html } = coverPersonEmail(leaveDetails, coverEmail);
        await resend.emails.send({ from: FROM, to: coverEmail, subject, html });
      }

      return NextResponse.json({ ok: true, sent: primaryApprovers.length });
    }

    // ------------------------------------------------------------------
    // EM_REVIEW — line manager approved, notify EM to vet
    // ------------------------------------------------------------------
    if (event === 'em_review') {
      const lineManagerName = approver?.full_name ?? 'Line Manager';
      const engManagers = await getProfilesByRole('engineering_manager');

      if (engManagers.length === 0) {
        console.warn('No engineering_manager found for EM vetting notification');
        return NextResponse.json({ ok: true, warning: 'No EM found' });
      }

      await Promise.all(
        engManagers.map((m) => {
          const { subject, html } = emVettingEmail(leaveDetails, m.full_name, lineManagerName);
          return resend.emails.send({ from: FROM, to: m.email, subject, html });
        })
      );

      return NextResponse.json({ ok: true, sent: engManagers.length });
    }

    // ------------------------------------------------------------------
    // APPROVED — final approval: email engineer + create calendar event
    // ------------------------------------------------------------------
    if (event === 'approved') {
      const { subject: reqSubject, html: reqHtml } = approvedEmail(leaveDetails);
      await resend.emails.send({ from: FROM, to: requester.email, subject: reqSubject, html: reqHtml });

      if (approver && LINE_MANAGER_ROLES.includes(approver.role)) {
        const engManagers = await getProfilesByRole('engineering_manager');
        await Promise.all(
          engManagers.map((m) => {
            const { subject, html } = lineManagerActionEmail(leaveDetails, approver.full_name, 'approved');
            return resend.emails.send({ from: FROM, to: m.email, subject, html });
          })
        );
      }

      const approverName = approver?.full_name ?? 'Your manager';
      const hops = await getProfilesByRole('head_of_product');
      await Promise.all(
        hops.map((h) => {
          const { subject, html } = headOfProductObserverEmail(leaveDetails, approverName, 'approved');
          return resend.emails.send({ from: FROM, to: h.email, subject, html });
        })
      );

      // Google Calendar event — fire-and-forget, non-blocking
      createCalendarEvent(requester.id, {
        leaveType: leave.leave_type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        reason: leave.reason ?? '',
      }).catch(err => console.warn('Calendar event creation failed:', err));

      return NextResponse.json({ ok: true });
    }

    // ------------------------------------------------------------------
    // REJECTED
    // ------------------------------------------------------------------
    if (event === 'rejected') {
      const { subject: reqSubject, html: reqHtml } = rejectedEmail(leaveDetails);
      await resend.emails.send({ from: FROM, to: requester.email, subject: reqSubject, html: reqHtml });

      if (approver && LINE_MANAGER_ROLES.includes(approver.role)) {
        const engManagers = await getProfilesByRole('engineering_manager');
        await Promise.all(
          engManagers.map((m) => {
            const { subject, html } = lineManagerActionEmail(leaveDetails, approver.full_name, 'rejected');
            return resend.emails.send({ from: FROM, to: m.email, subject, html });
          })
        );
      }

      const approverName = approver?.full_name ?? 'Your manager';
      const hops = await getProfilesByRole('head_of_product');
      await Promise.all(
        hops.map((h) => {
          const { subject, html } = headOfProductObserverEmail(leaveDetails, approverName, 'rejected');
          return resend.emails.send({ from: FROM, to: h.email, subject, html });
        })
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });

  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
