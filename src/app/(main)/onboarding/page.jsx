'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/utils/router';
import { useAuth } from '@/context/AuthContext';
import '@/vite-pages/Onboarding.css';

const PROFILE_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'working_professional', label: 'Working Professional' },
];

const STREAM_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Data Science',
  'Artificial Intelligence',
  'Cyber Security',
  'Business Administration',
  'Commerce',
  'Arts',
  'Science',
  'Medicine',
  'Law',
];

const INSTITUTION_OPTIONS = [
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'IIT Kharagpur',
  'NIT Trichy',
  'BITS Pilani',
  'VIT Vellore',
  'Anna University',
  'Delhi University',
  'Mumbai University',
  'Christ University',
  'Amity University',
  'Symbiosis International',
  'Manipal Institute of Technology',
  'SRM Institute of Science and Technology',
];

const TECH_PROFICIENCY_OPTIONS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

const EXPERIENCE_OPTIONS = [
  '0-1 years',
  '1-3 years',
  '3-5 years',
  '5-8 years',
  '8+ years',
];

const DESIGNATION_OPTIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Tech Lead',
  'Engineering Manager',
  'Product Manager',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'QA Engineer',
  'UX Designer',
  'Founder',
  'Consultant',
];

const SKILL_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'Java',
  'C++',
  'SQL',
  'MongoDB',
  'PostgreSQL',
  'AWS',
  'Azure',
  'Docker',
  'Kubernetes',
  'Machine Learning',
  'UI/UX',
  'System Design',
  'Cyber Security',
  'Data Engineering',
  'Product Strategy',
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

