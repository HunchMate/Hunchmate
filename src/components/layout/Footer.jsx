import { Link } from 'react-router-dom';
import { Layers, Globe, Link as LinkIcon, MessageCircle, Mail, ArrowUpRight } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const primaryLinks = [
    { label: 'Programs', path: '/events' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy', path: '/privacy' },
    { label: 'Terms', path: '/terms' },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div className="site-footer__top-line" />

        <div className="site-footer__brand-block">
          <Link to="/" className="site-footer__brand" aria-label="Hunchmate Home">
            <span className="site-footer__brand-icon">
              <Layers size={17} />
            </span>
            <span className="site-footer__brand-text">Hunchmate</span>
          </Link>

          <nav className="site-footer__nav" aria-label="Footer navigation">
            {primaryLinks.map((item) => (
              <Link key={item.label} to={item.path} className="site-footer__nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="site-footer__mid-line" />

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">© {currentYear} Hunchmate Labs</p>

          <div className="site-footer__socials" aria-label="Hunchmate social links">
            <a href="https://x.com" target="_blank" rel="noreferrer" className="site-footer__social" aria-label="X / Twitter">
              <ArrowUpRight size={20} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="site-footer__social" aria-label="LinkedIn">
              <LinkIcon size={20} />
            </a>
            <a href="https://hunchmate.com" target="_blank" rel="noreferrer" className="site-footer__social" aria-label="Community">
              <MessageCircle size={20} />
            </a>
            <a href="https://hunchmate.com" target="_blank" rel="noreferrer" className="site-footer__social" aria-label="Website">
              <Globe size={20} />
            </a>
            <a href="mailto:support@hunchmate.com" className="site-footer__social" aria-label="Email">
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
