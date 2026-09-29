-- ==========================================
-- ARAM BTS Phase 3C: Volunteer Checkpoint Assignment
-- ==========================================

-- 1. Insert new permissions for volunteer management
INSERT INTO public.permissions (id, name) VALUES 
  (gen_random_uuid(), 'volunteers.view'),
  (gen_random_uuid(), 'volunteers.manage')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to roles
-- workspace_owner gets all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- admin gets all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- editor gets view and manage
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- member gets view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name = 'volunteers.view'
ON CONFLICT DO NOTHING;

-- viewer gets view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name = 'volunteers.view'
ON CONFLICT DO NOTHING;

-- 2. Create event_staff_assignments table
CREATE TABLE IF NOT EXISTS public.event_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_zone_id UUID NOT NULL REFERENCES public.access_zones(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: Same user + event + zone can only have one assignment (active or inactive, doesn't matter, we just UPDATE it)
CREATE UNIQUE INDEX idx_event_staff_assignments_unique ON public.event_staff_assignments(event_id, user_id, access_zone_id);

-- Enforce event_id matches access_zone.event_id via trigger (or assuming app logic handles it, but let's add a trigger for strict data integrity)
CREATE OR REPLACE FUNCTION public.check_zone_event_match()
RETURNS TRIGGER AS $$
DECLARE
    v_zone_event_id UUID;
BEGIN
    SELECT event_id INTO v_zone_event_id FROM public.access_zones WHERE id = NEW.access_zone_id;
    IF v_zone_event_id != NEW.event_id THEN
        RAISE EXCEPTION 'event_id % does not match access_zone_id % event_id %', NEW.event_id, NEW.access_zone_id, v_zone_event_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_zone_event_match
BEFORE INSERT OR UPDATE ON public.event_staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.check_zone_event_match();

-- 3. RLS for event_staff_assignments
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Allow reading assignments if you have volunteers.view OR if it's your own assignment
CREATE POLICY "Enable read for event volunteers (event_staff_assignments)"
    ON public.event_staff_assignments FOR SELECT
    USING (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.view')
        OR
        user_id = auth.uid()
    );

-- Allow insert/update if you have volunteers.manage
CREATE POLICY "Enable insert for event managers (event_staff_assignments)"
    ON public.event_staff_assignments FOR INSERT
    WITH CHECK (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
    );

CREATE POLICY "Enable update for event managers (event_staff_assignments)"
    ON public.event_staff_assignments FOR UPDATE
    USING (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
    );

CREATE POLICY "Enable delete for event managers (event_staff_assignments)"
    ON public.event_staff_assignments FOR DELETE
    USING (
        public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'volunteers.manage')
    );


-- 4. Update process_check_in RPC to enforce assignment
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
    v_staff_assignment RECORD;
    v_manual_assignment RECORD;
    v_rules JSONB;
    v_rule RECORD;
    v_rule_matched BOOLEAN := FALSE;
    v_existing_allowed INT;
    v_prereq_zone_id UUID;
    v_prereq_passed BOOLEAN;
BEGIN
    -- 1. Identify Scanner via auth.uid()
    v_scanner_uid := auth.uid();
    IF v_scanner_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'Scanner is not authenticated.');
    END IF;

    -- 2. Validate Zone
    SELECT * INTO v_zone FROM access_zones WHERE id = p_zone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_not_found', 'message', 'The requested access zone does not exist.');
    END IF;

    -- 3. Verify Scanner Permissions for this Event's Workspace
    SELECT workspace_id INTO v_event FROM events WHERE id = v_zone.event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'event_not_found', 'message', 'The event for this zone does not exist.');
    END IF;

    v_has_scan_permission := public.has_permission(v_event.workspace_id, 'checkin.scan');
    IF NOT v_has_scan_permission THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_scanner');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized', 'message', 'You do not have permission to scan for this event.');
    END IF;

    -- 3B. Verify Scanner Checkpoint Assignment (PHASE 3C logic)
    SELECT * INTO v_staff_assignment FROM event_staff_assignments 
    WHERE event_id = v_zone.event_id 
      AND user_id = v_scanner_uid 
      AND access_zone_id = p_zone_id 
      AND active = true;

    IF NOT FOUND THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'You are not assigned to this checkpoint.');
    END IF;

    -- Validate assignment time window
    IF v_staff_assignment.starts_at IS NOT NULL AND v_staff_assignment.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has not started yet.');
    END IF;

    IF v_staff_assignment.ends_at IS NOT NULL AND v_staff_assignment.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, NULL, p_zone_id, v_scanner_uid, 'denied', 'unauthorized_zone');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'unauthorized_zone', 'message', 'Your assignment for this checkpoint has ended.');
    END IF;


    -- 4. Validate QR Credential
    SELECT * INTO v_credential FROM qr_credentials WHERE credential_token_hash = p_qr_token_hash;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'invalid_qr', 'message', 'The QR credential is invalid or unknown.');
    END IF;

    IF v_credential.event_id != v_zone.event_id THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'wrong_event');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'wrong_event', 'message', 'This QR credential belongs to a different event.');
    END IF;

    IF v_credential.status != 'active' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_' || v_credential.status);
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_' || v_credential.status, 'message', 'This QR credential is ' || v_credential.status || '.');
    END IF;

    IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_credential.event_id, v_credential.registration_id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'qr_expired');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'qr_expired', 'message', 'This QR credential has expired.');
    END IF;

    -- 5. Lock Registration for Concurrency Safety
    SELECT * INTO v_registration FROM registrations WHERE id = v_credential.registration_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_found', 'message', 'Registration not found.');
    END IF;

    IF v_registration.status != 'confirmed' THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'registration_not_confirmed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'registration_not_confirmed', 'message', 'Registration is not confirmed.');
    END IF;

    -- 6. Evaluate Zone State
    IF NOT v_zone.is_active THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'zone_inactive');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'zone_inactive', 'message', 'This access zone is currently closed.');
    END IF;

    IF v_zone.starts_at IS NOT NULL AND v_zone.starts_at > v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has not opened yet.');
    END IF;

    IF v_zone.ends_at IS NOT NULL AND v_zone.ends_at < v_now THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'outside_access_window');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'outside_access_window', 'message', 'This zone has already closed.');
    END IF;

    -- 7. Evaluate Duplicate / Re-entry rule
    IF NOT v_zone.allow_reentry THEN
        SELECT COUNT(*) INTO v_existing_allowed FROM check_ins 
        WHERE registration_id = v_registration.id 
          AND access_zone_id = p_zone_id 
          AND result = 'allowed';

        IF v_existing_allowed > 0 THEN
            INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
            VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'already_checked_in');
            RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'already_checked_in', 'message', 'Participant has already checked into this zone.');
        END IF;
    END IF;

    -- 8. Evaluate Manual Assignment
    SELECT * INTO v_manual_assignment FROM access_assignments 
    WHERE zone_id = p_zone_id AND registration_id = v_registration.id LIMIT 1;

    IF v_manual_assignment.id IS NOT NULL THEN
        v_rule_matched := TRUE;
    ELSE
        -- 9. Evaluate Access Rules
        FOR v_rule IN SELECT * FROM access_rules WHERE zone_id = p_zone_id AND is_active = true LOOP
            IF v_rule.rule_type = 'all_confirmed_attendees' THEN
                v_rule_matched := TRUE;
            END IF;
            
            -- Evaluate prerequisite rule
            IF v_rule.rule_type = 'prerequisite_zone' THEN
                v_prereq_zone_id := (v_rule.rule_value->>'zone_id')::UUID;
                IF v_prereq_zone_id IS NOT NULL THEN
                    SELECT EXISTS(
                        SELECT 1 FROM check_ins 
                        WHERE registration_id = v_registration.id 
                          AND access_zone_id = v_prereq_zone_id 
                          AND result = 'allowed'
                    ) INTO v_prereq_passed;

                    IF v_prereq_passed THEN
                        v_rule_matched := TRUE;
                    ELSE
                        v_rule_matched := FALSE;
                    END IF;
                END IF;
            END IF;

            EXIT WHEN v_rule_matched;
        END LOOP;
    END IF;

    IF NOT v_rule_matched THEN
        INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
        VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'denied', 'access_not_allowed');
        RETURN jsonb_build_object('success', false, 'result', 'denied', 'reason', 'access_not_allowed', 'message', 'No access rules permit entry for this participant.');
    END IF;

    -- 10. Record Successful Check-in
    INSERT INTO check_ins (event_id, registration_id, qr_credential_id, access_zone_id, scanned_by, result, reason)
    VALUES (v_zone.event_id, v_registration.id, v_credential.id, p_zone_id, v_scanner_uid, 'allowed', NULL);

    UPDATE qr_credentials SET last_used_at = v_now WHERE id = v_credential.id;

    RETURN jsonb_build_object('success', true, 'result', 'allowed', 'reason', null, 'message', 'Check-in successful.');
END;
$$;
