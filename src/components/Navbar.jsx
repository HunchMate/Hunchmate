import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import {
  Menu,
  X,
  Bell,
  LogOut,
  LayoutDashboard,
  Shield,
  LifeBuoy,
  MessageCircle,
  Send,
  ChevronRight,
  Bookmark,
} from 'lucide-react'
import { Link, useNavigate, useLocation } from '@/utils/router'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../context/EventContext'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import hunchmateLogo from '../../HUNCHMATE - Logo Pack (2).png'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Explore Events', to: '/events' },
  { label: 'Host Event', to: '/host-event' },
  { label: 'Contact Us', to: '/contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const { user, logout } = useAuth()
  const { getOrganizerNotifications } = useEvents()
  const navigate = useNavigate()
  const location = useLocation()
  const profileMenuRef = useRef(null)

  const isLightPage = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/profile')

  const organizerNotifications = user?.role === 'organizer' ? getOrganizerNotifications(user.id) : []
  const unreadCount = organizerNotifications.filter((item) => !item.read).length

  useEffect(() => {
    let lastY = window.scrollY
    const scrollThreshold = 10

    const onScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastY

      if (currentY <= 24) {
        setIsNavVisible(true)
        lastY = currentY
        return
      }

      if (Math.abs(delta) < scrollThreshold) {
        return
      }

      const scrollingDown = delta > 0
      setIsNavVisible(!scrollingDown)
      lastY = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false)
        setSupportOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = () => {
    // Start logout in background and navigate immediately for a snappy UX
    logout();
    navigate('/');
  }

  const closeProfileMenu = () => {
    setProfileOpen(false)
    setSupportOpen(false)
  }

  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin/dashboard'
    if (user?.role === 'organizer') return '/organizer/dashboard'
    return '/dashboard'
  }

  const getDashboardLabel = () => {
    if (user?.role === 'admin') return 'Dashboard'
    if (user?.role === 'organizer') return 'Mission Control'
    return 'Profile'
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[70] w-full flex justify-center px-6 pt-4 pointer-events-none transition-transform duration-300 ${
        isNavVisible || mobileOpen ? 'translate-y-0' : '-translate-y-[130%]'
      }`}
    >
      <Link
        to="/"
        className="pointer-events-auto absolute left-6 top-1 flex items-center flex-shrink-0"
      >
        <span
          className="inline-flex"
          style={{ width: '300px', height: '80px' }}
        >
          <img
            src={hunchmateLogo?.src || hunchmateLogo}
            alt="HunchMate"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'left center',
              transform: 'scale(2.4)',
              transformOrigin: 'left center',
              filter: isLightPage ? 'invert(1) brightness(0.2)' : 'none',
              transition: 'filter 0.3s ease'
            }}
          />
        </span>
      </Link>

      {/* Pill-shaped centered navbar */}
      <div
        className="flex h-14 items-center rounded-full relative pointer-events-auto"
        style={{
          background: 'rgba(35,35,40,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: 'min(420px, 100%)',
          maxWidth: 'min(640px, calc(100vw - 48px))',
          width: '100%',
        }}
      >
        {/* Desktop Links */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-white/70 hover:text-white/90 text-[13px] transition-colors duration-200 font-medium"
                style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Side - Profile or Auth Buttons */}
        <div className="hidden sm:flex items-center justify-end gap-3 flex-shrink-0 absolute right-4 top-1/2 -translate-y-1/2 w-[150px]">
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => {
                  setProfileOpen((prev) => !prev)
                  setSupportOpen(false)
                }}
                className="group relative inline-flex cursor-pointer rounded-full outline-offset-2 outline-blue-300/70 focus-visible:outline-2"
                aria-label="Open profile menu"
              >
                {user?.role === 'organizer' && unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border border-white/40">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
                <Avatar className="h-9 w-9 border-white/30 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                  <AvatarImage src={user.avatar || ''} alt={user.name || 'Profile avatar'} />
                  <AvatarFallback style={{ background: user.avatarBackdrop || 'linear-gradient(135deg, #ea7a32 0%, #f5a960 100%)' }}>
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-3 w-60 rounded-2xl shadow-2xl overflow-visible z-50"
                  style={{
                    background: 'rgba(22, 27, 39, 0.96)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(154, 177, 226, 0.24)',
                  }}
                >
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-white/10">
                    <Avatar className="h-10 w-10 border-white/25">
                      <AvatarImage src={user.avatar || ''} alt={user.name || 'Profile avatar'} />
                      <AvatarFallback style={{ background: user.avatarBackdrop || 'linear-gradient(135deg, #ea7a32 0%, #f5a960 100%)' }}>
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-white/60 text-xs truncate">{user.email || 'user@hunchmate.com'}</p>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <Link
                      to={getDashboardPath()}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                      onClick={closeProfileMenu}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <LayoutDashboard size={16} /> {getDashboardLabel()}
                      </span>
                      {user?.role === 'organizer' && unreadCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </Link>

                    <Link
                      to="/bookmarks"
                      className="flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                      onClick={closeProfileMenu}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Bookmark size={16} /> Bookmarks
                      </span>
                    </Link>

                    {user?.role === 'organizer' ? (
                      <Link
                        to="/organizer/dashboard"
                        className="flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        onClick={closeProfileMenu}
                      >
                        <span className="inline-flex items-center gap-2.5"><Bell size={16} /> Notifications</span>
                        <span className="text-white/55 text-xs">{unreadCount} unread</span>
                      </Link>
                    ) : null}

                    {user?.role === 'admin' ? (
                      <>
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                          onClick={closeProfileMenu}
                        >
                          <span className="inline-flex items-center gap-2.5"><Shield size={16} /> Admin Control</span>
                          <span className="text-white/55 text-xs">secure</span>
                        </Link>
                        <Link
                          to="/admin/complaints"
                          className="flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                          onClick={closeProfileMenu}
                        >
                          <span className="inline-flex items-center gap-2.5"><Bell size={16} /> Complaints</span>
                          <span className="text-white/55 text-xs">tickets</span>
                        </Link>
                      </>
                    ) : null}

                    <div className="my-1 border-t border-white/10" />

                    <div className="relative">
                      <button
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        onClick={() => setSupportOpen((prev) => !prev)}
                        type="button"
                      >
                        <span className="inline-flex items-center gap-2.5"><LifeBuoy size={16} /> Support</span>
                        <ChevronRight size={14} className={`${supportOpen ? 'rotate-90' : ''} transition-transform`} />
                      </button>

                      {supportOpen && (
                        <div
                          className="absolute left-full top-0 ml-2 w-44 rounded-xl overflow-hidden shadow-2xl"
                          style={{
                            background: 'rgba(22, 27, 39, 0.98)',
                            border: '1px solid rgba(154, 177, 226, 0.24)',
                            backdropFilter: 'blur(20px)',
                          }}
                        >
                          <Link
                            to="/help-center"
                            className="w-full px-3 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center gap-2"
                            onClick={closeProfileMenu}
                          >
                            <LifeBuoy size={14} /> Help center
                          </Link>
                          <Link
                            to="/help-center"
                            className="w-full px-3 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center gap-2"
                            onClick={closeProfileMenu}
                          >
                            <MessageCircle size={14} /> Contact support
                          </Link>
                          <Link
                            to="/help-center"
                            className="w-full px-3 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center gap-2"
                            onClick={closeProfileMenu}
                          >
                            <Send size={14} /> Send feedback
                          </Link>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="px-3 py-3 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
                      type="button"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/signup"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="sm:hidden text-white/80 hover:text-white p-1 flex-shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
          {mobileOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="sm:hidden absolute top-[4.75rem] left-6 right-6 rounded-2xl overflow-hidden pointer-events-auto"
            style={{
              background: 'rgba(35,35,40,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex flex-col px-6 py-4 gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-white/80 hover:text-white text-base transition-colors font-medium"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {user && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <Link
                    to={getDashboardPath()}
                    className="text-white/80 hover:text-white text-base transition-colors font-medium flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LayoutDashboard size={16} /> {getDashboardLabel()}
                  </Link>
                  <Link
                    to="/bookmarks"
                    className="text-white/80 hover:text-white text-base transition-colors font-medium flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Bookmark size={16} /> Bookmarks
                  </Link>
                  {user?.role === 'organizer' ? (
                    <Link
                      to="/organizer/dashboard"
                      className="text-white/80 hover:text-white text-base transition-colors font-medium flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Bell size={16} /> Notifications ({unreadCount})
                    </Link>
                  ) : null}
                  {user?.role === 'admin' ? (
                    <Link
                      to="/admin/dashboard"
                      className="text-white/80 hover:text-white text-base transition-colors font-medium flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Shield size={16} /> Admin Control
                    </Link>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 text-base transition-colors font-medium flex items-center gap-2"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              )}
              
              {!user && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <Link
                    to="/signup"
                    className="text-white/80 hover:text-white text-base transition-colors font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
