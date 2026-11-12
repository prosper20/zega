-- ===========================================================================
-- Location tree: maintain ltree `path` from parent path + sanitised code.
-- ===========================================================================
CREATE OR REPLACE FUNCTION zega_location_label(code text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(code, '[^A-Za-z0-9]+', '_', 'g'))
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zega_locations_set_path() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_path ltree;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := text2ltree(zega_location_label(NEW.code));
  ELSE
    SELECT path INTO parent_path FROM locations WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'parent location % not found', NEW.parent_id;
    END IF;
    IF TG_OP = 'UPDATE' AND parent_path <@ OLD.path THEN
      RAISE EXCEPTION 'a location cannot be moved inside its own subtree';
    END IF;
    NEW.path := parent_path || text2ltree(zega_location_label(NEW.code));
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER locations_set_path
BEFORE INSERT OR UPDATE OF parent_id, code ON locations
FOR EACH ROW EXECUTE FUNCTION zega_locations_set_path();
--> statement-breakpoint
-- When a location moves or is renamed, re-derive the paths of its whole subtree.
CREATE OR REPLACE FUNCTION zega_locations_cascade_path() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.path IS DISTINCT FROM OLD.path THEN
    UPDATE locations SET path = NEW.path || subpath(path, nlevel(OLD.path))
    WHERE path <@ OLD.path AND id <> NEW.id;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER locations_cascade_path
AFTER UPDATE OF parent_id, code ON locations
FOR EACH ROW EXECUTE FUNCTION zega_locations_cascade_path();
--> statement-breakpoint

-- ===========================================================================
-- Tamper-evident audit trail.
-- The actor comes from `set_config('app.user_id', ..., true)` set per transaction.
-- ===========================================================================
CREATE OR REPLACE FUNCTION zega_audit_digest(
  p_id bigint, p_table text, p_row text, p_action audit_action, p_actor text, p_diff jsonb, p_created timestamptz
) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws('|', p_id::text, p_table, p_row, p_action::text, coalesce(p_actor, ''), p_diff::text,
                   to_char(p_created AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'))
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zega_audit_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  last_hash text;
BEGIN
  -- Serialise writers so each row links to exactly one predecessor.
  PERFORM pg_advisory_xact_lock(727345);
  SELECT hash INTO last_hash FROM audit_logs ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := last_hash;
  NEW.hash := encode(sha256(convert_to(
    coalesce(last_hash, 'GENESIS') || '|' ||
    zega_audit_digest(NEW.id, NEW.table_name, NEW.row_id, NEW.action, NEW.actor_id, NEW.diff, NEW.created_at),
    'UTF8')), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_chain
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION zega_audit_chain();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zega_audit_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION zega_audit_immutable();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zega_audit_row() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  pk text;
  actor text := nullif(current_setting('app.user_id', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_row := to_jsonb(NEW) - 'search';
    changes := jsonb_build_object('new', new_row);
  ELSIF TG_OP = 'DELETE' THEN
    old_row := to_jsonb(OLD) - 'search';
    changes := jsonb_build_object('old', old_row);
  ELSE
    old_row := to_jsonb(OLD) - 'search' - 'updated_at';
    new_row := to_jsonb(NEW) - 'search' - 'updated_at';
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_row -> key, 'new', value))
      INTO changes
      FROM jsonb_each(new_row)
     WHERE new_row -> key IS DISTINCT FROM old_row -> key;
    IF changes IS NULL THEN
      RETURN NULL; -- nothing meaningful changed
    END IF;
    changes := jsonb_build_object('changes', changes);
  END IF;

  pk := coalesce(new_row, old_row) ->> TG_ARGV[0];

  INSERT INTO audit_logs (table_name, row_id, action, actor_id, diff)
  VALUES (TG_TABLE_NAME, pk, TG_OP::audit_action, actor, changes);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_service_requests AFTER INSERT OR UPDATE OR DELETE ON service_requests
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON assignments
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_status_logs AFTER INSERT OR UPDATE OR DELETE ON status_logs
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_comments AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_attachments AFTER INSERT OR UPDATE OR DELETE ON attachments
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_ratings AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('request_id');
--> statement-breakpoint
CREATE TRIGGER audit_request_categories AFTER INSERT OR UPDATE OR DELETE ON request_categories
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_sla_policies AFTER INSERT OR UPDATE OR DELETE ON sla_policies
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_locations AFTER INSERT OR UPDATE OR DELETE ON locations
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('slug');
--> statement-breakpoint
-- Users: audit role and ban changes only (not session-driven profile churn).
CREATE TRIGGER audit_users AFTER INSERT OR DELETE OR UPDATE OF role, banned, ban_reason, email, name ON users
FOR EACH ROW EXECUTE FUNCTION zega_audit_row('id');
--> statement-breakpoint
-- Returns the id of the first row whose hash does not match, or NULL when the chain is intact.
CREATE OR REPLACE FUNCTION audit_verify_chain() RETURNS TABLE (checked bigint, first_broken_id bigint)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r record;
  expected_prev text := NULL;
  expected text;
  n bigint := 0;
BEGIN
  FOR r IN SELECT * FROM audit_logs ORDER BY id LOOP
    n := n + 1;
    expected := encode(sha256(convert_to(
      coalesce(expected_prev, 'GENESIS') || '|' ||
      zega_audit_digest(r.id, r.table_name, r.row_id, r.action, r.actor_id, r.diff, r.created_at),
      'UTF8')), 'hex');
    IF r.prev_hash IS DISTINCT FROM expected_prev OR r.hash <> expected THEN
      checked := n; first_broken_id := r.id;
      RETURN NEXT;
      RETURN;
    END IF;
    expected_prev := r.hash;
  END LOOP;
  checked := n; first_broken_id := NULL;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint

-- ===========================================================================
-- Real-time events: NOTIFY on the `zega_events` channel for the SSE endpoint.
-- Payloads stay small (ids only); clients refetch what they need.
-- ===========================================================================
CREATE OR REPLACE FUNCTION zega_notify_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  req record;
BEGIN
  SELECT requester_id, current_assignee_id, ref_code INTO req FROM service_requests WHERE id = NEW.request_id;
  PERFORM pg_notify('zega_events', json_build_object(
    'type', 'request.status',
    'requestId', NEW.request_id,
    'refCode', req.ref_code,
    'status', NEW.to_status,
    'requesterId', req.requester_id,
    'assigneeId', req.current_assignee_id,
    'at', NEW.created_at
  )::text);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER status_logs_notify AFTER INSERT ON status_logs
FOR EACH ROW EXECUTE FUNCTION zega_notify_status();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION zega_notify_notification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('zega_events', json_build_object(
    'type', 'notification',
    'id', NEW.id,
    'userId', NEW.user_id,
    'requestId', NEW.request_id
  )::text);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER notifications_notify AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION zega_notify_notification();
