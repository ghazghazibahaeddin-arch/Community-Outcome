import crypto from 'crypto';

async function runTests() {
  console.log('--- Testing Discord Interactions Signature Verification ---');

  // 1. Generate keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const rawPub = publicKey.export({ type: 'spki', format: 'der' }).subarray(12);
  const pubHex = rawPub.toString('hex');

  // Set DISCORD_PUBLIC_KEY in process.env for local server test
  process.env.DISCORD_PUBLIC_KEY = pubHex;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const pingBody = JSON.stringify({ type: 1 });
  const message = Buffer.from(timestamp + pingBody, 'utf8');

  const validSig = crypto.sign(null, message, privateKey).toString('hex');
  const invalidSig = 'a'.repeat(128);

  // Import route directly
  const route = await import('../app/api/discord/interactions/route.js?t=' + Date.now());

  // Test 1: Valid signature with PING
  const mockValidReq = {
    text: async () => pingBody,
    headers: new Headers({
      'x-signature-ed25519': validSig,
      'x-signature-timestamp': timestamp,
      'content-type': 'application/json'
    })
  };

  const resValid = await route.POST(mockValidReq);
  const resValidJson = await resValid.json();
  console.log('Test 1 (Valid PING): status =', resValid.status, 'body =', JSON.stringify(resValidJson));
  if (resValid.status !== 200 || resValidJson.type !== 1) {
    throw new Error('Test 1 failed: Expected status 200 and { type: 1 }');
  }

  // Test 2: Invalid signature
  const mockInvalidReq = {
    text: async () => pingBody,
    headers: new Headers({
      'x-signature-ed25519': invalidSig,
      'x-signature-timestamp': timestamp,
      'content-type': 'application/json'
    })
  };

  const resInvalid = await route.POST(mockInvalidReq);
  console.log('Test 2 (Invalid Sig): status =', resInvalid.status);
  if (resInvalid.status !== 401) {
    throw new Error('Test 2 failed: Expected status 401 for invalid signature');
  }

  // Test 3: Missing signature header
  const mockMissingHeaderReq = {
    text: async () => pingBody,
    headers: new Headers({
      'content-type': 'application/json'
    })
  };

  const resMissing = await route.POST(mockMissingHeaderReq);
  console.log('Test 3 (Missing Headers): status =', resMissing.status);
  if (resMissing.status !== 401) {
    throw new Error('Test 3 failed: Expected status 401 for missing headers');
  }

  // Test 4: Missing DISCORD_PUBLIC_KEY
  delete process.env.DISCORD_PUBLIC_KEY;
  const resNoKey = await route.POST(mockValidReq);
  console.log('Test 4 (Missing DISCORD_PUBLIC_KEY): status =', resNoKey.status);
  if (resNoKey.status !== 401) {
    throw new Error('Test 4 failed: Expected status 401 when DISCORD_PUBLIC_KEY is not set');
  }

  // Restore
  process.env.DISCORD_PUBLIC_KEY = pubHex;

  console.log('ALL DISCORD INTERACTIONS TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
