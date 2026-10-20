-- Adds the playlist scope to existing D1 databases.
-- Fresh installs already get this column from schema.sql.
ALTER TABLE tracks ADD COLUMN scope TEXT NOT NULL DEFAULT 'both';
