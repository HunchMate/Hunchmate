import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Star,
  Trophy,
  Lightbulb,
  Target,
  Briefcase,
  Users,
  QrCode,
  BarChart3,
  Search,
  ClipboardCheck,
  FolderKanban,
  Award,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import EventCard from '../components/events/EventCard';
import Badge from '../components/ui/Badge';
import AnimatedIcon from '../components/ui/AnimatedIcon';
import { LOTTIE_URLS } from '../utils/lotties';
import BentoGridThirdDemo from '../components/bento-grid-demo-3';
import './Home.css';

export default function Home() {
  const { events } = useEvents();
  const featuredEvents = events.slice(0, 3);

  const trustedOrganizations = [
    'NASSCOM', 'Google', 'Microsoft', 'Amazon', 'Meta',
    'Adobe', 'IBM', 'Intel', 'Apple', 'Oracle',
    'Infosys', 'TCS', 'HCL', 'Accenture', 'Wipro',
  ];

  const organizerFeatures = [
    {
      icon: FolderKanban,
      title: 'End-to-End Program Management',
      description: 'Plan, launch, monitor, and close events from a single workflow.',
    },
    {
      icon: ClipboardCheck,
      title: 'Easy Event Setup',
      description: 'Create event pages, schedules, forms, and rules in minutes.',
    },
    {
      icon: QrCode,
      title: 'QR-Based Entry Validation',
      description: 'Fast check-in and attendance verification with secure QR scans.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track registrations, engagement, and outcomes with clear dashboards.',
    },
  ];

  const participantFeatures = [
    {
      icon: Search,
      title: 'Discover by Interest',
      description: 'Find hackathons and challenges that match your goals and skills.',
    },
    {
      icon: Trophy,
      title: 'Easy Registration',
      description: 'Apply quickly, manage participation, and stay updated in one place.',
    },
    {
      icon: Briefcase,
      title: 'All-in-One Portfolio',
      description: 'Build proof of work with your projects, badges, and event history.',
    },
    {
      icon: Award,
      title: 'Showcase & Recognition',
      description: 'Earn verifiable credentials and highlight achievements confidently.',
    },
  ];

  const categories = [
    { name: 'Hackathons', count: '150+', icon: Trophy },
    { name: 'Innovation', count: '80+', icon: Lightbulb },
    { name: 'Competitions', count: '120+', icon: Target },
    { name: 'Programs', count: '60+', icon: Briefcase },
    { name: 'Opportunities', count: '200+', icon: Users },
  ];

  const partners = [
    'NASSCOM', 'TechForge', 'InnovateIndia', 'DataWave', 'PixelLabs',
    'MechMinds', 'CodeNation', 'StartupArena', 'NASSCOM', 'TechForge',
    'InnovateIndia', 'DataWave', 'PixelLabs', 'MechMinds', 'CodeNation', 'StartupArena',
  ];

  const testimonials = [
    {
      text: 'We discovered and hired the right talent through hackathons powered by Hunchmate. The quality of candidates was exceptional.',
      name: 'Ravi Kumar', role: 'CTO, TechForge Academy', initials: 'RK', stars: 5,
    },
    {
      text: 'Their innovative approaches brought our developer marketing vision to life. Working with Hunchmate has been a game-changer for engagement.',
      name: 'Priya Sharma', role: 'VP Engineering, DataWave', initials: 'PS', stars: 5,
    },
    {
      text: 'Our internal hackathon ran seamlessly and our teams stayed engaged throughout. Hunchmate\'s support as an organizing partner was outstanding.',
      name: 'Ankit Patel', role: 'Innovation Lead, MechMinds', initials: 'AP', stars: 5,
    },
  ];

  return (
    <div className="home-page">
      {/* ── Hero Section ── */}
      <section className="home-hero">
        <div className="home-hero__grid-overlay" />
        <div className="container home-hero__content">
          <h1 className="home-hero__title">
            Turn Your Hunches Into
            <em>Real Benchmarks.</em>
          </h1>

          <p className="home-hero__subtitle">
            An end-to-end platform to own hackathons, manage challenges, and build real-world solutions
          </p>

          <div className="home-hero__ctas">
            <Link to="/signup?role=organizer" className="home-hero__cta-primary">
              For Organizers <ArrowRight size={18} />
            </Link>
            <Link to="/events" className="home-hero__cta-secondary">
              For Participants <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="home-trust">
        <div className="container">
          <h2 className="home-trust__title">Trusted by leading Organizations & Institutions</h2>
          <div className="home-trust__logos">
            {trustedOrganizations.map((org, i) => (
              <div key={i} className="home-trust__logo-item">
                {org}
              </div>
            ))}
            <div className="home-trust__logo-more">→</div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="home-features">
        <div className="container">
          <div className="home-features__header">
            <h2 className="home-features__title">
              Platform Features That Stand Out
            </h2>
            <p className="home-features__subtitle">Two focused experiences built for organizers and participants.</p>
          </div>

          <div className="home-features__split">
            <div className="home-features__column home-features__column--organizer">
              <h3 className="home-features__column-title">For Organizers</h3>
              <div className="home-features__grid">
                {organizerFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={feature.title} className="home-features__card">
                      <div className="home-features__icon">
                        <IconComponent size={22} />
                      </div>
                      <h4 className="home-features__card-title">{feature.title}</h4>
                      <p className="home-features__card-description">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="home-features__column home-features__column--participant">
              <h3 className="home-features__column-title">For Participants</h3>
              <div className="home-features__grid">
                {participantFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={feature.title} className="home-features__card">
                      <div className="home-features__icon">
                        <IconComponent size={22} />
                      </div>
                      <h4 className="home-features__card-title">{feature.title}</h4>
                      <p className="home-features__card-description">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Programs ── */}
      <section className="home-featured">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Programs</h2>
            <p className="section-subtitle">Discover the latest hackathons, challenges, and workshops curated for innovators.</p>
          </div>
          <div className="home-featured__grid">
            {featuredEvents.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
          <div className="home-featured__more">
            <Link to="/events" className="home-hero__cta-primary" style={{ background: 'var(--color-accent)', color: 'white' }}>
              View All Programs <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories Section ── */}
      <section className="home-categories">
        <div className="container">
          <h2 className="home-categories__title">5-Categories / Format</h2>
          <div className="home-categories__grid">
            {categories.map((cat, i) => {
              const IconComponent = cat.icon;
              return (
                <div key={i} className="home-categories__item">
                  <div className="home-categories__icon">
                    <IconComponent size={24} />
                  </div>
                  <h3>{cat.name}</h3>
                  <p>{cat.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── Delivered Impact ── */}
      <section className="home-stats">
        <div className="home-stats__header">
          <h2 className="home-stats__title">Delivered Impact</h2>
          <p className="home-stats__subtitle">Every program is designed to create outcomes that matter</p>
        </div>
        <div className="home-stats__grid">
          {[
            { value: '50,000+', label: 'Active Innovators across the ecosystem' },
            { value: '250+', label: 'Enterprise hackathons and programs powered' },
            { value: '35,000+', label: 'Verified credentials issued to participants' },
            { value: '100%', label: 'Skill validated talent discovery pipeline' },
          ].map((stat, i) => (
            <div key={i} className="home-stats__item">
              <div className="home-stats__value">{stat.value}</div>
              <div className="home-stats__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="home-testimonials">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Trusted by Innovators</h2>
            <p className="section-subtitle">Hear from enterprises who have partnered with us for hackathons, hiring, and innovation challenges that drive real impact.</p>
          </div>
          <div className="home-testimonials__grid">
            {testimonials.map((t, i) => (
              <div key={i} className="home-testimonial">
                <div className="home-testimonial__quote">❝</div>
                <div className="home-testimonial__stars">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={14} fill="#F59E0B" stroke="#F59E0B" />
                  ))}
                </div>
                <p className="home-testimonial__text">{t.text}</p>
                <div className="home-testimonial__author">
                  <div className="home-testimonial__avatar">{t.initials}</div>
                  <div>
                    <div className="home-testimonial__name">{t.name}</div>
                    <div className="home-testimonial__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="home-cta">
        <div className="container">
          <div className="home-cta__banner">
            <h2 className="home-cta__title">Innovation Leaders Execute Faster</h2>
            <p className="home-cta__subtitle">Break through complexity and turn priorities into measurable outcomes</p>
            <Link to="/signup" className="home-cta__btn">
              Book a Call <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
