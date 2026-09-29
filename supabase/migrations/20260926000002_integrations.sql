-- 20260926000002_integrations.sql

CREATE TABLE public.event_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_sheets', 'email', 'whatsapp', 'crm', 'analytics')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, provider)
);

-- Enable RLS
ALTER TABLE public.event_integrations ENABLE ROW LEVEL SECURITY;

-- Allow organizers to manage their integrations
CREATE POLICY "Enable read for event organizers" ON public.event_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.view')
    )
  );

CREATE POLICY "Enable insert for event organizers" ON public.event_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.manage')
    )
  );

CREATE POLICY "Enable update for event organizers" ON public.event_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.manage')
    )
  );

-- Function to handle automated updating of updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_integrations
  BEFORE UPDATE ON public.event_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
