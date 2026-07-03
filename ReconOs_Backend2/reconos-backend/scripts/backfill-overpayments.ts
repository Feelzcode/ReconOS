/** Create missing OverpaymentAction rows for OVERPAID invoices (e.g. after manual Confirm Match). */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const overpaidInvoices = await prisma.invoice.findMany({
    where: { status: 'OVERPAID' },
    include: {
      matches: { include: { transaction: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      overpaymentActions: { where: { status: 'PENDING' } },
    },
  });

  let created = 0;
  for (const inv of overpaidInvoices) {
    if (inv.overpaymentActions.length > 0) continue;

    const match = inv.matches[0];
    const tx = match?.transaction;
    if (!tx) {
      console.warn(`Skip ${inv.invoiceNumber} — no matched transaction`);
      continue;
    }

    const excessAmount = Number(inv.amountPaid) - Number(inv.amount);
    if (excessAmount <= 0) continue;

    const op = await prisma.overpaymentAction.create({
      data: {
        invoiceId: inv.id,
        customerId: inv.customerId,
        transactionId: tx.id,
        excessAmount,
        actionType: 'CREDIT_WALLET',
        status: 'PENDING',
      },
    });

    console.log(
      `Created overpayment ${op.id} — ${inv.invoiceNumber} excess ₦${excessAmount} (tx ${tx.nombaReference.slice(0, 24)}…)`,
    );
    created++;
  }

  console.log(`Done — created ${created} overpayment action(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
