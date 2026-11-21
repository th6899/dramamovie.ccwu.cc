-- RLS does not apply to TRUNCATE. Client API roles must never have table-wide truncation privileges.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
