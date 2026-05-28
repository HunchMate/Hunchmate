'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@/utils/router';
import { ArrowLeft, HelpCircle, Link2, ListPlus, Mail, MapPin, Phone, Plus, Trash2, Tag, Type, Network, CheckSquare, Code, Rocket, Trophy, Briefcase, GraduationCap, Award, MoreHorizontal, MonitorPlay, Layers, Clock, DollarSign, Calendar, Users, Eye, Palette, Globe, ExternalLink, Shield, FileText, Star, CircleDot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { eventCategories, eventModes } from '@/utils/sampleData';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Stepper, { Step } from '@/components/ui/Stepper';
import Modal from '@/components/ui/Modal';
import '@/vite-pages/organizer/CreateEvent.css';

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
    programStructure: 'single',
    category: 'Hackathon',
    mode: 'Hybrid',
    description: '',
    shortDescription: '',
    tagline: '',
    logo: '',
    organizerName: user?.organizationName || user?.name || '',
    organizerLogo: '',
    sponsors: '',
    partners: '',
    venue: '',
    accessType: 'Open',
    inviteApprovals: false,
    inviteShortlist: false,
    inviteRestricted: false,
    invitePrivateLinks: false,
    participationType: 'Both',
    teamInviteSystem: true,
    maxRegistrations: 100,
    enableWaitlist: false,
    enableCustomFields: false,
    enableDocUploads: false,
    requireSocialProfiles: false,
    requireConsent: false,
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
    organizerContactRole: '',
    organizerLinkedin: '',
    organizerTwitter: '',
    organizerWebsite: '',
    venueAddress: '',
    venueInstructions: '',
    eligibility: '',
    participationGuidelines: '',
    codeOfConduct: '',
    visibility: 'public',
    primaryColor: '#5227FF',
    paymentType: 'free',
    paymentAmount: '',
    paymentCurrency: 'INR',
    internships: '',
    goodies: '',
    sponsorPerks: '',
    commOnRegistration: true,
    commOnDeadline: true,
    commOnResults: true,
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
    about: true,
    timeline: true,
    rules: true,
    problems: true,
    maps: true,
    media: true,
    faqs: true,
    sponsors: true,
    judges: true,
    mentors: true,
    prizes: true,
    tracks: true,
    contacts: true,
  });
  const [timelineItems, setTimelineItems] = useState([
    { title: 'Registration Opens', date: '', description: '' },
  ]);
  const [rules, setRules] = useState(['']);
  const [problemStatements, setProblemStatements] = useState([{ psId: '', psDescription: '', psStatement: '' }]);
  const [subEvents, setSubEvents] = useState([]);
  const [prizes, setPrizes] = useState([{ rank: '1st Place', reward: '' }]);
  const [judges, setJudges] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [faqs, setFaqs] = useState([{ q: '', a: '' }]);
  const [judgingCriteriaList, setJudgingCriteriaList] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [posterImage, setPosterImage] = useState('');
  const [showcaseImage, setShowcaseImage] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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
        time: '',
        entryFee: '',
        prizeMoney: '',
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
      tagline: targetEvent.tagline || '',
      logo: targetEvent.logo || '',
      organizerName: targetEvent.organizer?.name || targetEvent.organiser?.name || user?.organizationName || user?.name || '',
      organizerLogo: targetEvent.organizer?.logo || targetEvent.organiser?.logo || '',
      sponsors: Array.isArray(targetEvent.sponsors) ? targetEvent.sponsors.join(', ') : '',
      partners: Array.isArray(targetEvent.partners) ? targetEvent.partners.join(', ') : '',
      venue: targetEvent.venue || targetEvent.location || '',
      accessType: targetEvent.accessType || 'Open',
      inviteApprovals: Boolean(targetEvent.inviteApprovals),
      inviteShortlist: Boolean(targetEvent.inviteShortlist),
      inviteRestricted: Boolean(targetEvent.inviteRestricted),
      invitePrivateLinks: Boolean(targetEvent.invitePrivateLinks),
      participationType: targetEvent.participationType || 'Both',
      teamInviteSystem: targetEvent.teamInviteSystem !== false,
      maxRegistrations: targetEvent.maxRegistrations || targetEvent.maxParticipants || 100,
      enableWaitlist: Boolean(targetEvent.enableWaitlist),
      enableCustomFields: Boolean(targetEvent.enableCustomFields),
      enableDocUploads: Boolean(targetEvent.enableDocUploads),
      requireSocialProfiles: Boolean(targetEvent.requireSocialProfiles),
      requireConsent: Boolean(targetEvent.requireConsent),
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
      organizerContactRole: targetEvent.organizer?.contactRole || targetEvent.organiser?.contactRole || '',
      organizerLinkedin: targetEvent.organizer?.linkedin || targetEvent.organiser?.linkedin || '',
      organizerTwitter: targetEvent.organizer?.twitter || targetEvent.organiser?.twitter || '',
      organizerWebsite: targetEvent.organizer?.website || targetEvent.organiser?.website || '',
      venueAddress: targetEvent.venueAddress || '',
      venueInstructions: targetEvent.venueInstructions || '',
      eligibility: targetEvent.eligibility || '',
      participationGuidelines: targetEvent.participationGuidelines || '',
      codeOfConduct: targetEvent.codeOfConduct || '',
      visibility: targetEvent.visibility || 'public',
      primaryColor: targetEvent.primaryColor || '#5227FF',
      paymentType: targetEvent.paymentConfig?.type || 'free',
      paymentAmount: targetEvent.paymentConfig?.amount || '',
      paymentCurrency: targetEvent.paymentConfig?.currency || 'INR',
      internships: targetEvent.internships || '',
      goodies: targetEvent.goodies || '',
      sponsorPerks: targetEvent.sponsorPerks || '',
      commOnRegistration: targetEvent.communicationPrefs?.onRegistration !== false,
      commOnDeadline: targetEvent.communicationPrefs?.onDeadline !== false,
      commOnResults: targetEvent.communicationPrefs?.onResults !== false,
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
      about: targetEvent.sections?.about ?? true,
      timeline: targetEvent.sections?.timeline ?? true,
      rules: targetEvent.sections?.rules ?? true,
      problems: targetEvent.sections?.problems ?? true,
      maps: targetEvent.sections?.maps ?? true,
      media: targetEvent.sections?.media ?? true,
      faqs: targetEvent.sections?.faqs ?? true,
      sponsors: targetEvent.sections?.sponsors ?? true,
      judges: targetEvent.sections?.judges ?? true,
      mentors: targetEvent.sections?.mentors ?? true,
      prizes: targetEvent.sections?.prizes ?? true,
      tracks: targetEvent.sections?.tracks ?? true,
      contacts: targetEvent.sections?.contacts ?? true,
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
    setFaqs(Array.isArray(targetEvent.faqs) && targetEvent.faqs.length ? targetEvent.faqs : [{ q: '', a: '' }]);
    setJudges(Array.isArray(targetEvent.judges) ? targetEvent.judges : []);
    setMentors(Array.isArray(targetEvent.mentors) ? targetEvent.mentors : []);
    setRounds(Array.isArray(targetEvent.rounds) ? targetEvent.rounds : []);
    setJudgingCriteriaList(Array.isArray(targetEvent.judgingCriteria) ? targetEvent.judgingCriteria : []);
    setCoupons(Array.isArray(targetEvent.paymentConfig?.coupons) ? targetEvent.paymentConfig.coupons : []);
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
    if (step === 1) { return !!form.category; }
    if (step === 2) {
      if (!form.title.trim()) return { ok: false, reason: 'Add an event title to continue.' };
      if (!form.shortDescription.trim()) return { ok: false, reason: 'Add a short description to continue.' };
      if (!form.description.trim()) return { ok: false, reason: 'Add a full description to continue.' };
      if (!form.organizerContactEmail.trim()) return { ok: false, reason: 'Organizer contact email is required.' };
      if (!isValidEmail(form.organizerContactEmail)) return { ok: false, reason: 'Enter a valid organizer contact email.' };
      if (!form.organizerContactPhone.trim()) return { ok: false, reason: 'Organizer contact phone is required.' };
      if (!isValidPhone(form.organizerContactPhone)) return { ok: false, reason: 'Enter a valid 10-digit organizer contact phone number.' };
      return { ok: true };
    }

    if (step === 3) {
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

    if (step === 4) {
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
    try {
      const normalizedPosterImage = String(posterImage || '').trim();
      const normalizedShowcaseImage = String(showcaseImage || '').trim();

      // Ensure images are not massive base64 strings if possible, or restrict their size
      const isPosterMassive = isDataImageSrc(normalizedPosterImage) && normalizedPosterImage.length > 500000;
      const isShowcaseMassive = isDataImageSrc(normalizedShowcaseImage) && normalizedShowcaseImage.length > 500000;

      if (isPosterMassive) {
        showValidationToast('Poster image is too large (must be < 500KB). Please use a smaller image or a URL link.');
        return false;
      }
      if (isShowcaseMassive) {
        showValidationToast('Showcase image is too large (must be < 500KB). Please use a smaller image or a URL link.');
        return false;
      }

      const includePosterInLegacyCollections = normalizedPosterImage && !isDataImageSrc(normalizedPosterImage);
      const includeShowcaseInLegacyCollections = normalizedShowcaseImage && !isDataImageSrc(normalizedShowcaseImage);

      const organiser = {
        name: String(form.organizerName || '').trim() || user?.organizationName || user?.name || '',
        logo: String(form.organizerLogo || '').trim() || '',
        id: user?.id,
        email: String(form.organizerContactEmail || '').trim(),
        phone: String(form.organizerContactPhone || '').trim(),
        contactRole: String(form.organizerContactRole || '').trim(),
        linkedin: String(form.organizerLinkedin || '').trim(),
        twitter: String(form.organizerTwitter || '').trim(),
        website: String(form.organizerWebsite || '').trim(),
      };

      const eventPayload = {
        title: form.title,
        category: form.category,
        mode: form.mode,
        status: targetEvent?.status || 'open',
        description: form.description,
        shortDescription: form.shortDescription,
        tagline: form.tagline,
        logo: form.logo,
        sponsors: form.sponsors.split(',').map(s => s.trim()).filter(Boolean),
        partners: form.partners.split(',').map(p => p.trim()).filter(Boolean),
        organiser,
        organizer: organiser,
        accessType: form.accessType,
        inviteApprovals: form.inviteApprovals,
        inviteShortlist: form.inviteShortlist,
        inviteRestricted: form.inviteRestricted,
        invitePrivateLinks: form.invitePrivateLinks,
        participationType: form.participationType,
        teamInviteSystem: form.teamInviteSystem,
        maxRegistrations: parseInt(form.maxRegistrations, 10) || 100,
        enableWaitlist: form.enableWaitlist,
        enableCustomFields: form.enableCustomFields,
        enableDocUploads: form.enableDocUploads,
        requireSocialProfiles: form.requireSocialProfiles,
        requireConsent: form.requireConsent,
        timeline: {
          registrationStart: form.regStart,
          registrationEnd: form.regEnd,
          eventStart: form.eventStart,
          eventEnd: form.eventEnd,
        },
        venue: form.venue,
        venueAddress: form.venueAddress,
        venueInstructions: form.venueInstructions,
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
            time: String(subEvent.time || '').trim(),
            entryFee: String(subEvent.entryFee || '').trim(),
            prizeMoney: String(subEvent.prizeMoney || '').trim(),
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
        bannerImages: [],
        galleryImages: [],
        posterImage: isPosterMassive ? '' : normalizedPosterImage,
        showcaseImage: isShowcaseMassive ? '' : normalizedShowcaseImage,
        media: { banners: [], gallery: [] },
        faqs: faqs.filter((faq) => faq.q && faq.a),
        judges: judges.filter((j) => j.name),
        mentors: mentors.filter((m) => m.name),
        rounds: rounds.filter((r) => r.name),
        judgingCriteria: judgingCriteriaList.filter((jc) => jc.criterion),
        eligibility: form.eligibility,
        participationGuidelines: form.participationGuidelines,
        codeOfConduct: form.codeOfConduct,
        visibility: form.visibility,
        primaryColor: form.primaryColor,
        paymentConfig: {
          type: form.paymentType,
          amount: form.paymentAmount,
          currency: form.paymentCurrency,
          coupons: coupons.filter((c) => c.code),
        },
        communicationPrefs: {
          onRegistration: form.commOnRegistration,
          onDeadline: form.commOnDeadline,
          onResults: form.commOnResults,
        },
        internships: form.internships,
        goodies: form.goodies,
        sponsorPerks: form.sponsorPerks,
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
    } catch (err) {
      console.error('Submit crash:', err);
      showValidationToast(err.message || 'An unexpected error occurred during submission.');
      return false;
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
          <p>{isEditMode ? 'Update event details, media, and settings.' : 'Define the structural core of your event to unlock specialized management tools.'}</p>
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
            <div className="create-event__step-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
                <Layers size={20} style={{ color: '#ff6b00' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Program Structure</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                <div 
                  onClick={() => update('programStructure', 'single')}
                  style={{ 
                    border: form.programStructure === 'single' ? '2px solid #ff6b00' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f5f7fa', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <CheckSquare size={24} style={{ color: form.programStructure === 'single' ? '#ff6b00' : '#6b7280' }} />
                  </div>
                  {form.programStructure === 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid #ff6b00' }}></div>}
                  {form.programStructure !== 'single' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#ff6b00' }}>Single Program</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>A focused event with one set of tracks, submissions, and judging rounds. Best for classic weekend hackathons.</p>
                </div>
                
                <div 
                  onClick={() => update('programStructure', 'multi')}
                  style={{ 
                    border: form.programStructure === 'multi' ? '2px solid #ff6b00' : '2px solid transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)', 
                    background: '#fff',
                    borderRadius: '12px', 
                    padding: '1.5rem', 
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ background: '#f0f5ff', display: 'inline-flex', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <Network size={24} style={{ color: form.programStructure === 'multi' ? '#ff6b00' : '#2559bd' }} />
                  </div>
                  {form.programStructure === 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '5px solid #ff6b00' }}></div>}
                  {form.programStructure !== 'multi' && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #e5e7eb' }}></div>}
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#ff6b00' }}>Multi-Program Hub</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>Orchestrate multiple sub-hackathons or concurrent programs under one umbrella brand. Ideal for global series.</p>
                </div>
              </div>

              {/* Mini Events section - visible only when Multi-Program Hub is selected */}
              {form.programStructure === 'multi' && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff8f0 0%, #fff 100%)',
                  border: '2px solid #ffe0c2',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  animation: 'fadeSlideDown 0.35s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ListPlus size={20} style={{ color: '#ff6b00' }} />
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1a1f36' }}>Mini Events</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addSubEvent}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: '#ff6b00', color: '#fff', border: 'none',
                        borderRadius: '8px', padding: '0.5rem 1rem',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e55d00'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ff6b00'}
                    >
                      <Plus size={16} /> Add Mini Event
                    </button>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                    Add individual sub-events that run under this program hub. Each mini event gets its own listing.
                  </p>

                  {subEvents.length === 0 && (
                    <div style={{
                      border: '2px dashed #e5e7eb', borderRadius: '12px',
                      padding: '2rem', textAlign: 'center', color: '#9ca3af'
                    }}>
                      <Network size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No mini events yet. Click "Add Mini Event" to create one.</p>
                    </div>
                  )}

                  {subEvents.map((sub, idx) => (
                    <div key={idx} style={{
                      background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: '12px', padding: '1.25rem',
                      marginBottom: idx < subEvents.length - 1 ? '1rem' : 0,
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff6b00', background: '#fff3e8', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                          Mini Event {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubEvent(idx)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', padding: '0.25rem'
                          }}
                          title="Remove mini event"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Event Name *</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Type size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. AI Sprint"
                              value={sub.title}
                              onChange={e => updateSubEvent(idx, 'title', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Date *</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Calendar size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="date"
                              value={sub.startDate}
                              onChange={e => updateSubEvent(idx, 'startDate', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Time</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Clock size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="time"
                              value={sub.time || ''}
                              onChange={e => updateSubEvent(idx, 'time', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Entry Fee</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><DollarSign size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. Free / ₹500"
                              value={sub.entryFee || ''}
                              onChange={e => updateSubEvent(idx, 'entryFee', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Prize Money</label>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                            <span style={{ padding: '0.5rem', background: '#f9fafb', display: 'flex' }}><Trophy size={16} style={{ color: '#6b7280' }} /></span>
                            <input
                              type="text"
                              placeholder="e.g. ₹50,000"
                              value={sub.prizeMoney || ''}
                              onChange={e => updateSubEvent(idx, 'prizeMoney', e.target.value)}
                              style={{ border: 'none', outline: 'none', padding: '0.5rem', width: '100%', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Short Description</label>
                        <textarea
                          placeholder="Brief description of this mini event..."
                          value={sub.description}
                          onChange={e => updateSubEvent(idx, 'description', e.target.value)}
                          rows={2}
                          style={{
                            width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
                            padding: '0.5rem 0.75rem', fontSize: '0.9rem', resize: 'vertical',
                            outline: 'none', fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Layers size={20} style={{ color: '#ff6b00' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a1f36' }}>Event Category</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { name: 'Hackathon', icon: Code },
                  { name: 'Innovation Challenge', icon: Rocket },
                  { name: 'Datathon', icon: Code }, 
                  { name: 'Ideathon', icon: Rocket },
                  { name: 'Competition', icon: Trophy },
                  { name: 'Workshop', icon: MonitorPlay },
                  { name: 'Bootcamp', icon: GraduationCap },
                  { name: 'Hiring Challenge', icon: Briefcase },
                  { name: 'Fellowship', icon: Award },
                  { name: 'Other', icon: MoreHorizontal },
                ].map(cat => (
                  <div
                    key={cat.name}
                    onClick={() => update('category', cat.name)}
                    style={{
                      border: form.category === cat.name ? '2px solid #ff6b00' : '2px solid transparent',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <cat.icon size={28} style={{ color: form.category === cat.name ? '#ff6b00' : '#1a1f36' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: form.category === cat.name ? '600' : '500', color: form.category === cat.name ? '#ff6b00' : '#4b5563' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Step>
          <Step>
            <div className="create-event__step-content">
              <h2>Basic Information</h2>
              <div className="create-event__fields">
                <Input
                  label="Event Title (Program Name)"
                  icon={Type}
                  placeholder="e.g. Neural Nexus Hackathon"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                />

                <Input
                  label="Program Tagline"
                  placeholder="e.g. Innovate for a sustainable future"
                  value={form.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                />

                <div className="create-event__row">
                  <div className="create-event__select-group" style={{ width: '100%' }}>
                    <label className="input-label">Mode</label>
                    <select className="create-event__select" value={form.mode} onChange={(e) => update('mode', e.target.value)}>
                      {eventModes.map((eventMode) => (
                        <option key={eventMode} value={eventMode}>{eventMode}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Themes / Tracks (comma-separated)"
                    icon={Tag}
                    placeholder="AI/ML, Web3, Healthcare, FinTech"
                    value={form.themes}
                    onChange={(e) => update('themes', e.target.value)}
                  />
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.36rem', width: '100%', marginTop: '0.5rem' }}>
                  <label className="input-label">Program Logo</label>
                  <label className="create-event__upload-field" style={{ margin: 0 }}>
                    <span>Upload Program Logo (Square, 512 x 512)</span>
                    <input type="file" accept="image/*" onChange={(event) => handleSingleImageUpload(event, 'logo')} />
                  </label>
                  {form.logo && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={form.logo} alt="Program Logo Preview" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #dce5f2' }} />
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Uploaded successfully</span>
                    </div>
                  )}
                </div>

                <Input
                  label="Program Logo URL (optional)"
                  placeholder="https://example.com/logo.png"
                  value={form.logo}
                  onChange={(e) => update('logo', e.target.value)}
                />

                <div className="create-event__row">
                  <Input
                    label="Sponsors (comma separated)"
                    placeholder="Google, Microsoft, IBM"
                    value={form.sponsors}
                    onChange={(e) => update('sponsors', e.target.value)}
                  />
                  <Input
                    label="Partners (comma separated)"
                    placeholder="GitHub, OpenAI"
                    value={form.partners}
                    onChange={(e) => update('partners', e.target.value)}
                  />
                </div>

                <div className="create-event__divider" style={{ margin: '1.5rem 0 1rem' }} />
                <h3 style={{ margin: '0 0 1rem 0', color: '#1f3658', fontSize: '1.1rem', fontFamily: 'Space Grotesk, sans-serif' }}>Organizer Details</h3>

                <Input
                  label="Organizer Name"
                  placeholder="e.g. Google Developer Student Clubs"
                  value={form.organizerName}
                  onChange={(e) => update('organizerName', e.target.value)}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.36rem', width: '100%' }}>
                  <label className="input-label">Organizer Logo</label>
                  <label className="create-event__upload-field" style={{ margin: 0 }}>
                    <span>Upload Organizer Logo (Square, 512 x 512)</span>
                    <input type="file" accept="image/*" onChange={(event) => handleSingleImageUpload(event, 'organizerLogo')} />
                  </label>
                  {form.organizerLogo && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={form.organizerLogo} alt="Organizer Logo Preview" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #dce5f2' }} />
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Uploaded successfully</span>
                    </div>
                  )}
                </div>

                <Input
                  label="Organizer Logo URL (optional)"
                  placeholder="https://example.com/org-logo.png"
                  value={form.organizerLogo}
                  onChange={(e) => update('organizerLogo', e.target.value)}
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

                <Input
                  label="Contact Role / Designation"
                  placeholder="Event Lead, Technical Coordinator, etc."
                  value={form.organizerContactRole}
                  onChange={(e) => update('organizerContactRole', e.target.value)}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Input
                    label="LinkedIn"
                    icon={ExternalLink}
                    placeholder="https://linkedin.com/in/..."
                    value={form.organizerLinkedin}
                    onChange={(e) => update('organizerLinkedin', e.target.value)}
                  />
                  <Input
                    label="Twitter / X"
                    icon={ExternalLink}
                    placeholder="https://twitter.com/..."
                    value={form.organizerTwitter}
                    onChange={(e) => update('organizerTwitter', e.target.value)}
                  />
                  <Input
                    label="Website"
                    icon={Globe}
                    placeholder="https://..."
                    value={form.organizerWebsite}
                    onChange={(e) => update('organizerWebsite', e.target.value)}
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

                <Input
                  label="Venue Address"
                  placeholder="Full address including city, state, ZIP"
                  value={form.venueAddress}
                  onChange={(e) => update('venueAddress', e.target.value)}
                />

                <div className="create-event__textarea-group">
                  <label className="input-label">Venue Instructions (parking, entry gate, etc.)</label>
                  <textarea
                    className="create-event__textarea"
                    placeholder="Parking available at Gate 2. Enter through the main lobby..."
                    value={form.venueInstructions}
                    onChange={(e) => update('venueInstructions', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Payment Setup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00' }}>Payment Setup</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {['free', 'paid'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`create-event__pill ${form.paymentType === type ? 'is-active' : ''}`}
                        onClick={() => update('paymentType', type)}
                      >
                        {type === 'free' ? '🆓 Free' : '💰 Paid'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.paymentType === 'paid' && (
                  <>
                    <div className="create-event__row">
                      <Input
                        label="Registration Amount"
                        type="number"
                        placeholder="500"
                        value={form.paymentAmount}
                        onChange={(e) => update('paymentAmount', e.target.value)}
                      />
                      <div className="create-event__select-group">
                        <label className="input-label">Currency</label>
                        <select className="create-event__select" value={form.paymentCurrency} onChange={(e) => update('paymentCurrency', e.target.value)}>
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                    </div>

                    {/* Coupon Codes */}
                    <div className="create-event__dynamic-list mt-4 mb-4" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                      <div className="create-event__optional-head">
                        <h3>Coupon Codes (Optional)</h3>
                        <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setCoupons, { code: '', discount: '' })}>
                          <Plus size={14} /> Add Coupon
                        </button>
                      </div>
                      {coupons.map((coupon, index) => (
                        <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl flex gap-4">
                          <div className="flex-1">
                            <Input placeholder="Code (e.g. EARLY50)" value={coupon.code} onChange={(e) => updateListItem(setCoupons, index, { ...coupon, code: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <Input placeholder="Discount % (e.g. 50)" value={coupon.discount} onChange={(e) => updateListItem(setCoupons, index, { ...coupon, discount: e.target.value })} />
                          </div>
                          <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100" onClick={() => removeListItem(setCoupons, index)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="create-event__row z-[20]">
                  <Input label="Entry Fee Label (Optional)" placeholder="e.g. Free, INR 500" value={form.fee} onChange={(e) => update('fee', e.target.value)} />
                  <Input
                    label="Max Participants"
                    type="number"
                    placeholder="100"
                    value={form.maxParticipants}
                    onChange={(e) => update('maxParticipants', e.target.value)}
                  />
                </div>

                <div className="create-event__dynamic-list mt-8 mb-6 z-[20]" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Prize Money / Rewards</h3>
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

                {/* Prize Sub-types */}
                <div className="create-event__row">
                  <Input label="Internship Opportunities" placeholder="e.g. 3-month internship at XYZ Corp" value={form.internships} onChange={(e) => update('internships', e.target.value)} />
                  <Input label="Goodies / Swag" placeholder="e.g. T-shirts, stickers, tech kits" value={form.goodies} onChange={(e) => update('goodies', e.target.value)} />
                </div>
                <Input label="Sponsor Perks" placeholder="e.g. Cloud credits, premium subscriptions" value={form.sponsorPerks} onChange={(e) => update('sponsorPerks', e.target.value)} />

                {/* Judging Criteria */}
                <div className="create-event__dynamic-list mt-8 mb-6" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Judging Criteria</h3>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setJudgingCriteriaList, { criterion: '', weight: '' })}>
                      <Plus size={14} /> Add Criterion
                    </button>
                  </div>
                  {judgingCriteriaList.map((item, index) => (
                    <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl flex gap-4">
                      <div className="flex-1">
                        <Input placeholder="Criterion (e.g. Innovation)" value={item.criterion} onChange={(e) => updateListItem(setJudgingCriteriaList, index, { ...item, criterion: e.target.value })} />
                      </div>
                      <div style={{ width: '120px' }}>
                        <Input placeholder="Weight %" value={item.weight} onChange={(e) => updateListItem(setJudgingCriteriaList, index, { ...item, weight: e.target.value })} />
                      </div>
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100" onClick={() => removeListItem(setJudgingCriteriaList, index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Eligibility & Guidelines */}
                <div className="create-event__textarea-group">
                  <label className="input-label">Eligibility Criteria</label>
                  <textarea className="create-event__textarea" placeholder="Open to all college students above 18 years..." value={form.eligibility} onChange={(e) => update('eligibility', e.target.value)} rows={3} />
                </div>

                <div className="create-event__textarea-group">
                  <label className="input-label">Participation Guidelines</label>
                  <textarea className="create-event__textarea" placeholder="All participants must attend the opening ceremony..." value={form.participationGuidelines} onChange={(e) => update('participationGuidelines', e.target.value)} rows={3} />
                </div>

                <div className="create-event__textarea-group">
                  <label className="input-label">Code of Conduct</label>
                  <textarea className="create-event__textarea" placeholder="We expect all participants to behave respectfully..." value={form.codeOfConduct} onChange={(e) => update('codeOfConduct', e.target.value)} rows={3} />
                </div>

                {/* Access Type Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00' }}>Access Type</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {['Open', 'Invite'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => update('accessType', type)}
                        style={{
                          flex: 1,
                          padding: '0.88rem',
                          borderRadius: '10px',
                          border: form.accessType === type ? '2px solid #ff6b00' : '1px solid #d5deeb',
                          background: form.accessType === type ? 'rgba(255,107,0,0.06)' : '#f9fcff',
                          color: form.accessType === type ? '#ff6b00' : '#1f3957',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        {type === 'Open' ? 'Open Registration' : 'Invite Only'}
                      </button>
                    ))}
                  </div>
                  
                  {form.accessType === 'Invite' && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '1.25rem',
                      background: '#f9fcff',
                      border: '1px dashed #d5deeb',
                      borderRadius: '10px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.88rem'
                    }}>
                      {[
                        { key: 'inviteApprovals', label: 'Require Host Approval' },
                        { key: 'inviteShortlist', label: 'Enable Shortlist Stage' },
                        { key: 'inviteRestricted', label: 'Restricted Entry / Domains' },
                        { key: 'invitePrivateLinks', label: 'Private Invite Link Only' }
                      ].map((item) => (
                        <Checkbox
                          key={item.key}
                          id={`create-access-${item.key}`}
                          checked={form[item.key]}
                          onChange={(e) => update(item.key, e.target.checked)}
                          label={<span style={{ fontWeight: 500, fontSize: '0.88rem', color: '#1f3957' }}>{item.label}</span>}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Participation Type Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00' }}>Participation Type</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {['Individual', 'Team', 'Both'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => update('participationType', type)}
                        style={{
                          flex: 1,
                          padding: '0.88rem',
                          borderRadius: '10px',
                          border: form.participationType === type ? '2px solid #ff6b00' : '1px solid #d5deeb',
                          background: form.participationType === type ? 'rgba(255,107,0,0.06)' : '#f9fcff',
                          color: form.participationType === type ? '#ff6b00' : '#1f3957',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  
                  {form.participationType !== 'Individual' && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '1.25rem',
                      background: '#f9fcff',
                      border: '1px dashed #d5deeb',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.88rem'
                    }}>
                      <div className="create-event__row" style={{ margin: 0 }}>
                        <Input
                          label="Min Team Size"
                          type="number"
                          placeholder="e.g. 2"
                          value={form.teamMin}
                          onChange={(e) => update('teamMin', e.target.value)}
                        />
                        <Input
                          label="Max Team Size"
                          type="number"
                          placeholder="e.g. 4"
                          value={form.teamMax}
                          onChange={(e) => update('teamMax', e.target.value)}
                        />
                      </div>
                      <Checkbox
                          id="create-team-invite-system"
                          checked={form.teamInviteSystem}
                          onChange={(e) => update('teamInviteSystem', e.target.checked)}
                          label={<span style={{ fontWeight: 500, fontSize: '0.88rem', color: '#1f3957' }}>Enable Team Invite System</span>}
                        />
                    </div>
                  )}
                </div>

                {/* Registration Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00' }}>Registration Configuration</label>
                  
                  <div className="create-event__row">
                    <Input
                      label="Max Registrations Allowed"
                      type="number"
                      placeholder="e.g. 100"
                      value={form.maxRegistrations}
                      onChange={(e) => update('maxRegistrations', e.target.value)}
                    />
                  </div>
                  
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1.25rem',
                    background: '#f9fcff',
                    border: '1px dashed #d5deeb',
                    borderRadius: '10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.88rem'
                  }}>
                    {[
                      { key: 'enableWaitlist', label: 'Enable Waitlisting' },
                      { key: 'enableCustomFields', label: 'Enable Custom Form Fields' },
                      { key: 'enableDocUploads', label: 'Require Document/Resume Uploads' },
                      { key: 'requireSocialProfiles', label: 'Require LinkedIn & GitHub Fields' },
                      { key: 'requireConsent', label: 'Require Consent Checkbox' }
                    ].map((item) => (
                      <Checkbox
                        key={item.key}
                        id={`create-reg-${item.key}`}
                        checked={form[item.key]}
                        onChange={(e) => update(item.key, e.target.checked)}
                        label={<span style={{ fontWeight: 500, fontSize: '0.88rem', color: '#1f3957' }}>{item.label}</span>}
                      />
                    ))}
                  </div>
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
                    { key: 'about', label: 'About Section' },
                    { key: 'timeline', label: 'Timeline' },
                    { key: 'rules', label: 'Rules' },
                    { key: 'problems', label: 'Problem Statements' },
                    { key: 'maps', label: 'Google Maps Link' },
                    { key: 'media', label: 'Banners & Images' },
                    { key: 'faqs', label: 'FAQs' },
                    { key: 'sponsors', label: 'Sponsors' },
                    { key: 'judges', label: 'Judges' },
                    { key: 'mentors', label: 'Mentors' },
                    { key: 'prizes', label: 'Prizes' },
                    { key: 'tracks', label: 'Themes / Tracks' },
                    { key: 'contacts', label: 'Contact Info' },
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

                {/* Dynamic FAQs */}
                <div className="create-event__dynamic-list mt-4 mb-6" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Frequently Asked Questions</h3>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setFaqs, { q: '', a: '' })}>
                      <Plus size={14} /> Add FAQ
                    </button>
                  </div>
                  {faqs.map((faq, index) => (
                    <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                      <Input
                        label={`FAQ ${index + 1} - Question`}
                        icon={HelpCircle}
                        placeholder="Common question"
                        value={faq.q}
                        onChange={(e) => updateListItem(setFaqs, index, { ...faq, q: e.target.value })}
                      />
                      <Input
                        label={`FAQ ${index + 1} - Answer`}
                        placeholder="Your answer"
                        value={faq.a}
                        onChange={(e) => updateListItem(setFaqs, index, { ...faq, a: e.target.value })}
                      />
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100 mt-2" onClick={() => removeListItem(setFaqs, index)}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="create-event__divider" />

                {/* Judges */}
                <div className="create-event__dynamic-list mt-4 mb-6" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Judges</h3>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setJudges, { name: '', title: '', organization: '', bio: '' })}>
                      <Plus size={14} /> Add Judge
                    </button>
                  </div>
                  {judges.map((judge, index) => (
                    <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                      <div className="create-event__row">
                        <Input placeholder="Name" value={judge.name} onChange={(e) => updateListItem(setJudges, index, { ...judge, name: e.target.value })} />
                        <Input placeholder="Title / Designation" value={judge.title} onChange={(e) => updateListItem(setJudges, index, { ...judge, title: e.target.value })} />
                      </div>
                      <div className="create-event__row">
                        <Input placeholder="Organization" value={judge.organization} onChange={(e) => updateListItem(setJudges, index, { ...judge, organization: e.target.value })} />
                        <Input placeholder="Short Bio" value={judge.bio} onChange={(e) => updateListItem(setJudges, index, { ...judge, bio: e.target.value })} />
                      </div>
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100 mt-2" onClick={() => removeListItem(setJudges, index)}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Mentors */}
                <div className="create-event__dynamic-list mt-4 mb-6" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Mentors</h3>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setMentors, { name: '', title: '', organization: '', bio: '' })}>
                      <Plus size={14} /> Add Mentor
                    </button>
                  </div>
                  {mentors.map((mentor, index) => (
                    <div key={index} className="create-event__optional-card mt-2 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                      <div className="create-event__row">
                        <Input placeholder="Name" value={mentor.name} onChange={(e) => updateListItem(setMentors, index, { ...mentor, name: e.target.value })} />
                        <Input placeholder="Title / Designation" value={mentor.title} onChange={(e) => updateListItem(setMentors, index, { ...mentor, title: e.target.value })} />
                      </div>
                      <div className="create-event__row">
                        <Input placeholder="Organization" value={mentor.organization} onChange={(e) => updateListItem(setMentors, index, { ...mentor, organization: e.target.value })} />
                        <Input placeholder="Short Bio" value={mentor.bio} onChange={(e) => updateListItem(setMentors, index, { ...mentor, bio: e.target.value })} />
                      </div>
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100 mt-2" onClick={() => removeListItem(setMentors, index)}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="create-event__divider" />

                {/* Workflow & Round Setup */}
                <div className="create-event__dynamic-list mt-4 mb-6" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                  <div className="create-event__optional-head">
                    <h3>Workflow & Rounds</h3>
                    <button type="button" className="create-event__mini-btn" onClick={() => addListItem(setRounds, { name: '', startDate: '', endDate: '', submissionTypes: [], evaluationNotes: '', shortlistCount: '' })}>
                      <Plus size={14} /> Add Round
                    </button>
                  </div>
                  <p className="create-event__helper">{rounds.length === 0 ? 'Single round (default). Add rounds for multi-round workflows.' : `${rounds.length} round(s) configured.`}</p>
                  {rounds.map((round, index) => (
                    <div key={index} className="create-event__optional-card mt-3 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                      <Input
                        label={`Round ${index + 1} Name`}
                        placeholder="e.g. Idea Screening, Prototype Review, Finals"
                        value={round.name}
                        onChange={(e) => updateListItem(setRounds, index, { ...round, name: e.target.value })}
                      />
                      <div className="create-event__row">
                        <Input label="Start Date" type="datetime-local" value={round.startDate} onChange={(e) => updateListItem(setRounds, index, { ...round, startDate: e.target.value })} />
                        <Input label="End Date" type="datetime-local" value={round.endDate} onChange={(e) => updateListItem(setRounds, index, { ...round, endDate: e.target.value })} />
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <label className="input-label">Submission Types</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                          {['File Upload', 'PDF', 'PPT', 'GitHub Repo', 'External Link', 'Video'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`create-event__section-pill ${(round.submissionTypes || []).includes(type) ? 'is-on' : ''}`}
                              onClick={() => {
                                const current = round.submissionTypes || [];
                                const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
                                updateListItem(setRounds, index, { ...round, submissionTypes: updated });
                              }}
                            >
                              {(round.submissionTypes || []).includes(type) ? '✓' : '+'} {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="create-event__row" style={{ marginTop: '0.5rem' }}>
                        <Input label="Evaluation Notes" placeholder="Criteria for this round..." value={round.evaluationNotes} onChange={(e) => updateListItem(setRounds, index, { ...round, evaluationNotes: e.target.value })} />
                        <Input label="Shortlist Count" type="number" placeholder="e.g. 50" value={round.shortlistCount} onChange={(e) => updateListItem(setRounds, index, { ...round, shortlistCount: e.target.value })} />
                      </div>
                      <button type="button" className="create-event__remove-btn opacity-50 hover:opacity-100 mt-2" onClick={() => removeListItem(setRounds, index)}>
                        <Trash2 size={14} /> Remove Round
                      </button>
                    </div>
                  ))}
                </div>

                <div className="create-event__divider" />

                {/* Visibility */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', marginTop: '1rem', marginBottom: '1rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00' }}>Program Visibility</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {['public', 'private', 'unlisted'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`create-event__pill ${form.visibility === v ? 'is-active' : ''}`}
                        onClick={() => update('visibility', v)}
                      >
                        {v === 'public' ? '🌐 Public' : v === 'private' ? '🔒 Private' : '🔗 Unlisted'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Color */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
                  <label className="input-label">Branding Color</label>
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => update('primaryColor', e.target.value)}
                    style={{ width: '48px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{form.primaryColor}</span>
                </div>

                {/* Communication Preferences */}
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <label className="input-label" style={{ color: '#ff6b00', marginBottom: '0.5rem', display: 'block' }}>Communication Preferences</label>
                  <Checkbox label="Send email on new registration" checked={form.commOnRegistration} onChange={(checked) => update('commOnRegistration', checked)} />
                  <Checkbox label="Send deadline reminder emails" checked={form.commOnDeadline} onChange={(checked) => update('commOnDeadline', checked)} />
                  <Checkbox label="Send result announcement emails" checked={form.commOnResults} onChange={(checked) => update('commOnResults', checked)} />
                </div>

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

              {/* Preview Button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="create-event__mini-btn"
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye size={16} /> Preview Microsite
                </button>
              </div>

              <div className="create-event__final-note">
                <p>
                  You are on step {activeStep}/3. On Complete, your event will be {form.visibility === 'public' ? 'publicly published' : form.visibility === 'private' ? 'published as private' : 'published as unlisted'} and visible in organizer dashboard.
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

      {/* Preview Microsite Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Microsite Preview"
        size="lg"
      >
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto', background: 'var(--color-bg)', borderRadius: '12px' }}>
          <div style={{ borderBottom: `3px solid ${form.primaryColor}`, paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)' }}>{form.title || 'Event Title'}</h2>
            {form.tagline && <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginTop: '0.3rem' }}>{form.tagline}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ background: `${form.primaryColor}22`, color: form.primaryColor, padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600 }}>{form.category}</span>
              <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem' }}>{form.mode}</span>
              {form.visibility !== 'public' && <span style={{ background: '#ef444422', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem' }}>{form.visibility}</span>}
            </div>
          </div>
          {form.description && <div style={{ marginBottom: '1.5rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>About</h3><p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{form.description}</p></div>}
          {form.eligibility && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Eligibility</h3><p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{form.eligibility}</p></div>}
          {judges.length > 0 && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Judges ({judges.length})</h3>{judges.filter(j => j.name).map((j, i) => <p key={i} style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>• {j.name}{j.title ? ` — ${j.title}` : ''}{j.organization ? `, ${j.organization}` : ''}</p>)}</div>}
          {mentors.length > 0 && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Mentors ({mentors.length})</h3>{mentors.filter(m => m.name).map((m, i) => <p key={i} style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>• {m.name}{m.title ? ` — ${m.title}` : ''}{m.organization ? `, ${m.organization}` : ''}</p>)}</div>}
          {rounds.length > 0 && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Rounds ({rounds.length})</h3>{rounds.filter(r => r.name).map((r, i) => <p key={i} style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>Round {i + 1}: {r.name}</p>)}</div>}
          {prizes.some(p => p.rank || p.reward) && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Prizes</h3>{prizes.filter(p => p.rank || p.reward).map((p, i) => <p key={i} style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>🏆 {p.rank}: {p.reward}</p>)}</div>}
          {faqs.some(f => f.q && f.a) && <div style={{ marginBottom: '1rem' }}><h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>FAQs</h3>{faqs.filter(f => f.q && f.a).map((f, i) => <div key={i} style={{ marginBottom: '0.5rem' }}><p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>Q: {f.q}</p><p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>A: {f.a}</p></div>)}</div>}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>— End of Preview —</p>
        </div>
      </Modal>

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
