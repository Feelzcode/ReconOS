/**
 * Diagnose Nomba VA creation / lookup — masks secrets in output.
 */
import 'dotenv/config';

const accountRef = process.argv[2] || 'cmr25bbrb0001ujh0w8kw157i';

async function getToken(): Promise<string> {
  const res = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: process.env.NOMBA_ACCOUNT_ID!,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  }
  return data.data.access_token;
}

async function main() {
  const token = await getToken();
  const base = process.env.NOMBA_BASE_URL!;
  const accountId = process.env.NOMBA_ACCOUNT_ID!;
  const subId = process.env.NOMBA_SUBACCOUNT_ID!;

  console.log('accountRef:', accountRef);
  console.log('subAccountId:', subId?.slice(0, 8) + '…');

  const getByRef = await fetch(`${base}/accounts/virtual/${accountRef}`, {
    headers: { Authorization: `Bearer ${token}`, accountId },
  });
  console.log('\nGET /accounts/virtual/{ref}:', getByRef.status);
  console.log(await getByRef.text());

  const list = await fetch(`${base}/accounts/virtual/list?limit=5`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      accountId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountRef }),
  });
  console.log('\nPOST /accounts/virtual/list:', list.status);
  console.log(await list.text());

  const names = ['PRODTEST01', 'Daniel Scorsese', 'DORATHY ADEYEMI', 'STUDENT01'];
  for (const name of names) {
    const ref = `recon${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const createSub = await fetch(`${base}/accounts/virtual/${subId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountRef: ref, accountName: name }),
    });
    const txt = await createSub.text();
    console.log(`\nCREATE name="${name}":`, createSub.status, txt.slice(0, 300));
    await new Promise((r) => setTimeout(r, 400));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
