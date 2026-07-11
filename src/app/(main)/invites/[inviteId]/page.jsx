'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@/utils/router';
import { CheckCircle2, Loader2, LogIn, Mail, Users, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { buildEventDetailPath } from '@/utils/helpers';
import Button from '@/components/ui/Button';
import '@/vite-pages/InviteJoin.css';

export default function InviteJoin() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEventById, eventsLoading } = useEvents();
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Fetch invitation from Supabase on mount
  useEffect(() => {
    if (!inviteId) {
      setInviteLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations?id=${encodeURIComponent(inviteId)}`);
        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          setInviteError(payload.error || 'Failed to load invitation.');
          setInviteLoading(false);
          return;
        }

        if (!payload.invitation) {
          setInviteError('Invitation not found.');
          setInviteLoading(false);
          return;
        }

        // Map snake_case DB fields to camelCase for the UI
        const inv = payload.invitation;
        setInvite({
          id: inv.id,
          eventId: inv.event_id,
          inviterId: inv.inviter_id,
          inviterName: inv.inviter_name,
          teamName: inv.team_name,
          inviteeEmail: inv.invitee_email,
          inviteeUserId: inv.invitee_user_id,
          status: inv.status,
          createdAt: inv.created_at,
          acceptedAt: inv.accepted_at,
          acceptedByUserId: inv.accepted_by_user_id,
        });
      } catch {
        if (!cancelled) {
          setInviteError('Unable to reach the server. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    }

    fetchInvitation();
    return () => { cancelled = true; };
  }, [inviteId]);

  const event = useMemo(() => (invite ? getEventById(invite.eventId) : null), [invite, getEventById]);

  const handleGoToLogin = () => {
    localStorage.setItem('hm_pending_invite', inviteId);
    navigate('/login');
  };

  const handleAccept = async () => {
    if (!user) {
      handleGoToLogin();
      return;
    }

    setState({ loading: true, message: '', error: '' });

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, userId: user.id }),
      });

      const result = await response.json();

      if (!result.success) {
        setState({ loading: false, message: '', error: result.error || 'Unable to accept invitation.' });
        return;
      }

      localStorage.removeItem('hm_pending_invite');
      const successText = result.alreadyRegistered
        ? 'Invitation accepted. This event is already in your dashboard.'
        : 'Invitation accepted. The hackathon is now added to your dashboard.';
      setState({ loading: false, message: successText, error: '' });

      // Update the local invite state to show accepted
      setInvite((prev) => prev ? { ...prev, status: 'accepted' } : prev);

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch {
      setState({ loading: false, message: '', error: 'Network error. Please try again.' });
    }
  };

  // Loading state
  if (inviteLoading || (invite && eventsLoading && !event)) {
    return (
      <section className="invite-join invite-join--centered">
        <article className="invite-join__card" style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="invite-join__spinner" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: '#64748b' }}>{inviteLoading ? 'Loading invitation...' : 'Loading event details...'}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </article>
      </section>
    );
  }

  // Not found
  if (inviteError || !invite || !event) {
    return (
      <section className="invite-join invite-join--centered">
        <article className="invite-join__card">
          <XCircle size={28} />
          <h1>Invitation not found</h1>
          <p>{inviteError || 'This invite is invalid or has expired.'}</p>
          <Link to="/events">
            <Button variant="primary">Explore Events</Button>
          </Link>
        </article>
      </section>
    );
  }

  const emailMismatch = user && String(user.email || '').toLowerCase() !== String(invite.inviteeEmail || '').toLowerCase();

  return (
    <section className="invite-join">
      <div className="container invite-join__shell">
        <article className="invite-join__card">
          <p className="invite-join__eyebrow">Team Invitation</p>
          <h1>{event.title}</h1>
          <p className="invite-join__subtitle">
            {invite.inviterName || 'A teammate'} invited you to join team
            <strong> {invite.teamName || 'Hunchmate Team'}</strong>.
          </p>

          <div className="invite-join__meta">
            <span><Users size={16} /> Team: {invite.teamName || 'Hunchmate Team'}</span>
            <span><Mail size={16} /> Invited email: {invite.inviteeEmail}</span>
          </div>

          {invite.status === 'accepted' ? (
            <div className="invite-join__status invite-join__status--success">
              <CheckCircle2 size={18} /> This invitation has already been accepted.
            </div>
          ) : null}

          {state.error ? <div className="invite-join__status invite-join__status--error">{state.error}</div> : null}
          {state.message ? <div className="invite-join__status invite-join__status--success">{state.message}</div> : null}

          {!user ? (
            <div className="invite-join__actions">
              <Button variant="primary" icon={LogIn} onClick={handleGoToLogin}>Sign in to Join Team</Button>
              <p>You will be redirected to login. After login, you can accept this invitation.</p>
            </div>
          ) : emailMismatch ? (
            <div className="invite-join__actions">
              <div className="invite-join__status invite-join__status--error">
                This invite was sent to {invite.inviteeEmail}. You are signed in as {user.email}.
              </div>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : (
            <div className="invite-join__actions">
              <Button variant="primary" onClick={handleAccept} disabled={state.loading || invite.status === 'accepted'}>
                {state.loading ? 'Accepting...' : 'Accept Invitation'}
              </Button>
              <Button variant="ghost" onClick={() => navigate(buildEventDetailPath(event))}>View Event</Button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
