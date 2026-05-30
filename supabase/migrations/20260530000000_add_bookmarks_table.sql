-- ==========================================
-- BOOKMARKS TABLE
-- ==========================================
-- Stores user bookmarks (saved events) in Supabase instead of localStorage
-- so bookmarks persist across devices and browsers.

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, event_id) -- One bookmark per user per event
);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only read their own bookmarks
CREATE POLICY "Allow users to read their own bookmarks" ON public.bookmarks
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- RLS: Users can only insert their own bookmarks
CREATE POLICY "Allow users to insert their own bookmarks" ON public.bookmarks
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- RLS: Users can only delete their own bookmarks
CREATE POLICY "Allow users to delete their own bookmarks" ON public.bookmarks
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Performance index for fetching all bookmarks for a user
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- Performance index for checking if a specific event is bookmarked
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_event ON public.bookmarks(user_id, event_id);
