import { processIntegrationJobs } from '../src/services/integrations/processor';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  console.log('Running processIntegrationJobs...');
  const result = await processIntegrationJobs();
  console.log('Result:', result);
}

run().catch(console.error);
