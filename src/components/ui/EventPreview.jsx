import React from 'react';
import { ArrowLeft, Globe, Users, Share2, MapPin, Trophy } from 'lucide-react';
import '@/vite-pages/EventDetail.css';

export default function EventPreview({ form, judges = [], mentors = [], rounds = [], prizes = [], faqs = [] }) {
  const eventTypeLabel = form.category || form.mode || 'Hackathon';
  const venueLabel = form.venue || 'Venue to be announced';
  const posterSource = form.logo; // For preview, we'll use logo as poster if available
  
  return (
    <div className="event-detail event-detail--fusion" style={{ minHeight: 'auto', borderRadius: '12px', overflow: 'hidden' }}>
      <section className="event-detail__hero" style={{ padding: '2rem 1rem' }}>
        <div className="event-detail__hero-inner" style={{ width: '100%' }}>
          <div className="event-detail__hero-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="event-detail__hero-main" style={{ gridTemplateColumns: '1fr' }}>
              <div className="event-detail__hero-poster" style={{ minHeight: '180px' }}>
                {posterSource ? <img src={posterSource} alt={`${form.title} poster`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="event-detail__poster-fallback" />}
              </div>

               <div className="event-detail__hero-info">
                {form.logo && (
                  <img src={form.logo} alt={`${form.title} logo`} style={{ width: '64px', height: '64px', borderRadius: '12px', marginBottom: '0.75rem', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
                )}
                <h1 className="event-detail__title">{form.title || 'Event Title'}</h1>
                {form.tagline && (
                  <p className="event-detail__tagline" style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {form.tagline}
                  </p>
                )}
                <div className="event-detail__quick-pills">
                  <span>Type: {eventTypeLabel}</span>
                  <span>Mode: {form.mode}</span>
                  {form.visibility !== 'public' && <span style={{ background: 'rgba(239, 68, 68, 0.4)', borderColor: '#ef4444' }}>{form.visibility}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="event-detail__workspace" style={{ padding: '1.5rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Overview Tab Simulation */}
        <div className="event-detail__overview-shell" style={{ gridTemplateColumns: '1fr' }}>
          
          {form.description && (
            <article className="event-detail__panel event-detail__about">
              <header className="event-detail__about-head">
                <div>
                  <h2>About</h2>
                  <h3>Mission Brief</h3>
                </div>
                <span className="event-detail__mode-pill">{form.mode}</span>
              </header>
              <p>{form.description}</p>
              {form.themes && (
                 <div className="event-detail__tags" style={{ marginTop: '1rem' }}>
                   {form.themes.split(',').map((t, i) => t.trim() && <span key={i} className="event-detail__meta-chip" style={{ background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>{t.trim()}</span>)}
                 </div>
              )}
            </article>
          )}

          <section className="event-detail__overview-metrics" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <article className="event-detail__metric-card" style={{ background: 'white' }}><p>Event Type</p><strong>{eventTypeLabel}</strong></article>
            <article className="event-detail__metric-card" style={{ background: 'white' }}><p>Mode</p><strong>{form.mode}</strong></article>
            <article className="event-detail__metric-card" style={{ background: 'white' }}><p>Team Size</p><strong>{form.teamMin ? `${form.teamMin}-${form.teamMax} members` : 'Solo'}</strong></article>
            <article className="event-detail__metric-card" style={{ background: 'white' }}><p>Location</p><strong>{venueLabel}</strong></article>
            <article className="event-detail__metric-card" style={{ background: 'white' }}><p>Prize / Fee</p><strong>{form.paymentType === 'paid' ? `${form.paymentCurrency} ${form.paymentAmount}` : 'Free'}</strong></article>
          </section>

          {/* Custom Content */}
          <section className="event-detail__custom-content event-detail__panel" style={{ background: 'white' }}>
            <div className="event-detail__custom-content-head">
              <h2>Event Content</h2>
              <p>Everything the organizer has published for attendees.</p>
            </div>

            {form.eligibility && (
              <div className="event-detail__custom-group">
                <h3>Eligibility</h3>
                <p style={{ fontSize: '0.92rem', color: '#4f698e', lineHeight: 1.6 }}>{form.eligibility}</p>
              </div>
            )}
            
            {form.participationGuidelines && (
              <div className="event-detail__custom-group">
                <h3>Participation Guidelines</h3>
                <p style={{ fontSize: '0.92rem', color: '#4f698e', lineHeight: 1.6 }}>{form.participationGuidelines}</p>
              </div>
            )}

            {judges.length > 0 && (
              <div className="event-detail__custom-group">
                <h3>Judges</h3>
                <div className="event-detail__custom-list">
                  {judges.filter(j => j.name).map((judge, index) => (
                    <article key={`judge-${index}`} className="event-detail__custom-item" style={{ background: '#f8fbff' }}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{judge.name}</strong>
                        {judge.title ? <p>{judge.title}{judge.organization ? ` — ${judge.organization}` : ''}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            
            {mentors.length > 0 && (
              <div className="event-detail__custom-group">
                <h3>Mentors</h3>
                <div className="event-detail__custom-list">
                  {mentors.filter(m => m.name).map((mentor, index) => (
                    <article key={`mentor-${index}`} className="event-detail__custom-item" style={{ background: '#f8fbff' }}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{mentor.name}</strong>
                        {mentor.title ? <p>{mentor.title}{mentor.organization ? ` — ${mentor.organization}` : ''}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {rounds.length > 0 && (
              <div className="event-detail__custom-group">
                <h3>Rounds & Workflow</h3>
                <div className="event-detail__custom-list">
                  {rounds.filter(r => r.name).map((round, index) => (
                    <article key={`round-${index}`} className="event-detail__custom-item" style={{ background: '#f8fbff' }}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{round.name}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {prizes.some(p => p.rank || p.reward) && (
              <div className="event-detail__custom-group">
                <h3>Prizes & Rewards</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {prizes.filter(p => p.rank || p.reward).map((p, idx) => {
                    let iconColor = '#94a3b8'; // Default grey
                    if (idx === 0) iconColor = '#fbbf24'; // Gold
                    else if (idx === 1) iconColor = '#94a3b8'; // Silver
                    else if (idx === 2) iconColor = '#d97706'; // Bronze
                    return (
                      <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-white" style={{ borderColor: '#e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ background: '#f8fafc', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <Trophy size={18} style={{ color: iconColor }} />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{p.rank}</h3>
                        <p className="text-sm font-extrabold text-slate-800 text-center">{p.reward}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {faqs.some(f => f.q && f.a) && (
              <div className="event-detail__custom-group">
                <h3>FAQs</h3>
                <div className="event-detail__faqs">
                  {faqs.filter(f => f.q && f.a).map((f, i) => (
                    <div key={i} className="faq-item faq-item--open" style={{ background: '#f8fbff', padding: '1rem', borderRadius: '12px', border: '1px solid #d9e2ef', marginBottom: '0.5rem' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#152944', marginBottom: '0.4rem' }}>{f.q}</p>
                      <p style={{ fontSize: '0.85rem', color: '#4f698e' }}>{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </section>
        </div>
      </section>
    </div>
  );
}
