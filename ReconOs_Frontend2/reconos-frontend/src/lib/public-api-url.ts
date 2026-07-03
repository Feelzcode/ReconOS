/** Production API host — used when NEXT_PUBLIC_API_URL is missing at Vercel build time. */
const PRODUCTION_API_URL = 'https://reconos-api.onrender.com/api';

export function resolvePublicApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3002/api';
    }
    return PRODUCTION_API_URL;
  }

  return PRODUCTION_API_URL;
}
