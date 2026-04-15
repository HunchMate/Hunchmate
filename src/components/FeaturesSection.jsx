import { motion as Motion } from 'motion/react'
// Updated: force HMR reload v2
import { Lightbulb, Search, Building2, Trophy, QrCode, Award } from 'lucide-react'

const features = [
  {
    icon: Lightbulb,
    title: 'Innovation Challenge',
    desc: 'Launch focused corporate challenges and hackathons to solve real business problems and unlock breakthrough ideas.',
    color: '#FF3300',
  },
  {
    icon: Search,
    title: 'Startup Scouting',
    desc: 'Identify high-potential startups aligned to your business goals and collaborate on cutting-edge technologies.',
    color: '#3B82F6',
  },
  {
    icon: Building2,
    title: 'Internal Hackathon',
    desc: 'Activate your internal workforce to co-create solutions, generate fresh ideas, and accelerate transformation.',
    color: '#8B5CF6',
  },
  {
    icon: Trophy,
    title: 'Hiring Hackathon',
    desc: 'Discover exceptional talent through real-world problem solving and performance-driven recruitment programs.',
    color: '#F59E0B',
  },
  {
    icon: QrCode,
    title: 'QR-Based Entry',
    desc: 'Instant QR scanning verifies and tracks attendance on event day. No manual check-ins, no bottlenecks.',
    color: '#10B981',
  },
  {
    icon: Award,
    title: 'Verified Credentials',
    desc: 'Post-event, digital credentials are generated with unique IDs — portable, verifiable, and tamper-proof.',
    color: '#EC4899',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
}

export default function FeaturesSection() {
  return (
    <section id="features-section" className="relative">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-8 text-center">
        <Motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold tracking-widest uppercase mb-4"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.5)' }}
        >
          Innovation for Enterprises
        </Motion.p>

        <Motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-semibold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight max-w-2xl mx-auto"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.02em' }}
        >
          Customized innovation with a global ecosystem
        </Motion.h2>

          <Motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg max-w-xl mx-auto mt-5 leading-relaxed"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.55)' }}
        >
          Hunchmate enables enterprises to launch hackathons, source talent, and drive real outcomes — all from one platform.
          </Motion.p>
      </div>

      {/* Feature Cards Grid — glassmorphism on gradient */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Motion.div
                key={feature.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="feature-card group relative rounded-2xl p-8 transition-all duration-300 cursor-default hover:scale-[1.02]"
                style={{
                  background: 'rgba(35,35,40,0.6)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {/* Icon */}
                <div
                  className="feature-card__icon-wrap w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}25` }}
                >
                  <Icon
                    size={22}
                    strokeWidth={1.8}
                    style={{ color: feature.color }}
                  />
                </div>

                {/* Title */}
                <h3
                  className="feature-card__title font-medium text-lg text-white mb-2 transition-colors duration-300"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.01em' }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className="feature-card__desc text-sm leading-relaxed transition-colors duration-300"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.5)' }}
                >
                  {feature.desc}
                </p>

                {/* Hover accent line */}
                <div
                  className="absolute bottom-0 left-8 right-8 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${feature.color}, transparent)` }}
                />
              </Motion.div>
            )
          })}
        </div>
      </div>

      {/* Impact Stats */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { value: '50,000+', label: 'Active Innovators across the ecosystem' },
            { value: '250+', label: 'Enterprise hackathons and programs powered' },
            { value: '35,000+', label: 'Verified credentials issued to participants' },
            { value: '100%', label: 'Skill validated talent discovery pipeline' },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-2xl"
              style={{
                background: 'rgba(35,35,40,0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="text-2xl sm:text-3xl font-bold text-white mb-1"
                style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs sm:text-sm leading-snug"
                style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.45)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </Motion.div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-7xl mx-auto px-6 pb-24 text-center">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl p-12 sm:p-16 relative overflow-hidden"
          style={{
            background: 'rgba(35,35,40,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#e8813b]/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#1e3a8a]/20 rounded-full blur-3xl" />

          <h3
            className="font-semibold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight relative z-10 max-w-lg mx-auto"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.02em' }}
          >
            Innovation Leaders Execute Faster
          </h3>
          <p
            className="mt-4 text-base sm:text-lg max-w-md mx-auto relative z-10"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.5)' }}
          >
            Break through complexity and turn priorities into measurable outcomes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 relative z-10">
            <a
              id="cta-bottom-explore"
              href="#events"
              className="inline-flex items-center gap-2 font-medium px-8 py-3.5 rounded-full hover:scale-105 transition-transform duration-200"
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: '#1a1a1a',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              Explore Events
            </a>
            <a
              id="cta-bottom-call"
              href="#contact"
              className="inline-flex items-center gap-2 hover:text-white font-medium px-6 py-3.5 transition-colors duration-200"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.6)' }}
            >
              Book a Call →
            </a>
          </div>
        </Motion.div>
      </div>
    </section>
  )
}
