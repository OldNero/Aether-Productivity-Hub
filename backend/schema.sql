-- Lucia Auth Tables
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
);

-- App Data Tables
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    commission REAL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT,
    user_id TEXT NOT NULL REFERENCES users(id),
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    completed_days TEXT DEFAULT '[]', -- Stored as JSON string
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    duration REAL NOT NULL,
    task_id TEXT,
    start_time TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    color TEXT DEFAULT '#3b82f6',
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
