'use client';

import { useEffect, useState, useMemo } from 'react';
import { useEvents } from '@/context/EventContext';
import { Link, useNavigate } from '@/utils/router';
import { getBookmarkedEvents, getBookmarkedEventsSync, toggleEventBookmark } from '@/utils/bookmarks';
import { toast } from '@/utils/toast';
import EventCard from '@/components/events/EventCard';
import { DottedGlowBackground } from '@/components/ui/DottedGlowBackground';
import { buildEventDetailPath } from '@/utils/helpers';
import { daysUntil } from '@/utils/helpers';
import { Bookmark, Sparkles, Compass, Search } from 'lucide-react';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import '@/vite-pages/Events.css';
import './Bookmarks.css';

// Helper resolvers copied from events/page.jsx for consistency
function resolveEventId(event) {
  return String(event?.id || event?._id || '').trim();
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

export default function BookmarksPage() {
  const { events, eventsLoading } = useEvents();
  const navigate = useNavigate();
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [sortBy, setSortBy] = useState('recently-added');

  useEffect(() => {
    setMounted(true);
    // Fast sync read for initial render, then async fetch from Supabase
    setBookmarkedIds(getBookmarkedEventsSync());
    getBookmarkedEvents().then(setBookmarkedIds);

    const handleUpdate = () => {
      getBookmarkedEvents().then(setBookmarkedIds);
    };
    window.addEventListener('bookmarks-updated', handleUpdate);
    return () => {
      window.removeEventListener('bookmarks-updated', handleUpdate);
    };
  }, []);

  // Filter bookmarked events from the global pool
  const bookmarkedEvents = useMemo(() => {
    return events.filter((e) => bookmarkedIds.includes(resolveEventId(e)));
  }, [events, bookmarkedIds]);

  // Compute dynamic category filter tabs
  const categories = useMemo(() => {
    const list = ['All'];
    bookmarkedEvents.forEach((event) => {
      const cat = event.category || 'Hackathon';
      if (!list.includes(cat)) {
        list.push(cat);
      }
    });
    return list;
  }, [bookmarkedEvents]);

  // Handle filtering and sorting logic
  const filteredEvents = useMemo(() => {
    return bookmarkedEvents
      .filter((event) => {
        // Category filtering
        if (selectedTab !== 'All' && (event.category || 'Hackathon') !== selectedTab) {
          return false;
        }

        // Search filtering
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const titleMatch = String(event.title || '').toLowerCase().includes(query);
          const organizerMatch = String(event.organizer?.name || event.organiser?.name || '').toLowerCase().includes(query);
          const locationMatch = String(event.location || event.venue || event.mode || '').toLowerCase().includes(query);
          const categoryMatch = String(event.category || '').toLowerCase().includes(query);
          return titleMatch || organizerMatch || locationMatch || categoryMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'soonest') {
          const startA = new Date(resolveTimeline(a).eventStart || 0);
          const startB = new Date(resolveTimeline(b).eventStart || 0);
          return startA - startB;
        }
        if (sortBy === 'alphabetical') {
          return String(a.title || '').localeCompare(String(b.title || ''));
        }
        if (sortBy === 'recently-added') {
          const indexA = bookmarkedIds.indexOf(resolveEventId(a));
          const indexB = bookmarkedIds.indexOf(resolveEventId(b));
          // The item added later has a higher index in the localStorage list,
          // so we sort index descending to show the most recently added first.
          return indexB - indexA;
        }
        return 0;
      });
  }, [bookmarkedEvents, selectedTab, searchQuery, sortBy, bookmarkedIds]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="bookmarks-page">
      <DottedGlowBackground 
        color="rgba(255, 107, 0, 0.15)"
        glowColor="rgba(255, 107, 0, 0.25)"
        gap={32}
        opacity={0.4}
        speedMin={0.1}
        speedMax={0.3}
        speedScale={0.5}
      />

      <div className="container bookmarks-container">
        {/* Page Header */}
        <header className="bookmarks-header">
          <div className="bookmarks-eyebrow">
            <Bookmark size={14} style={{ fill: '#ff6b00' }} /> Bookmarked Events
          </div>
          <div className="bookmarks-title-row">
            <h1 className="bookmarks-title">Your Saved Opportunities</h1>
            {bookmarkedEvents.length > 0 && (
              <span className="bookmarks-count-badge">
                {bookmarkedEvents.length} Active
              </span>
            )}
          </div>
          <p className="bookmarks-subtitle">
            Keep track of the hackathons, challenges, and contests you are interested in.
          </p>
        </header>

        {/* Filters and Controls */}
        {bookmarkedEvents.length > 0 && (
          <>
            <div className="bookmarks-controls glass">
              <div className="bookmarks-controls__search-group">
                <Search size={18} />
                <input
                  type="text"
                  className="bookmarks-search-input"
                  placeholder="Search saved events by title, host, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="bookmarks-controls__right">
                <span className="bookmarks-sort-label">Sort by</span>
                <select
                  className="bookmarks-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recently-added">Recently Saved</option>
                  <option value="soonest">Happening Soonest</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Category tabs (Only visible if there is more than 1 category to filter) */}
            {categories.length > 2 && (
              <div className="bookmarks-tabs-container">
                {categories.map((cat) => {
                  const count = cat === 'All' 
                    ? bookmarkedEvents.length 
                    : bookmarkedEvents.filter(e => (e.category || 'Hackathon') === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`bookmarks-tab-btn ${selectedTab === cat ? 'is-active' : ''}`}
                      onClick={() => setSelectedTab(cat)}
                    >
                      {cat === 'All' ? 'All Bookmarks' : cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Grid List */}
        {eventsLoading ? (
          <div className="bookmarks-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="bookmarks-grid">
            {filteredEvents.map((event) => {
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
                    onBookmark={async () => {
                      const added = await toggleEventBookmark(eventId);
                      if (added) {
                        toast.bookmarkAdd('Saved to your bookmarked events!', event.title);
                      } else {
                        toast.bookmarkRemove('Removed from your bookmarks.', event.title);
                      }
                    }}
                    isBookmarked={true}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* Redesigned Empty State */
          <div className="bookmarks-empty-card glass">
            <div className="bookmarks-empty-card__icon-wrap">
              <Compass size={32} className="bookmarks-empty-card__compass" />
            </div>
            <h2 className="bookmarks-empty-card__title">
              {bookmarkedEvents.length === 0 ? 'No Bookmarked Events Yet' : 'No Matching Bookmarks'}
            </h2>
            <p className="bookmarks-empty-card__text">
              {bookmarkedEvents.length === 0 
                ? 'Explore the Arena to discover interesting opportunities. Click the bookmark icon on any event card to save it here.'
                : "We couldn't find any saved events matching your filters. Try updating your search or category selections."}
            </p>
            {bookmarkedEvents.length === 0 ? (
              <Link to="/events" className="bookmarks-empty-card__btn">
                <Sparkles size={16} /> Explore the Arena
              </Link>
            ) : (
              <button 
                type="button" 
                className="bookmarks-empty-card__btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTab('All');
                }}
              >
                <Sparkles size={16} /> Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
