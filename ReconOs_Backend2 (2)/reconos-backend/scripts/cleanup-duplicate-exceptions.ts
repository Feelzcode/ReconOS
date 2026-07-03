/** Remove orphan EXCEPTION rows that duplicate an already-MATCHED payment (same VA + amount + time). */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const exceptions = await prisma.transaction.findMany({
    where: { status: 'EXCEPTION' },
    include: { match: true },
  });

  let removed = 0;
  for (const txn of exceptions) {
    const sibling = await prisma.transaction.findFirst({
      where: {
        id: { not: txn.id },
        accountNumber: txn.accountNumber,
        amount: txn.amount,
        status: { in: ['MATCHED', 'MANUALLY_MATCHED', 'IN_REVIEW'] },
        paymentDate: {
          gte: new Date(txn.paymentDate.getTime() - 2 * 60 * 1000),
          lte: new Date(txn.paymentDate.getTime() + 2 * 60 * 1000),
        },
      },
    });
    if (!sibling) continue;

    await prisma.exception.deleteMany({ where: { transactionId: txn.id } });
    await prisma.transaction.delete({ where: { id: txn.id } });
    console.log(`Removed duplicate exception ${txn.nombaReference} (matched sibling: ${sibling.nombaReference})`);
    removed++;
  }

  console.log(`Done — removed ${removed} duplicate exception(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
