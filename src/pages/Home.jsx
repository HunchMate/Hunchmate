import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Star, Zap } from 'lucide-react';
import { useEvents } from '../context/EventContext';
import EventCard from '../components/events/EventCard';
import Badge from '../components/ui/Badge';
import AnimatedIcon from '../components/ui/AnimatedIcon';
import { LOTTIE_URLS } from '../utils/lotties';
import BentoGridThirdDemo from '../components/bento-grid-demo-3';
import './Home.css';

export default function Home() {
  const { events } = useEvents();
  const featuredEvents = events.slice(0, 4);

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
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero__grid-overlay" />
        <div className="container home-hero__content">
          <h1 className="home-hero__title">
            Accelerate Innovation<br />
            From <em>Vision</em> to <em>Value</em>
          </h1>

          <p className="home-hero__subtitle">
            A Global end to end Platform for Enterprise <strong>Hackathons</strong>, <strong>Hiring Challenges</strong> and <strong>Innovation Programs</strong>
          </p>

          <div className="home-hero__ctas">
            <Link to="/events" className="home-hero__cta-primary">
              For Innovators <ArrowRight size={18} />
            </Link>
            <Link to="/signup" className="home-hero__cta-secondary">
              For Corporates <ArrowUpRight size={18} />
            </Link>
          </div>

          <div className="home-hero__social-proof">
            <div className="home-hero__avatars">
              {['A', 'P', 'R', 'K', 'S'].map((char, i) => (
                <div key={i} className="home-hero__avatar">{char}</div>
              ))}
            </div>
            <span className="home-hero__social-text"><strong>50,000+</strong> innovators already shaping the future</span>
          </div>
        </div>
      </section>

      {/* ── Logo Marquee ── */}
      <section className="home-marquee">
        <div className="home-marquee__track">
          {partners.map((name, i) => (
            <span key={i} className="home-marquee__item">{name}</span>
          ))}
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

      {/* ── How It Works ── */}
      <section className="home-how">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Innovation for Enterprises</h2>
            <p className="section-subtitle">Hunchmate enables customized innovation with a global ecosystem of builders</p>
          </div>
          <div className="home-how__grid">
            {[
              { num: '01', lottie: LOTTIE_URLS.how_idea, emoji: '💡', title: 'Innovation Challenge', desc: 'Launch focused corporate challenges and hackathons to solve real business problems and unlock breakthrough ideas.' },
              { num: '02', lottie: LOTTIE_URLS.how_startup, emoji: '🔍', title: 'Startup Scouting', desc: 'Identify high-potential startups aligned to your business goals and collaborate on cutting-edge technologies.' },
              { num: '03', lottie: LOTTIE_URLS.how_hackathon, emoji: '🏗️', title: 'Internal Hackathon', desc: 'Activate your internal workforce to co-create solutions, generate fresh ideas, and accelerate transformation.' },
              { num: '04', lottie: LOTTIE_URLS.how_hiring, emoji: '🏆', title: 'Hiring Hackathon', desc: 'Discover exceptional talent through real-world problem solving and performance-driven recruitment programs.' },
            ].map((step, i) => (
              <div key={i} className="home-how__step">
                <div className="home-how__icon-wrap">
                  <AnimatedIcon url={step.lottie} size="sm" />
                </div>
                <div className="home-how__step-num">{step.num}</div>
                <h3 className="home-how__step-title">{step.title}</h3>
                <p className="home-how__step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="home-featured">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">AI-Powered Experiences</h2>
            <p className="section-subtitle">A Bento style layout inspired by your reference, adapted to this project.</p>
          </div>
          <BentoGridThirdDemo />
        </div>
      </section>

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
