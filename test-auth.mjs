// Simple OTP test script
// Usage:
//   node test-auth.mjs           → just send OTP
//   node test-auth.mjs <otp>     → send + verify

const BASE  = 'http://localhost:8447/api/v1';
const EMAIL = 'admin@urbanindigo.com';
const OTP   = process.argv[2];

async function run() {
  console.log('── Step 1: Request OTP ──────────────────────────');
  const r1 = await fetch(`${BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL }),
  });
  const d1 = await r1.json();
  console.log('Status:', r1.status, '→', JSON.stringify(d1));

  if (!r1.ok) { console.error('OTP request failed, aborting.'); process.exit(1); }

  if (!OTP) {
    console.log('\n✉️  OTP sent to', EMAIL);
    console.log('   Re-run with:  node test-auth.mjs <your-otp>');
    return;
  }

  console.log('\n── Step 2: Verify OTP ───────────────────────────');
  console.log('   Using OTP:', OTP);
  const r2 = await fetch(`${BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, otp: OTP }),
  });
  const d2 = await r2.json();
  console.log('Status:', r2.status);
  console.log(JSON.stringify(d2, null, 2));

  if (r2.ok) {
    console.log('\n✅ Auth success!');
    console.log('   paramId :', d2.user?.paramId);
    console.log('   pennId  :', d2.user?.pennId);
    console.log('   token   :', d2.token?.slice(0, 40) + '…');
  } else {
    console.error('\n❌ Auth failed:', d2.error);
  }
}

run().catch(console.error);
