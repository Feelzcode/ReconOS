/** Backfill template AI explanations for matches missing aiExplanation (no Gemini quota used). */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AiService } from '../src/ai/ai.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

async function main() {
  const config = new ConfigService();
  const ai = new AiService(config);

  const matches = await prisma.reconciliationMatch.findMany({
    where: { OR: [{ aiExplanation: null }, { aiExplanation: '' }] },
    include: {
      transaction: true,
      invoice: true,
    },
    take: 200,
  });

  let updated = 0;
  for (const m of matches) {
    if (!m.transaction || !m.invoice) continue;
    const text = ai.buildMatchExplanationTemplate({
      transactionAmount: Number(m.transaction.amount),
      invoiceNumber: m.invoice.invoiceNumber,
      invoiceAmount: Number(m.invoice.amount),
      confidenceScore: m.confidenceScore,
      matchReason: m.matchReason,
      payerName: m.transaction.payerName ?? undefined,
      paymentDate: m.transaction.paymentDate,
      invoiceCreatedAt: m.invoice.createdAt,
    });
    await prisma.reconciliationMatch.update({
      where: { id: m.id },
      data: { aiExplanation: text },
    });
    updated++;
  }

  console.log(`Backfilled ${updated} match explanation(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
