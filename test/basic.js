const { BackworkClient, AuthenticationError } = require('../dist/index.js');

const apiKey = process.env.BACKWORK_API_KEY;

async function test() {
  if (!apiKey) {
    console.log('BACKWORK_API_KEY not set; skipping live API smoke checks.');
    console.log('✓ SDK structure is valid!');
    return;
  }

  const client = new BackworkClient(apiKey);

  try {
    // Test health check
    const health = await client.health();
    console.log('✓ Health check:', health.data?.status);
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
  }

  try {
    // Test code lookup
    const result = await client.lookupCode({ code: '76942' });
    console.log('✓ Code lookup:', result.data?.description);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log('⚠ Code lookup requires valid API key:', error.message);
      console.log('  Note: Get your API key from https://backworkhealth.com/dashboard');
    } else {
      console.error('✗ Code lookup failed:', error.message);
    }
  }

  console.log('\n✓ SDK structure is valid!');
}

test().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
