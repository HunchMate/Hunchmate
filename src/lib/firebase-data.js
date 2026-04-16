import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseDb, firebaseReady } from './firebase';

function assertFirebaseReady() {
  if (!firebaseReady || !firebaseDb) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* variables.');
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'admin') return 'admin';
  if (value === 'organizer' || value === 'organiser') return 'organizer';
  return 'participant';
}

function normalizeUserStatus(status) {
  return status === 'suspended' ? 'suspended' : 'active';
}

function normalizeComplaintStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'resolved') return 'resolved';
  if (value === 'in-progress' || value === 'in_progress' || value === 'progress') return 'in-progress';
  return 'raised';
}

function normalizeParticipantProfile(raw = {}) {
  return {
    profileType: raw.profileType || '',
    stream: raw.stream || '',
    graduationYear: raw.graduationYear || '',
    institutionName: raw.institutionName || raw.institution || '',
    skills: Array.isArray(raw.skills) ? raw.skills : [],
  };
}

function normalizeOrganizerProfile(raw = {}) {
  return {
    hostType: raw.hostType || '',
    organizationName: raw.organizationName || '',
    phoneNumber: raw.phoneNumber || '',
    state: raw.state || '',
    city: raw.city || '',
    experience: raw.experience || '',
    techProficiency: raw.techProficiency || '',
    workSummary: raw.workSummary || '',
    currentDesignation: raw.currentDesignation || '',
  };
}

function normalizeUserDocument(raw = {}) {
  const participantProfile = normalizeParticipantProfile({
    ...raw,
    ...(raw.participantProfile || {}),
  });
  const organizerProfile = normalizeOrganizerProfile({
    ...raw,
    ...(raw.organizerProfile || {}),
  });

  return {
    id: raw.id || raw.uid || '',
    email: String(raw.email || '').trim().toLowerCase(),
    name: raw.name || raw.displayName || '',
    role: normalizeRole(raw.role),
    status: normalizeUserStatus(raw.status),
    provider: raw.provider || 'firebase',
    onboardingCompleted: Boolean(raw.onboardingCompleted),
    hostOnboardingCompleted: Boolean(raw.hostOnboardingCompleted),
    profile: raw.profile || {},
    avatar: raw.avatar || '',
    avatarBackdrop: raw.avatarBackdrop || '',
    bio: raw.bio || '',
    institution: raw.institution || '',
    organizationName: raw.organizationName || '',
    location: raw.location || '',
    headline: raw.headline || '',
    website: raw.website || '',
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    profileType: raw.profileType || '',
    stream: raw.stream || '',
    graduationYear: raw.graduationYear || '',
    institutionName: raw.institutionName || '',
    hostType: raw.hostType || '',
    phoneNumber: raw.phoneNumber || '',
    state: raw.state || '',
    city: raw.city || '',
    experience: raw.experience || '',
    techProficiency: raw.techProficiency || '',
    workSummary: raw.workSummary || '',
    currentDesignation: raw.currentDesignation || '',
    socials: {
      linkedin: String(raw?.socials?.linkedin || ''),
      github: String(raw?.socials?.github || ''),
      instagram: String(raw?.socials?.instagram || ''),
    },
    termsAccepted: Boolean(raw.termsAccepted),
    termsAcceptedAt: raw.termsAcceptedAt || null,
    participantProfile,
    organizerProfile,
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || nowIso(),
  };
}