function wordCount(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function SearchableDropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  error = '',
}) {
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    setQuery(selectedOption?.label || '');
  }, [selectedOption]);

  const filtered = useMemo(() => {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  return (
    <label className="onboarding__field" ref={containerRef}>
      <span>{label}</span>
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {open && !disabled ? (
        <div className="onboarding__dropdown">
          {filtered.length ? filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`onboarding__option ${value === option.value ? 'is-active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setQuery(option.label);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          )) : <p className="onboarding__no-result">No results found</p>}
        </div>
      ) : null}

      {error ? <small className="onboarding__error-text">{error}</small> : null}
    </label>
  );
}

function toOptions(items) {
  return items.map((item) => ({ value: item, label: item }));
}

function hasCompletedOnboarding(user) {
  if (!user) return false;
  if (user.onboardingCompleted) return true;

  const hasCore = Boolean(
    String(user.profileType || '').trim()
    && String(user.stream || '').trim()
    && String(user.graduationYear || '').trim()
    && String(user.institutionName || user.institution || '').trim()
    && String(user.state || '').trim()
    && String(user.city || '').trim()
    && Array.isArray(user.skills)
    && user.skills.length > 0
  );

  if (!hasCore) return false;

  if (user.profileType === 'working_professional') {
    return Boolean(
      String(user.experience || '').trim()
      && String(user.techProficiency || '').trim()
      && String(user.currentDesignation || '').trim()
    );
  }

  return true;
}

function getOnboardingCacheKey(user) {
  const identity = String(user?.id || user?.email || '').trim();
  return identity ? `hm_onboarding_completed_${identity}` : '';
}

export default function Onboarding() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('student');
  const [stream, setStream] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState('');
  const [techProficiency, setTechProficiency] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const graduationYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 16 }).map((_, index) => String(currentYear - 7 + index));
  }, []);

  const cityOptions = useMemo(() => {
    if (!state) return [];
    return INDIA_STATE_CITY[state] || [];
  }, [state]);

  useEffect(() => {
    if (!user) return;

    if (hasCompletedOnboarding(user)) {
      const path = user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'organizer'
          ? '/organizer/dashboard'
          : '/events';
      navigate(path, { replace: true });
      return;
    }

    setName(user.name || '');
    setBio(user.bio || '');
    setProfileType(user.profileType || 'student');
    setStream(user.stream || '');
    setGraduationYear(user.graduationYear || '');
    setInstitutionName(user.institutionName || user.institution || '');
    setState(user.state || '');
    setCity(user.city || '');
    setExperience(user.experience || '');
    setTechProficiency(user.techProficiency || '');
    setWorkSummary(user.workSummary || '');
    setCurrentDesignation(user.currentDesignation || user.headline || '');
    setSkills(Array.isArray(user.skills) ? user.skills : []);
  }, [navigate, user]);

  const bioWords = wordCount(bio);
  const workSummaryWords = wordCount(workSummary);
  const isWorkingProfessional = profileType === 'working_professional';
  const roleLabel = isWorkingProfessional ? 'Working Professional' : 'Student';

  const completionChecks = [
    Boolean(name.trim()),
    Boolean(profileType),
    Boolean(stream),
    Boolean(graduationYear),
    Boolean(institutionName),
    Boolean(state),
    Boolean(city),
    Boolean(skills.length),
    isWorkingProfessional ? Boolean(experience) : true,
    isWorkingProfessional ? Boolean(techProficiency) : true,
    isWorkingProfessional ? Boolean(currentDesignation) : true,
  ];
  const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  const addSkill = () => {
    const nextSkill = String(selectedSkill || '').trim();
    if (!nextSkill) return;

    const normalized = nextSkill.toLowerCase();
    const alreadyExists = skills.some((skill) => String(skill || '').toLowerCase() === normalized);
    if (alreadyExists) {
      setSelectedSkill('');
      return;
    }

    setSkills((current) => [...current, nextSkill]);
    setSelectedSkill('');
    setFieldErrors((current) => {
      if (!current.skills) return current;
      const next = { ...current };
      delete next.skills;
      return next;
    });
  };

  const removeSkill = (skill) => {
    setSkills((current) => current.filter((item) => item !== skill));
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) nextErrors.name = 'Please add your name.';
    if (!user?.email) nextErrors.email = 'Email is unavailable. Please login again.';
    if (bioWords > 100) nextErrors.bio = 'Bio must be 100 words or less.';
    if (!profileType) nextErrors.profileType = 'Please select Student or Working Professional.';
    if (!stream) nextErrors.stream = 'Please select your stream.';
    if (!graduationYear) nextErrors.graduationYear = 'Please select your graduation year.';
    if (!institutionName) nextErrors.institutionName = 'Please select your institution name.';
    if (!state) nextErrors.state = 'Please select your state.';
    if (!city) nextErrors.city = 'Please select your city.';
    if (!skills.length) nextErrors.skills = 'Please add at least one skill.';

    if (isWorkingProfessional) {
      if (!experience) nextErrors.experience = 'Please select your experience range.';
      if (!techProficiency) nextErrors.techProficiency = 'Please select your tech proficiency.';
      if (!currentDesignation) nextErrors.currentDesignation = 'Please select your current role/designation.';
      if (workSummaryWords > 150) nextErrors.workSummary = 'Work summary must be 150 words or less.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        profileType,
        stream,
        graduationYear,
        institutionName,
        institution: institutionName,
        state,
        city,
        experience: isWorkingProfessional ? experience : '',
        techProficiency: isWorkingProfessional ? techProficiency : '',
        workSummary: isWorkingProfessional ? workSummary.trim() : '',
        currentDesignation: isWorkingProfessional ? currentDesignation : '',
        headline: isWorkingProfessional ? currentDesignation : '',
        skills,
        onboardingCompleted: true,
      });

      const cacheKey = getOnboardingCacheKey(user);
      if (cacheKey) {
        localStorage.setItem(cacheKey, '1');
      }

      const targetPath = user?.role === 'admin'
        ? '/admin/dashboard'
        : user?.role === 'organizer'
          ? '/organizer/dashboard'
          : '/events';
      navigate(targetPath, { replace: true });
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save onboarding details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="onboarding">
      <section className="onboarding__shell">
        <aside className="onboarding__intro">
          <p className="onboarding__kicker">Profile Setup</p>
          <h1>Build your identity in one pass</h1>
          <p className="onboarding__subtitle">Search, select, and save. We use this profile to personalize events, recommendations, and collaboration opportunities.</p>

          <div className="onboarding__progress-card">
            <div>
              <p>Completion</p>
              <h2>{completionPercent}%</h2>
            </div>
            <div
              className="onboarding__progress-ring"
              data-label={`${completionPercent}%`}
              style={{ '--progress': `${Math.max(0, Math.min(100, completionPercent))}%` }}
            />
          </div>

          <div className="onboarding__facts">
            <article>
              <span>Profile Type</span>
              <strong>{roleLabel}</strong>
            </article>
            <article>
              <span>Email</span>
              <strong>{user?.email || 'Unavailable'}</strong>
            </article>
            <article>
              <span>Skills Added</span>
              <strong>{skills.length}</strong>
            </article>
          </div>
        </aside>

        <section className="onboarding__panel">
          {error ? <p className="onboarding__error">{error}</p> : null}

          <form className="onboarding__form" onSubmit={handleSubmit}>
            <div className="onboarding__section-title onboarding__field--full">
              <h3>Basic Information</h3>
              <p>Start with your core identity details.</p>
            </div>

            <label className="onboarding__field">
              <span>What should we call you?</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearFieldError('name');
                }}
                onBlur={() => {
                  if (!name.trim()) setFieldErrors((current) => ({ ...current, name: 'Please add your name.' }));
                }}
                placeholder="Your name"
                required
              />
              {fieldErrors.name ? <small className="onboarding__error-text">{fieldErrors.name}</small> : null}
            </label>

            <label className="onboarding__field">
              <span>How can we reach you?</span>
              <input value={user?.email || ''} readOnly disabled />
              {fieldErrors.email ? <small className="onboarding__error-text">{fieldErrors.email}</small> : null}
            </label>

            <label className="onboarding__field onboarding__field--full">
              <span>Bio (max 100 words)</span>
              <textarea
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value);
                  clearFieldError('bio');
                }}
                rows={4}
                placeholder="Write a short introduction"
              />
              <small>{bioWords}/100 words</small>
              {fieldErrors.bio ? <small className="onboarding__error-text">{fieldErrors.bio}</small> : null}
            </label>

            <div className="onboarding__section-title onboarding__field--full">
              <h3>Academic Details</h3>
              <p>All selections are searchable for faster completion.</p>
            </div>

            <div className="onboarding__field onboarding__field--full">
              <span>You are</span>
              <div className="onboarding__segmented">
                {PROFILE_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`onboarding__segmented-option ${profileType === option.value ? 'is-active' : ''}`}
                    onClick={() => {
                      setProfileType(option.value);
                      clearFieldError('profileType');
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {fieldErrors.profileType ? <small className="onboarding__error-text">{fieldErrors.profileType}</small> : null}
            </div>

            <SearchableDropdown
              label="Stream"
              options={toOptions(STREAM_OPTIONS)}
              value={stream}
              onChange={(value) => {
                setStream(value);
                clearFieldError('stream');
              }}
              placeholder="Search stream"
              error={fieldErrors.stream}
            />

            <SearchableDropdown
              label="Graduation year"
              options={toOptions(graduationYearOptions)}
              value={graduationYear}
              onChange={(value) => {
                setGraduationYear(value);
                clearFieldError('graduationYear');
              }}
              placeholder="Search graduation year"
              error={fieldErrors.graduationYear}
            />

            <label className="onboarding__field">
              <span>Institution name</span>
              <textarea
                value={institutionName}
                onChange={(event) => {
                  setInstitutionName(event.target.value);
                  clearFieldError('institutionName');
                }}
                rows={2}
                placeholder="Type your college name"
              />
              {fieldErrors.institutionName ? <small className="onboarding__error-text">{fieldErrors.institutionName}</small> : null}
            </label>

            <SearchableDropdown
              label="State"
              options={toOptions(STATE_OPTIONS)}
              value={state}
              onChange={(value) => {
                setState(value);
                setCity('');
                clearFieldError('state');
                clearFieldError('city');
              }}
              placeholder="Search state"
              error={fieldErrors.state}
            />

            <SearchableDropdown
              label="City"
              options={toOptions(cityOptions)}
              value={city}
              onChange={(value) => {
                setCity(value);
                clearFieldError('city');
              }}
              placeholder={state ? 'Search city' : 'Select state first'}
              disabled={!state}
              error={fieldErrors.city}
            />

            {isWorkingProfessional ? (
              <>
                <div className="onboarding__section-title onboarding__field--full">
                  <h3>Professional Details</h3>
                  <p>Tell us about your current work profile.</p>
                </div>

                <SearchableDropdown
                  label="Experience"
                  options={toOptions(EXPERIENCE_OPTIONS)}
                  value={experience}
                  onChange={(value) => {
                    setExperience(value);
                    clearFieldError('experience');
                  }}
                  placeholder="Search experience"
                  error={fieldErrors.experience}
                />

                <SearchableDropdown
                  label="Tech proficiency"
                  options={toOptions(TECH_PROFICIENCY_OPTIONS)}
                  value={techProficiency}
                  onChange={(value) => {
                    setTechProficiency(value);
                    clearFieldError('techProficiency');
                  }}
                  placeholder="Search proficiency"
                  error={fieldErrors.techProficiency}
                />

                <SearchableDropdown
                  label="Current role/designation"
                  options={toOptions(DESIGNATION_OPTIONS)}
                  value={currentDesignation}
                  onChange={(value) => {
                    setCurrentDesignation(value);
                    clearFieldError('currentDesignation');
                  }}
                  placeholder="Search designation"
                  error={fieldErrors.currentDesignation}
                />

                <label className="onboarding__field onboarding__field--full">
                  <span>Work summary (max 150 words)</span>
                  <textarea
                    value={workSummary}
                    onChange={(event) => {
                      setWorkSummary(event.target.value);
                      clearFieldError('workSummary');
                    }}
                    rows={4}
                    placeholder="Summarize your current work"
                  />
                  <small>{workSummaryWords}/150 words</small>
                  {fieldErrors.workSummary ? <small className="onboarding__error-text">{fieldErrors.workSummary}</small> : null}
                </label>
              </>
            ) : null}

            <div className="onboarding__section-title onboarding__field--full">
              <h3>Skills</h3>
              <p>Add your strengths to improve recommendations.</p>
            </div>

            <div className="onboarding__field onboarding__field--full">
              <div className="onboarding__skills-row">
                <label className="onboarding__field">
                  <span>Add skill</span>
                  <input
                    value={selectedSkill}
                    onChange={(event) => {
                      setSelectedSkill(event.target.value);
                      clearFieldError('skills');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Search or type your own skill"
                    list="onboarding-skill-options"
                  />
                  <datalist id="onboarding-skill-options">
                    {SKILL_OPTIONS
                      .filter((skill) => !skills.some((selected) => selected.toLowerCase() === skill.toLowerCase()))
                      .map((skill) => (
                        <option key={skill} value={skill} />
                      ))}
                  </datalist>
                </label>
                <button type="button" className="onboarding__add-btn" onClick={addSkill}>Add skill</button>
              </div>
              {fieldErrors.skills ? <small className="onboarding__error-text">{fieldErrors.skills}</small> : null}
              <div className="onboarding__chips">
                {skills.length ? skills.map((skill) => (
                  <button key={skill} type="button" className="onboarding__chip" onClick={() => removeSkill(skill)}>
                    {skill} x
                  </button>
                )) : <p className="onboarding__no-skill">No skills selected yet.</p>}
              </div>
            </div>

            <button type="submit" className="onboarding__submit" disabled={submitting}>
              {submitting ? 'Saving profile...' : 'Save and continue'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
