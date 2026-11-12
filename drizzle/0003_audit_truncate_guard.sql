-- TRUNCATE skips row-level triggers, so block it explicitly to keep the audit log append-only.
CREATE TRIGGER audit_logs_no_truncate
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION zega_audit_immutable();
