-- Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill existing users so migration doesn't break
UPDATE users SET
  email = username,
  first_name = username,
  last_name = ''
WHERE email IS NULL;

-- Make required fields NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- Drop username column — no longer needed
ALTER TABLE users DROP COLUMN IF EXISTS username;
