-- 20260928000002_walkathon_schema.sql

-- ==========================================
-- 1. Walkathon Distance Categories
-- ==========================================
CREATE TABLE IF NOT EXISTS public.walkathon_distance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    distance_km NUMERIC NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER NULL CHECK (capacity IS NULL OR capacity >= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a single event cannot have exactly duplicate distance numbers or names to prevent confusion
CREATE UNIQUE INDEX idx_walkathon_distance_categories_event_distance 
ON public.walkathon_distance_categories (event_id, distance_km);

CREATE UNIQUE INDEX idx_walkathon_distance_categories_event_name 
ON public.walkathon_distance_categories (event_id, lower(name));

CREATE INDEX idx_walkathon_distance_categories_event_id ON public.walkathon_distance_categories(event_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_walkathon_distance_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_walkathon_distance_categories_timestamp
    BEFORE UPDATE ON public.walkathon_distance_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_walkathon_distance_categories_updated_at();

-- RLS for Walkathon Distance Categories
ALTER TABLE public.walkathon_distance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for event organizers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.view'));

CREATE POLICY "Enable insert for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

CREATE POLICY "Enable update for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

CREATE POLICY "Enable delete for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR DELETE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.manage'));

-- Public read for active categories
CREATE POLICY "Enable read for public (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR SELECT
    USING (is_active = true);


-- ==========================================
-- 2. Extend Registrations Table
-- ==========================================
ALTER TABLE public.registrations 
ADD COLUMN distance_category_id UUID NULL REFERENCES public.walkathon_distance_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_registrations_distance_category_id ON public.registrations(distance_category_id);

-- Trigger to ensure distance_category_id belongs to the same event
CREATE OR REPLACE FUNCTION public.check_registration_distance_category()
RETURNS TRIGGER AS $$
DECLARE
    v_dc_event_id UUID;
BEGIN
    IF NEW.distance_category_id IS NOT NULL THEN
        SELECT event_id INTO v_dc_event_id FROM public.walkathon_distance_categories WHERE id = NEW.distance_category_id;
        IF v_dc_event_id != NEW.event_id THEN
            RAISE EXCEPTION 'Data integrity violation: Distance category must belong to the same event as the registration';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_registration_distance_category
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.check_registration_distance_category();


-- ==========================================
-- 3. Extend Access Zones (Checkpoints)
-- ==========================================
ALTER TABLE public.access_zones
ADD COLUMN checkpoint_type TEXT NULL CHECK (checkpoint_type IN ('START', 'CHECKPOINT', 'FINISH')),
ADD COLUMN distance_km NUMERIC NULL,
ADD COLUMN sequence INTEGER NULL;


-- ==========================================
-- 4. Update Registration RPC
-- ==========================================
CREATE OR REPLACE FUNCTION public.submit_event_registration(
  p_event_id UUID,
  p_person_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_event RECORD;
  v_settings RECORD;
  v_active_count INTEGER;
  v_email TEXT;
  v_person_id UUID;
  v_event_person_id UUID;
  v_registration_id UUID;
  v_registration_number TEXT;
  v_distance_category_id UUID;
  v_distance_category RECORD;
  v_distance_active_count INTEGER;
  v_metadata JSONB;
BEGIN
  -- 1. Validate event exists and get workspace
  SELECT id, workspace_id, type INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  v_workspace_id := v_event.workspace_id;

  -- 2. Lock Registration Settings for Capacity Enforcement
  SELECT * INTO v_settings 
  FROM public.event_registration_settings 
  WHERE event_id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RAISE EXCEPTION 'Registration is not enabled for this event';
  END IF;

  -- 3. Walkathon Specific Validation & Locking
  v_distance_category_id := (p_person_data->>'distance_category_id')::UUID;
  
  IF v_event.type = 'Walkathon' THEN
    IF v_distance_category_id IS NULL THEN
        RAISE EXCEPTION 'Distance category is required for Walkathon registrations';
    END IF;

    -- Lock the specific distance category for concurrency safety
    SELECT * INTO v_distance_category 
    FROM public.walkathon_distance_categories 
    WHERE id = v_distance_category_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Distance category not found';
    END IF;

    IF v_distance_category.event_id != p_event_id THEN
        RAISE EXCEPTION 'Distance category belongs to a different event';
    END IF;

    IF NOT v_distance_category.is_active THEN
        RAISE EXCEPTION 'This distance category is currently closed';
    END IF;

    -- Enforce Distance Category Capacity
    IF v_distance_category.capacity IS NOT NULL THEN
        SELECT COUNT(*) INTO v_distance_active_count 
        FROM public.registrations 
        WHERE distance_category_id = v_distance_category_id AND status IN ('pending', 'confirmed');

        IF v_distance_active_count >= v_distance_category.capacity THEN
            RAISE EXCEPTION 'Capacity reached for this distance category';
        END IF;
    END IF;
  ELSIF v_distance_category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Distance category can only be provided for Walkathon events';
  END IF;

  -- 4. Check Global Event Capacity
  IF v_settings.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count 
    FROM public.registrations 
    WHERE event_id = p_event_id AND status IN ('pending', 'confirmed');

    IF v_active_count >= v_settings.capacity THEN
      RAISE EXCEPTION 'Event capacity reached';
    END IF;
  END IF;

  -- 5. Normalize Email
  v_email := lower(trim(p_person_data->>'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- 6. Find or Create Person Identity
  SELECT id INTO v_person_id 
  FROM public.people 
  WHERE workspace_id = v_workspace_id AND email = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.people (
      workspace_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      organization, 
      job_title
    ) VALUES (
      v_workspace_id,
      p_person_data->>'first_name',
      p_person_data->>'last_name',
      v_email,
      p_person_data->>'phone',
      p_person_data->>'organization',
      p_person_data->>'job_title'
    ) RETURNING id INTO v_person_id;
  END IF;

  -- 7. Find or Create event_people relationship
  SELECT id INTO v_event_person_id 
  FROM public.event_people 
  WHERE event_id = p_event_id AND person_id = v_person_id AND person_type = 'attendee';

  IF NOT FOUND THEN
    INSERT INTO public.event_people (
      event_id,
      person_id,
      person_type,
      status
    ) VALUES (
      p_event_id,
      v_person_id,
      'attendee',
      'active'
    ) RETURNING id INTO v_event_person_id;
  END IF;

  -- 8. Check Duplicate Active Registration
  IF EXISTS (
    SELECT 1 FROM public.registrations 
    WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'An active registration already exists for this event.';
  END IF;

  -- 9. Generate Registration Number
  v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));

  -- 10. Prepare Metadata
  v_metadata := '{}'::jsonb;
  IF p_person_data ? 'gender' THEN v_metadata := jsonb_set(v_metadata, '{gender}', p_person_data->'gender'); END IF;
  IF p_person_data ? 'age' THEN v_metadata := jsonb_set(v_metadata, '{age}', p_person_data->'age'); END IF;
  IF p_person_data ? 't_shirt_size' THEN v_metadata := jsonb_set(v_metadata, '{t_shirt_size}', p_person_data->'t_shirt_size'); END IF;
  IF p_person_data ? 'emergency_contact_name' THEN v_metadata := jsonb_set(v_metadata, '{emergency_contact_name}', p_person_data->'emergency_contact_name'); END IF;
  IF p_person_data ? 'emergency_contact_phone' THEN v_metadata := jsonb_set(v_metadata, '{emergency_contact_phone}', p_person_data->'emergency_contact_phone'); END IF;


  -- 11. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    registration_number,
    status,
    confirmation_status,
    confirmed_at,
    distance_category_id,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
    v_distance_category_id,
    v_metadata
  ) RETURNING id INTO v_registration_id;

  -- Return Result
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;


-- ==========================================
-- 5. Update Check-in RPC
-- ==========================================
CREATE OR REPLACE FUNCTION public.process_check_in(
    p_qr_token_hash TEXT,
    p_zone_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_scanner_uid UUID;
    v_zone RECORD;
    v_event RECORD;
    v_credential RECORD;
    v_registration RECORD;
    v_has_scan_permission BOOLEAN;
    v_now TIMESTAMPTZ := now();
    v_manual_assignment RECORD;
    v_rules JSONB;
    v_rule RECORD;
    v_rule_matched BOOLEAN := FALSE;
    v_existing_allowed INT;
    v_prereq_zone_id UUID;
    v_prereq_passed BOOLEAN;
    v_distance_rule_found BOOLEAN := FALSE;
    v_distance_rule_passed BOOLEAN := FALSE;
    v_allowed_distances JSONB;
BEGIN
    -- 1. Identify Scanner via auth.uid()
    v_scanner_uid := auth.uid();
    IF v_scanner_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'Scanner is not authenticated.');
    END IF;

    -- 2. Validate Zone
    SELECT * INTO v_zone FROM public.access_zones WHERE id = p_zone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_not_found', 'message', 'The requested access zone does not exist.');
    END IF;

    -- 3. Verify Scanner Permissions for this Event's Workspace
    SELECT workspace_id INTO v_event FROM public.events WHERE id = v_zone.event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'event_not_found', 'message', 'The event for this zone does not exist.');
    END IF;

    v_has_scan_permission := public.has_permission(v_event.workspace_id, 'checkin.scan');
    IF NOT v_has_scan_permission THEN
        INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
    END IF;

    -- 4. Validate QR Credential
    SELECT * INTO v_credential FROM public.qr_credentials WHERE credential_token_hash = p_qr_token_hash;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
    END IF;

    IF v_credential.event_id != v_zone.event_id THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'wrong_event');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event', 'message', 'This QR credential belongs to a different event.');
    END IF;

    IF v_credential.status != 'active' THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_' || v_credential.status);
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_' || v_credential.status, 'message', 'This QR credential is ' || v_credential.status || '.');
    END IF;

    IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < v_now THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_expired');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_expired', 'message', 'This QR credential has expired.');
    END IF;

    -- 5. Lock Registration for Concurrency Safety
    SELECT * INTO v_registration FROM public.registrations WHERE id = v_credential.registration_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_registration.status != 'confirmed' THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'registration_not_confirmed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_confirmed', 'message', 'Registration is not confirmed.');
    END IF;

    -- 6. Evaluate Zone State
    IF NOT v_zone.is_active THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'zone_inactive');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_inactive', 'message', 'This access zone is currently closed.');
    END IF;

    IF v_zone.starts_at IS NOT NULL AND v_zone.starts_at > v_now THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has not opened yet.');
    END IF;

    IF v_zone.ends_at IS NOT NULL AND v_zone.ends_at < v_now THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has already closed.');
    END IF;

    -- 7. Evaluate Duplicate / Re-entry rule
    IF NOT v_zone.allow_reentry THEN
        SELECT COUNT(*) INTO v_existing_allowed FROM public.check_ins 
        WHERE registration_id = v_registration.id 
          AND access_zone_id = p_zone_id 
          AND result = 'allowed';

        IF v_existing_allowed > 0 THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'already_checked_in');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
        END IF;
    END IF;

    -- 8. Evaluate Manual Assignment
    SELECT * INTO v_manual_assignment FROM public.access_assignments 
    WHERE zone_id = p_zone_id AND registration_id = v_registration.id LIMIT 1;

    IF v_manual_assignment.id IS NOT NULL THEN
        v_rule_matched := TRUE;
    ELSE
        -- 9. Evaluate Access Rules
        FOR v_rule IN SELECT * FROM public.access_rules WHERE zone_id = p_zone_id AND is_active = true LOOP
            IF v_rule.rule_type = 'all_confirmed_attendees' THEN
                v_rule_matched := TRUE;
            END IF;
            
            -- Walkathon distance category rule evaluation
            IF v_rule.rule_type = 'walkathon_distance' THEN
                v_distance_rule_found := TRUE;
                v_allowed_distances := v_rule.rule_value->'distance_category_ids';
                
                IF v_registration.distance_category_id IS NOT NULL AND v_allowed_distances IS NOT NULL THEN
                    IF v_allowed_distances @> to_jsonb(v_registration.distance_category_id::text) THEN
                        v_distance_rule_passed := TRUE;
                        v_rule_matched := TRUE;
                    END IF;
                END IF;
            END IF;

            -- Evaluate prerequisite rule
            IF v_rule.rule_type = 'prerequisite_zone' THEN
                v_prereq_zone_id := (v_rule.rule_value->>'zone_id')::UUID;
                IF v_prereq_zone_id IS NOT NULL THEN
                    SELECT EXISTS(
                        SELECT 1 FROM public.check_ins 
                        WHERE registration_id = v_registration.id 
                          AND access_zone_id = v_prereq_zone_id 
                          AND result = 'allowed'
                    ) INTO v_prereq_passed;

                    IF v_prereq_passed THEN
                        -- Do nothing, let it match other OR rules or pass if this is the only rule.
                        -- Actually, a prerequisite is traditionally an AND condition!
                        -- If a prerequisite fails, they CANNOT enter, regardless of other rules.
                        -- Let's enforce prerequisites as a strict requirement.
                        v_rule_matched := TRUE;
                    ELSE
                        -- Prerequisite failed. Explicitly deny and EXIT.
                        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
                        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'prerequisite_not_met');
                        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'prerequisite_not_met', 'message', 'Participant has not completed prerequisite checkpoint.');
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- If a distance rule exists, but the user didn't pass it, they are explicitly denied.
    IF v_distance_rule_found AND NOT v_distance_rule_passed THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'distance_not_authorized');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'distance_not_authorized', 'message', 'Participant distance category is not authorized for this checkpoint.');
    END IF;

    IF NOT v_rule_matched AND NOT v_distance_rule_found THEN
        -- If no rules matched, and there wasn't a distance rule that specifically denied them (which was handled above)
        -- wait, if no rules matched at all, they shouldn't enter.
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'allowed', NULL);

    -- Fire and forget update on credential
    UPDATE public.qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;