export async function upsertUserProfileFromAuthUser(authUser, options = {}) {
  assertFirebaseReady();
  if (!authUser?.uid) throw new Error('Invalid authenticated user.');

  const uid = authUser.uid;
  const userRef = doc(firebaseDb, 'users', uid);
  const existingSnap = await getDoc(userRef);
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  const normalizedEmail = String(authUser.email || options.email || '').trim().toLowerCase();
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const autoAdmin = normalizedEmail && adminEmails.includes(normalizedEmail);

  const payload = normalizeUserDocument({
    ...existing,
    ...options,
    id: uid,
    uid,
    email: normalizedEmail,
    name: options.name || existing?.name || authUser.displayName || normalizedEmail.split('@')[0] || 'User',
    role: autoAdmin ? 'admin' : (options.role || existing?.role || 'participant'),
    provider: existing?.provider || options.provider || authUser.providerId || 'firebase',
    termsAccepted: options.termsAccepted ?? existing?.termsAccepted ?? false,
    termsAcceptedAt: options.termsAcceptedAt || existing?.termsAcceptedAt || null,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  });

  await setDoc(userRef, payload, { merge: true });
  return payload;
}

export async function getUserProfile(uid) {
  assertFirebaseReady();
  if (!uid) return null;

  const snap = await getDoc(doc(firebaseDb, 'users', uid));
  if (!snap.exists()) return null;
  return normalizeUserDocument(snap.data());
}

export async function updateUserProfile(uid, updates = {}) {
  assertFirebaseReady();
  if (!uid) throw new Error('User id is required.');

  const userRef = doc(firebaseDb, 'users', uid);
  await setDoc(userRef, {
    ...updates,
    updatedAt: nowIso(),
  }, { merge: true });

  const updatedSnap = await getDoc(userRef);
  return normalizeUserDocument(updatedSnap.data() || {});
}

export async function listEvents() {
  assertFirebaseReady();
  const snap = await getDocs(collection(firebaseDb, 'events'));
  return snap.docs
    .map((entry) => ({
      ...entry.data(),
      id: String(entry.data()?.id || entry.id),
      organizer: entry.data()?.organizer || entry.data()?.organiser || {},
      organiser: entry.data()?.organiser || entry.data()?.organizer || {},
    }))
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
}

export async function listRegistrations() {
  assertFirebaseReady();
  const snap = await getDocs(collection(firebaseDb, 'registrations'));
  return snap.docs
    .map((entry) => ({
      ...entry.data(),
      id: String(entry.data()?.id || entry.id),
    }))
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
}

