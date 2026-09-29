-- ==========================================
-- ARAM BTS: Restore Volunteer Module
-- ==========================================

-- 1. Create event_staff_assignments
CREATE TABLE IF NOT EXISTS public.event_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'volunteer',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_event_id ON public.event_staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_user_id ON public.event_staff_assignments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_event_staff ON public.event_staff_assignments(event_id, user_id) WHERE status = 'active';

-- 2. Create volunteer_zone_assignments
CREATE TABLE IF NOT EXISTS public.volunteer_zone_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_assignment_id UUID NOT NULL REFERENCES public.event_staff_assignments(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.access_zones(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_assignment_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteer_zone_assignments_staff_id ON public.volunteer_zone_assignments(staff_assignment_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_zone_assignments_zone_id ON public.volunteer_zone_assignments(zone_id);

-- 3. Restore Permissions
INSERT INTO public.permissions (id, name) VALUES 
  (gen_random_uuid(), 'volunteers.view'),
  (gen_random_uuid(), 'volunteers.manage')
ON CONFLICT (name) DO NOTHING;

-- Assign to workspace_owner and admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('workspace_owner', 'admin') AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_zone_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for event_staff_assignments
CREATE POLICY "Admins can view volunteers" 
ON public.event_staff_assignments FOR SELECT 
USING (
  public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.view')
);

CREATE POLICY "Admins can manage volunteers" 
ON public.event_staff_assignments FOR ALL 
USING (
  public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
);

CREATE POLICY "Users can view their own active assignments" 
ON public.event_staff_assignments FOR SELECT 
USING (
  auth.uid() = user_id AND status = 'active'
);

-- 6. RLS Policies for volunteer_zone_assignments
CREATE POLICY "Admins can view volunteer zones" 
ON public.volunteer_zone_assignments FOR SELECT 
USING (
  public.has_permission((
    SELECT e.workspace_id 
    FROM public.events e 
    JOIN public.event_staff_assignments sa ON sa.event_id = e.id 
    WHERE sa.id = staff_assignment_id
  ), 'volunteers.view')
);

CREATE POLICY "Admins can manage volunteer zones" 
ON public.volunteer_zone_assignments FOR ALL 
USING (
  public.has_permission((
    SELECT e.workspace_id 
    FROM public.events e 
    JOIN public.event_staff_assignments sa ON sa.event_id = e.id 
    WHERE sa.id = staff_assignment_id
  ), 'volunteers.manage')
);

CREATE POLICY "Volunteers can view their own zones" 
ON public.volunteer_zone_assignments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_staff_assignments sa 
    WHERE sa.id = staff_assignment_id AND sa.user_id = auth.uid() AND sa.status = 'active'
  )
);

-- 7. Trigger to update event_staff_assignments.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_staff_assignments_updated_at
BEFORE UPDATE ON public.event_staff_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 8. Replace process_check_in RPC to include volunteer checks
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
    v_has_manage_permission BOOLEAN;
    v_staff_assignment RECORD;
    v_zone_assignment RECORD;
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
    v_has_manage_permission := public.has_permission(v_event.workspace_id, 'checkin.manage');

    IF NOT v_has_scan_permission THEN
        INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_scanner', 'message', 'You do not have permission to scan for this event.');
    END IF;

    -- 4. Volunteer Authorization Checks
    IF NOT v_has_manage_permission THEN
        -- Standard volunteers MUST have an active assignment and zone authorization
        SELECT * INTO v_staff_assignment FROM public.event_staff_assignments 
        WHERE event_id = v_zone.event_id AND user_id = v_scanner_uid AND status = 'active' LIMIT 1;
        
        IF v_staff_assignment.id IS NULL THEN
            INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_scanner', 'message', 'You do not have an active volunteer assignment for this event.');
        END IF;

        SELECT * INTO v_zone_assignment FROM public.volunteer_zone_assignments 
        WHERE staff_assignment_id = v_staff_assignment.id AND zone_id = p_zone_id LIMIT 1;
        
        IF v_zone_assignment.id IS NULL THEN
            INSERT INTO public.check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'You are not assigned to scan this zone.');
        END IF;
    END IF;

    -- 5. Validate QR Credential
    IF v_zone.requires_qr THEN
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
        
        SELECT * INTO v_registration FROM public.registrations WHERE id = v_credential.registration_id FOR UPDATE;
    ELSE
        SELECT * INTO v_credential FROM public.qr_credentials WHERE credential_token_hash = p_qr_token_hash;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
        END IF;
        SELECT * INTO v_registration FROM public.registrations WHERE id = v_credential.registration_id FOR UPDATE;
    END IF;

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

    -- 7. Evaluate Duplicate / Re-entry limits
    SELECT COUNT(*) INTO v_existing_allowed FROM public.check_ins 
    WHERE registration_id = v_registration.id 
      AND access_zone_id = p_zone_id 
      AND result = 'allowed';

    IF v_zone.entitlement_limit IS NOT NULL THEN
        IF v_existing_allowed >= v_zone.entitlement_limit THEN
            INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'entitlement_exhausted');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'entitlement_exhausted', 'message', 'Participant has exhausted their entitlement for this zone.');
        END IF;
    ELSE
        IF NOT v_zone.allow_reentry THEN
            IF v_existing_allowed > 0 THEN
                INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
                VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'already_checked_in');
                RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
            END IF;
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
                        v_rule_matched := TRUE;
                    ELSE
                        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
                        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'prerequisite_not_met');
                        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'prerequisite_not_met', 'message', 'Participant has not completed prerequisite checkpoint.');
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    IF v_distance_rule_found AND NOT v_distance_rule_passed THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'distance_not_authorized');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'distance_not_authorized', 'message', 'Participant distance category is not authorized for this checkpoint.');
    END IF;

    IF NOT v_rule_matched AND NOT v_distance_rule_found THEN
        INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO public.check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'allowed', NULL);

    UPDATE public.qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;

-- 9. RPC to get user id by email securely for admins
CREATE OR REPLACE FUNCTION public.get_workspace_user_id_by_email(p_workspace_id UUID, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_manage BOOLEAN;
BEGIN
  -- Verify the caller has volunteers.manage for the workspace
  v_has_manage := public.has_permission(p_workspace_id, 'volunteers.manage');
  IF NOT v_has_manage THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  JOIN public.workspace_members wm ON wm.user_id = u.id
  WHERE wm.workspace_id = p_workspace_id AND lower(u.email) = lower(p_email)
  LIMIT 1;

  RETURN v_user_id;
END;
$$;
