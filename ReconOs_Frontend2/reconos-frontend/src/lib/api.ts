import axios from 'axios';
import Cookies from 'js-cookie';
import { resolvePublicApiUrl } from './public-api-url';

const apiBase = resolvePublicApiUrl();

export const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

/** Unauthenticated client for public payment pages. */
export const publicApi = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token =
    Cookies.get('token') ||
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function persistAccessToken(token: string) {
  Cookies.set('token', token, { expires: 7 });
  localStorage.setItem('token', token);
  try {
    const raw = localStorage.getItem('reconos-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state = { ...parsed.state, token };
      localStorage.setItem('reconos-auth', JSON.stringify(parsed));
    }
  } catch {
    // ignore malformed storage
  }
}

function clearSession() {
  Cookies.remove('token');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('org');
  localStorage.removeItem('reconos-auth');
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = publicApi
      .post<{ token: string; refreshToken?: string }>('/auth/refresh', { refreshToken })
      .then((res) => {
        persistAccessToken(res.data.token);
        if (res.data.refreshToken) {
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        return res.data.token;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

// Refresh session on 401 before redirecting to login
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err?.config;
    const is401 = err?.response?.status === 401;

    if (
      is401 &&
      original &&
      !original._retried &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/pay/') &&
      !String(original.url ?? '').includes('/auth/refresh')
    ) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      clearSession();
      window.location.href = '/auth';
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

export type PaymentTrackerStatus = 'AWAITING' | 'CONFIRMING' | 'PARTIAL' | 'CONFIRMED';

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
