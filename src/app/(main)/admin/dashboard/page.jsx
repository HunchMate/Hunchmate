'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Award,
  CalendarRange,
  CheckCheck,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  LayoutDashboard,
  LogOut,
  Shield,
  Search,
  Users2,
  UserCog,
  Settings,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useEvents } from '@/context/EventContext'
import {
  getAdminOverview,
  listAdminAuditLogs,
  listAdminEvents,
  listUsers,
  updateEventStatusFirebase,
  updateUserRoleFirebase,
  updateUserStatusFirebase,
} from '@/lib/supabase-data'
import { createClient } from '@/utils/supabase/client'
import '@/vite-pages/admin/Dashboard.css'

const USER_ROLE_OPTIONS = ['participant', 'organizer', 'admin']
const USER_STATUS_OPTIONS = ['active', 'suspended']
const EVENT_STATUS_OPTIONS = ['upcoming', 'live', 'completed', 'cancelled', 'archived']
const ALLOW_ADMIN_BYPASS = false

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizers', label: 'Organizer Accounts', icon: UserCog },
  { id: 'participants', label: 'Participant Accounts', icon: Users2 },
  { id: 'events', label: 'Events', icon: CalendarRange },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const SETTINGS_PLACEHOLDERS = [
  'Platform Fee',
  'Payment Gateway',
  'Email Settings',
  'E-Credentials',
  'Platform Information',
  'Admin Account',
]

const EVENT_DETAIL_TABS = [
  'Overview',
  'Microsite URL',
  'Registrations',
  'Registration Table',
  'Payments',
  'E-Credentials',
  'Settings',
]

const DEFAULT_ADMIN_SETTINGS = {
  platformFee: '5',
  paymentGateway: 'Razorpay',
  paymentGatewayKeyId: '',
  paymentGatewaySecret: '',
  emailSender: 'Hunchmate',
  emailSenderEmail: '',
  emailReplyTo: '',
  credentialStorage: 'Supabase Storage',
  platformName: 'Hunchmate',
  supportEmail: '',
  certFooter: '',
  signatureName: '',
}

function normalizeUserRole(role) {
  const value = String(role || '').trim().toLowerCase()
  if (value === 'admin') return 'admin'
  if (value === 'organizer' || value === 'organiser') return 'organizer'
  return 'participant'
}

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getAuditDescription(entry = {}) {
  const action = String(entry?.action || '').trim().toLowerCase()
  const targetType = toTitleCase(entry?.targetType || 'record')
  const targetId = String(entry?.targetId || 'unknown')
  const metadata = entry?.metadata || {}

  if (action === 'user-role-updated') {
    const role = toTitleCase(metadata?.role || 'participant')
    return `${targetType} ${targetId} role changed to ${role}.`
  }

  if (action === 'user-status-updated') {
    const status = toTitleCase(metadata?.status || 'active')
    return `${targetType} ${targetId} status changed to ${status}.`
  }

  if (action === 'event-status-updated') {
    const status = toTitleCase(metadata?.status || 'upcoming')
    return `${targetType} ${targetId} status updated to ${status}.`
  }

  if (action === 'complaint-status-updated') {
    const status = toTitleCase(metadata?.status || 'raised')
    return `${targetType} ${targetId} moved to ${status}.`
  }

  if (action === 'complaint-created') {
    return `${targetType} ${targetId} was raised by a user.`
  }

  if (action === 'local-notification') {
    return `Notification ${targetId} was recorded in local mode.`
  }

  const readableAction = toTitleCase(action || 'activity recorded')
  return `${readableAction} on ${targetType} ${targetId}.`
}

function getRoleClassName(role) {
  if (role === 'admin') return 'admin-pill admin-pill--danger'
  if (role === 'organizer') return 'admin-pill admin-pill--primary'
  return 'admin-pill admin-pill--neutral'
}

