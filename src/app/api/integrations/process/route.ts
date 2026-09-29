import { NextResponse } from 'next/server';
import { processIntegrationJobs } from '@/services/integrations/processor';

async function handleProcess(req: Request) {
  try {
    // Vercel Cron authentication (optional but recommended in production)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is configured, enforce it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In local dev without CRON_SECRET, this passes. In production with CRON_SECRET, it enforces.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processIntegrationJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Integration Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleProcess(req);
}

export async function GET(req: Request) {
  return handleProcess(req);
}
