-- 1. Create Profiles Table (if missing)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text,
  email text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Create Tasks Table (if missing)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean DEFAULT false,
  priority text DEFAULT 'medium',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  user_id uuid REFERENCES auth.users NOT NULL
);

-- 3. Create Investments Table (if missing)
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  type text NOT NULL, -- 'buy' or 'sell'
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  commission numeric DEFAULT 0,
  date timestamp with time zone NOT NULL,
  notes text,
  user_id uuid REFERENCES auth.users NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 4b. Create Calendar Table (if missing)
CREATE TABLE IF NOT EXISTS public.calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text,
  color text DEFAULT '#6366f1',
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own calendar events." ON public.calendar;
CREATE POLICY "Users can manage their own calendar events."
  ON public.calendar FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Create RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can manage their own profile." ON public.profiles;
CREATE POLICY "Users can manage their own profile."
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Create RLS Policies for Tasks
DROP POLICY IF EXISTS "Users can manage their own tasks." ON public.tasks;
CREATE POLICY "Users can manage their own tasks."
  ON public.tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create RLS Policies for Investments
DROP POLICY IF EXISTS "Users can manage their own investments." ON public.investments;
CREATE POLICY "Users can manage their own investments."
  ON public.investments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Create Rituals Table (if missing)
CREATE TABLE IF NOT EXISTS public.rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  frequency text DEFAULT 'daily',
  completed_days jsonb DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own rituals." ON public.rituals;
CREATE POLICY "Users can manage their own rituals."
  ON public.rituals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Create Sessions Table (Focus/Pomodoro history)
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  duration numeric NOT NULL,
  task_id uuid,
  start_time timestamp with time zone NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sessions." ON public.sessions;
CREATE POLICY "Users can manage their own sessions."
  ON public.sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. AUTOMATIC PROFILE CREATION (THE FIX)
-- Create a function to handle new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, split_part(new.email, '@', 1), new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. BACKFILL PROFILES (Fixes 406 for existing users)
INSERT INTO public.profiles (id, username)
SELECT id, split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- FINAL NOTE: If you still see 406 errors, ensure the table names exactly match those in storage.ts:
-- ['tasks', 'investments', 'profiles', 'rituals', 'sessions']
