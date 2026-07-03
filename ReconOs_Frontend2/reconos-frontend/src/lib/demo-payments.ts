// Event Simulator presets — use real Nomba VA (Dorathy Logistics)
export interface MockWebhookPayload {
  accountNumber: string;
  amount: number;
  payerName?: string;
  payerAccount?: string;
  payerBankCode?: string;
  payerBankName?: string;
  reference?: string;
  organizationId?: string;
}

/** Dorathy Logistics — real Nomba sandbox VA (Nombank MFB) */
export const REAL_TEST_VA = '5874770727';

export const DEMO_PAYMENTS = {
  standard: {
    accountNumber: REAL_TEST_VA,
    amount: 150,
    payerName: 'DORATHY LOGISTICS PAYER',
    payerAccount: '0011223344',
    payerBankCode: '044',
    payerBankName: 'Access Bank',
  },
  underpayment: {
    accountNumber: REAL_TEST_VA,
    amount: 50,
    payerName: 'DORATHY LOGISTICS PAYER',
    payerAccount: '0099887766',
    payerBankCode: '044',
    payerBankName: 'Access Bank',
  },
  overpayment: {
    accountNumber: REAL_TEST_VA,
    amount: 150,
    payerName: 'DORATHY LOGISTICS PAYER',
    payerAccount: '0099887766',
    payerBankCode: '044',
    payerBankName: 'Access Bank',
  },
  anomaly: {
    accountNumber: REAL_TEST_VA,
    amount: 150,
    payerName: 'UNKNOWN SENDER LTD',
    payerAccount: '1122334455',
    payerBankCode: '058',
    payerBankName: 'GTBank',
  },
} as const;

export type DemoPaymentKey = keyof typeof DEMO_PAYMENTS;
