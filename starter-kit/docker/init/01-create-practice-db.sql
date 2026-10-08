-- Runs once, the first time the Postgres container starts with an empty volume.
-- Creates a separate database for the SQL exercises, so practice data never mixes with n8n's own tables.
CREATE DATABASE practice;
