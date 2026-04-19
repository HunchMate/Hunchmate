import { motion as Motion } from 'motion/react'
// Updated: force HMR reload v2
import { BarChart3, ClipboardCheck, FolderKanban, QrCode, Search, Trophy, Award, Briefcase } from 'lucide-react'
import LogoLoop from './LogoLoop';

const organizerFeatures = [
  {
    icon: FolderKanban,
    title: 'End-to-End Program Management',
    desc: 'Plan, launch, and manage entire programs seamlessly from a single dashboard.',
    color: '#FF6A00',
  },
  {
    icon: Award,
    title: 'Easy E-Credentials Generator',
    desc: 'Create and distribute certificates and credentials instantly with minimal effort.',
    color: '#F59E0B',
  },
  {
    icon: QrCode,
    title: 'QR-Based Entry Validation',
    desc: 'Enable fast, secure check-ins and participation tracking using QR-based access.',
    color: '#10B981',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    desc: 'Monitor engagement, performance, and outcomes with real-time data and reports.',
    color: '#60A5FA',
  },
]

const participantFeatures = [
  {
    icon: Search,
    title: 'Discover Opportunities of Your Interest',
    desc: 'Explore relevant hackathons, challenges, and programs tailored to your interests.',
    color: '#3B82F6',
  },
  {
    icon: Trophy,
    title: 'Easy Registration & Participation',
    desc: 'Join programs, form teams, and participate effortlessly in just a few steps.',
    color: '#8B5CF6',
  },
  {
    icon: Briefcase,
    title: 'Portfolio Building',
    desc: 'Create a structured portfolio of your projects, ideas, and achievements.',
    color: '#06B6D4',
  },
  {
    icon: Award,
    title: 'Showcase & Recognition',
    desc: 'Present your work, gain visibility, and earn recognition for your contributions.',
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

const ORGANIZATION_LOGOS = [
  { src: '/logos/organizations/9.png', alt: 'Lovable' },
  { src: '/logos/organizations/10.png', alt: 'Axibator' },
  { src: '/logos/organizations/11.png', alt: 'Wission Axis' },
  { src: '/logos/organizations/12.png', alt: 'Auth0' },
  { src: '/logos/organizations/13.png', alt: 'Maker Brains' },
  { src: '/logos/organizations/14.png', alt: 'Anedya' },
  { src: '/logos/organizations/15.png', alt: 'ABTechVille' },
  { src: '/logos/organizations/16.png', alt: 'Artway Design Studio' },
  { src: '/logos/organizations/17.png', alt: 'Notion' },
  { src: '/logos/organizations/18.png', alt: 'Intercom' },
];

const INSTITUTION_LOGOS = [
  { src: '/logos/institutions/8.png', alt: 'Geethanjali College' },
  { src: '/logos/institutions/7.png', alt: 'TKREC Hyderabad' },
  { src: '/logos/institutions/6.png', alt: 'Anurag University' },
  { src: '/logos/institutions/5.png', alt: 'Vaagdevi Colleges' },
  { src: '/logos/institutions/4.png', alt: 'JNTUH' },
  { src: '/logos/institutions/3.png', alt: 'Geenovate Foundation' },
];

// Custom render function: uses background-image div to bypass .logoloop__item img CSS constraints
const renderLogoItem = (item) => (
  <div
    style={{
      width: '190px',
      height: '90px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <div
      role="img"
      aria-label={item.alt ?? ''}
      style={{
        width: '180px',
        height: '80px',
        backgroundImage: `url(${item.src})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.9,
      }}
    />
  </div>
);

export default function FeaturesSection() {
  return (
    <section id="features-section" className="relative">


      {/* White Background Wrapper beginning behind the grids */}
      <div
        className="relative w-full overflow-visible bg-white pt-10 pb-24 border-t border-white/5"
      >
        {/* Soft edge masking the transition */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-white -mt-48 pointer-events-none" />

        {/* Organizations Logo Loop */}
        <div className="w-full pt-14 pb-10">
          <div className="text-center mb-8">
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase"
              style={{ color: '#94a3b8', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Trusted by Organizations
            </p>
          </div>
          <LogoLoop
            logos={ORGANIZATION_LOGOS}
            speed={30}
            gap={60}
            logoHeight={100}
            pauseOnHover
            fadeOut
            fadeOutColor="#ffffff"
            scaleOnHover
            renderItem={renderLogoItem}
            ariaLabel="Organization partner logos"
          />
        </div>

        {/* Divider */}
        <div className="max-w-5xl mx-auto border-b border-gray-100" />

        {/* Institutions Logo Loop */}
        <div className="w-full pt-10 pb-14">
          <div className="text-center mb-8">
            <p
              className="text-xs font-bold tracking-[0.25em] uppercase"
              style={{ color: '#94a3b8', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Partnered Institutions
            </p>
          </div>
          <LogoLoop
            logos={INSTITUTION_LOGOS}
            speed={30}
            direction="right"
            gap={60}
            logoHeight={100}
            pauseOnHover
            fadeOut
            fadeOutColor="#ffffff"
            scaleOnHover
            renderItem={renderLogoItem}
            ariaLabel="Institution partner logos"
          />
        </div>

        {/* Feature Cards Grid — split organizer and participant */}
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight uppercase" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '2px' }}>
              FEATURED PROGRAMS
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">

            {/* Organisers Column */}
            <div>
              <div className="mb-10 text-center">
                <h3 className="text-2xl font-extrabold tracking-widest text-slate-800 mb-3 uppercase">
                  For Organisers
                </h3>
                <div className="h-1 w-16 bg-amber-500 rounded-full mx-auto opacity-80" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {organizerFeatures.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <Motion.div
                      key={feature.title}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-50px' }}
                      className="group bg-white rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
                      style={{
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 24px 48px -12px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 text-white"
                          style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}99)` }}
                        >
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        <h3
                          className="font-bold text-base leading-tight uppercase tracking-wide transition-colors duration-300 group-hover:text-amber-500"
                          style={{ color: '#4B6BF5' }}
                        >
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        {feature.desc}
                      </p>
                    </Motion.div>
                  );
                })}
              </div>
            </div>

            {/* Participants Column */}
            <div>
              <div className="mb-10 text-center">
                <h3 className="text-2xl font-extrabold tracking-widest text-slate-800 mb-3 uppercase">
                  For Participants
                </h3>
                <div className="h-1 w-16 bg-indigo-500 rounded-full mx-auto opacity-80" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {participantFeatures.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <Motion.div
                      key={feature.title}
                      custom={i + organizerFeatures.length}
                      variants={cardVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-50px' }}
                      className="group bg-white rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
                      style={{
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 24px 48px -12px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 text-white"
                          style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}99)` }}
                        >
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        <h3
                          className="font-bold text-base leading-tight uppercase tracking-wide transition-colors duration-300 group-hover:text-indigo-500"
                          style={{ color: '#4B6BF5' }}
                        >
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        {feature.desc}
                      </p>
                    </Motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Impact Stats */}
        <div className="max-w-7xl mx-auto px-6 py-16 border-t border-gray-100 mt-8">
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
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs sm:text-sm leading-snug"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#64748b' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </Motion.div>
        </div>
      </div>
    </section>
  )
}
