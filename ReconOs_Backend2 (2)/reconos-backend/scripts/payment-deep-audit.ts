import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

function naira(val: unknown): number {
  const n = Number(val ?? 0);
  const s = String(val ?? '');
  if (s.includes('.') || (n > 0 && n < 10000)) return n;
  return n / 100;
}

async function main() {
  const t = await token();

  console.log('=== ALL PARENT /transactions/bank (unfiltered) ===');
  const bank = await fetch(
    `${process.env.NOMBA_BASE_URL}/transactions/bank?limit=100&dateFrom=2026-06-01T00:00:00&dateTo=2026-07-31T23:59:59`,
    { headers: { Authorization: `Bearer ${t}`, accountId: process.env.NOMBA_ACCOUNT_ID! } },
  );
  const bankJson = await bank.json();
  const rows = bankJson.data?.results ?? [];
  console.log(`Rows: ${rows.length}`);
  for (const r of rows) {
    console.log({
      amount: naira(r.amount ?? r.transactionAmount),
      fee: naira(r.fixedCharge),
      type: r.type,
      status: r.status,
      recipient: r.recipientAccountNumber,
      sender: r.senderName ?? r.meta?.sender_name,
      time: r.timeCreated ?? r.time,
      id: r.id ?? r.transactionId,
      session: r.sessionId ?? r.meta?.sessionId,
    });
  }

  const txs = await prisma.transaction.findMany({
    where: {
      customer: { organization: { email: 'admin@royalcrown.edu.ng' } },
    },
    include: { customer: { select: { name: true, virtualAccountNumber: true } } },
    orderBy: { paymentDate: 'asc' },
  });

  console.log('\n=== RECONOS DB (real vs mock) ===');
  let realTotal = 0;
  for (const tx of txs) {
    const isMock = tx.nombaReference.includes('MOCK') || tx.nombaEventId.includes('mock');
    const amt = Number(tx.amount);
    if (!isMock) realTotal += amt;
    console.log({
      customer: tx.customer?.name,
      va: tx.customer?.virtualAccountNumber,
      amount: amt,
      payer: tx.payerName,
      ref: tx.nombaReference,
      mock: isMock,
      date: tx.paymentDate.toISOString().slice(0, 16),
    });
  }
  console.log(`\nReal payments only (no MOCK): ₦${realTotal}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
