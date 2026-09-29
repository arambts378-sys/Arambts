-- 20260926000005_integration_jobs_rpc.sql

CREATE OR REPLACE FUNCTION public.claim_integration_jobs(
  p_limit INTEGER,
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
    WHERE (status = 'pending' OR (status = 'failed' AND attempts < max_attempts AND next_attempt_at <= now()))
    ORDER BY created_at ASC
    LIMIT p_limit
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
