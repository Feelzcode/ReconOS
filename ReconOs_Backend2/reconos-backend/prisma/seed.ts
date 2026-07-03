// prisma/seed.ts
// Run: npx ts-node prisma/seed.ts
//
// Seeds ReconOs as a SCHOOL collecting per-student term fees via
// dedicated Nomba virtual accounts — one of the example builds named
// directly in the hackathon brief ("School fees per-student tracking").
// Includes real invoice/transaction/match data so the dashboard and
// reconciliation pages have something genuine to show without needing
// to manually create everything live during a demo.

import { PrismaClient, InvoiceStatus, TransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ReconOs demo data — school fees per-student scenario...');

  // ── ORGANIZATION ──────────────────────────────
  // The school itself is the merchant/organization in ReconOs.
  const org = await prisma.organization.upsert({
    where: { email: 'admin@royalcrown.edu.ng' },
    update: {
      industryTemplate: 'education',
      customerLabel: 'Students',
      invoiceLabel: 'Invoices',
      industry: 'Education',
    },
    create: {
      name: 'Royal Crown Schools',
      industry: 'Education',
      industryTemplate: 'education',
      customerLabel: 'Students',
      invoiceLabel: 'Invoices',
      email: 'admin@royalcrown.edu.ng',
    },
  });

  // ── USER ──────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'admin@royalcrown.edu.ng' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Mrs. Folake Bello',
      email: 'admin@royalcrown.edu.ng',
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'OWNER',
    },
  });

  // ── STUDENTS (Customers) ───────────────────────
  // Each student gets their own dedicated Nomba virtual account.
  // Parents pay term fees directly into their child's account number.
  const studentData = [
    { name: 'Tunde Adeyemi (JSS2)', email: 'parent.tunde@gmail.com', phone: '08012345678', va: '0123456789', id: 'nomba_va_001' },
    { name: 'Ngozi Eze (SS1)', email: 'parent.ngozi@gmail.com', phone: '08023456789', va: '0234567890', id: 'nomba_va_002' },
    { name: 'Ibrahim Sule (Primary 5)', email: 'parent.ibrahim@gmail.com', phone: '08034567890', va: '0345678901', id: 'nomba_va_003' },
    { name: 'Chioma Okafor (JSS3)', email: 'parent.chioma@gmail.com', phone: '08045678901', va: '0456789012', id: 'nomba_va_004' },
    { name: 'Amina Yusuf (SS3)', email: 'parent.amina@gmail.com', phone: '08056789012', va: '0567890123', id: 'nomba_va_005' },
  ];

  const customers = await Promise.all(
    studentData.map((s) =>
      prisma.customer.upsert({
        where: { virtualAccountNumber: s.va },
        update: {},
        create: {
          organizationId: org.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          virtualAccountNumber: s.va,
          virtualAccountName: `RECONOS/${s.name.split(' (')[0].toUpperCase()}`,
          bankName: 'Wema Bank',
          nombaAccountId: s.id,
        },
      }),
    ),
  );

  const [tunde, ngozi, ibrahim, chioma, amina] = customers;

  // ── INVOICES (Term fees) ───────────────────────
  // One "Term 2 Fees" invoice per student.
  const invoiceData = [
    { customer: tunde, invoiceNumber: 'INV-0001', description: 'Term 2 school fees', amount: 45000, status: InvoiceStatus.PAID, daysAgo: 10 },
    { customer: ngozi, invoiceNumber: 'INV-0002', description: 'Term 2 school fees', amount: 65000, status: InvoiceStatus.PAID, daysAgo: 8 },
    { customer: ibrahim, invoiceNumber: 'INV-0003', description: 'Term 2 school fees', amount: 35000, status: InvoiceStatus.PARTIAL, daysAgo: 6 },
    { customer: chioma, invoiceNumber: 'INV-0004', description: 'Term 2 school fees', amount: 55000, status: InvoiceStatus.OVERPAID, daysAgo: 5 },
    { customer: amina, invoiceNumber: 'INV-0005', description: 'Term 2 school fees', amount: 70000, status: InvoiceStatus.OVERDUE, daysAgo: 20 },
  ];

  const invoices = await Promise.all(
    invoiceData.map((inv) => {
      const createdAt = new Date(Date.now() - inv.daysAgo * 86400000);
      const dueDate = new Date(createdAt.getTime() + 7 * 86400000);
      return prisma.invoice.upsert({
        where: { invoiceNumber: inv.invoiceNumber },
        update: {
          description: inv.description,
        },
        create: {
          organizationId: org.id,
          customerId: inv.customer.id,
          invoiceNumber: inv.invoiceNumber,
          description: inv.description,
          amount: inv.amount,
          status: inv.status,
          dueDate,
          createdAt,
          notes: null,
          amountPaid:
            inv.status === InvoiceStatus.PAID ? inv.amount :
            inv.status === InvoiceStatus.PARTIAL ? Math.round(inv.amount * 0.6) :
            inv.status === InvoiceStatus.OVERPAID ? inv.amount + 5000 :
            0,
        },
      });
    }),
  );

  const [tundeInvoice, ngoziInvoice, ibrahimInvoice, chiomaInvoice, aminaInvoice] = invoices;

  // ── TRANSACTIONS + MATCHES ─────────────────────
  async function seedTransaction(opts: {
    customer: typeof tunde;
    invoice: typeof tundeInvoice;
    amount: number;
    daysAgo: number;
    nombaRef: string;
    confidenceScore: number;
    autoMatched: boolean;
    status: TransactionStatus;
  }) {
    const paymentDate = new Date(Date.now() - opts.daysAgo * 86400000);
    const txn = await prisma.transaction.upsert({
      where: { nombaReference: opts.nombaRef },
      update: {},
      create: {
        customerId: opts.customer.id,
        nombaReference: opts.nombaRef,
        nombaEventId: `evt_${opts.nombaRef}`,
        amount: opts.amount,
        accountNumber: opts.customer.virtualAccountNumber!,
        payerName: `Parent of ${opts.customer.name.split(' (')[0]}`,
        payerAccount: '0099887766',
        paymentDate,
        status: opts.status,
        rawWebhookData: { event: 'payment.received', seeded: true },
      },
    });

    await prisma.reconciliationMatch.upsert({
      where: { transactionId: txn.id },
      update: {},
      create: {
        invoiceId: opts.invoice.id,
        transactionId: txn.id,
        scoreAmount: 60,
        scoreCustomer: 25,
        scoreTime: 9,
        scoreReference: 5,
        confidenceScore: opts.confidenceScore,
        matchReason: "Seed data: amount matches outstanding balance; paid via student's dedicated virtual account",
        autoMatched: opts.autoMatched,
        aiExplanation: `This payment was matched to ${opts.invoice.invoiceNumber} because the amount aligns with the term fee balance and arrived on the student's dedicated virtual account.`,
      },
    });

    return txn;
  }

  await seedTransaction({
    customer: tunde, invoice: tundeInvoice, amount: 45000, daysAgo: 9,
    nombaRef: 'NMB-SEED-0001', confidenceScore: 99, autoMatched: true, status: TransactionStatus.MATCHED,
  });

  await seedTransaction({
    customer: ngozi, invoice: ngoziInvoice, amount: 65000, daysAgo: 7,
    nombaRef: 'NMB-SEED-0002', confidenceScore: 100, autoMatched: true, status: TransactionStatus.MATCHED,
  });

  // Ibrahim — UNDERPAYMENT example: parent paid 60% of term fees
  await seedTransaction({
    customer: ibrahim, invoice: ibrahimInvoice, amount: 21000, daysAgo: 6,
    nombaRef: 'NMB-SEED-0003', confidenceScore: 91, autoMatched: true, status: TransactionStatus.MATCHED,
  });

  // Chioma — OVERPAYMENT example: parent paid ₦5,000 more than the term fee
  const chiomaTxn = await seedTransaction({
    customer: chioma, invoice: chiomaInvoice, amount: 60000, daysAgo: 5,
    nombaRef: 'NMB-SEED-0004', confidenceScore: 97, autoMatched: true, status: TransactionStatus.MATCHED,
  });

  // Create the corresponding OverpaymentAction for Chioma's excess ₦5,000,
  // so the Payment Exceptions page has a real, resolvable example on load.
  await prisma.overpaymentAction.upsert({
    where: { id: 'seed-overpayment-chioma' },
    update: {},
    create: {
      id: 'seed-overpayment-chioma',
      invoiceId: chiomaInvoice.id,
      customerId: chioma.id,
      transactionId: chiomaTxn.id,
      excessAmount: 5000,
      actionType: 'CREDIT_WALLET',
      status: 'PENDING',
    },
  });

  console.log('✅ Organization, user, students, invoices, transactions, and matches seeded');
  console.log(`   Org: ${org.name} (school)`);
  console.log(`   Login: ${user.email} / password: demo1234`);
  console.log(`   Students: ${customers.map((c) => c.name).join(', ')}`);
  console.log('   Scenarios seeded: 2 fully paid, 1 underpaid (partial), 1 overpaid (pending wallet credit), 1 overdue unpaid');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