function getStatusClassName(status) {
  if (status === 'suspended') return 'admin-pill admin-pill--danger'
  if (status === 'live') return 'admin-pill admin-pill--success'
  if (status === 'completed') return 'admin-pill admin-pill--neutral'
  if (status === 'cancelled' || status === 'archived') return 'admin-pill admin-pill--muted'
  return 'admin-pill admin-pill--primary'
}

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCSV(rows, filename) {
  if (!Array.isArray(rows) || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getEventId(event = {}) {
  return String(event?.id || event?._id || '').trim()
}

function getEventFee(event = {}) {
  return Number(event?.registrationFee || event?.fee || event?.price || event?.pricing?.amount || 0) || 0
}

function getRegistrationName(reg = {}) {
  return reg?.participant?.name || reg?.name || reg?.userName || reg?.members?.[0] || 'Participant'
}

function getRegistrationEmail(reg = {}) {
  return reg?.participant?.email || reg?.email || reg?.userEmail || ''
}

function getRegistrationPhone(reg = {}) {
  return reg?.participant?.phone || reg?.participant?.phoneNumber || reg?.phone || reg?.phoneNumber || ''
}

function getRegistrationOrg(reg = {}) {
  return reg?.participant?.institution || reg?.participant?.organizationName || reg?.college || reg?.organization || ''
}

function getRegistrationTeam(reg = {}) {
  return reg?.teamName || (Array.isArray(reg?.members) && reg.members.length > 1 ? reg.members[0] : 'Individual')
}

function getPaymentStatus(reg = {}) {
  return String(reg?.paymentStatus || reg?.payment?.status || 'not-paid').toLowerCase()
}

function appendLocalAdminLog(action, targetType, targetId, metadata = {}) {
  const logs = safeReadJson('hm_admin_logs', [])
  const nextEntry = {
    _id: `local-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorId: 'local-admin',
    targetType,
    targetId: String(targetId || ''),
    metadata,
    createdAt: new Date().toISOString(),
  }
  safeWriteJson('hm_admin_logs', [nextEntry, ...logs].slice(0, 200))
}

function buildLocalUsers(events, registrations, credentials) {
  const storedUsers = safeReadJson('hm_admin_users', [])
  const userMap = new Map()

  const detectedParticipantIds = new Set([
    ...registrations.map((entry) => String(entry?.userId || '').trim()).filter(Boolean),
    ...credentials.map((entry) => String(entry?.userId || '').trim()).filter(Boolean),
  ])

  detectedParticipantIds.forEach((userId, index) => {
    userMap.set(userId, {
      id: userId,
      name: `Participant ${index + 1}`,
      email: `${userId}@hunchmate.local`,
      role: 'participant',
      status: 'active',
      provider: 'local',
      createdAt: new Date().toISOString(),
      avatarBackdrop: '',
    })
  })

  const organizerMap = new Map()
  events.forEach((event, index) => {
    const organizer = event?.organiser || event?.organizer || {}
    const organizerId = String(organizer?.id || organizer?.email || '').trim()
    if (!organizerId) return
    organizerMap.set(organizerId, {
      id: organizerId,
      name: organizer?.name || `Organizer ${index + 1}`,
      email: organizer?.email || `${organizerId}@hunchmate.local`,
      role: 'organizer',
      status: 'active',
      provider: 'local',
      createdAt: new Date().toISOString(),
      avatarBackdrop: '',
    })
  })

  organizerMap.forEach((value, key) => userMap.set(key, value))

  storedUsers.forEach((entry) => {
    const id = String(entry?.id || '').trim()
    if (!id) return
    const baseline = userMap.get(id) || {}
    userMap.set(id, {
      ...baseline,
      ...entry,
      id,
      role: normalizeUserRole(entry?.role || baseline?.role),
      status: USER_STATUS_OPTIONS.includes(entry?.status) ? entry.status : (baseline.status || 'active'),
    })
  })

  if (!userMap.has('local-admin')) {
    userMap.set('local-admin', {
      id: 'local-admin',
      name: 'Local Admin',
      email: 'admin@hunchmate.local',
      role: 'admin',
      status: 'active',
      provider: 'local',
      createdAt: new Date().toISOString(),
      avatarBackdrop: '',
    })
  }

  return Array.from(userMap.values())
}

function applyLocalUserFilters(users, { search, role, status, limit = 40 }) {
  const searchValue = String(search || '').trim().toLowerCase()
  return users
    .filter((entry) => {
      if (role && entry.role !== role) return false
      if (status && (entry.status || 'active') !== status) return false
      if (!searchValue) return true
      const haystack = `${entry.name || ''} ${entry.email || ''}`.toLowerCase()
      return haystack.includes(searchValue)
    })
    .slice(0, limit)
}

function applyLocalEventFilters(events, { search, status, limit = 40 }) {
  const searchValue = String(search || '').trim().toLowerCase()
  return events
    .filter((entry) => {
      if (status && (entry.status || 'upcoming') !== status) return false
      if (!searchValue) return true
      const organizerName = entry?.organiser?.name || entry?.organizer?.name || ''
      const haystack = `${entry.title || ''} ${organizerName}`.toLowerCase()
      return haystack.includes(searchValue)
    })
    .slice(0, limit)
}

function buildLocalDashboardData() {
  const events = safeReadJson('hm_events', [])
  const registrations = safeReadJson('hm_registrations', [])
  const credentials = safeReadJson('hm_credentials', [])
  const users = buildLocalUsers(events, registrations, credentials)

  const roleCounts = users.reduce((acc, entry) => {
    const role = normalizeUserRole(entry?.role)
    acc[role] += 1
    return acc
  }, { participant: 0, organizer: 0, admin: 0 })

  const uniqueCredentialRecipients = new Set(credentials.map((c) => String(c?.userId || '').trim()).filter(Boolean))

  const metrics = {
    totalUsers: users.length,
    totalEvents: events.length,
    totalRegistrations: registrations.length,
    totalCheckIns: registrations.filter((entry) => Boolean(entry?.checkedIn)).length,
    activeSessions: 0,
    suspendedUsers: users.filter((entry) => entry?.status === 'suspended').length,
    totalCredentials: credentials.length,
    uniqueCredentialRecipients: uniqueCredentialRecipients.size,
    roleCounts,
  }

  const normalizedEvents = events.map((event) => ({
    ...event,
    status: event?.status || 'upcoming',
    organizer: event?.organizer || event?.organiser || {},
    organiser: event?.organiser || event?.organizer || {},
  }))

  const recentEvents = [...normalizedEvents].slice(0, 5)
  const recentUsers = users.slice(0, 5)

  const adminLogs = safeReadJson('hm_admin_logs', [])
  const notificationLogs = (safeReadJson('hm_organizer_notifications', []) || []).map((entry, index) => ({
    _id: String(entry?.id || `local-log-${index}`),
    action: entry?.title || 'local-notification',
    actorId: 'local-system',
    targetType: 'notification',
    targetId: String(entry?.id || index),
    createdAt: entry?.createdAt || new Date().toISOString(),
  }))

  const logs = [...adminLogs, ...notificationLogs]
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 50)

  return {
    metrics,
    users,
    events: normalizedEvents,
    logs,
    recentUsers,
    recentEvents,
  }
}

export default function AdminDashboard() {
  const { token, user, loading: authLoading, logout, resetPassword } = useAuth()
  const { getEventRegistrations, credentials } = useEvents()
  const bypassActive = ALLOW_ADMIN_BYPASS && user?.role !== 'admin'
  const useLocalMode = (!token && !authLoading) || bypassActive
  const realtimeRef = useRef(null)

  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [logs, setLogs] = useState([])

  const [usersTotal, setUsersTotal] = useState(0)
  const [eventsTotal, setEventsTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')

  const [eventSearch, setEventSearch] = useState('')
  const [eventStatusFilter, setEventStatusFilter] = useState('')

  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [activeEventTab, setActiveEventTab] = useState('Overview')
  const [adminSettings, setAdminSettings] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_ADMIN_SETTINGS
    return { ...DEFAULT_ADMIN_SETTINGS, ...safeReadJson('hm_admin_settings', {}) }
  })
  const [passwordEmail, setPasswordEmail] = useState(user?.email || '')

  const loadOverview = useCallback(async () => {
    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      setOverview({ metrics: fallback.metrics, recentUsers: fallback.recentUsers, recentEvents: fallback.recentEvents })
      return
    }

    const data = await getAdminOverview()
    setOverview(data)
  }, [useLocalMode])

  const buildEventsQuery = useCallback(() => {
    const query = new URLSearchParams()
    query.set('limit', '40')
    if (eventSearch.trim()) query.set('search', eventSearch.trim())
    if (eventStatusFilter) query.set('status', eventStatusFilter)
    return query.toString()
  }, [eventSearch, eventStatusFilter])

  // Stable loader used by the tab-switch effect — receives section as param so it
  // doesn't close over search/filter state (avoids re-running on every keystroke).
  const loadUsersForSection = useCallback(async (section) => {
    const role = section === 'organizers' ? 'organizer'
      : section === 'participants' ? 'participant'
        : ''

    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      const filtered = applyLocalUserFilters(fallback.users, { search: '', role, status: '' })
      setUsers(filtered)
      setUsersTotal(fallback.users.length)
      return
    }

    const data = await listUsers({ limit: 40, search: '', role, status: '' })
    setUsers(Array.isArray(data.users) ? data.users : [])
    setUsersTotal(Number(data.total || 0))
  }, [useLocalMode])

  // Stable events loader for the tab-switch effect (no search/filter state closure).
  const loadEventsForSection = useCallback(async () => {
    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      const filtered = applyLocalEventFilters(fallback.events, { search: '', status: '' })
      setEvents(filtered)
      setEventsTotal(fallback.events.length)
      return
    }

    const data = await listAdminEvents({ limit: 40, search: '', status: '' })
    setEvents(Array.isArray(data.events) ? data.events : [])
    setEventsTotal(Number(data.total || 0))
  }, [useLocalMode])

  // Full loader used by Apply button and action refreshes — respects current search/filter state.
  const loadUsers = useCallback(async () => {
    const role = activeSection === 'organizers' ? 'organizer'
      : activeSection === 'participants' ? 'participant'
        : ''

    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      const filtered = applyLocalUserFilters(fallback.users, {
        search: userSearch,
        role,
        status: userStatusFilter,
      })
      setUsers(filtered)
      setUsersTotal(fallback.users.length)
      return
    }

    const data = await listUsers({
      limit: 40,
      search: userSearch.trim(),
      role,
      status: userStatusFilter,
    })
    setUsers(Array.isArray(data.users) ? data.users : [])
    setUsersTotal(Number(data.total || 0))
  }, [activeSection, useLocalMode, userSearch, userStatusFilter])

  const loadEvents = useCallback(async () => {
    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      const filtered = applyLocalEventFilters(fallback.events, {
        search: eventSearch,
        status: eventStatusFilter,
      })
      setEvents(filtered)
      setEventsTotal(fallback.events.length)
      return
    }

    const queryParams = new URLSearchParams(buildEventsQuery())
    const data = await listAdminEvents({
      limit: Number(queryParams.get('limit') || 40),
      search: queryParams.get('search') || '',
      status: queryParams.get('status') || '',
    })
    setEvents(Array.isArray(data.events) ? data.events : [])
    setEventsTotal(Number(data.total || 0))
  }, [buildEventsQuery, eventSearch, eventStatusFilter, useLocalMode])

  const loadLogs = useCallback(async () => {
    if (useLocalMode) {
      const fallback = buildLocalDashboardData()
      setLogs(Array.isArray(fallback.logs) ? fallback.logs : [])
      return
    }

    const data = await listAdminAuditLogs(50)
    setLogs(Array.isArray(data) ? data : [])
  }, [useLocalMode])

  // Stable initial loader — used only at mount/token change. Does NOT close over
  // search/filter state so it won't recreate on keystrokes.
  const loadAllInitial = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (useLocalMode) {
        const fallback = buildLocalDashboardData()
        setOverview({ metrics: fallback.metrics, recentUsers: fallback.recentUsers, recentEvents: fallback.recentEvents })
        setUsers(fallback.users)
        setEvents(fallback.events)
        setLogs(Array.isArray(fallback.logs) ? fallback.logs : [])
        setUsersTotal(fallback.users.length)
        setEventsTotal(fallback.events.length)
        setNotice('Local mode active: all admin controls are connected to hm_* storage.')
        return
      }

      await Promise.all([loadOverview(), loadUsersForSection('dashboard'), loadEventsForSection(), loadLogs()])
    } catch (loadError) {
      if (bypassActive || !token) {
        const fallback = buildLocalDashboardData()
        setOverview({ metrics: fallback.metrics, recentUsers: fallback.recentUsers, recentEvents: fallback.recentEvents })
        setUsers(fallback.users)
        setEvents(fallback.events)
        setLogs(fallback.logs)
        setUsersTotal(fallback.users.length)
        setEventsTotal(fallback.events.length)
        setNotice('Connected in local fallback mode. Showing hm_* storage data.')
        setError('')
      } else {
        setError(loadError.message || 'Failed to load admin dashboard')
      }
    } finally {
      setLoading(false)
    }
  }, [bypassActive, loadEventsForSection, loadLogs, loadOverview, loadUsersForSection, token, useLocalMode])

  // Full refresh loader used by the Refresh button — respects current filter state.
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([loadOverview(), loadUsers(), loadEvents(), loadLogs()])
    } catch (loadError) {
      setError(loadError.message || 'Failed to refresh admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [loadEvents, loadLogs, loadOverview, loadUsers])

  useEffect(() => {
    // While auth is still loading, keep spinner and don't fall into local mode
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!token) {
      const fallback = buildLocalDashboardData()
      setOverview({ metrics: fallback.metrics, recentUsers: fallback.recentUsers, recentEvents: fallback.recentEvents })
      setUsers(fallback.users)
      setEvents(fallback.events)
      setLogs(fallback.logs)
      setUsersTotal(fallback.users.length)
      setEventsTotal(fallback.events.length)
      setLoading(false)
      setError('')
      setNotice('Bypass mode active: dashboard opened without auth token using local storage data.')
      return
    }

    loadAllInitial()
  }, [authLoading, bypassActive, loadAllInitial, token])

  // ── Supabase Realtime: live updates for admin dashboard ──
  // Subscribe to changes on profiles, events, registrations, and admin_audit_logs
  // so the dashboard auto-refreshes without manual reload.
  useEffect(() => {
    // Don't subscribe in local mode or while auth is loading
    if (useLocalMode || authLoading) return

    const supabaseClient = createClient()
    const channel = supabaseClient
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          void loadOverview()
          void loadUsers()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          void loadOverview()
          void loadEvents()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          void loadOverview()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_audit_logs' },
        () => {
          void loadLogs()
        }
      )
      .subscribe()

    realtimeRef.current = { client: supabaseClient, channel }

    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.client.removeChannel(realtimeRef.current.channel)
        realtimeRef.current = null
      }
    }
  }, [authLoading, loadEvents, loadLogs, loadOverview, loadUsers, useLocalMode])

  // Fires only when the active tab changes — uses stable loaders that do NOT
  // close over search/filter state, so typing in the search box won't re-trigger this.
  useEffect(() => {
    if (activeSection === 'organizers' || activeSection === 'participants') {
      loadUsersForSection(activeSection)
    } else if (activeSection === 'events') {
      loadEventsForSection()
    }
  }, [activeSection, loadUsersForSection, loadEventsForSection])


  useEffect(() => {
    if (user?.email && !passwordEmail) {
      setPasswordEmail(user.email)
    }
  }, [passwordEmail, user?.email])

  const handleRefresh = async () => {
    setNotice('')
    await loadAll()
  }

  const updateAdminSetting = (key, value) => {
    setAdminSettings((current) => ({ ...current, [key]: value }))
  }

  const saveAdminSettings = () => {
    safeWriteJson('hm_admin_settings', adminSettings)
    setNotice('Admin settings saved locally.')
  }

  const handlePasswordReset = async () => {
    const email = String(passwordEmail || user?.email || '').trim()
    if (!email) {
      setError('Enter an admin email address for password reset.')
      return
    }
    setError('')
    const result = await resetPassword(email)
    if (result?.success) {
      setNotice('Password reset link sent to the admin email.')
    } else {
      setError(result?.error || 'Unable to send password reset link.')
    }
  }

  const handleAdminLogout = async () => {
    await logout()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const changeUserRole = async (targetUserId, nextRole) => {
    if (!targetUserId || !nextRole) return

    setActionBusy(true)
    setNotice('')
    setError('')

    try {
      if (useLocalMode) {
        const localUsers = safeReadJson('hm_admin_users', [])
        const userSet = new Map(localUsers.map((entry) => [String(entry?.id || ''), entry]))
        const current = userSet.get(String(targetUserId)) || { id: String(targetUserId), status: 'active', provider: 'local' }
        userSet.set(String(targetUserId), {
          ...current,
          role: nextRole,
          updatedAt: new Date().toISOString(),
        })
        safeWriteJson('hm_admin_users', Array.from(userSet.values()))
        appendLocalAdminLog('user-role-updated', 'user', targetUserId, { role: nextRole })
        setNotice('User role updated successfully.')
        await Promise.all([loadOverview(), loadUsers(), loadLogs()])
        return
      }

      await updateUserRoleFirebase(targetUserId, nextRole, user?.id || 'admin')
      setNotice('User role updated successfully.')
      await Promise.all([loadUsers(), loadLogs(), loadOverview()])
    } catch (updateError) {
      setError(updateError.message || 'Failed to update role')
    } finally {
      setActionBusy(false)
    }
  }

  const toggleUserStatus = async (entry) => {
    if (!entry?.id) return

    const nextStatus = entry.status === 'suspended' ? 'active' : 'suspended'
    const confirmText = nextStatus === 'suspended'
      ? `Suspend ${entry.name || entry.email}? This will revoke active sessions.`
      : `Re-activate ${entry.name || entry.email}?`

    const confirmed = window.confirm(confirmText)
    if (!confirmed) return

    setActionBusy(true)
    setNotice('')
    setError('')

    try {
      if (useLocalMode) {
        const localUsers = safeReadJson('hm_admin_users', [])
        const userSet = new Map(localUsers.map((row) => [String(row?.id || ''), row]))
        const current = userSet.get(String(entry.id)) || {
          id: String(entry.id),
          name: entry.name,
          email: entry.email,
          role: entry.role || 'participant',
          provider: entry.provider || 'local',
        }
        userSet.set(String(entry.id), {
          ...current,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        })
        safeWriteJson('hm_admin_users', Array.from(userSet.values()))
        appendLocalAdminLog('user-status-updated', 'user', entry.id, { status: nextStatus })
        setNotice(`User status changed to ${nextStatus}.`)
        await Promise.all([loadOverview(), loadUsers(), loadLogs()])
        return
      }

      await updateUserStatusFirebase(entry.id, nextStatus, user?.id || 'admin')
      setNotice(`User status changed to ${nextStatus}.`)
      await Promise.all([loadUsers(), loadLogs(), loadOverview()])
    } catch (updateError) {
      setError(updateError.message || 'Failed to update status')
    } finally {
      setActionBusy(false)
    }
  }

  const updateEventStatus = async (eventId, status) => {
    if (!eventId || !status) return

    setActionBusy(true)
    setNotice('')
    setError('')

    try {
      if (useLocalMode) {
        const localEvents = safeReadJson('hm_events', [])
        const updatedEvents = localEvents.map((event) => {
          const currentId = String(event?.id || event?._id || '').trim()
          if (currentId !== String(eventId)) return event
          return {
            ...event,
            status,
            updatedAt: new Date().toISOString(),
          }
        })
        safeWriteJson('hm_events', updatedEvents)
        appendLocalAdminLog('event-status-updated', 'event', eventId, { status })
        setNotice(`Event status updated to ${status}.`)
        await Promise.all([loadOverview(), loadEvents(), loadLogs()])
        return
      }

      await updateEventStatusFirebase(eventId, status, user?.id || 'admin')
      setNotice(`Event status updated to ${status}.`)
      await Promise.all([loadEvents(), loadLogs(), loadOverview()])
    } catch (updateError) {
      setError(updateError.message || 'Failed to update event status')
    } finally {
      setActionBusy(false)
    }
  }

  const adminSummaryCards = useMemo(() => {
    const metrics = overview?.metrics || {}
    const roleCounts = metrics.roleCounts || {}
    const draftEvents = events.filter((event) => String(event?.status || '').toLowerCase() === 'draft').length
    const totalEvents = Number(metrics.totalEvents ?? eventsTotal ?? events.length ?? 0)
    const publishedEvents = Math.max(totalEvents - draftEvents, 0)

    return [
      {
        label: 'Total Organizers',
        value: roleCounts.organizer ?? 0,
        icon: UserCog,
      },
      {
        label: 'Total Participants',
        value: roleCounts.participant ?? 0,
        icon: Users2,
      },
      {
        label: 'Total Events',
        value: totalEvents,
        icon: CalendarRange,
      },
      {
        label: 'Published Events',
        value: publishedEvents,
        icon: CheckCheck,
      },
      {
        label: 'Draft Events',
        value: draftEvents,
        icon: Award,
      },
    ]
  }, [events, eventsTotal, overview])

  const organizerUsers = useMemo(
    () => users.filter((entry) => normalizeUserRole(entry?.role) === 'organizer'),
    [users]
  )

  const participantUsers = useMemo(
    () => users.filter((entry) => normalizeUserRole(entry?.role) === 'participant'),
    [users]
  )

  const recentOrganizers = useMemo(() => {
    const overviewOrganizers = (overview?.recentUsers || []).filter((entry) => normalizeUserRole(entry?.role) === 'organizer')
    const source = overviewOrganizers.length ? overviewOrganizers : organizerUsers
    return source.slice(0, 5)
  }, [organizerUsers, overview])

  const recentEvents = useMemo(() => {
    const source = Array.isArray(overview?.recentEvents) && overview.recentEvents.length ? overview.recentEvents : events
    return source.slice(0, 5)
  }, [events, overview])

  const selectedEvent = useMemo(
    () => {
      if (!selectedEventId) return null
      return events.find((event) => getEventId(event) === selectedEventId) || null
    },
    [events, selectedEventId]
  )

  const selectedRegistrations = useMemo(() => {
    if (!selectedEvent) return []
    const eventId = getEventId(selectedEvent)
    return getEventRegistrations(eventId)
  }, [getEventRegistrations, selectedEvent])

  const selectedCredentials = useMemo(() => {
    if (!selectedEvent) return []
    const eventId = getEventId(selectedEvent)
    return (credentials || []).filter((item) => String(item?.eventId || '').trim() === eventId)
  }, [credentials, selectedEvent])

  const selectedPaymentStats = useMemo(() => {
    const registrationFee = getEventFee(selectedEvent || {})
    const paidRegistrations = selectedRegistrations.filter((reg) => getPaymentStatus(reg) === 'paid')
    const grossCollection = paidRegistrations.reduce((sum, reg) => {
      const amount = Number(reg?.paymentAmount || reg?.amount || reg?.payment?.amount || registrationFee || 0) || 0
      return sum + amount
    }, 0)
    const platformFeeRate = Number(adminSettings.platformFee || 0) || 0
    const platformFee = Math.round(grossCollection * platformFeeRate) / 100
    const netSettlement = Math.max(grossCollection - platformFee, 0)

    return {
      registrationFee,
      totalTransactions: paidRegistrations.length,
      grossCollection,
      platformFee,
      netSettlement,
      settlementStatus: grossCollection > 0 ? 'Pending' : 'No transactions',
    }
  }, [adminSettings.platformFee, selectedEvent, selectedRegistrations])

  const credentialStats = useMemo(() => {
    const issued = selectedCredentials.length
    const eligible = selectedRegistrations.filter((reg) => reg.checkedIn).length
    return {
      issued,
      pending: Math.max(eligible - issued, 0),
      failed: selectedCredentials.filter((item) => String(item?.status || '').toLowerCase() === 'failed').length,
      participant: selectedCredentials.filter((item) => String(item?.type || item?.credentialType || 'participation').toLowerCase() !== 'volunteer'),
      volunteer: selectedCredentials.filter((item) => String(item?.type || item?.credentialType || '').toLowerCase() === 'volunteer'),
    }
  }, [selectedCredentials, selectedRegistrations])

  const handleRegistrationExport = () => {
    if (!selectedEvent || selectedRegistrations.length === 0) return
    const rows = selectedRegistrations.map((reg) => ({
      'Registration ID': reg.id || '',
      Name: getRegistrationName(reg),
      Email: getRegistrationEmail(reg),
      Phone: getRegistrationPhone(reg),
      'College/Organization': getRegistrationOrg(reg),
      'Team Name': getRegistrationTeam(reg),
      'Team Members': Array.isArray(reg.members) ? reg.members.join('; ') : '',
      'Payment Status': getPaymentStatus(reg),
      'Registration Date': reg.createdAt || reg.registeredAt || '',
    }))
    downloadCSV(rows, `${selectedEvent.title || 'event'}-registrations.csv`)
  }

  const handlePaymentsExport = () => {
    if (!selectedEvent || selectedRegistrations.length === 0) return
    const rows = selectedRegistrations.map((reg) => ({
      'Transaction ID': reg?.transactionId || reg?.payment?.transactionId || '',
      Name: getRegistrationName(reg),
      Email: getRegistrationEmail(reg),
      Amount: Number(reg?.paymentAmount || reg?.amount || reg?.payment?.amount || selectedPaymentStats.registrationFee || 0) || 0,
      Status: getPaymentStatus(reg),
      'Payment Date': reg.createdAt || reg.registeredAt || '',
    }))
    downloadCSV(rows, `${selectedEvent.title || 'event'}-payments.csv`)
  }

  const heroHighlights = useMemo(() => {
    const metrics = overview?.metrics || {}
    return [
      { label: 'Users', value: metrics.totalUsers ?? 0 },
      { label: 'Events', value: metrics.totalEvents ?? 0 },
      { label: 'Complaints', value: metrics.openComplaints ?? 0 },
    ]
  }, [overview])

  const renderUserAccountsPanel = (title, displayUsers, emptyMessage) => (
    <section className="admin-panel admin-section-anchor">
      <div className="admin-panel__head">
        <h2>{title} ({displayUsers.length})</h2>
        <div className="admin-panel__filters">
          <label className="admin-search">
            <Search size={14} />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name or email"
            />
          </label>
          <select value={userStatusFilter} onChange={(event) => setUserStatusFilter(event.target.value)}>
            <option value="">All status</option>
            {USER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button type="button" onClick={loadUsers} disabled={loading || actionBusy}>Apply</button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Provider</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div className="admin-user-cell">
                    <span className="admin-avatar" style={{ background: entry.avatarBackdrop || undefined }}>
                      {entry.name?.charAt(0) || 'U'}
                    </span>
                    <div>
                      <strong>{entry.name || 'Unnamed'}</strong>
                      <p>{entry.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={getRoleClassName(entry.role)}>{entry.role}</span>
                </td>
                <td>
                  <span className={getStatusClassName(entry.status)}>{entry.status || 'active'}</span>
                </td>
                <td>{entry.provider || 'local'}</td>
                <td>{formatDate(entry.createdAt)}</td>
                <td>
                  <div className="admin-actions">
                    <select
                      value={entry.role}
                      onChange={(event) => changeUserRole(entry.id, event.target.value)}
                      disabled={actionBusy}
                    >
                      {USER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(entry)}
                      disabled={actionBusy}
                      className={entry.status === 'suspended' ? 'admin-btn admin-btn--success' : 'admin-btn admin-btn--danger'}
                    >
                      {entry.status === 'suspended' ? 'Restore' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">{emptyMessage}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )

  const renderEventsPanel = () => (
    <section className="admin-panel admin-section-anchor">
      <div className="admin-panel__head">
        <h2>Events ({eventsTotal})</h2>
        <div className="admin-panel__filters">
          <label className="admin-search">
            <Search size={14} />
            <input
              value={eventSearch}
              onChange={(event) => setEventSearch(event.target.value)}
              placeholder="Search event title or organizer"
            />
          </label>
          <select value={eventStatusFilter} onChange={(event) => setEventStatusFilter(event.target.value)}>
            <option value="">All status</option>
            {EVENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button type="button" onClick={loadEvents} disabled={loading || actionBusy}>Apply</button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Organizer</th>
              <th>Registrations</th>
              <th>Updated</th>
              <th>Moderation</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((entry) => (
              <tr key={entry.id || entry._id}>
                <td>
                  <strong>{entry.title || 'Untitled Event'}</strong>
                </td>
                <td>
                  <span className={getStatusClassName(entry.status || 'upcoming')}>{entry.status || 'upcoming'}</span>
                </td>
                <td>{entry.organiser?.name || entry.organizer?.name || 'Unknown'}</td>
                <td>{Number(entry.registeredCount || 0)}</td>
                <td>{formatDate(entry.updatedAt || entry.createdAt)}</td>
                <td>
                  <select
                    value={entry.status || 'upcoming'}
                    onChange={(event) => updateEventStatus(entry.id || entry._id, event.target.value)}
                    disabled={actionBusy}
                  >
                    {EVENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventId(getEventId(entry))
                      setActiveEventTab('Overview')
                    }}
                    disabled={actionBusy}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty">No events found for current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {selectedEvent ? renderSelectedEventDetails() : null}
    </section>
  )

  const renderSelectedEventDetails = () => {
    const micrositeUrl = typeof window !== 'undefined' && selectedEvent
      ? `${window.location.origin}/events/${getEventId(selectedEvent)}`
      : ''

    return (
      <div className="admin-modal-overlay" onClick={() => setSelectedEventId('')}>
        <div className="admin-modal-content admin-event-detail" onClick={(e) => e.stopPropagation()}>
          <div className="admin-panel__head" style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedEvent.title || 'Selected Event'}</h2>
              <button 
                type="button" 
                onClick={() => setSelectedEventId('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="admin-panel__filters" style={{ marginBottom: '1.25rem' }}>
            {EVENT_DETAIL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeEventTab === tab ? 'is-active' : ''}
                onClick={() => setActiveEventTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

        {activeEventTab === 'Overview' ? (
            <section className="admin-modal-metrics">
              <article className="admin-modal-metric">
                <div className="admin-modal-metric__top">
                  <span className="admin-modal-metric__title">Registrations</span>
                  <div className="admin-modal-metric__icon"><Users2 size={24} /></div>
                </div>
                <div className="admin-modal-metric__value">{selectedRegistrations.length}</div>
              </article>
              <article className="admin-modal-metric">
                <div className="admin-modal-metric__top">
                  <span className="admin-modal-metric__title">Checked In</span>
                  <div className="admin-modal-metric__icon"><CheckCheck size={24} /></div>
                </div>
                <div className="admin-modal-metric__value">{selectedRegistrations.filter((reg) => reg.checkedIn).length}</div>
              </article>
              <article className="admin-modal-metric">
                <div className="admin-modal-metric__top">
                  <span className="admin-modal-metric__title">Credentials</span>
                  <div className="admin-modal-metric__icon"><Award size={24} /></div>
                </div>
                <div className="admin-modal-metric__value">{selectedCredentials.length}</div>
              </article>
              <article className="admin-modal-metric">
                <div className="admin-modal-metric__top">
                  <span className="admin-modal-metric__title">Status</span>
                  <div className="admin-modal-metric__icon"><CalendarRange size={24} /></div>
                </div>
                <div className="admin-modal-metric__value" style={{ textTransform: 'capitalize' }}>{selectedEvent.status || 'upcoming'}</div>
              </article>
            </section>
          ) : null}

        {activeEventTab === 'Microsite URL' ? (
          <div className="admin-settings-card admin-settings-card--wide">
            <div className="admin-metric-card__icon"><ExternalLink size={18} /></div>
            <div>
              <h3>Microsite URL</h3>
              <p>{micrositeUrl || 'Microsite URL unavailable.'}</p>
              {micrositeUrl ? (
                <button type="button" onClick={() => navigator.clipboard?.writeText(micrositeUrl)}>
                  Copy URL
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeEventTab === 'Registrations' ? (
          <section className="admin-metrics">
            <article className="admin-metric-card"><div><p>Total Registrations</p><h3>{selectedRegistrations.length}</h3></div></article>
            <article className="admin-metric-card"><div><p>Paid</p><h3>{selectedRegistrations.filter((reg) => getPaymentStatus(reg) === 'paid').length}</h3></div></article>
            <article className="admin-metric-card"><div><p>Pending</p><h3>{selectedRegistrations.filter((reg) => getPaymentStatus(reg) !== 'paid').length}</h3></div></article>
          </section>
        ) : null}

        {activeEventTab === 'Registration Table' ? (
          <>
            <div className="admin-panel__head">
              <h2>Registration Table</h2>
              <button type="button" onClick={handleRegistrationExport} disabled={selectedRegistrations.length === 0}>
                Export CSV
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Team</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>{getRegistrationName(reg)}</td>
                      <td>{getRegistrationEmail(reg) || 'N/A'}</td>
                      <td>{getRegistrationPhone(reg) || 'N/A'}</td>
                      <td>{getRegistrationTeam(reg)}</td>
                      <td><span className={getStatusClassName(getPaymentStatus(reg) === 'paid' ? 'live' : 'upcoming')}>{getPaymentStatus(reg)}</span></td>
                      <td><span className={getStatusClassName(reg.checkedIn ? 'live' : 'upcoming')}>{reg.checkedIn ? 'Checked In' : 'Registered'}</span></td>
                    </tr>
                  ))}
                  {selectedRegistrations.length === 0 ? (
                    <tr><td colSpan={6} className="admin-empty">No registrations found for this event.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {activeEventTab === 'Payments' ? (
          <>
            <section className="admin-metrics">
              <article className="admin-metric-card"><div><p>Registration Fee</p><h3>{selectedPaymentStats.registrationFee}</h3></div></article>
              <article className="admin-metric-card"><div><p>Total Transactions</p><h3>{selectedPaymentStats.totalTransactions}</h3></div></article>
              <article className="admin-metric-card"><div><p>Gross Collection</p><h3>{selectedPaymentStats.grossCollection}</h3></div></article>
              <article className="admin-metric-card"><div><p>Platform Fee</p><h3>{selectedPaymentStats.platformFee}</h3></div></article>
              <article className="admin-metric-card"><div><p>Net Settlement</p><h3>{selectedPaymentStats.netSettlement}</h3></div></article>
              <article className="admin-metric-card"><div><p>Settlement Status</p><h3>{selectedPaymentStats.settlementStatus}</h3></div></article>
            </section>
            <div className="admin-panel__head">
              <h2>Transaction Table</h2>
              <button type="button" onClick={handlePaymentsExport} disabled={selectedRegistrations.length === 0}>
                Export CSV
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Transaction ID</th>
                    <th>Transaction Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>{getRegistrationName(reg)}</td>
                      <td>{reg?.transactionId || reg?.payment?.transactionId || 'N/A'}</td>
                      <td>{Number(reg?.paymentAmount || reg?.amount || reg?.payment?.amount || selectedPaymentStats.registrationFee || 0) || 0}</td>
                      <td><span className={getStatusClassName(getPaymentStatus(reg) === 'paid' ? 'live' : 'upcoming')}>{getPaymentStatus(reg)}</span></td>
                    </tr>
                  ))}
                  {selectedRegistrations.length === 0 ? (
                    <tr><td colSpan={4} className="admin-empty">No transactions found for this event.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {activeEventTab === 'E-Credentials' ? (
          <>
            <section className="admin-metrics">
              <article className="admin-metric-card"><div><p>Credentials Issued</p><h3>{credentialStats.issued}</h3></div></article>
              <article className="admin-metric-card"><div><p>Pending Credentials</p><h3>{credentialStats.pending}</h3></div></article>
              <article className="admin-metric-card"><div><p>Failed Credentials</p><h3>{credentialStats.failed}</h3></div></article>
            </section>
            <div className="admin-dashboard-grid">
              <article className="admin-panel admin-panel--compact">
                <div className="admin-panel__head"><h2>Participant Certificate List</h2></div>
                <div className="admin-mini-list">
                  {credentialStats.participant.length === 0 ? <p className="admin-empty">No participant certificates issued yet.</p> : null}
                  {credentialStats.participant.map((credential) => (
                    <div key={credential.id || credential._id} className="admin-mini-item">
                      <div><strong>{credential.participantName || credential.name || credential.userId || 'Participant'}</strong><p>{formatDate(credential.issuedAt || credential.createdAt)}</p></div>
                      <span className="admin-pill admin-pill--success">Issued</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="admin-panel admin-panel--compact">
                <div className="admin-panel__head"><h2>Volunteer Certificate List</h2></div>
                <div className="admin-mini-list">
                  {credentialStats.volunteer.length === 0 ? <p className="admin-empty">No volunteer certificates issued yet.</p> : null}
                  {credentialStats.volunteer.map((credential) => (
                    <div key={credential.id || credential._id} className="admin-mini-item">
                      <div><strong>{credential.participantName || credential.name || credential.userId || 'Volunteer'}</strong><p>{formatDate(credential.issuedAt || credential.createdAt)}</p></div>
                      <span className="admin-pill admin-pill--success">Issued</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </>
        ) : null}

        {activeEventTab === 'Settings' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Platform Fee */}
            <article className="admin-settings-card" style={{ width: '100%' }}>
              <div>
                <h3>Platform Fee (%)</h3>
                <label className="admin-field">
                  <span>Fee percentage</span>
                  <select
                    value={adminSettings.platformFee}
                    onChange={(e) => updateAdminSetting('platformFee', e.target.value)}
                  >
                    <option value="2">2%</option>
                    <option value="3">3%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                  </select>
                </label>
                <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                  <button type="button" onClick={saveAdminSettings}>Save</button>
                </div>
              </div>
            </article>

            {/* Payment Gateway */}
            <article className="admin-settings-card" style={{ width: '100%' }}>
              <div>
                <h3>Payment Gateway</h3>
                <label className="admin-field">
                  <span>Provider</span>
                  <select
                    value={adminSettings.paymentGateway}
                    onChange={(e) => updateAdminSetting('paymentGateway', e.target.value)}
                  >
                    <option value="Razorpay">Razorpay</option>
                    <option value="PayU">PayU</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Key ID</span>
                  <input
                    value={adminSettings.paymentGatewayKeyId}
                    onChange={(e) => updateAdminSetting('paymentGatewayKeyId', e.target.value)}
                    placeholder="Enter Key ID"
                  />
                </label>
                <label className="admin-field">
                  <span>Secret Key</span>
                  <input
                    type="password"
                    value={adminSettings.paymentGatewaySecret}
                    onChange={(e) => updateAdminSetting('paymentGatewaySecret', e.target.value)}
                    placeholder="Enter Secret Key"
                  />
                </label>
                <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                  <button type="button" onClick={saveAdminSettings}>Save</button>
                </div>
              </div>
            </article>

            {/* Email Settings */}
            <article className="admin-settings-card" style={{ width: '100%' }}>
              <div>
                <h3>Email Settings</h3>
                <label className="admin-field">
                  <span>Sender Email</span>
                  <input
                    value={adminSettings.emailSenderEmail}
                    onChange={(e) => updateAdminSetting('emailSenderEmail', e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </label>
                <label className="admin-field">
                  <span>Sender Name</span>
                  <input
                    value={adminSettings.emailSender}
                    onChange={(e) => updateAdminSetting('emailSender', e.target.value)}
                    placeholder="Hunchmate"
                  />
                </label>
                <label className="admin-field">
                  <span>Reply-To Email</span>
                  <input
                    value={adminSettings.emailReplyTo}
                    onChange={(e) => updateAdminSetting('emailReplyTo', e.target.value)}
                    placeholder="support@example.com"
                  />
                </label>
                <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                  <button type="button" onClick={saveAdminSettings}>Save</button>
                </div>
              </div>
            </article>

            {/* E-Credentials Settings */}
            <article className="admin-settings-card" style={{ width: '100%' }}>
              <div>
                <h3>E-Credentials Settings</h3>
                <label className="admin-field">
                  <span>Platform Name</span>
                  <input
                    value={adminSettings.platformName}
                    onChange={(e) => updateAdminSetting('platformName', e.target.value)}
                    placeholder="Hunchmate"
                  />
                </label>
                <label className="admin-field">
                  <span>Certificate Footer</span>
                  <input
                    value={adminSettings.certFooter}
                    onChange={(e) => updateAdminSetting('certFooter', e.target.value)}
                    placeholder="Issued by Hunchmate Platform"
                  />
                </label>
                <label className="admin-field">
                  <span>Signature Name</span>
                  <input
                    value={adminSettings.signatureName}
                    onChange={(e) => updateAdminSetting('signatureName', e.target.value)}
                    placeholder="Platform Director"
                  />
                </label>
                <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                  <button type="button" onClick={saveAdminSettings}>Save</button>
                </div>
              </div>
            </article>

          </div>
        ) : null}
        </div>
      </div>
    )
  }

  const renderSettingsPanel = () => (
    <section className="admin-panel admin-section-anchor">
      <div className="admin-panel__head">
        <h2>Settings</h2>
        <button type="button" onClick={saveAdminSettings}>Save Settings</button>
      </div>
      <div className="admin-settings-grid">
        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><Settings size={18} /></div>
          <div>
            <h3>Platform Fee</h3>
            <label className="admin-field">
              <span>Fee percentage</span>
              <input value={adminSettings.platformFee} onChange={(event) => updateAdminSetting('platformFee', event.target.value)} />
            </label>
          </div>
        </article>

        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><Settings size={18} /></div>
          <div>
            <h3>Payment Gateway</h3>
            <label className="admin-field">
              <span>Provider</span>
              <select value={adminSettings.paymentGateway} onChange={(event) => updateAdminSetting('paymentGateway', event.target.value)}>
                <option value="Razorpay">Razorpay</option>
                <option value="Stripe">Stripe</option>
                <option value="Manual">Manual</option>
              </select>
            </label>
          </div>
        </article>

        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><Settings size={18} /></div>
          <div>
            <h3>Email Settings</h3>
            <label className="admin-field">
              <span>Sender name</span>
              <input value={adminSettings.emailSender} onChange={(event) => updateAdminSetting('emailSender', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Reply-to email</span>
              <input value={adminSettings.emailReplyTo} onChange={(event) => updateAdminSetting('emailReplyTo', event.target.value)} />
            </label>
          </div>
        </article>

        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><Award size={18} /></div>
          <div>
            <h3>E-Credentials Storage</h3>
            <label className="admin-field">
              <span>Storage provider</span>
              <select value={adminSettings.credentialStorage} onChange={(event) => updateAdminSetting('credentialStorage', event.target.value)}>
                <option value="Supabase Storage">Supabase Storage</option>
                <option value="Local Storage">Local Storage</option>
                <option value="External URL">External URL</option>
              </select>
            </label>
          </div>
        </article>

        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><Shield size={18} /></div>
          <div>
            <h3>Platform Information</h3>
            <label className="admin-field">
              <span>Platform name</span>
              <input value={adminSettings.platformName} onChange={(event) => updateAdminSetting('platformName', event.target.value)} />
            </label>
            <label className="admin-field">
              <span>Support email</span>
              <input value={adminSettings.supportEmail} onChange={(event) => updateAdminSetting('supportEmail', event.target.value)} />
            </label>
          </div>
        </article>

        <article className="admin-settings-card">
          <div className="admin-metric-card__icon"><UserCog size={18} /></div>
          <div>
            <h3>Admin Account</h3>
            <label className="admin-field">
              <span>Password reset email</span>
              <input value={passwordEmail} onChange={(event) => setPasswordEmail(event.target.value)} />
            </label>
            <div className="admin-actions">
              <button type="button" onClick={handlePasswordReset}>Change Password</button>
              <button type="button" className="admin-btn admin-btn--danger" onClick={handleAdminLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  )

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard__bg admin-dashboard__bg--one" />
      <div className="admin-dashboard__bg admin-dashboard__bg--two" />

      <header className="admin-dashboard__header container">
        <div className="admin-dashboard__hero">
          <div>
            <p className="admin-dashboard__eyebrow">Platform Administration</p>
            <h1>Control Center</h1>
            <p className="admin-dashboard__subtitle">
              Monitor platform health, govern user access, and moderate events from one secured panel.
            </p>
          </div>
          <div className="admin-dashboard__hero-stats">
            {heroHighlights.map((item) => (
              <article key={item.label} className="admin-dashboard__hero-chip">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
        <div className="admin-dashboard__hero-actions">
          <button
            type="button"
            className="admin-dashboard__refresh-btn"
            onClick={handleRefresh}
            disabled={loading || actionBusy}
          >
            {(loading || actionBusy) ? <LoaderCircle size={16} className="admin-spin" /> : <Activity size={16} />}
            Refresh Data
          </button>
        </div>
      </header>

      <div className="container admin-dashboard__content">
        {error ? (
          <div className="admin-alert admin-alert--error">
            <CircleAlert size={16} /> {error}
          </div>
        ) : null}
        {notice ? <div className="admin-alert admin-alert--notice">{notice}</div> : null}

        <div className="admin-workspace">
          <aside className="admin-rail">
            <div className="admin-rail__title">
              <Shield size={16} />
              <span>Admin Dashboard</span>
            </div>
            {ADMIN_SECTIONS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-rail__item${activeSection === item.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveSection(item.id)
                    setUserSearch('')
                    setUserStatusFilter('')
                    setEventSearch('')
                    setEventStatusFilter('')
                  }}
                >
                  <Icon size={15} /> {item.label}
                </button>
              )
            })}
          </aside>

          <div className="admin-main">
            {activeSection === 'dashboard' ? (
              <section className="admin-section-anchor">
                <section className="admin-metrics admin-metrics--ceo">
                  {adminSummaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <article key={card.label} className="admin-metric-card">
                        <div className="admin-metric-card__icon"><Icon size={18} /></div>
                        <div>
                          <p>{card.label}</p>
                          <h3>{card.value}</h3>
                        </div>
                      </article>
                    )
                  })}
                </section>

                <section className="admin-dashboard-grid">
                  <article className="admin-panel admin-panel--compact">
                    <div className="admin-panel__head">
                      <h2>Recent Organizers</h2>
                    </div>
                    <div className="admin-mini-list">
                      {recentOrganizers.length === 0 ? <p className="admin-empty">No organizers found yet.</p> : null}
                      {recentOrganizers.map((entry) => (
                        <div key={entry.id || entry.email} className="admin-mini-item">
                          <span className="admin-avatar" style={{ background: entry.avatarBackdrop || undefined }}>
                            {entry.name?.charAt(0) || 'O'}
                          </span>
                          <div>
                            <strong>{entry.name || 'Unnamed Organizer'}</strong>
                            <p>{entry.email}</p>
                          </div>
                          <span className={getStatusClassName(entry.status)}>{entry.status || 'active'}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="admin-panel admin-panel--compact">
                    <div className="admin-panel__head">
                      <h2>Recent Events</h2>
                    </div>
                    <div className="admin-mini-list">
                      {recentEvents.length === 0 ? <p className="admin-empty">No events found yet.</p> : null}
                      {recentEvents.map((entry) => (
                        <div key={entry.id || entry._id || entry.title} className="admin-mini-item">
                          <div>
                            <strong>{entry.title || 'Untitled Event'}</strong>
                            <p>{entry.organiser?.name || entry.organizer?.name || 'Unknown organizer'}</p>
                          </div>
                          <span className={getStatusClassName(entry.status || 'upcoming')}>{entry.status || 'upcoming'}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="admin-panel admin-panel--compact admin-panel--audit">
                    <div className="admin-panel__head">
                      <h2>Notifications / Audit Trail</h2>
                    </div>
                    <div className="admin-log-list">
                      {logs.length === 0 ? <p className="admin-empty">No admin actions recorded yet.</p> : null}
                      {logs.slice(0, 6).map((entry, idx) => (
                        <article key={entry.id || entry._id || `log-${idx}`} className="admin-log-item">
                          <div>
                            <strong>{toTitleCase(entry.action || 'audit event')}</strong>
                            <p>{getAuditDescription(entry)}</p>
                            <p>{formatDate(entry.createdAt)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                </section>
              </section>
            ) : null}

            {activeSection === 'organizers'
              ? renderUserAccountsPanel('Organizer Accounts', organizerUsers, 'No organizers found for current filters.')
              : null}

            {activeSection === 'participants'
              ? renderUserAccountsPanel('Participant Accounts', participantUsers, 'No participants found for current filters.')
              : null}

            {activeSection === 'events' ? renderEventsPanel() : null}

            {activeSection === 'settings' ? renderSettingsPanel() : null}
          </div>
        </div>
      </div>
    </section>
  )
}
