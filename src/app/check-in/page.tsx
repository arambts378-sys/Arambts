import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import ScannerView from '@/components/check-in/ScannerView';

export const dynamic = 'force-dynamic';

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ event?: string; zone?: string }> }) {
  const params = await searchParams;
  const zoneId = params.zone;
  const eventId = params.event;
  
  const supabase = await createClient();
  const adminClient = createAdminClient();

  if (!eventId) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center max-w-sm w-full border border-outline-variant">
          <span className="material-symbols-outlined text-[48px] text-error mb-4">error</span>
          <h1 className="text-title-lg font-bold mb-2">Invalid Link</h1>
          <p className="text-body-md text-on-surface-variant">The check-in link is missing the event context.</p>
        </div>
      </div>
    );
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Safely encode redirect
    const nextUrl = `/check-in?event=${encodeURIComponent(eventId)}${zoneId ? `&zone=${encodeURIComponent(zoneId)}` : ''}`;
    redirect(`/login?redirect=${encodeURIComponent(nextUrl)}`);
  }

  // 1. Validate the event exists
  const { data: eventData, error: eventError } = await adminClient
    .from('events')
    .select('id, name, workspace_id')
    .eq('id', eventId)
    .single();

  if (eventError || !eventData) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center max-w-sm w-full border border-outline-variant">
          <span className="material-symbols-outlined text-[48px] text-error mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold mb-2">Event Not Found</h1>
          <p className="text-body-md text-on-surface-variant">The requested event could not be found or has been removed.</p>
        </div>
      </div>
    );
  }

  // 2. Fetch all active zones for the event
  const { data: activeZones, error: zonesError } = await adminClient
    .from('access_zones')
    .select('id, name, starts_at, ends_at, is_active')
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (zonesError) {
    console.error('Failed to fetch zones:', zonesError);
  }

  const zones = activeZones || [];

  // Helper for generating links
  const getZoneLink = (zId?: string) => {
    let url = `/check-in?event=${eventId}`;
    if (zId) {
      url += `&zone=${zId}`;
    }
    return url;
  };

  // A. Zero active zones
  if (zones.length === 0) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-outline-variant">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">badge</span>
          <h1 className="text-title-lg font-bold mb-2">No Active Zones</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            There are currently no active checkpoints for <strong>{eventData.name}</strong>.
          </p>
          <Link 
            href="/app"
            className="text-primary font-bold hover:underline"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // B. Exactly one zone and no zone provided
  if (zones.length === 1 && !zoneId) {
    redirect(getZoneLink(zones[0].id));
  }

  // C. Multiple zones and no zone provided
  if (zones.length > 1 && !zoneId) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-sm border border-outline-variant">
          <h1 className="text-title-lg font-bold mb-1 text-center">Select Checkpoint</h1>
          <p className="text-body-sm text-on-surface-variant text-center mb-6">{eventData.name}</p>
          
          <div className="flex flex-col gap-3">
            {zones.map((zone: any) => (
              <Link
                key={zone.id}
                href={getZoneLink(zone.id)}
                className="w-full p-4 border border-outline-variant rounded-2xl flex items-center justify-between hover:bg-surface-variant transition-colors"
              >
                <div className="text-left">
                  <p className="font-bold text-on-surface">{zone.name}</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // D. Zone provided
  if (zoneId) {
    const zone = zones.find((z: any) => z.id === zoneId);
    
    if (!zone) {
      return (
        <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-outline-variant">
            <span className="material-symbols-outlined text-[48px] text-error mb-4">gpp_bad</span>
            <h1 className="text-title-lg font-bold mb-2">Zone Not Found</h1>
            <p className="text-body-md text-on-surface-variant mb-6">
              The checkpoint could not be found or is inactive.
            </p>
            <Link 
              href={getZoneLink()}
              className="text-primary font-bold hover:underline"
            >
              View All Checkpoints
            </Link>
          </div>
        </div>
      );
    }

    return (
      <ScannerView
        eventId={eventId as string}
        eventName={eventData.name}
        zoneId={zoneId}
        zoneName={zone.name}
        assignmentStartsAt={null}
        assignmentEndsAt={null}
        zoneStartsAt={zone.starts_at}
        zoneEndsAt={zone.ends_at}
      />
    );
  }

  return null;
}
