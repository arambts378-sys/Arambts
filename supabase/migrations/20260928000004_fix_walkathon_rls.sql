-- 20260928000004_fix_walkathon_rls.sql

-- Drop the old incorrect policies from 20260928000002_walkathon_schema.sql
DROP POLICY IF EXISTS "Enable read for event organizers (Walkathon Distances)" ON public.walkathon_distance_categories;
DROP POLICY IF EXISTS "Enable insert for event managers (Walkathon Distances)" ON public.walkathon_distance_categories;
DROP POLICY IF EXISTS "Enable update for event managers (Walkathon Distances)" ON public.walkathon_distance_categories;
DROP POLICY IF EXISTS "Enable delete for event managers (Walkathon Distances)" ON public.walkathon_distance_categories;

-- Create the correct policies using valid permissions ('events.read', 'events.create', 'events.update')
CREATE POLICY "Enable read for event organizers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR SELECT
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.read'));

CREATE POLICY "Enable insert for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR INSERT
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.create'));

CREATE POLICY "Enable update for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR UPDATE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'))
    WITH CHECK (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.update'));

CREATE POLICY "Enable delete for event managers (Walkathon Distances)"
    ON public.walkathon_distance_categories FOR DELETE
    USING (public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'events.delete'));
