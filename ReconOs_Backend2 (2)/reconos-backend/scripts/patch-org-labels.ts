/**
 * One-off: set industry labels on existing orgs (no full re-seed).
 * Run: npx ts-node scripts/patch-org-labels.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PATCHES: Array<{
  email: string;
  industryTemplate: string;
  customerLabel: string;
  invoiceLabel: string;
  industry: string;
}> = [
  {
    email: 'admin@royalcrown.edu.ng',
    industryTemplate: 'education',
    customerLabel: 'Students',
    invoiceLabel: 'Invoices',
    industry: 'Education',
  },
  {
    email: 'lagosheights@gmail.com',
    industryTemplate: 'property',
    customerLabel: 'Tenants',
    invoiceLabel: 'Invoices',
    industry: 'Real Estate',
  },
];

async function main() {
  for (const p of PATCHES) {
    const org = await prisma.organization.update({
      where: { email: p.email },
      data: {
        industryTemplate: p.industryTemplate,
        customerLabel: p.customerLabel,
        invoiceLabel: p.invoiceLabel,
        industry: p.industry,
      },
    });
    console.log(`✓ ${org.name} → ${p.customerLabel} / ${p.invoiceLabel}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
