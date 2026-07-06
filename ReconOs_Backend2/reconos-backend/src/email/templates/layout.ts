/** ReconOS email layout — matches the design system exactly (inline HTML for clients). */

export type IconKind =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'clock'
  | 'wallet';

const ICONS: Record<
  IconKind,
  { bg: string; fg: string; path: string }
> = {
  success: { bg: '#DCFCE7', fg: '#16A34A', path: 'M5 13l4 4L19 7' },
  warning: {
    bg: '#FEF3C7',
    fg: '#D97706',
    path: 'M12 9v3.2m0 3.4h.01M10.3 3.9L2.5 17.5A1.8 1.8 0 004.06 20.2h15.88a1.8 1.8 0 001.56-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z',
  },
  danger: { bg: '#FEE2E2', fg: '#DC2626', path: 'M6 18L18 6M6 6l12 12' },
  info: {
    bg: '#DBEAFE',
    fg: '#2563EB',
    path: 'M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  clock: {
    bg: '#F3F4F6',
    fg: '#6B7280',
    path: 'M12 7v5l3.2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  wallet: {
    bg: '#EFF6FF',
    fg: '#2563EB',
    path: 'M3 7h15a3 3 0 013 3v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M17 12.5h2',
  },
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function iconBlock(kind: IconKind): string {
  const c = ICONS[kind] ?? ICONS.info;
  return `<div style="width:48px;height:48px;border-radius:50%;background-color:${c.bg};text-align:center;line-height:48px;margin-bottom:20px;">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${c.fg}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="${c.path}"/></svg>
  </div>`;
}

export function badge(text: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;padding:4px 11px;border-radius:20px;background-color:${bg};color:${fg};font-size:12px;font-weight:700;letter-spacing:.01em;">${text}</span>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:20px;line-height:27px;font-weight:700;color:#111827;">${text}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#4B5563;">${text}</p>`;
}

export function small(text: string): string {
  return `<p style="margin:0 0 18px;font-size:13px;line-height:20px;color:#9CA3AF;">${text}</p>`;
}

export function button(text: string, href = '#', color = '#2563EB'): string {
  const safeHref = escapeHtml(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 26px;"><tr>
    <td style="background-color:${color};">
      <a href="${safeHref}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${text}</a>
    </td></tr></table>`;
}

export function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background-color:#EFF6FF;border-radius:9px;">
    <tr><td style="padding:22px;text-align:center;">
      <span style="font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#2563EB;">${code}</span>
    </td></tr></table>`;
}

export function secondaryLink(text: string, href = '#'): string {
  const safeHref = escapeHtml(href);
  return `<p style="margin:0 0 20px;"><a href="${safeHref}" style="font-size:14px;font-weight:600;color:#2563EB;text-decoration:none;">${text} →</a></p>`;
}

export function ledger(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:11px 0;font-size:13px;color:#6B7280;border-bottom:1px solid #F0F1F3;">${label}</td>
      <td style="padding:11px 0;font-size:13.5px;color:#111827;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;border-bottom:1px solid #F0F1F3;">${value}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 26px;background-color:#FAFAFA;border-radius:9px;">
    <tr><td style="padding:2px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>
    </td></tr></table>`;
}

export type MatchState = 'matched' | 'review' | 'unmatched' | 'pending';

export function matchStrip(
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
  state: MatchState,
): string {
  const states: Record<
    MatchState,
    { fg: string; bg: string; glyph: string; line: string }
  > = {
    matched: { fg: '#16A34A', bg: '#DCFCE7', glyph: '✓', line: '#86EFAC' },
    review: { fg: '#D97706', bg: '#FEF3C7', glyph: '?', line: '#FCD34D' },
    unmatched: { fg: '#DC2626', bg: '#FEE2E2', glyph: '✕', line: '#FCA5A5' },
    pending: { fg: '#6B7280', bg: '#F3F4F6', glyph: '…', line: '#D1D5DB' },
  };
  const s = states[state] ?? states.pending;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 26px;background-color:#FAFAFA;border-radius:9px;">
    <tr>
      <td style="width:42%;padding:16px;vertical-align:top;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9CA3AF;margin-bottom:4px;">${leftLabel}</div>
        <div style="font-size:14px;font-weight:700;color:#111827;">${leftValue}</div>
      </td>
      <td style="width:16%;text-align:center;vertical-align:middle;">
        <div style="border-top:2px dashed ${s.line};margin:0 -6px;position:relative;">
          <div style="width:26px;height:26px;border-radius:50%;background:${s.bg};color:${s.fg};font-weight:800;font-size:13px;
            line-height:26px;text-align:center;margin:-13px auto 0;">${s.glyph}</div>
        </div>
      </td>
      <td style="width:42%;padding:16px;vertical-align:top;text-align:right;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9CA3AF;margin-bottom:4px;">${rightLabel}</div>
        <div style="font-size:14px;font-weight:700;color:#111827;">${rightValue}</div>
      </td>
    </tr>
  </table>`;
}

export function shell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>ReconOS</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F2EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F2EF;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid #E5E7EB;">
  <tr><td style="padding:24px 32px;border-bottom:1px solid #F0F1F3;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:32px;height:32px;background-color:#2563EB;border-radius:8px;text-align:center;">
        <span style="display:inline-block;color:#ffffff;font-size:16px;font-weight:900;line-height:32px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">R</span>
      </td>
      <td style="padding-left:10px;font-size:17px;font-weight:700;color:#111827;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">Recon<span style="color:#60A5FA;">Os</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:34px 32px 8px;">${body}</td></tr>
  <tr><td style="padding:22px 32px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F0F1F3;"><tr><td style="padding-top:20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;line-height:18px;">ReconOS, Inc. · Reconciliation &amp; collections for growing businesses</p>
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:18px;">
        <a href="#" style="color:#6B7280;text-decoration:underline;">Notification settings</a> &nbsp;·&nbsp;
        <a href="#" style="color:#6B7280;text-decoration:underline;">Help center</a> &nbsp;·&nbsp;
        <a href="#" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td></tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function formatNgn(amount: number): string {
  return amount.toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  });
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] ?? '•' : local[0];
  return `${visible}••••${local.slice(-1) ?? ''}@${domain}`;
}
