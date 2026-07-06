import {
  badge,
  button,
  codeBlock,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatNgn,
  h1,
  iconBlock,
  ledger,
  matchStrip,
  p,
  secondaryLink,
  shell,
  small,
} from './layout';

export type EmailTemplateId =
  | 'welcome'
  | 'verify-email'
  | 'getting-started'
  | 'new-login'
  | 'password-changed'
  | 'password-reset'
  | 'otp-code'
  | 'customer-created'
  | 'account-provisioned'
  | 'account-provisioning-failed'
  | 'invoice-created'
  | 'invoice-sent'
  | 'payment-request'
  | 'reminder-7day'
  | 'reminder-due-today'
  | 'invoice-overdue'
  | 'invoice-overdue-digest'
  | 'payment-received'
  | 'payment-matched'
  | 'payment-review'
  | 'payment-recovered'
  | 'payment-verification-failed'
  | 'duplicate-payment'
  | 'overpayment'
  | 'underpayment'
  | 'unmatched-payment'
  | 'suspicious-payment'
  | 'wallet-credit-created'
  | 'wallet-credit-applied'
  | 'wallet-balance-low'
  | 'refund-initiated'
  | 'refund-processing'
  | 'refund-successful'
  | 'refund-failed'
  | 'withdrawal-submitted'
  | 'withdrawal-processing'
  | 'withdrawal-successful'
  | 'withdrawal-failed'
  | 'bank-verification-failed'
  | 'treasury-balance-low';

/** Dynamic fields passed when rendering a template. */
export type TemplateData = {
  firstName?: string;
  customerName?: string;
  customerId?: string;
  merchantName?: string;
  invoiceNumber?: string;
  description?: string;
  amount?: number;
  amountDue?: number;
  amountPaid?: number;
  balanceRemaining?: number;
  creditedAmount?: number;
  dueDate?: string;
  sentTo?: string;
  paymentUrl?: string;
  dashboardUrl?: string;
  verifyUrl?: string;
  resetUrl?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  confidence?: number;
  bestGuess?: string;
  device?: string;
  location?: string;
  time?: string;
  reason?: string;
  reference?: string;
  provider?: string;
  recoveredBy?: string;
  originallyReceived?: string;
  daysOverdue?: number;
  overdueCount?: number;
  overdueRows?: [string, string][];
  otpCode?: string;
  walletBalance?: number;
  threshold?: number;
  creditApplied?: number;
  destination?: string;
  pendingWithdrawals?: number;
  availableBalance?: number;
  setupSteps?: [string, string][];
};

export type RenderedTemplate = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

type TemplateDef = {
  category: string;
  subject: (d: TemplateData) => string;
  preheader: (d: TemplateData) => string;
  body: (d: TemplateData) => string;
  text?: (d: TemplateData) => string;
};

const D = (d: TemplateData, key: keyof TemplateData, fallback: string): string =>
  String(d[key] ?? fallback);

const name = (d: TemplateData) => escapeHtml(D(d, 'firstName', D(d, 'customerName', 'Daniel')));
const cust = (d: TemplateData) => escapeHtml(D(d, 'customerName', 'Daniel Chukwudi'));
const inv = (d: TemplateData) => escapeHtml(D(d, 'invoiceNumber', 'INV-0006'));
const amt = (d: TemplateData) => formatNgn(d.amountDue ?? d.amount ?? 200_000);
const due = (d: TemplateData) => formatDate(d.dueDate ?? '2026-07-19');
const dash = (d: TemplateData) => escapeHtml(d.dashboardUrl ?? '#');

