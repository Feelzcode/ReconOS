/**
 * One-off: compare Nomba VA history vs ReconOS DB for missed webhooks.
 * Usage: npx ts-node scripts/diagnose-va-payments.ts
 */
import 'dotenv/config';

const VA = process.argv[2] || '5874770727';

async function getToken(baseUrl: string, accountId: string, clientId: string, clientSecret: string) {
  const res = await fetch(`${baseUrl}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  const token = data.data?.access_token ?? data.access_token;
  if (!token) throw new Error(`Auth failed (${baseUrl}): ${res.status} ${JSON.stringify(data)}`);
  return token;
}

async function tryGet(label: string, url: string, accountId: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accountId },
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  console.log(`\n--- ${label} ---`);
  console.log('URL:', url.replace(/Bearer [^&]+/, 'Bearer ***'));
  console.log('Status:', res.status);
  if (res.ok) {
    const results =
      json?.data?.results ?? json?.results ?? json?.data ?? json;
    if (Array.isArray(results)) {
      console.log('Rows:', results.length);
      results.slice(0, 10).forEach((r: any) => {
        console.log(
          ' ',
          r.sessionId ?? r.id,
          '|',
          r.status,
          '| ₦' + (r.amount ?? r.transactionAmount),
          '| to VA:',
          r.recipientAccountNumber ?? r.aliasAccountNumber,
          '|',
          r.senderName ?? r.narration,
        );
      });
    } else {
      console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    }
  } else {
    console.log(typeof json === 'string' ? json : JSON.stringify(json));
  }
  return res.ok ? json : null;
}

async function main() {
  const envs = [
    {
      label: 'SANDBOX',
      baseUrl: process.env.NOMBA_BASE_URL || 'https://sandbox.nomba.com/v1',
      accountId: process.env.NOMBA_ACCOUNT_ID!,
      clientId: process.env.NOMBA_CLIENT_ID!,
      clientSecret: process.env.NOMBA_CLIENT_SECRET!,
      subAccountId: process.env.NOMBA_SUBACCOUNT_ID,
    },
  ];

  const dateTo = new Date().toISOString().split('T')[0];
  const dateFrom = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  console.log(`Diagnosing VA ${VA} (${dateFrom} → ${dateTo})`);

  for (const env of envs) {
    console.log(`\n========== ${env.label} ==========`);
    const token = await getToken(env.baseUrl, env.accountId, env.clientId, env.clientSecret);

    await tryGet(
      'virtual (no subAccount)',
      `${env.baseUrl}/transactions/virtual?virtual_account=${VA}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=20`,
      env.accountId,
      token,
    );

    if (env.subAccountId) {
      await tryGet(
        'virtual (with subAccountId)',
        `${env.baseUrl}/transactions/virtual?virtual_account=${VA}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=20&subAccountId=${env.subAccountId}`,
        env.accountId,
        token,
      );
    }

    await tryGet(
      'parent accounts (filter client-side)',
      `${env.baseUrl}/transactions/accounts?limit=50&dateFrom=${dateFrom}T00:00:00&dateTo=${dateTo}T23:59:59`,
      env.accountId,
      token,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
