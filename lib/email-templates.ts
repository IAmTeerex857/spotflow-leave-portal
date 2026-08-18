import { format } from 'date-fns';
import { getSiteUrl } from '@/lib/site-url';

const FONT_STACK = `'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const SITE_URL = getSiteUrl('https://spotflow-leave-portal.vercel.app');
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

const LOGO_SVG = `<svg width="20" height="20" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.1074 0.0237318C7.36969-0.407113 1.09754 5.08006 0.113168 12.2771C-0.871208 19.4741 4.35923 24.6984 11.7632 23.9288C19.1672 23.1593 25.453 17.6531 25.7588 11.6511C26.0646 5.6491 20.8506 0.445092 14.1074 0.0237318Z" fill="#F4F4F5"/></svg>`;

function wrapper(preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" type="text/css">
  <title>Spotflow Leave</title>
</head>
<body style="margin:0;padding:0;background-color:#09090D;font-family:${FONT_STACK};">

  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#09090D">
    <tr>
      <td align="center" style="padding:40px 16px 52px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Logo row -->
          <tr>
            <td style="padding-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:8px;">${LOGO_SVG}</td>
                        <td style="vertical-align:middle;">
                          <span style="font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#F4F4F5;letter-spacing:-0.02em;">Spotflow</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-family:${FONT_STACK};font-size:10px;font-weight:600;color:#3F3F46;letter-spacing:0.08em;text-transform:uppercase;">Leave Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111116;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px 36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="font-family:${FONT_STACK};font-size:11px;color:#3F3F46;margin:0;line-height:1.7;">
                Spotflow Leave Portal &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}" style="color:#52525B;text-decoration:none;">${SITE_HOST}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function statusChip(label: string, color: string, bg: string, border: string): string {
  return `<span style="display:inline-block;font-family:${FONT_STACK};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;color:${color};background-color:${bg};border:1px solid ${border};">${label}</span>`;
}

function badge(status: string): string {
  const map: Record<string, [string, string, string]> = {
    pending:  ['#FCD34D', '#3D2000', 'rgba(251,191,36,0.2)'],
    approved: ['#86EFAC', '#052E16', 'rgba(34,197,94,0.2)'],
    rejected: ['#FCA5A5', '#3D0000', 'rgba(239,68,68,0.2)'],
  };
  const [color, bg, border] = map[status] ?? map.pending;
  return `<span style="display:inline-block;font-family:${FONT_STACK};font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;padding:3px 10px;border-radius:999px;color:${color};background-color:${bg};border:1px solid ${border};">${status}</span>`;
}

function detailRow(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid rgba(255,255,255,0.05);';
  return `
    <tr>
      <td style="padding:11px 0;${border}font-family:${FONT_STACK};font-size:12px;font-weight:500;color:#71717A;vertical-align:top;">${label}</td>
      <td style="padding:11px 0;${border}font-family:${FONT_STACK};font-size:12px;font-weight:600;color:#E4E4E7;text-align:right;vertical-align:top;">${value}</td>
    </tr>`;
}

function quoteBlock(label: string, text: string, accentColor = 'rgba(255,255,255,0.1)', bgColor = 'rgba(255,255,255,0.03)'): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="background-color:${bgColor};border-left:3px solid ${accentColor};border-radius:0 10px 10px 0;padding:14px 16px;">
          <p style="font-family:${FONT_STACK};font-size:10px;font-weight:700;color:#52525B;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 6px;">${label}</p>
          <p style="font-family:${FONT_STACK};font-size:13px;color:#A1A1AA;margin:0;line-height:1.65;font-style:italic;">&ldquo;${text}&rdquo;</p>
        </td>
      </tr>
    </table>`;
}

function ctaButton(text: string, url: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
      <tr>
        <td>
          <a href="${url}" style="display:block;font-family:${FONT_STACK};font-size:13px;font-weight:700;color:#09090D;background-color:#F4F4F5;text-align:center;padding:15px 24px;border-radius:11px;text-decoration:none;letter-spacing:0.01em;">${text}</a>
        </td>
      </tr>
    </table>`;
}

