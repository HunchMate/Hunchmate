import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { eventModes, eventStatuses } from '../utils/sampleData';
import { formatDate } from '../utils/helpers';
import './Events.css';

const spotlightMotion = {
  enter: (direction) => ({
    x: direction > 0 ? '12%' : '-12%',
    opacity: 0,
    scale: 1.02,
  }),
  center: {
    x: '0%',
    opacity: 1,
    scale: 1,
    transition: {
      x: { duration: 0.46, ease: [0.22, 0.61, 0.36, 1] },
      opacity: { duration: 0.32, ease: 'easeOut' },
      scale: { duration: 0.42, ease: 'easeOut' },
    },
  },
  exit: (direction) => ({
    x: direction > 0 ? '-12%' : '12%',
    opacity: 0,
    scale: 0.985,
    transition: {
      x: { duration: 0.42, ease: [0.4, 0, 1, 1] },
      opacity: { duration: 0.28, ease: 'easeIn' },
      scale: { duration: 0.34, ease: 'easeIn' },
    },
  }),
};

const statusLabel = {
  open: 'Open',
  upcoming: 'Upcoming',
  ongoing: 'Live',
  completed: 'Closed',
};

const eventSkin = {
  Hackathon: 'linear-gradient(130deg, #0b132b 0%, #1c2541 55%, #3a506b 100%)',
  Competition: 'linear-gradient(130deg, #3f0d12 0%, #a71d31 58%, #f46036 100%)',
  Workshop: 'linear-gradient(130deg, #1b4332 0%, #2d6a4f 60%, #52b788 100%)',
  Conference: 'linear-gradient(130deg, #1d3557 0%, #457b9d 60%, #a8dadc 100%)',
  Bootcamp: 'linear-gradient(130deg, #2b2d42 0%, #4a4e69 65%, #9a8c98 100%)',
  Meetup: 'linear-gradient(130deg, #14213d 0%, #274c77 58%, #6096ba 100%)',
};

const boardTabs = ['All Programs', 'Hackathons', 'Challenges', 'Workshops'];

function matchBoardTab(event, tab) {
  if (tab === 'All Programs') return true;
  if (tab === 'Hackathons') return event.category === 'Hackathon';
  if (tab === 'Challenges') return event.category === 'Competition' || event.category === 'Bootcamp';
  if (tab === 'Workshops') return event.category === 'Workshop' || event.category === 'Conference';
  return true;
}

function resolveOrganizerName(event) {
  return event?.organizer?.name || event?.organiser?.name || 'Host';
}

function resolveEventId(event) {
  return event?.id || event?._id || '';
}

