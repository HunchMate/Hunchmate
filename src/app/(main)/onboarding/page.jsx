'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/utils/router';
import { useAuth } from '@/context/AuthContext';
import '@/vite-pages/Onboarding.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_TYPES = [
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'startup_founder', label: 'Startup Founder', icon: '🚀' },
  { value: 'professional', label: 'Professional', icon: '💼' },
];

const SKILL_OPTIONS = [
  'JavaScript','TypeScript','React','Node.js','Python','Java','C++','SQL',
  'MongoDB','PostgreSQL','AWS','Azure','Docker','Kubernetes','Machine Learning',
  'UI/UX','System Design','Cyber Security','Data Engineering','Product Strategy',
  'Figma','Flutter','Swift','Kotlin','Go','Rust','GraphQL','REST API',
  'Blockchain','Web3','Marketing','Finance','Operations','Sales',
];

const INDIA_STATE_CITY = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur','Tirupati'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar'],
  'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur', 'Agra', 'Varanasi'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
};

const STATE_OPTIONS = Object.keys(INDIA_STATE_CITY).sort();

const DEGREE_OPTIONS = ['B.Tech','B.E.','B.Sc','B.Com','BBA','BCA','M.Tech','M.E.','M.Sc','MBA','MCA','Ph.D','Diploma','B.Arch','MBBS','LLB'];
const BRANCH_OPTIONS = ['Computer Science','Information Technology','Electronics','Mechanical','Civil','Electrical','Data Science','Artificial Intelligence','Cyber Security','Business Administration','Commerce','Arts','Science','Medicine','Law','Design'];
const GRADUATION_YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => String(new Date().getFullYear() - 7 + i));
const EXPERIENCE_OPTIONS = ['0-1 years','1-3 years','3-5 years','5-8 years','8+ years'];
const DESIGNATION_OPTIONS = ['Software Engineer','Senior Software Engineer','Tech Lead','Engineering Manager','Product Manager','Data Analyst','Data Scientist','DevOps Engineer','QA Engineer','UX Designer','Founder','Consultant','CTO','CEO','Freelancer'];
const INDUSTRY_OPTIONS = ['Technology','Finance','Healthcare','Education','E-commerce','Manufacturing','Retail','Media','Real Estate','Agriculture','Logistics','Travel','Government','Non-profit','Other'];
const STARTUP_STAGE_OPTIONS = ['Idea','MVP','Early Traction','Funded','Scaling'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function hasCompletedOnboarding(user) {
  if (!user) return false;
  return Boolean(user.onboardingCompleted);
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function FieldError({ error }) {
  if (!error) return null;
  return <small className="onboarding__error-text">{error}</small>;
}

function SimpleSelect({ label, options, value, onChange, placeholder, error, required }) {
  return (
    <label className="onboarding__field">
      <span>{label}{required && <em className="onboarding__required"> *</em>}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'onboarding__input--error' : ''}
      >
        <option value="">{placeholder || 'Select…'}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <FieldError error={error} />
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder, error, required, type = 'text', readOnly, disabled }) {
  return (
    <label className="onboarding__field">
      <span>{label}{required && <em className="onboarding__required"> *</em>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className={error ? 'onboarding__input--error' : ''}
      />
      <FieldError error={error} />
    </label>
  );
}

function TagInput({ label, value, onChange, options, placeholder, error, required }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const trimmed = String(tag || '').trim();
    if (!trimmed) return;
    if (value.some((s) => s.toLowerCase() === trimmed.toLowerCase())) { setInput(''); return; }
    onChange([...value, trimmed]);
    setInput('');
  };

  return (
    <div className="onboarding__field onboarding__field--full">
      <span className="onboarding__label">{label}{required && <em className="onboarding__required"> *</em>}</span>
      <div className="onboarding__skills-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }}
          placeholder={placeholder || 'Type and press Enter'}
          list={`datalist-${label}`}
          className={`onboarding__tag-input${error ? ' onboarding__input--error' : ''}`}
        />
        {options && (
          <datalist id={`datalist-${label}`}>
            {options.filter((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase())).map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
        <button type="button" className="onboarding__add-btn" onClick={() => addTag(input)}>Add</button>
      </div>
      <FieldError error={error} />
      <div className="onboarding__chips">
        {value.length ? value.map((tag) => (
          <button key={tag} type="button" className="onboarding__chip onboarding__chip--tag"
            onClick={() => onChange(value.filter((t) => t !== tag))}>
            {tag} <span>×</span>
          </button>
        )) : <p className="onboarding__no-skill">No {label.toLowerCase()} added yet.</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const initializedRef = useRef(false);
  const avatarInputRef = useRef(null);

  // ── Step 1: Common fields ──
  const [profileType, setProfileType] = useState('student');
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [skills, setSkills] = useState([]);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [bio, setBio] = useState('');

  // ── Step 2: Student fields ──
  const [institutionName, setInstitutionName] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');

  // ── Step 2: Startup Founder fields ──
  const [startupName, setStartupName] = useState('');
  const [industry, setIndustry] = useState('');
  const [startupStage, setStartupStage] = useState('');
  const [startupWebsite, setStartupWebsite] = useState('');
  const [startupDescription, setStartupDescription] = useState('');

  // ── Step 2: Professional fields ──
  const [company, setCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [experience, setExperience] = useState('');
  const [proIndustry, setProIndustry] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const cityOptions = useMemo(() => INDIA_STATE_CITY[state] || [], [state]);
  const bioWords = wordCount(bio);
  const descWords = wordCount(startupDescription);

  // Initialize from existing user data
  useEffect(() => {
    if (!user) return;
    if (hasCompletedOnboarding(user)) {
      const path = user.role === 'admin' ? '/admin/dashboard'
        : user.role === 'organizer' ? '/organizer/dashboard' : '/events';
      navigate(path, { replace: true });
      return;
    }
    if (!initializedRef.current) {
      setProfileType(user.profileType || 'student');
      setAvatar(user.avatar || '');
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '');
      setState(user.state || '');
      setCity(user.city || '');
      setSkills(Array.isArray(user.skills) ? user.skills : []);
      setLinkedinUrl(user.linkedinUrl || user.socials?.linkedin || '');
      setBio(user.bio || '');
      setInstitutionName(user.institutionName || user.institution || '');
      setDegree(user.degree || '');
      setBranch(user.branch || user.stream || '');
      setGraduationYear(user.graduationYear || '');
      setGithubUrl(user.githubUrl || user.socials?.github || '');
      setResumeUrl(user.resumeUrl || '');
      setStartupName(user.startupName || '');
      setIndustry(user.industry || '');
      setStartupStage(user.startupStage || '');
      setStartupWebsite(user.startupWebsite || '');
      setStartupDescription(user.startupDescription || '');
      setCompany(user.company || '');
      setCurrentDesignation(user.currentDesignation || '');
      setExperience(user.experience || '');
      setProIndustry(user.industry || '');
      setPortfolioUrl(user.portfolioUrl || '');
      initializedRef.current = true;
    }
  }, [navigate, user]);

  // ── Avatar handling ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readImageFile(file);
      setAvatar(base64);
    } catch {
      setError('Could not read image file.');
    }
  };

  // ── Validation ──
  const clearError = (field) => setFieldErrors((cur) => { if (!cur[field]) return cur; const n = { ...cur }; delete n[field]; return n; });

  const validateStep1 = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required.';
    if (!phoneNumber.trim()) errs.phoneNumber = 'Mobile number is required.';
    else if (!/^[+\d][\d\s\-()]{6,15}$/.test(phoneNumber.trim())) errs.phoneNumber = 'Enter a valid phone number.';
    if (!state) errs.state = 'State is required.';
    if (!city) errs.city = 'City is required.';
    if (!skills.length) errs.skills = 'Add at least one skill.';
    if (bioWords > 100) errs.bio = 'Bio must be 100 words or less.';
    if (!profileType) errs.profileType = 'Please select a profile type.';
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (profileType === 'student') {
      if (!institutionName.trim()) errs.institutionName = 'Institution name is required.';
      if (!degree) errs.degree = 'Degree is required.';
      if (!branch) errs.branch = 'Branch is required.';
      if (!graduationYear) errs.graduationYear = 'Graduation year is required.';
    } else if (profileType === 'startup_founder') {
      if (!startupName.trim()) errs.startupName = 'Startup name is required.';
      if (!industry) errs.industry = 'Industry is required.';
      if (!startupStage) errs.startupStage = 'Startup stage is required.';
      if (descWords > 100) errs.startupDescription = 'Description must be 100 words or less.';
    } else if (profileType === 'professional') {
      if (!company.trim()) errs.company = 'Company name is required.';
      if (!currentDesignation) errs.currentDesignation = 'Designation is required.';
      if (!experience) errs.experience = 'Experience is required.';
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setFieldErrors(errs); setError('Please fix the highlighted fields.'); return; }
    setFieldErrors({});
    setError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => { setStep(1); setError(''); setFieldErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validateStep2();
    if (Object.keys(errs).length) { setFieldErrors(errs); setError('Please fix the highlighted fields.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        avatar,
        phoneNumber: phoneNumber.trim(),
        bio: bio.trim(),
        profileType,
        state,
        city,
        skills,
        linkedinUrl: linkedinUrl.trim(),
        socials: { ...(user?.socials || {}), linkedin: linkedinUrl.trim() },
        onboardingCompleted: true,
      };

      if (profileType === 'student') {
        Object.assign(payload, {
          institutionName: institutionName.trim(),
          institution: institutionName.trim(),
          degree,
          branch,
          stream: branch,
          graduationYear,
          githubUrl: githubUrl.trim(),
          resumeUrl: resumeUrl.trim(),
          socials: { ...(user?.socials || {}), linkedin: linkedinUrl.trim(), github: githubUrl.trim() },
        });
      } else if (profileType === 'startup_founder') {
        Object.assign(payload, {
          startupName: startupName.trim(),
          industry,
          startupStage,
          startupWebsite: startupWebsite.trim(),
          startupDescription: startupDescription.trim(),
        });
      } else if (profileType === 'professional') {
        Object.assign(payload, {
          company: company.trim(),
          currentDesignation,
          headline: currentDesignation,
          experience,
          industry: proIndustry,
          portfolioUrl: portfolioUrl.trim(),
        });
      }

      await updateProfile(payload);

      const targetPath = user?.role === 'admin' ? '/admin/dashboard'
        : user?.role === 'organizer' ? '/organizer/dashboard' : '/events';

      // Hard redirect — forces a full page reload so the auth listener reads the
      // freshly committed DB row (onboarding_completed=true) and doesn't race-bounce
      // the user back to /onboarding via a stale re-fetch.
      window.location.replace(targetPath);
    } catch (err) {
      setError(err?.message || 'Failed to save profile. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Progress ──
  const step1Checks = [!!name.trim(), !!phoneNumber.trim(), !!state, !!city, skills.length > 0, !!profileType];
  const step1Percent = Math.round((step1Checks.filter(Boolean).length / step1Checks.length) * 100);

  const profileTypeLabel = PROFILE_TYPES.find((p) => p.value === profileType)?.label || 'Participant';

  return (
    <main className="onboarding">
      <section className="onboarding__shell">

        {/* ── Sidebar ── */}
        <aside className="onboarding__intro">
          <p className="onboarding__kicker">Profile Setup</p>
          <h1>Build your identity in one pass</h1>
          <p className="onboarding__subtitle">
            We use your profile to personalize events, recommendations, and collaboration opportunities.
          </p>

          {/* Step indicator */}
          <div className="onboarding__step-indicator">
            {[1, 2].map((s) => (
              <div key={s} className={`onboarding__step-dot${step === s ? ' is-active' : step > s ? ' is-done' : ''}`}>
                <span>{step > s ? '✓' : s}</span>
                <small>{s === 1 ? 'Primary Info' : 'Additional Info'}</small>
              </div>
            ))}
            <div className="onboarding__step-line" />
          </div>

          {/* Progress card */}
          <div className="onboarding__progress-card">
            <div>
              <p>Completion</p>
              <h2>{step === 1 ? step1Percent : 100}%</h2>
            </div>
            <div
              className="onboarding__progress-ring"
              data-label={`${step === 1 ? step1Percent : 100}%`}
              style={{ '--progress': `${step === 1 ? step1Percent : 100}%` }}
            />
          </div>

          <div className="onboarding__facts">
            <article><span>Profile Type</span><strong>{profileTypeLabel}</strong></article>
            <article><span>Email</span><strong>{user?.email || 'Unavailable'}</strong></article>
            <article><span>Skills Added</span><strong>{skills.length}</strong></article>
          </div>
        </aside>

        {/* ── Form Panel ── */}
        <section className="onboarding__panel">
          {error ? <p className="onboarding__error">{error}</p> : null}

          <form className="onboarding__form" onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}>

            {/* ════════════════════════════════════════
                STEP 1 — Common Fields
            ════════════════════════════════════════ */}
            {step === 1 && (
              <>
                {/* Profile Type */}
                <div className="onboarding__section-title onboarding__field--full">
                  <h3>Who are you?</h3>
                  <p>Choose the type that best describes you.</p>
                </div>

                <div className="onboarding__field onboarding__field--full">
                  <div className="onboarding__type-grid">
                    {PROFILE_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        type="button"
                        className={`onboarding__type-card${profileType === pt.value ? ' is-active' : ''}`}
                        onClick={() => { setProfileType(pt.value); clearError('profileType'); }}
                      >
                        <span className="onboarding__type-icon">{pt.icon}</span>
                        <span className="onboarding__type-label">{pt.label}</span>
                      </button>
                    ))}
                  </div>
                  <FieldError error={fieldErrors.profileType} />
                </div>

                {/* Avatar */}
                <div className="onboarding__section-title onboarding__field--full">
                  <h3>Primary Information</h3>
                  <p>Your basic identity details.</p>
                </div>

                <div className="onboarding__field onboarding__field--full onboarding__avatar-row">
                  <div
                    className="onboarding__avatar-preview"
                    style={{ backgroundImage: avatar ? `url(${avatar})` : 'none' }}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {!avatar && <span>📷</span>}
                  </div>
                  <div className="onboarding__avatar-info">
                    <p><strong>Profile Photo</strong> <em>(optional)</em></p>
                    <p>Upload a clear photo of yourself.</p>
                    <button type="button" className="onboarding__upload-btn" onClick={() => avatarInputRef.current?.click()}>
                      {avatar ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  </div>
                </div>

                <TextInput
                  label="Full Name" required
                  value={name} onChange={(v) => { setName(v); clearError('name'); }}
                  placeholder="Your full name" error={fieldErrors.name}
                />

                <label className="onboarding__field">
                  <span>Email</span>
                  <input value={user?.email || ''} readOnly disabled />
                </label>

                <TextInput
                  label="Mobile Number" required type="tel"
                  value={phoneNumber} onChange={(v) => { setPhoneNumber(v); clearError('phoneNumber'); }}
                  placeholder="+91 9876543210" error={fieldErrors.phoneNumber}
                />

                <SimpleSelect
                  label="State" required
                  options={STATE_OPTIONS} value={state}
                  onChange={(v) => { setState(v); setCity(''); clearError('state'); clearError('city'); }}
                  placeholder="Select state" error={fieldErrors.state}
                />

                <SimpleSelect
                  label="City" required
                  options={cityOptions} value={city}
                  onChange={(v) => { setCity(v); clearError('city'); }}
                  placeholder={state ? 'Select city' : 'Select state first'}
                  error={fieldErrors.city}
                />

                <TagInput
                  label="Skills" required
                  value={skills} onChange={(v) => { setSkills(v); clearError('skills'); }}
                  options={SKILL_OPTIONS}
                  placeholder="Search or type a skill, press Enter"
                  error={fieldErrors.skills}
                />

                <label className="onboarding__field">
                  <span>LinkedIn URL <em className="onboarding__optional">(optional)</em></span>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </label>

                <label className="onboarding__field onboarding__field--full">
                  <span>Bio <em className="onboarding__optional">(max 100 words, optional)</em></span>
                  <textarea
                    value={bio}
                    onChange={(e) => { setBio(e.target.value); clearError('bio'); }}
                    rows={4}
                    placeholder="Write a short introduction about yourself…"
                  />
                  <small className={bioWords > 100 ? 'onboarding__word-count--over' : 'onboarding__word-count'}>{bioWords}/100 words</small>
                  <FieldError error={fieldErrors.bio} />
                </label>

                <div className="onboarding__field--full">
                  <button type="submit" className="onboarding__submit">
                    Next: Additional Info →
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════
                STEP 2 — Type-specific Additional Fields
            ════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <div className="onboarding__section-title onboarding__field--full">
                  <h3>
                    {profileType === 'student' && '🎓 Academic Details'}
                    {profileType === 'startup_founder' && '🚀 Startup Details'}
                    {profileType === 'professional' && '💼 Professional Details'}
                  </h3>
                  <p>Help others understand your background better.</p>
                </div>

                {/* ── Student ── */}
                {profileType === 'student' && (
                  <>
                    <label className="onboarding__field onboarding__field--full">
                      <span>Institution Name <em className="onboarding__required"> *</em></span>
                      <input
                        value={institutionName}
                        onChange={(e) => { setInstitutionName(e.target.value); clearError('institutionName'); }}
                        placeholder="Your college / university name"
                        className={fieldErrors.institutionName ? 'onboarding__input--error' : ''}
                      />
                      <FieldError error={fieldErrors.institutionName} />
                    </label>

                    <SimpleSelect label="Degree" required options={DEGREE_OPTIONS} value={degree}
                      onChange={(v) => { setDegree(v); clearError('degree'); }}
                      placeholder="Select degree" error={fieldErrors.degree} />

                    <SimpleSelect label="Branch" required options={BRANCH_OPTIONS} value={branch}
                      onChange={(v) => { setBranch(v); clearError('branch'); }}
                      placeholder="Select branch" error={fieldErrors.branch} />

                    <SimpleSelect label="Graduation Year" required options={GRADUATION_YEAR_OPTIONS} value={graduationYear}
                      onChange={(v) => { setGraduationYear(v); clearError('graduationYear'); }}
                      placeholder="Select year" error={fieldErrors.graduationYear} />

                    <TextInput label="GitHub URL" type="url"
                      value={githubUrl} onChange={setGithubUrl}
                      placeholder="https://github.com/yourprofile" />

                    <TextInput label="Resume URL" type="url"
                      value={resumeUrl} onChange={setResumeUrl}
                      placeholder="Link to your resume (Google Drive, Notion, etc.)" />
                  </>
                )}

                {/* ── Startup Founder ── */}
                {profileType === 'startup_founder' && (
                  <>
                    <TextInput label="Startup Name" required
                      value={startupName} onChange={(v) => { setStartupName(v); clearError('startupName'); }}
                      placeholder="Your startup's name" error={fieldErrors.startupName} />

                    <SimpleSelect label="Industry" required options={INDUSTRY_OPTIONS} value={industry}
                      onChange={(v) => { setIndustry(v); clearError('industry'); }}
                      placeholder="Select industry" error={fieldErrors.industry} />

                    <SimpleSelect label="Stage" required options={STARTUP_STAGE_OPTIONS} value={startupStage}
                      onChange={(v) => { setStartupStage(v); clearError('startupStage'); }}
                      placeholder="Select stage (MVP / Idea / Funded)" error={fieldErrors.startupStage} />

                    <TextInput label="Website" type="url"
                      value={startupWebsite} onChange={setStartupWebsite}
                      placeholder="https://yourstartup.com (optional)" />

                    <label className="onboarding__field onboarding__field--full">
                      <span>Startup Description <em className="onboarding__optional">(max 100 words, optional)</em></span>
                      <textarea
                        value={startupDescription}
                        onChange={(e) => { setStartupDescription(e.target.value); clearError('startupDescription'); }}
                        rows={4}
                        placeholder="What does your startup do? What problem does it solve?"
                      />
                      <small className={descWords > 100 ? 'onboarding__word-count--over' : 'onboarding__word-count'}>{descWords}/100 words</small>
                      <FieldError error={fieldErrors.startupDescription} />
                    </label>
                  </>
                )}

                {/* ── Professional ── */}
                {profileType === 'professional' && (
                  <>
                    <TextInput label="Company" required
                      value={company} onChange={(v) => { setCompany(v); clearError('company'); }}
                      placeholder="Where do you work?" error={fieldErrors.company} />

                    <SimpleSelect label="Designation" required options={DESIGNATION_OPTIONS} value={currentDesignation}
                      onChange={(v) => { setCurrentDesignation(v); clearError('currentDesignation'); }}
                      placeholder="Select your role" error={fieldErrors.currentDesignation} />

                    <SimpleSelect label="Experience" required options={EXPERIENCE_OPTIONS} value={experience}
                      onChange={(v) => { setExperience(v); clearError('experience'); }}
                      placeholder="Years of experience" error={fieldErrors.experience} />

                    <SimpleSelect label="Industry" options={INDUSTRY_OPTIONS} value={proIndustry}
                      onChange={setProIndustry}
                      placeholder="Select industry (optional)" />

                    <TextInput label="Portfolio / Resume URL" type="url"
                      value={portfolioUrl} onChange={setPortfolioUrl}
                      placeholder="Link to your portfolio or resume (optional)" />
                  </>
                )}

                <div className="onboarding__field--full onboarding__btn-row">
                  <button type="button" className="onboarding__back-btn" onClick={handleBack}>
                    ← Back
                  </button>
                  <button type="submit" className="onboarding__submit" disabled={submitting}>
                    {submitting ? 'Saving profile…' : 'Save & Continue 🎉'}
                  </button>
                </div>
              </>
            )}

          </form>
        </section>
      </section>
    </main>
  );
}
