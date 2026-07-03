/**
 * Quick Nomba sandbox connectivity check.
 * Run: npx ts-node scripts/test-nomba-sandbox.ts
 * Does NOT print secrets or tokens.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = process.env.NOMBA_BASE_URL || 'https://sandbox.nomba.com/v1';
const clientId = process.env.NOMBA_CLIENT_ID;
const clientSecret = process.env.NOMBA_CLIENT_SECRET;
const accountId = process.env.NOMBA_ACCOUNT_ID;

async function main() {
  console.log('Nomba sandbox check');
  console.log('  Base URL:', baseUrl);
  console.log('  Client ID set:', !!clientId);
  console.log('  Client secret set:', !!clientSecret);
  console.log('  Account ID set:', !!accountId);

  if (!clientId || !clientSecret || !accountId) {
    console.error('\n❌ Missing NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, or NOMBA_ACCOUNT_ID in .env');
    process.exit(1);
  }

  if (baseUrl.includes('sandbox.api.nomba.com')) {
    console.error('\n❌ Wrong base URL. Use https://sandbox.nomba.com/v1 (see developer.nomba.com)');
    process.exit(1);
  }

  try {
    const res = await fetch(`${baseUrl}/auth/token/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accountId,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`\n❌ Auth failed: HTTP ${res.status}`);
      console.error('   Response:', text.slice(0, 300));
      process.exit(1);
    }

    const data = JSON.parse(text);
    const token = data.data?.access_token ?? data.access_token;
    console.log('\n✅ Sandbox auth OK — token received:', !!token);

    const listRes = await fetch(`${baseUrl}/accounts/virtual/list`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const listText = await listRes.text();
    if (listRes.ok) {
      const listData = JSON.parse(listText);
      const accounts = listData.data?.results ?? listData.data ?? listData.results ?? [];
      const rows = Array.isArray(accounts) ? accounts : [];
      console.log(`\n📋 Existing sandbox virtual accounts: ${rows.length}`);
      rows.slice(0, 5).forEach((a: any, i: number) => {
        const num =
          a.bankAccountNumber ??
          a.accountNumber ??
          a.account_number ??
          '?';
        const name = a.accountName ?? a.account_name ?? a.bankAccountName ?? 'unnamed';
        console.log(`   ${i + 1}. ${num} — ${name}`);
      });
      if (rows.length > 5) {
        console.log(`   ... and ${rows.length - 5} more`);
      }
    } else {
      console.log('\n⚠️  Could not list virtual accounts:', listText.slice(0, 200));
    }

    // Optional: create a test virtual account
    const vaRes = await fetch(`${baseUrl}/accounts/virtual`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountRef: `reconos_test_${Date.now()}`,
        accountName: 'RECONOS SANDBOX TEST',
        currency: 'NGN',
      }),
    });

    const vaText = await vaRes.text();
    if (!vaRes.ok) {
      console.error(`\n⚠️  Auth works but virtual account failed: HTTP ${vaRes.status}`);
      console.error('   Response:', vaText.slice(0, 400));
      process.exit(1);
    }

    const va = JSON.parse(vaText);
    const payload = va.data ?? va;
    console.log('✅ Virtual account created');
    console.log('   Account number:', payload.bankAccountNumber ?? payload.accountNumber ?? '(check response)');
    console.log('   Account ref:', payload.accountRef ?? '(n/a)');
    console.log('   Bank:', payload.bankName ?? 'Wema Bank');
  } catch (err: any) {
    console.error('\n❌ Network error:', err.message);
    process.exit(1);
  }
}

main();
