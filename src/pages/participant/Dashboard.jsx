import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode as QrCodeIcon, Award, Calendar, ArrowRight, Download, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import './Dashboard.css';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const { getUserRegistrations, getUserCredentials, getEventById, claimCredential } = useEvents();
  const [selectedQR, setSelectedQR] = useState(null);
  const [claimState, setClaimState] = useState({});

  const registrations = getUserRegistrations(user?.id);
  const credentials = getUserCredentials(user?.id);
  const [activeTab, setActiveTab] = useState('registrations');

  const upcomingSchedule = registrations
    .map((reg) => {
      const event = getEventById(reg.eventId);
      if (!event) return [];

      const timelineItems = Array.isArray(event.timelineItems) ? event.timelineItems : [];
      const subEvents = Array.isArray(event.subEvents) ? event.subEvents : [];

      const entries = [
        {
          eventId: event.id,
          eventTitle: event.title,
          label: 'Registration Start',
          date: event.timeline?.registrationStart || '',
        },
        {
          eventId: event.id,
          eventTitle: event.title,
          label: 'Registration End',
          date: event.timeline?.registrationEnd || '',
        },
        {
          eventId: event.id,
          eventTitle: event.title,
          label: 'Event Start',
          date: event.timeline?.eventStart || '',
        },
        {
          eventId: event.id,
          eventTitle: event.title,
          label: 'Event End',
          date: event.timeline?.eventEnd || '',
        },
        ...timelineItems.map((item, index) => ({
          eventId: event.id,
          eventTitle: event.title,
          label: item.title || `Timeline ${index + 1}`,
          date: item.date || item.time || '',
        })),
        ...subEvents.flatMap((subEvent, index) => {
          const subEventTitle = String(subEvent?.title || '').trim() || `Sub-event ${index + 1}`;
          const milestoneRows = Array.isArray(subEvent?.milestones)
            ? subEvent.milestones.map((milestone, milestoneIndex) => ({
                eventId: event.id,
                eventTitle: event.title,
                label: `${subEventTitle}: ${milestone?.title || `Milestone ${milestoneIndex + 1}`}`,
                date: milestone?.date || '',
              }))
            : [];

          return [
            {
              eventId: event.id,
              eventTitle: event.title,
              label: `${subEventTitle} Start`,
              date: subEvent?.startDate || '',
            },
            {
              eventId: event.id,
              eventTitle: event.title,
              label: `${subEventTitle} End`,
              date: subEvent?.endDate || '',
            },
            ...milestoneRows,
          ];
        }),
      ];

      return entries;
    })
    .flat()
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const handleClaimCredential = (eventId) => {
    setClaimState((prev) => ({ ...prev, [eventId]: { loading: true, error: '' } }));
    const result = claimCredential(eventId, user.id, 'participation');
    if (!result.success) {
      setClaimState((prev) => ({ ...prev, [eventId]: { loading: false, error: result.error || 'Unable to claim now.' } }));
      return;
    }

    setClaimState((prev) => ({ ...prev, [eventId]: { loading: false, error: '' } }));
  };

  const handleDownloadCredential = (credential) => {
    if (!credential?.certificateImageUrl) return;
    const anchor = document.createElement('a');
    anchor.href = credential.certificateImageUrl;
    anchor.download = `${credential.id}.png`;
    anchor.click();
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="dashboard__hero">
        <div className="dashboard__hero-mesh" />
        <div className="container">
          <div className="dashboard__welcome">
            <div className="dashboard__avatar">{user.name?.charAt(0)}</div>
            <div>
              <h1 className="dashboard__greeting">Mission Control</h1>
              <p className="dashboard__user-info">Welcome back, <strong>{user.name}</strong></p>
            </div>
          </div>

          <div className="dashboard__stats-row">
            <div className="dashboard__stat glass">
              <Calendar size={20} />
              <div>
                <p className="dashboard__stat-value">{registrations.length}</p>
                <p className="dashboard__stat-label">Registered Events</p>
              </div>
            </div>
            <div className="dashboard__stat glass">
              <Award size={20} />
              <div>
                <p className="dashboard__stat-value">{credentials.length}</p>
                <p className="dashboard__stat-label">Credentials Earned</p>
              </div>
            </div>
            <div className="dashboard__stat glass">
              <QrCodeIcon size={20} />
              <div>
                <p className="dashboard__stat-value">
                  {registrations.filter(r => r.checkedIn).length}
                </p>
                <p className="dashboard__stat-label">Events Attended</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container dashboard__content">
        <div className="dashboard__tabs">
          <button
            className={`dashboard__tab ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            <Calendar size={16} /> My Events
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            <Award size={16} /> Credentials
          </button>
        </div>

        {activeTab === 'registrations' && (
          <div className="dashboard__section animate-fade-in">
            {upcomingSchedule.length > 0 ? (
              <div className="dashboard__card glass" style={{ marginBottom: '1rem' }}>
                <div className="dashboard__card-info">
                  <div className="dashboard__card-header">
                    <h3>Upcoming Schedule</h3>
                  </div>
                  <div className="dashboard__card-meta" style={{ display: 'grid', gap: '0.3rem' }}>
                    {upcomingSchedule.map((item, idx) => (
                      <span key={`${item.eventId}-${item.label}-${idx}`}>
                        <strong>{item.label}</strong> · {formatDate(item.date)} · {item.eventTitle}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {registrations.length === 0 ? (
              <div className="dashboard__empty">
                <p>You haven't registered for any events yet.</p>
                <Link to="/events"><Button variant="primary" iconRight={ArrowRight}>Explore Events</Button></Link>
              </div>
            ) : (
              <div className="dashboard__list">
                {registrations.map(reg => {
                  const event = getEventById(reg.eventId);
                  if (!event) return null;
                  return (
                    <div key={reg.id} className="dashboard__card glass">
                      <div className="dashboard__card-info">
                        <div className="dashboard__card-header">
                          <h3>{event.title}</h3>
                          <Badge variant={reg.checkedIn ? 'success' : 'accent'} size="sm" dot>
                            {reg.checkedIn ? 'Attended' : 'Registered'}
                          </Badge>
                        </div>
                        <p className="dashboard__card-org">{event.organizer.name}</p>
                        <div className="dashboard__card-meta">
                          <span><Calendar size={14} /> {formatDate(event.timeline.eventStart)}</span>
                          {reg.teamName && <span>Team: {reg.teamName}</span>}
                        </div>
                      </div>
                      <div className="dashboard__card-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={QrCodeIcon}
                          onClick={() => setSelectedQR(reg)}
                        >
                          QR Pass
                        </Button>
                        <Link to={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm" icon={ExternalLink}>View</Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="dashboard__section animate-fade-in">
            {credentials.length === 0 ? (
              <div className="dashboard__empty">
                <p>No credentials yet. Attend events to earn verified credentials!</p>
              </div>
            ) : null}

            <div className="dashboard__list">
              {registrations.map((reg) => {
                const event = getEventById(reg.eventId);
                if (!event?.credentialEnabled) return null;
                const existing = credentials.find((cred) => cred.eventId === reg.eventId);
                const state = claimState[reg.eventId] || { loading: false, error: '' };

                return (
                  <div key={`cred-${reg.id}`} className="dashboard__card glass">
                    <div className="dashboard__card-info">
                      <div className="dashboard__card-header">
                        <h3>{event.title}</h3>
                        <Badge variant={existing ? 'success' : 'accent'} size="sm">
                          {existing ? 'Issued' : 'Claim Available'}
                        </Badge>
                      </div>
                      <p className="dashboard__card-meta">
                        <span>Template: {event.credentialTemplate || 'Classic'}</span>
                        <span>Checked in: {reg.checkedIn ? 'Yes' : 'No'}</span>
                      </p>
                      {existing?.recipients?.length ? (
                        <p className="dashboard__card-meta">
                          <span>Names: {existing.recipients.join(', ')}</span>
                        </p>
                      ) : null}
                      {state.error ? <p className="dashboard__card-meta" style={{ color: '#dc2626' }}>{state.error}</p> : null}
                    </div>
                    <div className="dashboard__card-actions">
                      {!existing ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Award}
                          disabled={state.loading || !reg.checkedIn}
                          onClick={() => handleClaimCredential(reg.eventId)}
                        >
                          {state.loading ? 'Claiming...' : 'Claim Certificate'}
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" icon={Download} onClick={() => handleDownloadCredential(existing)}>
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <Modal isOpen={!!selectedQR} onClose={() => setSelectedQR(null)} title="Your QR Entry Pass" size="sm">
        {selectedQR && (
          <div className="qr-display">
            <div className="qr-display__code">
              <QRCodeSVG
                value={selectedQR.qrToken}
                size={200}
                bgColor="#F8FAFC"
                fgColor="#F97316"
                level="H"
              />
            </div>
            <p className="qr-display__token">{selectedQR.qrToken}</p>
            <p className="qr-display__hint">Show this QR code at the venue for entry validation</p>
            {selectedQR.checkedIn && (
              <Badge variant="success" size="md" dot>Checked In — {formatDate(selectedQR.checkedInAt)}</Badge>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
