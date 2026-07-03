/**
 * Link Royal Crown (demo merchant) to the dashboard-created Nomba sub-account.
 * Run: npx ts-node scripts/link-merchant-subaccount.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subAccountId = process.env.NOMBA_SUBACCOUNT_ID;
  if (!subAccountId) {
    throw new Error('NOMBA_SUBACCOUNT_ID not set in .env');
  }

  const org = await prisma.organization.findFirst({
    where: { email: 'admin@royalcrown.edu.ng' },
  });

  if (!org) {
    throw new Error('Royal Crown org not found — run seed or register first');
  }

  const accountRef = `reconos_${org.id}`.slice(0, 64);

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { nombaSubAccountId: subAccountId, nombaAccountRef: accountRef },
  });

  console.log('Linked merchant sub-account:');
  console.log(`  Org: ${updated.name} (${updated.id})`);
  console.log(`  nombaSubAccountId: ${updated.nombaSubAccountId}`);
  console.log(`  nombaAccountRef: ${updated.nombaAccountRef}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
