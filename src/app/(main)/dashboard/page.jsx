'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from '@/utils/router';
import {
  Download,
  Edit3,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  QrCode,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { motion } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { buildEventDetailPath, formatDate } from '@/utils/helpers';
import '@/vite-pages/Profile.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

function buildForm(user) {
  return {
    name: user?.name || '',
    avatar: user?.avatar || '',
    avatarBackdrop: user?.avatarBackdrop || 'linear-gradient(135deg, #2559bd 0%, #ea7a32 100%)',
    institutionName: user?.institutionName || user?.institution || '',
    bio: user?.bio || '',
    profileType: user?.profileType || 'student',
    stream: user?.stream || '',
    graduationYear: user?.graduationYear || '',
    state: user?.state || '',
    city: user?.city || '',
    experience: user?.experience || '',
    currentDesignation: user?.currentDesignation || '',
    skills: Array.isArray(user?.skills) ? user.skills : [],
    linkedin: user?.socials?.linkedin || user?.linkedinUrl || '',
    github: user?.socials?.github || user?.githubUrl || '',
    interests: Array.isArray(user?.socials?.interests) ? user.socials.interests : [],
    phoneNumber: user?.phoneNumber || '',
    degree: user?.degree || '',
    branch: user?.branch || '',
    resumeUrl: user?.resumeUrl || '',
    startupName: user?.startupName || '',
    industry: user?.industry || '',
    startupStage: user?.startupStage || '',
    startupWebsite: user?.startupWebsite || '',
    startupDescription: user?.startupDescription || '',
    portfolioUrl: user?.portfolioUrl || '',
    company: user?.company || '',
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

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { getUserRegistrations, getEventById, syncParticipantDetailsInRegistrations } = useEvents();

  const [form, setForm] = useState(() => buildForm(user));
  const [saved, setSaved] = useState(false);
  const [urlFields, setUrlFields] = useState(['', '']);
  // selectedEventItem = { registration, event } | null
  const [selectedEventItem, setSelectedEventItem] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [selectedQrRegOnly, setSelectedQrRegOnly] = useState(null);

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
        bio: form.bio,
        profileType: form.profileType,
        stream: form.branch || form.stream,
        branch: form.branch,
        graduationYear: form.graduationYear,
        degree: form.degree,
        state: form.state,
        city: form.city,
        experience: form.experience,
        currentDesignation: form.currentDesignation,
        skills: Array.isArray(form.skills) ? form.skills.map((item) => item.trim()).filter(Boolean) : [],
        linkedinUrl: form.linkedinUrl || form.linkedin || '',
        githubUrl: form.githubUrl || form.github || '',
        resumeUrl: form.resumeUrl,
        startupName: form.startupName,
        industry: form.industry,
        startupStage: form.startupStage,
        startupWebsite: form.startupWebsite,
        startupDescription: form.startupDescription,
        portfolioUrl: form.portfolioUrl,
        company: form.company,
        socials: {
          linkedin: form.linkedinUrl || form.linkedin || urlFields[0] || '',
          github: form.githubUrl || form.github || urlFields[1] || '',
          additionalUrls: urlFields.slice(2).map((item) => item.trim()).filter(Boolean),
          interests: Array.isArray(form.interests) ? form.interests : [],
        },
      });

      syncParticipantDetailsInRegistrations(user.id, updatedUser);

      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        navigate('/dashboard');
      }, 1500);
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

  if (!user) {
    return (
      <section className="profile-page">
        <div className="profile-page__shell">
          <h2>Please sign in to view your profile.</h2>
        </div>
      </section>
    );
  }

  const isSettingsPage = location.pathname === '/dashboard/settings' || location.pathname === '/profile/settings';

  if (isSettingsPage) {
    return (
      <section className="profile-page">
        <div className="profile-page__shell">
          <motion.div 
            className="profile-page__glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="profile-page__card-header">
              <div className="profile-page__card-title">
                <h2>Edit Profile</h2>
              </div>
            </div>

            <form onSubmit={handleSave} className="profile-page__form-container">
              
              <div className="profile-page__avatar-edit">
                <div className="profile-page__avatar-preview" style={{ '--avatar-backdrop': form.avatarBackdrop }}>
                  {form.avatar ? <img src={form.avatar} alt="Avatar" /> : (form.name?.charAt(0) || 'U')}
                </div>
                <div className="profile-page__upload-actions">
                  <label className="profile-page__upload-btn">
                    Update Avatar
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                  <label className="profile-page__upload-btn">
                    Update Banner
                    <input type="file" accept="image/*" onChange={handlePosterUpload} />
                  </label>
                </div>
              </div>

              <div className="profile-page__settings-grid">
                <label className="profile-page__field">
                  <span>Full Name</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>

                <label className="profile-page__field">
                  <span>Phone Number</span>
                  <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                </label>

                <label className="profile-page__field">
                  <span>City</span>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </label>

                <label className="profile-page__field">
                  <span>State</span>
                  <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </label>

                <label className="profile-page__field full-width">
                  <span>Bio</span>
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </label>

                <label className="profile-page__field full-width">
                  <span>Skills (comma separated)</span>
                  <input 
                    value={Array.isArray(form.skills) ? form.skills.join(', ') : form.skills} 
                    onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                  />
                </label>

                {/* Professional Fields */}
                <label className="profile-page__field">
                  <span>Current Designation</span>
                  <input value={form.currentDesignation} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} />
                </label>

                <label className="profile-page__field">
                  <span>Company / Institution</span>
                  <input value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
                </label>
                
                <label className="profile-page__field">
                  <span>LinkedIn URL</span>
                  <input type="url" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                </label>

                <label className="profile-page__field">
                  <span>GitHub URL</span>
                  <input type="url" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
                </label>
              </div>

              <div className="profile-page__form-actions">
                <button type="submit" className="profile-page__save-btn">Save Changes</button>
                <button type="button" className="profile-page__cancel-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
                {saved && <span className="profile-page__saved-msg">✓ Saved successfully</span>}
              </div>

            </form>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-page__shell">
        
        {/* HERO */}
        <motion.div 
          className="profile-page__hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <button className="profile-page__edit-btn" onClick={() => navigate('/dashboard/settings')}>
            <Edit3 size={18} /> Edit Profile
          </button>
          
          <div className="profile-page__hero-content">
            <div className="profile-page__hero-avatar-wrapper">
              <div className="profile-page__hero-avatar" style={{ '--avatar-backdrop': form.avatarBackdrop }}>
                {form.avatar ? <img src={form.avatar} alt="Avatar" /> : (form.name?.charAt(0) || 'U')}
              </div>
              <div className="profile-page__hero-status" title="Active"></div>
            </div>

            <div className="profile-page__hero-info">
              <h1>{form.name || 'Your Profile'}</h1>
              <p className="profile-page__hero-role">
                {form.currentDesignation || (user.role === 'organizer' ? 'Event Host' : 'Member')}
              </p>

              <div className="profile-page__hero-meta">
                {form.city && <span><MapPin size={16} /> {form.city}{form.state ? `, ${form.state}` : ''}</span>}
                {form.institutionName && <span><GraduationCap size={16} /> {form.institutionName}</span>}
              </div>

              <div className="profile-page__hero-socials">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="profile-page__social-btn">
                    <Mail size={16} /> Email
                  </a>
                )}
                {form.linkedin && (
                  <a href={form.linkedin} target="_blank" rel="noreferrer" className="profile-page__social-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    LinkedIn
                  </a>
                )}
                {form.github && (
                  <a href={form.github} target="_blank" rel="noreferrer" className="profile-page__social-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* MAIN GRID */}
        <motion.div 
          className="profile-page__dashboard-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          
          {/* LEFT COL */}
          <div className="profile-page__dashboard-main">
            
            {/* ABOUT */}
            <motion.div className="profile-page__glass-card" variants={itemVariants}>
              <div className="profile-page__card-header">
                <div className="profile-page__card-title">
                  <h2>About Me</h2>
                </div>
              </div>
              <p className="profile-page__bio-text">
                {form.bio || 'Add a short bio so people understand your background, interests, and the kind of opportunities you want to explore.'}
              </p>
              {Array.isArray(form.interests) && form.interests.length > 0 && (
                <div className="profile-page__tags-container">
                  {form.interests.map((interest, idx) => (
                    <span key={idx} className="profile-page__tag profile-page__tag--interest">{interest}</span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* DETAILS */}
            <motion.div className="profile-page__glass-card" variants={itemVariants}>
              <div className="profile-page__card-header">
                <div className="profile-page__card-title">
                  <h2>Professional Details</h2>
                </div>
              </div>
              <div className="profile-page__info-grid">
                {form.institutionName && (
                  <div className="profile-page__info-item">
                    <span>Institution / Company</span>
                    <strong>{form.institutionName}</strong>
                  </div>
                )}
                {form.degree && (
                  <div className="profile-page__info-item">
                    <span>Degree</span>
                    <strong>{form.degree}</strong>
                  </div>
                )}
                {form.branch && (
                  <div className="profile-page__info-item">
                    <span>Branch / Stream</span>
                    <strong>{form.branch}</strong>
                  </div>
                )}
                {form.graduationYear && (
                  <div className="profile-page__info-item">
                    <span>Graduation</span>
                    <strong>{form.graduationYear}</strong>
                  </div>
                )}
                {form.resumeUrl && (
                  <div className="profile-page__info-item">
                    <span>Resume</span>
                    <a href={form.resumeUrl} target="_blank" rel="noreferrer">View Document ↗</a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* SKILLS */}
            <motion.div className="profile-page__glass-card" variants={itemVariants}>
              <div className="profile-page__card-header">
                <div className="profile-page__card-title">
                  <h2>Skills</h2>
                </div>
              </div>
              <div className="profile-page__tags-container">
                {Array.isArray(form.skills) && form.skills.length > 0 ? (
                  form.skills.map((skill, index) => (
                    <span key={index} className="profile-page__tag profile-page__tag--skill">{skill}</span>
                  ))
                ) : (
                  <p className="profile-page__bio-text" style={{ fontSize: '0.95rem' }}>No skills added yet.</p>
                )}
              </div>
            </motion.div>

          </div>

          {/* RIGHT COL */}
          <div className="profile-page__dashboard-side">
            
            {/* MY EVENTS */}
            <motion.div className="profile-page__glass-card" variants={itemVariants}>
              <div className="profile-page__card-header">
                <div className="profile-page__card-title">
                  <h2>My Events</h2>
                </div>
              </div>
              <div className="profile-page__activity-list">
                {registeredEventItems.length > 0 ? (
                  registeredEventItems.map((item, idx) => {
                    const isTeam = Boolean(item.registration.teamName);
                    return (
                      <motion.div
                        key={idx}
                        className="profile-page__activity-item"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', paddingRight: '0.5rem' }}
                      >
                        <button
                          type="button"
                          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          onClick={() => { setSelectedEventItem(item); setShowQr(false); }}
                        >
                          <div className="profile-page__activity-details" style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                            <strong>{item.event.title}</strong>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {item.event.timeline?.eventStart
                                ? formatDate(item.event.timeline.eventStart)
                                : item.event.startDate
                                ? formatDate(item.event.startDate)
                                : 'Date TBA'}
                              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#bbb', display: 'inline-block' }} />
                              {isTeam ? `Team · ${item.registration.teamName}` : 'Individual'}
                            </span>
                          </div>
                          <span className="profile-page__activity-status" style={item.registration.checkedIn ? { background: 'rgba(37,89,189,0.1)', color: '#2559bd' } : {}}>
                            {item.registration.checkedIn ? 'Attended' : 'Registered'}
                          </span>
                        </button>

                        <button
                          type="button"
                          title="View QR Pass"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQrRegOnly(item.registration);
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'rgba(82,39,255,0.08)', border: '1px solid rgba(82,39,255,0.18)',
                            color: '#5227FF', cursor: 'pointer', flexShrink: 0, marginLeft: '0.25rem'
                          }}
                        >
                          <QrCode size={13} />
                        </button>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="profile-page__bio-text" style={{ fontSize: '0.9rem' }}>You haven't registered for any events yet.</p>
                )}
              </div>
            </motion.div>

          </div>

        </motion.div>
      </div>

      {/* ── Registration Detail Modal ── */}
      {selectedEventItem && (() => {
        const { registration, event } = selectedEventItem;
        const isTeam = Boolean(registration.teamName);
        const members = Array.isArray(registration.members) ? registration.members : [];
        const eventStart = event.timeline?.eventStart || event.startDate;
        const eventEnd = event.timeline?.eventEnd || event.endDate;
        const regEnd = event.timeline?.registrationEnd || event.registrationDeadline;

        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => { setSelectedEventItem(null); setShowQr(false); }}
          >
            <div
              style={{
                background: '#fff', borderRadius: 22, width: '100%', maxWidth: 480,
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5227FF', marginBottom: '0.2rem' }}>
                    {event.category || 'Event'}
                  </p>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.3 }}>{event.title}</h3>
                  {event.tagline && <p style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' }}>{event.tagline}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedEventItem(null); setShowQr(false); }}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#555' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1rem 1.5rem 1.5rem' }}>

                {/* Status row */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: registration.checkedIn ? 'rgba(37,89,189,0.1)' : 'rgba(82,39,255,0.08)', color: registration.checkedIn ? '#2559bd' : '#5227FF' }}>
                    {registration.checkedIn ? '✓ Attended' : '✓ Registered'}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(0,0,0,0.05)', color: '#555' }}>
                    {isTeam ? '👥 Team' : '👤 Individual'}
                  </span>
                  {event.mode && (
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(0,0,0,0.05)', color: '#555' }}>
                      {event.mode}
                    </span>
                  )}
                </div>

                {/* Event dates */}
                <div style={{ background: '#f8f9ff', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5227FF', marginBottom: '0.6rem' }}>Event Dates</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {eventStart && (
                      <div>
                        <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>STARTS</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#222' }}>{formatDate(eventStart)}</p>
                      </div>
                    )}
                    {eventEnd && (
                      <div>
                        <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>ENDS</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#222' }}>{formatDate(eventEnd)}</p>
                      </div>
                    )}
                    {regEnd && (
                      <div style={{ gridColumn: '1/-1' }}>
                        <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>REGISTRATION CLOSED</p>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#222' }}>{formatDate(regEnd)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                {(event.location || event.venue) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.875rem', padding: '0.75rem 1rem', background: '#f8f9ff', borderRadius: 12 }}>
                    <MapPin size={14} style={{ color: '#5227FF', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5227FF', marginBottom: '0.15rem' }}>Location</p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>{event.venue || event.location}</p>
                      {event.venueAddress && <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.1rem' }}>{event.venueAddress}</p>}
                    </div>
                  </div>
                )}

                {/* Organizer */}
                {(event.organizerName || event.hostName || (event.organizer?.name)) && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.875rem' }}>
                    Hosted by <span style={{ fontWeight: 700, color: '#333' }}>{event.organizerName || event.hostName || event.organizer?.name}</span>
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: '#f0f0f0', margin: '0.875rem 0' }} />

                {/* Registration details */}
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5227FF', marginBottom: '0.6rem' }}>Your Registration</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: isTeam ? '0.875rem' : '0' }}>
                  <div>
                    <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>TYPE</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#222' }}>{isTeam ? 'Team' : 'Individual'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>REGISTERED ON</p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#222' }}>{registration.createdAt ? formatDate(registration.createdAt) : '—'}</p>
                  </div>
                  {registration.status && (
                    <div>
                      <p style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.1rem' }}>STATUS</p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#222', textTransform: 'capitalize' }}>{registration.status}</p>
                    </div>
                  )}
                </div>

                {/* Team info */}
                {isTeam && (
                  <div style={{ background: '#f8f9ff', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '0' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5227FF', marginBottom: '0.6rem' }}>
                      Team — {registration.teamName}
                    </p>
                    {registration.teamLeadName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#5227FF,#8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {registration.teamLeadName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#222', margin: 0 }}>{registration.teamLeadName}</p>
                          <p style={{ fontSize: '0.68rem', color: '#5227FF', margin: 0, fontWeight: 600 }}>Team Lead</p>
                        </div>
                      </div>
                    )}
                    {members.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                        {members.map((m, mi) => {
                          const name = m.name || m.email || `Member ${mi + 1}`;
                          const email = m.email || '';
                          const isLead = m.isLead || m.role === 'lead';
                          return (
                            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: 26, height: 26, borderRadius: '50%', background: isLead ? 'linear-gradient(135deg,#5227FF,#8b5cf6)' : '#e8e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: isLead ? '#fff' : '#666', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                                {name.charAt(0).toUpperCase()}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                {email && name !== email && <p style={{ fontSize: '0.68rem', color: '#888', margin: 0 }}>{email}</p>}
                              </div>
                              {isLead && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#5227FF', marginLeft: 'auto', flexShrink: 0 }}>LEAD</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: '#f0f0f0', margin: '1rem 0 0.875rem' }} />

                {/* QR inline */}
                {showQr ? (
                  <div style={{ textAlign: 'center' }}>
                    <div id="dash-reg-qr-wrap" style={{ display: 'inline-flex', padding: '1rem', background: '#f8fafc', borderRadius: 14, marginBottom: '0.6rem' }}>
                      <QRCodeCanvas
                        value={registration.qrToken || registration.id || 'ticket'}
                        size={190}
                        bgColor="#f8fafc"
                        fgColor="#111827"
                        level="H"
                      />
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#bbb', wordBreak: 'break-all', marginBottom: '0.75rem' }}>{registration.qrToken}</p>
                    <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.875rem' }}>Show this code at event check-in.</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const canvas = document.querySelector('#dash-reg-qr-wrap canvas');
                          if (!canvas) return;
                          const url = canvas.toDataURL('image/png');
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `hunchmate-qr-${String(registration.id || 'pass').split('-')[0]}.png`;
                          a.click();
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 10, background: '#5227FF', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Download size={13} /> Download PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQr(false)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 10, background: '#f3f4f6', color: '#555', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action buttons */
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowQr(true)}
                      style={{ flex: 1, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: 11, background: '#5227FF', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <QrCode size={14} /> View QR Pass
                    </button>
                    <Link
                      to={buildEventDetailPath(event)}
                      onClick={() => { setSelectedEventItem(null); setShowQr(false); }}
                      style={{ flex: 1, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: 11, background: '#f3f4f6', color: '#333', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <ExternalLink size={14} /> View Event Page
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Standalone QR Modal ── */}
      {selectedQrRegOnly && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setSelectedQrRegOnly(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20, padding: '2rem',
              textAlign: 'center', maxWidth: 320, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>Event QR Pass</span>
              <button
                type="button"
                onClick={() => setSelectedQrRegOnly(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
              >
                <X size={18} />
              </button>
            </div>

            <div id="dash-qr-only-wrap" style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem', background: '#f8fafc', borderRadius: 12, marginBottom: '0.75rem' }}>
              <QRCodeCanvas
                value={selectedQrRegOnly.qrToken || selectedQrRegOnly.id || 'ticket'}
                size={200}
                bgColor="#f8fafc"
                fgColor="#111827"
                level="H"
              />
            </div>

            <p style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
              {selectedQrRegOnly.qrToken}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: '1rem' }}>Show this at event check-in.</p>

            <button
              type="button"
              onClick={() => {
                const canvas = document.querySelector('#dash-qr-only-wrap canvas');
                if (!canvas) return;
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `hunchmate-qr-${String(selectedQrRegOnly.id || 'pass').split('-')[0]}.png`;
                a.click();
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1.25rem', borderRadius: 10,
                background: '#5227FF', color: '#fff', border: 'none',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Download size={13} /> Download QR Pass
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
