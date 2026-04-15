import 'dotenv/config';

const base = 'http://127.0.0.1:5001';
const password = process.env.TEST_USER_PASSWORD;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;

if (!password) {
  throw new Error('TEST_USER_PASSWORD is missing');
}

if (!adminPassword) {
  throw new Error('ADMIN_SEED_PASSWORD is missing');
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const signup = (email, name, role = 'participant') => fetchJson(`${base}/auth/signup`, {
  method: 'POST',
  body: JSON.stringify({ email, password, name, role }),
});

const login = (email, pass) => fetchJson(`${base}/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email, password: pass }),
});

const authGet = (path, token) => fetchJson(`${base}${path}`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});

const authPost = (path, token, body) => fetchJson(`${base}${path}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(body || {}),
});

const authPatch = (path, token, body) => fetchJson(`${base}${path}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(body || {}),
});

const ts = Date.now();
const organizerEmail = `org.${ts}@example.com`;
const participantEmail = `user.${ts}@example.com`;

const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  ok: true,
};

const addCheck = (name, status, details = {}) => {
  report.checks.push({ name, status, details });
  if (status !== 'pass') report.ok = false;
};

try {
  const organizer = await signup(organizerEmail, 'Organizer Smoke', 'organizer');
  addCheck('organizer-signup', 'pass', { userId: organizer.userId, role: organizer.user?.role });

  const eventPayload = {
    title: `Smoke Event ${ts}`,
    description: 'Smoke test event',
    shortDescription: 'Smoke test event',
    category: 'Hackathon',
    mode: 'Hybrid',
    status: 'open',
    timeline: {
      registrationStart: '2026-04-01',
      registrationEnd: '2026-04-30',
      eventStart: '2026-05-10',
      eventEnd: '2026-05-11',
    },
    teamSize: null,
    tags: ['smoke'],
  };

  const createdEvent = await authPost('/events', organizer.token, eventPayload);
  const eventId = createdEvent?.event?.id;
  addCheck('organizer-create-event', eventId ? 'pass' : 'fail', { eventId });

  const participant = await signup(participantEmail, 'Participant Smoke', 'participant');
  addCheck('participant-signup', 'pass', { userId: participant.userId, role: participant.user?.role });

  const registration = await authPost(`/events/${eventId}/register`, participant.token, {
    participant: {
      id: participant.userId,
      name: 'Participant Smoke',
      email: participantEmail,
      role: 'participant',
    },
  });
  addCheck('participant-register-event', registration?.success ? 'pass' : 'fail', {
    registrationId: registration?.registration?.id,
    eventId,
  });

  const organizerOwnRegistrations = await authGet('/events/registrations/organizer/me', organizer.token);
  addCheck('organizer-view-registrations', Array.isArray(organizerOwnRegistrations) && organizerOwnRegistrations.length > 0 ? 'pass' : 'fail', {
    count: Array.isArray(organizerOwnRegistrations) ? organizerOwnRegistrations.length : -1,
  });

  const myRegistrations = await authGet('/events/registrations/me', participant.token);
  addCheck('participant-view-registrations', Array.isArray(myRegistrations) && myRegistrations.length > 0 ? 'pass' : 'fail', {
    count: Array.isArray(myRegistrations) ? myRegistrations.length : -1,
  });

  const checkInResult = await authPost('/events/checkin', organizer.token, {
    qrToken: registration?.registration?.qrToken,
  });
  addCheck('organizer-checkin-participant', checkInResult?.status === 'valid' ? 'pass' : 'fail', {
    status: checkInResult?.status,
  });

  // Admin flow
  const admin = await login('admin@hunchmate.com', adminPassword);
  addCheck('admin-login', admin?.user?.role === 'admin' ? 'pass' : 'fail', { role: admin?.user?.role });

  const overview = await authGet('/admin/overview', admin.token);
  addCheck('admin-overview', overview?.metrics?.totalUsers >= 3 ? 'pass' : 'fail', {
    totalUsers: overview?.metrics?.totalUsers,
    totalEvents: overview?.metrics?.totalEvents,
    totalRegistrations: overview?.metrics?.totalRegistrations,
  });

  const usersPage = await authGet('/admin/users?limit=30&page=1', admin.token);
  addCheck('admin-users-page', Array.isArray(usersPage?.users) ? 'pass' : 'fail', {
    count: usersPage?.users?.length,
    total: usersPage?.total,
  });

  const eventsPage = await authGet('/admin/events?limit=30&page=1', admin.token);
  addCheck('admin-events-page', Array.isArray(eventsPage?.events) ? 'pass' : 'fail', {
    count: eventsPage?.events?.length,
    total: eventsPage?.total,
  });

  const userTarget = usersPage.users.find((u) => u.email === participantEmail);
  const eventTarget = eventsPage.events.find((e) => e.id === eventId);

  if (userTarget?.id) {
    await authPatch(`/admin/users/${userTarget.id}/status`, admin.token, { status: 'suspended', reason: 'smoke' });
    await authPatch(`/admin/users/${userTarget.id}/status`, admin.token, { status: 'active', reason: 'smoke-restore' });
    addCheck('admin-user-moderation', 'pass', { userId: userTarget.id });
  } else {
    addCheck('admin-user-moderation', 'fail', { reason: 'Target user not found in admin list' });
  }

  if (eventTarget?.id) {
    await authPatch(`/admin/events/${eventTarget.id}/status`, admin.token, { status: 'live', reason: 'smoke' });
    await authPatch(`/admin/events/${eventTarget.id}/status`, admin.token, { status: 'open', reason: 'smoke-restore' });
    addCheck('admin-event-moderation', 'pass', { eventId: eventTarget.id });
  } else {
    addCheck('admin-event-moderation', 'fail', { reason: 'Target event not found in admin list' });
  }

  const logs = await authGet('/admin/audit-logs?limit=30', admin.token);
  addCheck('admin-audit-logs', Array.isArray(logs?.logs) && logs.logs.length > 0 ? 'pass' : 'fail', {
    count: Array.isArray(logs?.logs) ? logs.logs.length : -1,
  });
} catch (error) {
  addCheck('unhandled-error', 'fail', {
    message: error.message,
    status: error.status,
    data: error.data || null,
  });
}

report.completedAt = new Date().toISOString();
report.summary = {
  total: report.checks.length,
  passed: report.checks.filter((c) => c.status === 'pass').length,
  failed: report.checks.filter((c) => c.status === 'fail').length,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
