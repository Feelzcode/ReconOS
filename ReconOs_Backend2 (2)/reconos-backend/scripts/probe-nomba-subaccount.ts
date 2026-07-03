import 'dotenv/config';

async function main() {
  const base = process.env.NOMBA_BASE_URL!;
  const auth = await fetch(`${base}/auth/token/issue`, {
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
  const authJson = await auth.json();
  const token = (authJson.data ?? authJson).access_token;
  const sub = process.env.NOMBA_SUBACCOUNT_ID!;

  const paths = [
    `/accounts/sub-accounts/${sub}/balance`,
    `/accounts/sub-accounts/${sub}`,
    `/accounts/${sub}/balance`,
    `/transactions/accounts/${sub}?limit=3`,
  ];

  for (const p of paths) {
    const r = await fetch(`${base}${p}`, {
      headers: { Authorization: `Bearer ${token}`, accountId: process.env.NOMBA_ACCOUNT_ID! },
    });
    const txt = await r.text();
    console.log('---', p, r.status);
    console.log(txt.slice(0, 400));
  }
}

main().catch(console.error);
