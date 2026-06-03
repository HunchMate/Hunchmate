// ── Helper Utilities ──

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getEventStatus = (event) => {
  const now = new Date();
  const regEnd = new Date(event.timeline.registrationEnd);
  const eventStart = new Date(event.timeline.eventStart);
  const eventEnd = new Date(event.timeline.eventEnd);

  if (now > eventEnd) return 'completed';
  if (now >= eventStart && now <= eventEnd) return 'ongoing';
  if (now > regEnd) return 'registration-closed';
  return 'open';
};

export const getStatusColor = (status) => {
  const colors = {
    open: 'var(--color-success)',
    upcoming: 'var(--color-accent)',
    ongoing: 'var(--color-gold)',
    completed: 'var(--color-text-muted)',
    'registration-closed': 'var(--color-coral)',
  };
  return colors[status] || 'var(--color-text-muted)';
};

export const getStatusLabel = (status) => {
  const labels = {
    open: '● Registrations Open',
    upcoming: '◎ Coming Soon',
    ongoing: '▶ Live Now',
    completed: '✓ Completed',
    'registration-closed': '⊘ Registration Closed',
  };
  return labels[status] || status;
};

export const getModeIcon = (mode) => {
  const icons = {
    Online: '🌐',
    Offline: '📍',
    Hybrid: '🔗',
  };
  return icons[mode] || '📌';
};

export const getCategoryColor = (category) => {
  const colors = {
    Hackathon: 'var(--color-accent)',
    Competition: 'var(--color-coral)',
    Workshop: 'var(--color-gold)',
    Conference: 'var(--color-purple)',
    Bootcamp: 'var(--color-success)',
    Meetup: 'var(--color-accent)',
  };
  return colors[category] || 'var(--color-accent)';
};

export const generateQRToken = (eventId, userId) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Event-scoped format: allows validation to verify the QR belongs to a specific event
  return `EVT:${eventId}|USR:${userId}|TOK:${rand}`;
};

export const generateTeamQRToken = (eventId, teamId) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EVT:${eventId}|TEAM:${teamId}|TOK:${rand}`;
};

/** Parse an event-scoped QR token and extract the eventId */
export const parseQRTokenEventId = (qrToken) => {
  const str = String(qrToken || '');
  const match = str.match(/^EVT:([^|]+)\|/);
  return match ? match[1] : null;
};

export const generateCredentialId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CRED-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

export const generateId = (prefix = 'item') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const slugifyEventTitle = (value) => {
  const input = String(value || '').trim().toLowerCase();
  if (!input) return '';

  return input
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const buildEventPathSegment = (event) => {
  const titleSlug = slugifyEventTitle(event?.title);
  return titleSlug;
};

export const buildEventDetailPath = (event) => `/events/${buildEventPathSegment(event)}`;

export const truncateText = (text, maxLen = 120) => {
  if (!text || text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + '...';
};

export const getProgressPercentage = (registered, max) => {
  if (!max) return 0;
  return Math.min(Math.round((registered / max) * 100), 100);
};

export const daysUntil = (dateStr) => {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const downloadCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
