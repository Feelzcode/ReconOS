/**
 * Remove seed/mock customers (fake Wema VAs) and their related data.
 * Keeps customers with real Nomba virtual accounts (e.g. Nombank MFB).
 *
 * Run: npx ts-node scripts/purge-mock-customers.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function isMockCustomer(c: {
  virtualAccountNumber: string | null;
  bankName: string | null;
  nombaAccountId: string | null;
}): boolean {
  if (c.nombaAccountId?.startsWith('nomba_va_')) return true;
  if (c.bankName === 'Wema Bank' && c.virtualAccountNumber?.match(/^0[1-5]\d{8}$/)) {
    return true;
  }
  return false;
}

async function purgeCustomer(customerId: string, name: string) {
  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);

  const transactions = await prisma.transaction.findMany({
    where: { customerId },
    select: { id: true },
  });
  const transactionIds = transactions.map((t) => t.id);

  if (transactionIds.length) {
    await prisma.exception.deleteMany({ where: { transactionId: { in: transactionIds } } });
    await prisma.reconciliationMatch.deleteMany({ where: { transactionId: { in: transactionIds } } });
    await prisma.overpaymentAction.deleteMany({ where: { transactionId: { in: transactionIds } } });
  }

  if (invoiceIds.length) {
    await prisma.overpaymentAction.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await prisma.reconciliationMatch.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  }

  await prisma.transaction.deleteMany({ where: { customerId } });
  await prisma.invoice.deleteMany({ where: { customerId } });
  await prisma.customer.delete({ where: { id: customerId } });

  console.log(`  ✓ Removed mock customer: ${name}`);
}

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const mock = customers.filter(isMockCustomer);
  const real = customers.filter((c) => !isMockCustomer(c));

  console.log(`Found ${customers.length} customers — ${mock.length} mock, ${real.length} real`);
  real.forEach((c) => {
    console.log(`  KEEP: ${c.name} — ${c.virtualAccountNumber} (${c.bankName})`);
  });

  if (mock.length === 0) {
    console.log('Nothing to purge.');
    return;
  }

  console.log('\nPurging mock customers...');
  for (const c of mock) {
    await purgeCustomer(c.id, c.name);
  }

  console.log('\nDone. Remaining customers:');
  const remaining = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  remaining.forEach((c) => {
    console.log(`  • ${c.name} — ${c.virtualAccountNumber} (${c.bankName})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
