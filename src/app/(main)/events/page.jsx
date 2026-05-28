'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
} from 'lucide-react';
import { Link, useNavigate } from '@/utils/router';
import { useEvents } from '@/context/EventContext';
import { DottedGlowBackground } from '@/components/ui/DottedGlowBackground';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { buildEventDetailPath, formatDate } from '@/utils/helpers';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import EventCard from '@/components/events/EventCard';
import { daysUntil } from '@/utils/helpers';
import '@/vite-pages/Events.css';

const boardTabs = [
  { label: 'All Programs', match: () => true },
  { label: 'Hackathons', match: (event) => event.category === 'Hackathon' },
  {
    label: 'Innovation Challenges',
    match: (event) => event.category === 'Competition' || event.category === 'Conference',
  },
  {
    label: 'Startup Challenges',
    match: (event) => event.category === 'Bootcamp' || event.category === 'Meetup',
  },
];

const categoryGradient = {
  Hackathon: 'linear-gradient(140deg, #07163f 0%, #0d225b 58%, #1a3c95 100%)',
  Competition: 'linear-gradient(140deg, #2d0b4e 0%, #4a1f75 58%, #6a31a4 100%)',
  Conference: 'linear-gradient(140deg, #21354f 0%, #2e4f73 58%, #3f6ca0 100%)',
  Workshop: 'linear-gradient(140deg, #122449 0%, #1b3a73 58%, #24529d 100%)',
  Bootcamp: 'linear-gradient(140deg, #0f3256 0%, #17547f 58%, #1f77ad 100%)',
  Meetup: 'linear-gradient(140deg, #1e2458 0%, #2c3779 58%, #4456ad 100%)',
};

function resolveEventId(event) {
  return String(event?.id || event?._id || '').trim();
}

function resolveOrganizerName(event) {
  return event?.organizer?.name || event?.organiser?.name || 'Host Organization';
}

function resolveTimeline(event) {
  const timeline = event?.timeline || {};
  return {
    eventStart: timeline.eventStart || event?.eventStart || event?.startDate || '',
    eventEnd: timeline.eventEnd || event?.eventEnd || event?.endDate || '',
  };
}

function resolvePosterImage(event) {
  return (
    event?.showcaseImage ||
    event?.posterImage ||
    event?.imageUrl ||
    event?.bannerImages?.[0] ||
    event?.media?.banners?.[0] ||
    event?.galleryImages?.[0] ||
    event?.media?.gallery?.[0] ||
    ''
  );
}

function buildDateLabel(event) {
  const timeline = resolveTimeline(event);
  const start = formatDate(timeline.eventStart);
  const end = formatDate(timeline.eventEnd);
  if (!start && !end) return 'Date TBA';
  return start === end ? start : `${start} - ${end}`;
}

function sortByTimeline(events, mode) {
  const sorted = [...events];
  sorted.sort((a, b) => {
    const aTime = new Date(resolveTimeline(a).eventStart || 0).getTime() || 0;
    const bTime = new Date(resolveTimeline(b).eventStart || 0).getTime() || 0;
    return mode === 'latest' ? bTime - aTime : aTime - bTime;
  });
  return sorted;
}