function resolveEventTimeline(event) {
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

function EventTile({ event }) {
  const { user } = useAuth();
  const { getEventRegistrationForUser } = useEvents();
  const eventId = resolveEventId(event);
  const timeline = resolveEventTimeline(event);
  const startDate = formatDate(timeline.eventStart);
  const endDate = formatDate(timeline.eventEnd);
  const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
  const posterImage = resolvePosterImage(event);
  const currentRegistration = user && eventId ? getEventRegistrationForUser(eventId, user) : null;

  return (
    <Link to={`/events/${eventId}`} className="evn-tile">
      <div
        className="evn-tile__poster"
        style={
          posterImage
            ? {
                backgroundImage: `url(${posterImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: eventSkin[event.category] || eventSkin.Hackathon }
        }
      >
        {event.featured ? <span className="evn-tag"><Sparkles size={13} /> Featured</span> : null}
        <span className="evn-category-pill">{event.category}</span>
      </div>

      <div className="evn-tile__body">
        <h3>{event.title}</h3>
        <p className="evn-tile__org">{resolveOrganizerName(event)}</p>

        <div className="evn-tile__meta">
          <span><Calendar size={13} /> {dateRange}</span>
          <span><Users size={13} /> {event.mode}</span>
        </div>

        <span className={`evn-tile__cta ${currentRegistration ? 'is-registered' : ''}`}>
          {currentRegistration ? 'Already Registered' : 'Explore Program'} <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

export default function Events() {
  const { events } = useEvents();

  const [tab, setTab] = useState('All Programs');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');
  const [activity, setActivity] = useState('all');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [spotlightDirection, setSpotlightDirection] = useState(1);

  const featuredPrograms = useMemo(() => {
    const picks = events.filter((event) => event.featured || event.status === 'open' || event.status === 'ongoing');
    return (picks.length ? picks : events).slice(0, 6);
  }, [events]);

  const spotlight = featuredPrograms[featuredIndex] || null;

  useEffect(() => {
    if (featuredPrograms.length <= 1) return undefined;

    const autoAdvance = window.setInterval(() => {
      setSpotlightDirection(1);
      setFeaturedIndex((prev) => (prev + 1) % featuredPrograms.length);
    }, 2000);

    return () => window.clearInterval(autoAdvance);
  }, [featuredPrograms.length]);

  const trendingCategories = useMemo(() => {
    const counts = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const tabMatch = matchBoardTab(event, tab);
      const title = String(event?.title || '').toLowerCase();
      const organizer = resolveOrganizerName(event).toLowerCase();
      const tags = Array.isArray(event?.tags) ? event.tags : [];
      const searchMatch =
        !query ||
        title.includes(query) ||
        organizer.includes(query) ||
        tags.some((tag) => String(tag || '').toLowerCase().includes(query));
      const statusMatch = !status || event.status === status;
      const modeMatch = !mode || event.mode === mode;
      const activityMatch =
        activity === 'all' ||
        (activity === 'registration' && event.status === 'open') ||
        (activity === 'live' && event.status === 'ongoing');

      return tabMatch && searchMatch && statusMatch && modeMatch && activityMatch;
    });
  }, [events, tab, search, status, mode, activity]);

  const resetFilters = () => {
    setTab('All Programs');
    setSearch('');
    setStatus('');
    setMode('');
    setActivity('all');
  };

  const openNow = events.filter((event) => event.status === 'open').length;
  const liveNow = events.filter((event) => event.status === 'ongoing').length;
  const totalTracks = new Set(events.flatMap((event) => event.tags || [])).size;
  const spotlightPoster = resolvePosterImage(spotlight);

  return (
    <div className="evn-page">
      <section className="evn-masthead">
        <div className="container evn-masthead__inner">
          <div className="evn-copy">
            <span className="evn-copy__eyebrow">Hunchmate Program Radar</span>
            <h1>Build your next big weekend with elite events.</h1>
            <p>
              Handpicked hackathons, startup battles, and deep-work sprints for builders who move faster than everyone else.
            </p>

            <div className="evn-stats">
              <article><p>Open</p><strong>{openNow}</strong></article>
              <article><p>Live</p><strong>{liveNow}</strong></article>
              <article><p>Tracks</p><strong>{totalTracks}</strong></article>
            </div>

            {trendingCategories.length > 0 ? (
              <div className="evn-trending">
                <span>Trending:</span>
                {trendingCategories.map(([category, count]) => (
                  <button key={category} type="button" onClick={() => setSearch(category)}>
                    {category} <em>{count}</em>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {spotlight ? (
            <article className="evn-spotlight">
              <div className="evn-spotlight__viewport">
                <AnimatePresence initial={false} custom={spotlightDirection} mode="wait">
                  <Motion.div
                      key={resolveEventId(spotlight)}
                    className="evn-spotlight__slide"
                    custom={spotlightDirection}
                    variants={spotlightMotion}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    style={
                      spotlightPoster
                        ? {
                            backgroundImage: `url(${spotlightPoster})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : { background: eventSkin[spotlight.category] || eventSkin.Hackathon }
                    }
                  >
                    <div className="evn-spotlight__veil" />
                    <div className="evn-spotlight__content">
                      <h2>{spotlight.title}</h2>
                      <p>Hosted by {resolveOrganizerName(spotlight)}</p>
                      <div className="evn-spotlight__chips">
                        <span>
                          {formatDate(resolveEventTimeline(spotlight).eventStart)} - {formatDate(resolveEventTimeline(spotlight).eventEnd)}
                        </span>
                        <span>{spotlight.prize || 'Certificates'}</span>
                        <span>{spotlight.mode}</span>
                      </div>
                      <Link to={`/events/${resolveEventId(spotlight)}`} className="evn-spotlight__cta">Open Spotlight</Link>
                    </div>
                  </Motion.div>
                </AnimatePresence>
              </div>

              <div className="evn-spotlight__nav">
                <button
                  type="button"
                  onClick={() => {
                    setSpotlightDirection(-1);
                    setFeaturedIndex((prev) => (prev - 1 + featuredPrograms.length) % featuredPrograms.length);
                  }}
                  disabled={featuredPrograms.length <= 1}
                  aria-label="Previous spotlight"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpotlightDirection(1);
                    setFeaturedIndex((prev) => (prev + 1) % featuredPrograms.length);
                  }}
                  disabled={featuredPrograms.length <= 1}
                  aria-label="Next spotlight"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="container evn-layout">
        <main className="evn-main">
          <section className="evn-toolbar">
            <div className="evn-tabs" role="tablist" aria-label="Program type">
              {boardTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === tab ? 'is-active' : ''}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="evn-search-wrap">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search by title, organizer, tag"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </section>

          <section className="evn-grid-wrap">
            <header className="evn-grid-head">
              <div>
                <h3>Program Board</h3>
                <p>{filteredEvents.length} matches tailored to your filters.</p>
              </div>
              <span className="evn-result-chip">{filteredEvents.length} results</span>
            </header>

            <div className="evn-grid">
              {filteredEvents.length > 0 ? (
                filteredEvents.slice(0, 12).map((event) => <EventTile key={resolveEventId(event)} event={event} />)
              ) : (
                <div className="evn-empty">
                  <h4>No matching programs found</h4>
                  <p>Try broadening your filters or switching category tabs.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="evn-filters">
          <header className="evn-filters__head">
            <h3>Filter Stack</h3>
            <button type="button" onClick={resetFilters}>Reset</button>
          </header>

          <div className="evn-group">
            <h4>Status</h4>
            <label className="evn-select">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Any status</option>
                {eventStatuses.map((item) => (
                  <option key={item} value={item}>{statusLabel[item] || item}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div className="evn-group">
            <h4>Mode</h4>
            <label className="evn-select">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">Any mode</option>
                {eventModes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div className="evn-group">
            <h4>Activity</h4>
            <div className="evn-chip-row">
              <button
                type="button"
                className={activity === 'all' ? 'is-active' : ''}
                onClick={() => setActivity('all')}
              >
                All
              </button>
              <button
                type="button"
                className={activity === 'registration' ? 'is-active' : ''}
                onClick={() => setActivity('registration')}
              >
                Registration
              </button>
              <button
                type="button"
                className={activity === 'live' ? 'is-active' : ''}
                onClick={() => setActivity('live')}
              >
                Live
              </button>
            </div>
          </div>

          <div className="evn-group evn-group--quiet">
            <p><SlidersHorizontal size={14} /> Filters update the board instantly.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
