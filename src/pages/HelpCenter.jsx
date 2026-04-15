import { useCallback, useEffect, useMemo, useState } from 'react';
import { LifeBuoy, MessageSquareWarning, Send, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createComplaintForUser, listComplaintsForUser } from '../lib/firebase-data';
import './HelpCenter.css';

const STATUS_STEPS = ['raised', 'in-progress', 'resolved'];

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function toStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'resolved') return 'Resolved';
  return 'Raised';
}

function getStatusClass(status) {
  if (status === 'resolved') return 'help-center__pill help-center__pill--success';
  if (status === 'in-progress') return 'help-center__pill help-center__pill--warn';
  return 'help-center__pill help-center__pill--danger';
}

export default function HelpCenter() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    message: '',
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const nextTickets = await listComplaintsForUser(user);
      setTickets(nextTickets);

      if (nextTickets.length > 0) {
        setSelectedId((current) => current || nextTickets[0].complaintId);
      }
    } catch (loadError) {
      setError(loadError.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.complaintId === selectedId) || null,
    [selectedId, tickets]
  );

  const submitTicket = async (event) => {
    event.preventDefault();

    const message = String(form.message || '').trim();
    if (!message) {
      setError('Please describe your complaint before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const created = await createComplaintForUser({
        user,
        name: String(form.name || '').trim(),
        message,
      });

      if (created) {
        setTickets((current) => [created, ...current]);
        setSelectedId(created.complaintId);
      }

      setForm((current) => ({ ...current, message: '' }));
      setNotice('Ticket raised successfully. Admin has been notified.');
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="help-center">
      <div className="help-center__header container">
        <div>
          <p className="help-center__eyebrow">Support & Resolution</p>
          <h1>Help Center</h1>
          <p>Raise a complaint, monitor progress, and review your full ticket history.</p>
        </div>
        <button type="button" onClick={loadTickets} disabled={loading} className="help-center__refresh">
          <LifeBuoy size={16} /> Refresh
        </button>
      </div>

      <div className="container help-center__content">
        {error ? <div className="help-center__alert help-center__alert--error">{error}</div> : null}
        {notice ? <div className="help-center__alert help-center__alert--ok">{notice}</div> : null}

        <article className="help-center__submit-card">
          <div className="help-center__submit-head">
            <MessageSquareWarning size={18} />
            <h2>Raise A Complaint</h2>
          </div>

          <form onSubmit={submitTicket} className="help-center__form">
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Your full name"
              />
            </label>
            <label>
              Complaint
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Describe what happened and what help you need"
                rows={4}
              />
            </label>
            <button type="submit" disabled={submitting}>
              <Send size={15} /> {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </article>

        <div className="help-center__grid">
          <article className="help-center__tickets">
            <div className="help-center__list-head">
              <Ticket size={16} />
              <h3>My Tickets</h3>
            </div>
            {loading ? <p className="help-center__empty">Loading tickets...</p> : null}
            {!loading && tickets.length === 0 ? <p className="help-center__empty">No tickets yet.</p> : null}
            <div className="help-center__list">
              {tickets.map((ticket) => (
                <button
                  key={ticket.complaintId}
                  type="button"
                  className={`help-center__list-item ${selectedId === ticket.complaintId ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(ticket.complaintId)}
                >
                  <div>
                    <strong>{ticket.complaintId}</strong>
                    <p>{String(ticket.message || '').slice(0, 80)}</p>
                  </div>
                  <span className={getStatusClass(ticket.status)}>{toStatusLabel(ticket.status)}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="help-center__detail">
            {!selectedTicket ? <p className="help-center__empty">Select a ticket to view details.</p> : null}
            {selectedTicket ? (
              <>
                <header className="help-center__detail-head">
                  <div>
                    <p>Ticket ID</p>
                    <h3>{selectedTicket.complaintId}</h3>
                  </div>
                  <span className={getStatusClass(selectedTicket.status)}>{toStatusLabel(selectedTicket.status)}</span>
                </header>

                <p className="help-center__message">{selectedTicket.message}</p>

                <div className="help-center__progress">
                  {STATUS_STEPS.map((step) => {
                    const stepIndex = STATUS_STEPS.indexOf(step);
                    const currentIndex = STATUS_STEPS.indexOf(selectedTicket.status || 'raised');
                    const completed = stepIndex <= Math.max(0, currentIndex);
                    return (
                      <div key={step} className={`help-center__progress-step ${completed ? 'is-complete' : ''}`}>
                        <span />
                        <p>{toStatusLabel(step)}</p>
                      </div>
                    );
                  })}
                </div>

                <section className="help-center__history">
                  <h4>Ticket Updates</h4>
                  {(selectedTicket.history || []).map((entry, index) => (
                    <article key={`${selectedTicket.complaintId}-${index}`} className="help-center__history-item">
                      <p>
                        <strong>{toStatusLabel(entry.status)}</strong> - {entry.note || 'Status updated'}
                      </p>
                      <small>{formatDate(entry.createdAt)}</small>
                    </article>
                  ))}
                  {selectedTicket.history?.length ? null : <p className="help-center__empty">No updates yet.</p>}
                </section>
              </>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