export default function Events() {
  const { events, eventsLoading } = useEvents();
  const navigate = useNavigate();

  const [tab, setTab] = useState('All Programs');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('soonest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(16);

  const resetDiscoveryFilters = () => {
    setTab('All Programs');
    setSearch('');
    setSortMode('soonest');
    setStatusFilter('all');
    setVisibleCount(16);
  };

  const filteredEvents = useMemo(() => {
    const tabRule = boardTabs.find((item) => item.label === tab) || boardTabs[0];
    const query = String(search || '').trim().toLowerCase();

    const matches = events.filter((event) => {
      const tabMatch = tabRule.match(event);
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'open' && event.status === 'open') ||
        (statusFilter === 'live' && event.status === 'ongoing');

      const searchMatch =
        !query ||
        String(event?.title || '').toLowerCase().includes(query) ||
        String(resolveOrganizerName(event)).toLowerCase().includes(query) ||
        String(event?.category || '').toLowerCase().includes(query);

      return tabMatch && statusMatch && searchMatch;
    });

    return sortByTimeline(matches, sortMode);
  }, [events, tab, search, sortMode, statusFilter]);

  const featuredEvents = useMemo(() => {
    const list = events.filter((event) => event.featured);
    if (list.length > 0) return list;
    return sortByTimeline(events, 'soonest').slice(0, 5);
  }, [events]);

  useEffect(() => {
    if (featuredEvents.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredEvents.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [featuredEvents.length]);

  useEffect(() => {
    if (featuredIndex >= featuredEvents.length) {
      setFeaturedIndex(0);
    }
  }, [featuredEvents.length, featuredIndex]);

  const carouselEvents = featuredEvents.slice(0, 8);

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <DottedGlowBackground
          className="explore-hero__dotted-bg"
          opacity={0.52}
          gap={13}
          radius={1.35}
          color="rgba(96, 117, 163, 0.32)"
          darkColor="rgba(96, 117, 163, 0.32)"
          glowColor="rgba(72, 106, 176, 0.42)"
          darkGlowColor="rgba(72, 106, 176, 0.42)"
          backgroundOpacity={0}
          speedMin={0.22}
          speedMax={0.72}
          speedScale={0.72}
        />
        <div className="container explore-hero__inner">
          <div className="explore-copy">
            <h1>
              <span>DISCOVER.</span>
              <span className="is-orange">COMPETE.</span>
              <span className="is-blue">CREATE.</span>
            </h1>
            <p>
              Discover amazing opportunities to showcase your talent and gain recognition. Explore hackathons,
              startup challenges and innovation competitions.
            </p>
          </div>

          {eventsLoading ? (
            <div className="explore-carousel" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="explore-carousel__empty" style={{ opacity: 0.5 }}>
                <h2>Loading featured events...</h2>
              </div>
            </div>
          ) : carouselEvents.length ? (
            <div className="explore-carousel">
              <div
                className="explore-carousel__track"
                style={{ transform: `translateX(-${featuredIndex * 100}%)` }}
              >
                {carouselEvents.map((event) => {
                  const eventId = resolveEventId(event);
                  const posterImage = resolvePosterImage(event);

                  return (
                    <div key={`carousel-${eventId}`} className="explore-carousel__slide">
                      <Link
                        to={buildEventDetailPath(event)}
                        className="explore-carousel__card"
                        style={
                          posterImage
                            ? {
                                backgroundImage: `url(${posterImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : {
                                background: categoryGradient[event.category] || categoryGradient.Hackathon,
                              }
                        }
                      >
                        <div className="explore-carousel__veil" />
                        <div className="explore-carousel__featured"><Star size={12} /> FEATURED</div>
                        <div className="explore-carousel__content">
                          <h2>{event.title}</h2>
                          <p>
                            {String(event.shortDescription || event.description || 'Join this featured event.').slice(0, 110)}
                          </p>
                          <span>{`${buildDateLabel(event)} • ${resolveOrganizerName(event)}`}</span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="explore-carousel__controls">
                <button
                  type="button"
                  onClick={() => setFeaturedIndex((prev) => (prev - 1 + carouselEvents.length) % carouselEvents.length)}
                  aria-label="Previous featured event"
                  disabled={carouselEvents.length <= 1}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="explore-carousel__dots" aria-hidden="true">
                  {carouselEvents.map((event, index) => (
                    <button
                      key={`${resolveEventId(event)}-${index}`}
                      type="button"
                      className={index === featuredIndex ? 'is-active' : ''}
                      onClick={() => setFeaturedIndex(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setFeaturedIndex((prev) => (prev + 1) % carouselEvents.length)}
                  aria-label="Next featured event"
                  disabled={carouselEvents.length <= 1}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="explore-carousel">
              <div className="explore-carousel__empty">
                <div className="explore-carousel__empty-mark">No Events Yet</div>
                <h2>Featured events will appear here</h2>
                <p>Create or publish events to populate this carousel automatically.</p>
                <Link to="/organizer/create-event" className="explore-carousel__empty-link">Create Event</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="explore-controls">
        <div className="container">
          <div className="explore-controls__wrapper">
            <label className="explore-controls__category-wrap">
              <select
                className="explore-controls__category"
                value={tab}
                onChange={(event) => setTab(event.target.value)}
              >
                {boardTabs.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="explore-controls__actions">
              <button
                type="button"
                className={`explore-controls__btn explore-controls__sort-btn ${sortMode === 'soonest' ? 'is-active' : ''}`}
                onClick={() => setSortMode('soonest')}
                title="Sort by soonest"
              >
                <ArrowUpDown size={18} />
              </button>

              <div className="explore-controls__search-wrapper">
                <Search size={16} />
                <input
                  type="search"
                  className="explore-controls__search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events..."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="explore-board">
        <div className="container explore-board__layout">
          <div className="explore-board__main">
            <div className="explore-cards__grid">
              {eventsLoading ? (
                // Show 8 skeleton cards while Firebase syncs on first load
                Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)
              ) : filteredEvents.length > 0 ? (
                filteredEvents.slice(0, visibleCount).map((event) => {
                  const eventId = resolveEventId(event);
                  const posterImage = resolvePosterImage(event);

                  return (
                    <div 
                      key={eventId} 
                      className="explore-card-wrapper cursor-pointer" 
                      style={{ height: '100%' }}
                      onClick={() => navigate(buildEventDetailPath(event))}
                    >
                      <EventCard 
                        coverImage={posterImage}
                        title={event.title}
                        categories={[
                          { label: event.category || 'Hackathon', icon: event.category === 'Hackathon' ? 'code' : 'globe', color: 'purple' },
                          { label: event.mode || 'Online', icon: 'monitor', color: 'blue' }
                        ]}
                        registeredCount={event.registeredCount || 0}
                        startDate={resolveTimeline(event).eventStart}
                        endDate={resolveTimeline(event).eventEnd}
                        daysLeftToRegister={daysUntil(event.timeline?.registrationEnd || event.endDate || event.timeline?.eventStart)}
                        location={event.location || 'TBA'}
                        isFree={!event.entryFee}
                        teamSizeMin={event.teamSize?.min || 1}
                        teamSizeMax={event.teamSize?.max || 4}
                        onRegister={() => navigate(buildEventDetailPath(event))}
                        onBookmark={() => {}}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="explore-empty-v2">
                  <div className="explore-empty-v2__container">
                    <div className="explore-empty-v2__icon-box">
                      <svg className="explore-empty-v2__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="currentColor"/>
                        <path d="M11 15h2v2h-2zm0-8h2v6h-2z" fill="currentColor"/>
                      </svg>
                    </div>
                    <h3 className="explore-empty-v2__title">Nothing here yet</h3>
                    <p className="explore-empty-v2__subtitle">No events match your filters. Try adjusting your search or creating a new event to get started.</p>
                    <div className="explore-empty-v2__cta-group">
                      <button type="button" className="explore-empty-v2__cta-primary" onClick={resetDiscoveryFilters}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                        Reset Filters
                      </button>
                      <Link to="/organizer/create-event" className="explore-empty-v2__cta-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Create Event
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {visibleCount < filteredEvents.length && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setVisibleCount((prev) => prev + 16)}
                  className="bg-white border text-gray-800 text-sm font-semibold px-6 py-2.5 rounded-lg transition-transform hover:-translate-y-0.5 shadow-sm flex items-center gap-2"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

