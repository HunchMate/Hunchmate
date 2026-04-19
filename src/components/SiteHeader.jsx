import Navbar from './Navbar';
import StaggeredMenu from './StaggeredMenu';
import hunchmateLogo from '../../HUNCHMATE - Logo Pack (2).png';

import { useAuth } from '../context/AuthContext';

const BASE_MOBILE_MENU_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'Explore Events', ariaLabel: 'Explore all events', link: '/events' },
  { label: 'Host Event', ariaLabel: 'Create or host an event', link: '/host-event' },
  { label: 'Contact', ariaLabel: 'Open contact page', link: '/contact' },
];

const MOBILE_SOCIAL_ITEMS = [
  { label: 'Instagram', link: 'https://instagram.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' },
];

export default function SiteHeader() {
  const { user } = useAuth();
  
  const mobileMenuItems = [
    ...BASE_MOBILE_MENU_ITEMS,
    ...(user
      ? [{ label: 'Dashboard', ariaLabel: 'Go to dashboard', link: '/dashboard' }]
      : [{ label: 'Sign In', ariaLabel: 'Go to sign in page', link: '/login' }])
  ];

  return (
    <>
      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="md:hidden">
        <StaggeredMenu
          position="right"
          items={mobileMenuItems}
          socialItems={MOBILE_SOCIAL_ITEMS}
          displaySocials={true}
          displayItemNumbering={true}
          logoUrl={hunchmateLogo}
          menuButtonColor="#ffffff"
          openMenuButtonColor="#ffffff"
          changeMenuColorOnOpen={true}
          colors={['#B497CF', '#5227FF']}
          accentColor="#ff6b6b"
          isFixed={true}
          onMenuOpen={() => {}}
          onMenuClose={() => {}}
        />
      </div>
    </>
  );
}