import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { sampleEvents, sampleRegistrations, sampleCredentials } from '../utils/sampleData';
import {
  buildEventPathSegment,
  generateCredentialId,
  generateId,
  generateQRToken,
  generateTeamQRToken,
  slugifyEventTitle,
} from '../utils/helpers';
import {
  checkInByQrToken,
  createEventRecord,
  createRegistrationRecord,
  deleteEventRecord,
  deleteRegistrationRecord,
  listEvents as listFirebaseEvents,
  listRegistrations as listFirebaseRegistrations,
  updateEventRecord,
  updateRegistrationRecord,
} from '../lib/supabase-data';

const EventContext = createContext(null);

function safeReadJson(key, fallback) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage || typeof localStorage.getItem !== 'function') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage || typeof localStorage.setItem !== 'function') {
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to persist ${key} in localStorage.`, error);
    return false;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildParticipantSnapshot(source = {}) {
  return {
    id: source.id || null,
    name: source.name || '',
    email: source.email || '',
    role: source.role || 'participant',
    institution: source.institution || '',
    organizationName: source.organizationName || '',
    avatar: source.avatar || '',
    socials: source.socials || { linkedin: '', github: '', instagram: '' },
  };
}

function getCertificateRecipients(registration, fallbackName) {
  if (Array.isArray(registration?.members) && registration.members.length > 0) {
    return registration.members;
  }
  return [fallbackName || 'Participant'];
}

function getEventOrganizerId(event = {}) {
  const owner = event.organiser || event.organizer || {};
  return String(owner.id || '').trim();
}

function mergeRegistrations(...registrationLists) {
  const merged = [];
  const seen = new Set();

  registrationLists.forEach((list) => {
    if (!Array.isArray(list)) return;

    list.forEach((registration) => {
      const id = String(registration?.id || '').trim();
      const fallbackId = `${registration?.eventId || ''}:${registration?.userId || ''}:${registration?.createdAt || ''}`;
      const key = id || fallbackId;
      if (!key || seen.has(key)) return;

      seen.add(key);
      merged.push(registration);
    });
  });

  return merged.sort(
    (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
  );
}

function normalizePaymentStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid' || value === 'success' || value === 'successful') return 'paid';
  if (value === 'pending') return 'pending';
  return 'not-paid';
}

function normalizeRegistrationField(value) {
  return String(value || '').trim().toLowerCase();
}

function buildCertificateImage({ event, recipients, type, config }) {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f7f8ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#6b76ff');
  grad.addColorStop(0.5, '#a66ce8');
  grad.addColorStop(1, '#f093b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, 180);

  ctx.fillStyle = '#1d2b54';
  ctx.font = '700 60px Georgia';
  ctx.fillText(config?.title || 'Certificate of Achievement', 110, 290);

  ctx.fillStyle = '#55658f';
  ctx.font = '400 33px Arial';
  ctx.fillText(config?.subtitle || 'This is proudly presented to', 110, 352);

  ctx.fillStyle = '#121f44';
  ctx.font = '700 52px Arial';
  ctx.fillText(recipients.join(', '), 110, 440);

  ctx.fillStyle = '#4f5f88';
  ctx.font = '400 30px Arial';
  const eventLine = config?.description || `For successful participation in ${event?.title || 'the event'}`;
  ctx.fillText(eventLine, 110, 505);

  ctx.fillStyle = '#4f5f88';
  ctx.font = '500 28px Arial';
  ctx.fillText(`Credential type: ${type}`, 110, 555);

  ctx.fillStyle = '#34487a';
  ctx.font = '600 30px Arial';
  ctx.fillText(`Issued on ${new Date().toLocaleDateString()}`, 110, 860);

  if (config?.signatoryName) {
    ctx.fillStyle = '#1e2e56';
    ctx.font = '700 32px Arial';
    ctx.fillText(config.signatoryName, 1120, 860);
    ctx.fillStyle = '#5a6a93';
    ctx.font = '500 24px Arial';
    ctx.fillText(config.signatoryRole || 'Host', 1120, 900);
  }

  if (config?.logoUrl) {
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = config.logoUrl;
  }

  return canvas.toDataURL('image/png');
}

export function EventProvider({ children }) {
  const syncWarnRef = useRef(0);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [events, setEvents] = useState(() => {
    const cached = safeReadJson('hm_events', null);
    if (cached) return cached;
    safeWriteJson('hm_events', sampleEvents);
    return sampleEvents;
  });
  const [registrations, setRegistrations] = useState(() => {
    const cached = safeReadJson('hm_registrations', null);
    if (cached) return cached;
    safeWriteJson('hm_registrations', sampleRegistrations);
    return sampleRegistrations;
  });
  const [credentials, setCredentials] = useState(() => {
    const cached = safeReadJson('hm_credentials', null);
    if (cached) return cached;
    safeWriteJson('hm_credentials', sampleCredentials);
    return sampleCredentials;
  });
  const [teamInvitations, setTeamInvitations] = useState(() => {
    const cached = safeReadJson('hm_team_invitations', null);
    if (cached) return cached;
    safeWriteJson('hm_team_invitations', []);
    return [];
  });
  const [organizerNotifications, setOrganizerNotifications] = useState(() => {
    const cached = safeReadJson('hm_organizer_notifications', null);
    if (cached) return cached;
    safeWriteJson('hm_organizer_notifications', []);
    return [];
  });

  const saveEvents = (data) => {
    setEvents(data);
    safeWriteJson('hm_events', data);
  };

  const saveRegistrations = (data) => {
    setRegistrations(data);
    safeWriteJson('hm_registrations', data);
  };

  const saveCredentials = (data) => {
    setCredentials(data);
    safeWriteJson('hm_credentials', data);
  };

  const saveTeamInvitations = (data) => {
    setTeamInvitations(data);
    safeWriteJson('hm_team_invitations', data);
  };

  const saveOrganizerNotifications = (data) => {
    setOrganizerNotifications(data);
    safeWriteJson('hm_organizer_notifications', data);
  };

  // Intentionally mounted once; internal polling and focus handlers drive re-sync.
  useEffect(() => {
    let active = true;
    let firstSync = true;

    const syncFromFirebase = async () => {
      try {
        const [remoteEvents, remoteRegistrations] = await Promise.all([
          listFirebaseEvents(),
          listFirebaseRegistrations(),
        ]);

        if (!active) return;

        const normalizedEvents = (Array.isArray(remoteEvents) ? remoteEvents : []).map((item) => ({
          ...item,
          organiser: item.organiser || item.organizer || {},
          organizer: item.organizer || item.organiser || {},
        }));

        saveEvents(normalizedEvents);
        saveRegistrations(Array.isArray(remoteRegistrations) ? remoteRegistrations : []);
      } catch (error) {
        const now = Date.now();
        if (now - syncWarnRef.current > 30000) {
          syncWarnRef.current = now;
          console.warn('Firebase sync failed, using local cache.', error);
        }
      } finally {
        if (active && firstSync) {
          firstSync = false;
          setEventsLoading(false);
        }
      }
    };

    syncFromFirebase();

    const pollId = window.setInterval(() => {
      void syncFromFirebase();
    }, 5000);

    const onFocus = () => {
      void syncFromFirebase();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromFirebase();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const createOrganizerNotification = ({ organizerId, eventId, type, title, message, payload = {} }) => {
    if (!organizerId) return null;

    const notification = {
      id: generateId('noti'),
      organizerId,
      eventId,
      type,
      title,
      message,
      payload,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [notification, ...organizerNotifications];
    saveOrganizerNotifications(updated);
    return notification;
  };

  const getOrganizerNotifications = (organizerId) => {
    const normalizedOrganizerId = String(organizerId || '').trim();
    if (!normalizedOrganizerId) return [];

    const savedNotifications = organizerNotifications.filter(
      (item) => String(item.organizerId || '') === normalizedOrganizerId
    );

    const savedRegistrationIds = new Set(
      savedNotifications
        .map((item) => String(item.payload?.registrationId || '').trim())
        .filter(Boolean)
    );

    const ownedEvents = events.filter((event) => getEventOrganizerId(event) === normalizedOrganizerId);
    const ownedEventMap = new Map(
      ownedEvents
        .map((event) => [String(event.id || '').trim(), event])
        .filter(([id]) => Boolean(id))
    );

    const derivedNotifications = registrations
      .filter((registration) => ownedEventMap.has(String(registration.eventId || '').trim()))
      .filter((registration) => !savedRegistrationIds.has(String(registration.id || '').trim()))
      .map((registration) => {
        const event = ownedEventMap.get(String(registration.eventId || '').trim());
        const participantName =
          registration.participant?.name ||
          registration.teamName ||
          registration.participant?.email ||
          'A participant';
        const members = Array.isArray(registration.members)
          ? registration.members.map((member) => String(member || '').trim()).filter(Boolean)
          : [];
        const derivedIdSeed =
          registration.id ||
          `${registration.eventId || ''}:${registration.userId || ''}:${registration.createdAt || ''}`;

        return {
          id: `derived-reg-${derivedIdSeed}`,
          organizerId: normalizedOrganizerId,
          eventId: String(registration.eventId || '').trim(),
          type: 'new-registration',
          title: `New registration for ${event?.title || 'your event'}`,
          message: registration.teamName
            ? `${participantName} registered with team ${registration.teamName}.`
            : `${participantName} registered for your event.`,
          payload: {
            registrationId: registration.id,
            participant: registration.participant || null,
            teamName: registration.teamName || '',
            members,
          },
          read: false,
          createdAt: registration.createdAt || new Date().toISOString(),
        };
      });

    return [...savedNotifications, ...derivedNotifications].sort(
      (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
    );
  };

  const markOrganizerNotificationRead = (notificationId, organizerId = null) => {
    let matchedStored = false;
    const updatedStored = organizerNotifications.map((item) => {
      if (item.id !== notificationId) return item;
      matchedStored = true;
      return { ...item, read: true };
    });

    if (matchedStored) {
      saveOrganizerNotifications(updatedStored);
      return;
    }

    const match = organizerId
      ? getOrganizerNotifications(organizerId).find((item) => item.id === notificationId)
      : null;

    if (!match) return;

    const deduped = organizerNotifications.filter(
      (item) => String(item.payload?.registrationId || '') !== String(match.payload?.registrationId || '')
    );
    saveOrganizerNotifications([{ ...match, read: true }, ...deduped]);
  };

  const markAllOrganizerNotificationsRead = (organizerId) => {
    const normalizedOrganizerId = String(organizerId || '').trim();
    if (!normalizedOrganizerId) return;

    const readAllForOrganizer = getOrganizerNotifications(normalizedOrganizerId).map((item) => ({
      ...item,
      read: true,
    }));
    const otherOrganizers = organizerNotifications.filter(
      (item) => String(item.organizerId || '') !== normalizedOrganizerId
    );

    saveOrganizerNotifications([...readAllForOrganizer, ...otherOrganizers]);
  };

  const createEvent = async (eventData) => {
    const normalizedOrganiser = eventData.organiser || eventData.organizer || {};
    const newEvent = {
      id: generateId('evt'),
      ...eventData,
      organiser: normalizedOrganiser,
      organizer: eventData.organizer || normalizedOrganiser,
      registeredCount: 0,
      featured: false,
      createdAt: new Date().toISOString(),
    };
    try {
      const savedEvent = await createEventRecord(newEvent);
      const updated = [...events, savedEvent];
      saveEvents(updated);
      return { success: true, event: savedEvent };
    } catch (error) {
      console.warn('Event persistence failed:', error);
      const rawMessage = String(error?.message || 'Failed to save event');
      const friendlyMessage = rawMessage.includes('exceeds the maximum allowed size')
        ? 'Event is too large for Firestore (max 1MB). Reduce embedded image size or use image URLs.'
        : rawMessage;
      return { success: false, error: friendlyMessage };
    }
  };

  const updateEvent = (eventId, updates) => {
    const updated = events.map((event) => {
      if (event.id !== eventId) return event;
      const mergedOrganiser = {
        ...(event.organiser || event.organizer || {}),
        ...(updates.organiser || updates.organizer || {}),
      };
      return {
        ...event,
        ...updates,
        organiser: mergedOrganiser,
        organizer: updates.organizer || mergedOrganiser,
        updatedAt: new Date().toISOString(),
      };
    });
    saveEvents(updated);

    void (async () => {
      try {
        const savedEvent = await updateEventRecord(eventId, updates);

        const latest = JSON.parse(localStorage.getItem('hm_events') || '[]');
        const synced = latest.map((event) => (event.id === eventId ? savedEvent : event));
        saveEvents(synced);
      } catch (error) {
        console.warn('Event update persistence failed:', error);
      }
    })();
  };

  const deleteEvent = async (eventId, confirmTitle) => {
    const resolvedEventId = String(eventId || '').trim();
    void confirmTitle;
    if (!resolvedEventId) {
      return { success: false, error: 'Event id is missing. Please refresh and try again.' };
    }

    try {
      await deleteEventRecord(resolvedEventId);

      saveEvents(
        events.filter(
          (event) =>
            String(event.id || '') !== resolvedEventId &&
            String(event._id || '') !== resolvedEventId
        )
      );
      saveRegistrations(registrations.filter((item) => String(item.eventId || '') !== resolvedEventId));
      saveCredentials(credentials.filter((item) => String(item.eventId || '') !== resolvedEventId));
      saveTeamInvitations(teamInvitations.filter((item) => String(item.eventId || '') !== resolvedEventId));
      saveOrganizerNotifications(organizerNotifications.filter((item) => String(item.eventId || '') !== resolvedEventId));
      return { success: true };
    } catch (error) {
      console.warn('Event delete persistence failed:', error);
      return { success: false, error: error?.message || 'Failed to delete event.' };
    }
  };

  const registerForEvent = async (eventId, userId, teamData = {}, userProfile = null) => {
    const existing = registrations.find(r => r.userId === userId && r.eventId === eventId);
    if (existing) return { success: false, error: 'Already registered for this event' };

    const event = events.find((item) => item.id === eventId);
    if (!event) return { success: false, error: 'Event not found' };

    const participant = buildParticipantSnapshot(userProfile || {});
    const hasTeam = Boolean(String(teamData.teamName || '').trim());
    const teamId = hasTeam ? String(teamData.teamId || generateId('team')) : null;
    const teamQrToken = hasTeam ? String(teamData.teamQrToken || generateTeamQRToken(eventId, teamId)) : null;
    const paymentStatus = normalizePaymentStatus(teamData.paymentStatus);
    const memberList = Array.from(
      new Set(
        [
          ...(Array.isArray(teamData.members) ? teamData.members : []),
          participant.name || participant.email,
        ]
          .map((member) => String(member || '').trim())
          .filter(Boolean)
      )
    );
    const teamSize = event.teamSize && typeof event.teamSize === 'object' ? event.teamSize : null;
    const minTeamSize = Number.parseInt(teamSize?.min, 10);
    const maxTeamSize = Number.parseInt(teamSize?.max, 10);
    const hasValidTeamRange = Number.isInteger(minTeamSize) && Number.isInteger(maxTeamSize) && minTeamSize > 0 && maxTeamSize >= minTeamSize;

    if (hasValidTeamRange) {
      if (!hasTeam) {
        return { success: false, error: `This event requires a team of ${minTeamSize}-${maxTeamSize} members.` };
      }

      if (memberList.length < minTeamSize || memberList.length > maxTeamSize) {
        return { success: false, error: `Team size must be between ${minTeamSize} and ${maxTeamSize} members.` };
      }
    } else if (memberList.length > 1) {
      return { success: false, error: 'This event only allows individual registration.' };
    }

    const qrToken = teamQrToken || generateQRToken(eventId, userId);
    const newReg = {
      id: generateId('reg'),
      userId,
      eventId,
      teamLeadId: userId,
      teamId,
      participantType: teamData.participantType || 'student',
      teamName: teamData.teamName || null,
      teamSize: teamData.teamSize || null,
      teamLeadName: teamData.teamLeadName || null,
      members: memberList,
      participant,
      paymentStatus,
      qrToken,
      checkedIn: false,
      checkedInAt: null,
      createdAt: new Date().toISOString(),
      ...teamData,
    };

    try {
      const payload = await createRegistrationRecord(eventId, newReg);
      const registeredEvent = payload?.event || event;
      const registeredEntry = payload?.registration || newReg;
      const updatedRegs = mergeRegistrations(registrations, [registeredEntry]);
      saveRegistrations(updatedRegs);

      const updatedEvents = events.map((item) =>
        item.id === eventId
          ? {
              ...item,
              ...registeredEvent,
              organiser: registeredEvent.organiser || registeredEvent.organizer || item.organiser || item.organizer || {},
              organizer: registeredEvent.organizer || registeredEvent.organiser || item.organizer || item.organiser || {},
            }
          : item
      );
      saveEvents(updatedEvents);

      createOrganizerNotification({
        organizerId: getEventOrganizerId(registeredEvent),
        eventId,
        type: 'new-registration',
        title: `New registration for ${registeredEvent.title}`,
        message: `${participant.name || participant.email || 'A participant'} registered for your event.`,
        payload: {
          registrationId: registeredEntry.id,
          participant,
          teamName: registeredEntry.teamName,
          members: registeredEntry.members,
          paymentStatus: registeredEntry.paymentStatus,
        },
      });

      return { success: true, registration: registeredEntry };
    } catch (error) {
      console.warn('Registration persistence failed:', error);
      return { success: false, error: error?.message || 'Failed to register for event.' };
    }
  };

  const updateTeamRegistration = async ({
    registrationId,
    eventId,
    teamName,
    teamLeadName,
    participantType,
    members = [],
    removedMemberLabels = [],
  }) => {
    const resolvedRegistrationId = String(registrationId || '').trim();
    const resolvedEventId = String(eventId || '').trim();
    if (!resolvedRegistrationId || !resolvedEventId) {
      return { success: false, error: 'Team registration could not be updated.' };
    }

    const currentLeadRegistration = registrations.find((entry) => String(entry.id || '') === resolvedRegistrationId);
    if (!currentLeadRegistration) {
      return { success: false, error: 'Team registration was not found.' };
    }

    const nextMembers = Array.from(
      new Set(
        members
          .map((member) => String(member || '').trim())
          .filter(Boolean)
      )
    );
    const leadLabel = String(teamLeadName || currentLeadRegistration.teamLeadName || currentLeadRegistration.participant?.name || currentLeadRegistration.participant?.email || '').trim();
    const mergedMembers = leadLabel ? [leadLabel, ...nextMembers] : nextMembers;

    const updatedLead = await updateRegistrationRecord(resolvedRegistrationId, {
      ...currentLeadRegistration,
      participantType: participantType || currentLeadRegistration.participantType || 'student',
      teamName: teamName || currentLeadRegistration.teamName || null,
      teamLeadName: leadLabel || currentLeadRegistration.teamLeadName || null,
      teamLeadId: currentLeadRegistration.teamLeadId || currentLeadRegistration.userId,
      teamSize: mergedMembers.length,
      members: mergedMembers,
    });

    const removedLabels = Array.from(
      new Set(
        (Array.isArray(removedMemberLabels) ? removedMemberLabels : [])
          .map((label) => String(label || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const deletedRegistrationIds = [];
    if (removedLabels.length > 0) {
      const relatedRegistrations = registrations.filter((entry) =>
        String(entry.eventId || '') === resolvedEventId &&
        String(entry.id || '') !== resolvedRegistrationId &&
        String(entry.teamId || '') === String(currentLeadRegistration.teamId || '')
      );

      for (const entry of relatedRegistrations) {
        const participantName = normalizeRegistrationField(entry.participant?.name);
        const participantEmail = normalizeRegistrationField(entry.participant?.email);
        const memberLabels = Array.isArray(entry.members)
          ? entry.members.map((member) => normalizeRegistrationField(member))
          : [];

        const shouldRemove = removedLabels.some(
          (label) => label === participantName || label === participantEmail || memberLabels.includes(label)
        );

        if (!shouldRemove) continue;

        await deleteRegistrationRecord(entry.id);
        deletedRegistrationIds.push(entry.id);
      }
    }

    const nextRegistrations = registrations
      .filter((entry) => !deletedRegistrationIds.includes(entry.id))
      .map((entry) => (String(entry.id || '') === resolvedRegistrationId ? updatedLead : entry));

    saveRegistrations(nextRegistrations);

    const removedCount = deletedRegistrationIds.length;
    if (removedCount > 0) {
      const targetEvent = events.find((entry) => String(entry.id || '') === resolvedEventId) || null;
      const updatedEvents = events.map((entry) => {
        if (String(entry.id || '') !== resolvedEventId) return entry;
        return {
          ...entry,
          registeredCount: Math.max(0, Number(entry.registeredCount || 0) - removedCount),
        };
      });
      saveEvents(updatedEvents);

      void updateEventRecord(resolvedEventId, {
        registeredCount: Math.max(0, Number(targetEvent?.registeredCount || 0) - removedCount),
      }).catch((error) => {
        console.warn('Team update event count sync failed:', error);
      });
    }

    return { success: true, registration: updatedLead, removedRegistrationIds: deletedRegistrationIds };
  };

  const checkInParticipant = async (qrToken) => {
    const scannedToken = String(qrToken || '').trim();
    if (!scannedToken) {
      return { success: false, status: 'invalid', message: 'QR token is required for validation.' };
    }

    try {
      const payload = await checkInByQrToken(scannedToken);
      const result = {
        success: Boolean(payload?.success),
        status: payload?.status || 'valid',
        message: payload?.message || 'Validation completed successfully.',
        team: payload?.team || null,
        event: payload?.event || null,
        checkedInAt: payload?.checkedInAt || null,
      };

      if (payload?.team?.registrationIds?.length) {
        const updated = registrations.map((registration) =>
          payload.team.registrationIds.includes(registration.id)
            ? {
                ...registration,
                checkedIn: true,
                checkedInAt: payload?.checkedInAt || registration.checkedInAt || new Date().toISOString(),
              }
            : registration
        );
        saveRegistrations(updated);
      }

      return result;
    } catch {
      return {
        success: false,
        status: 'invalid',
        message: 'Validation service is unreachable. Please try again.',
      };
    }
  };

  const issueCredential = (userId, eventId, type = 'participation') => {
    const existing = credentials.find(c => c.userId === userId && c.eventId === eventId);
    if (existing) return existing;

    const event = events.find((item) => item.id === eventId);
    const registration = registrations.find((item) => item.userId === userId && item.eventId === eventId);
    const recipients = getCertificateRecipients(registration, registration?.members?.[0]);
    const certificateImageUrl = buildCertificateImage({
      event,
      recipients,
      type,
      config: event?.credentialConfig,
    });

    const newCred = {
      id: generateCredentialId(),
      userId,
      eventId,
      type,
      issuedAt: new Date().toISOString(),
      credentialQR: `CRED-${generateId('v')}`,
      recipients,
      certificateImageUrl,
      templateName: event?.credentialTemplate || 'Classic',
    };
    const updated = [...credentials, newCred];
    saveCredentials(updated);
    return newCred;
  };

  const bulkIssueCredentials = (eventId, userIds, type = 'participation') => {
    const event = events.find((item) => item.id === eventId);
    const newCreds = userIds
      .filter(uid => !credentials.find(c => c.userId === uid && c.eventId === eventId))
      .map(uid => {
        const registration = registrations.find((item) => item.userId === uid && item.eventId === eventId);
        const recipients = getCertificateRecipients(registration, registration?.members?.[0]);
        return {
          id: generateCredentialId(),
          userId: uid,
          eventId,
          type,
          issuedAt: new Date().toISOString(),
          credentialQR: `CRED-${generateId('v')}`,
          recipients,
          certificateImageUrl: buildCertificateImage({
            event,
            recipients,
            type,
            config: event?.credentialConfig,
          }),
          templateName: event?.credentialTemplate || 'Classic',
        };
      });
    const updated = [...credentials, ...newCreds];
    saveCredentials(updated);
    return newCreds;
  };

  const claimCredential = (eventId, userId, type = 'participation') => {
    const existing = credentials.find((item) => item.eventId === eventId && item.userId === userId);
    if (existing) return { success: true, credential: existing, existed: true };

    const event = events.find((item) => item.id === eventId);
    if (!event?.credentialEnabled) {
      return { success: false, error: 'Credentials are not enabled for this event.' };
    }

    const registration = registrations.find((item) => item.eventId === eventId && item.userId === userId);
    if (!registration?.checkedIn) {
      return { success: false, error: 'You can claim credentials only after check-in.' };
    }

    const created = issueCredential(userId, eventId, type);
    return { success: true, credential: created, existed: false };
  };

  const getUserRegistrations = (userId) => registrations.filter(r => r.userId === userId);
  const getEventRegistrations = (eventId) => registrations.filter(r => r.eventId === eventId);
  const getUserCredentials = (userId) => credentials.filter(c => c.userId === userId);
  const getEventById = (eventId) => {
    const raw = String(eventId || '').trim();
    if (!raw) return null;

    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }

    const directMatch = events.find((event) => {
      const eventRawId = String(event?.id || event?._id || '').trim();
      return eventRawId === decoded;
    });
    if (directMatch) return directMatch;

    const normalizedSlug = String(decoded || '').trim().toLowerCase();
    const slugMatch = events.find((event) => {
      const titleOnlySlug = String(slugifyEventTitle(event?.title) || '').trim().toLowerCase();
      return Boolean(titleOnlySlug) && titleOnlySlug === normalizedSlug;
    });
    if (slugMatch) return slugMatch;

    const extractedIdMatch = decoded.match(/(evt-[a-z0-9-]+)$/i);
    const extractedId = String(extractedIdMatch?.[1] || '').trim();
    if (extractedId) {
      const extractedMatch = events.find((event) => {
        const eventRawId = String(event?.id || event?._id || '').trim();
        return eventRawId === extractedId;
      });
      if (extractedMatch) return extractedMatch;
    }

    return (
      events.find((event) => {
        const canonicalSegment = String(buildEventPathSegment(event) || '').trim().toLowerCase();
        const titleOnlySlug = String(slugifyEventTitle(event?.title) || '').trim().toLowerCase();
        return canonicalSegment === normalizedSlug || titleOnlySlug === normalizedSlug;
      }) || null
    );
  };

  const getEventRegistrationForUser = (eventId, user = null) => {
    const normalizedEmail = normalizeRegistrationField(user?.email);
    const normalizedName = normalizeRegistrationField(user?.name);
    const userId = String(user?.id || '').trim();

    return registrations.find((registration) => {
      if (registration.eventId !== eventId) return false;
      if (registration.userId === userId) return true;

      const participant = registration.participant || {};
      if (String(participant.id || '').trim() === userId) return true;

      const participantEmail = normalizeRegistrationField(participant.email);
      const participantName = normalizeRegistrationField(participant.name);
      const memberEmails = Array.isArray(registration.members)
        ? registration.members.map((member) => normalizeRegistrationField(member))
        : [];

      return (
        (normalizedEmail && (participantEmail === normalizedEmail || memberEmails.includes(normalizedEmail))) ||
        (normalizedName && (participantName === normalizedName || memberEmails.includes(normalizedName)))
      );
    }) || null;
  };

  const syncParticipantDetailsInRegistrations = (userId, userProfile = {}) => {
    if (!userId) return;

    const snapshot = buildParticipantSnapshot(userProfile);
    const updated = registrations.map((entry) =>
      entry.userId === userId
        ? {
            ...entry,
            participant: {
              ...(entry.participant || {}),
              ...snapshot,
            },
          }
        : entry
    );

    saveRegistrations(updated);
  };

  const createTeamInvitation = async ({ eventId, inviterId, inviterName, teamName, inviteeEmail }) => {
    const normalizedEmail = normalizeEmail(inviteeEmail);
    if (!normalizedEmail) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return { success: false, error: 'Event not found for invitation.' };
    }

    const duplicate = teamInvitations.find(
      (invite) =>
        invite.eventId === eventId &&
        normalizeEmail(invite.inviteeEmail) === normalizedEmail &&
        invite.status === 'pending'
    );

    if (duplicate) {
      const joinUrl = `${window.location.origin}/invites/${duplicate.id}`;
      return {
        success: true,
        existed: true,
        invite: duplicate,
        joinUrl,
        emailSent: false,
        mailtoUrl: `mailto:${duplicate.inviteeEmail}?subject=${encodeURIComponent(`Hunchmate Team Invite: ${event.title}`)}&body=${encodeURIComponent(
          `You have been invited by ${inviterName || 'a teammate'} to join the team "${teamName || 'Team'}" for ${event.title}.\n\nJoin here: ${joinUrl}`
        )}`,
      };
    }

    const users = JSON.parse(localStorage.getItem('hm_users') || '[]');
    const matchedUser = users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);

    const invite = {
      id: generateId('inv'),
      eventId,
      inviterId,
      inviterName: inviterName || '',
      teamName: teamName || '',
      inviteeEmail: normalizedEmail,
      inviteeUserId: matchedUser?.id || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      acceptedByUserId: null,
    };

    const updatedInvites = [...teamInvitations, invite];
    saveTeamInvitations(updatedInvites);

    const joinUrl = `${window.location.origin}/invites/${invite.id}`;
    const mailtoUrl = `mailto:${invite.inviteeEmail}?subject=${encodeURIComponent(`Hunchmate Team Invite: ${event.title}`)}&body=${encodeURIComponent(
      `You have been invited by ${inviterName || 'a teammate'} to join the team "${teamName || 'Team'}" for ${event.title}.\n\nClick Join Team: ${joinUrl}`
    )}`;

    const outbound = JSON.parse(localStorage.getItem('hm_outbound_emails') || '[]');
    const emailApiUrl = (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_INVITE_EMAIL_API_URL || process.env.VITE_INVITE_EMAIL_API_URL) : '') ||
      (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_INVITE_EMAIL_API_URL : '') ||
      'http://localhost:8787/api/invitations/email';
    let emailSent = false;
    let emailError = '';

    try {
      const response = await fetch(emailApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invite.inviteeEmail,
          invitedEmail: invite.inviteeEmail,
          inviterName: inviterName || 'A teammate',
          teamName: teamName || 'Hunchmate Team',
          eventTitle: event.title,
          joinUrl,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        emailError = payload?.error || `Mail API failed with status ${response.status}`;
      } else {
        emailSent = true;
      }
    } catch {
      emailError = 'Mail API unavailable. Use Open Email to send manually.';
    }

    outbound.push({
      id: generateId('mail'),
      to: invite.inviteeEmail,
      type: 'team-invitation',
      inviteId: invite.id,
      eventId,
      createdAt: new Date().toISOString(),
      joinUrl,
      status: emailSent ? 'sent' : 'pending-manual',
      error: emailError,
    });
    localStorage.setItem('hm_outbound_emails', JSON.stringify(outbound));

    return {
      success: true,
      invite,
      joinUrl,
      mailtoUrl,
      emailSent,
      emailError,
      isRegistered: Boolean(matchedUser),
    };
  };

  const getInvitationById = (inviteId) => teamInvitations.find((invite) => invite.id === inviteId);

  const acceptTeamInvitation = (inviteId, userId) => {
    const invite = teamInvitations.find((item) => item.id === inviteId);
    if (!invite) {
      return { success: false, error: 'Invitation not found or expired.' };
    }

    if (invite.status === 'accepted') {
      return { success: true, accepted: true, alreadyAccepted: true };
    }

    const users = JSON.parse(localStorage.getItem('hm_users') || '[]');
    const currentUser = users.find((entry) => entry.id === userId);
    if (!currentUser) {
      return { success: false, error: 'Please sign in to accept this invitation.' };
    }

    if (normalizeEmail(currentUser.email) !== normalizeEmail(invite.inviteeEmail)) {
      return { success: false, error: 'This invitation belongs to another email address.' };
    }

    const event = events.find((item) => item.id === invite.eventId);
    if (!event) {
      return { success: false, error: 'This event is no longer available.' };
    }

    const alreadyRegistered = registrations.find((entry) => entry.userId === userId && entry.eventId === invite.eventId);
    let updatedRegistrations = registrations;
    let registrationCreated = null;

    if (!alreadyRegistered) {
      const leaderRegistration = registrations.find(
        (entry) => entry.eventId === invite.eventId && entry.userId === invite.inviterId && !entry.parentRegistrationId
      );

      const resolvedTeamId = String(leaderRegistration?.teamId || generateId('team'));
      const resolvedTeamQrToken = String(
        leaderRegistration?.qrToken || generateTeamQRToken(invite.eventId, resolvedTeamId)
      );
      const resolvedPaymentStatus = normalizePaymentStatus(leaderRegistration?.paymentStatus || 'not-paid');

      registrationCreated = {
        id: generateId('reg'),
        userId,
        eventId: invite.eventId,
        teamLeadId: leaderRegistration?.teamLeadId || leaderRegistration?.userId || invite.inviterId,
        teamId: resolvedTeamId,
        teamName: invite.teamName || leaderRegistration?.teamName || null,
        members: [currentUser.name || currentUser.email],
        participant: buildParticipantSnapshot(currentUser),
        paymentStatus: resolvedPaymentStatus,
        qrToken: resolvedTeamQrToken,
        checkedIn: false,
        checkedInAt: null,
        parentRegistrationId: leaderRegistration?.id || null,
        joinedViaInviteId: invite.id,
        createdAt: new Date().toISOString(),
      };

      updatedRegistrations = [...registrations, registrationCreated];

      if (leaderRegistration) {
        updatedRegistrations = updatedRegistrations.map((entry) => {
          if (entry.id !== leaderRegistration.id) return entry;
          const leaderMembers = Array.isArray(entry.members) ? entry.members : [];
          const memberName = currentUser.name || currentUser.email;
          if (leaderMembers.includes(memberName)) return entry;
          return { ...entry, members: [...leaderMembers, memberName] };
        });
      }

      saveRegistrations(updatedRegistrations);

      const updatedEvents = events.map((item) =>
        item.id === invite.eventId ? { ...item, registeredCount: (item.registeredCount || 0) + 1 } : item
      );
      saveEvents(updatedEvents);

      createOrganizerNotification({
        organizerId: getEventOrganizerId(event),
        eventId: invite.eventId,
        type: 'invite-accepted',
        title: `Team invite accepted in ${event.title}`,
        message: `${currentUser.name || currentUser.email} joined team ${invite.teamName || 'Team'}.`,
        payload: {
          invitationId: invite.id,
          participant: buildParticipantSnapshot(currentUser),
          teamName: invite.teamName || '',
          paymentStatus: resolvedPaymentStatus,
          registrationId: registrationCreated.id,
        },
      });
    }

    const updatedInvites = teamInvitations.map((item) =>
      item.id === inviteId
        ? {
            ...item,
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
            acceptedByUserId: userId,
            inviteeUserId: userId,
          }
        : item
    );
    saveTeamInvitations(updatedInvites);

    return {
      success: true,
      accepted: true,
      registrationCreated,
      alreadyRegistered: Boolean(alreadyRegistered),
    };
  };

  return (
    <EventContext.Provider value={{
      events, registrations, credentials, teamInvitations, organizerNotifications,
      eventsLoading,
      createEvent, updateEvent, deleteEvent,
      registerForEvent, updateTeamRegistration, checkInParticipant,
      issueCredential, bulkIssueCredentials, claimCredential,
      createTeamInvitation, getInvitationById, acceptTeamInvitation,
      getOrganizerNotifications, markOrganizerNotificationRead, markAllOrganizerNotificationsRead,
      syncParticipantDetailsInRegistrations,
      getUserRegistrations, getEventRegistrations,
      getUserCredentials, getEventById, getEventRegistrationForUser,
    }}>
      {children}
    </EventContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvents must be used within EventProvider');
  return context;
};
