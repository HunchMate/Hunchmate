import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Bell,
  ArrowRight,
  Link2,
  Lock,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Settings2,
  User,
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
    avatarBackdrop: user?.avatarBackdrop || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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

const ROADMAP_POINTS = [
  { x: 14, y: 72 },
  { x: 31, y: 56 },
  { x: 49, y: 63 },
  { x: 67, y: 43 },
  { x: 84, y: 27 },
];

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { getUserRegistrations, getUserCredentials, getEventById, syncParticipantDetailsInRegistrations } = useEvents();

  const [form, setForm] = useState(() => buildForm(user));
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [eventFilter, setEventFilter] = useState('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [registeredEventsOpen, setRegisteredEventsOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [selectedQrRegistration, setSelectedQrRegistration] = useState(null);
  const [urlFields, setUrlFields] = useState(['', '']);

  useEffect(() => {
    setForm(buildForm(user));
    const linked = user?.socials?.linkedin || '';
    const git = user?.socials?.github || '';
    const extra = Array.isArray(user?.socials?.additionalUrls) ? user.socials.additionalUrls : [];
    const nextUrls = [linked, git, ...extra];
    setUrlFields(nextUrls.length ? nextUrls : ['', '']);
  }, [user]);

  const registrations = useMemo(() => {
    if (!user) return [];
    return getUserRegistrations(user.id);
  }, [getUserRegistrations, user]);

  const credentials = useMemo(() => {
    if (!user) return [];
    return getUserCredentials(user.id);
  }, [getUserCredentials, user]);

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

  const credentialItems = useMemo(() => {
    if (!credentials.length) return [];

    return credentials
      .map((credential) => {
        const event = getEventById(credential.eventId);
        return {
          ...credential,
          eventTitle: event?.title || 'Event credential',
        };
      })
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  }, [credentials, getEventById]);

  const filteredEventItems = useMemo(() => {
    if (eventFilter === 'attended') {
      return registeredEventItems.filter(({ registration }) => registration.checkedIn);
    }

    if (eventFilter === 'upcoming') {
      return registeredEventItems.filter(({ registration }) => !registration.checkedIn);
    }

    return registeredEventItems;
  }, [eventFilter, registeredEventItems]);

  const { profileCompletion, missingProfileFields } = useMemo(() => {
    const checks = [
      { label: 'Add full name', done: Boolean(String(form.name || '').trim()) },
      { label: 'Upload profile photo', done: Boolean(String(form.avatar || '').trim()) },
      { label: 'Add bio', done: Boolean(String(form.bio || '').trim()) },
      { label: 'Add location', done: Boolean(String(form.city || '').trim() && String(form.state || '').trim()) },
      { label: 'Add social links', done: Boolean(String(form.linkedin || '').trim() || String(form.github || '').trim()) },
      { label: 'Add skills', done: Boolean(String(form.skills || '').trim()) },
    ];

    const completed = checks.filter((item) => item.done).length;
    const completion = Math.round((completed / checks.length) * 100);

    return {
      profileCompletion: completion,
      missingProfileFields: checks.filter((item) => !item.done).map((item) => item.label),
    };
  }, [form.avatar, form.bio, form.city, form.github, form.linkedin, form.name, form.skills, form.state]);

  const achievementSummary = useMemo(() => {
    const checkedInCount = registrations.filter((item) => item.checkedIn).length;
    const winnerCredentials = credentials.filter((item) => item.type === 'winner').length;

    const allAchievements = [
      {
        id: 'first-registration',
        title: 'Getting Started',
        description: 'Registered for your first event.',
        xp: 5,
        requirement: 'Register 1 event',
        progress: Math.min(registrations.length, 1),
        target: 1,
        unlocked: registrations.length > 0,
      },
      {
        id: 'first-checkin',
        title: 'Event Explorer',
        description: 'Checked in to at least one event.',
        xp: 25,
        requirement: 'Check in at 1 event',
        progress: Math.min(checkedInCount, 1),
        target: 1,
        unlocked: checkedInCount > 0,
      },
      {
        id: 'credential-holder',
        title: 'Credential Collector',
        description: 'Earned your first event credential.',
        xp: 40,
        requirement: 'Earn 1 credential',
        progress: Math.min(credentials.length, 1),
        target: 1,
        unlocked: credentials.length > 0,
      },
      {
        id: 'winner-circle',
        title: 'Champion Circle',
        description: 'Won an event and received a winner credential.',
        xp: 70,
        requirement: 'Earn 1 winner credential',
        progress: Math.min(winnerCredentials, 1),
        target: 1,
        unlocked: winnerCredentials > 0,
      },
      {
        id: 'profile-complete',
        title: 'Profile Pro',
        description: 'Completed your profile details 100%.',
        xp: 20,
        requirement: 'Reach 100% profile completion',
        progress: profileCompletion,
        target: 100,
        unlocked: profileCompletion >= 100,
      },
    ];

    const unlocked = allAchievements.filter((item) => item.unlocked);
    const totalXp = unlocked.reduce((sum, item) => sum + item.xp, 0);
    const xpPerLevel = 140;
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const xpInLevel = totalXp % xpPerLevel;
    const nextLevelXp = xpPerLevel;

    const locked = allAchievements.filter((item) => !item.unlocked);
    const currentMilestoneIndex = allAchievements.findIndex((item) => !item.unlocked);

    return {
      level,
      totalXp,
      xpInLevel,
      nextLevelXp,
      badgesEarned: unlocked.length,
      all: allAchievements,
      lockedCount: locked.length,
      nextUnlock: locked[0] || null,
      currentMilestoneIndex: currentMilestoneIndex === -1 ? allAchievements.length - 1 : currentMilestoneIndex,
      recent: unlocked.slice(-3).reverse(),
    };
  }, [credentials, profileCompletion, registrations]);

  const selectedRegisteredItem = useMemo(() => {
    if (!selectedRegistrationId) return null;
    return registeredEventItems.find((item) => item.registration.id === selectedRegistrationId) || null;
  }, [registeredEventItems, selectedRegistrationId]);

  const selectedCredentialItem = useMemo(() => {
    if (!selectedCredentialId) return null;
    return credentialItems.find((item) => item.id === selectedCredentialId) || null;
  }, [credentialItems, selectedCredentialId]);

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

  const closeCredentialsModal = () => {
    setCredentialsOpen(false);
    setSelectedCredentialId('');
  };

  const closeAchievementsModal = () => {
    setAchievementsOpen(false);
  };

  const openCredentials = () => {
    setCredentialsOpen(true);
    setSelectedCredentialId((current) => current || credentialItems[0]?.id || '');
  };

  const openEvents = () => {
    setRegisteredEventsOpen(true);
    setSelectedRegistrationId((current) => current || registeredEventItems[0]?.registration?.id || '');
  };

  const handleDownloadCredential = (credential) => {
    if (!credential?.certificateImageUrl) return;
    const anchor = document.createElement('a');
    anchor.href = credential.certificateImageUrl;
    anchor.download = `${credential.id}.png`;
    anchor.click();
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
          linkedin: urlFields[0] || '',
          github: urlFields[1] || '',
          additionalUrls: urlFields.slice(2).map((item) => item.trim()).filter(Boolean),
          instagram: user.socials?.instagram || '',
        },
      });

      syncParticipantDetailsInRegistrations(user.id, updatedUser);

      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        navigate('/dashboard');
      }, 900);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
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

  const handleUrlChange = (index, value) => {
    setUrlFields((current) => current.map((item, idx) => (idx === index ? value : item)));
    if (index === 0) setForm((current) => ({ ...current, linkedin: value }));
    if (index === 1) setForm((current) => ({ ...current, github: value }));
  };

  const addUrlField = () => {
    setUrlFields((current) => [...current, '']);
  };

  const handleCopyProfileLink = async () => {
    try {
      const profileLink = `${window.location.origin}/dashboard`;
      await navigator.clipboard.writeText(profileLink);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1400);
    } catch (error) {
      console.error('Unable to copy profile link:', error);
    }
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

  const isSettingsPage = location.pathname === '/dashboard/settings' || location.pathname === '/profile/settings';

  const handleLabel = form.currentDesignation || (user.role === 'organizer' ? 'Event Host' : 'Project Manager');

  if (isSettingsPage) {
    return (
      <section className="profile-page profile-page--settings">
        <div className="profile-page__backdrop" />
        <div className="container profile-page__shell">
          <header className="profile-page__page-head">
            <div>
              <p className="profile-page__eyebrow">Account settings</p>
              <h1>Edit your profile</h1>
              <p>Control how you appear across HunchMate and keep your public profile polished.</p>
            </div>
            <button className="profile-page__btn-secondary" type="button" onClick={() => navigate('/dashboard')}>
              <ArrowRight size={16} /> Back to profile
            </button>
          </header>

          <div className="profile-page__settings-layout">
            <aside className="profile-page__settings-side">
              <button type="button" className="is-active"><User size={14} /> Profile</button>
              <button type="button"><Bell size={14} /> Notifications</button>
              <button type="button"><Lock size={14} /> Security</button>
            </aside>

            <form onSubmit={handleSave} className="profile-page__settings-card profile-page__panel-card">
              <div className="profile-page__settings-profile-row">
                <div className="profile-page__settings-avatar" style={{ '--avatar-backdrop': form.avatarBackdrop }}>
                  {form.avatar ? <img src={form.avatar} alt={form.name || 'Profile avatar'} /> : <span>{form.name?.charAt(0) || 'U'}</span>}
                </div>
                <div className="profile-page__settings-actions-stack">
                  <label className="profile-page__settings-upload-btn">
                    Upload image
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                  <label className="profile-page__settings-upload-btn">
                    Upload backdrop
                    <input type="file" accept="image/*" onChange={handlePosterUpload} />
                  </label>
                </div>
              </div>

              <div className="profile-page__settings-grid">
                <label>
                  Full name
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>

                <label>
                  Email
                  <select value={user.email || ''} disabled>
                    <option value={user.email || ''}>{user.email || 'Select a verified email to display'}</option>
                  </select>
                </label>

                <label className="profile-page__span-2">
                  Bio
                  <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} />
                </label>

                <label>
                  City
                  <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
                </label>

                <label>
                  State
                  <input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
                </label>

                <label>
                  Institution
                  <input value={form.institutionName} onChange={(event) => setForm({ ...form, institutionName: event.target.value })} />
                </label>

                <label>
                  Skills
                  <input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="React, UI Design, Product Strategy" />
                </label>

                <label className="profile-page__span-2">
                  Social URLs
                  <span className="profile-page__field-note">Add your public links for the profile surface.</span>
                </label>

                <div className="profile-page__settings-url-list profile-page__span-2">
                  {urlFields.map((url, index) => (
                    <input
                      key={`url-${index}`}
                      value={url}
                      onChange={(event) => handleUrlChange(index, event.target.value)}
                      placeholder={index === 0 ? 'https://linkedin.com/in/you' : index === 1 ? 'https://github.com/you' : 'https://example.com'}
                    />
                  ))}
                </div>
              </div>

              <div className="profile-page__settings-actions-row">
                <button type="button" className="profile-page__btn-secondary" onClick={addUrlField}>Add URL</button>
                <button type="submit" className="profile-page__settings-submit">Save changes</button>
                {saved ? <span className="profile-page__saved">Saved</span> : null}
                <button className="profile-page__dropdown-close" type="button" onClick={() => navigate('/dashboard')}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-page__backdrop" />
      <div className="container profile-page__shell">
        <header className="profile-page__hero-card">
          <div className="profile-page__hero-banner">
            <div className="profile-page__hero-avatar" style={{ '--avatar-backdrop': form.avatarBackdrop }}>
              {form.avatar ? <img src={form.avatar} alt={form.name || 'Profile avatar'} /> : <span>{form.name?.charAt(0) || 'U'}</span>}
            </div>
            <div className="profile-page__hero-copy">
              <p className="profile-page__eyebrow">Public profile</p>
              <h1>{form.name || 'Your profile'}</h1>
              <p>{handleLabel}</p>
              <div className="profile-page__hero-meta">
                <span><MapPin size={14} /> {[form.city, form.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                <span><Mail size={14} /> {user.email || 'No email set'}</span>
                <span><Award size={14} /> Level {achievementSummary.level}</span>
              </div>
            </div>
          </div>

          <div className="profile-page__hero-actions">
            <button className="profile-page__btn-secondary" type="button" onClick={handleCopyProfileLink}>
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Copied' : 'Copy profile link'}</span>
            </button>
            <button className="profile-page__btn-primary" type="button" onClick={() => navigate('/dashboard/settings')}>
              <Settings2 size={16} />
              <span>Edit profile</span>
            </button>
          </div>
        </header>

        <div className="profile-page__summary-row">
          <article className="profile-page__summary-card">
            <p>Profile completion</p>
            <h3>{profileCompletion}% complete</h3>
            <span>{missingProfileFields.length === 0 ? 'All essentials are complete' : `${missingProfileFields.length} items remain`}</span>
          </article>
          <article className="profile-page__summary-card">
            <p>Engagement</p>
            <h3>{registeredEventItems.length} event touchpoints</h3>
            <span>{registeredEventItems.filter(({ registration }) => registration.checkedIn).length} attended</span>
          </article>
          <article className="profile-page__summary-card profile-page__summary-card--accent">
            <div>
              <p>Reputation</p>
              <h3>{achievementSummary.badgesEarned} badges earned</h3>
              <span>{achievementSummary.totalXp} XP collected</span>
            </div>
            <div className="profile-page__summary-ring">{achievementSummary.level}</div>
          </article>
        </div>

        <div className="profile-page__content-grid">
          <main className="profile-page__primary-column">
            <section className="profile-page__card profile-page__profile-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Identity</p>
                  <h2>Profile overview</h2>
                </div>
                <User size={18} />
              </div>
              <div className="profile-page__profile-grid">
                <div className="profile-page__info-section">
                  <label>Email</label>
                  <p>{user.email || 'hello@example.com'}</p>
                </div>
                <div className="profile-page__info-section">
                  <label>Contact</label>
                  <p><Phone size={14} /> {user.phoneNumber || 'Not set'}</p>
                </div>
                <div className="profile-page__info-section">
                  <label>Location</label>
                  <p><MapPin size={14} /> {[form.city, form.state].filter(Boolean).join(', ') || 'Not set'}</p>
                </div>
                <div className="profile-page__info-section">
                  <label>Institution</label>
                  <p>{form.institutionName || 'Not set'}</p>
                </div>
              </div>

              <p className="profile-page__bio">{form.bio || 'Add a short bio so people understand your background, interests, and the kind of opportunities you want to explore.'}</p>

              <div className="profile-page__chip-list">
                {String(form.skills || '').trim()
                  ? form.skills.split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 5).map((skill) => <span key={skill} className="profile-page__chip">{skill}</span>)
                  : <span className="profile-page__chip">Add skills</span>}
              </div>
            </section>

            <section className="profile-page__card profile-page__activity-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Activity</p>
                  <h2>Events and participation</h2>
                </div>
                <Calendar size={18} />
              </div>

              <div className="profile-page__stats-mini">
                <div className="profile-page__stat-item">
                  <strong>{registeredEventItems.length}</strong>
                  <span>Registered</span>
                </div>
                <div className="profile-page__stat-item">
                  <strong>{registeredEventItems.filter(({ registration }) => registration.checkedIn).length}</strong>
                  <span>Attended</span>
                </div>
              </div>

              <div className="profile-page__event-filters">
                {['all', 'attended', 'upcoming'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`profile-page__filter-tag ${eventFilter === filter ? 'active' : ''}`}
                    onClick={() => setEventFilter(filter)}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              <div className="profile-page__event-list">
                {filteredEventItems.length === 0 ? (
                  <p className="profile-page__empty-state">No events in this category</p>
                ) : filteredEventItems.slice(0, 4).map(({ registration, event }) => (
                  <div key={registration.id} className="profile-page__event-item">
                    <div>
                      <strong>{event.title}</strong>
                      <span>{registration.teamName || 'Individual'}</span>
                    </div>
                    <span className={`profile-page__event-badge ${registration.checkedIn ? 'checked-in' : 'registered'}`}>
                      {registration.checkedIn ? 'Attended' : 'Registered'}
                    </span>
                  </div>
                ))}
              </div>

              <button type="button" className="profile-page__btn-tertiary" onClick={openEvents}>
                View all events
              </button>
            </section>

            <section className="profile-page__card profile-page__credentials-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Credentials</p>
                  <h2>Certificates and proof of work</h2>
                </div>
                <Download size={18} />
              </div>

              {credentialItems.length === 0 ? (
                <p className="profile-page__empty-state">Earn credentials by participating in events.</p>
              ) : (
                <div className="profile-page__credential-list">
                  {credentialItems.slice(0, 4).map((credential) => (
                    <div key={credential.id} className="profile-page__credential-item">
                      <div>
                        <strong>{credential.eventTitle}</strong>
                        <span>{credential.type === 'winner' ? 'Winner credential' : 'Participation credential'}</span>
                      </div>
                      <button
                        type="button"
                        className="profile-page__credential-action"
                        onClick={() => handleDownloadCredential(credential)}
                        title="Download credential"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="profile-page__btn-tertiary" onClick={openCredentials}>
                View all credentials
              </button>
            </section>
          </main>

          <aside className="profile-page__secondary-column">
            <section className="profile-page__card profile-page__insight-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Achievements</p>
                  <h2>Progress and recognition</h2>
                </div>
                <Award size={18} />
              </div>

              <div className="profile-page__achievement-summary">
                <div className="profile-page__achievement-stat">
                  <div className="profile-page__achievement-icon"><Award size={24} /></div>
                  <div>
                    <strong>Level {achievementSummary.level}</strong>
                    <span>{achievementSummary.totalXp} XP earned</span>
                  </div>
                </div>
              </div>

              <div className="profile-page__xp-bar">
                <div className="profile-page__xp-track">
                  <div className="profile-page__xp-fill" style={{ width: `${Math.round((achievementSummary.xpInLevel / achievementSummary.nextLevelXp) * 100)}%` }} />
                </div>
                <span>{achievementSummary.xpInLevel} / {achievementSummary.nextLevelXp} XP</span>
              </div>

              <div className="profile-page__badges">
                <p className="profile-page__badges-count">Badges: <strong>{achievementSummary.badgesEarned} / {achievementSummary.all.length}</strong></p>
                <div className="profile-page__badge-list">
                  {achievementSummary.all.slice(0, 5).map((item) => (
                    <div key={item.id} className={`profile-page__badge ${item.unlocked ? 'unlocked' : 'locked'}`} title={item.title}>
                      {item.unlocked ? <Check size={16} /> : <Lock size={16} />}
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" className="profile-page__btn-tertiary" onClick={() => setAchievementsOpen(true)}>
                View roadmap
              </button>
            </section>

            <section className="profile-page__card profile-page__links-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Connections</p>
                  <h2>Social and public links</h2>
                </div>
                <Link2 size={18} />
              </div>

              <div className="profile-page__social-list">
                {form.linkedin && (
                  <a href={form.linkedin} target="_blank" rel="noopener noreferrer" className="profile-page__social-link">
                    <span>LinkedIn</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {form.github && (
                  <a href={form.github} target="_blank" rel="noopener noreferrer" className="profile-page__social-link">
                    <span>GitHub</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {!form.linkedin && !form.github && (
                  <p className="profile-page__empty-state">Add social links in settings</p>
                )}
              </div>

              <button type="button" className="profile-page__btn-tertiary" onClick={() => navigate('/dashboard/settings')}>
                Edit social links
              </button>
            </section>

            <section className="profile-page__card profile-page__stats-card">
              <div className="profile-page__card-header">
                <div>
                  <p>Snapshot</p>
                  <h2>Quick stats</h2>
                </div>
                <Calendar size={18} />
              </div>

              <div className="profile-page__stats-grid">
                <div className="profile-page__stat">
                  <span>{registrations.filter((r) => r.checkedIn).length}</span>
                  <label>Events attended</label>
                </div>
                <div className="profile-page__stat">
                  <span>{credentials.filter((c) => c.type === 'winner').length}</span>
                  <label>Wins</label>
                </div>
                <div className="profile-page__stat">
                  <span>{profileCompletion}%</span>
                  <label>Profile complete</label>
                </div>
                <div className="profile-page__stat">
                  <span>{achievementSummary.badgesEarned}</span>
                  <label>Badges</label>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={registeredEventsOpen} onClose={closeRegisteredEventsModal} title="Registered Events" size="lg">
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

      <Modal isOpen={!!selectedQrRegistration} onClose={closeQrModal} title="Event QR Pass" size="sm">
        {selectedQrRegistration ? (
          <div className="profile-page__qr-modal">
            <div className="profile-page__qr-box">
              <QRCodeSVG
                value={selectedQrRegistration.qrToken}
                size={220}
                bgColor="#F8FAFC"
                fgColor="#111827"
                level="H"
              />
            </div>
            <p className="profile-page__qr-token">{selectedQrRegistration.qrToken}</p>
            <p className="profile-page__qr-hint">Show this QR while validating your entry.</p>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={credentialsOpen} onClose={closeCredentialsModal} title="My Certificates" size="lg">
        {credentialItems.length === 0 ? (
          <p className="profile-page__empty-line">No credentials issued yet.</p>
        ) : (
          <div className="profile-page__registered-events-modal">
            <div className="profile-page__registered-list">
              {credentialItems.map((credential) => (
                <button
                  key={credential.id}
                  type="button"
                  className={`profile-page__registered-item ${selectedCredentialId === credential.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedCredentialId(credential.id)}
                >
                  <div>
                    <strong>{credential.eventTitle}</strong>
                    <span>{credential.type === 'winner' ? 'Winner credential' : 'Participation credential'}</span>
                  </div>
                  <small>{formatDate(credential.issuedAt)}</small>
                </button>
              ))}
            </div>

            {selectedCredentialItem ? (
              <div className="profile-page__registered-options">
                <h4>{selectedCredentialItem.eventTitle}</h4>
                <p>View or download your credential.</p>
                <div className="profile-page__registered-actions">
                  {selectedCredentialItem.certificateImageUrl ? (
                    <a
                      href={selectedCredentialItem.certificateImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-page__registered-link"
                    >
                      <ExternalLink size={15} /> View Credential
                    </a>
                  ) : null}

                  <button
                    type="button"
                    className="profile-page__registered-qr-btn"
                    onClick={() => handleDownloadCredential(selectedCredentialItem)}
                    disabled={!selectedCredentialItem.certificateImageUrl}
                  >
                    <Download size={15} /> Download
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal isOpen={achievementsOpen} onClose={closeAchievementsModal} title="Achievements" size="lg">
        <div className="profile-page__achievements-modal">
          <div className="profile-page__achievements-summary">
            <div>
              <strong>Level {achievementSummary.level}</strong>
              <span>{achievementSummary.totalXp} XP total</span>
            </div>
            <div>
              <strong>{achievementSummary.badgesEarned}</strong>
              <span>Unlocked</span>
            </div>
            <div>
              <strong>{achievementSummary.lockedCount}</strong>
              <span>Locked</span>
            </div>
          </div>

          <div className="profile-page__achievement-progress">
            <div className="profile-page__progress-track">
              <div
                className="profile-page__progress-fill"
                style={{ width: `${Math.round((achievementSummary.xpInLevel / achievementSummary.nextLevelXp) * 100)}%` }}
              />
            </div>
            <span>{achievementSummary.xpInLevel} / {achievementSummary.nextLevelXp} XP to next level</span>
          </div>

          {achievementSummary.nextUnlock ? (
            <p className="profile-page__achievement-next">
              Next to unlock: <strong>{achievementSummary.nextUnlock.title}</strong>
            </p>
          ) : (
            <p className="profile-page__achievement-next">All available achievements unlocked.</p>
          )}

          <div className="profile-page__achievement-roadmap-modal">
            <h4>Roadmap Journey</h4>
            <div className="profile-page__roadmap-map profile-page__roadmap-map--full">
              <svg className="profile-page__roadmap-svg" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
                <path
                  className="profile-page__road-path"
                  d="M -40 220 C 120 90, 220 250, 360 160 C 500 65, 620 230, 760 130 C 900 35, 980 120, 1040 20"
                />
                <path
                  className="profile-page__road-center"
                  d="M -40 220 C 120 90, 220 250, 360 160 C 500 65, 620 230, 760 130 C 900 35, 980 120, 1040 20"
                />
              </svg>

            {achievementSummary.all.map((item, index) => {
              const state = item.unlocked
                ? 'is-unlocked'
                : index === achievementSummary.currentMilestoneIndex
                  ? 'is-current'
                  : 'is-locked';
              const point = ROADMAP_POINTS[index] || { x: 90, y: 20 };
              const placement = index % 2 === 0 ? 'is-bottom' : 'is-top';

              return (
                <div
                  key={item.id}
                  className={`profile-page__roadmap-pin ${state} ${placement}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <div className="profile-page__roadmap-dot">
                    {item.unlocked ? <Check size={14} /> : index === achievementSummary.currentMilestoneIndex ? <Award size={14} /> : <Lock size={14} />}
                  </div>
                  <div className="profile-page__roadmap-pin-line" />
                  <div className="profile-page__roadmap-label">
                    <strong>+{item.xp}</strong>
                    <span>{item.title}</span>
                    <small>{item.requirement} ({item.progress}/{item.target})</small>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
