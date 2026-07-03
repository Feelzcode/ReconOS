import 'dotenv/config';

function naira(val: unknown): number {
  const n = Number(val ?? 0);
  const s = String(val ?? '');
  if (s.includes('.') || (n > 0 && n < 10000)) return n;
  return n / 100;
}

async function token() {
  const res = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: process.env.NOMBA_ACCOUNT_ID! },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  return (await res.json()).data.access_token as string;
}

async function getJson(path: string, t: string) {
  const res = await fetch(`${process.env.NOMBA_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${t}`, accountId: process.env.NOMBA_ACCOUNT_ID! },
  });
  return res.json();
}

async function main() {
  const t = await token();
  const sub = process.env.NOMBA_SUBACCOUNT_ID!;
  const parent = process.env.NOMBA_ACCOUNT_ID!;
  const vas = ['4296935060', '5874770727'];

  console.log('=== SUB-ACCOUNT TRANSACTIONS ===');
  const subTx = await getJson(
    `/transactions/accounts/${sub}?limit=100&dateFrom=2026-06-01T00:00:00&dateTo=2026-07-31T23:59:59`,
    t,
  );
  const subRows = subTx.data?.results ?? [];
  let subCredits = 0;
  for (const r of subRows) {
    const meta = r.meta ?? {};
    const va = meta.recipientAccountNumber ?? meta.aliasAccountNumber ?? r.customerBillerId ?? '?';
    const amt = naira(r.amount);
    if (String(r.status).toUpperCase() === 'SUCCESS' && amt > 0) subCredits += amt;
    console.log({
      amount: amt,
      fee: naira(r.fixedCharge ?? meta.fee),
      type: r.type,
      status: r.status,
      va,
      time: r.timeCreated,
      id: r.id,
    });
  }
  console.log(`Sub-account SUCCESS credits total: ₦${subCredits}\n`);

  console.log('=== PARENT ACCOUNT TRANSACTIONS (bank feed) ===');
  const bankTx = await getJson(
    `/transactions/bank?limit=100&dateFrom=2026-06-01T00:00:00&dateTo=2026-07-31T23:59:59`,
    t,
  );
  const bankRows = bankTx.data?.results ?? [];
  let parentVaCredits = 0;
  for (const r of bankRows) {
    const va = String(r.recipientAccountNumber ?? '');
    if (!vas.includes(va) && r.type !== 'vact_transfer') continue;
    const amt = naira(r.amount ?? r.transactionAmount);
    if (String(r.status).toUpperCase() === 'SUCCESS' && amt > 0) parentVaCredits += amt;
    console.log({
      amount: amt,
      fee: naira(r.fixedCharge),
      type: r.type,
      status: r.status,
      va: va || r.recipientAccountNumber,
      time: r.timeCreated ?? r.time,
      id: r.id ?? r.transactionId,
    });
  }
  console.log(`Parent bank feed VA-related credits: ₦${parentVaCredits}\n`);

  for (const va of vas) {
    console.log(`=== VA ${va} (virtual tx endpoint) ===`);
    try {
      const v = await getJson(
        `/transactions/virtual?virtual_account=${va}&dateFrom=2026-06-01&dateTo=2026-07-31&limit=50`,
        t,
      );
      const rows = v.data?.results ?? v.data?.transactions ?? [];
      let total = 0;
      for (const r of rows) {
        const amt = naira(r.amount ?? r.transactionAmount);
        total += amt;
        console.log({ amount: amt, status: r.status, time: r.timeCreated ?? r.time, id: r.id });
      }
      console.log(`VA ${va} total: ₦${total} (${rows.length} rows)\n`);
    } catch (e) {
      console.log(`VA ${va} error: ${e}\n`);
    }
  }

  const subBal = await getJson(`/accounts/${sub}/balance`, t);
  const parentBal = await getJson(`/accounts/${parent}/balance`, t);
  console.log('=== BALANCES ===');
  console.log('Sub-account:', naira(subBal.data?.amount), 'NGN');
  console.log('Parent account:', naira(parentBal.data?.amount), 'NGN');
  console.log('\nExpected user total sent: ₦300');
}

main().catch(console.error);
