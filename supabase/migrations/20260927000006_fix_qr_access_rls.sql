-- ==========================================
-- ARAM BTS: Fix RLS Policies for QR & Access Control
-- ==========================================

-- Drop existing policies that use non-existent permissions 'events.view' and 'events.manage'
DROP POLICY IF EXISTS "Enable read for event organizers (QR)" ON qr_credentials;
DROP POLICY IF EXISTS "Enable insert for event managers (QR)" ON qr_credentials;
DROP POLICY IF EXISTS "Enable update for event managers (QR)" ON qr_credentials;

DROP POLICY IF EXISTS "Enable read for event organizers (Zones)" ON access_zones;
DROP POLICY IF EXISTS "Enable insert for event managers (Zones)" ON access_zones;
DROP POLICY IF EXISTS "Enable update for event managers (Zones)" ON access_zones;
DROP POLICY IF EXISTS "Enable delete for event managers (Zones)" ON access_zones;

DROP POLICY IF EXISTS "Enable read for event organizers (Rules)" ON access_rules;
DROP POLICY IF EXISTS "Enable insert for event managers (Rules)" ON access_rules;
DROP POLICY IF EXISTS "Enable update for event managers (Rules)" ON access_rules;
DROP POLICY IF EXISTS "Enable delete for event managers (Rules)" ON access_rules;

DROP POLICY IF EXISTS "Enable read for event organizers (Assignments)" ON access_assignments;
DROP POLICY IF EXISTS "Enable insert for event managers (Assignments)" ON access_assignments;
DROP POLICY IF EXISTS "Enable update for event managers (Assignments)" ON access_assignments;
DROP POLICY IF EXISTS "Enable delete for event managers (Assignments)" ON access_assignments;

-- Create new policies using valid permissions 'events.read' and 'events.update'

-- 1. QR Credentials RLS
CREATE POLICY "Enable read for event organizers (QR)"
    ON qr_credentials FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.read'));

CREATE POLICY "Enable insert for event managers (QR)"
    ON qr_credentials FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

CREATE POLICY "Enable update for event managers (QR)"
    ON qr_credentials FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

-- 2. Access Zones RLS
CREATE POLICY "Enable read for event organizers (Zones)"
    ON access_zones FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.read'));

CREATE POLICY "Enable insert for event managers (Zones)"
    ON access_zones FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

CREATE POLICY "Enable update for event managers (Zones)"
    ON access_zones FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

CREATE POLICY "Enable delete for event managers (Zones)"
    ON access_zones FOR DELETE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

-- 3. Access Rules RLS
CREATE POLICY "Enable read for event organizers (Rules)"
    ON access_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = access_rules.zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.read')
        )
    );

CREATE POLICY "Enable insert for event managers (Rules)"
    ON access_rules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );

CREATE POLICY "Enable update for event managers (Rules)"
    ON access_rules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );

CREATE POLICY "Enable delete for event managers (Rules)"
    ON access_rules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );

-- 4. Access Assignments RLS
CREATE POLICY "Enable read for event organizers (Assignments)"
    ON access_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = access_assignments.zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.read')
        )
    );

CREATE POLICY "Enable insert for event managers (Assignments)"
    ON access_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );

CREATE POLICY "Enable update for event managers (Assignments)"
    ON access_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );

CREATE POLICY "Enable delete for event managers (Assignments)"
    ON access_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM access_zones z
            WHERE z.id = zone_id
            AND public.has_permission((SELECT workspace_id FROM public.events WHERE id = z.event_id), 'events.update')
        )
    );