function divider(): string {
  return `<div style="height:1px;background-color:rgba(255,255,255,0.06);margin:24px 0;"></div>`;
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

  const content = `
    ${statusChip('New Request', '#A5B4FC', 'rgba(99,102,241,0.12)', 'rgba(99,102,241,0.25)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Action required</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      Hi ${approverName} — <strong style="color:#E4E4E7;font-weight:600;">${requesterName}</strong> has submitted a leave request awaiting your approval.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`, !reason)}
      ${reason ? detailRow('', '', true) : ''}
    </table>

    ${reason ? quoteBlock('Reason', reason) : ''}

    ${divider()}

    ${ctaButton('Review Request →', `${SITE_URL}/manager/queue`)}
  `;

  return {
    subject: `Leave request from ${requesterName} — action required`,
    html: wrapper(`${requesterName} has submitted a leave request that needs your review.`, content),
  };
}

export function approvedEmail(details: LeaveDetails): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const content = `
    ${statusChip('Approved', '#86EFAC', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.2)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Your leave is confirmed</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      Hi ${requesterName} — great news! Your leave request has been approved. Enjoy your time off.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Status', badge('approved'), true)}
    </table>

    ${divider()}

    ${ctaButton('View on Dashboard →', `${SITE_URL}/dashboard`)}
  `;

  return {
    subject: `Your leave has been approved`,
    html: wrapper(`Your leave from ${formattedStart} to ${formattedEnd} has been approved.`, content),
  };
}

export function rejectedEmail(details: LeaveDetails): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, approverComment } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const content = `
    ${statusChip('Not Approved', '#FCA5A5', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.2)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Leave request update</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      Hi ${requesterName} — unfortunately your leave request could not be approved at this time. Please reach out to your manager if you have questions.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Status', badge('rejected'), !approverComment)}
    </table>

    ${approverComment ? quoteBlock("Manager's note", approverComment, 'rgba(239,68,68,0.3)', 'rgba(239,68,68,0.05)') : ''}

    ${divider()}

    ${ctaButton('Submit a New Request →', `${SITE_URL}/requests/new`)}
  `;

  return {
    subject: `Your leave request was not approved`,
    html: wrapper(`Your leave request for ${formattedStart}–${formattedEnd} was not approved.`, content),
  };
}

/** Sent to engineering_manager when a line manager approves or rejects a request */
export function lineManagerActionEmail(
  details: LeaveDetails,
  approverName: string,
  outcome: 'approved' | 'rejected'
): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, approverComment } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');
  const outcomeLabel = outcome === 'approved' ? 'approved' : 'rejected';
  const chipColor = outcome === 'approved'
    ? { text: '#86EFAC', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' }
    : { text: '#FCA5A5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };

  const content = `
    ${statusChip('FYI — Line Manager Update', chipColor.text, chipColor.bg, chipColor.border)}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Leave ${outcomeLabel}</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      <strong style="color:#E4E4E7;font-weight:600;">${approverName}</strong> has ${outcomeLabel} a leave request from <strong style="color:#E4E4E7;font-weight:600;">${requesterName}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Employee', requesterName)}
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Decision', badge(outcome), !approverComment)}
    </table>

    ${approverComment ? quoteBlock('Comment', approverComment) : ''}

    ${divider()}

    ${ctaButton('View Manager Queue →', `${SITE_URL}/manager/queue`)}
  `;

  return {
    subject: `[FYI] ${requesterName}'s leave ${outcomeLabel} by ${approverName}`,
    html: wrapper(`${approverName} has ${outcomeLabel} ${requesterName}'s leave request.`, content),
  };
}

