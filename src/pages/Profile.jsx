import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  QrCode,
  Save,
  Settings2,
  Sparkles,
  UserCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import './Profile.css';

function buildForm(user) {
  return {
    name: user?.name || '',
    avatar: user?.avatar || '',
    avatarBackdrop: user?.avatarBackdrop || 'linear-gradient(135deg, #fed7aa 0%, #fb923c 50%, #f97316 100%)',
    institution: user?.institution || '',
    institutionName: user?.institutionName || user?.institution || '',
    organizationName: user?.organizationName || '',
    bio: user?.bio || '',
    profileType: user?.profileType || 'student',
    stream: user?.stream || '',
    graduationYear: user?.graduationYear || '',
    state: user?.state || '',
    city: user?.city || '',
    experience: user?.experience || '',
    techProficiency: user?.techProficiency || '',
    currentDesignation: user?.currentDesignation || '',
    workSummary: user?.workSummary || '',
    skills: Array.isArray(user?.skills) ? user.skills.join(', ') : '',
    linkedin: user?.socials?.linkedin || '',
    github: user?.socials?.github || '',
  };
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}

function getCoverStyle(value) {
  if (!value) return undefined;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return {
      backgroundImage: `url(${value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  return { background: value };
}

const PROFILE_ICON_MAP = {
  identity: UserCircle,
  email: FileText,
  location: FileText,
  joined: Activity,
  settings: Settings2,
  save: Save,
  about: FileText,
  education: GraduationCap,
  skills: Sparkles,
  links: Link2,
  highlights: Sparkles,
  activity: Activity,
  badges: Award,
};

function AnimatedMark({ name, size = 'xs', className = '' }) {
  const sizeMap = {
    xs: 20,
    sm: 28,
    md: 34,
  };

  const iconSize = sizeMap[size] || sizeMap.xs;
  const Icon = PROFILE_ICON_MAP[name] || PROFILE_ICON_MAP.identity;

  return (
    <span className={`profile-page__icon ${className}`.trim()} style={{ width: iconSize, height: iconSize }}>
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { events, getUserRegistrations, getUserCredentials, getEventById, syncParticipantDetailsInRegistrations } = useEvents();
  const dropdownRef = useRef(null);

  const [form, setForm] = useState(() => buildForm(user));
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [registeredEventsOpen, setRegisteredEventsOpen] = useState(false);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [selectedQrRegistration, setSelectedQrRegistration] = useState(null);

  useEffect(() => {
    setForm(buildForm(user));
  }, [user]);

  const registrations = useMemo(() => {
    if (!user) return [];
    return getUserRegistrations(user.id);
  }, [getUserRegistrations, user]);

  const credentials = useMemo(() => {
    if (!user) return [];
    return getUserCredentials(user.id);
  }, [getUserCredentials, user]);

  const hostedEvents = useMemo(() => {
    if (!user || user.role !== 'organizer') return [];
    return events.filter((event) => event.organizer?.id === user.id);
  }, [events, user]);

  const registeredEventItems = useMemo(() => {
    if (!registrations.length) return [];

    return registrations
      .map((registration) => {
        const event = getEventById(registration.eventId);
        if (!event) return null;

        return { registration, event };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.registration.createdAt) - new Date(a.registration.createdAt));
  }, [getEventById, registrations]);

  const selectedRegisteredItem = useMemo(() => {
    if (!selectedRegistrationId) return null;
    return registeredEventItems.find((item) => item.registration.id === selectedRegistrationId) || null;
  }, [registeredEventItems, selectedRegistrationId]);

  const attendedCount = registrations.filter((registration) => registration.checkedIn).length;
  const completion = useMemo(() => {
    const entityValue = user?.role === 'organizer' ? form.organizationName : (form.institutionName || form.institution);
    const checks = [
      form.name,
      form.bio,
      form.skills,
      entityValue,
      form.profileType,
      form.stream,
      form.graduationYear,
      form.state,
      form.city,
      form.linkedin,
      form.github,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, user]);

  const recentItems = useMemo(() => {
    const regItems = registrations.map((registration) => {
      const event = getEventById(registration.eventId);
      if (!event) return null;
      return {
        id: `reg-${registration.id}`,
        title: event.title,
        subtitle: registration.checkedIn ? 'Attended' : 'Registered',
        time: formatDate(registration.createdAt),
      };
    }).filter(Boolean);

    const credItems = credentials.map((credential) => {
      const event = getEventById(credential.eventId);
      return {
        id: `cred-${credential.id}`,
        title: event?.title || 'Event credential',
        subtitle: credential.type === 'winner' ? 'Winner credential' : 'Participation credential',
        time: formatDate(credential.issuedAt),
      };
    });

    return [...credItems, ...regItems]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 4);
  }, [credentials, getEventById, registrations]);

  const highlightCards = useMemo(() => {
    if (!user) return [];
    return [
      { key: 'registered-events', label: 'Registered Events', value: registrations.length, interactive: registrations.length > 0 },
      { key: 'attended', label: 'Attended', value: attendedCount, interactive: false },
      { key: 'credentials', label: 'Credentials', value: credentials.length, interactive: false },
      {
        key: 'saved-or-hosted',
        label: user.role === 'organizer' ? 'Hosted Events' : 'Saved Events',
        value: user.role === 'organizer' ? hostedEvents.length : registrations.length,
        interactive: false,
      },
    ];
  }, [attendedCount, credentials.length, hostedEvents.length, registrations, user]);

  useEffect(() => {
    if (!registeredEventsOpen) return;
    if (selectedRegistrationId) return;
    if (!registeredEventItems.length) return;
    setSelectedRegistrationId(registeredEventItems[0].registration.id);
  }, [registeredEventItems, registeredEventsOpen, selectedRegistrationId]);

  const closeRegisteredEventsModal = () => {
    setRegisteredEventsOpen(false);
    setSelectedRegistrationId('');
  };

  const closeQrModal = () => {
    setSelectedQrRegistration(null);
  };

  const openRegisteredEvents = () => {
    if (!registeredEventItems.length) return;
    setRegisteredEventsOpen(true);
    setSelectedRegistrationId((current) => current || registeredEventItems[0].registration.id);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;

    try {
      const updatedUser = await updateProfile({
        name: form.name,
        avatar: form.avatar,
        avatarBackdrop: form.avatarBackdrop,
        institution: form.institutionName || form.institution,
        institutionName: form.institutionName || form.institution,
        organizationName: form.organizationName,
        bio: form.bio,
        profileType: form.profileType,
        stream: form.stream,
        graduationYear: form.graduationYear,
        state: form.state,
        city: form.city,
        experience: form.profileType === 'working_professional' ? form.experience : '',
        techProficiency: form.profileType === 'working_professional' ? form.techProficiency : '',
        currentDesignation: form.profileType === 'working_professional' ? form.currentDesignation : '',
        workSummary: form.profileType === 'working_professional' ? form.workSummary : '',
        headline: form.profileType === 'working_professional' ? form.currentDesignation : '',
        skills: form.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        socials: {
          linkedin: form.linkedin,
          github: form.github,
          instagram: user.socials?.instagram || '',
        },
      });

      syncParticipantDetailsInRegistrations(user.id, updatedUser);

      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        setSettingsOpen(false);
      }, 900);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const toggleSettings = () => {
    setSettingsOpen((value) => !value);
    requestAnimationFrame(() => dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextAvatar = await readImageFile(file);
    setForm((current) => ({ ...current, avatar: nextAvatar }));
  };

  const handlePosterUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextBackdrop = await readImageFile(file);
    setForm((current) => ({ ...current, avatarBackdrop: nextBackdrop }));
  };

  if (!user) {
    return (
      <section className="profile-page profile-page--empty">
        <div className="container">
          <article className="profile-empty-state">
            <h1>Sign in to access your profile</h1>
            <p>Your account summary, education, skills, and activity will appear here.</p>
          </article>
        </div>
      </section>
    );
  }

  const entityLabel = user.role === 'organizer' ? 'Organization' : 'Institution';
  const entityValue = user.role === 'organizer' ? form.organizationName : (form.institutionName || form.institution);
  const roleLabel = user.role === 'organizer' ? 'Host' : 'Participant';
  const handleLabel = user.role === 'organizer' ? 'Event Host' : 'Student Profile';
  const joinedLabel = user.createdAt ? formatDate(user.createdAt) : 'Recently joined';

  return (
    <section className="profile-page">
      <div className="profile-page__backdrop" />
      <div className="container profile-page__shell">
        <header className="profile-page__hero-card">
          <div className="profile-page__cover" style={getCoverStyle(form.avatarBackdrop)} />

          <div className="profile-page__hero-panel">
            <div className="profile-page__hero-content">
              <div className="profile-page__avatar-wrap">
                <div className="profile-page__avatar" style={{ '--avatar-backdrop': form.avatarBackdrop }}>
                  {form.avatar ? <img src={form.avatar} alt={form.name || 'Profile avatar'} /> : <span>{form.name?.charAt(0) || 'U'}</span>}
                </div>
              </div>

              <div className="profile-page__hero-copy">
                <p className="profile-page__eyebrow">{handleLabel}</p>
                <h1>{form.name || 'Your profile'}</h1>
                <div className="profile-page__meta">
                  <span><i className="profile-page__dot" /> {user.email || 'Email not available'}</span>
                  <span><i className="profile-page__dot" /> {entityValue || 'Location not set'}</span>
                  <span><i className="profile-page__dot" /> {joinedLabel}</span>
                </div>
              </div>

              <div className="profile-page__hero-actions">
                <button className="profile-page__settings-btn" type="button" onClick={toggleSettings}>
                  <AnimatedMark name="settings" size="sm" /> Settings
                </button>
              </div>
            </div>
            </div>
        </header>

        {settingsOpen ? (
          <section ref={dropdownRef} className="profile-page__dropdown">
            <div className="profile-page__dropdown-header">
              <div>
                <p>Settings</p>
                <h2>Edit account details</h2>
              </div>
              <button className="profile-page__dropdown-close" type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="profile-page__settings-grid">
              <label>
                Full name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>

              <label>
                {entityLabel}
                <input
                  value={entityValue}
                  onChange={(event) => setForm({
                    ...form,
                    [user.role === 'organizer' ? 'organizationName' : 'institutionName']: event.target.value,
                  })}
                />
              </label>

              <label>
                Profile type
                <select
                  value={form.profileType}
                  onChange={(event) => setForm({ ...form, profileType: event.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="working_professional">Working Professional</option>
                </select>
              </label>

              <label>
                Stream
                <input value={form.stream} onChange={(event) => setForm({ ...form, stream: event.target.value })} />
              </label>

              <label>
                Graduation year
                <input value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: event.target.value })} />
              </label>

              <label>
                State
                <input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
              </label>

              <label>
                City
                <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </label>

              {form.profileType === 'working_professional' ? (
                <>
                  <label>
                    Experience
                    <input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
                  </label>

                  <label>
                    Tech proficiency
                    <input value={form.techProficiency} onChange={(event) => setForm({ ...form, techProficiency: event.target.value })} />
                  </label>

                  <label>
                    Current designation
                    <input value={form.currentDesignation} onChange={(event) => setForm({ ...form, currentDesignation: event.target.value })} />
                  </label>

                  <label className="profile-page__span-2">
                    Work summary
                    <textarea value={form.workSummary} onChange={(event) => setForm({ ...form, workSummary: event.target.value })} rows={3} />
                  </label>
                </>
              ) : null}

              <label>
                Profile image
                <input value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} placeholder="https://..." />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                <span className="profile-page__field-note">Best size: 512 x 512 px. JPG, PNG, or WebP works well.</span>
              </label>

              <label>
                Poster image
                <input
                  value={form.avatarBackdrop}
                  onChange={(event) => setForm({ ...form, avatarBackdrop: event.target.value })}
                  placeholder="https://..."
                />
                <input type="file" accept="image/*" onChange={handlePosterUpload} />
                <span className="profile-page__field-note">Best size: 1600 x 600 px. Use a wide landscape image for the cleanest fit.</span>
              </label>

              <label>
                Bio
                <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={3} />
              </label>

              <label className="profile-page__span-2">
                Skills
                <input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="React, UI/UX, Python" />
              </label>

              <label>
                LinkedIn
                <div className="profile-page__inline-field">
                  <AnimatedMark name="links" />
                  <input value={form.linkedin} onChange={(event) => setForm({ ...form, linkedin: event.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
              </label>

              <label>
                GitHub
                <div className="profile-page__inline-field">
                  <AnimatedMark name="links" />
                  <input value={form.github} onChange={(event) => setForm({ ...form, github: event.target.value })} placeholder="https://github.com/..." />
                </div>
              </label>

              <div className="profile-page__settings-actions profile-page__span-2">
                <button type="submit" className="profile-page__save-btn">
                  <AnimatedMark name="save" size="sm" /> Save profile
                </button>
                {saved ? <span className="profile-page__saved"><AnimatedMark name="save" size="xs" /> Saved</span> : null}
              </div>
            </form>
          </section>
        ) : null}

        <section className="profile-page__summary-row">
          <article className="profile-page__summary-card profile-page__summary-card--accent">
            <div>
              <p>Complete profile</p>
              <h3>{completion}% complete</h3>
              <span>Add your missing details to improve visibility.</span>
            </div>
            <div
              className="profile-page__summary-ring"
              style={{ '--progress': `${Math.max(0, Math.min(100, completion))}%` }}
            >
              {completion}%
            </div>
          </article>

          <article className="profile-page__summary-card">
            <p>Role</p>
            <h3>{roleLabel}</h3>
            <span>{handleLabel}</span>
          </article>

          <article className="profile-page__summary-card">
            <p>Recent activity</p>
            <h3>{recentItems.length}</h3>
            <span>Registrations and credentials</span>
          </article>
        </section>

        <div className="profile-page__grid">
          <main className="profile-page__main">
            <article className="profile-page__card">
              <div className="profile-page__card-head">
                <div>
                  <p>About</p>
                  <h2>Your profile at a glance</h2>
                </div>
                <AnimatedMark name="about" size="sm" />
              </div>
              <p className="profile-page__bio">{form.bio || 'No description added yet.'}</p>
              <div className="profile-page__info-list">
                <div>
                  <span><i className="profile-page__dot" /> {entityLabel}</span>
                  <strong>{entityValue || 'Not added yet'}</strong>
                </div>
                <div>
                  <span><i className="profile-page__dot" /> Profile type</span>
                  <strong>{form.profileType === 'working_professional' ? 'Working Professional' : 'Student'}</strong>
                </div>
                <div>
                  <span><i className="profile-page__dot" /> Email</span>
                  <strong>{user.email || 'Not available'}</strong>
                </div>
                <div>
                  <span><i className="profile-page__dot" /> Stream</span>
                  <strong>{form.stream || 'Not added yet'}</strong>
                </div>
                <div>
                  <span><i className="profile-page__dot" /> Graduation year</span>
                  <strong>{form.graduationYear || 'Not added yet'}</strong>
                </div>
                <div>
                  <span><i className="profile-page__dot" /> Location</span>
                  <strong>{[form.city, form.state].filter(Boolean).join(', ') || 'Not added yet'}</strong>
                </div>
                {form.profileType === 'working_professional' ? (
                  <>
                    <div>
                      <span><i className="profile-page__dot" /> Experience</span>
                      <strong>{form.experience || 'Not added yet'}</strong>
                    </div>
                    <div>
                      <span><i className="profile-page__dot" /> Tech proficiency</span>
                      <strong>{form.techProficiency || 'Not added yet'}</strong>
                    </div>
                    <div>
                      <span><i className="profile-page__dot" /> Designation</span>
                      <strong>{form.currentDesignation || 'Not added yet'}</strong>
                    </div>
                  </>
                ) : null}
              </div>
            </article>

            <article className="profile-page__card">
              <div className="profile-page__card-head">
                <div>
                  <p>Education</p>
                  <h2>Academic / work details</h2>
                </div>
                <AnimatedMark name="education" size="sm" />
              </div>
              <div className="profile-page__education">
                <div className="profile-page__education-badge">{form.name?.charAt(0) || 'U'}</div>
                <div>
                  <h3>{(form.institutionName || entityValue) || 'Add your institution'}</h3>
                  <p>{user.role === 'organizer' ? 'Event host profile' : 'Participant profile'} · {joinedLabel}</p>
                  <span>{user.role === 'organizer' ? 'Organizer account' : `${form.stream || 'Student'} · ${form.graduationYear || 'Year not added'}`}</span>
                </div>
              </div>
              {form.profileType === 'working_professional' ? (
                <p className="profile-page__empty-line">
                  {form.currentDesignation || 'Designation not added'} · {form.experience || 'Experience not added'}
                </p>
              ) : null}
              {form.profileType === 'working_professional' && form.workSummary ? (
                <p className="profile-page__bio">{form.workSummary}</p>
              ) : null}
            </article>

            <article className="profile-page__card">
              <div className="profile-page__card-head">
                <div>
                  <p>Skills</p>
                  <h2>What you work with</h2>
                </div>
                <AnimatedMark name="skills" size="sm" />
              </div>
              <div className="profile-page__chips">
                {form.skills
                  ? form.skills.split(',').map((skill) => skill.trim()).filter(Boolean).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))
                  : <p className="profile-page__empty-line">Add skills to show your strengths.</p>}
              </div>
            </article>

            <article className="profile-page__card">
              <div className="profile-page__card-head">
                <div>
                  <p>Social links</p>
                  <h2>Where people can find you</h2>
                </div>
                <AnimatedMark name="links" size="sm" />
              </div>
              <div className="profile-page__links">
                <a href={form.linkedin || '#'} onClick={(event) => !form.linkedin && event.preventDefault()}>
                  LinkedIn <span>{form.linkedin || 'Add link'}</span>
                </a>
                <a href={form.github || '#'} onClick={(event) => !form.github && event.preventDefault()}>
                  GitHub <span>{form.github || 'Add link'}</span>
                </a>
              </div>
            </article>
          </main>

          <aside className="profile-page__side">
            <article className="profile-page__card profile-page__card--dark">
              <div className="profile-page__card-head">
                <div>
                  <p>Highlights</p>
                  <h2>Quick stats</h2>
                </div>
                <AnimatedMark name="highlights" size="sm" />
              </div>
              <div className="profile-page__stats-grid">
                {highlightCards.map((item) => (
                  item.interactive ? (
                    <button
                      key={item.key}
                      type="button"
                      className="profile-page__stat-trigger"
                      onClick={openRegisteredEvents}
                    >
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </button>
                  ) : (
                    <div key={item.key}>
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </div>
                  )
                ))}
              </div>
            </article>

            <article className="profile-page__card profile-page__card--dark">
              <div className="profile-page__card-head">
                <div>
                  <p>Activity</p>
                  <h2>Recent updates</h2>
                </div>
                <AnimatedMark name="activity" size="sm" />
              </div>
              <div className="profile-page__activity-list">
                {recentItems.length === 0 ? (
                  <p className="profile-page__empty-line">No recent activity.</p>
                ) : recentItems.map((item) => (
                  <div key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                    <p>{item.time}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="profile-page__card profile-page__card--dark">
              <div className="profile-page__card-head">
                <div>
                  <p>Badges</p>
                  <h2>Verified progress</h2>
                </div>
                <AnimatedMark name="badges" size="sm" />
              </div>
              <div className="profile-page__badge-row">
                <span className={registrations.length ? 'is-on' : ''}>Registered</span>
                <span className={attendedCount ? 'is-on' : ''}>Attended</span>
                <span className={credentials.length ? 'is-on' : ''}>Credentials</span>
              </div>
            </article>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={registeredEventsOpen}
        onClose={closeRegisteredEventsModal}
        title="Registered Events"
        size="lg"
      >
        {registeredEventItems.length === 0 ? (
          <p className="profile-page__empty-line">No registered events yet.</p>
        ) : (
          <div className="profile-page__registered-events-modal">
            <div className="profile-page__registered-list">
              {registeredEventItems.map(({ registration, event }) => (
                <button
                  key={registration.id}
                  type="button"
                  className={`profile-page__registered-item ${selectedRegistrationId === registration.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedRegistrationId(registration.id)}
                >
                  <div>
                    <strong>{event.title}</strong>
                    <span>{registration.teamName || 'Individual registration'}</span>
                  </div>
                  <small>{formatDate(registration.createdAt)}</small>
                </button>
              ))}
            </div>

            {selectedRegisteredItem ? (
              <div className="profile-page__registered-options">
                <h4>{selectedRegisteredItem.event.title}</h4>
                <p>Choose an action for this registered event.</p>
                <div className="profile-page__registered-actions">
                  <Link
                    to={`/events/${selectedRegisteredItem.event.id}`}
                    className="profile-page__registered-link"
                    onClick={closeRegisteredEventsModal}
                  >
                    <ExternalLink size={15} /> View Event Page
                  </Link>
                  <button
                    type="button"
                    className="profile-page__registered-qr-btn"
                    onClick={() => setSelectedQrRegistration(selectedRegisteredItem.registration)}
                  >
                    <QrCode size={15} /> QR Pass
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedQrRegistration}
        onClose={closeQrModal}
        title="Event QR Pass"
        size="sm"
      >
        {selectedQrRegistration ? (
          <div className="profile-page__qr-modal">
            <div className="profile-page__qr-box">
              <QRCodeSVG
                value={selectedQrRegistration.qrToken}
                size={220}
                bgColor="#F8FAFC"
                fgColor="#9a3412"
                level="H"
              />
            </div>
            <p className="profile-page__qr-token">{selectedQrRegistration.qrToken}</p>
            <p className="profile-page__qr-hint">Show this QR while validating your entry.</p>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