const TEMPLATES: Record<EmailTemplateId, TemplateDef> = {
  welcome: {
    category: 'Account & Authentication',
    subject: (d) => `Welcome to ReconOS, ${D(d, 'firstName', 'Daniel')}`,
    preheader: () => 'Your account is ready — here’s how to get started.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Welcome to ReconOS')}
  ${p('Your account has been created successfully. ReconOS will now automatically match incoming payments to your invoices, so you can spend less time reconciling and more time running your business.')}
  ${button('Go to dashboard', dash(d))}
  ${secondaryLink('Read the getting started guide', dash(d))}
  ${small('If you didn’t create this account, contact ReconOS Support and we’ll help you secure it.')}`,
  },

  'verify-email': {
    category: 'Account & Authentication',
    subject: () => 'Verify your email address',
    preheader: () => 'One quick step to activate your ReconOS account.',
    body: (d) => `
  ${iconBlock('info')}
  ${h1('Verify your email address')}
  ${p('Confirm this is your email address to activate your ReconOS account and start receiving payment notifications.')}
  ${button('Verify email address', escapeHtml(d.verifyUrl ?? '#'))}
  ${small('This link expires in 24 hours. If you didn’t request this, you can safely ignore this email.')}`,
  },

  'getting-started': {
    category: 'Account & Authentication',
    subject: () => '3 steps to get ReconOS matching your payments',
    preheader: () => 'Add customers, connect a bank, send your first invoice.',
    body: (d) => {
      const steps =
        d.setupSteps ??
        ([
          ['1. Add your first customer', 'Not started'],
          ['2. Connect a settlement account', 'Not started'],
          ['3. Send your first invoice', 'Not started'],
        ] as [string, string][]);
      return `
  ${h1('Get set up in 3 steps')}
  ${p('You’re a few minutes away from automatic reconciliation.')}
  ${ledger(steps)}
  ${button('Continue setup', dash(d))}`;
    },
  },

  'new-login': {
    category: 'Account & Authentication',
    subject: () => 'New login to your ReconOS account',
    preheader: () => 'We noticed a new sign-in — was this you?',
    body: (d) => `
  ${iconBlock('info')}
  ${h1('New login detected')}
  ${p('Your ReconOS account was just signed into from a new device. If this was you, no action is needed.')}
  ${ledger([
    ['Device', escapeHtml(d.device ?? 'Chrome on macOS')],
    ['Location', escapeHtml(d.location ?? 'Lagos, Nigeria')],
    ['Time', escapeHtml(d.time ?? formatDateTime(new Date()))],
  ])}
  ${button('This wasn’t me', dash(d), '#DC2626')}`,
  },

  'password-changed': {
    category: 'Account & Authentication',
    subject: () => 'Your password was changed',
    preheader: () => 'This is a confirmation, no action needed if this was you.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Your password was changed')}
  ${p('The password for your ReconOS account was successfully changed.')}
  ${ledger([
    ['Time', escapeHtml(d.time ?? formatDateTime(new Date()))],
    ['Device', escapeHtml(d.device ?? 'Chrome on macOS')],
  ])}
  ${small('If you didn’t make this change, reset your password immediately and contact ReconOS Support.')}
  ${button('Secure my account', dash(d), '#DC2626')}`,
  },

  'password-reset': {
    category: 'Account & Authentication',
    subject: () => 'Reset your ReconOS password',
    preheader: () => 'Use this link to choose a new password.',
    body: (d) => `
  ${iconBlock('warning')}
  ${h1('Reset your password')}
  ${p('We received a request to reset the password for your ReconOS account. Choose a new password to continue.')}
  ${button('Reset password', escapeHtml(d.resetUrl ?? '#'))}
  ${small('This link expires in 30 minutes. If you didn’t request this, you can ignore this email — your password won’t change.')}`,
  },

  'otp-code': {
    category: 'Account & Authentication',
    subject: (d) => `${(d.otpCode ?? '123456').replace(/\s/g, '')} is your ReconOS verification code`,
    preheader: () => 'This code expires in 10 minutes — don’t share it with anyone.',
    body: (d) => {
      const code = d.otpCode ?? '1 2 3 4 5 6';
      return `
  ${iconBlock('info')}
  ${h1('Verify your identity')}
  ${p('Enter this code to continue signing in to ReconOS.')}
  ${codeBlock(code)}
  ${small('This code expires in 10 minutes. For your security, never share this code with anyone — ReconOS will never ask you for it.')}`;
    },
    text: (d) => {
      const raw = (d.otpCode ?? '123456').replace(/\s/g, '');
      return `Your ReconOS verification code is ${raw}. It expires in 10 minutes. Never share this code.`;
    },
  },

  'customer-created': {
    category: 'Customer Management',
    subject: (d) => `${cust(d)} has been added to ReconOS`,
    preheader: () => 'A dedicated payment account is being created for this customer.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Customer added successfully')}
  ${p(`<b>${cust(d)}</b> has been added to your customer list and a dedicated payment account has been created for them automatically.`)}
  ${ledger([
    ['Customer', cust(d)],
    ['Customer ID', escapeHtml(d.customerId ?? 'CUS-0142')],
    ['Added', formatDate(new Date())],
  ])}
  ${button('View customer', dash(d))}`,
  },

  'account-provisioned': {
    category: 'Customer Management',
    subject: (d) => `Payment account created for ${cust(d)}`,
    preheader: (d) => `Payments to this account will now auto-match to ${D(d, 'customerName', 'Daniel')}.`,
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Payment account provisioned')}
  ${p(`A dedicated virtual account has been created for <b>${cust(d)}</b>. Payments made to this account will be automatically matched to their invoices.`)}
  ${ledger([
    ['Customer', cust(d)],
    ['Bank', escapeHtml(d.bankName ?? 'Wema Bank')],
    ['Account number', escapeHtml(d.accountNumber ?? '8823 4471 902')],
    ['Account name', escapeHtml(d.accountName ?? `ReconOS/${D(d, 'customerName', 'Daniel Chukwudi')}`)],
  ])}
  ${button('View payment account', dash(d))}`,
  },

  'account-provisioning-failed': {
    category: 'Customer Management',
    subject: (d) => `We couldn’t create a payment account for ${cust(d)}`,
    preheader: () => 'Please retry or contact support.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Payment account provisioning failed')}
  ${p(`We couldn’t create a dedicated payment account for <b>${cust(d)}</b>. This customer won’t be able to receive auto-matched payments until this is resolved.`)}
  ${ledger([
    ['Customer', cust(d)],
    ['Reason', escapeHtml(d.reason ?? 'Provider timeout')],
    ['Attempted', formatDateTime(new Date())],
  ])}
  ${button('Retry provisioning', dash(d))}
  ${secondaryLink('Contact ReconOS Support', dash(d))}`,
  },

  'invoice-created': {
    category: 'Invoice Notifications',
    subject: (d) => `Invoice ${inv(d)} has been created`,
    preheader: () => 'Ready to review and send to your customer.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Invoice created successfully')}
  ${p(`Invoice <b>${inv(d)}</b> has been created and saved as a draft. Review the details before sending it to your customer.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Customer', cust(d)],
    ['Amount', amt(d)],
    ['Due date', due(d)],
  ])}
  ${button('Review invoice', dash(d))}`,
  },

  'invoice-sent': {
    category: 'Invoice Notifications',
    subject: (d) => `Invoice ${inv(d)} was sent to ${cust(d)}`,
    preheader: () => 'We’ll notify you as soon as it’s paid.',
    body: (d) => `
  ${iconBlock('info')}
  ${h1('Invoice sent')}
  ${p(`Invoice <b>${inv(d)}</b> has been emailed to ${cust(d)}. You’ll be notified automatically when payment is received.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Sent to', escapeHtml(d.sentTo ?? 'daniel.chukwudi@email.com')],
    ['Amount due', amt(d)],
    ['Due date', due(d)],
  ])}
  ${button('Track invoice', dash(d))}`,
  },

  'payment-request': {
    category: 'Invoice Notifications',
    subject: (d) =>
      `Payment request — ${escapeHtml(d.description ?? 'Invoice')} (${amt(d)})`,
    preheader: (d) =>
      `Please pay ${amt(d)} for ${D(d, 'description', 'your invoice')} by ${due(d)}.`,
    body: (d) => {
      const rows: [string, string][] = [
        ['Invoice', inv(d)],
        ['Description', escapeHtml(d.description ?? 'Payment')],
        ['Amount due', amt(d)],
        ['Due date', due(d)],
      ];
      if (d.accountNumber && d.bankName) {
        rows.push(['Bank', escapeHtml(d.bankName)]);
        rows.push(['Account number', escapeHtml(d.accountNumber)]);
        if (d.accountName) rows.push(['Account name', escapeHtml(d.accountName)]);
      }
      return `
  ${iconBlock('info')}
  ${h1('Payment request')}
  ${p(`Dear ${cust(d)}, please find your payment details below.`)}
  ${ledger(rows)}
  ${button('Pay online', escapeHtml(d.paymentUrl ?? '#'))}
  ${small(`Thank you,<br><strong>${escapeHtml(d.merchantName ?? 'ReconOS')}</strong>`)}`;
    },
    text: (d) =>
      [
        `${D(d, 'merchantName', 'ReconOS')} — payment request`,
        '',
        `Dear ${D(d, 'customerName', 'Customer')},`,
        '',
        `${D(d, 'invoiceNumber', 'INV')}: ${D(d, 'description', '')}`,
        `Amount due: ${amt(d)}`,
        `Due: ${due(d)}`,
        '',
        `Pay here: ${d.paymentUrl ?? ''}`,
        d.accountNumber ? `Bank: ${d.bankName} · Account: ${d.accountNumber}` : '',
        '',
        D(d, 'merchantName', 'ReconOS'),
      ]
        .filter(Boolean)
        .join('\n'),
  },

  'reminder-7day': {
    category: 'Invoice Notifications',
    subject: (d) => `Reminder: ${inv(d)} is due in 7 days`,
    preheader: () => 'A friendly nudge before the due date.',
    body: (d) => `
  ${iconBlock('clock')}
  ${h1('Payment reminder')}
  ${p(`This is a reminder that invoice <b>${inv(d)}</b> for ${cust(d)} is due in 7 days.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Amount due', amt(d)],
    ['Due date', due(d)],
  ])}
  ${button('Send reminder now', dash(d))}`,
  },

  'reminder-due-today': {
    category: 'Invoice Notifications',
    subject: (d) => `Reminder: ${inv(d)} is due today`,
    preheader: () => 'Payment is due today for this invoice.',
    body: (d) => `
  ${iconBlock('warning')}
  ${h1('Invoice due today')}
  ${p(`Invoice <b>${inv(d)}</b> for ${cust(d)} is due today. Consider sending a reminder if payment hasn’t been received.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Amount due', amt(d)],
    ['Due date', `${due(d)} (today)`],
  ])}
  ${button('Send reminder now', dash(d), '#60A5FA')}`,
  },

  'invoice-overdue': {
    category: 'Invoice Notifications',
    subject: (d) => `${inv(d)} is now overdue`,
    preheader: () => 'This invoice has passed its due date without payment.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Invoice overdue')}
  ${p(`Invoice <b>${inv(d)}</b> for ${cust(d)} has passed its due date and remains unpaid.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Amount due', amt(d)],
    ['Due date', due(d)],
    ['Days overdue', `${d.daysOverdue ?? 3} days`],
  ])}
  ${button('Follow up now', dash(d), '#DC2626')}`,
  },

  'invoice-overdue-digest': {
    category: 'Invoice Notifications',
    subject: (d) => `${d.overdueCount ?? 5} invoices became overdue today`,
    preheader: () => 'A daily summary of newly overdue invoices.',
    body: (d) => {
      const rows =
        d.overdueRows ??
        ([
          ['INV-0006 · Daniel Chukwudi', '₦200,000.00'],
          ['INV-0014 · Amaka Obi', '₦85,000.00'],
          ['INV-0019 · Tunde Bakare', '₦42,500.00'],
          ['INV-0021 · Chioma Eze', '₦120,000.00'],
          ['INV-0023 · Segun Ade', '₦15,000.00'],
        ] as [string, string][]);
      return `
  ${iconBlock('warning')}
  ${h1(`${d.overdueCount ?? 5} invoices became overdue today`)}
  ${p('The following invoices passed their due date today without full payment.')}
  ${ledger(rows)}
  ${button('Review overdue invoices', dash(d), '#60A5FA')}`;
    },
  },

  'payment-received': {
    category: 'Payment Notifications',
    subject: (d) => `${amt(d)} received from ${cust(d)}`,
    preheader: () => 'Payment is being matched to an open invoice.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Payment received')}
  ${p(`A payment of <b>${amt(d)}</b> has been received for ${cust(d)}. ReconOS is matching it to an open invoice now.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Customer', cust(d)],
    ['Received via', escapeHtml(d.bankName ?? 'Wema Bank transfer')],
    ['Time', escapeHtml(d.time ?? formatDateTime(new Date()))],
  ])}
  ${button('View payment', dash(d))}`,
  },

  'payment-matched': {
    category: 'Payment Notifications',
    subject: (d) =>
      `Payment matched to ${inv(d)} (${d.confidence ?? 95}% confidence)`,
    preheader: () => 'Reconciliation completed automatically.',
    body: (d) => `
  ${badge('Auto-matched', '#DCFCE7', '#16A34A')}
  ${h1('Payment automatically matched')}
  ${p(`A payment of ${amt(d)} has been matched to invoice <b>${inv(d)}</b> with ${d.confidence ?? 95}% confidence.`)}
  ${matchStrip('Payment received', amt(d), `Invoice ${inv(d)}`, amt(d), 'matched')}
  ${button('View reconciliation', dash(d))}`,
  },

  'payment-review': {
    category: 'Payment Notifications',
    subject: () => 'A payment needs your review',
    preheader: () => 'We couldn’t confidently match this payment.',
    body: (d) => `
  ${badge('Needs review', '#FEF3C7', '#D97706')}
  ${h1('Payment requires review')}
  ${p(`A payment of ${amt(d)} could not be matched automatically to an invoice. Take a look and confirm the right match.`)}
  ${matchStrip('Payment received', amt(d), 'Best guess', escapeHtml(d.bestGuess ?? 'INV-0031 · 61%'), 'review')}
  ${button('Review match', dash(d), '#60A5FA')}`,
  },

  'payment-recovered': {
    category: 'Payment Notifications',
    subject: () => 'A missed payment was recovered',
    preheader: () => 'Found during scheduled background sync.',
    body: (d) => `
  ${iconBlock('info')}
  ${h1('Payment recovered')}
  ${p('ReconOS recovered a payment that was missed by a prior notification, during background synchronization.')}
  ${ledger([
    ['Amount', amt(d)],
    ['Customer', cust(d)],
    ['Recovered by', escapeHtml(d.recoveredBy ?? 'Nightly sync')],
    ['Originally received', escapeHtml(d.originallyReceived ?? formatDateTime(new Date()))],
  ])}
  ${button('View payment', dash(d))}`,
  },

  'payment-verification-failed': {
    category: 'Payment Notifications',
    subject: () => 'Payment verification failed',
    preheader: () => 'Nomba reported a verification failure for this payment.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Payment verification failed')}
  ${p('A payment could not be verified with the payment provider. It has not been applied to any invoice.')}
  ${ledger([
    ['Amount', amt(d)],
    ['Customer', cust(d)],
    ['Provider', escapeHtml(d.provider ?? 'Nomba')],
    ['Reference', escapeHtml(d.reference ?? 'NMB-88213-A')],
  ])}
  ${button('Investigate', dash(d), '#DC2626')}`,
  },

  'duplicate-payment': {
    category: 'Payment Notifications',
    subject: () => 'Possible duplicate payment detected',
    preheader: () => 'Two matching payments were received for the same invoice.',
    body: (d) => `
  ${badge('Duplicate', '#FEE2E2', '#DC2626')}
  ${h1('Duplicate payment detected')}
  ${p('Two payments matching the same amount and invoice were received within a short window. Please confirm this isn’t a duplicate.')}
  ${ledger([
    ['Invoice', inv(d)],
    ['First payment', escapeHtml(d.time ?? '5 Jul, 10:31 AM · ₦200,000.00')],
    ['Second payment', escapeHtml(d.originallyReceived ?? '5 Jul, 10:33 AM · ₦200,000.00')],
  ])}
  ${button('Review payments', dash(d), '#DC2626')}`,
  },

  overpayment: {
    category: 'Exception Notifications',
    subject: (d) => `${cust(d)} paid ${formatNgn(d.creditedAmount ?? 250)} more than expected`,
    preheader: () => 'The excess has been credited to their wallet.',
    body: (d) => `
  ${badge('Overpayment', '#DBEAFE', '#2563EB')}
  ${h1('Overpayment detected')}
  ${p(`${cust(d)} paid <b>${formatNgn(d.creditedAmount ?? 250)}</b> more than the invoice amount. The excess has been credited to their ReconOS wallet automatically.`)}
  ${ledger([
    ['Invoice amount', formatNgn(d.amount ?? 200_000)],
    ['Amount paid', formatNgn((d.amount ?? 200_000) + (d.creditedAmount ?? 250))],
    ['Credited to wallet', formatNgn(d.creditedAmount ?? 250)],
  ])}
  ${button('View wallet', dash(d))}`,
  },

  underpayment: {
    category: 'Exception Notifications',
    subject: (d) => `${cust(d)} still owes ${formatNgn(d.balanceRemaining ?? 50)}`,
    preheader: () => 'This invoice is now partially paid.',
    body: (d) => `
  ${badge('Underpayment', '#FEF3C7', '#D97706')}
  ${h1('Underpayment detected')}
  ${p(`${cust(d)} paid <b>${formatNgn(d.balanceRemaining ?? 50)}</b> less than the invoice amount. The invoice has been marked partially paid.`)}
  ${ledger([
    ['Invoice amount', formatNgn(d.amount ?? 200_000)],
    ['Amount paid', formatNgn(d.amountPaid ?? 199_950)],
    ['Balance remaining', formatNgn(d.balanceRemaining ?? 50)],
  ])}
  ${button('Send balance reminder', dash(d), '#60A5FA')}`,
  },

  'unmatched-payment': {
    category: 'Exception Notifications',
    subject: () => 'A payment arrived with no matching invoice',
    preheader: () => '₦18,000 needs to be manually assigned.',
    body: (d) => `
  ${matchStrip('Payment received', amt(d), 'Matching invoice', 'None found', 'unmatched')}
  ${h1('Unmatched payment')}
  ${p('A payment was received but no open invoice matches its amount, reference, or customer. It’s waiting in your unmatched queue.')}
  ${button('Assign manually', dash(d), '#DC2626')}`,
  },

  'suspicious-payment': {
    category: 'Exception Notifications',
    subject: () => 'A payment was flagged as suspicious',
    preheader: () => 'Review this transaction before applying it.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Suspicious payment flagged')}
  ${p('A payment was flagged for review due to unusual activity. It has been held and not yet applied to any invoice.')}
  ${ledger([
    ['Amount', amt(d)],
    ['Customer', escapeHtml(d.customerName ?? 'Unknown sender')],
    ['Flag reason', escapeHtml(d.reason ?? 'Sender name mismatch')],
  ])}
  ${button('Review flagged payment', dash(d), '#DC2626')}`,
  },

  'wallet-credit-created': {
    category: 'Wallet Notifications',
    subject: (d) => `${formatNgn(d.creditedAmount ?? 50)} credited to ${cust(d)}’s wallet`,
    preheader: () => 'From an overpayment on a recent invoice.',
    body: (d) => `
  ${iconBlock('wallet')}
  ${h1('Wallet credit created')}
  ${p(`An excess payment of <b>${formatNgn(d.creditedAmount ?? 50)}</b> has been credited to ${cust(d)}’s ReconOS wallet and is available for future invoices.`)}
  ${ledger([
    ['Customer', cust(d)],
    ['Wallet credit', formatNgn(d.creditedAmount ?? 50)],
    ['New balance', formatNgn(d.walletBalance ?? d.creditedAmount ?? 50)],
  ])}
  ${button('View wallet', dash(d))}`,
  },

  'wallet-credit-applied': {
    category: 'Wallet Notifications',
    subject: (d) => `Wallet credit applied to ${inv(d)}`,
    preheader: (d) =>
      `${formatNgn(d.creditApplied ?? 50)} from ${D(d, 'customerName', 'Daniel')}’s balance covered part of this invoice.`,
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Wallet credit applied')}
  ${p(`A wallet credit of <b>${formatNgn(d.creditApplied ?? 50)}</b> has been applied to invoice <b>${inv(d)}</b> automatically.`)}
  ${ledger([
    ['Invoice', inv(d)],
    ['Credit applied', formatNgn(d.creditApplied ?? 50)],
    ['Remaining balance due', formatNgn(d.balanceRemaining ?? 4_950)],
  ])}
  ${button('View invoice', dash(d))}`,
  },

  'wallet-balance-low': {
    category: 'Wallet Notifications',
    subject: () => 'Wallet balance is running low',
    preheader: () => 'Optional heads-up notification.',
    body: (d) => `
  ${iconBlock('warning')}
  ${h1('Wallet balance low')}
  ${p('This customer’s wallet balance has dropped below your configured threshold.')}
  ${ledger([
    ['Customer', cust(d)],
    ['Current balance', formatNgn(d.walletBalance ?? 120)],
    ['Threshold', formatNgn(d.threshold ?? 500)],
  ])}
  ${button('View wallet', dash(d), '#60A5FA')}`,
  },

  'refund-initiated': {
    category: 'Refund Notifications',
    subject: () => 'A refund has been initiated',
    preheader: () => `${formatNgn(25_000)} refund to ${D({}, 'customerName', 'Daniel Chukwudi')} is being processed.`,
    body: (d) => `
  ${badge('Initiated', '#DBEAFE', '#2563EB')}
  ${h1('Refund initiated')}
  ${p(`A refund of <b>${amt(d)}</b> to ${cust(d)} has been initiated and sent to the payment provider.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Customer', cust(d)],
    ['Reason', escapeHtml(d.reason ?? 'Duplicate payment')],
  ])}
  ${button('Track refund', dash(d))}`,
  },

  'refund-processing': {
    category: 'Refund Notifications',
    subject: () => 'Your refund is being processed',
    preheader: () => 'This usually takes 1–3 business days.',
    body: (d) => `
  ${iconBlock('clock')}
  ${h1('Refund processing')}
  ${p(`The refund of <b>${amt(d)}</b> to ${cust(d)} is being processed by the payment provider.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Status', 'Processing'],
    ['Expected completion', '2–3 business days'],
  ])}
  ${button('Track refund', dash(d))}`,
  },

  'refund-successful': {
    category: 'Refund Notifications',
    subject: () => 'Refund completed successfully',
    preheader: () => `${formatNgn(25_000)} has been returned to ${D({}, 'customerName', 'Daniel Chukwudi')}.`,
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Refund successful')}
  ${p(`The refund of <b>${amt(d)}</b> to ${cust(d)} has been completed successfully.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Completed', escapeHtml(d.time ?? formatDateTime(new Date()))],
    ['Reference', escapeHtml(d.reference ?? 'RFD-2291')],
  ])}
  ${button('View receipt', dash(d))}`,
  },

  'refund-failed': {
    category: 'Refund Notifications',
    subject: () => 'A refund attempt failed',
    preheader: () => 'Action is needed to complete this refund.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Refund failed')}
  ${p(`We couldn’t complete a refund of <b>${amt(d)}</b> to ${cust(d)}. Please review and retry.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Reason', escapeHtml(d.reason ?? 'Invalid destination account')],
    ['Attempted', escapeHtml(d.time ?? formatDateTime(new Date()))],
  ])}
  ${button('Retry refund', dash(d), '#DC2626')}`,
  },

  'withdrawal-submitted': {
    category: 'Treasury Notifications',
    subject: () => 'Withdrawal of ₦500,000 submitted',
    preheader: () => 'Your funds are on their way.',
    body: (d) => `
  ${badge('Submitted', '#DBEAFE', '#2563EB')}
  ${h1('Withdrawal submitted')}
  ${p('Your withdrawal request has been submitted for processing.')}
  ${ledger([
    ['Amount', amt(d)],
    ['Destination', escapeHtml(d.destination ?? 'GTBank •••• 4471')],
    ['Submitted', escapeHtml(d.time ?? formatDateTime(new Date()))],
  ])}
  ${button('Track withdrawal', dash(d))}`,
  },

  'withdrawal-processing': {
    category: 'Treasury Notifications',
    subject: () => 'Your withdrawal is processing',
    preheader: () => 'Funds typically arrive within a few hours.',
    body: (d) => `
  ${iconBlock('clock')}
  ${h1('Withdrawal processing')}
  ${p(`Your withdrawal of <b>${amt(d)}</b> is being processed by your bank.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Destination', escapeHtml(d.destination ?? 'GTBank •••• 4471')],
    ['Status', 'Processing'],
  ])}
  ${button('Track withdrawal', dash(d))}`,
  },

  'withdrawal-successful': {
    category: 'Treasury Notifications',
    subject: () => `Withdrawal of ${formatNgn(500_000)} completed`,
    preheader: () => 'Funds have arrived in your bank account.',
    body: (d) => `
  ${iconBlock('success')}
  ${h1('Withdrawal successful')}
  ${p(`Your withdrawal of <b>${amt(d)}</b> has been completed and should reflect in your bank account.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Destination', escapeHtml(d.destination ?? 'GTBank •••• 4471')],
    ['Completed', escapeHtml(d.time ?? formatDateTime(new Date()))],
  ])}
  ${button('View receipt', dash(d))}`,
  },

  'withdrawal-failed': {
    category: 'Treasury Notifications',
    subject: () => 'Withdrawal failed — action needed',
    preheader: () => '₦500,000 could not be sent to your bank.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Withdrawal failed')}
  ${p(`Your withdrawal of <b>${amt(d)}</b> could not be completed. No funds have left your treasury balance.`)}
  ${ledger([
    ['Amount', amt(d)],
    ['Reason', escapeHtml(d.reason ?? 'Bank rejected transfer')],
    ['Destination', escapeHtml(d.destination ?? 'GTBank •••• 4471')],
  ])}
  ${button('Retry withdrawal', dash(d), '#DC2626')}`,
  },

  'bank-verification-failed': {
    category: 'Treasury Notifications',
    subject: () => 'Bank account verification failed',
    preheader: () => 'We couldn’t verify the account details provided.',
    body: (d) => `
  ${iconBlock('danger')}
  ${h1('Bank verification failed')}
  ${p('The bank account details you provided couldn’t be verified. Please check the account number and bank, then try again.')}
  ${ledger([
    ['Bank', escapeHtml(d.bankName ?? 'GTBank')],
    ['Account number', escapeHtml(d.accountNumber ?? '0012 3445 671')],
    ['Reason', escapeHtml(d.reason ?? 'Account name mismatch')],
  ])}
  ${button('Update bank details', dash(d), '#DC2626')}`,
  },

  'treasury-balance-low': {
    category: 'Treasury Notifications',
    subject: () => 'Treasury balance is running low',
    preheader: () => 'Optional heads-up for large pending withdrawals.',
    body: (d) => `
  ${iconBlock('warning')}
  ${h1('Low treasury balance')}
  ${p('Your available treasury balance is running low relative to pending withdrawals.')}
  ${ledger([
    ['Available balance', formatNgn(d.availableBalance ?? 82_000)],
    ['Pending withdrawals', formatNgn(d.pendingWithdrawals ?? 500_000)],
  ])}
  ${button('View treasury', dash(d), '#60A5FA')}`,
  },
};

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  data: TemplateData = {},
): RenderedTemplate {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown email template: ${templateId}`);

  const subject = t.subject(data);
  const preheader = t.preheader(data);
  const body = t.body(data);
  const html = shell(preheader, body);
  const text = t.text?.(data) ?? `${subject}\n\n${preheader}`;

  return { subject, preheader, html, text };
}

export function listEmailTemplates(): Array<{
  id: EmailTemplateId;
  category: string;
}> {
  return (Object.keys(TEMPLATES) as EmailTemplateId[]).map((id) => ({
    id,
    category: TEMPLATES[id].category,
  }));
}

/** Maps each template to the backend event / API that should trigger it. */
export const TEMPLATE_TRIGGERS: Record<EmailTemplateId, string> = {
  welcome: 'POST /auth/register',
  'verify-email': 'POST /auth/register + POST /auth/verify-email',
  'getting-started': 'PATCH /auth/organization/setup or post-register',
  'new-login': 'POST /auth/login or POST /auth/otp/verify',
  'password-changed': 'PATCH /auth/password or POST /auth/reset-password',
  'password-reset': 'POST /auth/forgot-password',
  'otp-code': 'POST /auth/login → OTP step',
  'customer-created': 'POST /customers',
  'account-provisioned': 'Nomba VA provision on customer create',
  'account-provisioning-failed': 'Nomba VA provision failure',
  'invoice-created': 'POST /invoices',
  'invoice-sent': 'POST /invoices/:id/send-email (merchant copy)',
  'payment-request': 'POST /invoices/:id/send-email (customer copy)',
  'reminder-7day': 'Cron 9am — invoices due in 7 days',
  'reminder-due-today': 'Cron 9am — invoices due today',
  'invoice-overdue': 'Midnight cron markOverdueInvoices',
  'invoice-overdue-digest': 'Midnight cron — 2+ overdue same org',
  'payment-received': 'POST /webhooks/nomba — payment ingested',
  'payment-matched': 'Reconciliation engine MATCH_AUTO',
  'payment-review': 'Reconciliation engine MATCH_REVIEW_QUEUED',
  'payment-recovered': 'Transaction sync recovery',
  'payment-verification-failed': 'Overpayment refund verification failure',
  'duplicate-payment': 'Duplicate payment discarded',
  overpayment: 'OVERPAYMENT_DETECTED audit',
  underpayment: 'INVOICE_PARTIALLY_PAID audit',
  'unmatched-payment': 'Reconciliation NO_MATCH exception',
  'suspicious-payment': 'Reconciliation ANOMALY exception',
  'wallet-credit-created': 'Overpayment resolve → CREDIT_WALLET',
  'wallet-credit-applied': 'WalletService.applyToOpenInvoices',
  'wallet-balance-low': 'Wallet below ₦500 after debit',
  'refund-initiated': 'Overpayment refund transfer started',
  'refund-processing': 'Overpayment refund pending',
  'refund-successful': 'Refund transfer success or payout webhook',
  'refund-failed': 'Refund transfer/webhook failure',
  'withdrawal-submitted': 'POST /treasury/withdraw',
  'withdrawal-processing': 'POST /treasury/withdraw',
  'withdrawal-successful': 'Treasury withdraw success',
  'withdrawal-failed': 'Treasury withdraw failure',
  'bank-verification-failed': 'Treasury bank lookup failure',
  'treasury-balance-low': 'Treasury withdraw blocked — low balance',
};
