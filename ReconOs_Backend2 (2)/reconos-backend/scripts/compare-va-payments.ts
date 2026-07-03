/**
 * Compare all VA payments: ReconOS DB vs Nomba sub-account ledger.
 * Run: npx ts-node scripts/compare-va-payments.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nombaToken(): Promise<string> {
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
  return (data.data ?? data).access_token;
}

async function fetchAllSubAccountTx(token: string, subId: string) {
  const all: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  const dateFrom = '2026-06-01';
  const dateTo = '2026-07-31';

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      limit: '100',
      dateFrom: `${dateFrom}T00:00:00`,
      dateTo: `${dateTo}T23:59:59`,
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(
      `${process.env.NOMBA_BASE_URL}/transactions/accounts/${subId}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: process.env.NOMBA_ACCOUNT_ID!,
        },
      },
    );
    const data = await res.json();
    const rows: Record<string, unknown>[] = data.data?.results ?? [];
    all.push(...rows);
    cursor = data.data?.cursor ? String(data.data.cursor) : undefined;
    if (!cursor || rows.length === 0) break;
  }
  return all;
}

function naira(val: unknown): number {
  const n = Number(val ?? 0);
  const s = String(val ?? '');
  if (s.includes('.') || (n > 0 && n < 10000)) return n;
  return n / 100;
}

async function main() {
  const subId = process.env.NOMBA_SUBACCOUNT_ID!;

  const org = await prisma.organization.findFirst({
    where: { email: 'admin@royalcrown.edu.ng' },
    include: {
      customers: {
        orderBy: { createdAt: 'asc' },
        include: {
          transactions: { orderBy: { paymentDate: 'asc' } },
        },
      },
    },
  });

  if (!org) throw new Error('Royal Crown org not found');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('RECONOS DATABASE — payments per virtual account');
  console.log('═══════════════════════════════════════════════════════════\n');

  let dbTotal = 0;
  for (const c of org.customers) {
    const va = c.virtualAccountNumber ?? '(no VA)';
    const txSum = c.transactions.reduce((s, t) => s + Number(t.amount), 0);
    dbTotal += txSum;

    console.log(`${c.name}`);
    console.log(`  VA: ${va}`);
    console.log(`  Transactions in DB: ${c.transactions.length}`);
    if (c.transactions.length === 0) {
      console.log('  Total: ₦0');
    } else {
      for (const t of c.transactions) {
        console.log(
          `    ₦${Number(t.amount).toLocaleString()} — ${t.payerName ?? 'unknown'} — ${t.paymentDate.toISOString().slice(0, 10)} — ref ${t.nombaReference}`,
        );
      }
      console.log(`  Subtotal: ₦${txSum.toLocaleString()}`);
    }
    console.log('');
  }
  console.log(`DB TOTAL (all customers): ₦${dbTotal.toLocaleString()}\n`);

  const token = await nombaToken();
  const nombaRows = await fetchAllSubAccountTx(token, subId);

  const credits = nombaRows.filter(
    (r) =>
      String(r.status ?? '').toUpperCase() === 'SUCCESS' &&
      ['vact_transfer', 'qrt_credit', 'transfer'].includes(String(r.type ?? '')),
  );

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`NOMBA SUB-ACCOUNT (${subId.slice(0, 8)}…) — inbound credits`);
  console.log('═══════════════════════════════════════════════════════════\n');

  let nombaCreditTotal = 0;
  let nombaFees = 0;
  const byVa = new Map<string, { amount: number; count: number; rows: typeof credits }>();

  for (const r of credits) {
    const meta = (r.meta as Record<string, unknown>) ?? {};
    const va =
      String(
        meta.recipientAccountNumber ??
          meta.aliasAccountNumber ??
          meta.virtualAccount ??
          r.customerBillerId ??
          '',
      ) || 'unknown';
    const amt = naira(r.amount);
    const fee = naira(r.fixedCharge ?? meta.fee ?? 0);
    nombaCreditTotal += amt;
    nombaFees += fee;

    const entry = byVa.get(va) ?? { amount: 0, count: 0, rows: [] };
    entry.amount += amt;
    entry.count += 1;
    entry.rows.push(r);
    byVa.set(va, entry);
  }

  for (const [va, info] of byVa) {
    const customer = org.customers.find((c) => c.virtualAccountNumber === va);
    console.log(`${customer?.name ?? 'Unknown customer'} — VA ${va}`);
    for (const r of info.rows) {
      const meta = (r.meta as Record<string, unknown>) ?? {};
      console.log(
        `    ₦${naira(r.amount).toLocaleString()} (fee ₦${naira(r.fixedCharge ?? meta.fee ?? 0).toLocaleString()}) — ${String(r.timeCreated ?? '').slice(0, 10)} — ${r.id}`,
      );
    }
    console.log(`  Subtotal: ₦${info.amount.toLocaleString()} (${info.count} payment(s))`);
    console.log('');
  }

  const balRes = await fetch(`${process.env.NOMBA_BASE_URL}/accounts/${subId}/balance`, {
    headers: { Authorization: `Bearer ${token}`, accountId: process.env.NOMBA_ACCOUNT_ID! },
  });
  const balData = await balRes.json();
  const balance = naira(balData.data?.amount ?? 0);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('COMPARISON');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`You expected total sent:        ₦300`);
  console.log(`ReconOS DB total recorded:      ₦${dbTotal.toLocaleString()}`);
  console.log(`Nomba sub-account credits:      ₦${nombaCreditTotal.toLocaleString()} (${credits.length} tx)`);
  console.log(`Nomba fees on those credits:    ₦${nombaFees.toLocaleString()}`);
  console.log(`Nomba available balance now:    ₦${balance.toLocaleString()}`);
  console.log(`Credits − fees (expected bal):  ₦${(nombaCreditTotal - nombaFees).toLocaleString()}`);

  const allVas = org.customers.map((c) => c.virtualAccountNumber).filter(Boolean) as string[];
  const nombaVas = new Set(byVa.keys());
  const missingOnSub = allVas.filter((va) => !nombaVas.has(va));
  if (missingOnSub.length) {
    console.log('\nVAs with NO credits on sub-account ledger:');
    for (const va of missingOnSub) {
      const c = org.customers.find((x) => x.virtualAccountNumber === va);
      const dbAmt = c?.transactions.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      console.log(`  ${c?.name} (${va}) — DB shows ₦${dbAmt.toLocaleString()}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
