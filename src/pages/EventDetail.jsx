import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { formatDate } from '../utils/helpers';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Tabs } from '../components/ui/tabs';
import { HoverBorderGradient } from '../components/ui/hover-border-gradient';
import './EventDetail.css';

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
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { getEventById, getEventRegistrationForUser, registerForEvent, updateTeamRegistration, createTeamInvitation } = useEvents();
  const { user, findRegisteredUserByEmail } = useAuth();

  const [showRegModal, setShowRegModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [regForm, setRegForm] = useState({
    teamName: '',
    participantType: 'student',
    teamLeadName: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRows, setInviteRows] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersBaseline, setTeamMembersBaseline] = useState([]);
  const [isTeamEditMode, setIsTeamEditMode] = useState(false);
  const [inviteNotice, setInviteNotice] = useState(null);
  const [regStatus, setRegStatus] = useState(null);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [now] = useState(() => Date.now());

  const event = getEventById(eventId);
  const currentRegistration = user ? getEventRegistrationForUser(eventId, user) : null;
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
    setRegForm({ teamName: '', participantType: 'student', teamLeadName: '' });
  };

  const openRegistrationModal = () => {
    setIsTeamEditMode(false);
    setRegStatus(null);
    setInviteNotice(null);
    setInviteRows([]);
    setTeamMembers([]);
    setTeamMembersBaseline([]);
    setInviteEmail('');
    setRegForm({ teamName: '', participantType: 'student', teamLeadName: '' });
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

  const viewsCount = Math.max(1200, Math.round((event.registeredCount || 0) * 4.6));
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
        <article className="event-detail__metric-card"><p>Prize / Fee</p><strong>{event.prize || 'Free'}</strong></article>
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

  if (event.prize) {
    animatedTabs.splice(2, 0, {
      title: 'Prizes',
      value: 'prizes',
      content: (
        <section className="event-detail__panel event-detail__tab-content-scroll">
          <h2>Prize Pool</h2>
          <p>{event.prize}</p>
        </section>
      ),
    });
  }

  if (Array.isArray(event.judges) && event.judges.length > 0) {
    animatedTabs.splice(event.prize ? 3 : 2, 0, {
      title: 'Judges',
      value: 'judges',
      content: (
        <section className="event-detail__panel event-detail__tab-content-scroll">
          <h2>Judges</h2>
          <div className="event-detail__custom-list">
            {event.judges.map((judge, index) => (
              <article key={`${judge}-${index}`} className="event-detail__custom-item">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{judge}</h4>
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

    const leadLabel = getLeadLabel();
    const members = [
      leadLabel || user?.name || user?.email,
      ...(isTeamEditMode ? teamMembers : inviteRows.map((entry) => entry.email)),
    ].filter(Boolean);

    const teamData = event.teamSize && regForm.participantType !== 'student'
      ? {
          participantType: regForm.participantType,
          teamName: regForm.teamName,
          teamLeadName: regForm.teamLeadName,
          members,
          // Team size is derived from actual members instead of manual user input.
          teamSize: members.length,
        }
      : { participantType: regForm.participantType, members: [leadLabel || user.name] };

    if (event.teamSize && regForm.participantType !== 'student') {
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
                <h1 className="event-detail__title">{event.title}</h1>
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
              <span>Team Size</span>
              <strong>{event.teamSize ? `${event.teamSize.min}-${event.teamSize.max}` : 'Solo'}</strong>
            </div>
            <div className="event-detail__side-row">
              <span>Fee / Prize</span>
              <strong>{event.prize || 'Free'}</strong>
            </div>
            {(organizerContactEmail || organizerContactPhone) ? (
              <div className="event-detail__side-contact">
                <p>Contact Organizer</p>
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
              </div>
            ) : null}
            <HoverBorderGradient
              as="button"
              onClick={handleRegister}
              disabled={Boolean(currentRegistration) && !canManageTeam}
              containerClassName="event-detail__register-gradient-btn"
              className="event-detail__register-gradient-btn-inner"
            >
              <span className="event-detail__register-gradient-content">
                <Zap size={16} /> {currentRegistration ? (canManageTeam ? 'Edit Team' : 'Already Registered') : 'Register Now'}
              </span>
            </HoverBorderGradient>
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

            {event.teamSize && regForm.participantType !== 'student' ? (
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

            <Button variant="primary" size="lg" fullWidth onClick={submitRegistration} icon={Zap}>
              Confirm Registration
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
