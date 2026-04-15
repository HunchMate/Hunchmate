import 'dotenv/config';

const base = process.env.AUTH_API_BASE || 'http://127.0.0.1:5001';
const password = process.env.TEST_USER_PASSWORD;
const adminEmail = 'admin@hunchmate.com';
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
const totalUsers = 100;

if (!password) {
  throw new Error('TEST_USER_PASSWORD is missing');
}

if (!adminPassword) {
  throw new Error('ADMIN_SEED_PASSWORD is missing');
}

const runTag = `cmp100-${Date.now()}`;

async function fetchJson(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
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
}

function emailFor(index) {
  return `${runTag}.user${index + 1}@example.com`;
}

async function runWithConcurrency(items, worker, concurrency = 20) {
  const results = [];
  let cursor = 0;

  const pool = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      try {
        const value = await worker(items[current], current);
        results[current] = { ok: true, value };
      } catch (error) {
        results[current] = { ok: false, error: String(error?.message || error) };
      }
    }
  });

  await Promise.all(pool);
  return results;
}

async function ensureAdmin() {
  try {
    const login = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    return login.token;
  } catch {
    throw new Error('Admin login failed. Run seed-admin-user.mjs first.');
  }
}

async function main() {
  const startedAt = Date.now();
  const report = {
    runTag,
    totals: {
      usersTarget: totalUsers,
      signupSuccess: 0,
      signupFailure: 0,
      complaintRaised: 0,
      complaintFailed: 0,
      adminUpdated: 0,
      adminUpdateFailed: 0,
      userVerifiedResolved: 0,
      userVerifyFailed: 0,
    },
    samples: {
      signupFailures: [],
      complaintFailures: [],
      adminUpdateFailures: [],
      userVerifyFailures: [],
    },
  };

  await fetchJson('/health');
  const adminToken = await ensureAdmin();

  const indexes = Array.from({ length: totalUsers }, (_, index) => index);

  const signupResults = await runWithConcurrency(
    indexes,
    async (index) => {
      const email = emailFor(index);
      const name = `Complaint User ${index + 1}`;
      const payload = await fetchJson('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role: 'participant' }),
      });
      return {
        index,
        email,
        name,
        token: payload.token,
        userId: payload.userId,
      };
    },
    20
  );

  const users = [];
  signupResults.forEach((entry) => {
    if (entry?.ok) {
      report.totals.signupSuccess += 1;
      users.push(entry.value);
    } else {
      report.totals.signupFailure += 1;
      if (report.samples.signupFailures.length < 5) {
        report.samples.signupFailures.push(entry.error);
      }
    }
  });

  const complaintResults = await runWithConcurrency(
    users,
    async (user, index) => {
      const complaintPayload = await fetchJson('/complaints', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          name: user.name,
          message: `${runTag} complaint from ${user.email} (ticket ${index + 1})`,
        }),
      });

      return {
        ...user,
        complaintId: complaintPayload?.complaint?.complaintId,
      };
    },
    20
  );

  const complaintUsers = [];
  complaintResults.forEach((entry) => {
    if (entry?.ok) {
      report.totals.complaintRaised += 1;
      complaintUsers.push(entry.value);
    } else {
      report.totals.complaintFailed += 1;
      if (report.samples.complaintFailures.length < 5) {
        report.samples.complaintFailures.push(entry.error);
      }
    }
  });

  const adminList = await fetchJson(`/admin/complaints?limit=250&search=${encodeURIComponent(runTag)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const complaintIds = (Array.isArray(adminList?.complaints) ? adminList.complaints : [])
    .map((item) => item.complaintId)
    .filter(Boolean);

  const adminUpdateResults = await runWithConcurrency(
    complaintIds,
    async (complaintId) => {
      await fetchJson(`/admin/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'resolved',
          note: `Resolved during ${runTag} validation`,
        }),
      });
      return complaintId;
    },
    20
  );

  adminUpdateResults.forEach((entry) => {
    if (entry?.ok) {
      report.totals.adminUpdated += 1;
    } else {
      report.totals.adminUpdateFailed += 1;
      if (report.samples.adminUpdateFailures.length < 5) {
        report.samples.adminUpdateFailures.push(entry.error);
      }
    }
  });

  const verifyResults = await runWithConcurrency(
    complaintUsers,
    async (user) => {
      const mine = await fetchJson('/complaints/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const found = (mine.complaints || []).find((item) => item.complaintId === user.complaintId);
      if (!found) {
        throw new Error(`Missing ticket for ${user.email}`);
      }
      if (String(found.status || '') !== 'resolved') {
        throw new Error(`Ticket not resolved for ${user.email}: ${found.status}`);
      }
      return true;
    },
    20
  );

  verifyResults.forEach((entry) => {
    if (entry?.ok) {
      report.totals.userVerifiedResolved += 1;
    } else {
      report.totals.userVerifyFailed += 1;
      if (report.samples.userVerifyFailures.length < 5) {
        report.samples.userVerifyFailures.push(entry.error);
      }
    }
  });

  report.elapsedMs = Date.now() - startedAt;
  report.pass =
    report.totals.signupSuccess === totalUsers &&
    report.totals.complaintRaised === totalUsers &&
    report.totals.adminUpdated === totalUsers &&
    report.totals.userVerifiedResolved === totalUsers;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    error: String(error?.message || error),
  }, null, 2));
  process.exitCode = 1;
});