export async function createEventRecord(eventData) {
  assertFirebaseReady();
  const eventId = String(eventData?.id || '').trim();
  if (!eventId) throw new Error('Event id is required.');

  const payload = {
    ...eventData,
    id: eventId,
    organizer: eventData?.organizer || eventData?.organiser || {},
    organiser: eventData?.organiser || eventData?.organizer || {},
    createdAt: eventData?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  await setDoc(doc(firebaseDb, 'events', eventId), payload, { merge: true });
  return payload;
}

export async function updateEventRecord(eventId, updates) {
  assertFirebaseReady();
  const resolvedEventId = String(eventId || '').trim();
  if (!resolvedEventId) throw new Error('Event id is missing.');

  const eventRef = doc(firebaseDb, 'events', resolvedEventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) {
    throw new Error('Event not found');
  }

  const current = snap.data() || {};
  const mergedOrganizer = {
    ...(current.organiser || current.organizer || {}),
    ...(updates?.organiser || updates?.organizer || {}),
  };

  const payload = {
    ...updates,
    organiser: mergedOrganizer,
    organizer: updates?.organizer || mergedOrganizer,
    updatedAt: nowIso(),
  };

  await setDoc(eventRef, payload, { merge: true });
  const updated = await getDoc(eventRef);
  return {
    ...updated.data(),
    id: resolvedEventId,
    organiser: updated.data()?.organiser || updated.data()?.organizer || {},
    organizer: updated.data()?.organizer || updated.data()?.organiser || {},
  };
}

export async function deleteEventRecord(eventId) {
  assertFirebaseReady();
  const resolvedEventId = String(eventId || '').trim();
  if (!resolvedEventId) throw new Error('Event id is required.');

  const batch = writeBatch(firebaseDb);
  batch.delete(doc(firebaseDb, 'events', resolvedEventId));

  const regs = await getDocs(query(collection(firebaseDb, 'registrations'), where('eventId', '==', resolvedEventId)));
  regs.forEach((entry) => batch.delete(entry.ref));

  const creds = await getDocs(query(collection(firebaseDb, 'credentials'), where('eventId', '==', resolvedEventId)));
  creds.forEach((entry) => batch.delete(entry.ref));

  const invites = await getDocs(query(collection(firebaseDb, 'team_invitations'), where('eventId', '==', resolvedEventId)));
  invites.forEach((entry) => batch.delete(entry.ref));

  await batch.commit();
  return { deletedEventId: resolvedEventId };
}

export async function createRegistrationRecord(eventId, registration) {
  assertFirebaseReady();
  const resolvedEventId = String(eventId || '').trim();
  if (!resolvedEventId) throw new Error('Event id is required.');

  const registrationId = String(registration?.id || '').trim();
  if (!registrationId) throw new Error('Registration id is required.');

  await runTransaction(firebaseDb, async (tx) => {
    const regRef = doc(firebaseDb, 'registrations', registrationId);
    const eventRef = doc(firebaseDb, 'events', resolvedEventId);

    const [regSnap, eventSnap] = await Promise.all([tx.get(regRef), tx.get(eventRef)]);

    if (regSnap.exists()) {
      throw new Error('Already registered for this event');
    }

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const event = eventSnap.data() || {};
    const currentRegistered = Number(event?.registeredCount || 0);

    tx.set(regRef, {
      ...registration,
      id: registrationId,
      eventId: resolvedEventId,
      createdAt: registration?.createdAt || nowIso(),
      updatedAt: nowIso(),
    });

    tx.set(eventRef, {
      registeredCount: currentRegistered + 1,
      updatedAt: nowIso(),
    }, { merge: true });
  });

  const savedReg = await getDoc(doc(firebaseDb, 'registrations', registrationId));
  const eventSnap = await getDoc(doc(firebaseDb, 'events', resolvedEventId));

  return {
    registration: { ...savedReg.data(), id: registrationId },
    event: {
      ...eventSnap.data(),
      id: resolvedEventId,
      organiser: eventSnap.data()?.organiser || eventSnap.data()?.organizer || {},
      organizer: eventSnap.data()?.organizer || eventSnap.data()?.organiser || {},
    },
  };
}

export async function updateRegistrationRecord(registrationId, updates = {}) {
  assertFirebaseReady();
  const resolvedRegistrationId = String(registrationId || '').trim();
  if (!resolvedRegistrationId) throw new Error('Registration id is required.');

  const regRef = doc(firebaseDb, 'registrations', resolvedRegistrationId);
  const snap = await getDoc(regRef);
  if (!snap.exists()) {
    throw new Error('Registration not found');
  }

  const current = snap.data() || {};
  const payload = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };

  await setDoc(regRef, payload, { merge: true });
  const updatedSnap = await getDoc(regRef);
  return { ...updatedSnap.data(), id: resolvedRegistrationId };
}

export async function deleteRegistrationRecord(registrationId) {
  assertFirebaseReady();
  const resolvedRegistrationId = String(registrationId || '').trim();
  if (!resolvedRegistrationId) throw new Error('Registration id is required.');

  const regRef = doc(firebaseDb, 'registrations', resolvedRegistrationId);
  const snap = await getDoc(regRef);
  if (!snap.exists()) {
    return { deletedRegistrationId: resolvedRegistrationId, existed: false };
  }

  const batch = writeBatch(firebaseDb);
  batch.delete(regRef);
  await batch.commit();

  return { deletedRegistrationId: resolvedRegistrationId, existed: true };
}