/** Sent to head_of_product as an observer on every approval or rejection company-wide */
export function headOfProductObserverEmail(
  details: LeaveDetails,
  approverName: string,
  outcome: 'approved' | 'rejected'
): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, approverComment } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const content = `
    ${statusChip('Company Leave Update', '#A5B4FC', 'rgba(99,102,241,0.1)', 'rgba(99,102,241,0.2)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Leave ${outcome}</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      For your awareness — <strong style="color:#E4E4E7;font-weight:600;">${requesterName}</strong>'s leave request has been ${outcome} by <strong style="color:#E4E4E7;font-weight:600;">${approverName}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Employee', requesterName)}
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`)}
      ${detailRow('Decision', badge(outcome), !approverComment)}
    </table>

    ${approverComment ? quoteBlock('Comment from manager', approverComment) : ''}

    ${divider()}

    <p style="font-family:${FONT_STACK};font-size:12px;color:#52525B;margin:0;text-align:center;">You are receiving this as a company-wide observer. No action required.</p>
  `;

  return {
    subject: `[Company] ${requesterName}'s leave ${outcome}`,
    html: wrapper(`${requesterName}'s leave was ${outcome} by ${approverName}.`, content),
  };
}

/** Sent to the engineering manager when a line manager approves — asks them to vet */
export function emVettingEmail(
  details: LeaveDetails,
  emName: string,
  lineManagerName: string
): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, reason } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const content = `
    ${statusChip('Awaiting Your Review', '#A78BFA', 'rgba(139,92,246,0.12)', 'rgba(139,92,246,0.25)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">Leave approved by line manager — please vet</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      Hi ${emName} — <strong style="color:#E4E4E7;font-weight:600;">${lineManagerName}</strong> has approved a leave request from <strong style="color:#E4E4E7;font-weight:600;">${requesterName}</strong>. Please review and confirm or override the decision.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Employee', requesterName)}
      ${detailRow('Approved by', lineManagerName)}
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`, !reason)}
    </table>

    ${reason ? quoteBlock('Reason', reason) : ''}

    ${divider()}

    ${ctaButton('Review & Confirm →', `${SITE_URL}/manager/queue`)}

    <p style="font-family:${FONT_STACK};font-size:12px;color:#52525B;margin:16px 0 0;text-align:center;">Confirming will notify the employee and create their calendar event. Overriding will reject the request.</p>
  `;

  return {
    subject: `[Review needed] ${requesterName}'s leave approved by ${lineManagerName}`,
    html: wrapper(`${lineManagerName} approved ${requesterName}'s leave — your confirmation is needed.`, content),
  };
}

/** Sent to the person covering the leaver's work */
export function coverPersonEmail(
  details: LeaveDetails & { coverNotes?: string },
  recipientEmail: string
): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, durationDays, coverNotes } = details;
  const formattedStart = format(new Date(startDate), 'dd MMM yyyy');
  const formattedEnd = format(new Date(endDate), 'dd MMM yyyy');

  const content = `
    ${statusChip('Cover Request', '#FCD34D', 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.2)')}

    <h1 style="font-family:${FONT_STACK};font-size:26px;font-weight:800;color:#F4F4F5;margin:18px 0 10px;letter-spacing:-0.03em;line-height:1.15;">You've been listed as cover</h1>
    <p style="font-family:${FONT_STACK};font-size:14px;color:#A1A1AA;margin:0 0 28px;line-height:1.7;">
      Hi ${recipientEmail} — <strong style="color:#E4E4E7;font-weight:600;">${requesterName}</strong> has listed you as their work cover for the period below. This is a heads-up only.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      ${detailRow('Colleague', requesterName)}
      ${detailRow('Leave type', leaveTypeLabel[leaveType] ?? leaveType)}
      ${detailRow('From', formattedStart)}
      ${detailRow('To', formattedEnd)}
      ${detailRow('Duration', `${durationDays} working day${durationDays !== 1 ? 's' : ''}`, !coverNotes)}
    </table>

    ${coverNotes ? quoteBlock(`Handover notes from ${requesterName}`, coverNotes, 'rgba(245,158,11,0.3)', 'rgba(245,158,11,0.04)') : ''}

    ${divider()}

    <p style="font-family:${FONT_STACK};font-size:12px;color:#52525B;margin:0;text-align:center;">No action is required from you — this is a heads-up only.</p>
  `;

  return {
    subject: `${requesterName} has listed you as their cover (${formattedStart} – ${formattedEnd})`,
    html: wrapper(`${requesterName} is away ${formattedStart}–${formattedEnd} and has listed you as their cover.`, content),
  };
}
