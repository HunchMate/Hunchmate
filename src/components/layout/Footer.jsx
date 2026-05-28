import { Link } from '@/utils/router';
import { IconBrandTwitter, IconBrandLinkedin, IconBrandGithub, IconBrandFacebook, IconBrandInstagram } from '@tabler/icons-react';
import './Footer.css';
import hunchmateLogo from '@/../HUNCHMATE - Logo Pack (2).png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Browse Events', path: '/events' },
    { label: 'Host an Event', path: '/signup' },
    { label: 'How it Works', path: '/' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy', path: '/privacy' },
    { label: 'Terms', path: '/terms' },
  ];

  const socials = [
    { href: 'https://twitter.com', icon: <IconBrandTwitter size={18} stroke={1.5} /> },
    { href: 'https://linkedin.com', icon: <IconBrandLinkedin size={18} stroke={1.5} /> },
    { href: 'https://github.com', icon: <IconBrandGithub size={18} stroke={1.5} /> },
    { href: 'https://facebook.com', icon: <IconBrandFacebook size={18} stroke={1.5} /> },
    { href: 'https://instagram.com', icon: <IconBrandInstagram size={18} stroke={1.5} /> },
  ];

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__inner container">
        
        {/* Top Centered Section */}
        <div className="site-footer__top-centered">
          <Link to="/" className="site-footer__brand" aria-label="Hunchmate Home">
            <img src={hunchmateLogo?.src || hunchmateLogo} alt="HunchMate" className="site-footer__logo-img" />
          </Link>

          <div className="site-footer__links-row">
            {links.map((link) => (
              <Link key={link.label} to={link.path} className="site-footer__nav-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Dotted Divider */}
        <div className="site-footer__divider" />

        {/* Bottom Section */}
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © Hunchmate Labs
          </p>

          <div className="site-footer__socials" aria-label="Social links">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="site-footer__social-icon"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