export async function checkInByQrToken(qrToken) {
  assertFirebaseReady();
  const token = String(qrToken || '').trim();
  if (!token) {
    return {
      success: false,
      status: 'invalid',
      message: 'QR token is required for validation.',
      team: null,
      event: null,
    };
  }

  const regsSnap = await getDocs(query(collection(firebaseDb, 'registrations'), where('qrToken', '==', token)));
  if (regsSnap.empty) {
    return {
      success: false,
      status: 'invalid',
      message: 'Team is not present or not validated for this event.',
      team: null,
      event: null,
    };
  }

  const regs = regsSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  const checkedInAt = nowIso();

  const batch = writeBatch(firebaseDb);
  regsSnap.docs.forEach((entry) => {
    batch.update(entry.ref, {
      checkedIn: true,
      checkedInAt,
      updatedAt: checkedInAt,
    });
  });
  await batch.commit();

  const eventId = String(regs[0]?.eventId || '').trim();
  const eventSnap = eventId ? await getDoc(doc(firebaseDb, 'events', eventId)) : null;

  return {
    success: true,
    status: 'valid',
    message: 'Validation completed successfully.',
    checkedInAt,
    team: {
      registrationIds: regs.map((entry) => entry.id),
      teamName: regs[0]?.teamName || null,
      members: Array.isArray(regs[0]?.members) ? regs[0].members : [],
      participant: regs[0]?.participant || null,
    },
    event: eventSnap?.exists()
      ? {
          ...eventSnap.data(),
          id: eventSnap.id,
          organiser: eventSnap.data()?.organiser || eventSnap.data()?.organizer || {},
          organizer: eventSnap.data()?.organizer || eventSnap.data()?.organiser || {},
        }
      : null,
  };
}

export async function appendAdminAuditLog({ action, actorId, targetType, targetId, metadata = {} }) {
  assertFirebaseReady();
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(firebaseDb, 'admin_audit_logs', id), {
    id,
    action: String(action || 'unknown').trim(),
    actorId: String(actorId || 'system').trim(),
    targetType: String(targetType || '').trim(),
    targetId: String(targetId || '').trim(),
    metadata,
    createdAt: nowIso(),
  });
}

export async function getAdminOverview() {
  assertFirebaseReady();

  const [usersSnap, eventsSnap, regsSnap, complaintsSnap, credsSnap] = await Promise.all([
    getDocs(collection(firebaseDb, 'users')),
    getDocs(collection(firebaseDb, 'events')),
    getDocs(collection(firebaseDb, 'registrations')),
    getDocs(collection(firebaseDb, 'complaints')),
    getDocs(collection(firebaseDb, 'credentials')),
  ]);

  const users = usersSnap.docs.map((entry) => normalizeUserDocument(entry.data() || {}));
  const events = eventsSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  const registrations = regsSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  const complaints = complaintsSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
  const credentials = credsSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));

  const roleCounts = users.reduce((acc, entry) => {
    const role = normalizeRole(entry?.role);
    acc[role] += 1;
    return acc;
  }, { participant: 0, organizer: 0, admin: 0 });

  const uniqueCredentialRecipients = new Set(credentials.map((c) => String(c?.userId || '').trim()).filter(Boolean));

  const metrics = {
    totalUsers: users.length,
    totalEvents: events.length,
    totalRegistrations: registrations.length,
    totalCheckIns: registrations.filter((entry) => Boolean(entry?.checkedIn)).length,
    activeSessions: 0,
    suspendedUsers: users.filter((entry) => entry.status === 'suspended').length,
    totalCredentials: credentials.length,
    uniqueCredentialRecipients: uniqueCredentialRecipients.size,
    roleCounts,
    openComplaints: complaints.filter((entry) => normalizeComplaintStatus(entry.status) !== 'resolved').length,
  };

  const recentUsers = [...users]
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 5);

  const recentEvents = [...events]
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 5);

  return { metrics, recentUsers, recentEvents };
}

