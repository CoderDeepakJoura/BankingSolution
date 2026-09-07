-- =============================================================================
-- AUDIT DATABASE — AuditScripts.sql
--
-- This file creates and maintains the SEPARATE audit database schema.
-- Run this script against the dedicated audit PostgreSQL database, NOT against
-- the main banking database.
--
-- One audit database is shared per deployment; the `societycode` column
-- identifies which society each row belongs to (matches the society code /
-- database name of the banking database).
--
-- The auditlog table is append-only. The DB-level trigger below prevents
-- any UPDATE or DELETE so the audit trail is tamper-proof.
-- =============================================================================


-- =============================================================================
-- MAIN AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditlog (
    id            BIGSERIAL       PRIMARY KEY,
    societycode   VARCHAR(50)     NOT NULL DEFAULT '',   -- identifies the society (banking DB name)
    branchid      INT             NOT NULL DEFAULT 0,
    userid        VARCHAR(50)     NOT NULL DEFAULT '',
    username      VARCHAR(150)    NOT NULL DEFAULT '',

    -- Broad action vocabulary:
    -- LOGIN, LOGOUT, OPEN, VIEW, SEARCH, CREATE, UPDATE, DELETE, EXPORT, PRINT
    actiontype    VARCHAR(20)     NOT NULL,

    module        VARCHAR(100)    NOT NULL DEFAULT '',   -- high-level category (Member, Voucher, etc.)
    screen        VARCHAR(150)    NULL,                  -- UI screen name (e.g. "Saving Deposit")
    entityname    VARCHAR(100)    NULL,                  -- C# class / DB table name
    entityid      VARCHAR(200)    NULL,                  -- PK of the affected row
    description   TEXT            NULL,                  -- human-readable summary
    oldvalue      TEXT            NULL,                  -- JSON of row before change (UPDATE / DELETE)
    newvalue      TEXT            NULL,                  -- JSON of row after change  (CREATE / UPDATE)
    ipaddress     VARCHAR(50)     NULL,
    workingdate   VARCHAR(30)     NULL,
    sessionid     VARCHAR(100)    NULL,
    createdat     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES  (branchid + createdat is the most common filter)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_society    ON auditlog (societycode);
CREATE INDEX IF NOT EXISTS idx_audit_branch     ON auditlog (branchid);
CREATE INDEX IF NOT EXISTS idx_audit_createdat  ON auditlog (createdat DESC);
CREATE INDEX IF NOT EXISTS idx_audit_userid     ON auditlog (userid);
CREATE INDEX IF NOT EXISTS idx_audit_actiontype ON auditlog (actiontype);
CREATE INDEX IF NOT EXISTS idx_audit_module     ON auditlog (module);
CREATE INDEX IF NOT EXISTS idx_audit_entityname ON auditlog (entityname);
CREATE INDEX IF NOT EXISTS idx_audit_session    ON auditlog (sessionid);

-- Composite: the query "give me all logs for society X, branch Y, newest first"
CREATE INDEX IF NOT EXISTS idx_audit_society_branch_date
    ON auditlog (societycode, branchid, createdat DESC);

-- =============================================================================
-- IMMUTABILITY TRIGGER  (append-only — no UPDATE or DELETE allowed)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_prevent_auditlog_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auditlog_immutable
BEFORE UPDATE OR DELETE ON auditlog
FOR EACH ROW EXECUTE FUNCTION fn_prevent_auditlog_modification();


-- =============================================================================
-- OPTIONAL: automatic old-data archival
-- Run this as a scheduled job (pg_cron or external) to move records older
-- than N years to a cold-storage table. Example kept here for reference —
-- uncomment and adapt as needed.
-- =============================================================================

-- CREATE TABLE IF NOT EXISTS auditlog_archive (LIKE auditlog INCLUDING ALL);

-- Example pg_cron job (requires pg_cron extension):
-- SELECT cron.schedule('archive-audit', '0 2 1 * *',
--   $$INSERT INTO auditlog_archive SELECT * FROM auditlog WHERE createdat < NOW() - INTERVAL '3 years';
--     DELETE FROM auditlog WHERE createdat < NOW() - INTERVAL '3 years';$$);
