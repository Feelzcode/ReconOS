/**
 * Test merchant treasury transfer against live Nomba API.
 *
 * Lookup only (safe):
 *   npx ts-node scripts/test-merchant-transfer.ts --lookup --bank 058 --account 0123456789
 *
 * Execute real transfer (moves money from sub-account):
 *   npx ts-node scripts/test-merchant-transfer.ts --execute --amount 10 --bank 058 --account XXXXXXXXXX --name "ACCOUNT NAME"
 */
import 'dotenv/config';

const baseUrl = process.env.NOMBA_BASE_URL!;
const accountId = process.env.NOMBA_ACCOUNT_ID!;
const subAccountId = process.env.NOMBA_SUBACCOUNT_ID!;
const apiRoot = baseUrl.replace(/\/v1\/?$/, '');

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function token(): Promise<string> {
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
  if (!res.ok) throw new Error(`Auth failed: ${JSON.stringify(data, null, 2)}`);
  return (data.data ?? data).access_token;
}

async function main() {
  const lookupOnly = process.argv.includes('--lookup');
  const execute = process.argv.includes('--execute');
  const bankCode = arg('--bank') || '058';
  const accountNumber = arg('--account') || '';
  const accountName = arg('--name') || '';
  const amount = Number(arg('--amount') || '0');

  if (!lookupOnly && !execute) {
    console.log('Pass --lookup or --execute. See script header for usage.');
    process.exit(1);
  }

  console.log('Nomba base:', baseUrl);
  console.log('Sub-account:', subAccountId);
  console.log('---');

  const accessToken = await token();
  console.log('✓ OAuth token issued\n');

  const balRes = await fetch(`${baseUrl}/accounts/${subAccountId}/balance`, {
    headers: { Authorization: `Bearer ${accessToken}`, accountId },
  });
  const balData = await balRes.json();
  console.log('Balance response:', JSON.stringify(balData, null, 2));
  console.log('---\n');

  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    console.error('Provide --account with a 10-digit account number');
    process.exit(1);
  }

  const lookupRes = await fetch(`${baseUrl}/transfers/bank/lookup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accountId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bankCode,
      accountNumber,
      subAccountId,
    }),
  });
  const lookupData = await lookupRes.json();
  console.log('Lookup HTTP:', lookupRes.status);
  console.log('Lookup response:', JSON.stringify(lookupData, null, 2));
  console.log('---\n');

  if (lookupOnly) {
    console.log('Lookup-only mode — no transfer sent.');
    return;
  }

  const verifiedName =
    lookupData.data?.accountName ?? lookupData.data?.account_name ?? accountName;

  if (!verifiedName && !process.argv.includes('--skip-lookup')) {
    console.error('Lookup did not return account name — cannot transfer. Use --skip-lookup to test raw transfer error.');
    process.exit(1);
  }
  const nameForTransfer = verifiedName || accountName || 'TEST RECIPIENT';

  if (amount <= 0) {
    console.error('Provide --amount > 0 for --execute');
    process.exit(1);
  }

  const reference = `TEST-WD-${Date.now()}`;
  const body = {
    amount: Math.round(amount * 100),
    bankCode,
    accountNumber,
    accountName: nameForTransfer,
    senderName: 'Royal Crown Schools',
    narration: 'ReconOS treasury test transfer',
    merchantTxRef: reference,
  };

  console.log('Transfer request body:', JSON.stringify(body, null, 2));
  console.log('---\n');

  const transferRes = await fetch(`${apiRoot}/v2/transfers/bank/${subAccountId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accountId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const transferData = await transferRes.json();
  console.log('Transfer HTTP:', transferRes.status);
  console.log('Transfer response:', JSON.stringify(transferData, null, 2));

  if (transferRes.ok) {
    console.log('\n✓ Transfer API accepted. Reference:', reference);
    console.log('Check status: GET /transfers/' + reference);
  } else {
    console.log('\n✗ Transfer rejected by Nomba.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