export async function listUsers(params = {}) {
  assertFirebaseReady();

  const searchValue = String(params.search || '').trim().toLowerCase();
  const roleFilter = normalizeRole(params.role || '');
  const statusFilter = params.status ? normalizeUserStatus(params.status) : '';
  const max = Number(params.limit || 40);

  const snap = await getDocs(collection(firebaseDb, 'users'));
  const allUsers = snap.docs.map((entry) => normalizeUserDocument(entry.data() || {}));

  const filtered = allUsers.filter((entry) => {
    if (params.role && entry.role !== roleFilter) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    if (!searchValue) return true;

    const haystack = `${entry.name || ''} ${entry.email || ''}`.toLowerCase();
    return haystack.includes(searchValue);
  });

  return {
    users: filtered.slice(0, max),
    total: filtered.length,
  };
}

export async function listAdminEvents(params = {}) {
  assertFirebaseReady();

  const searchValue = String(params.search || '').trim().toLowerCase();
  const statusFilter = String(params.status || '').trim().toLowerCase();
  const max = Number(params.limit || 40);

  const snap = await getDocs(collection(firebaseDb, 'events'));
  const allEvents = snap.docs.map((entry) => ({
    ...entry.data(),
    id: String(entry.data()?.id || entry.id),
    status: String(entry.data()?.status || 'upcoming'),
    organizer: entry.data()?.organizer || entry.data()?.organiser || {},
    organiser: entry.data()?.organiser || entry.data()?.organizer || {},
  }));

  const filtered = allEvents.filter((entry) => {
    if (statusFilter && String(entry.status || '').toLowerCase() !== statusFilter) return false;
    if (!searchValue) return true;

    const organizerName = entry?.organiser?.name || entry?.organizer?.name || '';
    const haystack = `${entry.title || ''} ${organizerName}`.toLowerCase();
    return haystack.includes(searchValue);
  });

  return {
    events: filtered.slice(0, max),
    total: filtered.length,
  };
}

export async function updateUserRoleFirebase(targetUserId, role, actorId = 'admin') {
  assertFirebaseReady();
  const nextRole = normalizeRole(role);

  await updateDoc(doc(firebaseDb, 'users', String(targetUserId)), {
    role: nextRole,
    updatedAt: nowIso(),
  });

  await appendAdminAuditLog({
    action: 'user-role-updated',
    actorId,
    targetType: 'user',
    targetId: targetUserId,
    metadata: { role: nextRole },
  });
}

export async function updateUserStatusFirebase(targetUserId, status, actorId = 'admin') {
  assertFirebaseReady();
  const nextStatus = normalizeUserStatus(status);

  await updateDoc(doc(firebaseDb, 'users', String(targetUserId)), {
    status: nextStatus,
    updatedAt: nowIso(),
  });

  await appendAdminAuditLog({
    action: 'user-status-updated',
    actorId,
    targetType: 'user',
    targetId: targetUserId,
    metadata: { status: nextStatus },
  });
}

export async function updateEventStatusFirebase(eventId, status, actorId = 'admin') {
  assertFirebaseReady();

  await updateDoc(doc(firebaseDb, 'events', String(eventId)), {
    status,
    updatedAt: nowIso(),
  });

  await appendAdminAuditLog({
    action: 'event-status-updated',
    actorId,
    targetType: 'event',
    targetId: eventId,
    metadata: { status },
  });
}

export async function listAdminAuditLogs(limitCount = 50) {
  assertFirebaseReady();
  const snap = await getDocs(collection(firebaseDb, 'admin_audit_logs'));
  return snap.docs
    .map((entry) => ({
      ...entry.data(),
      _id: entry.id,
    }))
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, Number(limitCount || 50));
}

