import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptSecret } from '@/utils/encryption';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { host, port, user, pass, encryption, fromName, fromEmail, replyTo, active, subject, customMessage } = body;

    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event Access / Workspace Role
    // Fetch event's workspace
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check permissions (e.g. events.update)
    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_workspace_id: eventData.workspace_id,
      p_permission_name: 'events.update' // typically organizers can manage integrations
    });

    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Load existing config to merge password if blank
    const { data: existingIntegration } = await supabase
      .from('event_integrations')
      .select('config')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .maybeSingle();

    let finalPassword = '';
    
    if (pass && pass.trim() !== '') {
      // New password provided, encrypt it
      finalPassword = encryptSecret(pass);
    } else {
      // Keep existing password
      if (existingIntegration?.config?.pass) {
        finalPassword = existingIntegration.config.pass;
      } else {
        return NextResponse.json({ error: 'Password is required for new configurations' }, { status: 400 });
      }
    }

    const finalConfig = {
      host: host || existingIntegration?.config?.host || '',
      port: port || existingIntegration?.config?.port || '587',
      encryption: encryption || existingIntegration?.config?.encryption || 'tls',
      user: user || existingIntegration?.config?.user || '',
      pass: finalPassword,
      fromName: fromName || existingIntegration?.config?.fromName || '',
      fromEmail: fromEmail || existingIntegration?.config?.fromEmail || '',
      replyTo: replyTo || existingIntegration?.config?.replyTo || '',
      subject: subject || existingIntegration?.config?.subject || '',
      customMessage: customMessage || existingIntegration?.config?.customMessage || ''
    };

    // 4. Use service role to bypass RLS or just normal client because we have access? 
    // Wait, the user has access via RLS to update it. But just in case, we can use the authenticated client.
    // The policy "Enable update for event organizers" allows this.
    const { data: savedData, error: upsertError } = await supabase
      .from('event_integrations')
      .upsert({
        event_id: eventId,
        provider: 'email',
        config: finalConfig,
        is_active: active !== undefined ? active : true
      }, { onConflict: 'event_id,provider' })
      .select('*')
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // 5. Return sanitized config
    return NextResponse.json({
      configured: true,
      provider: 'email',
      active: savedData.is_active,
      host: finalConfig.host,
      port: finalConfig.port,
      encryption: finalConfig.encryption,
      user: finalConfig.user,
      fromName: finalConfig.fromName,
      fromEmail: finalConfig.fromEmail,
      replyTo: finalConfig.replyTo,
      subject: finalConfig.subject,
      customMessage: finalConfig.customMessage
    });

  } catch (error: any) {
    console.error('Error saving email integration:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
