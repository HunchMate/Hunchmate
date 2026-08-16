'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link } from '@/utils/router';
import {
  Award,
  Bell,
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  Download,
  FileText,
  Globe,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Trash2,
  Users,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { downloadCSV, formatDate } from '@/utils/helpers';
import { issueCertificate } from '@/lib/supabase-data';
import { toast } from '@/utils/toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import '@/vite-pages/organizer/OrganizerDashboard.css';

function StatTile({ icon, label, value, tone = 'blue' }) {
  return (
    <article className={`orgx-metric orgx-metric--${tone}`}>
      <div className="orgx-metric__icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function EventOverview({ event, regs, onEdit, onDelete }) {
  const checkedIn = regs.filter((r) => r.checkedIn).length;
  const checkRate = regs.length > 0 ? Math.round((checkedIn / regs.length) * 100) : 0;
  return (
    <div className="orgx-event-detail__overview">
      <div className="orgx-event-detail__meta-grid">
        <div className="orgx-event-detail__meta-card"><span>Status</span>
          <Badge variant={event.status === 'open' ? 'success' : event.status === 'ongoing' ? 'accent' : 'default'} dot>
            {(event.status || '').charAt(0).toUpperCase() + (event.status || '').slice(1)}
          </Badge>
        </div>
        <div className="orgx-event-detail__meta-card"><span>Registration</span>
          <Badge variant={event.registrationOpen ? 'success' : 'default'} dot>
            {event.registrationOpen ? 'Open' : 'Closed'}
          </Badge>
        </div>
        <div className="orgx-event-detail__meta-card"><span>Type</span><strong>{event.type || event.category || 'Event'}</strong></div>
        <div className="orgx-event-detail__meta-card"><span>Mode</span><strong>{event.mode || 'Online'}</strong></div>
        <div className="orgx-event-detail__meta-card"><span>Registrations</span><strong>{regs.length}</strong></div>
        <div className="orgx-event-detail__meta-card"><span>Check-in Rate</span><strong>{checkRate}%</strong></div>
      </div>
      <div className="orgx-event-detail__checkin-bar">
        <div className="orgx-event-detail__checkin-bar__track">
          <div className="orgx-event-detail__checkin-bar__fill" style={{ width: `${checkRate}%` }} />
        </div>
        <span>{checkedIn} checked in &middot; {regs.length - checkedIn} pending</span>
      </div>
      <div className="orgx-event-detail__actions">
        <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit}>Edit Event</Button>
        <Button variant="ghost" size="sm" icon={Trash2} className="orgx-btn-danger" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

function EventRegistrations({ regs, onExport }) {
  return (
    <div className="orgx-event-detail__regs">
      <div className="orgx-panel__head" style={{ marginBottom: '1rem' }}>
        <h3>{regs.length} Registrations</h3>
        {regs.length > 0 && <Button variant="ghost" size="sm" icon={Download} onClick={onExport}>Export CSV</Button>}
      </div>
      {regs.length === 0 ? (
        <div className="orgx-empty"><Users size={32} /><h3>No registrations yet</h3><p>Participants who register will appear here.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="orgx-table">
            <thead><tr><th>Name</th><th>Email</th><th>Team</th><th>Status</th><th>Registered</th></tr></thead>
            <tbody>
              {regs.map((reg) => (
                <tr key={reg.id}>
                  <td>{reg.participant?.name || reg.members?.[0] || reg.userName || 'Participant'}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{reg.participant?.email || reg.userEmail || '—'}</td>
                  <td>{reg.teamName || '—'}</td>
                  <td><Badge variant={reg.checkedIn ? 'success' : 'default'} size="sm" dot>{reg.checkedIn ? 'Checked In' : 'Registered'}</Badge></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{formatDate(reg.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EventScanner({ event, onCheckIn }) {
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStarting, setScannerStarting] = useState(false);
  const scannerRef = useRef(null);
  const scannerRegionId = 'orgx-event-qr-scanner';

  const applyScanToken = useCallback(async (token) => {
    const t = String(token || '').trim();
    if (!t) return;

    setIsValidating(true);
    setScanResult(null);

    try {
      const result = await onCheckIn(t, event.id);
      setScanResult(result);

      // Fire UI Toast Notifications
      if (result.status === 'valid' || result.success) {
        toast.success(result.message || 'Check-in Successful! Participant verified.', event.title);
      } else if (result.status === 'already-checked-in') {
        toast.info(result.message || 'This participant has already been checked in.', event.title);
      } else if (result.status === 'wrong-event') {
        toast(result.message || 'QR code belongs to a different event.', 'info', event.title);
      } else {
        toast(result.message || 'Validation Failed: QR code not found.', 'info', event.title);
      }

      setTimeout(() => setScanResult(null), 10000);
    } catch (err) {
      console.error('Scan validation error:', err);
      toast.info('Validation Error: Unable to complete check-in request', event.title);
    } finally {
      setIsValidating(false);
    }
  }, [event.id, event.title, onCheckIn]);

  const stopCamera = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try { await s.stop(); } catch { }
    try { await s.clear(); } catch { }
    scannerRef.current = null;
    setScannerStarting(false);
  }, []);

  const openCamera = () => {
    setIsScannerOpen(true); setScannerError(''); setScannerStarting(true);
    setTimeout(async () => {
      try {
        await stopCamera();
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(scannerRegionId);
        scannerRef.current = scanner;
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => { void applyScanToken(decoded); setIsScannerOpen(false); void stopCamera(); },
          () => { }
        );
        setScannerStarting(false);
      } catch { setScannerError('Unable to access camera. Use manual entry.'); setScannerStarting(false); }
    }, 60);
  };

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  return (
    <div className="orgx-scanner">
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
        Paste or scan a participant QR token to validate entry for <strong>{event.title}</strong>.
      </p>
      <div className="orgx-scanner__row">
        <input type="text" placeholder="Paste QR token..." value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isValidating && applyScanToken(scanInput)} />
        <Button variant="primary" icon={Camera} onClick={openCamera} disabled={isValidating}>Scan QR</Button>
        <Button variant="secondary" icon={QrCode} disabled={!scanInput.trim() || isValidating} onClick={() => applyScanToken(scanInput)}>
          {isValidating ? 'Validating...' : 'Validate'}
        </Button>
      </div>

      {/* Validation Progress Bar */}
      {isValidating && (
        <div className="orgx-scanner-progress">
          <LoaderCircle size={20} className="animate-spin text-indigo-500" style={{ color: '#2559bd' }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>Validating QR Code Authenticity...</strong>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Verifying participant registration record on server ledger...</p>
            <div className="orgx-scanner-progress__bar">
              <div className="orgx-scanner-progress__bar-fill" />
            </div>
          </div>
        </div>
      )}

      {scanResult && !isValidating && (
        <div className={`orgx-scan-result orgx-scan-result--${scanResult.status}`}>
          {scanResult.status === 'valid' || scanResult.success ? <CheckCircle size={28} /> : <XCircle size={28} />}
          <div className="orgx-scan-result__head">
            <strong>
              {scanResult.status === 'valid' || scanResult.success
                ? '✓ Check-in Successful'
                : scanResult.status === 'already-checked-in'
                ? 'ℹ Already Checked In'
                : '✕ Validation Failed'}
            </strong>
            <p>{scanResult.message}</p>

            {scanResult.participant?.name && (
              <div className="orgx-scan-team-details" style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="orgx-scan-team-details__row">
                  <span>Participant:</span>
                  <strong>{scanResult.participant.name}</strong>
                </div>
                {scanResult.team?.teamName && (
                  <div className="orgx-scan-team-details__row">
                    <span>Team:</span>
                    <strong>{scanResult.team.teamName}</strong>
                  </div>
                )}
                {scanResult.checkedInAt && (
                  <div className="orgx-scan-team-details__row">
                    <span>Checked-in at:</span>
                    <strong>{new Date(scanResult.checkedInAt).toLocaleTimeString()}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Modal isOpen={isScannerOpen} onClose={() => { setIsScannerOpen(false); void stopCamera(); }} title="Scan QR Code" size="sm">
        <div className="orgx-scanner-modal">
          <div id={scannerRegionId} className="orgx-scanner-modal__viewport">
            <div className="orgx-scanner-modal__laser" />
          </div>
          {scannerStarting && <p className="orgx-scanner-modal__hint">Starting camera…</p>}
          {scannerError && <p className="orgx-scanner-modal__error">{scannerError}</p>}
          <p className="orgx-scanner-modal__hint">Point camera at participant QR code.</p>
          <div className="orgx-scanner-modal__actions">
            <Button variant="secondary" onClick={() => { setIsScannerOpen(false); void stopCamera(); }}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EventCredentials({ event, regs, onIssue, issuing }) {
  const eligible = regs.filter((r) => r.checkedIn).length;
  return (
    <div className="orgx-event-detail__credentials">
      <div className="orgx-credential-card" style={{ maxWidth: 420 }}>
        <Award size={28} style={{ color: '#ff6b00', marginBottom: '0.5rem' }} />
        <h3>{event.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '0.5rem 0 1rem' }}>
          {event.credentialEnabled
            ? `${eligible} checked-in participant${eligible !== 1 ? 's' : ''} eligible for verified certificate issuance.`
            : 'Credentials are disabled. Enable from event settings.'}
        </p>
        <Button variant="primary" icon={issuing ? LoaderCircle : Award} disabled={!event.credentialEnabled || eligible === 0 || issuing} onClick={onIssue}>
          {issuing ? 'Issuing…' : 'Issue Credentials'}
        </Button>
      </div>
    </div>
  );
}

const EVENT_TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'registrations', label: 'Registrations', Icon: Users },
  { id: 'scanner', label: 'Scanner', Icon: QrCode },
  { id: 'credentials', label: 'E-Credentials', Icon: Award },
];

function EventDetailPanel({ event, regs, onBack, onEdit, onDelete, onCheckIn, onIssueCredentials, onExport, issuingCredentials }) {
  const [tab, setTab] = useState('overview');
  return (
    <div className="orgx-event-detail">
      <div className="orgx-event-detail__header">
        <button type="button" className="orgx-event-detail__back" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Events
        </button>
        <div className="orgx-event-detail__title-row">
          <h2>{event.title}</h2>
          <Badge variant={event.status === 'open' ? 'success' : event.status === 'ongoing' ? 'accent' : 'default'} dot>
            {event.status}
          </Badge>
        </div>
        <p className="orgx-event-detail__date">
          <Calendar size={13} /> {formatDate(event.timeline?.eventStart)} &nbsp;&middot;&nbsp; {event.mode || 'Online'} &nbsp;&middot;&nbsp; {event.type || event.category || 'Event'}
        </p>
      </div>
      <div className="orgx-event-detail__tabs">
        {EVENT_TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" className={`orgx-event-detail__tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className="orgx-event-detail__body">
        {tab === 'overview' && <EventOverview event={event} regs={regs} onEdit={onEdit} onDelete={() => onDelete(event)} />}
        {tab === 'registrations' && <EventRegistrations regs={regs} onExport={() => onExport(event.id)} />}
        {tab === 'scanner' && <EventScanner event={event} onCheckIn={onCheckIn} />}
        {tab === 'credentials' && <EventCredentials event={event} regs={regs} issuing={issuingCredentials} onIssue={() => onIssueCredentials(event)} />}
      </div>
    </div>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { events, getEventRegistrations, getOrganizerNotifications, markAllOrganizerNotificationsRead, markOrganizerNotificationRead, checkInParticipant, deleteEvent } = useEvents();

  const [section, setSection] = useState('overview');
  const [eventFilter, setEventFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [issuingCredentials, setIssuingCredentials] = useState(false);

  const organizerNotifications = useMemo(() => getOrganizerNotifications(user?.id), [getOrganizerNotifications, user?.id]);
  const unreadCount = organizerNotifications.filter((n) => !n.read).length;

  const myEvents = useMemo(() => {
    if (!user) return [];
    return events.filter((ev) => { const o = ev.organiser || ev.organizer || {}; return o.id === user.id || o.name === user.organizationName; });
  }, [events, user]);

  const publishedEvents = myEvents.filter((ev) => ev.status !== 'draft');
  const draftEvents = myEvents.filter((ev) => ev.status === 'draft');
  const completedEvents = myEvents.filter((ev) => ev.status === 'completed');

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'published') return publishedEvents;
    if (eventFilter === 'completed') return completedEvents;
    if (eventFilter === 'drafts') return draftEvents;
    return myEvents;
  }, [myEvents, publishedEvents, completedEvents, draftEvents, eventFilter]);

  const statusBreakdown = useMemo(() =>
    myEvents.reduce((acc, ev) => { acc[ev.status] = (acc[ev.status] || 0) + 1; return acc; }, { open: 0, ongoing: 0, upcoming: 0, completed: 0 }),
    [myEvents]);

  const registrationTrend = useMemo(() =>
    [...myEvents].sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0)).slice(0, 6)
      .map((ev) => ({ id: ev.id, title: ev.title, registrations: getEventRegistrations(ev.id).length, checkedIn: getEventRegistrations(ev.id).filter((r) => r.checkedIn).length })),
    [myEvents, getEventRegistrations]);
  const trendMax = Math.max(1, ...registrationTrend.map((i) => i.registrations));

  const totalRegs = useMemo(() => myEvents.reduce((s, ev) => s + (ev.registeredCount || 0), 0), [myEvents]);
  const totalCheckedIn = useMemo(() => myEvents.reduce((s, ev) => s + getEventRegistrations(ev.id).filter((r) => r.checkedIn).length, 0), [myEvents, getEventRegistrations]);
  const checkInRate = totalRegs > 0 ? Math.round((totalCheckedIn / totalRegs) * 100) : 0;

  const handleExportCSV = (eventId) => {
    const regs = getEventRegistrations(eventId);
    const ev = events.find((e) => e.id === eventId);
    downloadCSV(regs.map((reg) => ({ 'Registration ID': reg.id, Team: reg.teamName || 'Individual', Members: reg.members?.join('; ') || '', 'QR Token': reg.qrToken, 'Checked In': reg.checkedIn ? 'Yes' : 'No', 'Registered At': reg.createdAt })), `${ev?.title || 'event'}-registrations.csv`);
  };

  const getRegistrationParticipantName = (registration) =>
    registration?.participant?.name
    || registration?.teamLeadName
    || registration?.members?.[0]
    || registration?.participant?.email
    || 'Participant';

  const handleIssueCredentials = async (ev) => {
    if (issuingCredentials) return;
    if (!ev.credentialEnabled) { toast.error('Credentials disabled for this event.'); return; }

    const checkedInRegs = getEventRegistrations(ev.id).filter((r) => r.checkedIn && r.userId);
    if (!checkedInRegs.length) { toast.error('No checked-in participants.'); return; }

    console.log('[handleIssueCredentials] Starting credential issuance for event:', ev.id, 'participants:', checkedInRegs.length);
    setIssuingCredentials(true);
    try {
      const results = await Promise.allSettled(
        checkedInRegs.map((reg) => issueCertificate({
          eventId: ev.id,
          userId: reg.userId,
          participantName: getRegistrationParticipantName(reg),
          eventTitle: ev.title,
          templateType: ev.credentialTemplate || 'Classic',
          templateData: {
            recipientRole: 'Participant',
            title: ev.credentialConfig?.title || 'Certificate of Achievement',
            subtitle: ev.credentialConfig?.subtitle || 'This certificate is proudly presented to',
            description: ev.credentialConfig?.description || 'for successfully completing',
            signatoryName: ev.credentialConfig?.signatoryName || ev.organizer?.name || 'Event Host',
            signatoryRole: ev.credentialConfig?.signatoryRole || 'Event Host',
            logoUrl: ev.credentialConfig?.logoUrl || '',
            sponsorLogoUrl: ev.credentialConfig?.sponsorLogoUrl || '',
          },
        }))
      );

      let issued = 0;
      let skipped = 0;
      let failed = 0;

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error('[handleIssueCredentials] Promise rejected for participant:', index, result.reason);
          failed += 1;
          return;
        }
        const payload = result.value;
        console.log('[handleIssueCredentials] Result for participant:', index, payload);
        if (payload.ok && payload.success) issued += 1;
        else if (payload.status === 409) skipped += 1;
        else {
          console.error('[handleIssueCredentials] Failed payload for participant:', index, payload);
          failed += 1;
        }
      });

      if (issued > 0) {
        toast.success(`Issued ${issued} verified certificate${issued !== 1 ? 's' : ''}.`, ev.title);
      }
      if (skipped > 0 && issued === 0 && failed === 0) {
        toast.info(`All ${skipped} participant${skipped !== 1 ? 's' : ''} already have certificates.`, ev.title);
      } else if (skipped > 0) {
        toast.info(`${skipped} participant${skipped !== 1 ? 's were' : ' was'} already issued.`, ev.title);
      }
      if (failed > 0) {
        toast.error(`Failed to issue ${failed} certificate${failed !== 1 ? 's' : ''}. Check console for details.`);
      }
    } finally {
      setIssuingCredentials(false);
    }
  };

  const openDeleteModal = (ev) => { setDeleteCandidate(ev); setDeleteConfirmText(''); setDeleteError(''); };

  const handleDeleteEvent = async () => {
    if (!deleteCandidate) return;
    if (deleteConfirmText.trim() !== String(deleteCandidate.title || '').trim()) { setDeleteError('Event name does not match.'); return; }
    setIsDeleting(true); setDeleteError('');
    const result = await deleteEvent(deleteCandidate.id || deleteCandidate._id, deleteConfirmText.trim());
    setIsDeleting(false);
    if (!result?.success) { setDeleteError(result?.error || 'Failed to delete.'); return; }
    toast.success('Event deleted.', deleteCandidate.title);
    setDeleteCandidate(null); setDeleteConfirmText(''); setSelectedEvent(null); setSection('events');
  };

  if (!user) return null;

  return (
    <div className="orgx-page">
      <section className="orgx-hero">
        <div className="container orgx-hero__inner">
          <div>
            <p className="orgx-hero__kicker">Organizer Workspace</p>
            <h1>{user.organisationName || user.organizationName || user.name}</h1>
            <p className="orgx-hero__subtitle">Plan events, monitor registrations, and issue credentials from one command center.</p>
          </div>
          <Link to="/organizer/create-event" className="orgx-hero__cta"><Plus size={16} /> Create Event</Link>
        </div>
      </section>

      <section className="container orgx-shell">
        <div className="orgx-metrics-row">
          <StatTile icon={<Calendar size={18} />} label="Total Events" value={myEvents.length} tone="blue" />
          <StatTile icon={<Globe size={18} />} label="Published Events" value={publishedEvents.length} tone="teal" />
          <StatTile icon={<FileText size={18} />} label="Draft Events" value={draftEvents.length} tone="amber" />
          <StatTile icon={<Bell size={18} />} label="Notices / Alerts" value={unreadCount} tone="violet" />
        </div>

        <div className="orgx-layout">
          <nav className="orgx-sidebar" role="navigation">
            <p className="orgx-sidebar__label">Dashboard</p>
            <button type="button" className={section === 'overview' ? 'is-active' : ''} onClick={() => { setSection('overview'); setSelectedEvent(null); }}><LayoutDashboard size={16} /> Overview</button>
            <button type="button" className={section === 'events' ? 'is-active' : ''} onClick={() => { setSection('events'); setSelectedEvent(null); }}><Calendar size={16} /> My Events</button>
            <button type="button" className={section === 'notifications' ? 'is-active' : ''} onClick={() => { setSection('notifications'); setSelectedEvent(null); }}>
              <Bell size={16} /> Notifications
              {unreadCount > 0 && <span className="orgx-sidebar__badge">{unreadCount}</span>}
            </button>
            <div className="orgx-sidebar__divider" />
            <Link to="/organizer/create-event" style={{ textDecoration: 'none' }}><button type="button"><Plus size={16} /> Create Event</button></Link>
            <Link to="/dashboard/settings" style={{ textDecoration: 'none' }}><button type="button"><Settings size={16} /> Settings</button></Link>
          </nav>

          <div className="orgx-main">

            {section === 'overview' && (
              <section className="orgx-panel orgx-overview animate-fade-in">
                <div className="orgx-overview__left">
                  <h2>Today at a glance</h2>
                  <p>Track event health and jump to common organizer actions.</p>
                  <div className="orgx-health-grid">
                    <article><p>Check-in Conversion</p><strong>{checkInRate}%</strong><span>{totalCheckedIn}/{totalRegs || 0} attendees checked-in</span></article>
                    <article><p>Top Event Reach</p><strong>{registrationTrend[0]?.registrations || 0}</strong><span>{registrationTrend[0]?.title || 'No events yet'}</span></article>
                  </div>
                  <div className="orgx-chart-panel">
                    <div className="orgx-chart-panel__head"><h3>Registration Momentum</h3><span>Top 6 events by registrations</span></div>
                    {registrationTrend.length > 0 ? (
                      <div className="orgx-chart-bars">
                        {registrationTrend.map((item) => (
                          <article key={item.id} className="orgx-chart-bar-item">
                            <div className="orgx-chart-bar-item__meta"><p>{item.title}</p><strong>{item.registrations}</strong></div>
                            <div className="orgx-chart-bar-track"><span style={{ width: `${Math.max(8, Math.round((item.registrations / trendMax) * 100))}%` }} /></div>
                          </article>
                        ))}
                      </div>
                    ) : <p className="orgx-chart-empty">Create events to unlock momentum analytics.</p>}
                  </div>
                </div>
                <div className="orgx-overview__right">
                  <h3>Top Active Events</h3>
                  <ul>
                    {myEvents.slice(0, 4).map((ev) => (
                      <li key={ev.id}>
                        <div><p>{ev.title}</p><span>{getEventRegistrations(ev.id).length} registrations</span></div>
                        <Badge variant={ev.status === 'open' ? 'success' : ev.status === 'ongoing' ? 'accent' : 'default'} size="sm" dot>{ev.status}</Badge>
                      </li>
                    ))}
                  </ul>
                  <div className="orgx-status-chart">
                    <h4>Status Distribution</h4>
                    {[{ label: 'Open', key: 'open' }, { label: 'Live', key: 'ongoing' }, { label: 'Upcoming', key: 'upcoming' }, { label: 'Completed', key: 'completed' }].map((s) => (
                      <div key={s.key} className="orgx-status-row">
                        <span>{s.label}</span>
                        <div><i style={{ width: `${Math.max(4, (statusBreakdown[s.key] || 0) * 18)}%` }} /></div>
                        <strong>{statusBreakdown[s.key] || 0}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {section === 'events' && !selectedEvent && (
              <section className="orgx-panel animate-fade-in">
                <header className="orgx-panel__head">
                  <h2>My Events</h2>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="orgx-filter-pills">
                      {[{ value: 'all', label: `All (${myEvents.length})` }, { value: 'published', label: `Published (${publishedEvents.length})` }, { value: 'completed', label: `Completed (${completedEvents.length})` }, { value: 'drafts', label: `Drafts (${draftEvents.length})` }].map((f) => (
                        <button key={f.value} type="button" className={`orgx-filter-pill${eventFilter === f.value ? ' is-active' : ''}`} onClick={() => setEventFilter(f.value)}>{f.label}</button>
                      ))}
                    </div>
                    <Link to="/organizer/create-event"><Button variant="primary" icon={Plus} size="sm">Create Event</Button></Link>
                  </div>
                </header>
                {filteredEvents.length === 0 ? (
                  <div className="orgx-empty"><Sparkles size={34} /><h3>{eventFilter === 'all' ? 'No events yet' : `No ${eventFilter} events`}</h3><p>{eventFilter === 'all' ? 'Start by creating your first event.' : 'Try a different filter.'}</p></div>
                ) : (
                  <div className="orgx-list">
                    {filteredEvents.map((ev) => {
                      const regs = getEventRegistrations(ev.id);
                      const checkedIn = regs.filter((r) => r.checkedIn).length;
                      return (
                        <article key={ev.id} className="orgx-event-card orgx-event-card--clickable" onClick={() => setSelectedEvent(ev)}>
                          <div className="orgx-event-card__main">
                            <div className="orgx-event-card__title-row">
                              <h3>{ev.title}</h3>
                              <Badge variant={ev.status === 'open' ? 'success' : ev.status === 'ongoing' ? 'accent' : 'default'} size="sm" dot>{ev.status}</Badge>
                            </div>
                            <div className="orgx-event-card__meta">
                              <span><Calendar size={13} /> {formatDate(ev.timeline?.eventStart)}</span>
                              <span><Users size={13} /> {regs.length} registrations</span>
                              <span><CheckCircle size={13} /> {checkedIn} checked in</span>
                            </div>
                          </div>
                          <div className="orgx-event-card__arrow"><ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} /></div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {section === 'events' && selectedEvent && (
              <section className="orgx-panel animate-fade-in">
                <EventDetailPanel
                  event={selectedEvent}
                  regs={getEventRegistrations(selectedEvent.id)}
                  onBack={() => setSelectedEvent(null)}
                  onEdit={() => { window.location.href = `/organizer/edit-event/${selectedEvent.id}`; }}
                  onDelete={openDeleteModal}
                  onCheckIn={checkInParticipant}
                  onIssueCredentials={handleIssueCredentials}
                  issuingCredentials={issuingCredentials}
                  onExport={handleExportCSV}
                />
              </section>
            )}

            {section === 'notifications' && (
              <section className="orgx-panel animate-fade-in">
                <header className="orgx-panel__head">
                  <h2><Bell size={20} /> Notifications</h2>
                  <Button variant="ghost" size="sm" onClick={() => markAllOrganizerNotificationsRead(user.id)}>Mark all read</Button>
                </header>
                {organizerNotifications.length === 0 ? (
                  <div className="orgx-empty"><Bell size={32} /><h3>No notifications yet</h3><p>New registrations will appear here.</p></div>
                ) : (
                  <div className="orgx-notification-list">
                    {organizerNotifications.map((n) => (
                      <article key={n.id} className={`orgx-notification-card ${n.read ? 'is-read' : ''}`}>
                        <div><h3>{n.title}</h3><p>{n.message}</p><small>{formatDate(n.createdAt)}</small></div>
                        {!n.read && <Button variant="ghost" size="sm" onClick={() => markOrganizerNotificationRead(n.id, user.id)}>Mark read</Button>}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </section>

      <Modal isOpen={!!deleteCandidate} onClose={() => { if (isDeleting) return; setDeleteCandidate(null); setDeleteConfirmText(''); setDeleteError(''); }} title="Delete Event" size="md">
        {deleteCandidate && (
          <div className="orgx-delete-confirm">
            <p>This action permanently removes this event and all its data.</p>
            <h3>{deleteCandidate.title}</h3>
            <label htmlFor="delete-event-confirm">Type the exact event name to confirm.</label>
            <input id="delete-event-confirm" type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={deleteCandidate.title} autoComplete="off" />
            {deleteError && <p className="orgx-delete-confirm__error">{deleteError}</p>}
            <div className="orgx-delete-confirm__actions">
              <Button variant="secondary" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="primary" icon={Trash2} className="orgx-btn-danger" loading={isDeleting} disabled={deleteConfirmText.trim() !== String(deleteCandidate.title || '').trim()} onClick={handleDeleteEvent}>Delete Permanently</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
