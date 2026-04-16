import { format } from 'date-fns';

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #0C0C0E;
  color: #F4F4F5;
  margin: 0;
  padding: 0;
`;

function wrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${BASE_STYLES}">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <!-- Logo header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
      <svg width="22" height="22" viewBox="0 0 26 24" fill="none">
        <path d="M14.1074 0.0237318C7.36969-0.407113 1.09754 5.08006 0.113168 12.2771C-0.871208 19.4741 4.35923 24.6984 11.7632 23.9288C19.1672 23.1593 25.453 17.6531 25.7588 11.6511C26.0646 5.6491 20.8506 0.445092 14.1074 0.0237318Z" fill="#F4F4F5"/>
      </svg>
      <span style="font-size:16px;font-weight:700;color:#F4F4F5;letter-spacing:-0.02em;">Spotflow</span>
    </div>

    <!-- Card -->
    <div style="background:#131316;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px;">
      ${content}
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#52525B;margin-top:24px;line-height:1.6;">
      Spotflow Engineering Leave Portal · <a href="https://spotflow-leave-portal.vercel.app" style="color:#71717A;text-decoration:none;">spotflow-leave-portal.vercel.app</a>
    </p>
  </div>
</body>
</html>`;
}

function badge(status: string): string {
  const colours: Record<string, string> = {
    pending: 'background:#78350F;color:#FCD34D;',
    approved: 'background:#14532D;color:#86EFAC;',
    rejected: 'background:#7F1D1D;color:#FCA5A5;',
  };
  const style = colours[status] ?? colours.pending;
  return `<span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:3px 10px;border-radius:999px;${style}">${status}</span>`;
}

function detailRow(label: string, value: string): string {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:13px;color:#71717A;">${label}</span>
      <span style="font-size:13px;font-weight:500;color:#F4F4F5;">${value}</span>
    </div>`;
}

interface LeaveDetails {
  requesterName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  status?: string;
  approverComment?: string;
}

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal', other: 'Other',
};

export function submittedEmail(details: LeaveDetails, approverName: string): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, reason } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const html = wrapper(`
    <p style="font-size:13px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">New Leave Request</p>
    <h1 style="font-size:22px;font-weight:700;color:#F4F4F5;margin:0 0 6px;">Action required</h1>
    <p style="font-size:14px;color:#A1A1AA;margin:0 0 24px;line-height:1.6;">
      Hi ${approverName}, <strong style="color:#F4F4F5;">${requesterName}</strong> has submitted a leave request that needs your approval.
    </p>

    <div style="margin-bottom:20px;">
      ${detailRow('Type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
    </div>

    ${reason ? `<div style="background:rgba(255,255,255,0.04);border-left:2px solid rgba(255,255,255,0.1);border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:24px;">
      <p style="font-size:12px;color:#71717A;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
      <p style="font-size:13px;color:#A1A1AA;margin:0;font-style:italic;">"${reason}"</p>
    </div>` : ''}

    <a href="https://spotflow-leave-portal.vercel.app/manager/queue" style="display:inline-block;background:#F4F4F5;color:#0C0C0E;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">
      Review request →
    </a>
  `);

  return {
    subject: `New leave request from ${requesterName}`,
    html,
  };
}

export function approvedEmail(details: LeaveDetails): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const html = wrapper(`
    <p style="font-size:13px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">Leave Approved</p>
    <h1 style="font-size:22px;font-weight:700;color:#F4F4F5;margin:0 0 6px;">Your leave has been approved ✓</h1>
    <p style="font-size:14px;color:#A1A1AA;margin:0 0 24px;line-height:1.6;">
      Hi ${requesterName}, great news — your leave request has been approved. Enjoy your time off!
    </p>

    <div style="margin-bottom:24px;">
      ${detailRow('Type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Status', badge('approved'))}
    </div>

    <a href="https://spotflow-leave-portal.vercel.app/dashboard" style="display:inline-block;background:#F4F4F5;color:#0C0C0E;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">
      View on dashboard →
    </a>
  `);

  return {
    subject: `Your leave has been approved ✓`,
    html,
  };
}

export function rejectedEmail(details: LeaveDetails): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, approverComment } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const html = wrapper(`
    <p style="font-size:13px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">Leave Request Update</p>
    <h1 style="font-size:22px;font-weight:700;color:#F4F4F5;margin:0 0 6px;">Your leave was not approved</h1>
    <p style="font-size:14px;color:#A1A1AA;margin:0 0 24px;line-height:1.6;">
      Hi ${requesterName}, unfortunately your leave request could not be approved at this time.
    </p>

    <div style="margin-bottom:20px;">
      ${detailRow('Type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Status', badge('rejected'))}
    </div>

    ${approverComment ? `<div style="background:rgba(239,68,68,0.06);border-left:2px solid rgba(239,68,68,0.3);border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:24px;">
      <p style="font-size:12px;color:#71717A;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Manager's reason</p>
      <p style="font-size:13px;color:#A1A1AA;margin:0;font-style:italic;">"${approverComment}"</p>
    </div>` : ''}

    <a href="https://spotflow-leave-portal.vercel.app/requests/new" style="display:inline-block;background:#F4F4F5;color:#0C0C0E;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">
      Submit a new request →
    </a>
  `);

  return {
    subject: `Your leave request was not approved`,
    html,
  };
}
