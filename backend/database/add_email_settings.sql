-- Add email settings columns to schools table
-- Run this migration if schools table already exists

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS smtp_email VARCHAR(150) AFTER principal,
ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255) AFTER smtp_email;

-- For MySQL versions that don't support IF NOT EXISTS in ALTER TABLE:
-- Use this instead (will fail if columns exist, which is okay):
-- ALTER TABLE schools ADD COLUMN smtp_email VARCHAR(150) AFTER principal;
-- ALTER TABLE schools ADD COLUMN smtp_password VARCHAR(255) AFTER smtp_email;
