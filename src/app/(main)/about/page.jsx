'use client';

import { Link } from '@/utils/router';
import { Zap, Target, Users, Shield, Globe, Award, ArrowRight, Heart, Lightbulb, Rocket } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import '@/vite-pages/About.css';

export default function About() {
  return (
    <div className="about-page">
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero__mesh" />
        <div className="container">
          <Badge variant="accent" size="md"><Rocket size={14} /> Our Story</Badge>
          <h1 className="about-hero__title">
            Engineered to <span className="text-gradient">Empower</span>
          </h1>
          <p className="about-hero__subtitle">
            Hunchmate was born from a simple belief — every talented individual deserves a platform to discover opportunities, prove their skills, and earn verifiable recognition.
          </p>
        </div>
      </section>

      {/* Mission, Vision */}
      <section className="about-mission section">
        <div className="container">
          <div className="about-mission__grid">
            <div className="about-mission__card glass">
              <Target size={28} className="about-mission__icon" />
              <h3>Our Mission</h3>
              <p>To democratize access to competitive events and create a transparent credentialing ecosystem that bridges talent with opportunity.</p>
            </div>
            <div className="about-mission__card glass">
              <Lightbulb size={28} className="about-mission__icon" />
              <h3>Our Vision</h3>
              <p>A world where every hackathon, workshop, and competition is accessible, verifiable, and leaves participants with lasting, portable credentials.</p>
            </div>
            <div className="about-mission__card glass">
              <Heart size={28} className="about-mission__icon" />
              <h3>Our Promise</h3>
              <p>We build with empathy, design for inclusivity, and engineer for scale. Every feature serves the participants and organizers who trust us.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-values section-lg">
        <div className="container">
          <div className="section-header">
            <Badge variant="gold" size="md">Core DNA</Badge>
            <h2 className="section-title">What Drives Us</h2>
          </div>
          <div className="about-values__grid">
            {[
              { icon: Users, title: 'Equality & Empathy', desc: 'Every participant matters equally. We design with care for diverse needs and backgrounds.', color: 'var(--color-accent)' },
              { icon: Globe, title: 'Diversity', desc: 'From college campuses to corporate boardrooms — our platform welcomes every kind of innovator.', color: 'var(--color-success)' },
              { icon: Zap, title: 'Innovation', desc: 'We don\'t just facilitate innovation — we embody it in every feature we build.', color: 'var(--color-gold)' },
              { icon: Shield, title: 'Trust & Verification', desc: 'QR-validated entries and unique credential IDs ensure every achievement is verifiable.', color: 'var(--color-purple)' },
            ].map((value, i) => (
              <div key={i} className="about-value glass">
                <div className="about-value__icon" style={{ background: `${value.color}15`, color: value.color }}>
                  <value.icon size={24} />
                </div>
                <h3>{value.title}</h3>
                <p>{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="about-how section-lg">
        <div className="container">
          <div className="section-header">
            <Badge variant="success" size="md">The Hunchmate Protocol</Badge>
            <h2 className="section-title">Simplified Event Lifecycle</h2>
          </div>
          <div className="about-lifecycle">
            {[
              { step: '01', title: 'Architect', desc: 'Organizers create and publish events with full customization.', emoji: '🏗️' },
              { step: '02', title: 'Mobilize', desc: 'Participants discover, register, and receive QR entry passes.', emoji: '⚡' },
              { step: '03', title: 'Validate', desc: 'On event day, QR scanning verifies and tracks attendance instantly.', emoji: '🔍' },
              { step: '04', title: 'Credential', desc: 'Post-event, digital credentials are generated and distributed.', emoji: '🏆' },
            ].map((item, i) => (
              <div key={i} className="about-lifecycle__step glass">
                <span className="about-lifecycle__emoji">{item.emoji}</span>
                <span className="about-lifecycle__num">{item.step}</span>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta section-lg">
        <div className="container">
          <div className="about-cta__banner glass">
            <h2>Ready to Shape the Future?</h2>
            <p>Whether you're a participant seeking challenges or an organizer building the next big event — we're here for you.</p>
            <div className="about-cta__btns">
              <Link to="/events"><Button variant="primary" size="lg" iconRight={ArrowRight}>Explore Events</Button></Link>
              <Link to="/signup"><Button variant="secondary" size="lg">Get Started</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
