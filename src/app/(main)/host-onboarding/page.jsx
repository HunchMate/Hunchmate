'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/utils/router';
import { AlertCircle, ChevronRight, ChevronLeft, Building2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import '@/vite-pages/HostOnboarding.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const ORG_TYPES = [
  { value: 'college_university', label: 'College / University', icon: '🏫' },
  { value: 'company', label: 'Company', icon: '🏢' },
  { value: 'startup', label: 'Startup', icon: '🚀' },
  { value: 'incubator', label: 'Incubator', icon: '💡' },
  { value: 'community', label: 'Community', icon: '🌍' },
  { value: 'ngo', label: 'NGO', icon: '🤝' },
  { value: 'others', label: 'Others', icon: '✨' },
];

const ROLE_OPTIONS = [
  { value: 'founder', label: 'Founder' },
  { value: 'director', label: 'Director' },
  { value: 'principal', label: 'Principal' },
  { value: 'hod', label: 'HOD' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'club_representative', label: 'Club Representative' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'other', label: 'Other' },
];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'Singapore', 'UAE', 'Japan', 'South Korea', 'France',
  'Netherlands', 'Other',
];

const INDIA_STATE_CITY = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
  'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
  'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur'],
};
const STATE_OPTIONS = Object.keys(INDIA_STATE_CITY);

const STEPS = [
  { id: 1, label: 'Your Organisation' },
  { id: 2, label: 'Your Role' },
  { id: 3, label: 'Org Profile' },
];

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60, transition: { duration: 0.25 } }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasCompletedHostOnboarding(user) {
  if (!user) return false;
  if (user.hostOnboardingCompleted) return true;
  return Boolean(
    String(user.institutionName || user.organisationName || user.companyName || '').trim() &&
    String(user.hostType || '').trim() &&
    String(user.name || '').trim()
  );
}

function toOptions(items) {
  return items.map((item) => ({ value: item, label: item }));
}

// ─── SearchableDropdown ───────────────────────────────────────────────────────

