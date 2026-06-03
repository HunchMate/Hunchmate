'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from '@/utils/router';
import {
  Award,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
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
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { buildEventDetailPath, formatDate } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';
import '@/vite-pages/Profile.css';

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
    skills: Array.isArray(user?.skills) ? user.skills : [],
    linkedin: user?.socials?.linkedin || '',
    github: user?.socials?.github || '',
    interests: Array.isArray(user?.socials?.interests) ? user.socials.interests : [],
    phoneNumber: user?.phoneNumber || '',
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
        phoneNumber: form.phoneNumber,
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
        skills: Array.isArray(form.skills) ? form.skills.map((item) => item.trim()).filter(Boolean) : [],
        socials: {
          linkedin: urlFields[0] || '',
          github: urlFields[1] || '',
          additionalUrls: urlFields.slice(2).map((item) => item.trim()).filter(Boolean),
          instagram: user.socials?.instagram || '',
          interests: Array.isArray(form.interests) ? form.interests : [],
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

  const handleLabel = form.currentDesignation || (user.role === 'organizer' ? 'Event Host' : '');

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

                <label>
                  Phone number
                  <input
                    value={form.phoneNumber}
                    onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                    placeholder="+91 9876543210"
                    type="tel"
                  />
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
    <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');`}</style>
    <div className="bg-[#EEF0F8] font-['DM_Sans',sans-serif] w-full min-h-[100vh] pb-20 md:pb-0 pt-28">
    <div className="flex min-h-screen">

    <main className="flex-1">
      {/* Top Nav Mobile */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" data-icon="bolt">bolt</span>
          <span className="font-headline text-lg font-black tracking-tight">HUNCHMATE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-500">notifications</span>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">{form.name?.charAt(0) || 'U'}</div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Hero Identity Section */}
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6 relative">
          {/* Avatar with status indicator */}
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl md:text-5xl font-bold shadow-lg border-4 border-white">
              {form.avatar ? <img src={form.avatar} alt={form.name || 'Profile avatar'} className="w-full h-full object-cover rounded-full" /> : (form.name?.charAt(0) || 'U')}
              <div className="absolute bottom-1 right-1 w-6 h-6 md:w-8 md:h-8 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <h1 className="text-3xl font-black text-gray-900">{form.name || 'Your profile'}</h1>
              </div>
              {handleLabel && <p className="text-gray-500 font-medium">{handleLabel}</p>}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-500 text-lg">location_on</span>
                <span>{[form.city, form.state].filter(Boolean).join(', ') || 'Location not set'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-500 text-lg">school</span>
                <span>{form.institutionName || 'Institution not set'}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              {user.phoneNumber && (
                <a className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors" href={`tel:${user.phoneNumber}`}>
                  <span className="material-symbols-outlined text-lg">call</span>
                  <span>{user.phoneNumber}</span>
                </a>
              )}
              <a className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors" href={`mailto:${user.email}`}>
                <span className="material-symbols-outlined text-lg">mail</span>
                <span>{user.email || 'No email set'}</span>
              </a>
              {form.github && (
                <a className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors" href={form.github} target="_blank" rel="noreferrer">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                  <span>{form.github.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
              {form.linkedin && (
                <a className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors" href={form.linkedin} target="_blank" rel="noreferrer">
                  <svg className="w-5 h-5" fill="#0077b5" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                  <span>{form.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:absolute top-8 right-8">
            <button onClick={() => navigate('/dashboard/settings')} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md">
              <span className="material-symbols-outlined text-lg">edit</span>
              <span>Edit Profile</span>
            </button>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* About & Skills Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <span className="material-symbols-outlined">person</span>
                <h2 className="text-xl font-black text-gray-900">About Me</h2>
              </div>
              <p className="text-gray-600 leading-relaxed font-medium">
                {form.bio || 'Add a short bio so people understand your background, interests, and the kind of opportunities you want to explore.'}
              </p>
              {Array.isArray(form.interests) && form.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.interests.map((interest, idx) => {
                    const isOrange = interest.toLowerCase() === 'open source';
                    return (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 font-bold text-xs rounded-lg ${
                          isOrange
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {interest}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Skills Section */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <span className="material-symbols-outlined">code</span>
                  <h2 className="text-xl font-black text-gray-900">Skills</h2>
                </div>
                <div className="flex items-center gap-3"><button className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"></button><button className="text-indigo-600 font-bold text-xs hover:underline">View all</button></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(form.skills) && form.skills.length > 0 ? (
                  form.skills.map((skill, index) => (
                    <span key={index} className="px-4 py-2 border border-gray-100 bg-gray-50 text-gray-700 font-bold text-xs rounded-xl">{skill}</span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No skills added yet.</span>
                )}
              </div>
            </section>

            {/* My Events Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <span className="material-symbols-outlined">event</span>
                  <h2 className="text-xl font-black text-gray-900">My Events</h2>
                </div>
                <button onClick={openEvents} className="flex items-center gap-1 text-indigo-600 font-bold text-xs hover:underline">
                  View all events <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
              <div className="flex gap-4 border-b border-gray-200 overflow-x-auto hide-scrollbar">
                {['registered', 'upcoming', 'completed', 'saved'].map((filter) => {
                  const mappedFilter = filter === 'registered' ? 'all' : filter === 'completed' ? 'attended' : filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${eventFilter === mappedFilter ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
                      onClick={() => setEventFilter(mappedFilter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredEventItems.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No events found in this category.</p>
                ) : (
                  filteredEventItems.slice(0, 3).map(({ registration, event }) => {
                    const posterImage = event.showcaseImage || event.posterImage || 'https://via.placeholder.com/400x200?text=Event+Banner';
                    return (
                      <div key={registration.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(buildEventDetailPath(event))}>
                        <div className="h-32 bg-gray-200 relative overflow-hidden">
                          <img alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={posterImage} />
                          <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            {registration.checkedIn ? 'Completed' : 'Registered'}
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-black text-gray-900 truncate">{event.title}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{event.category || 'Event'}</p>
                          </div>
                          <div className="space-y-1.5 text-[11px] font-bold text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-indigo-500">location_on</span>
                              <span>{event.location || event.mode || 'Online'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-indigo-500">calendar_month</span>
                              <span>{formatDate(event.timeline?.eventStart || event.startDate)}</span>
                            </div>
                            <p className="text-gray-400">Hosted by <span className="text-indigo-600">{event.organizerName || event.hostName || 'Hunchmate'}</span></p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <button className="text-indigo-600 font-black text-xs">View Details</button>
                            <span className="material-symbols-outlined text-indigo-600 text-sm">arrow_forward</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Column (Social & Certs) */}
          <div className="space-y-6">
            {/* Social Links */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <span className="material-symbols-outlined">link</span>
                <h2 className="text-xl font-black text-gray-900">Social Links</h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <a className="flex flex-col items-center gap-2 group" href={form.github || '#'} target="_blank" rel="noreferrer">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Github</span>
                </a>
                <a className="flex flex-col items-center gap-2 group" href={form.linkedin || '#'} target="_blank" rel="noreferrer">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#0077b5] group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">LinkedIn</span>
                </a>
                <a className="flex flex-col items-center gap-2 group" href={urlFields[2] || '#'} target="_blank" rel="noreferrer">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <span className="material-symbols-outlined">language</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Portfolio</span>
                </a>
                <a className="flex flex-col items-center gap-2 group" href={urlFields[3] || '#'} target="_blank" rel="noreferrer">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Twitter</span>
                </a>
              </div>
            </section>

            {/* Certificates (List View like reference) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600"><span className="material-symbols-outlined">workspace_premium</span><h2 className="text-xl font-black text-gray-900">Credentials</h2></div>
                <div className="flex items-center gap-3"><button className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"><span className="material-symbols-outlined text-lg">search</span></button><button onClick={openCredentials} className="text-indigo-600 font-bold text-xs hover:underline">View all</button></div>
              </div>
              <div className="space-y-4">
                {credentialItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No credentials earned yet.</p>
                ) : (
                  credentialItems.slice(0, 3).map((credential) => (
                    <div key={credential.id} className="flex items-center gap-4">
                      <div className={`w-12 h-10 ${credential.type === 'winner' ? 'bg-orange-50 border border-orange-100' : 'bg-indigo-900'} rounded-md flex items-center justify-center overflow-hidden flex-shrink-0`}>
                        <span className={`text-[6px] ${credential.type === 'winner' ? 'text-orange-800 font-black' : 'text-white font-bold'} text-center leading-tight uppercase`}>
                          {credential.eventTitle}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{credential.eventTitle}</p>
                        <p className="text-[10px] text-gray-500">Issued on {formatDate(credential.issuedAt)}</p>
                      </div>
                      <button onClick={() => handleDownloadCredential(credential)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">download</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button onClick={openCredentials} className="w-full py-3 bg-gray-50 text-indigo-600 font-black text-xs rounded-xl hover:bg-gray-100 transition-colors">View All Credentials</button>
            </section>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <section className="bg-indigo-50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border border-indigo-100/50">
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm rotate-12">
              <span className="material-symbols-outlined text-4xl material-symbols-fill">emoji_events</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">Ready to participate in your next big event?</h3>
              <p className="text-gray-500 text-sm font-medium">Explore hackathons, workshops, and tech events happening around you.</p>
            </div>
          </div>
          <button onClick={() => navigate('/events')} className="z-10 flex items-center gap-2 bg-indigo-600 text-white font-black px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg group">
            <span>Explore Events</span>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          {/* Decorative Circle */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-200/20 rounded-full"></div>
        </section>
      </div>

      {/* Footer / Spacing */}
      <div className="h-20 md:h-8"></div>
    </main>
    </div>

    {/* Mobile Bottom Nav */}
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 flex items-center justify-around h-16 px-4">
      <Link to="/events" className="flex flex-col items-center gap-1 text-gray-400">
        <span className="material-symbols-outlined text-2xl">calendar_today</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">Events</span>
      </Link>
      <Link to="/events" className="flex flex-col items-center gap-1 text-gray-400">
        <span className="material-symbols-outlined text-2xl">code</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">Hacks</span>
      </Link>
      <button className="flex flex-col items-center gap-1 text-gray-400">
        <span className="material-symbols-outlined text-2xl">groups</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">Teams</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-indigo-600">
        <span className="material-symbols-outlined text-2xl material-symbols-fill">person</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
      </button>
    </nav>
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
                    to={buildEventDetailPath(selectedRegisteredItem.event)}
                    className="profile-page__registered-link"
                    onClick={closeRegisteredEventsModal}
                  >
                    <ExternalLink size={15} /> View Event Page
                  </Link>
                  {(() => {
                    const eventEnd = selectedRegisteredItem.event.timeline?.eventEnd || selectedRegisteredItem.event.endDate || selectedRegisteredItem.event.timeline?.eventStart || selectedRegisteredItem.event.startDate;
                    const isCompleted = eventEnd ? new Date(eventEnd) < new Date() : false;
                    
                    if (isCompleted) {
                      return (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 font-bold text-xs rounded-xl border border-green-100">
                          <Check size={15} /> Event Completed
                        </div>
                      );
                    }
                    
                    return (
                      <button
                        type="button"
                        className="profile-page__registered-qr-btn"
                        onClick={() => setSelectedQrRegistration(selectedRegisteredItem.registration)}
                      >
                        <QrCode size={15} /> View Ticket (QR)
                      </button>
                    );
                  })()}
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
    </>
  );
}
