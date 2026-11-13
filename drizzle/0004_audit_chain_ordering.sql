-- Fix: concurrent writers could break the audit hash chain.
-- The id was taken from the sequence (column default) BEFORE the trigger acquired its lock, so two
-- transactions could get ids 1461/1462 but take the lock in the opposite order; 1461 then linked to
-- 1462 and the id-ordered verification reported a broken chain. Re-assigning the id while holding
-- the lock makes id order identical to chain order. (Skipped sequence values just leave gaps.)
CREATE OR REPLACE FUNCTION zega_audit_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  last_hash text;
BEGIN
  -- Serialise writers so each row links to exactly one predecessor.
  PERFORM pg_advisory_xact_lock(727345);
  NEW.id := nextval(pg_get_serial_sequence('audit_logs', 'id'));
  SELECT hash INTO last_hash FROM audit_logs ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := last_hash;
  NEW.hash := encode(sha256(convert_to(
    coalesce(last_hash, 'GENESIS') || '|' ||
    zega_audit_digest(NEW.id, NEW.table_name, NEW.row_id, NEW.action, NEW.actor_id, NEW.diff, NEW.created_at),
    'UTF8')), 'hex');
  RETURN NEW;
END;
$$;
