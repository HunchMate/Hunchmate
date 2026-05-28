'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@/utils/router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Mail,
  MapPin,
  Phone,
  UserPlus,
  Share2,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { buildEventPathSegment, formatDate } from '@/utils/helpers';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/tabs';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { EventDetailSkeleton } from '@/components/ui/Skeleton';
import '@/vite-pages/EventDetail.css';

function isRenderableImageSrc(raw) {
  const value = String(raw || '').trim();
  if (!value || value === 'null' || value === 'undefined') return false;

  if (value.startsWith('data:image/') || value.startsWith('blob:') || value.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function firstRenderableImage(candidates) {
  for (const candidate of candidates) {
    if (isRenderableImageSrc(candidate)) return String(candidate).trim();
  }
  return '';
}

function toTimestamp(value) {
  const raw = String(value || '').trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

export default function EventDetail() {
  const { eventId: eventParam } = useParams();
  const navigate = useNavigate();
  const { getEventById, getEventRegistrationForUser, registerForEvent, updateTeamRegistration, createTeamInvitation, eventsLoading } = useEvents();
  const { user, findRegisteredUserByEmail } = useAuth();

  const [showRegModal, setShowRegModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [regForm, setRegForm] = useState({
    teamName: '',
    participantType: 'student',
    teamLeadName: '',
    registrationType: 'Individual',
    linkedinUrl: '',
    githubUrl: '',
    resumeUrl: '',
    customField: '',
    consentAgreed: false,
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRows, setInviteRows] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersBaseline, setTeamMembersBaseline] = useState([]);
  const [isTeamEditMode, setIsTeamEditMode] = useState(false);
  const [inviteNotice, setInviteNotice] = useState(null);
  const [regStatus, setRegStatus] = useState(null);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [now, setNow] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  const event = getEventById(eventParam);
  const resolvedEventId = String(event?.id || '').trim();
  const currentRegistration = user && resolvedEventId ? getEventRegistrationForUser(resolvedEventId, user) : null;

  useEffect(() => {
    if (!event || !eventParam) return;
    const canonicalSegment = buildEventPathSegment(event);
    if (!canonicalSegment || canonicalSegment === eventParam) return;
    navigate(`/events/${canonicalSegment}`, { replace: true });
  }, [event, eventParam, navigate]);

  // Show skeleton during SSR and initial hydration to prevent mismatch, 
  // or while Firebase data is loading and event hasn't been found yet
  if (!mounted || (eventsLoading && !event)) {
    return <EventDetailSkeleton />;
  }
  const teamLeadId = String(currentRegistration?.teamLeadId || currentRegistration?.userId || '').trim();
  const canManageTeam = Boolean(
    currentRegistration && String(user?.id || '').trim() && teamLeadId === String(user?.id || '').trim()
  );

  const getLeadLabel = () => String(currentRegistration?.teamLeadName || user?.name || user?.email || '').trim();

  const resetRegistrationModal = () => {
    setShowRegModal(false);
    setRegStatus(null);
    setInviteNotice(null);
    setInviteRows([]);
    setTeamMembers([]);
    setTeamMembersBaseline([]);
    setIsTeamEditMode(false);
    setInviteEmail('');
    setRegForm({
      teamName: '',
      participantType: 'student',
      teamLeadName: '',
      registrationType: 'Individual',
      linkedinUrl: '',
      githubUrl: '',
      resumeUrl: '',
      customField: '',
      consentAgreed: false
    });
  };

  const openRegistrationModal = () => {
    setIsTeamEditMode(false);
    setRegStatus(null);
    setInviteNotice(null);
    setInviteRows([]);
    setTeamMembers([]);
    setTeamMembersBaseline([]);
    setInviteEmail('');
    setRegForm({
      teamName: '',
      participantType: 'student',
      teamLeadName: '',
      registrationType: event.participationType === 'Team' ? 'Team' : 'Individual',
      linkedinUrl: '',
      githubUrl: '',
      resumeUrl: '',
      customField: '',
      consentAgreed: false
    });
    setShowRegModal(true);
  };

  const openTeamEditor = () => {
    if (!currentRegistration || !canManageTeam) return;

    const leadLabel = getLeadLabel();
    const existingMembers = Array.isArray(currentRegistration.members) ? currentRegistration.members : [];
    const editableMembers = existingMembers.filter((member, index) => {
      const normalized = String(member || '').trim().toLowerCase();
      if (!normalized) return false;
      if (index === 0) return false;

      const leadNormalized = String(leadLabel || '').trim().toLowerCase();
      const nameNormalized = String(user?.name || '').trim().toLowerCase();
      const emailNormalized = String(user?.email || '').trim().toLowerCase();

      return normalized !== leadNormalized && normalized !== nameNormalized && normalized !== emailNormalized;
    });

    setIsTeamEditMode(true);
    setRegStatus(null);
    setInviteNotice(null);
    setRegForm({
      teamName: currentRegistration.teamName || '',
      participantType: currentRegistration.participantType || 'student',
      teamLeadName: leadLabel,
      registrationType: currentRegistration.teamName ? 'Team' : 'Individual',
      linkedinUrl: currentRegistration.linkedinUrl || '',
      githubUrl: currentRegistration.githubUrl || '',
      resumeUrl: currentRegistration.resumeUrl || '',
      customField: currentRegistration.customField || '',
      consentAgreed: currentRegistration.consentAgreed || false,
    });
    setTeamMembers(editableMembers);
    setTeamMembersBaseline(editableMembers);
    setInviteRows([]);
    setInviteEmail('');
    setShowRegModal(true);
  };

  if (!event) {
    return (
      <div className="event-detail__not-found container">
        <h2>Event Not Found</h2>
        <p>The event you're looking for doesn't exist or has been removed.</p>
        <Link to="/events">
          <Button variant="primary">Back to Programs</Button>
        </Link>
      </div>
    );
  }

  const viewsCount = parseInt(event.pageViews || event.views) || (event.registeredCount || 0) * 3;
  const regEndMs = new Date(event.timeline.registrationEnd).getTime();
  const regStartMs = new Date(event.timeline.registrationStart).getTime();
  const daysToClose = Math.ceil((regEndMs - now) / (1000 * 60 * 60 * 24));
  const progressSpan = Math.max(1, regEndMs - regStartMs);
  const progressElapsed = Math.min(Math.max(now - regStartMs, 0), progressSpan);
  const registrationProgress = Math.round((progressElapsed / progressSpan) * 100);
  const hoursLeft = Math.max(0, Math.floor((regEndMs - now) / (1000 * 60 * 60)));
  const teamSizeMin = Number.parseInt(event.teamSize?.min, 10);
  const teamSizeMax = Number.parseInt(event.teamSize?.max, 10);
  const hasValidTeamRange = Number.isInteger(teamSizeMin) && Number.isInteger(teamSizeMax) && teamSizeMin > 0 && teamSizeMax >= teamSizeMin;

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const hasInviteQuery = searchParams.get('invite') === 'true' || searchParams.get('code') !== null;

  const maxAllowedRegs = parseInt(event.maxRegistrations || event.maxParticipants || 100, 10);
  const isFull = (event.registeredCount || 0) >= maxAllowedRegs;
  const isWaitlistActive = event.enableWaitlist && isFull;

  const isTeamReg =
    event.participationType === 'Team' ||
    (event.participationType === 'Both' && regForm.registrationType === 'Team') ||
    (!event.participationType && event.teamSize && regForm.participantType !== 'student');

  const sections = event.sections || {};
  const organiserDetails = event.organiser || event.organizer || {};
  const organizerContactEmail = String(
    event.organizerContactEmail || organiserDetails.email || ''
  ).trim();
  const organizerContactPhone = String(
    event.organizerContactPhone || organiserDetails.phone || ''
  ).trim();
  const timelineItems = Array.isArray(event.timelineItems) ? event.timelineItems : [];
  const eventThemes = Array.isArray(event.themes) && event.themes.length > 0
    ? event.themes
    : Array.isArray(event.tags)
      ? event.tags
      : [];
  const problemStatements = Array.isArray(event.problemStatements)
    ? event.problemStatements.map((entry, index) => {
        if (typeof entry === 'string') {
          return {
            psId: `PS-${String(index + 1).padStart(3, '0')}`,
            psDescription: '',
            psStatement: entry,
          };
        }

        const item = entry || {};
        return {
          psId: String(item.psId || '').trim(),
          psDescription: String(item.psDescription || item.description || '').trim(),
          psStatement: String(item.psStatement || item.statement || item.title || '').trim(),
        };
      })
    : [];
  const subEvents = Array.isArray(event.subEvents) ? event.subEvents : [];
  const mediaBannerImage = firstRenderableImage([
    event.posterImage,
    event.bannerImages?.[0],
    event.media?.banners?.[0],
  ]);
  const mediaGalleryImage = firstRenderableImage([
    event.showcaseImage,
    event.galleryImages?.[0],
    event.media?.gallery?.[0],
  ]);
  const mapLink = event.mapLink || event.locationLink || event.googleMapsLink || '';
  const customRules = Array.isArray(event.rules)
    ? event.rules
    : typeof event.rules === 'string'
      ? event.rules.split('\n').map((rule) => rule.trim()).filter(Boolean)
      : [];

  const scheduleItems = [
    {
      title: 'Registration Opens',
      date: event.timeline?.registrationStart || '',
      description: 'Applications are now open for this event.',
      source: 'event',
    },
    {
      title: 'Registration Closes',
      date: event.timeline?.registrationEnd || '',
      description: 'Complete your registration before this deadline.',
      source: 'event',
    },
    {
      title: 'Event Starts',
      date: event.timeline?.eventStart || '',
      description: 'Main event kickoff.',
      source: 'event',
    },
    {
      title: 'Event Ends',
      date: event.timeline?.eventEnd || '',
      description: 'Main event wrap-up.',
      source: 'event',
    },
    ...timelineItems.map((item) => ({
      title: String(item?.title || '').trim() || 'Milestone',
      date: String(item?.date || item?.time || '').trim(),
      description: String(item?.description || '').trim(),
      source: 'timeline',
    })),
    ...subEvents.flatMap((subEvent, subEventIndex) => {
      const baseTitle = String(subEvent?.title || '').trim() || `Sub-event ${subEventIndex + 1}`;
      const milestones = Array.isArray(subEvent?.milestones)
        ? subEvent.milestones
            .map((milestone) => ({
              title: String(milestone?.title || '').trim() || `${baseTitle} Milestone`,
              date: String(milestone?.date || '').trim(),
              description: String(milestone?.description || '').trim(),
              source: 'subevent-milestone',
            }))
            .filter((item) => item.title || item.date || item.description)
        : [];

      return [
        {
          title: `${baseTitle} Starts`,
          date: String(subEvent?.startDate || '').trim(),
          description: String(subEvent?.description || '').trim(),
          source: 'subevent',
        },
        {
          title: `${baseTitle} Ends`,
          date: String(subEvent?.endDate || '').trim(),
          description: String(subEvent?.description || '').trim(),
          source: 'subevent',
        },
        ...milestones,
      ];
    }),
  ]
    .filter((item) => item.title || item.date || item.description)
    .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));

  const posterSource = firstRenderableImage([
    event.posterImage,
    event.showcaseImage,
    event.poster,
    event.coverImage,
    mediaBannerImage,
    mediaGalleryImage,
  ]);
  const venueLabel = event.location || event.venue || 'Venue to be announced';
  const eventTypeLabel = event.category || event.mode || 'Hackathon';

  const getMapUrls = (rawLink, fallbackLocation) => {
    const fallbackQuery = fallbackLocation?.trim();

    if (!rawLink?.trim()) {
      if (!fallbackQuery) return { openUrl: '', embedUrl: '' };
      const encoded = encodeURIComponent(fallbackQuery);
      return {
        openUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        embedUrl: `https://www.google.com/maps?q=${encoded}&output=embed`,
      };
    }

    const trimmed = rawLink.trim();
    const isHttp = /^https?:\/\//i.test(trimmed);

    if (!isHttp) {
      const encoded = encodeURIComponent(trimmed);
      return {
        openUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        embedUrl: `https://www.google.com/maps?q=${encoded}&output=embed`,
      };
    }

    if (/\/maps\/embed/i.test(trimmed)) {
      return { openUrl: trimmed, embedUrl: trimmed };
    }

    let queryFromUrl = '';
    try {
      const parsed = new URL(trimmed);
      const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('query');
      if (qParam) {
        queryFromUrl = qParam;
      } else {
        const placeMatch = parsed.pathname.match(/\/place\/([^/]+)/i);
        if (placeMatch?.[1]) {
          queryFromUrl = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
        }
      }
    } catch {
      queryFromUrl = '';
    }

    const finalQuery = queryFromUrl || fallbackQuery || trimmed;

    return {
      openUrl: trimmed,
      embedUrl: `https://www.google.com/maps?output=embed&q=${encodeURIComponent(finalQuery)}`,
    };
  };

  const { openUrl: mapsOpenUrl, embedUrl: mapsEmbedUrl } = getMapUrls(mapLink, venueLabel);

  const overviewTabContent = (
    <div className="event-detail__overview-shell animate-fade-in event-detail__tab-content-scroll">
      <article className="event-detail__panel event-detail__about event-detail__about--feature">
        <header className="event-detail__about-head">
          <div>
            <h2>About</h2>
            <h3>Mission Brief</h3>
          </div>
          <span className="event-detail__mode-pill">{event.mode}</span>
        </header>
        <p>{event.description}</p>
        {eventThemes.length > 0 ? (
          <div className="event-detail__tags">
            {eventThemes.map((tag) => (
              <Badge key={tag} variant="accent" size="md">{tag}</Badge>
            ))}
          </div>
        ) : null}
      </article>

      <section className="event-detail__overview-metrics">
        <article className="event-detail__metric-card"><p>Event Type</p><strong>{eventTypeLabel}</strong></article>
        <article className="event-detail__metric-card"><p>Mode</p><strong>{event.mode}</strong></article>
        <article className="event-detail__metric-card"><p>Team Size</p><strong>{event.teamSize ? `${event.teamSize.min}-${event.teamSize.max} members` : 'Solo'}</strong></article>
        <article className="event-detail__metric-card"><p>Location</p><strong>{venueLabel}</strong></article>
        <article className="event-detail__metric-card"><p>Deadline</p><strong>{formatDate(event.timeline.registrationEnd)}</strong></article>
        <article className="event-detail__metric-card"><p>Prize / Fee</p><strong>{event.paymentConfig?.type === 'paid' ? `${event.paymentConfig.currency} ${event.paymentConfig.amount}` : event.prize || 'Free'}</strong></article>
        <article className="event-detail__metric-card"><p>Registrations</p><strong>{event.registeredCount}</strong></article>
        <article className="event-detail__metric-card"><p>Views</p><strong>{viewsCount.toLocaleString()}</strong></article>
      </section>

      {(mapsEmbedUrl || timelineItems.length > 0 || problemStatements.length > 0 || customRules.length > 0) ? (
        <section className="event-detail__custom-content event-detail__panel">
          <div className="event-detail__custom-content-head">
            <div>
              <h2>Event Content</h2>
              <p>Everything the organizer has published for attendees.</p>
            </div>
          </div>

          {mapsEmbedUrl ? (
            <section className="event-detail__location-card">
              <header className="event-detail__location-head">
                <div>
                  <h3>Location</h3>
                  <p>{venueLabel}</p>
                  {event.venueAddress ? <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{event.venueAddress}</p> : null}
                  {event.venueInstructions ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>📋 {event.venueInstructions}</p> : null}
                </div>
                {mapsOpenUrl ? (
                  <a className="event-detail__map-link" href={mapsOpenUrl} target="_blank" rel="noreferrer">
                    <MapPin size={16} /> Maps
                  </a>
                ) : null}
              </header>
              <div className="event-detail__map-embed-wrap">
                <iframe
                  title={`${event.title} location`}
                  src={mapsEmbedUrl}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </section>
          ) : null}

          {sections.timeline !== false && timelineItems.length > 0 ? (
            <div className="event-detail__custom-group">
              <h3>Timeline</h3>
              <div className="event-detail__custom-list">
                {timelineItems.map((item, index) => (
                  <article key={`${item.title || 'timeline'}-${index}`} className="event-detail__custom-item">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{item.title || `Milestone ${index + 1}`}</strong>
                      <p>{item.date || item.time || item.description || 'Scheduled update'}</p>
                      {item.description ? <small>{item.description}</small> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {sections.problems !== false && problemStatements.length > 0 ? (
            <div className="event-detail__custom-group">
              <h3>Problem Statements</h3>
              <div className="event-detail__custom-list">
                {problemStatements.map((problem, index) => (
                  <article key={`${problem.psId || 'problem'}-${index}`} className="event-detail__custom-item event-detail__custom-item--stacked">
                    <span>{index + 1}</span>
                    <div>
                      <strong>{problem.psId || `PS-${String(index + 1).padStart(3, '0')}`}</strong>
                      <p>{problem.psDescription || 'Problem description not provided.'}</p>
                      <small>{problem.psStatement || 'Problem statement not provided.'}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {sections.rules !== false && customRules.length > 0 ? (
            <div className="event-detail__custom-group">
              <h3>Rules</h3>
              <ul className="event-detail__rule-list">
                {customRules.map((rule, index) => (
                  <li key={`${rule}-${index}`}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.eligibility ? (
            <div className="event-detail__custom-group">
              <h3>Eligibility</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{event.eligibility}</p>
            </div>
          ) : null}

          {event.participationGuidelines ? (
            <div className="event-detail__custom-group">
              <h3>Participation Guidelines</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{event.participationGuidelines}</p>
            </div>
          ) : null}

          {Array.isArray(event.judgingCriteria) && event.judgingCriteria.length > 0 ? (
            <div className="event-detail__custom-group">
              <h3>Judging Criteria</h3>
              <div className="event-detail__custom-list">
                {event.judgingCriteria.map((jc, index) => (
                  <article key={`jc-${index}`} className="event-detail__custom-item">
                    <span>{jc.weight ? `${jc.weight}%` : String(index + 1).padStart(2, '0')}</span>
                    <div><strong>{jc.criterion}</strong></div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {event.codeOfConduct ? (
            <div className="event-detail__custom-group">
              <h3>Code of Conduct</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{event.codeOfConduct}</p>
            </div>
          ) : null}

          {(event.internships || event.goodies || event.sponsorPerks) ? (
            <div className="event-detail__custom-group">
              <h3>Additional Benefits</h3>
              {event.internships ? <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>🎓 <strong>Internships:</strong> {event.internships}</p> : null}
              {event.goodies ? <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>🎁 <strong>Goodies:</strong> {event.goodies}</p> : null}
              {event.sponsorPerks ? <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>⭐ <strong>Sponsor Perks:</strong> {event.sponsorPerks}</p> : null}
            </div>
          ) : null}

          {Array.isArray(event.rounds) && event.rounds.length > 0 ? (
            <div className="event-detail__custom-group">
              <h3>Rounds & Workflow</h3>
              <div className="event-detail__custom-list">
                {event.rounds.map((round, index) => (
                  <article key={`round-${index}`} className="event-detail__custom-item">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{round.name}</strong>
                      {round.startDate ? <p>{formatDate(round.startDate)}{round.endDate ? ` — ${formatDate(round.endDate)}` : ''}</p> : null}
                      {round.submissionTypes?.length > 0 ? <small>Submissions: {round.submissionTypes.join(', ')}</small> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {((event.sponsors && event.sponsors.length > 0) || (event.partners && event.partners.length > 0)) ? (
            <div className="event-detail__custom-group" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
              {event.sponsors && event.sponsors.length > 0 ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ff6b00', marginBottom: '0.75rem' }}>Sponsors</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {event.sponsors.map((sponsor, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 500, color: '#ffb693' }}>
                        {sponsor}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {event.partners && event.partners.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ff6b00', marginBottom: '0.75rem' }}>Partners</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {event.partners.map((partner, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 500, color: '#e5eeff' }}>
                        {partner}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );

  const timelineTabContent = (
    <div className="event-detail__timeline animate-fade-in event-detail__tab-content-scroll">
      <div className="event-detail__panel">
        <h2>Schedule</h2>
        <p>Includes event milestones, sub-events, and timeline checkpoints like PPT submission.</p>
      </div>
      <div className="event-detail__custom-list">
        {scheduleItems.length > 0 ? scheduleItems.map((item, index) => (
          <article key={`${item.title}-${index}`} className="event-detail__custom-item">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{item.title || `Schedule ${index + 1}`}</strong>
              <p>{item.date ? formatDate(item.date) : 'Date to be announced'}</p>
              {item.description ? <small>{item.description}</small> : null}
            </div>
          </article>
        )) : <p>No organizer content has been added to this section yet.</p>}
      </div>
    </div>
  );

  const faqTabContent = (
    <div className="event-detail__faqs animate-fade-in event-detail__tab-content-scroll">
      {event.faqs?.length ? (
        event.faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${openFaq === i ? 'faq-item--open' : ''}`}>
            <button className="faq-item__question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{faq.q}</span>
              {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openFaq === i ? (
              <div className="faq-item__answer animate-fade-in-up">
                <p>{faq.a}</p>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="event-detail__panel"><p>No FAQs available yet.</p></div>
      )}
    </div>
  );

  const rulesTabContent = (
    <div className="event-detail__panel animate-fade-in event-detail__tab-content-scroll">
      <h2>Rules</h2>
      {sections.rules !== false && customRules.length > 0 ? (
        <ul className="event-detail__rule-list">
          {customRules.map((rule, index) => (
            <li key={`${rule}-${index}`}>{rule}</li>
          ))}
        </ul>
      ) : (
        <p>No organizer content has been added to this section yet.</p>
      )}
    </div>
  );

  const themesContent = (
    <div className="event-detail__panel animate-fade-in event-detail__tab-content-scroll">
      <h2>Themes</h2>
      <div className="event-detail__tags">
        {eventThemes.length > 0
          ? eventThemes.map((theme, index) => (
              <Badge key={`${theme}-${index}`} variant="accent" size="md">{theme}</Badge>
            ))
          : <p>No themes added yet.</p>}
      </div>
    </div>
  );

  const animatedTabs = [
    { title: 'Overview', value: 'overview', content: overviewTabContent },
    { title: 'Themes', value: 'themes', content: themesContent },
    { title: 'Schedule', value: 'schedule', content: timelineTabContent },
    { title: 'Rules', value: 'rules', content: rulesTabContent },
    { title: 'FAQ', value: 'faq', content: faqTabContent },
  ];

  const hasPrizesArray = Array.isArray(event.prizes) && event.prizes.length > 0;
  if (event.prize || hasPrizesArray) {
    animatedTabs.splice(2, 0, {
      title: 'Prizes & Rewards',
      value: 'prizes',
      content: (
        <section className="event-detail__panel event-detail__tab-content-scroll">
          <h2>Prize Pool</h2>
          {event.prize && !hasPrizesArray && <p>{event.prize}</p>}
          
          {hasPrizesArray && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {event.prizes.map((p, idx) => {
                 let iconColor = '#94a3b8'; // Default grey
                 if (idx === 0) iconColor = '#fbbf24'; // Gold
                 else if (idx === 1) iconColor = '#94a3b8'; // Silver
                 else if (idx === 2) iconColor = '#d97706'; // Bronze
                 
                 return (
                   <div key={idx} className="flex flex-col items-center justify-center p-8 rounded-2xl border hover:scale-105 transition-transform duration-300" style={{ background: '#f8fafc', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                        <Trophy size={28} style={{ color: iconColor }} />
                      </div>
                      <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">{p.rank}</h3>
                      <p className="text-xl font-extrabold text-slate-800 text-center">{p.reward}</p>
                   </div>
                 );
              })}
            </div>
          )}
        </section>
      ),
    });
  }

  if (Array.isArray(event.judges) && event.judges.length > 0 && sections.judges !== false) {
    animatedTabs.splice(event.prize ? 3 : 2, 0, {
      title: 'Judges',
      value: 'judges',
      content: (
        <section className="event-detail__panel event-detail__tab-content-scroll">
          <h2>Judges</h2>
          <div className="event-detail__custom-list">
            {event.judges.map((judge, index) => (
              <article key={`judge-${index}`} className="event-detail__custom-item">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{typeof judge === 'string' ? judge : judge.name}</h4>
                  {typeof judge !== 'string' && judge.title ? <p>{judge.title}{judge.organization ? ` — ${judge.organization}` : ''}</p> : null}
                  {typeof judge !== 'string' && judge.bio ? <small>{judge.bio}</small> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ),
    });
  }

  if (Array.isArray(event.mentors) && event.mentors.length > 0 && sections.mentors !== false) {
    animatedTabs.push({
      title: 'Mentors',
      value: 'mentors',
      content: (
        <section className="event-detail__panel event-detail__tab-content-scroll">
          <h2>Mentors</h2>
          <div className="event-detail__custom-list">
            {event.mentors.map((mentor, index) => (
              <article key={`mentor-${index}`} className="event-detail__custom-item">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{mentor.name}</h4>
                  {mentor.title ? <p>{mentor.title}{mentor.organization ? ` — ${mentor.organization}` : ''}</p> : null}
                  {mentor.bio ? <small>{mentor.bio}</small> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ),
    });
  }

  const handleRegister = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (currentRegistration) {
      if (canManageTeam) {
        openTeamEditor();
        return;
      }

      return;
    }

    openRegistrationModal();
  };

  const addInviteEmail = () => {
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) return;

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValid) {
      setInviteNotice({ type: 'error', message: 'Please enter a valid email before inviting.' });
      return;
    }

    if (String(user?.email || '').toLowerCase() === normalized) {
      setInviteNotice({ type: 'error', message: 'You are already part of this team.' });
      return;
    }

    if (teamMembers.some((member) => String(member || '').trim().toLowerCase() === normalized)) {
      setInviteNotice({ type: 'error', message: 'This member is already in your current team list.' });
      return;
    }

    if (inviteRows.some((entry) => entry.email === normalized)) {
      setInviteNotice({ type: 'error', message: 'This email is already added to your invite list.' });
      return;
    }

    const registeredUser = findRegisteredUserByEmail(normalized);
    setInviteRows((current) => [
      ...current,
      {
        email: normalized,
        isRegistered: Boolean(registeredUser),
        inviteSent: false,
        inviteId: '',
        joinUrl: '',
        mailtoUrl: '',
      },
    ]);
    setInviteEmail('');
    setInviteNotice(null);
  };

  const sendInvite = async (rowIndex) => {
    const target = inviteRows[rowIndex];
    if (!target) return;

    if (!regForm.teamName.trim()) {
      setInviteNotice({ type: 'error', message: 'Please add a team name before sending invitations.' });
      return;
    }

    const result = await createTeamInvitation({
      eventId: event.id,
      inviterId: user.id,
      inviterName: user.name,
      teamName: regForm.teamName,
      inviteeEmail: target.email,
    });

    if (!result.success) {
      setInviteNotice({ type: 'error', message: result.error || 'Unable to send invitation.' });
      return;
    }

    setInviteRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              inviteSent: true,
              inviteId: result.invite?.id || row.inviteId,
              joinUrl: result.joinUrl || row.joinUrl,
              mailtoUrl: result.mailtoUrl || row.mailtoUrl,
            }
          : row
      )
    );

    setInviteNotice({
      type: result.emailSent ? 'success' : 'error',
      message: result.emailSent
        ? `Invitation email sent to ${target.email}.`
        : result.emailError || `Invite prepared for ${target.email}. Use Open Email to send manually.`,
    });
  };

  const copyInviteLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setInviteNotice({ type: 'success', message: 'Join link copied to clipboard.' });
    } catch {
      setInviteNotice({ type: 'error', message: 'Unable to copy link. Please copy it manually.' });
    }
  };

  const removeInvite = (rowIndex) => {
    setInviteRows((current) => current.filter((_, index) => index !== rowIndex));
  };

  const removeTeamMember = (rowIndex) => {
    setTeamMembers((current) => current.filter((_, index) => index !== rowIndex));
  };

  const submitRegistration = async () => {
    if (currentRegistration && !isTeamEditMode) {
      setRegStatus({ success: false, error: 'You are already registered for this event.' });
      return;
    }

    // Custom validations
    if (event.requireSocialProfiles) {
      if (!regForm.linkedinUrl?.trim() || !regForm.githubUrl?.trim()) {
        setRegStatus({ success: false, error: 'LinkedIn and GitHub profiles are required for registration.' });
        return;
      }
    }
    if (event.enableDocUploads) {
      if (!regForm.resumeUrl?.trim()) {
        setRegStatus({ success: false, error: 'Resume / Document upload is required for registration.' });
        return;
      }
    }
    if (event.enableCustomFields) {
      if (!regForm.customField?.trim()) {
        setRegStatus({ success: false, error: 'Please answer the custom form fields before registering.' });
        return;
      }
    }
    if (event.requireConsent) {
      if (!regForm.consentAgreed) {
        setRegStatus({ success: false, error: 'You must agree to the consent checkbox to register.' });
        return;
      }
    }

    const leadLabel = getLeadLabel();
    const members = [
      leadLabel || user?.name || user?.email,
      ...(isTeamEditMode ? teamMembers : inviteRows.map((entry) => entry.email)),
    ].filter(Boolean);

    // Build base teamData
    const teamData = isTeamReg
      ? {
          participantType: regForm.participantType,
          teamName: regForm.teamName,
          teamLeadName: regForm.teamLeadName,
          members,
          teamSize: members.length,
        }
      : { participantType: regForm.participantType, members: [leadLabel || user.name] };

    // Inject waitlisted or pending approval status
    if (isWaitlistActive) {
      teamData.status = 'waitlisted';
    } else if (event.accessType === 'Invite' && event.inviteApprovals) {
      teamData.status = 'pending';
    } else {
      teamData.status = 'approved';
    }

    // Inject custom form fields
    if (event.requireSocialProfiles) {
      teamData.linkedinUrl = regForm.linkedinUrl;
      teamData.githubUrl = regForm.githubUrl;
    }
    if (event.enableDocUploads) {
      teamData.resumeUrl = regForm.resumeUrl;
    }
    if (event.enableCustomFields) {
      teamData.customField = regForm.customField;
    }
    teamData.consentAgreed = regForm.consentAgreed;

    if (isTeamReg) {
      if (!regForm.teamName.trim()) {
        setRegStatus({ success: false, error: 'Team name is required for this event.' });
        return;
      }

      if (!regForm.teamLeadName.trim()) {
        setRegStatus({ success: false, error: 'Team lead name is required for this event.' });
        return;
      }

      const totalMembers = teamData.members.length;
      if (hasValidTeamRange && (totalMembers < teamSizeMin || totalMembers > teamSizeMax)) {
        setRegStatus({
          success: false,
          error: `Team size must be between ${teamSizeMin} and ${teamSizeMax} members.`,
        });
        return;
      }
    }

    const result = isTeamEditMode && currentRegistration && canManageTeam
      ? await updateTeamRegistration({
          registrationId: currentRegistration.id,
          eventId: event.id,
          teamName: regForm.teamName,
          teamLeadName: regForm.teamLeadName,
          participantType: regForm.participantType,
          members: members.slice(1),
          removedMemberLabels: teamMembersBaseline.filter(
            (member) => !teamMembers.some((currentMember) => String(currentMember || '').trim().toLowerCase() === String(member || '').trim().toLowerCase())
          ),
        })
      : await registerForEvent(event.id, user.id, teamData, user);

    if (result?.suspended) {
      setShowRegModal(false);
      setShowSuspendedModal(true);
      setRegStatus(null);
      return;
    }

    setRegStatus(result);
    setInviteNotice(null);

    if (result.success) {
      setTimeout(() => {
        resetRegistrationModal();
      }, 1800);
    }
  };

  return (
    <div className="event-detail event-detail--fusion">
      <section className="event-detail__hero">
        <div className="event-detail__hero-inner">
          <Link to="/events" className="event-detail__back">
            <ArrowLeft size={18} /> Back to Arena
          </Link>

          <div className="event-detail__hero-shell">
            <div className="event-detail__hero-main">
              <div className="event-detail__hero-poster">
                {posterSource ? <img src={posterSource} alt={`${event.title} poster`} /> : <div className="event-detail__poster-fallback" />}
              </div>

               <div className="event-detail__hero-info">
                {event.logo && (
                  <img src={event.logo} alt={`${event.title} logo`} style={{ width: '64px', height: '64px', borderRadius: '12px', marginBottom: '0.75rem', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
                )}
                <h1 className="event-detail__title">{event.title}</h1>
                {event.tagline && (
                  <p className="event-detail__tagline" style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {event.tagline}
                  </p>
                )}
                <div className="event-detail__quick-pills">
                  <span>Type: {eventTypeLabel}</span>
                </div>
              </div>
            </div>

            <aside className="event-detail__hero-register">
              <p>Registration Pulse</p>
              <strong>{daysToClose < 0 ? 'Closed' : `${daysToClose} Days Left`}</strong>
              <small>Deadline: {formatDate(event.timeline.registrationEnd)}</small>
              <div className="event-detail__hero-register-progress">
                <div className="event-detail__progress-track">
                  <span style={{ width: `${registrationProgress}%` }} />
                </div>
                <em>{registrationProgress}% timeline complete</em>
              </div>
              <div className="event-detail__hero-register-foot">
                <span>{hoursLeft}h remaining</span>
                <span>{event.teamSize ? `${event.teamSize.min}-${event.teamSize.max} members` : 'Solo entry'}</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="container event-detail__workspace">
        <div className="event-detail__workspace-grid">
          <div className="event-detail__content event-detail__content--tabs">
            <Tabs
              tabs={animatedTabs}
              containerClassName="event-detail__tabs event-detail__tabs--inline event-detail__tabs--animated"
              tabClassName="event-detail__tab event-detail__tab--animated"
              activeTabClassName="event-detail__tab-active-bg"
              contentClassName="event-detail__tab-pane event-detail__tab-content-scroll"
            />
          </div>

        <aside className="event-detail__side-card">
          <div className="event-detail__side-noise-inner">
            <div className="event-detail__side-social">
              <button aria-label="share"><Share2 size={15} /></button>
              <button aria-label="community"><Users size={15} /></button>
              <button aria-label="site"><Globe size={15} /></button>
            </div>
            
            <div className="event-detail__side-organizer" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              {organiserDetails.logo ? (
                <img src={organiserDetails.logo} alt={`${organiserDetails.name} logo`} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.1)' }} />
              ) : (
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c3a 100%)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>
                  {String(organiserDetails.name || 'H').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hosted by</p>
                <strong style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 600 }}>{organiserDetails.name || 'HunchMate Host'}</strong>
              </div>
            </div>

            <h3>{event.title}</h3>
            <div className="event-detail__side-row">
              <span>Last Date</span>
              <strong>{formatDate(event.timeline.registrationEnd)}</strong>
            </div>
            <div className="event-detail__side-row">
              <span>Registration closes in</span>
              <strong>{daysToClose < 0 ? 'Closed' : `${daysToClose} days`}</strong>
            </div>
            <div className="event-detail__side-row">
              <span>Mode</span>
              <strong>{event.mode}</strong>
            </div>
            <div className="event-detail__side-row">
              <span>Access Type</span>
              <strong>{event.accessType === 'Invite' ? 'Invite Only' : 'Open Registration'}</strong>
            </div>
            <div className="event-detail__side-row">
              <span>Participation</span>
              <strong>
                {event.participationType === 'Individual'
                  ? 'Solo'
                  : event.participationType === 'Team'
                    ? `Team (${event.teamSize?.min || 1}-${event.teamSize?.max || 4})`
                    : event.participationType === 'Both'
                      ? 'Solo or Team'
                      : event.teamSize
                        ? `Team (${event.teamSize.min}-${event.teamSize.max})`
                        : 'Solo'}
              </strong>
            </div>
            <div className="event-detail__side-row">
              <span>Entry Fee</span>
              <strong>{event.fee && event.fee.trim() !== '' ? event.fee : 'Free'}</strong>
            </div>
            {(organizerContactEmail || organizerContactPhone) ? (
              <div className="event-detail__side-contact">
                <p>Contact Organizer</p>
                {organiserDetails.contactRole ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '-0.25rem' }}>{organiserDetails.contactRole}</p> : null}
                {organizerContactEmail ? (
                  <a href={`mailto:${organizerContactEmail}`} className="event-detail__side-contact-link">
                    <Mail size={14} /> {organizerContactEmail}
                  </a>
                ) : null}
                {organizerContactPhone ? (
                  <a href={`tel:${organizerContactPhone}`} className="event-detail__side-contact-link">
                    <Phone size={14} /> {organizerContactPhone}
                  </a>
                ) : null}
                {organiserDetails.linkedin ? (
                  <a href={organiserDetails.linkedin} target="_blank" rel="noreferrer" className="event-detail__side-contact-link">
                    🔗 LinkedIn
                  </a>
                ) : null}
                {organiserDetails.twitter ? (
                  <a href={organiserDetails.twitter} target="_blank" rel="noreferrer" className="event-detail__side-contact-link">
                    🔗 Twitter / X
                  </a>
                ) : null}
                {organiserDetails.website ? (
                  <a href={organiserDetails.website} target="_blank" rel="noreferrer" className="event-detail__side-contact-link">
                    🌐 Website
                  </a>
                ) : null}
              </div>
            ) : null}
            {event.accessType === 'Invite' && event.invitePrivateLinks && !hasInviteQuery ? (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                color: '#f87171',
                fontSize: '0.88rem',
                fontWeight: 500
              }}>
                Invite Only (Private Link Required)
              </div>
            ) : (
              <HoverBorderGradient
                as="button"
                onClick={handleRegister}
                disabled={Boolean(currentRegistration) && !canManageTeam}
                containerClassName="event-detail__register-gradient-btn"
                className="event-detail__register-gradient-btn-inner"
              >
                <span className="event-detail__register-gradient-content">
                  <Zap size={16} /> {currentRegistration
                    ? (canManageTeam ? 'Edit Team' : 'Already Registered')
                    : isWaitlistActive
                      ? 'Join Waitlist'
                      : event.accessType === 'Invite' && (event.inviteApprovals || event.inviteShortlist)
                        ? 'Apply for Invite'
                        : 'Register Now'}
                </span>
              </HoverBorderGradient>
            )}
          </div>
        </aside>
        </div>
      </section>

      <Modal
        isOpen={showRegModal}
        onClose={() => {
          setShowRegModal(false);
          setRegStatus(null);
          setInviteNotice(null);
          setInviteRows([]);
          setInviteEmail('');
          setRegForm({ teamName: '', participantType: 'student', teamLeadName: '' });
        }}
        title="Claim Your Spot"
        size="md"
      >
        {regStatus?.success ? (
          <div className="reg-success">
            <div className="reg-success__icon">OK</div>
            <h3>Registration Confirmed!</h3>
            <p>Your QR pass has been generated. Check your dashboard.</p>
            <p className="reg-success__token">Token: <code>{regStatus.registration.qrToken}</code></p>
          </div>
        ) : (
          <div className="reg-form">
            <div className="reg-form__event-head">
              <p className="reg-form__event">{event.title}</p>
              <span>{event.mode}</span>
            </div>

            <div className="reg-form__snapshot">
              <div>
                <span>Deadline</span>
                <strong>{formatDate(event.timeline.registrationEnd)}</strong>
              </div>
              <div>
                <span>Entry Type</span>
                <strong>{event.teamSize ? 'Team Registration' : 'Individual Registration'}</strong>
              </div>
            </div>

            {regStatus?.error ? <div className="reg-form__error">{regStatus.error}</div> : null}
            {inviteNotice?.message ? (
              <div className={inviteNotice.type === 'error' ? 'reg-form__error' : 'reg-form__success-note'}>
                {inviteNotice.message}
              </div>
            ) : null}

            {event.participationType === 'Both' && (
              <div className="reg-form__section">
                <p className="reg-form__section-title">Registration Mode</p>
                <div className="reg-form__button-group">
                  {['Individual', 'Team'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`reg-form__type-btn ${regForm.registrationType === mode ? 'reg-form__type-btn--active' : ''}`}
                      onClick={() => setRegForm({ ...regForm, registrationType: mode })}
                    >
                      {mode === 'Individual' ? 'Register as Individual' : 'Register as Team'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="reg-form__section">
              <p className="reg-form__section-title">What is your participation type?</p>
              <div className="reg-form__button-group">
                {['student', 'developer', 'working_professional'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`reg-form__type-btn ${regForm.participantType === type ? 'reg-form__type-btn--active' : ''}`}
                    onClick={() => setRegForm({ ...regForm, participantType: type })}
                  >
                    {type === 'student' ? 'Student' : type === 'developer' ? 'Developer' : 'Working Professional'}
                  </button>
                ))}
              </div>
            </div>

            {isTeamReg ? (
              <>
                <div className="reg-form__section">
                  <p className="reg-form__section-title">Team Details</p>
                  
                  <Input
                    label="Team Name"
                    placeholder="e.g. Neural Knights"
                    value={regForm.teamName}
                    onChange={(e) => setRegForm({ ...regForm, teamName: e.target.value })}
                  />

                  <Input
                    label="Team Lead Name"
                    placeholder="Enter team lead name"
                    value={regForm.teamLeadName}
                    onChange={(e) => setRegForm({ ...regForm, teamLeadName: e.target.value })}
                  />

                  <div className="reg-form__hint">
                    Team size is auto-calculated from the lead plus invited members.
                  </div>
                </div>

                <div className="reg-form__invite-box">
                  <p className="reg-form__invite-title">Team Members</p>
                  <p className="reg-form__invite-hint">
                    Only the team lead can add or remove teammates.
                  </p>

                  {teamMembers.length > 0 ? (
                    <div className="reg-form__invite-list">
                      {teamMembers.map((member, index) => (
                        <article key={`${member}-${index}`} className="reg-form__invite-row">
                          <div>
                            <strong>{member}</strong>
                            <p>Team member</p>
                          </div>
                          <div className="reg-form__invite-actions">
                            <button type="button" className="reg-form__invite-remove" onClick={() => removeTeamMember(index)}>
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="reg-form__invite-hint">No teammates added yet.</p>
                  )}

                  <p className="reg-form__invite-title">Add Team Members by Email</p>
                  <p className="reg-form__invite-hint">
                    Add teammate emails. Registered members can accept immediately. Others will be sent to login/signup from the invite link.
                  </p>

                  <div className="reg-form__invite-input-row">
                    <Input
                      label="Member Email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Button type="button" variant="secondary" icon={UserPlus} onClick={addInviteEmail}>Add</Button>
                  </div>

                  {inviteRows.length > 0 ? (
                    <div className="reg-form__invite-list">
                      {inviteRows.map((row, index) => (
                        <article key={row.email} className="reg-form__invite-row">
                          <div>
                            <strong>{row.email}</strong>
                            <p>{row.isRegistered ? 'Registered on Hunchmate' : 'Not registered yet'}</p>
                          </div>

                          <div className="reg-form__invite-actions">
                            {!row.inviteSent ? (
                              <Button type="button" size="sm" variant="primary" onClick={() => sendInvite(index)}>
                                Invite
                              </Button>
                            ) : (
                              <span className="reg-form__invite-sent"><CheckCircle2 size={14} /> Sent</span>
                            )}
                            {row.mailtoUrl ? (
                              <a className="reg-form__invite-link" href={row.mailtoUrl}>Open Email</a>
                            ) : null}
                            {row.joinUrl ? (
                              <button type="button" className="reg-form__invite-copy" onClick={() => copyInviteLink(row.joinUrl)}>
                                <Copy size={14} /> Copy Link
                              </button>
                            ) : null}
                            <button type="button" className="reg-form__invite-remove" onClick={() => removeInvite(index)}>
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {/* Custom Registration Fields */}
            {(event.requireSocialProfiles || event.enableDocUploads || event.enableCustomFields || event.requireConsent) && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <p className="reg-form__section-title" style={{ marginBottom: '0.25rem' }}>Additional Information</p>
                
                {event.requireSocialProfiles && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        label="LinkedIn Profile URL *"
                        placeholder="https://linkedin.com/in/username"
                        value={regForm.linkedinUrl || ''}
                        onChange={(e) => setRegForm({ ...regForm, linkedinUrl: e.target.value })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input
                        label="GitHub Profile URL *"
                        placeholder="https://github.com/username"
                        value={regForm.githubUrl || ''}
                        onChange={(e) => setRegForm({ ...regForm, githubUrl: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {event.enableDocUploads && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.36rem' }}>
                    <label className="input-label">Resume / Document URL *</label>
                    <Input
                      placeholder="https://example.com/resume.pdf"
                      value={regForm.resumeUrl || ''}
                      onChange={(e) => setRegForm({ ...regForm, resumeUrl: e.target.value })}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label className="create-event__upload-field" style={{ margin: 0, padding: '0.4rem 1rem', fontSize: '0.8rem', flex: 1 }}>
                        <span>Or upload PDF/Image</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1 * 1024 * 1024) {
                                alert('File must be 1MB or smaller.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setRegForm({ ...regForm, resumeUrl: String(reader.result || '') });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {regForm.resumeUrl && regForm.resumeUrl.startsWith('data:') && (
                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Uploaded successfully</span>
                      )}
                    </div>
                  </div>
                )}

                {event.enableCustomFields && (
                  <div>
                    <label className="input-label">Tell us why you want to join this program *</label>
                    <textarea
                      placeholder="Share your interest, background or expectations..."
                      value={regForm.customField || ''}
                      onChange={(e) => setRegForm({ ...regForm, customField: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.9rem',
                        color: '#fff',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {event.requireConsent && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Checkbox
                      id="eventdetail-consent"
                      checked={regForm.consentAgreed || false}
                      onChange={(e) => setRegForm({ ...regForm, consentAgreed: e.target.checked })}
                      label={<span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>I agree to the code of conduct, rules, and privacy policy of this program *</span>}
                    />
                  </div>
                )}
              </div>
            )}

            <Button variant="primary" size="lg" fullWidth onClick={submitRegistration} icon={Zap}>
              {isWaitlistActive ? 'Join Waitlist' : (event.accessType === 'Invite' && (event.inviteApprovals || event.inviteShortlist) ? 'Submit Request' : 'Confirm Registration')}
            </Button>

            <p className="reg-form__footnote">
              By registering, you agree to event rules and organizer policies.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showSuspendedModal}
        onClose={() => setShowSuspendedModal(false)}
        title="Account Suspended"
        size="sm"
      >
        <div className="reg-form">
          <div className="reg-form__error">
            Your account is suspended. You cannot register for events right now.
          </div>
          <p className="reg-form__footnote">
            Need help? Raise a complaint and track ticket progress from Help Center.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setShowSuspendedModal(false);
              navigate('/help-center');
            }}
          >
            Open Help Center
          </Button>
        </div>
      </Modal>
    </div>
  );
}
