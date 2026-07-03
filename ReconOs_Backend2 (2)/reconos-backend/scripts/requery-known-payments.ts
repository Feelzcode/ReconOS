import 'dotenv/config';

const sessions = [
  { label: 'Dorathy ₦100', id: '100004260630161414164034745040', va: '5874770727' },
  { label: 'Prod Test duplicate webhook', id: '100004260701142104164121648238', va: '4296935060' },
  { label: 'Prod Test primary ref', id: 'API-VACT_TRA-F8D90-90cad750-c745-4c3b-8162-00a507d56893', va: '4296935060' },
];

async function main() {
  const auth = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: process.env.NOMBA_ACCOUNT_ID! },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const token = (await auth.json()).data.access_token;

  for (const s of sessions) {
    const r = await fetch(`${process.env.NOMBA_BASE_URL}/transactions/requery/${s.id}`, {
      headers: { Authorization: `Bearer ${token}`, accountId: process.env.NOMBA_ACCOUNT_ID! },
    });
    const j = await r.json();
    const d = j.data ?? j;
    console.log(`\n${s.label} (VA ${s.va})`);
    console.log(`  HTTP ${r.status} code=${j.code}`);
    console.log(`  amount: ${d.amount ?? d.transactionAmount}`);
    console.log(`  status: ${d.status}`);
    console.log(`  recipient VA: ${d.recipientAccountNumber ?? d.aliasAccountNumber ?? 'n/a'}`);
    console.log(`  type: ${d.type}`);
  }
}

main().catch(console.error);
