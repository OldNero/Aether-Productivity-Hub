-- 0. Sessions Table Fix
DROP TABLE IF EXISTS sessions_old;
ALTER TABLE sessions RENAME TO sessions_old;
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
);
INSERT INTO sessions (id, user_id, expires_at) SELECT id, user_id, expires_at FROM sessions_old;
DROP TABLE sessions_old;

-- 1. Tasks Table Fix
DROP TABLE IF EXISTS tasks_old;
ALTER TABLE tasks RENAME TO tasks_old;
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES users(id)
);
INSERT INTO tasks (id, title, completed, priority, created_at, user_id) 
SELECT id, title, completed, priority, created_at, user_id FROM tasks_old;
DROP TABLE tasks_old;

-- 2. Investments Table Fix
DROP TABLE IF EXISTS investments_old;
ALTER TABLE investments RENAME TO investments_old;
CREATE TABLE investments (
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
INSERT INTO investments (id, symbol, type, price, quantity, commission, date, notes, user_id, updated_at)
SELECT id, symbol, type, price, quantity, commission, date, notes, user_id, updated_at FROM investments_old;
DROP TABLE investments_old;

-- 3. Rituals Table Fix
DROP TABLE IF EXISTS rituals_old;
ALTER TABLE rituals RENAME TO rituals_old;
CREATE TABLE rituals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    completed_days TEXT DEFAULT '[]',
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO rituals (id, title, frequency, completed_days, user_id, created_at)
SELECT id, title, frequency, completed_days, user_id, created_at FROM rituals_old;
DROP TABLE rituals_old;

-- 4. Focus Sessions Table Fix
DROP TABLE IF EXISTS focus_sessions_old;
ALTER TABLE focus_sessions RENAME TO focus_sessions_old;
CREATE TABLE focus_sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    duration REAL NOT NULL,
    task_id TEXT,
    start_time TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id)
);
INSERT INTO focus_sessions (id, mode, duration, task_id, start_time, user_id)
SELECT id, mode, duration, task_id, start_time, user_id FROM focus_sessions_old;
DROP TABLE focus_sessions_old;
