import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Unauthenticated client for public payment pages. */
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token =
    Cookies.get('token') ||
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 (authenticated routes only)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/pay/')) {
        Cookies.remove('token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('org');
        localStorage.removeItem('reconos-auth');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  },
);

export function appBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function paymentPageUrl(token: string): string {
  return `${appBaseUrl()}/pay/${token}`;
}

export type PaymentTrackerStatus = 'AWAITING' | 'CONFIRMING' | 'CONFIRMED';

export type PaymentPageData = {
  invoiceNumber: string;
  description: string;
  status: string;
  paymentStatus: 'PAID' | 'AWAITING_PAYMENT';
  trackerStatus: PaymentTrackerStatus;
  amount: number;
  amountPaid: number;
  amountDue: number;
  walletCreditApplied: number;
  bankPaymentsApplied: number;
  collectViaPaymentAccount: number;
  dueDate: string;
  createdAt: string;
  merchant: {
    name: string;
    customerLabel: string;
    invoiceLabel: string;
    email?: string;
    industry?: string | null;
  };
  customer: { name: string; phone?: string | null };
  paymentAccount: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  } | null;
  qrPayload: string | null;
  paymentUrl: string;
  receipt: { number: string; paidAt: string; amount: number } | null;
};
