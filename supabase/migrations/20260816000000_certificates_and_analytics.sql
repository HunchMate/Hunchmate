-- ==========================================
-- Migration: Certificates, Analytics & Moderation
-- ==========================================

-- 1. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  event_title TEXT NOT NULL,
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  integrity_hash TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast lookup by user and event
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

-- 2. VERIFICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_cert_id ON public.verification_logs(certificate_id);

-- 3. ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('registration', 'submission', 'certificate_issued', 'verification_view', 'certificate_share')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id ON public.analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- 4. PROJECT SUBMISSIONS TABLE (FOR MODERATION QUEUE)
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT,
  repository_url TEXT,
  demo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_submissions_event_id ON public.project_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON public.project_submissions(status);

-- Triggers for updated_at
CREATE TRIGGER set_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_project_submissions_updated_at
  BEFORE UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Enablement
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Certificates: Anyone can read certificates (for public verification)
CREATE POLICY "Allow public read access to certificates" ON public.certificates
  FOR SELECT TO anon, authenticated
  USING (true);

-- Certificates: Only organizers & admins can create or update certificates
CREATE POLICY "Allow organizers and admins to insert certificates" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Allow organizers and admins to update certificates" ON public.certificates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

-- Verification logs: Public can insert verification logs; Admins can select
CREATE POLICY "Allow public insert verification logs" ON public.verification_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admins select verification logs" ON public.verification_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

-- Analytics events: Public/Authenticated can insert events; Admins/Organizers can select
CREATE POLICY "Allow public insert analytics events" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admins select analytics events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

-- Project submissions: Users can select/insert their own; Organizers & Admins can select/update all
CREATE POLICY "Allow users to select own submissions" ON public.project_submissions
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );

CREATE POLICY "Allow users to insert own submissions" ON public.project_submissions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Allow organizers and admins to update submissions" ON public.project_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('organizer', 'admin')
    )
  );
