import { Link } from 'react-router-dom';
import { X, Link2, Globe, MessageCircle, Mail, Zap } from 'lucide-react';
import './Footer.css';
import hunchmateLogo from '../../../HUNCHMATE - Logo Pack (2).png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { label: 'Browse Events', path: '/events' },
    { label: 'Host an Event', path: '/signup' },
    { label: 'How it Works', path: '/' },
  ];

  const companyLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'Help Center', path: '/help' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ];

  const socials = [
    { href: 'https://x.com', label: 'X / Twitter', icon: <X size={17} /> },
    { href: 'https://linkedin.com', label: 'LinkedIn', icon: <Link2 size={17} /> },
    { href: 'https://hunchmate.com', label: 'Community', icon: <MessageCircle size={17} /> },
    { href: 'https://hunchmate.com', label: 'Website', icon: <Globe size={17} /> },
    { href: 'mailto:support@hunchmate.com', label: 'Email', icon: <Mail size={17} /> },
  ];

  return (
    <footer className="site-footer" aria-label="Site footer">
      {/* Glow accent bar */}
      <div className="site-footer__glow-bar" />

      <div className="site-footer__inner container">
        {/* Top section: brand + columns */}
        <div className="site-footer__top">
          {/* Brand column */}
          <div className="site-footer__brand-col">
            <Link to="/" className="site-footer__brand-logo" aria-label="Hunchmate Home">
              <img src={hunchmateLogo} alt="HunchMate" />
            </Link>
            <p className="site-footer__tagline">
              Discover and attend <br />
              the best hackathons &amp; tech events — all in one place.
            </p>
            {/* Social icons */}
            <div className="site-footer__socials" aria-label="Social links">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('mailto') ? undefined : '_blank'}
                  rel={s.href.startsWith('mailto') ? undefined : 'noreferrer'}
                  className="site-footer__social"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="site-footer__links-grid">
            <div className="site-footer__link-col">
              <h3 className="site-footer__col-heading">Product</h3>
              <ul>
                {productLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.path} className="site-footer__nav-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="site-footer__link-col">
              <h3 className="site-footer__col-heading">Company</h3>
              <ul>
                {companyLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.path} className="site-footer__nav-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="site-footer__link-col">
              <h3 className="site-footer__col-heading">Legal</h3>
              <ul>
                {legalLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.path} className="site-footer__nav-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="site-footer__divider" />

        {/* Bottom bar */}
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © {currentYear} Hunchmate Labs. All rights reserved.
          </p>
          <p className="site-footer__made-with">
            <Zap size={13} className="site-footer__zap" />
            Built for the builder community
          </p>
        </div>
      </div>
    </footer>
  );
}
