require('dotenv').config({path: '.env.local'});
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api/certificates';
const EVENT_ID = process.env.CERTIFICATE_EVENT_ID || 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret';

// Generate a valid token
const base = `ARAM:CERT:5KM`;
const hmac = crypto.createHmac('sha256', SECRET).update(base).digest('hex');
const VALID_TOKEN = `${base}:${hmac}`;

async function runLoadTest(concurrentUsers) {
  console.log(`\n=== Starting Load Test with ${concurrentUsers} concurrent users ===`);
  
  const startTime = Date.now();
  const promises = [];
  
  let successCount = 0;
  let errorCount = 0;
  let latencies = [];

  for (let i = 0; i < concurrentUsers; i++) {
    const p = (async () => {
      const reqStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: VALID_TOKEN,
            name: `Test User ${i}`,
            email: `loadtest+${i}@example.com`
          })
        });
        
        const reqLatency = Date.now() - reqStart;
        latencies.push(reqLatency);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.certificate_url) {
            successCount++;
          } else {
            console.error('Data error:', data);
            errorCount++;
          }
        } else {
          const text = await res.text();
          console.error(`HTTP ${res.status}:`, text);
          errorCount++;
        }
      } catch (err) {
        latencies.push(Date.now() - reqStart);
        errorCount++;
      }
    })();
    promises.push(p);
  }

  await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);
  
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`Results for ${concurrentUsers} users:`);
  console.log(`- Total Time: ${totalTime}ms`);
  console.log(`- Successes: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Latency P50: ${p50}ms`);
  console.log(`- Latency P95: ${p95}ms`);
  console.log(`- Latency P99: ${p99}ms`);
  console.log(`- Requests/sec: ${((concurrentUsers / totalTime) * 1000).toFixed(2)}`);
  
  return { successCount, errorCount };
}

async function runAllTests() {
  const users = [10, 50, 100, 250, 500, 750, 1000];
  
  for (const u of users) {
    await runLoadTest(u);
    // Cool down between tests
    await new Promise(r => setTimeout(r, 2000));
  }
}

runAllTests().catch(console.error);
