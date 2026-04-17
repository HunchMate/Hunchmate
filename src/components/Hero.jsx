import { motion as Motion } from 'motion/react'
import { useMemo } from 'react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.12 * i,
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
}

export default function Hero() {
  // Detect mobile and motion preferences
  const isMobile = useMemo(() => window.innerWidth < 768, [])
  const prefersReducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  
  // Skip animations on mobile for better performance
  const shouldAnimate = !isMobile && !prefersReducedMotion

  return (
    <section
      id="hero-section"
      className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-20 lg:pt-20 lg:pb-24"
    >
      {/* Badge */}
      {shouldAnimate ? (
        <Motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'rgba(35,35,40,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-sm" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>⚡</span>
          <span
            className="text-white/80 text-sm font-medium"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Where Hunches Become Achievements
          </span>
        </Motion.div>
      ) : (
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'rgba(35,35,40,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-sm" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>⚡</span>
          <span
            className="text-white/80 text-sm font-medium"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Where Hunches Become Achievements
          </span>
        </div>
      )}

      {/* Headline */}
      {shouldAnimate ? (
        <Motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.15] max-w-2xl font-semibold"
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Turn your Hunches into Real <span style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.02em' }}>Benchmarks</span>
        </Motion.h1>
      ) : (
        <h1
          className="text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.15] max-w-2xl font-semibold"
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Turn your Hunches into Real <span style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.02em' }}>Benchmarks</span>
        </h1>
      )}

      {/* Subhead */}
      {shouldAnimate ? (
        <Motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-white/65 text-base sm:text-lg max-w-lg mt-6 leading-relaxed"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          An end-to-end platform to run Hackathons, Manage challenges and Build Real-World Solutions
        </Motion.p>
      ) : (
        <p
          className="text-white/65 text-base sm:text-lg max-w-lg mt-6 leading-relaxed"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          An end-to-end platform to run Hackathons, Manage challenges and Build Real-World Solutions
        </p>
      )}

      {/* Buttons */}
      {shouldAnimate ? (
        <Motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 mt-10"
        >
          <a
            id="cta-innovators"
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a1a1a',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            For Organiser
          </a>

          <a
            id="cta-corporates"
            href="/events"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: 'rgba(35,35,40,0.6)',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            For Participant
          </a>
        </Motion.div>
      ) : (
        <div className="flex items-center gap-3 mt-10">
          <a
            id="cta-innovators"
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a1a1a',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            For Organiser
          </a>

          <a
            id="cta-corporates"
            href="/events"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: 'rgba(35,35,40,0.6)',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            For Participant
          </a>
        </div>
      )}

      {/* Social Proof */}
      {shouldAnimate ? (
        <Motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 mt-12"
        >
          <div className="flex -space-x-2">
            {['A', 'P', 'R', 'K', 'S'].map((char, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  background: 'rgba(35,35,40,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {char}
              </div>
            ))}
          </div>
          <span
            className="text-white/50 text-sm"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            <strong className="text-white/75">50,000+</strong> innovators already shaping the future
          </span>
        </Motion.div>
      ) : (
        <div className="flex items-center gap-3 mt-12">
          <div className="flex -space-x-2">
            {['A', 'P', 'R', 'K', 'S'].map((char, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  background: 'rgba(35,35,40,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {char}
              </div>
            ))}
          </div>
          <span
            className="text-white/50 text-sm"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            <strong className="text-white/75">50,000+</strong> innovators already shaping the future
          </span>
        </div>
      )}
    </section>
  )
}
