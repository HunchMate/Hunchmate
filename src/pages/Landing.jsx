import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import GrainyGradient from '../components/GrainyGradient';
import FeaturesSection from '../components/FeaturesSection';
import LogoLoop from '../components/LogoLoop';
import StaggeredMenu from '../components/StaggeredMenu';
import hunchmateLogo from '../../HUNCHMATE - Logo Pack (2).png';

const DUMMY_LOGOS = [
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">ACME CORP</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">GLOBEX</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">SOYLENT CORP</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">INITECH</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">UMBRELLA</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">MASSIVE DYNAMIC</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">STARK IND</span> },
  { node: <span className="font-bold text-lg text-white/60 font-sans tracking-wide">WAYNE ENT</span> },
];

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onMotionChange = (event) => setPrefersReducedMotion(event.matches);

    window.addEventListener('resize', onResize, { passive: true });
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      window.removeEventListener('resize', onResize);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  useEffect(() => {
    let ticking = false;
    let rafId = null;

    const onScroll = () => {
      if (!ticking) {
        rafId = window.requestAnimationFrame(() => {
          setScrollY(window.scrollY || 0);
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Disable parallax on mobile to improve scroll performance
  const heroParallax = isMobile || prefersReducedMotion ? 0 : Math.min(scrollY * 0.24, 150);
  const logoParallax = isMobile || prefersReducedMotion ? 0 : Math.min(scrollY * 0.14, 100);
  const featuresParallax = isMobile || prefersReducedMotion ? 0 : Math.min(scrollY * 0.08, 64);

  const mobileMenuItems = [
    { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
    { label: 'Explore Events', ariaLabel: 'Explore all events', link: '/events' },
    { label: 'Host Event', ariaLabel: 'Create or host an event', link: '/host-event' },
    { label: 'Contact', ariaLabel: 'Open contact page', link: '/contact' },
    { label: 'Sign In', ariaLabel: 'Go to sign in page', link: '/login' },
  ];

  const mobileSocialItems = [
    { label: 'Instagram', link: 'https://instagram.com' },
    { label: 'LinkedIn', link: 'https://linkedin.com' },
  ];

  return (
    <>
      {/* Disable expensive WebGL gradient on mobile and for reduced-motion users */}
      {!isMobile && !prefersReducedMotion ? <GrainyGradient /> : <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-500 via-purple-600 to-blue-600" />}
      {isMobile ? (
        <StaggeredMenu
          position="right"
          items={mobileMenuItems}
          socialItems={mobileSocialItems}
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
      ) : null}
      <div className="relative z-10 w-full overflow-hidden">
        <div
          className="min-h-screen flex flex-col justify-center"
          style={{
            transform: `translate3d(0, ${heroParallax}px, 0)`,
            willChange: 'transform',
          }}
        >
          {!isMobile ? <Navbar /> : null}
          <Hero />
        </div>
        <div
          className="w-full py-12 border-y border-white/10"
          style={{
            background: 'rgba(255,255,255,0.03)',
            transform: `translate3d(0, ${logoParallax}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-white/40" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Trusted by innovative teams worldwide
            </p>
          </div>
          <LogoLoop logos={DUMMY_LOGOS} speed={40} gap={64} pauseOnHover />
        </div>
        <div
          style={{
            transform: `translate3d(0, ${featuresParallax}px, 0)`,
            willChange: 'transform',
          }}
        >
          <FeaturesSection />
        </div>
      </div>
    </>
  );
}
