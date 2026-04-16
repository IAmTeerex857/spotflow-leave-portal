import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { submittedEmail, approvedEmail, rejectedEmail } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Service-role Supabase client — bypasses RLS, server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NotifyEvent = 'submitted' | 'approved' | 'rejected';

/** Determine which manager role should approve for a given requester */
function getApproverRole(requesterRole: string, requesterTeam: string): string | null {
  // Specific engineer roles
  if (requesterRole === 'frontend_engineer') return 'frontend_line_manager';
  if (requesterRole === 'backend_engineer') return 'backend_line_manager';
  // Generic engineer — use team to route
  if (requesterRole === 'engineer' && requesterTeam === 'frontend') return 'frontend_line_manager';
  if (requesterRole === 'engineer' && requesterTeam === 'backend') return 'backend_line_manager';
  // Product roles → head of product
  if (requesterRole === 'product_designer') return 'head_of_product';
  if (requesterRole === 'product_manager') return 'head_of_product';
  // Line managers → engineering manager
  if (['frontend_line_manager', 'backend_line_manager', 'line_manager'].includes(requesterRole)) return 'engineering_manager';
  if (requesterRole === 'engineering_manager') return 'head_of_product';
  return 'engineering_manager'; // safe fallback
}

export async function POST(req: NextRequest) {
  try {
    const { event, requestId } = (await req.json()) as { event: NotifyEvent; requestId: string };

    if (!event || !requestId) {
      return NextResponse.json({ error: 'Missing event or requestId' }, { status: 400 });
    }

    // Fetch the leave request
    const { data: leave, error: leaveErr } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id, leave_type, start_date, end_date, duration_days, reason, status, approver_comment,
        requester:profiles!leave_requests_requester_id_fkey(id, full_name, email, role, team)
      `)
      .eq('id', requestId)
      .single();

    if (leaveErr || !leave) {
      console.error('Leave fetch error:', leaveErr);
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const requester = leave.requester as unknown as { id: string; full_name: string; email: string; role: string; team: string };

    const leaveDetails = {
      requesterName: requester.full_name,
      leaveType: leave.leave_type,
      startDate: leave.start_date,
      endDate: leave.end_date,
      durationDays: leave.duration_days,
      reason: leave.reason ?? '',
      status: leave.status,
      approverComment: leave.approver_comment ?? '',
    };

    if (event === 'submitted') {
      // Find the approver
      const approverRole = getApproverRole(requester.role, requester.team);
      const { data: approvers } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', approverRole)
        .limit(5);

      if (!approvers || approvers.length === 0) {
        console.warn(`No approver found for role: ${approverRole}`);
        return NextResponse.json({ ok: true, warning: 'No approver found' });
      }

      // Send to all matching approvers (handles multiple line managers)
      const results = await Promise.all(
        approvers.map(async (approver: { full_name: string; email: string }) => {
          const { subject, html } = submittedEmail(leaveDetails, approver.full_name);
          return resend.emails.send({
            from: 'Spotflow Leave <support@spotflow.one>',
            to: approver.email,
            subject,
            html,
          });
        })
      );

      return NextResponse.json({ ok: true, sent: results.length });

    } else if (event === 'approved') {
      const { subject, html } = approvedEmail(leaveDetails);
      await resend.emails.send({
        from: 'Spotflow Leave <support@spotflow.one>',
        to: requester.email,
        subject,
        html,
      });
      return NextResponse.json({ ok: true });

    } else if (event === 'rejected') {
      const { subject, html } = rejectedEmail(leaveDetails);
      await resend.emails.send({
        from: 'Spotflow Leave <support@spotflow.one>',
        to: requester.email,
        subject,
        html,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });

  } catch (err) {
    console.error('Notify API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
