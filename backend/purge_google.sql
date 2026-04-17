-- Safety First: Drop the backup table if it somehow already exists
DROP TABLE IF EXISTS users_old;

-- 1. Rename existing users table
ALTER TABLE users RENAME TO users_old;

-- 2. Re-create users table WITHOUT google_id
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Copy data from old table to new table
INSERT INTO users (id, username, email, password_hash, avatar_url, created_at, updated_at)
SELECT id, username, email, password_hash, avatar_url, created_at, updated_at FROM users_old;

-- 4. Verify data and then drop the old table
DROP TABLE users_old;
