const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const EVENT_ID = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');

  console.log(`Starting cleanup for event: ${EVENT_ID}`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (DELETING DATA)' : 'DRY RUN'}\n`);

  try {
    // 1. Get counts
    console.log("Gathering counts...");
    
    // Registrations
    const { count: regCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Walkathon participants (child of registrations)
    // We need to find registrations first to count them, or just use foreign key if we had an RPC, but we can query by joining or fetching reg ids.
    const { data: regs } = await supabase.from('registrations').select('id').eq('event_id', EVENT_ID);
    const regIds = regs ? regs.map(r => r.id) : [];
    
    let walkathonCount = 0;
    if (regIds.length > 0) {
      const { count } = await supabase.from('walkathon_participants').select('*', { count: 'exact', head: true }).in('registration_id', regIds);
      walkathonCount = count || 0;
    }

    // QR credentials
    const { count: qrCount } = await supabase.from('qr_credentials').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Check-ins
    const { count: checkinCount } = await supabase.from('check_ins').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Integration Jobs
    const { count: jobCount } = await supabase.from('integration_jobs').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Imported attendees (metadata)
    const { count: importCount } = await supabase.from('event_attendee_imports').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Event People (attendees only)
    const { count: eventPeopleCount } = await supabase.from('event_people').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID).eq('person_type', 'attendee');
    
    // Scanner Sessions
    const { count: sessionCount } = await supabase.from('volunteer_scanner_sessions').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    // Scanner Zones
    const { data: sessions } = await supabase.from('volunteer_scanner_sessions').select('id').eq('event_id', EVENT_ID);
    const sessionIds = sessions ? sessions.map(s => s.id) : [];
    
    let zoneCount = 0;
    if (sessionIds.length > 0) {
      const { count } = await supabase.from('volunteer_scanner_zones').select('*', { count: 'exact', head: true }).in('session_id', sessionIds);
      zoneCount = count || 0;
    }

    console.log("\n--- DRY RUN COUNTS ---");
    console.log(`Registrations: ${regCount}`);
    console.log(`Walkathon Participants: ${walkathonCount}`);
    console.log(`QR credentials: ${qrCount}`);
    console.log(`Check-ins: ${checkinCount}`);
    console.log(`Integration jobs: ${jobCount}`);
    console.log(`Imported attendee logs: ${importCount}`);
    console.log(`Event people (attendees): ${eventPeopleCount}`);
    console.log(`Scanner sessions: ${sessionCount}`);
    console.log(`Scanner zone assignments: ${zoneCount}`);
    console.log("----------------------\n");

    if (!isExecute) {
      console.log("Run with --execute to perform actual deletion.");
      process.exit(0);
    }

    console.log("EXECUTING DELETION in dependency order...");

    // 1. Check-ins (depends on registration, session, event)
    if (checkinCount > 0) {
      console.log("Deleting check-ins...");
      await supabase.from('check_ins').delete().eq('event_id', EVENT_ID);
    }

    // 2. QR credentials (depends on registration, event)
    if (qrCount > 0) {
      console.log("Deleting QR credentials...");
      await supabase.from('qr_credentials').delete().eq('event_id', EVENT_ID);
    }

    // 3. Integration jobs (depends on registration, event)
    if (jobCount > 0) {
      console.log("Deleting integration jobs...");
      await supabase.from('integration_jobs').delete().eq('event_id', EVENT_ID);
    }

    // 4. Walkathon participants (depends on registration)
    if (walkathonCount > 0 && regIds.length > 0) {
      console.log("Deleting walkathon participants...");
      // Split into batches if too large, but usually fine for test data
      const batchSize = 1000;
      for (let i = 0; i < regIds.length; i += batchSize) {
        await supabase.from('walkathon_participants').delete().in('registration_id', regIds.slice(i, i + batchSize));
      }
    }

    // 5. Registrations (depends on event)
    if (regCount > 0) {
      console.log("Deleting registrations...");
      await supabase.from('registrations').delete().eq('event_id', EVENT_ID);
    }

    // 6. Scanner zone assignments (depends on scanner session)
    if (zoneCount > 0 && sessionIds.length > 0) {
      console.log("Deleting scanner zones...");
      const batchSize = 1000;
      for (let i = 0; i < sessionIds.length; i += batchSize) {
        await supabase.from('volunteer_scanner_zones').delete().in('session_id', sessionIds.slice(i, i + batchSize));
      }
    }

    // 7. Scanner sessions (depends on event)
    if (sessionCount > 0) {
      console.log("Deleting scanner sessions...");
      await supabase.from('volunteer_scanner_sessions').delete().eq('event_id', EVENT_ID);
    }

    // 8. Event attendee imports (depends on event)
    if (importCount > 0) {
      console.log("Deleting event attendee imports...");
      await supabase.from('event_attendee_imports').delete().eq('event_id', EVENT_ID);
    }

    // 9. Event people (attendees only)
    if (eventPeopleCount > 0) {
      console.log("Deleting event people...");
      await supabase.from('event_people').delete().eq('event_id', EVENT_ID).eq('person_type', 'attendee');
    }

    // Wait for Supabase to reflect changes
    await new Promise(r => setTimeout(r, 1000));

    console.log("\nVerifying deletion...");
    const { count: finalRegCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    const { count: finalSessionCount } = await supabase.from('volunteer_scanner_sessions').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    
    console.log(`Final Registration Count: ${finalRegCount}`);
    console.log(`Final Scanner Session Count: ${finalSessionCount}`);
    
    if (finalRegCount === 0 && finalSessionCount === 0) {
      console.log("✅ Cleanup successful.");
    } else {
      console.log("⚠️ Some records may still remain.");
    }

  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

main();
