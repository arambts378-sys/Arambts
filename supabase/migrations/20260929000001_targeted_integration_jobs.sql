-- 20260929000001_targeted_integration_jobs.sql

CREATE OR REPLACE FUNCTION public.claim_integration_jobs_for_registration(
  p_registration_id UUID,
  p_processor_id TEXT
)
RETURNS SETOF public.integration_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.integration_jobs
    WHERE registration_id = p_registration_id
      AND (status = 'pending' OR (status = 'failed' AND attempts < max_attempts AND next_attempt_at <= now()))
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_jobs j
  SET 
    status = 'processing',
    locked_at = now(),
    locked_by = p_processor_id,
    updated_at = now()
  FROM claimed c
  WHERE j.id = c.id
  RETURNING j.*;
END;
$$;
