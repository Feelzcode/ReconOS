import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RECEIPT = {
  amount: 100,
  va: '5874770727',
  recipient: 'Nomba Hackathon 2026',
  sender: 'SAMUEL CHIDERA ALI',
  date: '2026-06-30T17:00:43',
  transactionNo: '260630020100018331602399',
  sessionId: '100004260630160048164030476935',
};

const DB_SESSION = '100004260630161414164034745040';

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

async function requery(t: string, sessionId: string) {
  const r = await fetch(`${process.env.NOMBA_BASE_URL}/transactions/requery/${sessionId}`, {
    headers: { Authorization: `Bearer ${t}`, accountId: process.env.NOMBA_ACCOUNT_ID! },
  });
  const j = await r.json();
  return { http: r.status, body: j, data: j.data ?? j };
}

async function main() {
  console.log('OPay receipt');
  console.log(JSON.stringify(RECEIPT, null, 2));
  console.log('');

  const t = await token();

  console.log('=== Requery RECEIPT session ID ===');
  const receipt = await requery(t, RECEIPT.sessionId);
  console.log(JSON.stringify({
    http: receipt.http,
    code: receipt.body.code,
    status: receipt.data.status,
    amount: receipt.data.amount ?? receipt.data.transactionAmount,
    recipient: receipt.data.recipientAccountNumber ?? receipt.data.aliasAccountNumber,
    type: receipt.data.type,
    time: receipt.data.timeCreated ?? receipt.data.time,
  }, null, 2));

  console.log('\n=== Requery DB session ID (what ReconOS stored) ===');
  const db = await requery(t, DB_SESSION);
  console.log(JSON.stringify({
    http: db.http,
    code: db.body.code,
    status: db.data.status,
    amount: db.data.amount ?? db.data.transactionAmount,
    recipient: db.data.recipientAccountNumber ?? db.data.aliasAccountNumber,
    type: db.data.type,
    time: db.data.timeCreated ?? db.data.time,
  }, null, 2));

  const txByReceipt = await prisma.transaction.findFirst({
    where: {
      OR: [
        { nombaReference: RECEIPT.sessionId },
        { nombaEventId: RECEIPT.sessionId },
        { nombaReference: { contains: RECEIPT.sessionId.slice(0, 20) } },
      ],
    },
    include: { customer: true },
  });

  const txByDb = await prisma.transaction.findFirst({
    where: { nombaReference: DB_SESSION },
    include: { customer: true },
  });

  console.log('\n=== ReconOS DB match ===');
  console.log('By receipt session:', txByReceipt
    ? `FOUND — ${txByReceipt.customer?.name} ₦${txByReceipt.amount} ref=${txByReceipt.nombaReference}`
    : 'NOT FOUND');
  console.log('By DB session:', txByDb
    ? `FOUND — ${txByDb.customer?.name} ₦${txByDb.amount} ref=${txByDb.nombaReference}`
    : 'NOT FOUND');

  const sub = process.env.NOMBA_SUBACCOUNT_ID!;
  const subTx = await fetch(
    `${process.env.NOMBA_BASE_URL}/transactions/accounts/${sub}?limit=50&dateFrom=2026-06-30T00:00:00&dateTo=2026-06-30T23:59:59`,
    { headers: { Authorization: `Bearer ${t}`, accountId: process.env.NOMBA_ACCOUNT_ID! } },
  );
  const subRows = (await subTx.json()).data?.results ?? [];
  const dorathyOnSub = subRows.filter((r: Record<string, unknown>) => {
    const meta = (r.meta as Record<string, unknown>) ?? {};
    return String(meta.recipientAccountNumber ?? meta.aliasAccountNumber ?? '').includes('5874770727');
  });
  console.log('\n=== Dorathy VA on sub-account ledger (Jun 30) ===');
  console.log(dorathyOnSub.length ? JSON.stringify(dorathyOnSub, null, 2) : 'No credits to 5874770727 on sub-account');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
