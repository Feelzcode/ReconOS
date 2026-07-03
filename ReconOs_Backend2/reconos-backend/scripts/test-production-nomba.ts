/**
 * Production Nomba smoke test — never prints secrets.
 * Usage: npx ts-node scripts/test-production-nomba.ts [virtualAccount] [sessionId]
 */
import 'dotenv/config';

const VA = process.argv[2] || '5874770727';
const SESSION = process.argv[3] || '100004260630161414164034745040';

function mask(s: string | undefined) {
  if (!s) return '(missing)';
  if (s.length < 8) return '***';
  return s.slice(0, 4) + '…' + s.slice(-4);
}

async function getToken(): Promise<string> {
  const baseUrl = process.env.NOMBA_BASE_URL!;
  const accountId = process.env.NOMBA_ACCOUNT_ID!;
  const res = await fetch(`${baseUrl}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.access_token) {
    throw new Error(
      `Auth failed (${res.status}): ${data.description || data.message || JSON.stringify(data)}`,
    );
  }
  return data.data.access_token;
}

async function get(
  label: string,
  path: string,
  token: string,
): Promise<{ ok: boolean; status: number; summary: string }> {
  const baseUrl = process.env.NOMBA_BASE_URL!;
  const accountId = process.env.NOMBA_ACCOUNT_ID!;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accountId },
  });
  const text = await res.text();
  let summary = text.slice(0, 200);
  try {
    const j = JSON.parse(text);
    const d = j.data;
    summary = d
      ? `status=${d.status} amount=${d.amount} type=${d.type} va=${d.recipientAccountNumber}`
      : `code=${j.code}`;
  } catch {
    /* keep raw */
  }
  const ok = res.ok;
  console.log(`${ok ? '✅' : '❌'} ${label} → HTTP ${res.status} (${summary})`);
  return { ok, status: res.status, summary };
}

async function main() {
  const baseUrl = process.env.NOMBA_BASE_URL || '';
  const isProd = baseUrl.includes('api.nomba.com');
  console.log('=== ReconOS Nomba production smoke test ===');
  console.log('NOMBA_BASE_URL:', baseUrl);
  console.log('Environment:', isProd ? 'PRODUCTION' : 'NOT PRODUCTION (check NOMBA_BASE_URL)');
  console.log('NOMBA_ACCOUNT_ID:', mask(process.env.NOMBA_ACCOUNT_ID));
  console.log('NOMBA_CLIENT_ID:', mask(process.env.NOMBA_CLIENT_ID));
  console.log('USE_MOCK_NOMBA:', process.env.USE_MOCK_NOMBA);
  console.log('');

  if (process.env.USE_MOCK_NOMBA === 'true') {
    console.error('❌ USE_MOCK_NOMBA is true — set to false for production testing');
    process.exit(1);
  }

  if (!isProd) {
    console.warn('⚠️  NOMBA_BASE_URL is not api.nomba.com — still running checks against configured host');
  }

  const token = await getToken();
  console.log('✅ Auth token issued');

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  await get('VA exists', `/accounts/virtual/${VA}`, token);
  await get(
    'Virtual account txs',
    `/transactions/virtual?virtual_account=${VA}&dateFrom=${weekAgo}&dateTo=${today}&limit=10`,
    token,
  );
  await get(
    'Parent account txs',
    `/transactions/accounts?limit=10&dateFrom=${weekAgo}T00:00:00&dateTo=${today}T23:59:59`,
    token,
  );
  await get(
    'Bank txs',
    `/transactions/bank?limit=10&dateFrom=${weekAgo}T00:00:00&dateTo=${today}T23:59:59`,
    token,
  );
  await get('Requery receipt session', `/transactions/requery/${SESSION}`, token);

  console.log('\nDone. Register webhook on Nomba dashboard → https://<your-api>/api/webhooks/nomba');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
