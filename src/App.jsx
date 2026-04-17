import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { EventProvider } from './context/EventContext'
import { useAuth } from './context/AuthContext'

const Layout = lazy(() => import('./components/layout/Layout'))
const Landing = lazy(() => import('./pages/Landing'))
const Home = lazy(() => import('./pages/Home'))
const Events = lazy(() => import('./pages/Events'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const HostSignup = lazy(() => import('./pages/HostSignup'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const HostOnboarding = lazy(() => import('./pages/HostOnboarding'))
const InviteJoin = lazy(() => import('./pages/InviteJoin'))
const OrganizerDashboard = lazy(() => import('./pages/organizer/Dashboard'))
const CreateEvent = lazy(() => import('./pages/organizer/CreateEvent'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'))
const HelpCenter = lazy(() => import('./pages/HelpCenter'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Profile = lazy(() => import('./pages/Profile'))
const ALLOW_ADMIN_BYPASS = false

function getOnboardingCacheKey(user) {
  const identity = String(user?.id || user?.email || '').trim()
  return identity ? `hm_onboarding_completed_${identity}` : ''
}

function getHostOnboardingCacheKey(user) {
  const identity = String(user?.id || user?.email || '').trim()
  return identity ? `hm_host_onboarding_completed_${identity}` : ''
}

function hasCompletedHostOnboarding(user) {
  if (!user) return false
  if (user.hostOnboardingCompleted) return true

  const cacheKey = getHostOnboardingCacheKey(user)
  if (cacheKey && typeof window !== 'undefined' && window.localStorage.getItem(cacheKey) === '1') {
    return true
  }

  return Boolean(
    String(user.institutionName || '').trim()
    && String(user.hostType || '').trim()
    && String(user.name || '').trim()
    && String(user.phoneNumber || '').trim()
    && String(user.state || '').trim()
    && String(user.city || '').trim()
  )
}

function hasCompletedParticipantOnboarding(user) {
  if (!user) return false
  if (user.onboardingCompleted) return true

  const cacheKey = getOnboardingCacheKey(user)
  if (cacheKey && typeof window !== 'undefined' && window.localStorage.getItem(cacheKey) === '1') {
    return true
  }

  const hasCore = Boolean(
    String(user.profileType || '').trim()
    && String(user.stream || '').trim()
    && String(user.graduationYear || '').trim()
    && String(user.institutionName || user.institution || '').trim()
    && String(user.state || '').trim()
    && String(user.city || '').trim()
    && Array.isArray(user.skills)
    && user.skills.length > 0,
  )

  if (!hasCore) return false

  if (user.profileType === 'working_professional') {
    return Boolean(
      String(user.experience || '').trim()
      && String(user.techProficiency || '').trim()
      && String(user.currentDesignation || '').trim(),
    )
  }

  return true
}

function hasCompletedOnboarding(user) {
  if (!user) return false
  if (user.role === 'admin') return true
  
  if (user.role === 'organizer') {
    return hasCompletedHostOnboarding(user)
  }
  
  return hasCompletedParticipantOnboarding(user)
}

function getUserHome(user) {
  if (!user) return '/'
  if (user.role === 'admin') return '/admin/dashboard'
  if (!hasCompletedOnboarding(user)) return '/onboarding'
  return user.role === 'organizer' ? '/organizer/dashboard' : '/events'
}

function RouteFallback() {
  return (
    <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
    </div>
  )
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (ALLOW_ADMIN_BYPASS && location.pathname.startsWith('/admin/dashboard')) {
    return <Outlet />
  }

  if (loading) return <RouteFallback />
  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'admin') {
    if (location.pathname === '/onboarding' || location.pathname === '/host-onboarding') {
      return <Navigate to="/admin/dashboard" replace />
    }
    return <Outlet />
  }
  
  const isOnParticipantOnboarding = location.pathname === '/onboarding'
  const isOnHostOnboarding = location.pathname === '/host-onboarding'
  
  if (user.role === 'organizer') {
    if (!hasCompletedHostOnboarding(user) && !isOnHostOnboarding) {
      return <Navigate to="/host-onboarding" replace />
    }
  } else {
    if (!hasCompletedParticipantOnboarding(user) && !isOnParticipantOnboarding) {
      return <Navigate to="/onboarding" replace />
    }
  }

  return <Outlet />
}

function RequireRole({ role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (ALLOW_ADMIN_BYPASS && role === 'admin' && location.pathname.startsWith('/admin/dashboard')) {
    return <Outlet />
  }

  if (loading) return <RouteFallback />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={getUserHome(user)} replace />

  return <Outlet />
}

function RequireGuest() {
  const { user, loading } = useAuth()

  // Let guests access login/signup immediately even if auth bootstrap is still in progress.
  if (loading && !user) return <Outlet />
  if (loading) return <RouteFallback />
  if (user) return <Navigate to={getUserHome(user)} replace />

  return <Outlet />
}

function App() {
  return (
    <EventProvider>
      <Suspense fallback={<RouteFallback />}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<RequireAuth />}>
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/complaints" element={<AdminComplaints />} />
            </Route>
          </Route>

          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/host-event" element={<Navigate to="/host-signup" replace />} />
            <Route path="/invites/:inviteId" element={<InviteJoin />} />

            <Route element={<RequireGuest />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/host-signup" element={<HostSignup />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/host-onboarding" element={<HostOnboarding />} />
              <Route path="/dashboard" element={<Profile />} />
              <Route path="/dashboard/settings" element={<Profile />} />
              <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
              <Route path="/profile/settings" element={<Navigate to="/dashboard/settings" replace />} />
              <Route path="/help-center" element={<HelpCenter />} />

              <Route element={<RequireRole role="organizer" />}>
                <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
                <Route path="/organizer/create-event" element={<CreateEvent />} />
                <Route path="/organizer/edit-event/:eventId" element={<CreateEvent />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </EventProvider>
  )
}

export default App
