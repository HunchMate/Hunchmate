'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/utils/router';
import {
  AlertCircle,
  Award,
  BarChart3,
  Bell,
  Camera,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  Pencil,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
// html5-qrcode is loaded dynamically when the scanner is opened (saves ~150 KB on initial load)
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { downloadCSV, formatDate } from '@/utils/helpers';
import { toast } from '@/utils/toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import '@/vite-pages/organizer/OrganizerDashboard.css';

function MetricTile({ icon, label, value, tone = 'blue' }) {
  return (
    <article className={`orgx-metric orgx-metric--${tone}`}>
      <div className="orgx-metric__icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const {
    events,
    getEventRegistrations,
    getOrganizerNotifications,
    markOrganizerNotificationRead,
    markAllOrganizerNotificationsRead,
    checkInParticipant,
    bulkIssueCredentials,
    deleteEvent,
  } = useEvents();

  const [activeTab, setActiveTab] = useState('overview');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStarting, setScannerStarting] = useState(false);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [credentialEvent, setCredentialEvent] = useState(null);
  const [scannerEventId, setScannerEventId] = useState('');
  const [deleteEventCandidate, setDeleteEventCandidate] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementEventId, setAnnouncementEventId] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const scannerRef = useRef(null);
  const scannerRegionId = 'orgx-team-qr-scanner';

  const organizerNotifications = useMemo(
    () => getOrganizerNotifications(user?.id),
    [getOrganizerNotifications, user?.id]
  );

  const unreadNotifications = organizerNotifications.filter((item) => !item.read).length;

  const myEvents = useMemo(() => {
    if (!user) return [];
    return events.filter(
      (event) => {
        const owner = event.organiser || event.organizer || {};
        return (
          owner.id === user.id ||
          owner.name === user.organizationName
        );
      }
    );
  }, [events, user]);

  const totalRegistrations = useMemo(
    () => myEvents.reduce((sum, event) => sum + (event.registeredCount || 0), 0),
    [myEvents]
  );

  const totalCheckedIn = useMemo(
    () =>
      myEvents.reduce(
        (sum, event) => sum + getEventRegistrations(event.id).filter((reg) => reg.checkedIn).length,
        0
      ),
    [myEvents, getEventRegistrations]
  );

  const activeEventsCount = myEvents.filter((event) => event.status === 'open' || event.status === 'ongoing').length;

  const statusBreakdown = useMemo(() => {
    return myEvents.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      },
      { open: 0, ongoing: 0, upcoming: 0, completed: 0 }
    );
  }, [myEvents]);

  const registrationTrend = useMemo(() => {
    return [...myEvents]
      .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
      .slice(0, 6)
      .map((event) => {
        const totalRegs = getEventRegistrations(event.id).length;
        const checkedIn = getEventRegistrations(event.id).filter((reg) => reg.checkedIn).length;
        return {
          id: event.id,
          title: event.title,
          registrations: totalRegs,
          checkedIn,
        };
      });
  }, [myEvents, getEventRegistrations]);

  const trendMax = Math.max(1, ...registrationTrend.map((item) => item.registrations));
  const checkInRate = totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0;

  const applyScanToken = async (tokenValue) => {
    const token = String(tokenValue || '').trim();
    if (!token) return;
    if (!scannerEventId) {
      setScanResult({ success: false, status: 'invalid', message: 'Please select an event first before scanning.' });
      window.setTimeout(() => setScanResult(null), 5000);
      return;
    }

    const result = await checkInParticipant(token, scannerEventId);
    setScanResult(result);
    setScanInput(token);
    window.setTimeout(() => setScanResult(null), 7000);
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    await applyScanToken(scanInput);
    setScanInput('');
  };

  const stopCameraScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Ignore stop errors when scanner is not running.
    }

    try {
      await scanner.clear();
    } catch {
      // Ignore clear errors to avoid noisy teardown warnings.
    }

    scannerRef.current = null;
    setScannerStarting(false);
  };

  const closeScannerModal = () => {
    setIsScannerOpen(false);
    setScannerError('');
    void stopCameraScanner();
  };

  const openCameraScanner = () => {
    setIsScannerOpen(true);
    setScannerError('');
    setScannerStarting(true);

    window.setTimeout(async () => {
      try {
        await stopCameraScanner();

        // Dynamically load html5-qrcode only when actually needed
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(scannerRegionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            void applyScanToken(decodedText);
            setIsScannerOpen(false);
            void stopCameraScanner();
          },
          () => {
            // Ignore frame decode misses.
          }
        );
      } catch {
        setScannerError('Unable to access mobile camera. Allow permission or use manual token validation.');
        setScannerStarting(false);
      }
    }, 60);
  };

  useEffect(() => {
    return () => {
      void stopCameraScanner();
    };
  }, []);

  const handleExportCSV = (eventId) => {
    const registrations = getEventRegistrations(eventId);
    const event = events.find((item) => item.id === eventId);

    const rows = registrations.map((reg) => ({
      'Registration ID': reg.id,
      Team: reg.teamName || 'Individual',
      Members: reg.members.join('; '),
      'QR Token': reg.qrToken,
      'Checked In': reg.checkedIn ? 'Yes' : 'No',
      'Check-in Time': reg.checkedInAt || '',
      'Registered At': reg.createdAt,
    }));

    downloadCSV(rows, `${event?.title || 'event'}-registrations.csv`);
  };

  const handleIssueCredentials = (eventId) => {
    const selectedEvent = events.find((item) => item.id === eventId);
    if (!selectedEvent?.credentialEnabled) {
      window.alert('Credentials are disabled for this event. Enable them from event setup.');
      return;
    }

    const registrations = getEventRegistrations(eventId);
    const checkedInUsers = registrations.filter((reg) => reg.checkedIn).map((reg) => reg.userId);

    if (checkedInUsers.length === 0) {
      window.alert('No checked-in participants available for credentials.');
      return;
    }

    bulkIssueCredentials(eventId, checkedInUsers, 'participation');
    setCredentialEvent(null);
    window.alert(`Issued ${checkedInUsers.length} credentials successfully.`);
  };

  const openDeleteModal = (event) => {
    setDeleteEventCandidate(event);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventCandidate) return;

    const typedName = deleteConfirmText.trim();
    const eventName = String(deleteEventCandidate.title || '').trim();
    const deleteEventId = deleteEventCandidate.id || deleteEventCandidate._id;

    if (typedName !== eventName) {
      setDeleteError('Event name does not match. Please type the exact name.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    const result = await deleteEvent(deleteEventId, typedName);

    setIsDeleting(false);
    if (!result?.success) {
      setDeleteError(result?.error || 'Failed to delete event. Please try again.');
      return;
    }

    toast.success('Event deleted successfully.', eventName);

    setDeleteEventCandidate(null);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  if (!user) return null;

  return (
    <div className="orgx-page">
      <section className="orgx-hero">
        <div className="container orgx-hero__inner">
          <div>
            <p className="orgx-hero__kicker">Organizer Workspace</p>
            <h1>{user.organizationName || user.name}</h1>
            <p className="orgx-hero__subtitle">Plan events, monitor registrations, and issue credentials from one command center.</p>
          </div>

          <Link to="/organizer/create-event" className="orgx-hero__cta">
            <Plus size={16} /> Create Event
          </Link>
        </div>
      </section>

      <section className="container orgx-shell">
        <div className="orgx-metrics-row">
          <MetricTile icon={<Calendar size={18} />} label="Events" value={myEvents.length} tone="blue" />
          <MetricTile icon={<Users size={18} />} label="Registrations" value={totalRegistrations} tone="teal" />
          <MetricTile icon={<CheckCircle size={18} />} label="Checked-In" value={totalCheckedIn} tone="green" />
          <MetricTile icon={<BarChart3 size={18} />} label="Active Events" value={activeEventsCount} tone="violet" />
        </div>

        <div className="orgx-tabs" role="tablist" aria-label="Organizer sections">
          <button type="button" className={activeTab === 'events' ? 'is-active' : ''} onClick={() => setActiveTab('events')}>My Programs</button>
          <button type="button" className={activeTab === 'drafts' ? 'is-active' : ''} onClick={() => setActiveTab('drafts')}>Drafts</button>
          <button type="button" className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>Analytics</button>
          <button type="button" className={activeTab === 'credentials' ? 'is-active' : ''} onClick={() => setActiveTab('credentials')}>Certificates</button>
          <button type="button" className={activeTab === 'registrations' ? 'is-active' : ''} onClick={() => setActiveTab('registrations')}>Registrations</button>
          <button type="button" className={activeTab === 'approvals' ? 'is-active' : ''} onClick={() => setActiveTab('approvals')}>Approvals</button>
          <button type="button" className={activeTab === 'teams' ? 'is-active' : ''} onClick={() => setActiveTab('teams')}>Teams</button>
          <button type="button" className={activeTab === 'submissions' ? 'is-active' : ''} onClick={() => setActiveTab('submissions')}>Submissions</button>
          <button type="button" className={activeTab === 'announcements' ? 'is-active' : ''} onClick={() => setActiveTab('announcements')}>Announcements</button>
        </div>

        {activeTab === 'notifications' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2><Bell size={20} /> Organizer Notifications</h2>
              <Button variant="ghost" size="sm" onClick={() => markAllOrganizerNotificationsRead(user.id)}>Mark all as read</Button>
            </header>

            {organizerNotifications.length === 0 ? (
              <div className="orgx-empty">
                <Bell size={32} />
                <h3>No notifications yet</h3>
                <p>New registrations and invite acceptances will appear here.</p>
              </div>
            ) : (
              <div className="orgx-notification-list">
                {organizerNotifications.map((notification) => (
                  <article key={notification.id} className={`orgx-notification-card ${notification.read ? 'is-read' : ''}`}>
                    <div>
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      {notification.payload?.teamName ? (
                        <small>Team: {notification.payload.teamName}</small>
                      ) : null}
                      {Array.isArray(notification.payload?.members) && notification.payload.members.length > 0 ? (
                        <small>Members: {notification.payload.members.join(', ')}</small>
                      ) : null}
                      <small>{formatDate(notification.createdAt)}</small>
                    </div>
                    {!notification.read ? (
                      <Button variant="ghost" size="sm" onClick={() => markOrganizerNotificationRead(notification.id, user.id)}>
                        Mark read
                      </Button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'overview' && (
          <section className="orgx-panel orgx-overview animate-fade-in">
            <div className="orgx-overview__left">
              <h2>Today at a glance</h2>
              <p>Track event health and jump to common organizer actions.</p>

              <div className="orgx-overview__actions">
                <Button variant="ghost" icon={Download} onClick={() => myEvents[0] && handleExportCSV(myEvents[0].id)}>Export First Event CSV</Button>
              </div>

              <div className="orgx-health-grid">
                <article>
                  <p>Check-in Conversion</p>
                  <strong>{checkInRate}%</strong>
                  <span>{totalCheckedIn}/{totalRegistrations || 0} attendees checked-in</span>
                </article>
                <article>
                  <p>Top Event Reach</p>
                  <strong>{registrationTrend[0]?.registrations || 0}</strong>
                  <span>{registrationTrend[0]?.title || 'No events yet'}</span>
                </article>
              </div>

              <div className="orgx-chart-panel">
                <div className="orgx-chart-panel__head">
                  <h3>Registration Momentum</h3>
                  <span>Top 6 events by registrations</span>
                </div>

                {registrationTrend.length > 0 ? (
                  <div className="orgx-chart-bars">
                    {registrationTrend.map((item) => (
                      <article key={item.id} className="orgx-chart-bar-item">
                        <div className="orgx-chart-bar-item__meta">
                          <p>{item.title}</p>
                          <strong>{item.registrations}</strong>
                        </div>
                        <div className="orgx-chart-bar-track">
                          <span style={{ width: `${Math.max(8, Math.round((item.registrations / trendMax) * 100))}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="orgx-chart-empty">Create events to unlock momentum analytics.</p>
                )}
              </div>
            </div>

            <div className="orgx-overview__right">
              <h3>Top Active Events</h3>
              <ul>
                {myEvents.slice(0, 4).map((event) => (
                  <li key={event.id}>
                    <div>
                      <p>{event.title}</p>
                      <span>{getEventRegistrations(event.id).length} registrations</span>
                    </div>
                    <Badge variant={event.status === 'open' ? 'success' : event.status === 'ongoing' ? 'accent' : 'default'} size="sm" dot>
                      {event.status}
                    </Badge>
                  </li>
                ))}
              </ul>

              <div className="orgx-status-chart">
                <h4>Status Distribution</h4>
                <div className="orgx-status-row">
                  <span>Open</span>
                  <div><i style={{ width: `${Math.max(4, statusBreakdown.open * 18)}%` }} /></div>
                  <strong>{statusBreakdown.open}</strong>
                </div>
                <div className="orgx-status-row">
                  <span>Live</span>
                  <div><i style={{ width: `${Math.max(4, statusBreakdown.ongoing * 18)}%` }} /></div>
                  <strong>{statusBreakdown.ongoing}</strong>
                </div>
                <div className="orgx-status-row">
                  <span>Upcoming</span>
                  <div><i style={{ width: `${Math.max(4, statusBreakdown.upcoming * 18)}%` }} /></div>
                  <strong>{statusBreakdown.upcoming}</strong>
                </div>
                <div className="orgx-status-row">
                  <span>Completed</span>
                  <div><i style={{ width: `${Math.max(4, statusBreakdown.completed * 18)}%` }} /></div>
                  <strong>{statusBreakdown.completed}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'events' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2>My Events</h2>
              <Link to="/organizer/create-event"><Button variant="primary" icon={Plus}>Create Event</Button></Link>
            </header>

            {myEvents.length === 0 ? (
              <div className="orgx-empty">
                <Sparkles size={34} />
                <h3>No events yet</h3>
                <p>Start by creating your first event and your dashboard analytics will appear here.</p>
              </div>
            ) : (
              <div className="orgx-list">
                {myEvents.map((event) => {
                  const regs = getEventRegistrations(event.id);
                  const checkedIn = regs.filter((reg) => reg.checkedIn).length;

                  return (
                    <article key={event.id} className="orgx-event-card">
                      <div className="orgx-event-card__main">
                        <div className="orgx-event-card__title-row">
                          <h3>{event.title}</h3>
                          <Badge variant={event.status === 'open' ? 'success' : event.status === 'ongoing' ? 'accent' : 'default'} size="sm" dot>
                            {event.status}
                          </Badge>
                        </div>

                        <div className="orgx-event-card__meta">
                          <span><Calendar size={14} /> {formatDate(event.timeline.eventStart)}</span>
                          <span><Users size={14} /> {regs.length} registrations</span>
                          <span><CheckCircle size={14} /> {checkedIn} checked in</span>
                        </div>
                      </div>

                      <div className="orgx-event-card__actions">
                        <Link to={`/organizer/edit-event/${event.id}`}>
                          <Button variant="ghost" size="sm" icon={Pencil}>Edit Event</Button>
                        </Link>
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setRegistrationEvent(event)}>View Registrations</Button>
                        <Button variant="ghost" size="sm" icon={Download} onClick={() => handleExportCSV(event.id)}>Export CSV</Button>
                        <Button variant="ghost" size="sm" icon={Award} onClick={() => setCredentialEvent(event)}>Issue Credentials</Button>
                        <Button variant="ghost" size="sm" icon={Trash2} className="orgx-btn-danger" onClick={() => openDeleteModal(event)}>
                          Delete Event
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'drafts' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2>Drafts</h2>
            </header>
            <div className="orgx-empty">
              <Pencil size={34} />
              <h3>No drafts found</h3>
              <p>Programs you've started but haven't published yet will appear here.</p>
            </div>
          </section>
        )}

        {activeTab === 'registrations' && (() => {
          const allRegs = myEvents.flatMap((ev) => getEventRegistrations(ev.id).map((reg) => ({ ...reg, eventTitle: ev.title, eventId: ev.id })));
          return (
            <section className="orgx-panel animate-fade-in">
              <header className="orgx-panel__head">
                <h2>All Registrations ({allRegs.length})</h2>
                {allRegs.length > 0 && <Button variant="ghost" size="sm" icon={Download} onClick={() => {
                  const csvData = allRegs.map((r) => ({ Event: r.eventTitle, Name: r.name || r.userName || '', Email: r.email || r.userEmail || '', Team: r.teamName || '-', Date: r.registeredAt || r.createdAt || '', Status: r.checkedIn ? 'Checked In' : 'Registered' }));
                  downloadCSV(csvData, 'all-registrations');
                }}>Export All CSV</Button>}
              </header>
              {allRegs.length === 0 ? (
                <div className="orgx-empty">
                  <Users size={34} />
                  <h3>No registration data</h3>
                  <p>When participants register for your programs, their data will populate here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Event</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Team</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRegs.map((reg, idx) => (
                        <tr key={`reg-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text)' }}>{reg.eventTitle}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text)' }}>{reg.name || reg.userName || '-'}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-muted)' }}>{reg.email || reg.userEmail || '-'}</td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-muted)' }}>{reg.teamName || '-'}</td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            <Badge variant={reg.checkedIn ? 'success' : 'default'} size="sm">{reg.checkedIn ? 'Checked In' : 'Registered'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })()}

        {activeTab === 'approvals' && (() => {
          const inviteEvents = myEvents.filter((ev) => ev.accessType === 'Invite');
          return (
            <section className="orgx-panel animate-fade-in">
              <header className="orgx-panel__head">
                <h2>Approvals</h2>
              </header>
              {inviteEvents.length === 0 ? (
                <div className="orgx-empty">
                  <CheckCircle size={34} />
                  <h3>No invite-only events</h3>
                  <p>Events with &ldquo;Invite Only&rdquo; access type will show pending approvals here.</p>
                </div>
              ) : (
                <div className="orgx-list">
                  {inviteEvents.map((ev) => {
                    const regs = getEventRegistrations(ev.id);
                    const pending = regs.filter((r) => !r.approved && !r.rejected);
                    return (
                      <article key={ev.id} className="orgx-event-card">
                        <div className="orgx-event-card__main">
                          <h3>{ev.title}</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{pending.length} pending approval{pending.length !== 1 ? 's' : ''}, {regs.length} total registrations</p>
                        </div>
                        {pending.length > 0 ? (
                          <div style={{ marginTop: '0.5rem' }}>
                            {pending.slice(0, 10).map((reg, idx) => (
                              <div key={`pend-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{reg.name || reg.userName || 'Participant'}</span>
                                  <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{reg.email || reg.userEmail || ''}</span>
                                  {reg.teamName ? <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#ff6b00' }}>Team: {reg.teamName}</span> : null}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <Button variant="primary" size="sm" icon={CheckCircle}>Approve</Button>
                                  <Button variant="ghost" size="sm" icon={XCircle}>Reject</Button>
                                </div>
                              </div>
                            ))}
                            {pending.length > 10 ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>+{pending.length - 10} more pending</p> : null}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.4rem' }}>✓ All registrations processed</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        {activeTab === 'teams' && (() => {
          const teamRegs = myEvents.flatMap((ev) => getEventRegistrations(ev.id).filter((r) => r.teamName).map((r) => ({ ...r, eventTitle: ev.title })));
          const teamGroups = {};
          teamRegs.forEach((r) => {
            const key = `${r.eventTitle}__${r.teamName}`;
            if (!teamGroups[key]) teamGroups[key] = { eventTitle: r.eventTitle, teamName: r.teamName, members: [] };
            teamGroups[key].members.push(r.name || r.userName || r.email || r.userEmail || 'Member');
          });
          const teamList = Object.values(teamGroups);
          return (
            <section className="orgx-panel animate-fade-in">
              <header className="orgx-panel__head">
                <h2>Teams ({teamList.length})</h2>
              </header>
              {teamList.length === 0 ? (
                <div className="orgx-empty">
                  <Users size={34} />
                  <h3>No team registrations</h3>
                  <p>Team registrations from your events will appear here.</p>
                </div>
              ) : (
                <div className="orgx-list">
                  {teamList.map((team, idx) => (
                    <article key={`team-${idx}`} className="orgx-event-card">
                      <div className="orgx-event-card__main">
                        <div className="orgx-event-card__title-row">
                          <h3>{team.teamName}</h3>
                          <Badge variant="accent" size="sm">{team.members.length} members</Badge>
                        </div>
                        <div className="orgx-event-card__meta">
                          <span><Calendar size={14} /> {team.eventTitle}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{team.members.join(', ')}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {activeTab === 'submissions' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2>Submissions</h2>
            </header>
            {myEvents.filter((ev) => Array.isArray(ev.rounds) && ev.rounds.length > 0).length === 0 ? (
              <div className="orgx-empty">
                <Award size={34} />
                <h3>No multi-round events</h3>
                <p>Events with configured rounds will show submission tracking here.</p>
              </div>
            ) : (
              <div className="orgx-list">
                {myEvents.filter((ev) => Array.isArray(ev.rounds) && ev.rounds.length > 0).map((ev) => (
                  <article key={ev.id} className="orgx-event-card">
                    <div className="orgx-event-card__main">
                      <h3>{ev.title}</h3>
                      <div style={{ marginTop: '0.5rem' }}>
                        {ev.rounds.map((round, idx) => (
                          <div key={`sub-round-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Badge variant="default" size="sm">Round {idx + 1}</Badge>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{round.name}</span>
                            {round.submissionTypes?.length > 0 ? <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>({round.submissionTypes.join(', ')})</span> : null}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Submissions will appear here when participants submit their work.</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'announcements' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2>Announcements</h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Select Event</label>
                  <select
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text)', fontSize: '0.88rem' }}
                    value={announcementEventId}
                    onChange={(e) => setAnnouncementEventId(e.target.value)}
                  >
                    <option value="">Choose an event...</option>
                    {myEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
              </div>
              <textarea
                style={{ padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text)', fontSize: '0.88rem', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                placeholder="Type your announcement here..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!announcementEventId || !announcementText.trim()}
                onClick={() => {
                  const ev = myEvents.find((e) => e.id === announcementEventId);
                  setAnnouncements((prev) => [{ id: Date.now(), eventId: announcementEventId, eventTitle: ev?.title || '', text: announcementText.trim(), postedAt: new Date().toISOString() }, ...prev]);
                  setAnnouncementText('');
                }}
              >
                Post Announcement
              </Button>
            </div>
            {announcements.length === 0 ? (
              <div className="orgx-empty">
                <Bell size={34} />
                <h3>No announcements yet</h3>
                <p>Select an event and post an announcement to notify participants.</p>
              </div>
            ) : (
              <div className="orgx-list">
                {announcements.map((ann) => (
                  <article key={ann.id} className="orgx-event-card">
                    <div className="orgx-event-card__main">
                      <div className="orgx-event-card__title-row">
                        <h3>{ann.eventTitle}</h3>
                        <Badge variant="default" size="sm">{formatDate(ann.postedAt)}</Badge>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginTop: '0.35rem', lineHeight: 1.5 }}>{ann.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'scanner' && (
          <section className="orgx-panel orgx-scanner animate-fade-in">
            <h2><QrCode size={22} /> Validate Entry</h2>
            <p>Select the event you are scanning for, then paste or scan participant QR token.</p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>Select Event to Validate</label>
              <select
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text)', fontSize: '0.88rem', width: '100%' }}
                value={scannerEventId}
                onChange={(e) => setScannerEventId(e.target.value)}
              >
                <option value="">Choose your event...</option>
                {myEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>

            <div className="orgx-scanner__row">
              <input
                type="text"
                placeholder="QR token (e.g. EVT:abc123|USR:def456|TOK:XYZ)"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button variant="primary" icon={Camera} onClick={openCameraScanner}>Scan QR</Button>
              <Button variant="secondary" icon={QrCode} disabled={!scanInput.trim()} onClick={handleScan}>Validate Token</Button>
            </div>

            {scanResult && (
              <div className={`orgx-scan-result orgx-scan-result--${scanResult.status}`}>
                {scanResult.status === 'valid' && <CheckCircle size={30} />}
                {scanResult.status === 'invalid' && <XCircle size={30} />}
                {scanResult.status === 'wrong-event' && <AlertCircle size={30} />}
                {scanResult.status === 'already-checked-in' && <AlertCircle size={30} />}
                {scanResult.status === 'auth-expired' && <AlertCircle size={30} />}
                <div className="orgx-scan-result__head">
                  <strong>
                    {scanResult.status === 'valid'
                      ? 'Validation Successful'
                      : scanResult.status === 'wrong-event'
                        ? 'Not Registered For This Event'
                      : scanResult.status === 'auth-expired'
                        ? 'Session Expired'
                      : scanResult.status === 'already-checked-in'
                        ? 'Already Validated'
                        : 'Validation Failed'}
                  </strong>
                  <p>{scanResult.message}</p>
                </div>
                {scanResult.event?.title ? (
                  <div className="orgx-scan-event">
                    <span>Event</span>
                    <strong>{scanResult.event.title}</strong>
                  </div>
                ) : null}
                {scanResult.team ? (
                  <div className="orgx-scan-team-details">
                    <div className="orgx-scan-team-details__row"><span>Team Name</span><strong>{scanResult.team.teamName}</strong></div>
                    <div className="orgx-scan-team-details__row"><span>Registered On</span><strong>{formatDate(scanResult.team.registrationDate)}</strong></div>
                    <div className="orgx-scan-team-details__members">
                      <span>Teammates</span>
                      {Array.isArray(scanResult.team.members) && scanResult.team.members.length > 0 ? (
                        <ul>
                          {scanResult.team.members.map((member, index) => (
                            <li key={`${member}-${index}`}>{member}</li>
                          ))}
                        </ul>
                      ) : (
                        <strong>No team members listed</strong>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}

        {activeTab === 'credentials' && (
          <section className="orgx-panel animate-fade-in">
            <header className="orgx-panel__head">
              <h2>Credential Issuer</h2>
            </header>

            <div className="orgx-credentials-grid">
              {myEvents.map((event) => {
                const checkedIn = getEventRegistrations(event.id).filter((reg) => reg.checkedIn).length;
                return (
                  <article key={event.id} className="orgx-credential-card">
                    <h3>{event.title}</h3>
                    <p>
                      {event.credentialEnabled
                        ? `${checkedIn} checked-in participants ready for credential issuance.`
                        : 'Credentials disabled for this event.'}
                    </p>
                    <Button variant="primary" size="sm" icon={Award} onClick={() => setCredentialEvent(event)}>
                      Issue for Event
                    </Button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>

      <Modal
        isOpen={isScannerOpen}
        onClose={closeScannerModal}
        title="Scan Team QR"
        size="sm"
      >
        <div className="orgx-scanner-modal">
          <div id={scannerRegionId} className="orgx-scanner-modal__viewport" />
          {scannerStarting ? <p className="orgx-scanner-modal__hint">Starting camera...</p> : null}
          {scannerError ? <p className="orgx-scanner-modal__error">{scannerError}</p> : null}
          <p className="orgx-scanner-modal__hint">Point your mobile camera at the team QR to validate eligibility and check-in.</p>
          <div className="orgx-scanner-modal__actions">
            <Button variant="secondary" onClick={closeScannerModal}>Close Scanner</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!registrationEvent}
        onClose={() => setRegistrationEvent(null)}
        title={`Registrations - ${registrationEvent?.title}`}
        size="lg"
      >
        {registrationEvent && (() => {
          const regs = getEventRegistrations(registrationEvent.id);
          return regs.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No registrations yet.</p>
          ) : (
            <div className="orgx-table-wrap">
              <table className="orgx-table">
                <thead>
                  <tr>
                    <th>Team / Name</th>
                    <th>User Details</th>
                    <th>Team Members</th>
                    <th>QR Token</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((reg) => (
                    <tr key={reg.id}>
                      <td>{reg.teamName || reg.members?.[0] || 'N/A'}</td>
                      <td>
                        <div className="orgx-registrant-details">
                          <strong>{reg.participant?.name || reg.members?.[0] || 'Participant'}</strong>
                          <span>{reg.participant?.email || 'Email unavailable'}</span>
                          {reg.userId ? <span>User ID: {reg.userId}</span> : null}
                          {reg.participant?.institution ? <span>Institution: {reg.participant.institution}</span> : null}
                          {reg.participant?.organizationName ? <span>Org: {reg.participant.organizationName}</span> : null}
                        </div>
                      </td>
                      <td>
                        {Array.isArray(reg.members) && reg.members.length > 0 ? (
                          <div className="orgx-team-members">
                            {reg.members.map((member, memberIndex) => (
                              <span key={`${reg.id}-member-${memberIndex}`}>{member}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="orgx-team-members__empty">Individual</span>
                        )}
                      </td>
                      <td><code>{reg.qrToken}</code></td>
                      <td>
                        <Badge
                          variant={String(reg.paymentStatus || '').toLowerCase() === 'paid' ? 'success' : 'default'}
                          size="sm"
                          dot
                        >
                          {String(reg.paymentStatus || '').toLowerCase() === 'paid' ? 'Payment Successful' : 'Not Paid'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={reg.checkedIn ? 'success' : 'default'} size="sm" dot>
                          {reg.checkedIn ? 'Checked In' : 'Pending'}
                        </Badge>
                      </td>
                      <td>{formatDate(reg.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={!!credentialEvent}
        onClose={() => setCredentialEvent(null)}
        title="Issue Credentials"
        size="md"
      >
        {credentialEvent && (
          <div className="orgx-credential-issue">
            <p>Issue participation credentials for all checked-in participants of:</p>
            <h3>{credentialEvent.title}</h3>
            {!credentialEvent.credentialEnabled && (
              <p className="orgx-credential-issue__muted">Credentials are disabled for this event.</p>
            )}
            <p className="orgx-credential-issue__muted">
              {getEventRegistrations(credentialEvent.id).filter((reg) => reg.checkedIn).length} participants are eligible.
            </p>
            <div className="orgx-credential-issue__actions">
              <Button
                variant="primary"
                icon={Award}
                disabled={!credentialEvent.credentialEnabled}
                onClick={() => handleIssueCredentials(credentialEvent.id)}
              >
                Generate & Issue
              </Button>
              <Button variant="secondary" onClick={() => setCredentialEvent(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteEventCandidate}
        onClose={() => {
          if (isDeleting) return;
          setDeleteEventCandidate(null);
          setDeleteConfirmText('');
          setDeleteError('');
        }}
        title="Delete Event"
        size="md"
      >
        {deleteEventCandidate && (
          <div className="orgx-delete-confirm">
            <p>
              This action permanently removes this event from organizer dashboard, participant side, and database records.
            </p>
            <h3>{deleteEventCandidate.title}</h3>
            <label htmlFor="delete-event-confirm">Type the exact event name to confirm deletion.</label>
            <input
              id="delete-event-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteEventCandidate.title}
              autoComplete="off"
            />
            {deleteError ? <p className="orgx-delete-confirm__error">{deleteError}</p> : null}
            <div className="orgx-delete-confirm__actions">
              <Button variant="secondary" onClick={() => setDeleteEventCandidate(null)} disabled={isDeleting}>Cancel</Button>
              <Button
                variant="primary"
                icon={Trash2}
                className="orgx-btn-danger"
                onClick={handleDeleteEvent}
                loading={isDeleting}
                disabled={deleteConfirmText.trim() !== String(deleteEventCandidate.title || '').trim()}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
