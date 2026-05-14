import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  submittedEmail,
  approvedEmail,
  rejectedEmail,
  lineManagerActionEmail,
  headOfProductObserverEmail,
  coverPersonEmail,
} from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Service-role Supabase client — bypasses RLS, server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM = 'Spotflow Leave <support@spotflow.one>';

type NotifyEvent = 'submitted' | 'approved' | 'rejected';

// Line manager roles — when they approve/reject, engineering_manager gets notified
const LINE_MANAGER_ROLES = ['frontend_line_manager', 'backend_line_manager', 'line_manager'];

// Engineering-team roles — engineering_manager is CC'd on submission
const ENGINEERING_ROLES = [
  'frontend_engineer', 'backend_engineer', 'qa_engineer',
  'frontend_line_manager', 'backend_line_manager', 'line_manager', 'engineer',
];
const ENGINEERING_TEAMS = ['frontend', 'backend'];

/** Determine which manager role is the primary approver for a given requester */
function getApproverRole(requesterRole: string, requesterTeam: string): string {
  if (requesterRole === 'frontend_engineer') return 'frontend_line_manager';
  if (requesterRole === 'backend_engineer') return 'backend_line_manager';
  // Generic engineer — use team to route
  if (requesterRole === 'engineer' && requesterTeam === 'frontend') return 'frontend_line_manager';
  if (requesterRole === 'engineer' && requesterTeam === 'backend') return 'backend_line_manager';
  // QA engineer reports directly to engineering manager
  if (requesterRole === 'qa_engineer') return 'engineering_manager';
  // Operations and marketing → head of operations
  if (requesterRole === 'operations') return 'head_of_operations';
  if (requesterRole === 'marketing') return 'head_of_operations';
  // Product roles → head of product
  if (requesterRole === 'product_designer') return 'head_of_product';
  if (requesterRole === 'product_manager') return 'head_of_product';
  // Line managers → engineering manager
  if (LINE_MANAGER_ROLES.includes(requesterRole)) return 'engineering_manager';
  if (requesterRole === 'engineering_manager') return 'head_of_product';
  return 'engineering_manager'; // safe fallback
}

async function getProfilesByRole(role: string): Promise<{ full_name: string; email: string }[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('role', role)
    .limit(10);
  return data ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { event, requestId } = (await req.json()) as { event: NotifyEvent; requestId: string };

    if (!event || !requestId) {
      return NextResponse.json({ error: 'Missing event or requestId' }, { status: 400 });
    }

    // Fetch the leave request — include cover_person_email and approver profile
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

      // Notify all primary approvers
      await Promise.all(
        primaryApprovers.map((a) => {
          const { subject, html } = submittedEmail(leaveDetails, a.full_name);
          return resend.emails.send({ from: FROM, to: a.email, subject, html });
        })
      );

      // CC engineering_manager on engineering-team submissions
      // (unless engineering_manager IS already the primary approver)
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

      // Notify cover person if one was specified
      const coverEmail = leave.cover_person_email as string | null;
      if (coverEmail) {
        const { subject, html } = coverPersonEmail(leaveDetails, coverEmail);
        await resend.emails.send({ from: FROM, to: coverEmail, subject, html });
      }

      return NextResponse.json({ ok: true, sent: primaryApprovers.length });
    }

    // ------------------------------------------------------------------
    // APPROVED
    // ------------------------------------------------------------------
    if (event === 'approved') {
      // 1. Notify requester
      const { subject: reqSubject, html: reqHtml } = approvedEmail(leaveDetails);
      await resend.emails.send({ from: FROM, to: requester.email, subject: reqSubject, html: reqHtml });

      // 2. If a line manager approved, notify engineering_manager
      if (approver && LINE_MANAGER_ROLES.includes(approver.role)) {
        const engManagers = await getProfilesByRole('engineering_manager');
        await Promise.all(
          engManagers.map((m) => {
            const { subject, html } = lineManagerActionEmail(leaveDetails, approver.full_name, 'approved');
            return resend.emails.send({ from: FROM, to: m.email, subject, html });
          })
        );
      }

      // 3. Notify head_of_product as company-wide observer
      const approverName = approver?.full_name ?? 'Your manager';
      const hops = await getProfilesByRole('head_of_product');
      await Promise.all(
        hops.map((h) => {
          const { subject, html } = headOfProductObserverEmail(leaveDetails, approverName, 'approved');
          return resend.emails.send({ from: FROM, to: h.email, subject, html });
        })
      );

      return NextResponse.json({ ok: true });
    }

    // ------------------------------------------------------------------
    // REJECTED
    // ------------------------------------------------------------------
    if (event === 'rejected') {
      // 1. Notify requester
      const { subject: reqSubject, html: reqHtml } = rejectedEmail(leaveDetails);
      await resend.emails.send({ from: FROM, to: requester.email, subject: reqSubject, html: reqHtml });

      // 2. If a line manager rejected, notify engineering_manager
      if (approver && LINE_MANAGER_ROLES.includes(approver.role)) {
        const engManagers = await getProfilesByRole('engineering_manager');
        await Promise.all(
          engManagers.map((m) => {
            const { subject, html } = lineManagerActionEmail(leaveDetails, approver.full_name, 'rejected');
            return resend.emails.send({ from: FROM, to: m.email, subject, html });
          })
        );
      }

      // 3. Notify head_of_product as company-wide observer
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
