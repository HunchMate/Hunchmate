    import { useEffect, useState } from 'react';
    import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import GrainyGradient from '../components/GrainyGradient';
import FeaturesSection from '../components/FeaturesSection';
import LogoLoop from '../components/LogoLoop';

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

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || 0);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const heroParallax = Math.min(scrollY * 0.24, 150);
  const logoParallax = Math.min(scrollY * 0.14, 100);
  const featuresParallax = Math.min(scrollY * 0.08, 64);

  return (
    <>
      <GrainyGradient />
      <div className="relative z-10 w-full overflow-hidden">
        <div
          className="min-h-screen flex flex-col justify-center"
          style={{
            transform: `translate3d(0, ${heroParallax}px, 0)`,
            willChange: 'transform',
          }}
        >
          <Navbar />
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
