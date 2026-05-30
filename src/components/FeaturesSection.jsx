import { motion as Motion } from 'motion/react'
import { BarChart3, FolderKanban, QrCode, Search, Trophy, Award, Briefcase } from 'lucide-react'
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

      {/* White Background Wrapper */}
      <div className="relative w-full overflow-visible bg-white pt-10 pb-24 border-t border-white/5">

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

        {/* ── Platform Features Section ── */}
        <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">

          {/* Section header */}
          <Motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span
              className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-indigo-500 mb-3"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Everything you need
            </span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Platform Features
            </h2>
            <p
              className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
            >
              Two powerful experiences — one for those who build programs, one for those who compete in them.
            </p>
          </Motion.div>

          {/* Two-column feature panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Organisers Panel */}
            <Motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-3xl p-8 flex flex-col gap-7"
              style={{
                background: 'linear-gradient(160deg, #fffbf5 0%, #fff7ed 100%)',
                border: '1px solid #fde8c8',
              }}
            >
              {/* Panel header */}
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6A00, #F59E0B)' }}
                >
                  <FolderKanban size={20} color="white" strokeWidth={2} />
                </div>
                <div>
                  <p
                    className="text-xs font-bold tracking-widest uppercase text-amber-500"
                    style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    For Organisers
                  </p>
                  <h3
                    className="text-xl font-bold text-slate-800"
                    style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    Run events end-to-end
                  </h3>
                </div>
              </div>

              <div className="h-px bg-amber-100" />

              {/* Feature rows */}
              <div className="flex flex-col gap-5">
                {organizerFeatures.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <Motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.07 }}
                      className="flex gap-4 items-start group"
                    >
                      <div
                        className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${f.color}22, ${f.color}44)`,
                          border: `1px solid ${f.color}33`,
                        }}
                      >
                        <Icon size={18} style={{ color: f.color }} strokeWidth={2} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-bold text-slate-800 leading-snug"
                          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                        >
                          {f.title}
                        </p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                      </div>
                    </Motion.div>
                  );
                })}
              </div>
            </Motion.div>

            {/* Participants Panel */}
            <Motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-3xl p-8 flex flex-col gap-7"
              style={{
                background: 'linear-gradient(160deg, #f8f9ff 0%, #eef2ff 100%)',
                border: '1px solid #dde3f9',
              }}
            >
              {/* Panel header */}
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                >
                  <Trophy size={20} color="white" strokeWidth={2} />
                </div>
                <div>
                  <p
                    className="text-xs font-bold tracking-widest uppercase text-indigo-500"
                    style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    For Participants
                  </p>
                  <h3
                    className="text-xl font-bold text-slate-800"
                    style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    Compete, grow, get recognised
                  </h3>
                </div>
              </div>

              <div className="h-px bg-indigo-100" />

              {/* Feature rows */}
              <div className="flex flex-col gap-5">
                {participantFeatures.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <Motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.07 }}
                      className="flex gap-4 items-start group"
                    >
                      <div
                        className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${f.color}22, ${f.color}44)`,
                          border: `1px solid ${f.color}33`,
                        }}
                      >
                        <Icon size={18} style={{ color: f.color }} strokeWidth={2} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-bold text-slate-800 leading-snug"
                          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                        >
                          {f.title}
                        </p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                      </div>
                    </Motion.div>
                  );
                })}
              </div>
            </Motion.div>

          </div>

          {/* Stats strip */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { value: '50,000+', label: 'Active Innovators' },
              { value: '250+', label: 'Programs Powered' },
              { value: '35,000+', label: 'Credentials Issued' },
              { value: '100%', label: 'Skill-Validated Hiring' },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl px-5 py-4 text-center"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf4' }}
              >
                <div
                  className="text-2xl font-extrabold text-slate-800"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </Motion.div>

        </div>
      </div>
    </section>
  )
}
