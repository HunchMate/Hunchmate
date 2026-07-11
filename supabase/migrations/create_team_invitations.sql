-- Supabase SQL Migration: Create team_invitations table
-- Run this in your Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  inviter_id TEXT,
  inviter_name TEXT,
  team_name TEXT,
  invitee_email TEXT NOT NULL,
  invitee_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id TEXT
);

-- Row Level Security: allow public reads (for join page) and authenticated writes
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invitations"
  ON team_invitations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update invitations"
  ON team_invitations FOR UPDATE
  USING (true);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_team_invitations_event_id ON team_invitations (event_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_email ON team_invitations (invitee_email);
