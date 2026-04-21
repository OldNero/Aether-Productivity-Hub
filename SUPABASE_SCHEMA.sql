-- Aether Productivity Hub: Supabase Setup Script
-- Run this in your Supabase SQL Editor

-- 1. PROFILES TABLE
-- Stores user-specific settings and API keys
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  finnhub_key TEXT, -- NEW: Added for real-time market data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- (Note: Use DO $$ BEGIN ... END $$ if you want to avoid errors if policies exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- If table already exists, ensure the new column is added and old fallback removed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS finnhub_key TEXT;
ALTER TABLE profiles DROP COLUMN IF EXISTS alpha_vantage_key;


-- 2. INVESTMENTS & IMPORTS
-- Stores portfolio transactions
CREATE TABLE IF NOT EXISTS investment_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  content_hash TEXT, -- To prevent duplicate imports
  transaction_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  type TEXT CHECK (type IN ('buy', 'sell')) NOT NULL,
  price DECIMAL NOT NULL,
  quantity DECIMAL NOT NULL,
  commission DECIMAL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  import_id UUID REFERENCES investment_imports(id) ON DELETE CASCADE, -- Link to the import batch
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure import_id exists in investments (fix for PGRST204 error)
ALTER TABLE investments ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES investment_imports(id) ON DELETE CASCADE;

-- RLS for Investments
ALTER TABLE investment_imports ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own imports') THEN
        CREATE POLICY "Users can manage own imports" ON investment_imports FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own investments') THEN
        CREATE POLICY "Users can manage own investments" ON investments FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- 3. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own tasks') THEN
        CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- 4. SESSIONS (Focus Timer)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own sessions') THEN
        CREATE POLICY "Users can manage own sessions" ON sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- 5. CALENDAR (Events)
CREATE TABLE IF NOT EXISTS calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  color TEXT,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  import_id UUID REFERENCES calendar_imports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own events') THEN
        CREATE POLICY "Users can manage own events" ON calendar FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
