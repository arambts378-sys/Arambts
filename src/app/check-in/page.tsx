import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scannerSessionsService } from '@/services/scannerSessions';
import Link from 'next/link';
import ScannerView from '@/components/check-in/ScannerView';

export const dynamic = 'force-dynamic';

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ event?: string; zone?: string; access?: string }> }) {
  const params = await searchParams;
  const accessToken = params.access;
  const zoneId = params.zone;
  let eventId = params.event;
  
  const supabase = await createClient();
  const adminClient = createAdminClient();
  let userId = null;
  let isTokenFlow = false;

  if (accessToken) {
    isTokenFlow = true;
    const tokenHash = scannerSessionsService.hashToken(accessToken);
    
    // Server-side validate token
    const { data: sessionData, error: sessionError } = await adminClient
      .from('volunteer_scanner_sessions')
      .select('event_id, user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single();

    if (sessionError || !sessionData || sessionData.revoked_at || new Date(sessionData.expires_at) < new Date()) {
      return (
        <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm text-center max-w-sm w-full border border-outline-variant">
            <span className="material-symbols-outlined text-[48px] text-error mb-4">gpp_bad</span>
            <h1 className="text-title-lg font-bold mb-2">Access Denied</h1>
            <p className="text-body-md text-on-surface-variant">Scanner access is no longer valid.</p>
          </div>
        </div>
      );
    }
    
    eventId = sessionData.event_id;
    userId = sessionData.user_id;
  } else {
    // Existing Authenticated Flow
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
    userId = user.id;
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

  // 2. Fetch active assignments and zones for the user
  const { data: assignments, error: assignmentError } = await adminClient
    .from('event_staff_assignments')
    .select(`
      id,
      access_zone_id,
      starts_at,
      ends_at,
      active,
      access_zones (
        id,
        name,
        starts_at,
        ends_at,
        is_active
      )
    `)
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('active', true);

  if (assignmentError) {
    console.error('Failed to fetch assignments:', assignmentError);
  }

  // Filter out any assignments where the joined zone is inactive or missing
  const activeAssignments = (assignments || []).filter((a: any) => {
    const zone = Array.isArray(a.access_zones) ? a.access_zones[0] : a.access_zones;
    return zone && zone.is_active;
  });

  // Helper for generating links while preserving access token if present
  const getZoneLink = (zId?: string) => {
    let url = '/check-in?';
    if (isTokenFlow && accessToken) {
      url += `access=${accessToken}`;
    } else {
      url += `event=${eventId}`;
    }
    if (zId) {
      url += `&zone=${zId}`;
    }
    return url;
  };

  // A. Zero authorized assignments
  if (activeAssignments.length === 0) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-outline-variant">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">badge</span>
          <h1 className="text-title-lg font-bold mb-2">No Assignments</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            You currently have no active checkpoint assignments for <strong>{eventData.name}</strong>.
          </p>
          {!isTokenFlow && (
            <Link 
              href="/app"
              className="text-primary font-bold hover:underline"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  // B. Exactly one assignment and no zone provided
  if (activeAssignments.length === 1 && !zoneId) {
    redirect(getZoneLink(activeAssignments[0].access_zone_id));
  }

  // C. Multiple assignments and no zone provided
  if (activeAssignments.length > 1 && !zoneId) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-sm border border-outline-variant">
          <h1 className="text-title-lg font-bold mb-1 text-center">Select Checkpoint</h1>
          <p className="text-body-sm text-on-surface-variant text-center mb-6">{eventData.name}</p>
          
          <div className="flex flex-col gap-3">
            {activeAssignments.map((a: any) => {
              const zone = Array.isArray(a.access_zones) ? a.access_zones[0] : a.access_zones;
              return (
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
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // D. Zone provided
  if (zoneId) {
    const activeAssignment = activeAssignments.find((a: any) => a.access_zone_id === zoneId);
    
    if (!activeAssignment) {
      return (
        <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-outline-variant">
            <span className="material-symbols-outlined text-[48px] text-error mb-4">gpp_bad</span>
            <h1 className="text-title-lg font-bold mb-2">Unauthorized Zone</h1>
            <p className="text-body-md text-on-surface-variant mb-6">
              You do not have permission to scan at this checkpoint.
            </p>
            <Link 
              href={getZoneLink()}
              className="text-primary font-bold hover:underline"
            >
              View Your Checkpoints
            </Link>
          </div>
        </div>
      );
    }

    const zone = Array.isArray(activeAssignment.access_zones) ? activeAssignment.access_zones[0] : activeAssignment.access_zones;

    return (
      <ScannerView
        eventId={eventId as string}
        eventName={eventData.name}
        zoneId={zoneId}
        zoneName={zone.name}
        assignmentStartsAt={activeAssignment.starts_at}
        assignmentEndsAt={activeAssignment.ends_at}
        zoneStartsAt={zone.starts_at}
        zoneEndsAt={zone.ends_at}
        accessToken={accessToken}
      />
    );
  }

  return null;
}
