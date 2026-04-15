import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Zap, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
    { label: 'Programs', path: '/events' },
    { label: 'Offerings', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (user?.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  // Determine if navbar is in "transparent" mode (floating completely seamlessly over the page background)
  const isTransparent = !scrolled;

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${isTransparent ? 'navbar--transparent' : ''}`}>
      <div className="navbar__container container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon-text">⚡</span>
          <span className="navbar__logo-text">
            Hunch<span className="navbar__logo-accent">mate</span>
          </span>
        </Link>

        {/* Desktop Nav — centered */}
        <div className="navbar__links">
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
        <div className="navbar__actions">
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
                <Plus size={14} /> Sign Up
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
