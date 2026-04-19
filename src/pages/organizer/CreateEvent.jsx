import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { eventCategories, eventModes } from '../../utils/sampleData';
import Input from '../../components/ui/Input';
import Stepper, { Step } from '../../components/ui/Stepper';
import Modal from '../../components/ui/Modal';
import './CreateEvent.css';

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_DOC_BYTES = 900 * 1024;

export default function CreateEvent() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const { createEvent, updateEvent, getEventById } = useEvents();
  const isEditMode = Boolean(eventId);
  const targetEvent = isEditMode ? getEventById(eventId) : null;
  const didInitializeRef = useRef(false);

  const [activeStep, setActiveStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    category: 'Hackathon',
    mode: 'Hybrid',
    description: '',
    shortDescription: '',
    venue: '',
    fee: '',
    maxParticipants: 100,
    teamMin: '',
    teamMax: '',
    regStart: '',
    regEnd: '',
    eventStart: '',
    eventEnd: '',
    themes: '',
    organizerContactEmail: user?.email || '',
    organizerContactPhone: user?.phoneNumber || '',
    faq1q: '',
    faq1a: '',
    faq2q: '',
    faq2a: '',
    credentialEnabled: true,
    credentialTemplate: 'Classic',
    credentialTitle: 'Certificate of Achievement',
    credentialSubtitle: 'This certificate is proudly presented to',
    credentialDescription: '',
    credentialSignatoryName: user?.spocName || user?.name || '',
    credentialSignatoryRole: 'Event Host',
    credentialLogoUrl: '',
    credentialSponsorLogoUrl: '',
    mapLink: '',
  });
  const [sections, setSections] = useState({
    timeline: true,
    rules: true,
    problems: true,
    maps: true,
    media: true,
  });
  const [timelineItems, setTimelineItems] = useState([
    { title: 'Registration Opens', date: '', description: '' },
  ]);
  const [rules, setRules] = useState(['']);
  const [problemStatements, setProblemStatements] = useState([{ psId: '', psDescription: '', psStatement: '' }]);
  const [subEvents, setSubEvents] = useState([]);
  const [prizes, setPrizes] = useState([{ rank: '1st Place', reward: '' }]);
  const [posterImage, setPosterImage] = useState('');
  const [showcaseImage, setShowcaseImage] = useState('');
  const [validationToast, setValidationToast] = useState({ visible: false, message: '' });
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);

  const updateListItem = (setter, index, value) => {
    setter((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addListItem = (setter, template) => setter((prev) => [...prev, template]);
  const removeListItem = (setter, index) => setter((prev) => prev.filter((_, idx) => idx !== index));

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const normalizeProblemStatements = (incoming) => {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return [{ psId: '', psDescription: '', psStatement: '' }];
    }

    const normalized = incoming
      .map((entry) => {
        if (typeof entry === 'string') {
          return { psId: '', psDescription: '', psStatement: entry };
        }

        const obj = entry || {};
        return {
          psId: String(obj.psId || '').trim(),
          psDescription: String(obj.psDescription || obj.description || '').trim(),
          psStatement: String(obj.psStatement || obj.statement || obj.title || '').trim(),
        };
      })
      .filter((entry) => entry.psId || entry.psDescription || entry.psStatement);

    return normalized.length > 0 ? normalized : [{ psId: '', psDescription: '', psStatement: '' }];
  };

  const normalizeSubEvents = (incoming) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return [];

    return incoming.map((item) => {
      const milestones = Array.isArray(item?.milestones)
        ? item.milestones.map((milestone) => ({
            title: String(milestone?.title || '').trim(),
            date: String(milestone?.date || '').trim(),
            description: String(milestone?.description || '').trim(),
          }))
        : [];

      return {
        title: String(item?.title || '').trim(),
        startDate: String(item?.startDate || '').trim(),
        endDate: String(item?.endDate || '').trim(),
        description: String(item?.description || '').trim(),
        milestones,
      };
    });
  };

  const updateSubEvent = (index, key, value) => {
    setSubEvents((prev) => prev.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)));
  };

  const addSubEvent = () => {
    setSubEvents((prev) => [
      ...prev,
      {
        title: '',
        startDate: '',
        endDate: '',
        description: '',
        milestones: [{ title: '', date: '', description: '' }],
      },
    ]);
  };

  const removeSubEvent = (index) => {
    setSubEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubEventMilestone = (subEventIndex, milestoneIndex, key, value) => {
    setSubEvents((prev) =>
      prev.map((subEvent, i) => {
        if (i !== subEventIndex) return subEvent;
        return {
          ...subEvent,
          milestones: (subEvent.milestones || []).map((milestone, j) =>
            j === milestoneIndex ? { ...milestone, [key]: value } : milestone
          ),
        };
      })
    );
  };

  const addSubEventMilestone = (subEventIndex) => {
    setSubEvents((prev) =>
      prev.map((subEvent, i) =>
        i === subEventIndex
          ? {
              ...subEvent,
              milestones: [...(subEvent.milestones || []), { title: '', date: '', description: '' }],
            }
          : subEvent
      )
    );
  };

  const removeSubEventMilestone = (subEventIndex, milestoneIndex) => {
    setSubEvents((prev) =>
      prev.map((subEvent, i) => {
        if (i !== subEventIndex) return subEvent;
        const nextMilestones = (subEvent.milestones || []).filter((_, j) => j !== milestoneIndex);
        return {
          ...subEvent,
          milestones: nextMilestones.length > 0 ? nextMilestones : [{ title: '', date: '', description: '' }],
        };
      })
    );
  };

  useEffect(() => {
    if (!isEditMode || !targetEvent || didInitializeRef.current) return;

    const timeline = targetEvent.timeline || {};
    const credentialConfig = targetEvent.credentialConfig || {};

    setForm({
      title: targetEvent.title || '',
      category: targetEvent.category || 'Hackathon',
      mode: targetEvent.mode || 'Hybrid',
      description: targetEvent.description || '',
      shortDescription: targetEvent.shortDescription || '',
      venue: targetEvent.venue || targetEvent.location || '',
      fee: targetEvent.fee || '',
      maxParticipants: targetEvent.maxParticipants || 100,
      teamMin: targetEvent.teamSize?.min || '',
      teamMax: targetEvent.teamSize?.max || '',
      regStart: timeline.registrationStart || '',
      regEnd: timeline.registrationEnd || '',
      eventStart: timeline.eventStart || '',
      eventEnd: timeline.eventEnd || '',
      themes: Array.isArray(targetEvent.themes)
        ? targetEvent.themes.join(', ')
        : Array.isArray(targetEvent.tags)
          ? targetEvent.tags.join(', ')
          : '',
      organizerContactEmail:
        targetEvent.organiser?.email ||
        targetEvent.organizer?.email ||
        user?.email ||
        '',
      organizerContactPhone:
        targetEvent.organiser?.phone ||
        targetEvent.organizer?.phone ||
        user?.phoneNumber ||
        '',
      faq1q: targetEvent.faqs?.[0]?.q || '',
      faq1a: targetEvent.faqs?.[0]?.a || '',
      faq2q: targetEvent.faqs?.[1]?.q || '',
      faq2a: targetEvent.faqs?.[1]?.a || '',
      credentialEnabled: Boolean(targetEvent.credentialEnabled),
      credentialTemplate: targetEvent.credentialTemplate || 'Classic',
      credentialTitle: credentialConfig.title || 'Certificate of Achievement',
      credentialSubtitle: credentialConfig.subtitle || 'This certificate is proudly presented to',
      credentialDescription: credentialConfig.description || '',
      credentialSignatoryName: credentialConfig.signatoryName || user?.spocName || user?.name || '',
      credentialSignatoryRole: credentialConfig.signatoryRole || 'Event Host',
      credentialLogoUrl: credentialConfig.logoUrl || '',
      credentialSponsorLogoUrl: credentialConfig.sponsorLogoUrl || '',
      mapLink: targetEvent.mapLink || '',
    });

    setSections({
      timeline: targetEvent.sections?.timeline ?? true,
      rules: targetEvent.sections?.rules ?? true,
      problems: targetEvent.sections?.problems ?? true,
      maps: targetEvent.sections?.maps ?? true,
      media: targetEvent.sections?.media ?? true,
    });

    setTimelineItems(
      Array.isArray(targetEvent.timelineItems) && targetEvent.timelineItems.length
        ? targetEvent.timelineItems
        : [{ title: 'Registration Opens', date: '', description: '' }]
    );
    setPrizes(
      Array.isArray(targetEvent.prizes) && targetEvent.prizes.length
        ? targetEvent.prizes
        : [{ rank: '1st Place', reward: '' }]
    );
    setRules(Array.isArray(targetEvent.rules) && targetEvent.rules.length ? targetEvent.rules : ['']);
    setProblemStatements(
      normalizeProblemStatements(targetEvent.problemStatements)
    );
    setSubEvents(normalizeSubEvents(targetEvent.subEvents));
    setPosterImage(
      targetEvent.posterImage ||
      targetEvent.bannerImages?.[0] ||
      targetEvent.media?.banners?.[0] ||
      ''
    );
    setShowcaseImage(
      targetEvent.showcaseImage ||
      targetEvent.galleryImages?.[0] ||
      targetEvent.media?.gallery?.[0] ||
      ''
    );

    didInitializeRef.current = true;
  }, [isEditMode, targetEvent, user?.name, user?.spocName, user?.email, user?.phoneNumber]);

  const convertFileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const estimateDataUrlBytes = (value) => {
    const raw = String(value || '').trim();
    if (!raw.startsWith('data:image/')) return 0;

    const payload = raw.split(',')[1] || '';
    if (!payload) return 0;

    return Math.floor((payload.replace(/\s+/g, '').length * 3) / 4);
  };

  const estimateJsonBytes = (value) => {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  };

  const isDataImageSrc = (value) => String(value || '').trim().startsWith('data:image/');

  const handleMediaUpload = async (event, setTargetValue) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (file.size > MAX_IMAGE_BYTES) {
      showValidationToast('Image must be 1MB or smaller.');
      event.target.value = '';
      return;
    }

    const encoded = await convertFileToDataUrl(file);
    // Keep exact uploaded quality: no canvas processing or compression.
    setTargetValue(encoded);
    event.target.value = '';
  };

  const handleSingleImageUpload = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (file.size > MAX_IMAGE_BYTES) {
      showValidationToast('Image must be 1MB or smaller.');
      event.target.value = '';
      return;
    }

    const encoded = await convertFileToDataUrl(file);
    update(field, encoded);
    event.target.value = '';
  };

  const showValidationToast = (message) => {
    setValidationToast({ visible: true, message });
    window.setTimeout(() => {
      setValidationToast((current) =>
        current.message === message ? { visible: false, message: '' } : current
      );
    }, 2600);
  };

  const hasNonEmptyItem = (list) => Array.isArray(list) && list.some((item) => String(item || '').trim());
  const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim());
  const isValidPhone = (phone) => /^\d{10}$/.test(String(phone || '').trim());

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.title.trim()) return { ok: false, reason: 'Add an event title to continue.' };
      if (!form.shortDescription.trim()) return { ok: false, reason: 'Add a short description to continue.' };
      if (!form.description.trim()) return { ok: false, reason: 'Add a full description to continue.' };
      if (!form.organizerContactEmail.trim()) return { ok: false, reason: 'Organizer contact email is required.' };
      if (!isValidEmail(form.organizerContactEmail)) return { ok: false, reason: 'Enter a valid organizer contact email.' };
      if (!form.organizerContactPhone.trim()) return { ok: false, reason: 'Organizer contact phone is required.' };
      if (!isValidPhone(form.organizerContactPhone)) return { ok: false, reason: 'Enter a valid 10-digit organizer contact phone number.' };
      return { ok: true };
    }

    if (step === 2) {
      if (!form.venue.trim()) return { ok: false, reason: 'Add venue or platform details to continue.' };
      if (!form.regStart || !form.regEnd) return { ok: false, reason: 'Set registration start and end dates.' };
      if (!form.eventStart || !form.eventEnd) return { ok: false, reason: 'Set event start and end dates.' };

      const regStartMs = new Date(form.regStart).getTime();
      const regEndMs = new Date(form.regEnd).getTime();
      const eventStartMs = new Date(form.eventStart).getTime();
      const eventEndMs = new Date(form.eventEnd).getTime();

      if (regEndMs < regStartMs) return { ok: false, reason: 'Registration end must be after registration start.' };
      if (eventEndMs < eventStartMs) return { ok: false, reason: 'Event end must be after event start.' };
      return { ok: true };
    }

    if (step === 3) {
      if (sections.media) {
        if (!String(posterImage || '').trim()) {
          return { ok: false, reason: 'Upload or paste one poster image to continue.' };
        }
        if (!String(showcaseImage || '').trim()) {
          return { ok: false, reason: 'Upload or paste one showcase image to continue.' };
        }
      }

      if (sections.rules && !hasNonEmptyItem(rules)) {
        return { ok: false, reason: 'Add at least one rule or hide the Rules section.' };
      }

      if (
        sections.problems &&
        !problemStatements.some((item) =>
          String(item?.psId || '').trim() ||
          String(item?.psDescription || '').trim() ||
          String(item?.psStatement || '').trim()
        )
      ) {
        return { ok: false, reason: 'Add at least one problem statement or hide that section.' };
      }

      if (sections.maps && !String(form.mapLink || '').trim()) {
        return { ok: false, reason: 'Add a map link or hide the Maps section.' };
      }

      if (sections.timeline && !timelineItems.some((item) => item.title || item.date || item.description)) {
        return { ok: false, reason: 'Add one timeline milestone or hide the Timeline section.' };
      }

      return { ok: true };
    }

    return { ok: true };
  };

  const handleBeforeStepChange = ({ currentStep, targetStep }) => {
    if (targetStep <= currentStep) return true;
    return validateStep(currentStep);
  };

  const handleSubmit = async () => {
    const normalizedPosterImage = String(posterImage || '').trim();
    const normalizedShowcaseImage = String(showcaseImage || '').trim();

    const posterBytes = estimateDataUrlBytes(normalizedPosterImage);
    if (posterBytes > MAX_IMAGE_BYTES) {
      showValidationToast('Poster image must be 1MB or smaller.');
      return false;
    }

    const showcaseBytes = estimateDataUrlBytes(normalizedShowcaseImage);
    if (showcaseBytes > MAX_IMAGE_BYTES) {
      showValidationToast('Showcase image must be 1MB or smaller.');
      return false;
    }

    const includePosterInLegacyCollections = normalizedPosterImage && !isDataImageSrc(normalizedPosterImage);
    const includeShowcaseInLegacyCollections = normalizedShowcaseImage && !isDataImageSrc(normalizedShowcaseImage);

    const organiser = {
      name: user?.organizationName || user?.name,
      logo: '',
      id: user?.id,
      email: String(form.organizerContactEmail || '').trim(),
      phone: String(form.organizerContactPhone || '').trim(),
    };

    const eventPayload = {
      title: form.title,
      category: form.category,
      mode: form.mode,
      status: targetEvent?.status || 'open',
      description: form.description,
      shortDescription: form.shortDescription,
      organiser,
      organizer: organiser,
      timeline: {
        registrationStart: form.regStart,
        registrationEnd: form.regEnd,
        eventStart: form.eventStart,
        eventEnd: form.eventEnd,
      },
      venue: form.venue,
      fee: form.fee,
      prizes: prizes.map(p => ({ rank: String(p.rank || '').trim(), reward: String(p.reward || '').trim() })).filter(p => p.rank || p.reward),
      maxParticipants: parseInt(form.maxParticipants, 10) || 100,
      teamSize:
        form.teamMin && form.teamMax
          ? { min: parseInt(form.teamMin, 10), max: parseInt(form.teamMax, 10) }
          : null,
      tags: form.themes
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      themes: form.themes
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      sections,
      mapLink: form.mapLink,
      location: form.venue,
      timelineItems: sections.timeline
        ? timelineItems.filter((item) => item.title || item.date || item.description)
        : [],
      rules: sections.rules ? rules.map((item) => item.trim()).filter(Boolean) : [],
      problemStatements: sections.problems
        ? problemStatements
            .map((item) => ({
              psId: String(item.psId || '').trim(),
              psDescription: String(item.psDescription || '').trim(),
              psStatement: String(item.psStatement || '').trim(),
            }))
            .filter((item) => item.psId || item.psDescription || item.psStatement)
        : [],
      subEvents: subEvents
        .map((subEvent) => ({
          title: String(subEvent.title || '').trim(),
          startDate: String(subEvent.startDate || '').trim(),
          endDate: String(subEvent.endDate || '').trim(),
          description: String(subEvent.description || '').trim(),
          milestones: (subEvent.milestones || [])
            .map((milestone) => ({
              title: String(milestone.title || '').trim(),
              date: String(milestone.date || '').trim(),
              description: String(milestone.description || '').trim(),
            }))
            .filter((milestone) => milestone.title || milestone.date || milestone.description),
        }))
        .filter((subEvent) => subEvent.title || subEvent.startDate || subEvent.endDate || subEvent.description || subEvent.milestones.length > 0),
      bannerImages: includePosterInLegacyCollections ? [normalizedPosterImage] : [],
      galleryImages: includeShowcaseInLegacyCollections ? [normalizedShowcaseImage] : [],
      posterImage: normalizedPosterImage,
      showcaseImage: normalizedShowcaseImage,
      media: sections.media
        ? {
            banners: includePosterInLegacyCollections ? [normalizedPosterImage] : [],
            gallery: includeShowcaseInLegacyCollections ? [normalizedShowcaseImage] : [],
          }
        : { banners: [], gallery: [] },
      faqs: [
        form.faq1q && form.faq1a ? { q: form.faq1q, a: form.faq1a } : null,
        form.faq2q && form.faq2a ? { q: form.faq2q, a: form.faq2a } : null,
      ].filter(Boolean),
      imageUrl: '',
      credentialEnabled: form.credentialEnabled,
      credentialTemplate: form.credentialTemplate,
      credentialConfig: {
        title: form.credentialTitle,
        subtitle: form.credentialSubtitle,
        description: form.credentialDescription,
        signatoryName: form.credentialSignatoryName,
        signatoryRole: form.credentialSignatoryRole,
        logoUrl: form.credentialLogoUrl,
        sponsorLogoUrl: form.credentialSponsorLogoUrl,
      },
    };

    const estimatedDocBytes = estimateJsonBytes(eventPayload);
    if (estimatedDocBytes > MAX_EVENT_DOC_BYTES) {
      showValidationToast('Event payload is too large for Firestore. Use smaller images or external image URLs.');
      return false;
    }

    if (isEditMode && targetEvent) {
      updateEvent(targetEvent.id, eventPayload);
      navigate('/organizer/dashboard');
      return true;
    } else {
      const result = await createEvent(eventPayload);
      if (!result?.success) {
        if (result?.suspended) {
          setShowSuspendedModal(true);
          return false;
        }
        showValidationToast(result?.error || 'Unable to create event.');
        return false;
      }
      navigate('/organizer/dashboard');
      return true;
    }
  };

  return (
    <div className="create-event">
      <section className="create-event__hero">
        <div className="container">
          <button className="create-event__back" onClick={() => navigate('/organizer/dashboard')}>
            <ArrowLeft size={18} /> Back to Console
          </button>
          <h1>{isEditMode ? 'Edit Event' : 'Architect Your Event'}</h1>
          <p>{isEditMode ? 'Update event details, media, and settings.' : 'Build your event in 3 guided steps.'}</p>
        </div>
      </section>

      <section className="container create-event__form-wrapper">
        <Stepper
          initialStep={1}
          onStepChange={setActiveStep}
          onFinalStepCompleted={handleSubmit}
          onBeforeStepChange={handleBeforeStepChange}
          onStepChangeBlocked={({ reason }) => {
            showValidationToast(reason || 'Please complete required fields before continuing.');
          }}
          nextButtonText="Continue"
          backButtonText="Back"
          stepCircleContainerClassName="create-event__stepper"
          contentClassName="create-event__content"
          footerClassName="create-event__footer"
        >
          <Step>
            <div className="create-event__step-content">
              <h2>Basic Information</h2>
              <div className="create-event__fields">
                <Input
                  label="Event Title"
                  icon={Type}
                  placeholder="e.g. Neural Nexus Hackathon"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                />

                <div className="create-event__row">
                  <div className="create-event__select-group">
                    <label className="input-label">Category</label>
                    <select className="create-event__select" value={form.category} onChange={(e) => update('category', e.target.value)}>
                      {eventCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="create-event__select-group">
                    <label className="input-label">Mode</label>
                    <select className="create-event__select" value={form.mode} onChange={(e) => update('mode', e.target.value)}>
                      {eventModes.map((eventMode) => (
                        <option key={eventMode} value={eventMode}>{eventMode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Short Description"
                  placeholder="One-liner about your event"
                  value={form.shortDescription}
                  onChange={(e) => update('shortDescription', e.target.value)}
                />

                <Input
                  label="Full Description"
                  type="textarea"
                  placeholder="Detailed event description"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />

                <Input
                  label="Themes (comma separated)"
                  icon={Tag}
                  placeholder="Hackathon, Coding Competition, AI Sprint"
                  value={form.themes}
                  onChange={(e) => update('themes', e.target.value)}
                />

                <div className="create-event__row">
                  <Input
                    label="Organizer Contact Email"
                    icon={Mail}
                    placeholder="organizer@institution.edu"
                    value={form.organizerContactEmail}
                    onChange={(e) => update('organizerContactEmail', e.target.value)}
                    required
                  />
                  <Input
                    label="Organizer Contact Phone"
                    icon={Phone}
                    placeholder="9876543210"
                    value={form.organizerContactPhone}
                    onChange={(e) => update('organizerContactPhone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </Step>

          <Step>
            <div className="create-event__step-content">
              <h2>Logistics & Timeline</h2>
              <div className="create-event__fields">
                <Input
                  label="Venue / Platform"
                  icon={MapPin}
                  placeholder="Location or virtual link"
                  value={form.venue}
                  onChange={(e) => update('venue', e.target.value)}
                />

                <div className="create-event__row z-[20]">
                  <Input label="Entry Fee (Optional)" placeholder="e.g. Free, INR 500" value={form.fee} onChange={(e) => update('fee', e.target.value)} />
                  <Input
                    label="Max Participants"
                    type="number"
                    placeholder="100"
                    value={form.maxParticipants}
                    onChange={(e) => update('maxParticipants', e.target.value)}
                  />
                </div>

                <div className="create-event__dynamic-list mt-8 mb-6 z-[20]">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-semibold text-sm">Prize Money / Rewards</label>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setPrizes, { rank: '', reward: '' })}>
                      <Plus size={14} /> Add Tier
                    </button>
                  </div>
                  {prizes.map((item, index) => (
                    <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl flex gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Rank (e.g. 1st Place)"
                          value={item.rank}
                          onChange={(e) => updateListItem(setPrizes, index, { ...item, rank: e.target.value })}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Reward (e.g. ₹50,000 or Macbook)"
                          value={item.reward}
                          onChange={(e) => updateListItem(setPrizes, index, { ...item, reward: e.target.value })}
                        />
                      </div>
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100" onClick={() => removeListItem(setPrizes, index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>


                <div className="create-event__row">
                  <Input
                    label="Min Team Size"
                    type="number"
                    placeholder="Leave blank for individual"
                    value={form.teamMin}
                    onChange={(e) => update('teamMin', e.target.value)}
                  />
                  <Input
                    label="Max Team Size"
                    type="number"
                    placeholder="Leave blank for individual"
                    value={form.teamMax}
                    onChange={(e) => update('teamMax', e.target.value)}
                  />
                </div>

                <div className="create-event__row">
                  <Input label="Registration Start" type="date" value={form.regStart} onChange={(e) => update('regStart', e.target.value)} />
                  <Input label="Registration End" type="date" value={form.regEnd} onChange={(e) => update('regEnd', e.target.value)} />
                </div>

                <div className="create-event__row">
                  <Input label="Event Start" type="date" value={form.eventStart} onChange={(e) => update('eventStart', e.target.value)} />
                  <Input label="Event End" type="date" value={form.eventEnd} onChange={(e) => update('eventEnd', e.target.value)} />
                </div>
              </div>
            </div>
          </Step>

          <Step>
            <div className="create-event__step-content">
              <h2>Content, Layout & Final Review</h2>
              <div className="create-event__fields">
                <p className="create-event__helper">Add or remove the sections you want to show on the event page.</p>

                <div className="create-event__section-builder">
                  {[
                    { key: 'timeline', label: 'Timeline' },
                    { key: 'rules', label: 'Rules' },
                    { key: 'problems', label: 'Problem Statements' },
                    { key: 'maps', label: 'Google Maps Link' },
                    { key: 'media', label: 'Banners & Images' },
                  ].map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      className={`create-event__section-pill ${sections[section.key] ? 'is-on' : ''}`}
                      onClick={() => setSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                    >
                      {sections[section.key] ? 'Hide' : 'Add'} {section.label}
                    </button>
                  ))}
                </div>

                {sections.timeline && (
                  <div className="create-event__optional-block">
                    <div className="create-event__optional-head">
                      <h3>Timeline</h3>
                      <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setTimelineItems, { title: '', date: '', description: '' })}>
                        <Plus size={14} /> Add milestone
                      </button>
                    </div>
                    <div className="create-event__stack">
                      {timelineItems.map((item, index) => (
                        <div key={`timeline-${index}`} className="create-event__stack-item">
                          <div className="create-event__stack-item-head">
                            <strong>Milestone {index + 1}</strong>
                            {timelineItems.length > 1 ? (
                              <button type="button" className="create-event__icon-btn" onClick={() => removeListItem(setTimelineItems, index)}>
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                          <div className="create-event__row">
                            <Input label="Title" placeholder="Registration Opens" value={item.title} onChange={(e) => updateListItem(setTimelineItems, index, { ...item, title: e.target.value })} />
                            <Input label="Date" type="date" value={item.date} onChange={(e) => updateListItem(setTimelineItems, index, { ...item, date: e.target.value })} />
                          </div>
                          <Input label="Description" placeholder="What happens at this milestone" value={item.description} onChange={(e) => updateListItem(setTimelineItems, index, { ...item, description: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="create-event__optional-block">
                  <div className="create-event__optional-head">
                    <h3>Sub-events (with timeline)</h3>
                    <button type="button" className="create-event__mini-btn" onClick={addSubEvent}>
                      <Plus size={14} /> Add sub-event
                    </button>
                  </div>

                  {subEvents.length === 0 ? (
                    <p className="create-event__helper">Add sub-events like Round 1, PPT Submission, Demo Day, or Finals.</p>
                  ) : (
                    <div className="create-event__stack">
                      {subEvents.map((subEvent, subEventIndex) => (
                        <div key={`sub-event-${subEventIndex}`} className="create-event__stack-item">
                          <div className="create-event__stack-item-head">
                            <strong>Sub-event {subEventIndex + 1}</strong>
                            <button type="button" className="create-event__icon-btn" onClick={() => removeSubEvent(subEventIndex)}>
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <Input
                            label="Sub-event title"
                            placeholder="Round 1: Idea Screening"
                            value={subEvent.title}
                            onChange={(e) => updateSubEvent(subEventIndex, 'title', e.target.value)}
                          />

                          <div className="create-event__row">
                            <Input
                              label="Start date"
                              type="date"
                              value={subEvent.startDate}
                              onChange={(e) => updateSubEvent(subEventIndex, 'startDate', e.target.value)}
                            />
                            <Input
                              label="End date"
                              type="date"
                              value={subEvent.endDate}
                              onChange={(e) => updateSubEvent(subEventIndex, 'endDate', e.target.value)}
                            />
                          </div>

                          <Input
                            label="Sub-event description"
                            placeholder="Short details about this sub-event"
                            value={subEvent.description}
                            onChange={(e) => updateSubEvent(subEventIndex, 'description', e.target.value)}
                          />

                          <div className="create-event__optional-head">
                            <h3>Sub-event timeline milestones</h3>
                            <button type="button" className="create-event__mini-btn" onClick={() => addSubEventMilestone(subEventIndex)}>
                              <ListPlus size={14} /> Add milestone
                            </button>
                          </div>

                          <div className="create-event__stack">
                            {(subEvent.milestones || []).map((milestone, milestoneIndex) => (
                              <div key={`sub-event-${subEventIndex}-milestone-${milestoneIndex}`} className="create-event__stack-item create-event__stack-item--single">
                                <div className="create-event__row">
                                  <Input
                                    label="Milestone title"
                                    placeholder="PPT Submission"
                                    value={milestone.title}
                                    onChange={(e) => updateSubEventMilestone(subEventIndex, milestoneIndex, 'title', e.target.value)}
                                  />
                                  <Input
                                    label="Date"
                                    type="date"
                                    value={milestone.date}
                                    onChange={(e) => updateSubEventMilestone(subEventIndex, milestoneIndex, 'date', e.target.value)}
                                  />
                                </div>
                                <Input
                                  label="Milestone description"
                                  placeholder="Upload the final PPT and abstract"
                                  value={milestone.description}
                                  onChange={(e) => updateSubEventMilestone(subEventIndex, milestoneIndex, 'description', e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="create-event__icon-btn create-event__icon-btn--floating"
                                  onClick={() => removeSubEventMilestone(subEventIndex, milestoneIndex)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sections.rules && (
                  <div className="create-event__optional-block">
                    <div className="create-event__optional-head">
                      <h3>Rules</h3>
                      <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setRules, '')}>
                        <ListPlus size={14} /> Add rule
                      </button>
                    </div>
                    <div className="create-event__stack">
                      {rules.map((rule, index) => (
                        <div key={`rule-${index}`} className="create-event__stack-item create-event__stack-item--single">
                          <Input
                            label={`Rule ${index + 1}`}
                            placeholder="No plagiarism or copied submissions"
                            value={rule}
                            onChange={(e) => updateListItem(setRules, index, e.target.value)}
                          />
                          {rules.length > 1 ? (
                            <button type="button" className="create-event__icon-btn create-event__icon-btn--floating" onClick={() => removeListItem(setRules, index)}>
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sections.problems && (
                  <div className="create-event__optional-block">
                    <div className="create-event__optional-head">
                      <h3>Problem Statements</h3>
                      <button
                        type="button"
                        className="create-event__mini-btn"
                        onClick={() => addListItem(setProblemStatements, { psId: '', psDescription: '', psStatement: '' })}
                      >
                        <ListPlus size={14} /> Add problem
                      </button>
                    </div>
                    <div className="create-event__stack">
                      {problemStatements.map((statement, index) => (
                        <div key={`problem-${index}`} className="create-event__stack-item create-event__stack-item--single">
                          <div className="create-event__row">
                            <Input
                              label={`PS ID ${index + 1}`}
                              placeholder="PS-101"
                              value={statement.psId || ''}
                              onChange={(e) =>
                                updateListItem(setProblemStatements, index, {
                                  ...statement,
                                  psId: e.target.value,
                                })
                              }
                            />
                            <Input
                              label="PS Description"
                              placeholder="One-line summary"
                              value={statement.psDescription || ''}
                              onChange={(e) =>
                                updateListItem(setProblemStatements, index, {
                                  ...statement,
                                  psDescription: e.target.value,
                                })
                              }
                            />
                          </div>
                          <Input
                            label="PS Statement"
                            type="textarea"
                            placeholder="Detailed problem statement and expected outcomes"
                            value={statement.psStatement || ''}
                            onChange={(e) =>
                              updateListItem(setProblemStatements, index, {
                                ...statement,
                                psStatement: e.target.value,
                              })
                            }
                          />
                          {problemStatements.length > 1 ? (
                            <button type="button" className="create-event__icon-btn create-event__icon-btn--floating" onClick={() => removeListItem(setProblemStatements, index)}>
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sections.maps && (
                  <div className="create-event__optional-block">
                    <h3>Google Maps Link</h3>
                    <Input
                      label="Event location map URL"
                      icon={Link2}
                      placeholder="https://maps.google.com/..."
                      value={form.mapLink}
                      onChange={(e) => update('mapLink', e.target.value)}
                    />
                  </div>
                )}

                {sections.media && (
                  <div className="create-event__optional-block">
                    <div className="create-event__optional-head">
                      <h3>Banners & Images</h3>
                    </div>
                    <label className="create-event__upload-field">
                      <span>Poster image (recommended: 1600 x 900, 16:9)</span>
                      <input type="file" accept="image/*" onChange={(event) => handleMediaUpload(event, setPosterImage)} />
                    </label>
                    <Input
                      label="Poster URL (optional)"
                      placeholder="https://poster-image..."
                      value={posterImage}
                      onChange={(e) => setPosterImage(e.target.value)}
                    />

                    <label className="create-event__upload-field">
                      <span>Showcase image for Explore card (recommended: 1200 x 675, 16:9)</span>
                      <input type="file" accept="image/*" onChange={(event) => handleMediaUpload(event, setShowcaseImage)} />
                    </label>
                    <Input
                      label="Showcase image URL (optional)"
                      placeholder="https://showcase-image..."
                      value={showcaseImage}
                      onChange={(e) => setShowcaseImage(e.target.value)}
                    />

                    <p className="create-event__helper">
                      Only one poster and one showcase image are stored. Uploaded files are kept at original quality with no compression.
                    </p>
                  </div>
                )}

                <Input
                  label="FAQ 1 - Question"
                  icon={HelpCircle}
                  placeholder="Common question"
                  value={form.faq1q}
                  onChange={(e) => update('faq1q', e.target.value)}
                />
                <Input
                  label="FAQ 1 - Answer"
                  placeholder="Your answer"
                  value={form.faq1a}
                  onChange={(e) => update('faq1a', e.target.value)}
                />

                <div className="create-event__divider" />

                <Input
                  label="FAQ 2 - Question"
                  icon={HelpCircle}
                  placeholder="Another question"
                  value={form.faq2q}
                  onChange={(e) => update('faq2q', e.target.value)}
                />
                <Input
                  label="FAQ 2 - Answer"
                  placeholder="Your answer"
                  value={form.faq2a}
                  onChange={(e) => update('faq2a', e.target.value)}
                />

                <div className="create-event__divider" />

                <div className="create-event__credential-block">
                  <div className="create-event__credential-toggle">
                    <label className="input-label">Enable credentials for this event</label>
                    <button
                      type="button"
                      className={`create-event__toggle ${form.credentialEnabled ? 'is-on' : ''}`}
                      onClick={() => update('credentialEnabled', !form.credentialEnabled)}
                    >
                      {form.credentialEnabled ? 'Included' : 'Not Included'}
                    </button>
                  </div>

                  {form.credentialEnabled && (
                    <div className="create-event__credential-fields">
                      <div className="create-event__row">
                        <div className="create-event__select-group">
                          <label className="input-label">Prebuilt template</label>
                          <select className="create-event__select" value={form.credentialTemplate} onChange={(e) => update('credentialTemplate', e.target.value)}>
                            <option value="Classic">Classic</option>
                            <option value="Modern">Modern</option>
                            <option value="Minimal">Minimal</option>
                          </select>
                        </div>
                        <Input
                          label="Certificate title"
                          placeholder="Certificate of Achievement"
                          value={form.credentialTitle}
                          onChange={(e) => update('credentialTitle', e.target.value)}
                        />
                      </div>

                      <Input
                        label="Certificate subtitle"
                        placeholder="This certificate is proudly presented to"
                        value={form.credentialSubtitle}
                        onChange={(e) => update('credentialSubtitle', e.target.value)}
                      />

                      <Input
                        label="Certificate description"
                        placeholder="For successfully completing..."
                        value={form.credentialDescription}
                        onChange={(e) => update('credentialDescription', e.target.value)}
                      />

                      <div className="create-event__row">
                        <Input
                          label="Host logo URL"
                          placeholder="https://..."
                          value={form.credentialLogoUrl}
                          onChange={(e) => update('credentialLogoUrl', e.target.value)}
                        />
                        <Input
                          label="Sponsor logo URL (optional)"
                          placeholder="https://..."
                          value={form.credentialSponsorLogoUrl}
                          onChange={(e) => update('credentialSponsorLogoUrl', e.target.value)}
                        />
                      </div>

                      <div className="create-event__row">
                        <label className="create-event__upload-field">
                          <span>Upload host logo</span>
                          <input type="file" accept="image/*" onChange={(event) => handleSingleImageUpload(event, 'credentialLogoUrl')} />
                        </label>
                        <label className="create-event__upload-field">
                          <span>Upload sponsor logo</span>
                          <input type="file" accept="image/*" onChange={(event) => handleSingleImageUpload(event, 'credentialSponsorLogoUrl')} />
                        </label>
                      </div>

                      <div className="create-event__row">
                        <Input
                          label="Signatory name"
                          placeholder="John Doe"
                          value={form.credentialSignatoryName}
                          onChange={(e) => update('credentialSignatoryName', e.target.value)}
                        />
                        <Input
                          label="Signatory role"
                          placeholder="Event Host"
                          value={form.credentialSignatoryRole}
                          onChange={(e) => update('credentialSignatoryRole', e.target.value)}
                        />
                      </div>

                      <p className="create-event__helper">When participants claim, their name and teammates (if available) are auto-filled and stored permanently in profile.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="create-event__final-note">
                <p>
                  You are on step {activeStep}/3. On Complete, your event will be published and visible in organizer dashboard.
                </p>
              </div>
            </div>
          </Step>
        </Stepper>
      </section>

      {validationToast.visible ? (
        <div className="create-event__toast" role="status" aria-live="polite">
          <span className="create-event__toast-line" />
          <p>{validationToast.message}</p>
        </div>
      ) : null}

      <Modal
        isOpen={showSuspendedModal}
        onClose={() => setShowSuspendedModal(false)}
        title="Account Suspended"
        size="sm"
      >
        <div className="create-event__suspension-box">
          <p>Your account is suspended, so creating events is currently blocked.</p>
          <p>Open Help Center to raise a complaint and track ticket progress.</p>
          <button
            type="button"
            className="create-event__suspension-btn"
            onClick={() => {
              setShowSuspendedModal(false);
              navigate('/help-center');
            }}
          >
            Open Help Center
          </button>
        </div>
      </Modal>
    </div>
  );
}
