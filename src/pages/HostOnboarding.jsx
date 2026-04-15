import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, AlertCircle, Building2, MapPin, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './HostOnboarding.css';

const HOST_TYPES = [
  { value: 'hod', label: 'HOD' },
  { value: 'principal', label: 'Principal' },
  { value: 'club_representative', label: 'Club Representative' },
  { value: 'faculty', label: 'Faculty' },
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
    <label className="host-onboarding__field" ref={containerRef}>
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
        <div className="host-onboarding__dropdown">
          {filtered.length ? filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`host-onboarding__option ${value === option.value ? 'is-active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setQuery(option.label);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          )) : <p className="host-onboarding__no-result">No results found</p>}
        </div>
      ) : null}

      {error ? <small className="host-onboarding__error-text">{error}</small> : null}
    </label>
  );
}

function toOptions(items) {
  return items.map((item) => ({ value: item, label: item }));
}

function hasCompletedHostOnboarding(user) {
  if (!user) return false;
  if (user.hostOnboardingCompleted) return true;

  return Boolean(
    String(user.institutionName || '').trim()
    && String(user.hostType || '').trim()
    && String(user.name || '').trim()
    && String(user.phoneNumber || '').trim()
    && String(user.state || '').trim()
    && String(user.city || '').trim()
  );
}

function getHostOnboardingCacheKey(user) {
  const identity = String(user?.id || user?.email || '').trim();
  return identity ? `hm_host_onboarding_completed_${identity}` : '';
}

export default function HostOnboarding() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [institutionName, setInstitutionName] = useState('');
  const [hostType, setHostType] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const cityOptions = useMemo(() => {
    if (!state) return [];
    return INDIA_STATE_CITY[state] || [];
  }, [state]);

  useEffect(() => {
    if (!user) return;

    if (user.role !== 'organizer') {
      navigate('/events', { replace: true });
      return;
    }

    if (hasCompletedHostOnboarding(user)) {
      navigate('/organizer/dashboard', { replace: true });
      return;
    }

    setName(user.name || '');
    setInstitutionName(user.institutionName || '');
    setHostType(user.hostType || '');
    setPhoneNumber(user.phoneNumber || '');
    setState(user.state || '');
    setCity(user.city || '');
  }, [navigate, user]);

  const validate = () => {
    const errors = {};

    if (!institutionName.trim()) {
      errors.institutionName = 'Institute name is required';
    }

    if (!hostType.trim()) {
      errors.hostType = 'Please select who you are';
    }

    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    const phoneRegex = /^[\d\s\-+]{10,}$/;
    if (phoneNumber.trim() && !phoneRegex.test(phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    if (!state.trim()) {
      errors.state = 'State is required';
    }

    if (!city.trim()) {
      errors.city = 'City is required';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      await updateProfile({
        institutionName: institutionName.trim(),
        hostType: hostType.trim(),
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        state: state.trim(),
        city: city.trim(),
        hostOnboardingCompleted: true,
      });

      const cacheKey = getHostOnboardingCacheKey(user);
      if (cacheKey) {
        localStorage.setItem(cacheKey, '1');
      }

      setTimeout(() => {
        navigate('/organizer/dashboard', { replace: true });
      }, 300);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save host information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progressSteps = [
    { label: 'Started', done: true },
    { label: 'Institution details', done: Boolean(institutionName && hostType) },
    { label: 'Contact details', done: Boolean(name && phoneNumber) },
    { label: 'Location', done: Boolean(state && city) },
  ];

  const completedSteps = progressSteps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / progressSteps.length) * 100);

  return (
    <div className="host-onboarding">
      <div className="host-onboarding__shell">
        <aside className="host-onboarding__intro">
          <div className="host-onboarding__progress-wrapper">
            <div className="host-onboarding__progress-label">Profile completion</div>
            <div
              className="host-onboarding__progress-ring"
              style={{ '--progress': `${progress}%` }}
              data-label={`${progress}%`}
            />
          </div>

          <div className="host-onboarding__facts">
            {progressSteps.map((step, index) => (
              <div key={step.label} className={`host-onboarding__fact ${step.done ? 'is-done' : ''}`}>
                <span className="host-onboarding__fact-marker">{step.done ? <CheckCircle size={14} /> : index + 1}</span>
                <p>{step.label}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="host-onboarding__form-wrap">
          <header className="host-onboarding__header">
            <h1>Your Institution Details</h1>
            <p>Tell us about your role and institution so we can personalize your experience.</p>
            <div className="host-onboarding__quick-points" aria-hidden="true">
              <span><Building2 size={16} /> Institution identity</span>
              <span><UserCircle size={16} /> Host contact</span>
              <span><MapPin size={16} /> Campus location</span>
            </div>
          </header>

          <form className="host-onboarding__form" onSubmit={handleSubmit}>
            {error ? (
              <div className="host-onboarding__error-box">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            ) : null}

            <fieldset className="host-onboarding__fieldset">
              <legend className="host-onboarding__legend">Institution Information</legend>

              <label className="host-onboarding__field">
                <span>Institute name</span>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => {
                    setInstitutionName(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.institutionName;
                      return next;
                    });
                  }}
                  placeholder="e.g. Delhi Institute of Technology"
                />
                {fieldErrors.institutionName ? <small className="host-onboarding__error-text">{fieldErrors.institutionName}</small> : null}
              </label>

              <SearchableDropdown
                label="Who are you?"
                options={HOST_TYPES}
                value={hostType}
                onChange={(value) => {
                  setHostType(value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.hostType;
                    return next;
                  });
                }}
                placeholder="Select your role"
                error={fieldErrors.hostType}
              />
            </fieldset>

            <fieldset className="host-onboarding__fieldset">
              <legend className="host-onboarding__legend">Personal Information</legend>

              <label className="host-onboarding__field">
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }}
                  placeholder="Your full name"
                />
                {fieldErrors.name ? <small className="host-onboarding__error-text">{fieldErrors.name}</small> : null}
              </label>

              <label className="host-onboarding__field">
                <span>Phone number</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.phoneNumber;
                      return next;
                    });
                  }}
                  placeholder="10-digit phone number"
                />
                {fieldErrors.phoneNumber ? <small className="host-onboarding__error-text">{fieldErrors.phoneNumber}</small> : null}
              </label>
            </fieldset>

            <fieldset className="host-onboarding__fieldset">
              <legend className="host-onboarding__legend">Location</legend>

              <SearchableDropdown
                label="State"
                options={toOptions(STATE_OPTIONS)}
                value={state}
                onChange={(value) => {
                  setState(value);
                  setCity('');
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.state;
                    return next;
                  });
                }}
                placeholder="Select your state"
                error={fieldErrors.state}
              />

              <SearchableDropdown
                label="City"
                options={toOptions(cityOptions)}
                value={city}
                onChange={(value) => {
                  setCity(value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.city;
                    return next;
                  });
                }}
                placeholder={state ? 'Select your city' : 'Select state first'}
                disabled={!state}
                error={fieldErrors.city}
              />
            </fieldset>

            <button
              type="submit"
              className="host-onboarding__submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Setting up...' : (
                <>
                  Complete Setup <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
