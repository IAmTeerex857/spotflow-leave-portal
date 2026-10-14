import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { LINE_MANAGER_ROLES, type Role } from '@/lib/roles';
import {
  submittedEmail,
  approvedEmail,
  rejectedEmail,
  emVettingEmail,
  lineManagerActionEmail,
  headOfProductObserverEmail,
  coverPersonEmail,
  cancelledEmail,
} from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createAdminClient();

const FROM = 'Spotflow Leave <support@spotflow.one>';

type NotifyEvent = 'submitted' | 'em_review' | 'approved' | 'rejected' | 'cancelled';

/**
 * Who may send each notification, and the status the request must be in.
 * The status change itself already happened through RLS or an RPC; this
 * route only sends the side effects for it.
 */
const EVENT_RULES: Record<NotifyEvent, { actor: 'requester' | 'approver'; status: string }> = {
  submitted: { actor: 'requester', status: 'pending' },
  em_review: { actor: 'approver', status: 'pending_em_review' },
  approved: { actor: 'approver', status: 'approved' },
  rejected: { actor: 'approver', status: 'rejected' },
  cancelled: { actor: 'requester', status: 'cancelled' },
};

type Person = { id: string; full_name: string; email: string; role: string; team: string };

async function getProfilesByRole(role: string, excludeId?: string): Promise<Person[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, team')
    .eq('role', role)
    .limit(10);
  return (data ?? []).filter((p) => p.id !== excludeId);
}

async function sendAll(messages: { to: string; subject: string; html: string }[]) {
  const results = await Promise.allSettled(
    messages.map((m) => resend.emails.send({ from: FROM, ...m }))
  );
  let failed = 0;
  results.forEach((result, i) => {
    // Resend reports API errors in the response rather than throwing.
    const error = result.status === 'rejected' ? result.reason : result.value.error;
    if (error) {
      failed++;
      console.error(`Email to ${messages[i].to} failed:`, error);
    }
  });
  return { sent: messages.length - failed, failed };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { event, requestId } = (await req.json()) as { event: NotifyEvent; requestId: string };
    const rule = EVENT_RULES[event];
    if (!rule || !requestId) {
      return NextResponse.json({ error: 'Missing or unknown event / requestId' }, { status: 400 });
    }

    const { data: leave, error: leaveErr } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id, requester_id, approver_id, line_manager_id, leave_type, start_date, end_date,
        duration_days, reason, cover_notes, cover_person_email, status, approver_comment,
        requester:profiles!leave_requests_requester_id_fkey(id, full_name, email, role, team),
        approver:profiles!leave_requests_approver_id_fkey(id, full_name, email, role, team)
      `)
      .eq('id', requestId)
      .single();

    if (leaveErr || !leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const actorId = rule.actor === 'requester' ? leave.requester_id : leave.approver_id;
    if (actorId !== user.id || leave.status !== rule.status) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const requester = leave.requester as unknown as Person;
    const approver = leave.approver as unknown as Person | null;

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

    const messages: { to: string; subject: string; html: string }[] = [];

    if (event === 'submitted') {
      const { data: approverRole } = await supabaseAdmin.rpc('approver_role_for', {
        p_role: requester.role,
        p_team: requester.team,
      });
      const approvers = await getProfilesByRole(approverRole as string, requester.id);
      approvers.forEach((a) => messages.push({ to: a.email, ...submittedEmail(leaveDetails, a.full_name) }));

      // The engineering manager is copied on requests their line managers handle.
      if (LINE_MANAGER_ROLES.includes(approverRole as Role)) {
        const ems = await getProfilesByRole('engineering_manager', requester.id);
        ems.forEach((m) => messages.push({ to: m.email, ...submittedEmail(leaveDetails, m.full_name) }));
      }

      if (leave.cover_person_email) {
        messages.push({ to: leave.cover_person_email, ...coverPersonEmail(leaveDetails, leave.cover_person_email) });
      }

      const result = await sendAll(messages);
      return NextResponse.json({ ok: true, ...result, warning: approvers.length ? undefined : `No ${approverRole} found` });
    }

    if (event === 'em_review') {
      const ems = await getProfilesByRole('engineering_manager', requester.id);
      ems.forEach((m) => messages.push({
        to: m.email,
        ...emVettingEmail(leaveDetails, m.full_name, approver?.full_name ?? 'Line Manager'),
      }));
      const result = await sendAll(messages);
      return NextResponse.json({ ok: true, ...result });
    }

    if (event === 'approved' || event === 'rejected') {
      const approverName = approver?.full_name ?? 'Your manager';
      messages.push({
        to: requester.email,
        ...(event === 'approved' ? approvedEmail(leaveDetails) : rejectedEmail(leaveDetails)),
      });

      if (approver && LINE_MANAGER_ROLES.includes(approver.role as Role)) {
        const ems = await getProfilesByRole('engineering_manager', requester.id);
        ems.forEach((m) => messages.push({
          to: m.email,
          ...lineManagerActionEmail(leaveDetails, approverName, event),
        }));
      }

      const hops = await getProfilesByRole('head_of_product', requester.id);
      hops
        .filter((h) => h.id !== approver?.id)
        .forEach((h) => messages.push({ to: h.email, ...headOfProductObserverEmail(leaveDetails, approverName, event) }));

      const result = await sendAll(messages);

      // Await so serverless runtimes don't stop before Google receives it.
      const calendar = event === 'approved'
        ? await createCalendarEvent(requester.id, {
            requestId: leave.id,
            leaveType: leave.leave_type,
            startDate: leave.start_date,
            endDate: leave.end_date,
            reason: leave.reason ?? '',
          }).catch((err) => {
            console.error('Calendar sync failed:', err);
            return 'failed' as const;
          })
        : undefined;

      return NextResponse.json({ ok: true, ...result, calendar });
    }

    // cancelled: tell whoever approved it, and remove the calendar event.
    const deciders = new Set([leave.approver_id, leave.line_manager_id].filter(Boolean) as string[]);
    if (deciders.size) {
      const { data: people } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .in('id', [...deciders]);
      (people ?? []).forEach((p) => messages.push({ to: p.email, ...cancelledEmail(leaveDetails, p.full_name) }));
    }
    const result = await sendAll(messages);
    const calendar = await deleteCalendarEvent(requester.id, leave.id).catch((err) => {
      console.error('Calendar delete failed:', err);
      return 'failed' as const;
    });
    return NextResponse.json({ ok: true, ...result, calendar });
  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
