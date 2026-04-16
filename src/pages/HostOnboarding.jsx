import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, AlertCircle, Building2, MapPin, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './HostOnboarding.css';

const ORGANIZATION_TYPES = [
  { value: 'ngo', label: 'NGO' },
  { value: 'social_enterprise', label: 'Social Enterprise' },
  { value: 'startup', label: 'Startup' },
  { value: 'nonprofit', label: 'Nonprofit' },
];

const CORPORATE_SECTORS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'others', label: 'Others' },
];

const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'training_center', label: 'Training Center' },
];

const HOST_TYPES = [
  { value: 'hod', label: 'HOD' },
  { value: 'principal', label: 'Principal' },
  { value: 'club_representative', label: 'Club Representative' },
  { value: 'faculty', label: 'Faculty' },
];

const HOST_CATEGORIES = [
  { value: 'institution', label: 'Institution', icon: '🏫' },
  { value: 'organisation', label: 'Organisation', icon: '🏢' },
  { value: 'corporate', label: 'Corporate', icon: '💼' },
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

  // Host category state (institution, organisation, corporate)
  const [hostCategory, setHostCategory] = useState('');

  // Common fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // Institution specific
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [hostType, setHostType] = useState('');

  // Organisation specific
  const [organisationName, setOrganisationName] = useState('');
  const [organisationType, setOrganisationType] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Corporate specific
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [hrContactPerson, setHrContactPerson] = useState('');

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

    // Initialize fields
    setName(user.name || '');
    setPhoneNumber(user.phoneNumber || '');
    setEmail(user.email || '');
    setState(user.state || '');
    setCity(user.city || '');
    setHostCategory(user.hostCategory || '');

    // Institution fields
    setInstitutionName(user.institutionName || '');
    setInstitutionType(user.institutionType || '');
    setHostType(user.hostType || '');

    // Organisation fields
    setOrganisationName(user.organisationName || '');
    setOrganisationType(user.organisationType || '');
    setContactPerson(user.contactPerson || '');

    // Corporate fields
    setCompanyName(user.companyName || '');
    setIndustry(user.industry || '');
    setRegistrationNumber(user.registrationNumber || '');
    setHrContactPerson(user.hrContactPerson || '');
  }, [navigate, user]);

  const validate = () => {
    const errors = {};

    // Common validation
    if (!hostCategory.trim()) {
      errors.hostCategory = 'Please select a category';
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

    // Institution validation
    if (hostCategory === 'institution') {
      if (!institutionName.trim()) {
        errors.institutionName = 'Institution name is required';
      }
      if (!institutionType.trim()) {
        errors.institutionType = 'Institution type is required';
      }
      if (!hostType.trim()) {
        errors.hostType = 'Please select your role';
      }
    }

    // Organisation validation
    if (hostCategory === 'organisation') {
      if (!organisationName.trim()) {
        errors.organisationName = 'Organisation name is required';
      }
      if (!organisationType.trim()) {
        errors.organisationType = 'Organisation type is required';
      }
      if (!contactPerson.trim()) {
        errors.contactPerson = 'Contact person name is required';
      }
    }

    // Corporate validation
    if (hostCategory === 'corporate') {
      if (!companyName.trim()) {
        errors.companyName = 'Company name is required';
      }
      if (!industry.trim()) {
        errors.industry = 'Industry/Sector is required';
      }
      if (!registrationNumber.trim()) {
        errors.registrationNumber = 'Company registration number is required';
      }
      if (!hrContactPerson.trim()) {
        errors.hrContactPerson = 'Contact person (HR/Manager) name is required';
      }
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
      const profileData = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        state: state.trim(),
        city: city.trim(),
        hostCategory: hostCategory.trim(),
        hostOnboardingCompleted: true,
      };

      // Add type-specific fields
      if (hostCategory === 'institution') {
        profileData.institutionName = institutionName.trim();
        profileData.institutionType = institutionType.trim();
        profileData.hostType = hostType.trim();
      } else if (hostCategory === 'organisation') {
        profileData.organisationName = organisationName.trim();
        profileData.organisationType = organisationType.trim();
        profileData.contactPerson = contactPerson.trim();
      } else if (hostCategory === 'corporate') {
        profileData.companyName = companyName.trim();
        profileData.industry = industry.trim();
        profileData.registrationNumber = registrationNumber.trim();
        profileData.hrContactPerson = hrContactPerson.trim();
      }

      await updateProfile(profileData);

      const cacheKey = getHostOnboardingCacheKey(user);
      if (cacheKey) {
        localStorage.setItem(cacheKey, '1');
      }

      setTimeout(() => {
        navigate('/organizer/dashboard', { replace: true });
      }, 300);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progressSteps = useMemo(() => {
    const steps = [
      { label: 'Started', done: true },
      { label: 'Select category', done: Boolean(hostCategory) },
    ];

    if (hostCategory === 'institution') {
      steps.push(
        { label: 'Institution details', done: Boolean(institutionName && institutionType && hostType) },
        { label: 'Contact details', done: Boolean(name && phoneNumber) },
        { label: 'Location', done: Boolean(state && city) }
      );
    } else if (hostCategory === 'organisation') {
      steps.push(
        { label: 'Organisation details', done: Boolean(organisationName && organisationType) },
        { label: 'Contact details', done: Boolean(contactPerson && phoneNumber && name) },
        { label: 'Location', done: Boolean(state && city) }
      );
    } else if (hostCategory === 'corporate') {
      steps.push(
        { label: 'Company details', done: Boolean(companyName && industry && registrationNumber) },
        { label: 'Contact details', done: Boolean(hrContactPerson && phoneNumber && name) },
        { label: 'Location', done: Boolean(state && city) }
      );
    }

    return steps;
  }, [hostCategory, institutionName, institutionType, hostType, name, phoneNumber, state, city, organisationName, organisationType, contactPerson, companyName, industry, registrationNumber, hrContactPerson]);

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
            <h1>Get Started as a Host</h1>
            <p>Select your category and provide details so we can personalize your experience.</p>
          </header>

          <div className="host-onboarding__category-selector">
            <p className="host-onboarding__category-label">What type of host are you?</p>
            <div className="host-onboarding__category-buttons">
              {HOST_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={`host-onboarding__category-btn ${hostCategory === category.value ? 'is-active' : ''}`}
                  onClick={() => {
                    setHostCategory(category.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.hostCategory;
                      return next;
                    });
                  }}
                >
                  <span className="host-onboarding__category-icon">{category.icon}</span>
                  <span className="host-onboarding__category-name">{category.label}</span>
                </button>
              ))}
            </div>
            {fieldErrors.hostCategory ? <small className="host-onboarding__error-text">{fieldErrors.hostCategory}</small> : null}
          </div>

          <form className="host-onboarding__form" onSubmit={handleSubmit}>
            {error ? (
              <div className="host-onboarding__error-box">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
            ) : null}

            {/* INSTITUTION FORM */}
            {hostCategory === 'institution' && (
              <>
                <fieldset className="host-onboarding__fieldset">
                  <legend className="host-onboarding__legend">Institution Information</legend>

                  <label className="host-onboarding__field">
                    <span>Institution name</span>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => {
                        setInstitutionName(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.institutionName; return next; });
                      }}
                      placeholder="e.g. Delhi Institute of Technology"
                    />
                    {fieldErrors.institutionName ? <small className="host-onboarding__error-text">{fieldErrors.institutionName}</small> : null}
                  </label>

                  <SearchableDropdown
                    label="Institution type"
                    options={INSTITUTION_TYPES}
                    value={institutionType}
                    onChange={(value) => {
                      setInstitutionType(value);
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.institutionType; return next; });
                    }}
                    placeholder="Select institution type"
                    error={fieldErrors.institutionType}
                  />

                  <SearchableDropdown
                    label="Your role"
                    options={HOST_TYPES}
                    value={hostType}
                    onChange={(value) => {
                      setHostType(value);
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.hostType; return next; });
                    }}
                    placeholder="Select your role"
                    error={fieldErrors.hostType}
                  />
                </fieldset>
              </>
            )}

            {/* ORGANISATION FORM */}
            {hostCategory === 'organisation' && (
              <>
                <fieldset className="host-onboarding__fieldset">
                  <legend className="host-onboarding__legend">Organisation Information</legend>

                  <label className="host-onboarding__field">
                    <span>Organisation name</span>
                    <input
                      type="text"
                      value={organisationName}
                      onChange={(e) => {
                        setOrganisationName(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.organisationName; return next; });
                      }}
                      placeholder="e.g. Social Impact Initiative"
                    />
                    {fieldErrors.organisationName ? <small className="host-onboarding__error-text">{fieldErrors.organisationName}</small> : null}
                  </label>

                  <SearchableDropdown
                    label="Organisation type"
                    options={ORGANIZATION_TYPES}
                    value={organisationType}
                    onChange={(value) => {
                      setOrganisationType(value);
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.organisationType; return next; });
                    }}
                    placeholder="Select organisation type"
                    error={fieldErrors.organisationType}
                  />
                </fieldset>
              </>
            )}

            {/* CORPORATE FORM */}
            {hostCategory === 'corporate' && (
              <>
                <fieldset className="host-onboarding__fieldset">
                  <legend className="host-onboarding__legend">Company Information</legend>

                  <label className="host-onboarding__field">
                    <span>Company name</span>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.companyName; return next; });
                      }}
                      placeholder="e.g. Tech Solutions Ltd."
                    />
                    {fieldErrors.companyName ? <small className="host-onboarding__error-text">{fieldErrors.companyName}</small> : null}
                  </label>

                  <SearchableDropdown
                    label="Industry/Sector"
                    options={CORPORATE_SECTORS}
                    value={industry}
                    onChange={(value) => {
                      setIndustry(value);
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.industry; return next; });
                    }}
                    placeholder="Select industry"
                    error={fieldErrors.industry}
                  />

                  <label className="host-onboarding__field">
                    <span>Company registration number</span>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => {
                        setRegistrationNumber(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.registrationNumber; return next; });
                      }}
                      placeholder="e.g. CIN or GST number"
                    />
                    {fieldErrors.registrationNumber ? <small className="host-onboarding__error-text">{fieldErrors.registrationNumber}</small> : null}
                  </label>
                </fieldset>
              </>
            )}

            {/* COMMON FIELDS - Contact Details */}
            {hostCategory && (
              <>
                <fieldset className="host-onboarding__fieldset">
                  <legend className="host-onboarding__legend">Contact Person Details</legend>

                  {hostCategory === 'corporate' && (
                    <label className="host-onboarding__field">
                      <span>Contact person (HR/Manager)</span>
                      <input
                        type="text"
                        value={hrContactPerson}
                        onChange={(e) => {
                          setHrContactPerson(e.target.value);
                          setFieldErrors((prev) => { const next = { ...prev }; delete next.hrContactPerson; return next; });
                        }}
                        placeholder="Full name"
                      />
                      {fieldErrors.hrContactPerson ? <small className="host-onboarding__error-text">{fieldErrors.hrContactPerson}</small> : null}
                    </label>
                  )}

                  {hostCategory === 'organisation' && (
                    <label className="host-onboarding__field">
                      <span>Contact person name</span>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => {
                          setContactPerson(e.target.value);
                          setFieldErrors((prev) => { const next = { ...prev }; delete next.contactPerson; return next; });
                        }}
                        placeholder="Full name"
                      />
                      {fieldErrors.contactPerson ? <small className="host-onboarding__error-text">{fieldErrors.contactPerson}</small> : null}
                    </label>
                  )}

                  <label className="host-onboarding__field">
                    <span>Your name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.name; return next; });
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
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.phoneNumber; return next; });
                      }}
                      placeholder="10-digit phone number"
                    />
                    {fieldErrors.phoneNumber ? <small className="host-onboarding__error-text">{fieldErrors.phoneNumber}</small> : null}
                  </label>

                  <label className="host-onboarding__field">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
                      }}
                      placeholder="your.email@example.com"
                    />
                    {fieldErrors.email ? <small className="host-onboarding__error-text">{fieldErrors.email}</small> : null}
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
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.state; return next; });
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
                      setFieldErrors((prev) => { const next = { ...prev }; delete next.city; return next; });
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
              </>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
