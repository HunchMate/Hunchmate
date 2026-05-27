-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (USERS) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'organizer', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  provider TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  host_onboarding_completed BOOLEAN DEFAULT FALSE,
  avatar TEXT,
  avatar_backdrop TEXT,
  bio TEXT,
  institution TEXT,
  organization_name TEXT,
  location TEXT,
  headline TEXT,
  website TEXT,
  skills TEXT[] DEFAULT '{}'::TEXT[],
  profile_type TEXT,
  stream TEXT,
  graduation_year TEXT,
  institution_name TEXT,
  host_type TEXT,
  phone_number TEXT,
  state TEXT,
  city TEXT,
  experience TEXT,
  tech_proficiency TEXT,
  work_summary TEXT,
  current_designation TEXT,
  socials JSONB DEFAULT '{"linkedin": "", "github": "", "instagram": ""}'::JSONB,
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 2. EVENTS (HACKATHONS) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  category TEXT,
  mode TEXT,
  status TEXT DEFAULT 'upcoming',
  timeline JSONB, -- Fields: registrationStart, registrationEnd, eventStart, eventEnd
  tags TEXT[] DEFAULT '{}'::TEXT[],
  team_size JSONB, -- Fields: min, max or integer
  poster_image TEXT,
  showcase_image TEXT,
  banner_images TEXT[] DEFAULT '{}'::TEXT[],
  gallery_images TEXT[] DEFAULT '{}'::TEXT[],
  media JSONB DEFAULT '{"banners": [], "gallery": []}'::JSONB,
  credential_config JSONB DEFAULT '{"logoUrl": "", "sponsorLogoUrl": ""}'::JSONB,
  organizer JSONB DEFAULT '{"id": "", "name": "", "logo": "", "email": "", "phone": ""}'::JSONB,
  timeline_items JSONB DEFAULT '[]'::JSONB, -- List of: {title, date, description}
  problem_statements JSONB DEFAULT '[]'::JSONB, -- List of: {psId, psDescription, psStatement}
  sub_events JSONB DEFAULT '[]'::JSONB, -- List of: {title, startDate, endDate, description, milestones}
  registered_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 3. REGISTRATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT,
  members JSONB DEFAULT '[]'::JSONB, -- List of teammate emails/details
  qr_token TEXT UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  participant JSONB, -- Backup of details: {id, name, email, role}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, user_id) -- Prevents duplicate registrations
);

-- ==========================================
-- 4. COMPLAINTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'raised' CHECK (status IN ('raised', 'in-progress', 'resolved')),
  history JSONB DEFAULT '[]'::JSONB, -- List of: {status, note, createdAt, actorId}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 5. ADMIN AUDIT LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id TEXT DEFAULT 'system',
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- AUTOMATION: UPDATE UPDATED_AT TIMESTAMP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- AUTOMATION: PROFILE UPSERT ON USER SIGNUP
-- ==========================================
-- Create a trigger that automatically adds a profile record when a user signs up via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails TEXT;
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Read admin emails from a project parameter or check explicitly
  -- You can update VITE_ADMIN_EMAILS lists or default policies
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'participant', -- Default, role gets updated if in VITE_ADMIN_EMAILS list
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES FOR public.profiles
-- ==========================================
CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ==========================================
-- RLS POLICIES FOR public.events
-- ==========================================
CREATE POLICY "Allow public read access to events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow organizers and admins to insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Allow organizers and admins to update events" ON public.events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Allow admins to delete events" ON public.events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- ==========================================
-- RLS POLICIES FOR public.registrations
-- ==========================================
CREATE POLICY "Allow users to read their own registrations" ON public.registrations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Allow organizers to read registrations for their events" ON public.registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = registrations.event_id
        AND (events.organizer->>'id' = (select auth.uid())::text
             OR EXISTS (
               SELECT 1 FROM public.profiles
               WHERE profiles.id = (select auth.uid())
                 AND profiles.role = 'admin'
             ))
    )
  );

CREATE POLICY "Allow users to insert their own registrations" ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Allow users to update their own registrations" ON public.registrations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Allow organizers to update registrations" ON public.registrations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = registrations.event_id
        AND (events.organizer->>'id' = (select auth.uid())::text
             OR EXISTS (
               SELECT 1 FROM public.profiles
               WHERE profiles.id = (select auth.uid())
                 AND profiles.role = 'admin'
             ))
    )
  )
  WITH CHECK (true);

-- ==========================================
-- RLS POLICIES FOR public.complaints
-- ==========================================
CREATE POLICY "Allow users to read their own complaints" ON public.complaints
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Allow users to insert their own complaints" ON public.complaints
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Allow admins to read all complaints" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update complaints" ON public.complaints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (true);

-- ==========================================
-- RLS POLICIES FOR public.admin_audit_logs
-- ==========================================
CREATE POLICY "Allow admins to read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow system/admins to insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
