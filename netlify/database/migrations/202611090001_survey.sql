CREATE TABLE respondents (
 id UUID PRIMARY KEY,
 begin_hash TEXT NOT NULL,
 identity TEXT NOT NULL CHECK(identity IN ('student','public')),
 consent TEXT NOT NULL CHECK(consent IN ('adult','minor-consent')),
 consent_version TEXT NOT NULL,
 version TEXT NOT NULL,
 hue INTEGER CHECK(hue BETWEEN 1 AND 4),
 step INTEGER NOT NULL DEFAULT 1 CHECK(step BETWEEN 1 AND 11),
 demographics JSONB NOT NULL DEFAULT '{}',
 pages JSONB NOT NULL DEFAULT '{}',
 student_hash TEXT UNIQUE,
 assigned_at TIMESTAMPTZ,
 completed_at TIMESTAMPTZ,
 CHECK ((hue IS NULL AND step=1 AND assigned_at IS NULL) OR (hue IS NOT NULL AND step>=2 AND assigned_at IS NOT NULL)),
 CHECK ((step=11) = (completed_at IS NOT NULL))
);
CREATE INDEX respondents_identity_hue ON respondents(identity,hue);
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE login_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
CREATE TABLE admin_events (id BIGSERIAL PRIMARY KEY, action TEXT NOT NULL, detail TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
