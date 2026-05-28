import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from '@/utils/router';
import { Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Zap, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import hunchmateLogo from '@/../HUNCHMATE - Logo Pack (2).png';
import './Navbar.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Explore Events', path: '/events' },
    { label: 'Host Event', path: '/host-event' },
    { label: 'Contact Us', path: '/contact' },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const getDashboardPath = () => {
    if (user?.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  // Determine if navbar is in "transparent" mode (floating completely seamlessly over the page background)
  const isTransparent = !scrolled;

  return (
    <nav
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${isTransparent ? 'navbar--transparent' : ''}`}
      style={{ paddingTop: '16px' }}
    >
      <div
        className="navbar__container container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          width: '100%',
        }}
      >
        <Link
          to="/"
          className="navbar__logo"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, overflow: 'hidden', borderRadius: '8px' }}
        >
          <img
            src={hunchmateLogo?.src || hunchmateLogo}
            alt="HunchMate"
            style={{ width: '228px', height: '56px', objectFit: 'cover', objectPosition: 'center 52%' }}
          />
        </Link>

        <div
          className="navbar__links"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flex: 1 }}
        >
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar__link ${location.pathname === link.path ? 'navbar__link--active' : ''}`}
              onClick={() => {
                setIsOpen(false);
                setProfileOpen(false);
              }}
            >
              {link.label}
              {link.hasChevron && <ChevronDown size={14} />}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="navbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {user ? (
            <div className="navbar__profile-wrapper">
              <button className="navbar__profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="navbar__avatar">{user.name?.charAt(0) || 'U'}</div>
                <span className="navbar__profile-name">{user.name?.split(' ')[0]}</span>
                <ChevronDown size={16} className={profileOpen ? 'rotate-180' : ''} />
              </button>
              {profileOpen && (
                <div className="navbar__dropdown">
                  <div className="navbar__dropdown-header">
                    <p className="navbar__dropdown-name">{user.name}</p>
                    <p className="navbar__dropdown-role">{user.role}</p>
                  </div>
                  <div className="navbar__dropdown-divider" />
                  <Link to={getDashboardPath()} className="navbar__dropdown-item">
                    <LayoutDashboard size={16} /> Mission Control
                  </Link>
                  <Link to="/profile" className="navbar__dropdown-item" onClick={() => setProfileOpen(false)}>
                    <User size={16} /> Profile
                  </Link>
                  <div className="navbar__dropdown-divider" />
                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar__auth-btns">
              <Link to="/signup" className="navbar__auth-outlined">
                <Plus size={14} /> Get Started
              </Link>
              <Link to="/login" className="navbar__auth-outlined">
                Sign In
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button className="navbar__mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar__mobile-link ${location.pathname === link.path ? 'navbar__mobile-link--active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={getDashboardPath()} className="navbar__mobile-link" onClick={() => setIsOpen(false)}>Mission Control</Link>
              <button className="navbar__mobile-link navbar__mobile-link--danger" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <div className="navbar__mobile-auth">
              <Link to="/login" className="navbar__auth-outlined" onClick={() => setIsOpen(false)}>Sign In</Link>
              <Link to="/signup" className="navbar__auth-outlined" onClick={() => setIsOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
