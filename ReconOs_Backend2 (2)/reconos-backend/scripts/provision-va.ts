/**
 * Provision Nomba VA for an existing customer missing virtualAccountNumber.
 * Usage: npx ts-node scripts/provision-va.ts <customerId>
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getToken(): Promise<string> {
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
  if (!res.ok || !data.data?.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.data.access_token;
}

function sanitizeAccountName(customerName: string): string {
  const sanitized = customerName
    .trim()
    .replace(/[^A-Za-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (sanitized.length >= 8) return sanitized.slice(0, 64);
  const words = sanitized.split(' ').filter(Boolean);
  const base = words.length >= 2 ? sanitized : `Student ${sanitized}`;
  return base.padEnd(8, ' ').slice(0, 64).trim();
}

async function main() {
  const customerId = process.argv[2];
  if (!customerId) {
    console.error('Usage: npx ts-node scripts/provision-va.ts <customerId>');
    process.exit(1);
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error(`Customer ${customerId} not found`);
  if (customer.virtualAccountNumber) {
    console.log('Already has VA:', customer.virtualAccountNumber);
    return;
  }

  const token = await getToken();
  const subId = process.env.NOMBA_SUBACCOUNT_ID!;
  const accountRef = customer.id.slice(0, 64);
  const accountName = sanitizeAccountName(customer.name);

  const path = subId ? `/accounts/virtual/${subId}` : '/accounts/virtual';
  const res = await fetch(`${process.env.NOMBA_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      accountId: process.env.NOMBA_ACCOUNT_ID!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountRef, accountName }),
  });

  const data = await res.json();
  if (!res.ok || (data.code && data.code !== '00')) {
    throw new Error(`Nomba error: ${data.description || JSON.stringify(data)}`);
  }

  const payload = data.data ?? data;
  const va = payload.bankAccountNumber ?? payload.accountNumber;
  if (!va) throw new Error(`No VA in response: ${JSON.stringify(data)}`);

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      virtualAccountNumber: va,
      virtualAccountName: payload.bankAccountName ?? payload.accountName ?? accountName,
      bankName: payload.bankName ?? 'Nombank MFB',
      nombaAccountId: payload.accountHolderId ?? payload.accountId ?? accountRef,
    },
  });

  console.log(JSON.stringify({
    customer: updated.name,
    virtualAccountNumber: updated.virtualAccountNumber,
    virtualAccountName: updated.virtualAccountName,
    bankName: updated.bankName,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
