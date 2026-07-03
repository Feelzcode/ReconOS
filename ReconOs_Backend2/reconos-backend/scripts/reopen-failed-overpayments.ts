/** Reopen FAILED overpayment actions so they appear on Exceptions again. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.overpaymentAction.updateMany({
    where: { status: 'FAILED' },
    data: { status: 'PENDING' },
  });
  console.log(`Reopened ${result.count} failed overpayment(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
