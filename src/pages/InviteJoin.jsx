import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, LogIn, Mail, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { buildEventDetailPath } from '../utils/helpers';
import Button from '../components/ui/Button';
import './InviteJoin.css';

export default function InviteJoin() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getInvitationById, getEventById, acceptTeamInvitation } = useEvents();
  const [state, setState] = useState({ loading: false, message: '', error: '' });

  const invite = getInvitationById(inviteId);
  const event = useMemo(() => (invite ? getEventById(invite.eventId) : null), [invite, getEventById]);

  const handleGoToLogin = () => {
    localStorage.setItem('hm_pending_invite', inviteId);
    navigate('/login');
  };

  const handleAccept = () => {
    if (!user) {
      handleGoToLogin();
      return;
    }

    setState({ loading: true, message: '', error: '' });
    const result = acceptTeamInvitation(inviteId, user.id);

    if (!result.success) {
      setState({ loading: false, message: '', error: result.error || 'Unable to accept invitation.' });
      return;
    }

    localStorage.removeItem('hm_pending_invite');
    const successText = result.alreadyRegistered
      ? 'Invitation accepted. This event is already in your dashboard.'
      : 'Invitation accepted. The hackathon is now added to your dashboard.';
    setState({ loading: false, message: successText, error: '' });

    window.setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  if (!invite || !event) {
    return (
      <section className="invite-join invite-join--centered">
        <article className="invite-join__card">
          <XCircle size={28} />
          <h1>Invitation not found</h1>
          <p>This invite is invalid or has expired.</p>
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