function SearchableDropdown({ label, options, value, onChange, placeholder, disabled = false, error = '' }) {
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => options.find((o) => o.value === value) || null, [options, value]);
  useEffect(() => { setQuery(selectedOption?.label || ''); }, [selectedOption]);

  const filtered = useMemo(() => {
    const n = String(query || '').trim().toLowerCase();
    if (!n) return options;
    return options.filter((o) => o.label.toLowerCase().includes(n));
  }, [options, query]);

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <label className="host-onboarding__field" ref={containerRef}>
      <span>{label}</span>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            className="host-onboarding__dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.length
              ? filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`host-onboarding__option ${value === o.value ? 'is-active' : ''}`}
                  onClick={() => { onChange(o.value); setQuery(o.label); setOpen(false); }}
                >
                  {o.label}
                </button>
              ))
              : <p className="host-onboarding__no-result">No results found</p>
            }
          </motion.div>
        )}
      </AnimatePresence>
      {error && <small className="host-onboarding__error-text">{error}</small>}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HostOnboarding() {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1); // animation direction

  // Step 1 — Organisation
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');

  // Step 2 — Role
  const [role, setRole] = useState('');

  // Step 3 — Org Profile
  const [orgLogo, setOrgLogo] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cityOptions = useMemo(() => {
    if (!state) return [];
    return INDIA_STATE_CITY[state] || [];
  }, [state]);

  useEffect(() => {
    // Wait until auth has fully resolved before running guards
    if (authLoading) return;
    if (!user) { navigate('/host-signup', { replace: true }); return; }
    if (user.role !== 'organizer') { navigate('/events', { replace: true }); return; }
    if (hasCompletedHostOnboarding(user)) { navigate('/organizer/dashboard', { replace: true }); return; }

    // Pre-fill from existing profile
    setOrgName(user.organisationName || user.institutionName || user.companyName || '');
    setOrgType(user.hostCategory || '');
    setRole(user.hostType || '');
    setWebsite(user.website || '');
    setLinkedin(user.linkedin || '');
    setCountry(user.country || 'India');
    setState(user.state || '');
    setCity(user.city || '');
    setOrgLogo(user.orgLogo || '');
  }, [navigate, user, authLoading]);

  // Progress percentage
  const progress = useMemo(() => {
    let done = 0;
    if (orgName) done++;
    if (orgType) done++;
    if (role) done++;
    if (country !== 'India' || (state && city)) done++;
    return Math.round((done / 4) * 100);
  }, [orgName, orgType, role, country, state, city]);

  const goNext = () => {
    const errs = {};
    if (step === 1) {
      if (!orgName.trim()) errs.orgName = 'Organisation name is required';
      if (!orgType) errs.orgType = 'Please select an organisation type';
    }
    if (step === 2) {
      if (!role) errs.role = 'Please select your role or designation';
    }
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setDir(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setFieldErrors({});
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (country === 'India') {
      if (!state.trim()) errs.state = 'Please select a state';
      if (!city.trim()) errs.city = 'Please select a city';
    }
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setError('');
    setSubmitting(true);

    try {
      // Use the server-side upsert route (cookie auth, no RLS cold-start issues)
      const res = await fetch('/api/profile/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organisationName: orgName.trim(),
          hostCategory: orgType,
          hostType: role,
          orgLogo,
          website: website.trim(),
          linkedin: linkedin.trim(),
          country: country.trim(),
          state: country === 'India' ? state.trim() : '',
          city: country === 'India' ? city.trim() : '',
          hostOnboardingCompleted: true,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Server error (${res.status})`);
      }

      const cacheKey = user?.id ? `hm_host_onboarding_completed_${user.id}` : '';
      if (cacheKey) localStorage.setItem(cacheKey, '1');
      window.location.replace('/organizer/dashboard');
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="host-onboarding">
      <div className="host-onboarding__container">

        {/* ── Step Tracker ── */}
        <div className="host-onboarding__card host-onboarding__tracker">
          <div className="host-onboarding__tracker-steps">
            {STEPS.map((s, i) => {
              const status = step > s.id ? 'completed' : step === s.id ? 'active' : 'pending';
              return (
                <div key={s.id} className="host-onboarding__tracker-item">
                  <div className={`host-onboarding__step-dot ${status}`}>
                    {status === 'completed' ? <Check size={14} /> : s.id}
                  </div>
                  <span className={`host-onboarding__step-text ${status}`}>{s.label}</span>
                  {i < STEPS.length - 1 && (
                    <div className={`host-onboarding__step-line ${step > s.id ? 'completed' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="host-onboarding__tracker-progress">
            <div className="host-onboarding__tracker-bar">
              <div className="host-onboarding__tracker-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="host-onboarding__tracker-pct">{progress}% complete</span>
          </div>
        </div>

        {/* ── Form Card ── */}
        <div className="host-onboarding__card host-onboarding__form-container">
          <AnimatePresence mode="wait" custom={dir}>
            {/* ─────── STEP 1: Organisation ─────── */}
            {step === 1 && (
              <motion.div key="step-1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
                <div className="host-onboarding__header">
                  <p className="host-onboarding__step-badge">Step 1 of 3</p>
                  <h2>Tell us about your organisation</h2>
                  <p>We'll use this to personalise your host dashboard.</p>
                </div>

                {fieldErrors.orgName || fieldErrors.orgType ? (
                  <div className="host-onboarding__error-box">
                    <AlertCircle size={18} />
                    <p>Please fill in all required fields before continuing.</p>
                  </div>
                ) : null}

                <div className="host-onboarding__field" style={{ marginBottom: '28px' }}>
                  <span>Organisation name <span className="host-onboarding__required">*</span></span>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => { setOrgName(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.orgName; return n; }); }}
                    placeholder="e.g. Delhi Institute of Technology"
                  />
                  {fieldErrors.orgName && <small className="host-onboarding__error-text">{fieldErrors.orgName}</small>}
                </div>

                <div className="host-onboarding__field-label">
                  Organisation type <span className="host-onboarding__required">*</span>
                  {fieldErrors.orgType && <small className="host-onboarding__error-text" style={{ marginLeft: 8 }}>{fieldErrors.orgType}</small>}
                </div>
                <div className="host-onboarding__type-grid">
                  {ORG_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`host-onboarding__type-card ${orgType === t.value ? 'is-active' : ''}`}
                      onClick={() => { setOrgType(t.value); setFieldErrors((p) => { const n = { ...p }; delete n.orgType; return n; }); }}
                    >
                      <span className="host-onboarding__type-icon">{t.icon}</span>
                      <span className="host-onboarding__type-label">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="host-onboarding__actions">
                  <button type="button" className="host-onboarding__next-btn" onClick={goNext}>
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─────── STEP 2: Role ─────── */}
            {step === 2 && (
              <motion.div key="step-2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
                <div className="host-onboarding__header">
                  <p className="host-onboarding__step-badge">Step 2 of 3</p>
                  <h2>What's your role or designation?</h2>
                  <p>Select the option that best describes your position in the organisation.</p>
                </div>

                {fieldErrors.role ? (
                  <div className="host-onboarding__error-box">
                    <AlertCircle size={18} />
                    <p>{fieldErrors.role}</p>
                  </div>
                ) : null}

                <div className="host-onboarding__role-grid">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`host-onboarding__role-card ${role === r.value ? 'is-active' : ''}`}
                      onClick={() => { setRole(r.value); setFieldErrors((p) => { const n = { ...p }; delete n.role; return n; }); }}
                    >
                      {role === r.value && <Check size={14} className="host-onboarding__role-check" />}
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="host-onboarding__actions host-onboarding__actions--two">
                  <button type="button" className="host-onboarding__back-btn" onClick={goBack}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button type="button" className="host-onboarding__next-btn" onClick={goNext}>
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─────── STEP 3: Org Profile ─────── */}
            {step === 3 && (
              <motion.div key="step-3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
                <div className="host-onboarding__header">
                  <p className="host-onboarding__step-badge">Step 3 of 3</p>
                  <h2>Set up your org profile</h2>
                  <p>Add a logo and contact details so participants can find you easily.</p>
                </div>

                {error && (
                  <motion.div className="host-onboarding__error-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AlertCircle size={18} />
                    <p>{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Logo */}
                  <div className="host-onboarding__field" style={{ marginBottom: '24px' }}>
                    <span>Organisation logo</span>
                    <div className="host-onboarding__logo-row">
                      {orgLogo
                        ? <img src={orgLogo} alt="Logo preview" className="host-onboarding__logo-preview" />
                        : <div className="host-onboarding__logo-placeholder"><Building2 size={22} color="#94a3b8" /></div>
                      }
                      <div className="host-onboarding__logo-upload">
                        <label htmlFor="org-logo-input" className="host-onboarding__logo-btn">
                          {orgLogo ? 'Change logo' : 'Upload logo'}
                        </label>
                        <input
                          id="org-logo-input"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) { setFieldErrors((p) => ({ ...p, orgLogo: 'Image must be under 2MB' })); return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => { setOrgLogo(ev.target.result); setFieldErrors((p) => { const n = { ...p }; delete n.orgLogo; return n; }); };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <p className="host-onboarding__logo-hint">PNG, JPG up to 2MB</p>
                        {fieldErrors.orgLogo && <small className="host-onboarding__error-text">{fieldErrors.orgLogo}</small>}
                      </div>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="host-onboarding__field" style={{ marginBottom: '20px' }}>
                    <span>Website <span className="host-onboarding__optional">(optional)</span></span>
                    <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourorganisation.com" />
                  </div>

                  {/* LinkedIn */}
                  <div className="host-onboarding__field" style={{ marginBottom: '28px' }}>
                    <span>LinkedIn <span className="host-onboarding__optional">(optional)</span></span>
                    <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/yourorg" />
                  </div>

                  {/* Country */}
                  <SearchableDropdown
                    label="Country"
                    options={toOptions(COUNTRIES)}
                    value={country}
                    onChange={(v) => { setCountry(v); if (v !== 'India') { setState(''); setCity(''); } }}
                    placeholder="Select country"
                  />

                  {/* State & City */}
                  {country === 'India' && (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '20px' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <SearchableDropdown
                          label="State"
                          options={toOptions(STATE_OPTIONS)}
                          value={state}
                          onChange={(v) => { setState(v); setCity(''); setFieldErrors((p) => { const n = { ...p }; delete n.state; return n; }); }}
                          placeholder="Select state"
                          error={fieldErrors.state}
                        />
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <SearchableDropdown
                          label="City"
                          options={toOptions(cityOptions)}
                          value={city}
                          onChange={(v) => { setCity(v); setFieldErrors((p) => { const n = { ...p }; delete n.city; return n; }); }}
                          placeholder={state ? 'Select city' : 'Select state first'}
                          disabled={!state}
                          error={fieldErrors.city}
                        />
                      </div>
                    </div>
                  )}

                  <div className="host-onboarding__actions host-onboarding__actions--two" style={{ marginTop: '32px' }}>
                    <button type="button" className="host-onboarding__back-btn" onClick={goBack} disabled={submitting}>
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button type="submit" className="host-onboarding__submit-btn" disabled={submitting}>
                      {submitting ? 'Saving…' : 'Complete Setup'}
                      {!submitting && <ChevronRight size={18} />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