function makeComplaintId() {
  return `cmp-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function serializeComplaint(raw = {}, id = '') {
  return {
    ...raw,
    complaintId: String(raw.complaintId || id),
    status: normalizeComplaintStatus(raw.status),
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export async function createComplaintForUser({ user, name, message }) {
  assertFirebaseReady();
  if (!user?.id || !user?.email) {
    throw new Error('Please sign in before raising a complaint.');
  }

  const complaintId = makeComplaintId();
  const createdAt = nowIso();
  const payload = {
    complaintId,
    userId: String(user.id),
    email: String(user.email || '').trim().toLowerCase(),
    name: String(name || user.name || '').trim() || 'User',
    message: String(message || '').trim(),
    status: 'raised',
    history: [{
      status: 'raised',
      note: 'Ticket created',
      createdAt,
    }],
    createdAt,
    updatedAt: createdAt,
  };

  await setDoc(doc(firebaseDb, 'complaints', complaintId), payload);
  await appendAdminAuditLog({
    action: 'complaint-created',
    actorId: user.id,
    targetType: 'complaint',
    targetId: complaintId,
  });

  return serializeComplaint(payload, complaintId);
}

export async function listComplaintsForUser(user) {
  assertFirebaseReady();
  if (!user?.id && !user?.email) return [];

  const userId = String(user?.id || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();

  const clauses = [];
  if (userId) clauses.push(getDocs(query(collection(firebaseDb, 'complaints'), where('userId', '==', userId))));
  if (email) clauses.push(getDocs(query(collection(firebaseDb, 'complaints'), where('email', '==', email))));

  const results = await Promise.all(clauses);
  const map = new Map();

  results.forEach((snap) => {
    snap.docs.forEach((entry) => {
      map.set(entry.id, serializeComplaint(entry.data() || {}, entry.id));
    });
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
}

export async function listAdminComplaints(params = {}) {
  assertFirebaseReady();

  const searchValue = String(params.search || '').trim().toLowerCase();
  const statusFilter = String(params.status || '').trim().toLowerCase();

  const snap = await getDocs(collection(firebaseDb, 'complaints'));
  const allComplaints = snap.docs.map((entry) => serializeComplaint(entry.data() || {}, entry.id));

  const filtered = allComplaints.filter((entry) => {
    if (statusFilter && normalizeComplaintStatus(entry.status) !== statusFilter) return false;
    if (!searchValue) return true;

    const haystack = `${entry.complaintId || ''} ${entry.name || ''} ${entry.email || ''} ${entry.message || ''}`.toLowerCase();
    return haystack.includes(searchValue);
  });

  const ordered = filtered.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

  const metrics = ordered.reduce((acc, entry) => {
    const status = normalizeComplaintStatus(entry.status);
    if (status === 'resolved') acc.resolved += 1;
    else if (status === 'in-progress') acc.inProgress += 1;
    else acc.raised += 1;
    return acc;
  }, { raised: 0, inProgress: 0, resolved: 0 });

  return {
    complaints: ordered.slice(0, Number(params.limit || 120)),
    metrics,
  };
}

export async function updateComplaintStatus(complaintId, status, note, actorId = 'admin') {
  assertFirebaseReady();

  const id = String(complaintId || '').trim();
  if (!id) throw new Error('Complaint id is required.');

  const complaintRef = doc(firebaseDb, 'complaints', id);
  const snap = await getDoc(complaintRef);
  if (!snap.exists()) {
    throw new Error('Complaint not found');
  }

  const current = serializeComplaint(snap.data() || {}, id);
  const nextStatus = normalizeComplaintStatus(status);
  const history = [
    ...(Array.isArray(current.history) ? current.history : []),
    {
      status: nextStatus,
      note: String(note || '').trim() || 'Status updated',
      createdAt: nowIso(),
      actorId,
    },
  ];

  const updated = {
    ...current,
    status: nextStatus,
    history,
    updatedAt: nowIso(),
  };

  await setDoc(complaintRef, updated, { merge: true });
  await appendAdminAuditLog({
    action: 'complaint-status-updated',
    actorId,
    targetType: 'complaint',
    targetId: id,
    metadata: { status: nextStatus },
  });

  return serializeComplaint(updated, id);
}
