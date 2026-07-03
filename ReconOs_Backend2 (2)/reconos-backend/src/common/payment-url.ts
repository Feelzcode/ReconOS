export function paymentPageUrl(token: string): string {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/pay/${token}`;
}
