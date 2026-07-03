/**
 * Import a payment from Nomba production requery (missed webhook recovery).
 * Usage: npx ts-node scripts/import-production-payment.ts <sessionId>
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { normalizeNombaVirtualTransaction } from '../src/nomba/nomba-transaction.util';

const SESSION = process.argv[2] || '100004260630161414164034745040';

async function getToken() {
  const baseUrl = process.env.NOMBA_BASE_URL!;
  const accountId = process.env.NOMBA_ACCOUNT_ID!;
  const res = await fetch(`${baseUrl}/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.data?.access_token) throw new Error('Auth failed');
  return { token: data.data.access_token as string, baseUrl, accountId };
}

async function main() {
  const { token, baseUrl, accountId } = await getToken();
  const res = await fetch(`${baseUrl}/transactions/requery/${SESSION}`, {
    headers: { Authorization: `Bearer ${token}`, accountId },
  });
  const body = await res.json();
  const row = body.data;
  if (!row || row.status !== 'SUCCESS') {
    throw new Error(`Requery not successful: ${JSON.stringify(body)}`);
  }

  const va = String(row.recipientAccountNumber);
  const normalized = normalizeNombaVirtualTransaction(
    {
      ...row,
      _syncSource: 'transactions/requery',
    },
    va,
  );
  if (!normalized) throw new Error('Could not normalize requery row');

  console.log('Payment found on Nomba production:');
  console.log('  Amount: ₦' + normalized.amount);
  console.log('  VA:', normalized.accountNumber);
  console.log('  Payer:', normalized.payerName);
  console.log('  Session:', normalized.eventId);

  // Bootstrap Nest to run full ingestion + reconciliation
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const { PaymentIngestionService } = await import('../src/reconciliation/payment-ingestion.service');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const ingestion = app.get(PaymentIngestionService);
  const result = await ingestion.ingestPayment(normalized, { source: 'nomba_sync' });
  console.log('Ingest result:', result);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
