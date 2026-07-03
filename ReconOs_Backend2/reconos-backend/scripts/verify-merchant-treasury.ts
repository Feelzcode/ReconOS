/**
 * Verify single-merchant sub-account setup without starting the API server.
 * Run: npx ts-node scripts/verify-merchant-treasury.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nombaToken(): Promise<string> {
  const baseUrl = process.env.NOMBA_BASE_URL!;
  const res = await fetch(`${baseUrl}/auth/token/issue`, {
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
  if (!res.ok) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return (data.data ?? data).access_token;
}

async function main() {
  const expectedSub = process.env.NOMBA_SUBACCOUNT_ID!;
  const org = await prisma.organization.findFirst({
    where: { email: 'admin@royalcrown.edu.ng' },
    include: { customers: { where: { virtualAccountNumber: { not: null } }, take: 3 } },
  });

  if (!org) throw new Error('Royal Crown org missing');
  if (org.nombaSubAccountId !== expectedSub) {
    throw new Error(
      `Org sub-account mismatch: DB=${org.nombaSubAccountId} env=${expectedSub}`,
    );
  }

  const token = await nombaToken();
  const balRes = await fetch(
    `${process.env.NOMBA_BASE_URL}/accounts/${expectedSub}/balance`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID!,
      },
    },
  );
  const balData = await balRes.json();
  if (!balRes.ok || balData.code !== '00') {
    throw new Error(`Balance fetch failed: ${JSON.stringify(balData)}`);
  }

  const raw =
    balData.data?.availableBalance ??
    balData.data?.balance ??
    balData.data?.amount ??
    0;
  const balanceNaira = typeof raw === 'string' ? Number(raw) : Number(raw) / 100;

  console.log('✓ Merchant:', org.name);
  console.log('✓ Sub-account linked:', org.nombaSubAccountId);
  console.log('✓ accountRef:', org.nombaAccountRef);
  console.log(`✓ Nomba balance: ₦${balanceNaira.toLocaleString()}`);
  console.log(`✓ Customers with VAs: ${org.customers.length}`);
  org.customers.forEach((c) =>
    console.log(`    - ${c.name}: VA ${c.virtualAccountNumber}`),
  );
  console.log('\nSingle-merchant treasury setup is correct.');
}

main()
  .catch((e) => {
    console.error('✗', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
