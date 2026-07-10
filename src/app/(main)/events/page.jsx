'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Globe,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from '@/utils/router';
import { useEvents } from '@/context/EventContext';
import { useAuth } from '@/context/AuthContext';
import { buildEventDetailPath, formatDate, daysUntil } from '@/utils/helpers';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import EventCard from '@/components/events/EventCard';
import { getBookmarkedEvents, getBookmarkedEventsSync, toggleEventBookmark } from '@/utils/bookmarks';
import { toast } from '@/utils/toast';
import { listEventsPaginated } from '@/lib/supabase-data';
import { DottedGlowBackground } from '@/components/ui/DottedGlowBackground';
import '@/vite-pages/Events.css';

const CATEGORY_MAP = {
  'All Programs': null,
  'Hackathons': 'Hackathon',
  'Innovation Challenges': 'Competition',
  'Startup Challenges': 'Bootcamp',
};

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

function buildDateLabel(event) {
  const timeline = resolveTimeline(event);
  const start = formatDate(timeline.eventStart);
  const end = formatDate(timeline.eventEnd);
  if (!start && !end) return 'Date TBA';
  return start === end ? start : `${start} - ${end}`;
}

function sortByTimeline(events, mode) {
  const sorted = [...events];
  if (mode === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return sorted;
  }
  sorted.sort((a, b) => {
    const aTime = new Date(resolveTimeline(a).eventStart || 0).getTime() || 0;
    const bTime = new Date(resolveTimeline(b).eventStart || 0).getTime() || 0;
    return mode === 'latest' ? bTime - aTime : aTime - bTime;
  });
  return sorted;
}

const PAGE_SIZE = 16;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20 }
  },
};

export default function Events() {
  const { events: contextEvents } = useEvents();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('All Programs');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Server-side paginated state
  const [paginatedEvents, setPaginatedEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchIdRef = useRef(0);



  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Bookmark state
  useEffect(() => {
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

  // Fetch events from server when filters change (resets to page 1)
  const fetchPage = useCallback(async (page, append = false) => {
    const id = ++fetchIdRef.current;
    if (!append) setIsLoadingPage(true);
    else setIsLoadingMore(true);

    try {
      const category = CATEGORY_MAP[tab] || '';
      const status = statusFilter === 'all' ? '' : (statusFilter === 'live' ? 'ongoing' : statusFilter);

      const result = await listEventsPaginated({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        category,
        status,
      });

      if (id !== fetchIdRef.current) return;

      if (append) {
        setPaginatedEvents((prev) => [...prev, ...result.events]);
      } else {
        setPaginatedEvents(result.events);
      }
      setCurrentPage(result.pagination.page);
      setHasMore(result.pagination.hasMore);
      setTotalCount(result.pagination.total);
    } catch (err) {
      console.error('fetchPage error:', err);
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoadingPage(false);
        setIsLoadingMore(false);
      }
    }
  }, [tab, debouncedSearch, statusFilter]);

  // Reset and fetch when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    fetchPage(currentPage + 1, true);
  };

  const resetFilters = () => {
    setTab('All Programs');
    setSearch('');
    setDebouncedSearch('');
    setSortMode('newest');
    setStatusFilter('all');
  };

  // Sort paginated events client-side
  const sortedEvents = useMemo(() => {
    return sortByTimeline(paginatedEvents, sortMode);
  }, [paginatedEvents, sortMode]);



  if (!mounted) return null;

  return (
    <div className="explore-page">
      {/* ── Hero Section ── */}
      <section className="explore-hero">
        <DottedGlowBackground
          className="explore-hero__dotted-bg"
          opacity={0.4}
          gap={18}
          radius={1.5}
          color="rgba(37, 89, 189, 0.2)"
          darkColor="rgba(37, 89, 189, 0.2)"
          glowColor="rgba(234, 122, 50, 0.2)"
          darkGlowColor="rgba(234, 122, 50, 0.2)"
          backgroundOpacity={0}
          speedMin={0.3}
          speedMax={0.8}
          speedScale={0.8}
        />
        <motion.div 
          className="container explore-hero__inner"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1>
            Discover Your Next <br />
            <span className="is-blue">Big</span> <span className="is-orange">Opportunity.</span>
          </h1>
          <p>
            Explore hackathons, innovation challenges, and tech meetups curated to help you build, learn, and grow your career.
          </p>
        </motion.div>


      </section>

      {/* ── Sticky Controls Bar ── */}
      <div className="explore-controls-bar">
        <div className="container explore-controls__inner">
          <div className="explore-tabs">
            {boardTabs.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`explore-tab ${tab === item.label ? 'is-active' : ''}`}
                onClick={() => setTab(item.label)}
              >
                {tab === item.label && (
                  <motion.div
                    layoutId="activeTab"
                    className="explore-tab-bg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 2 }}>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="explore-actions">
            <div className="explore-search-wrap">
              <Search size={18} />
              <input
                type="text"
                className="explore-search-input"
                placeholder="Search amazing events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <button
              type="button"
              className={`explore-sort-btn ${sortMode === 'newest' ? 'is-active' : ''}`}
              onClick={() => setSortMode(sortMode === 'newest' ? 'soonest' : 'newest')}
              title={sortMode === 'newest' ? "Sort by soonest timeline" : "Sort by most recent"}
            >
              <ArrowUpDown size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Board ── */}
      <section className="explore-board">
        <div className="container">
          <AnimatePresence mode="wait">
            {isLoadingPage ? (
              <motion.div 
                key="loading"
                className="explore-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </motion.div>
            ) : sortedEvents.length > 0 ? (
              <motion.div 
                key="content"
                className="explore-grid"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {sortedEvents.map((event) => {
                  const eventId = resolveEventId(event);
                  return (
                    <motion.div 
                      key={eventId} 
                      className="explore-card-wrapper cursor-pointer"
                      onClick={() => navigate(buildEventDetailPath(event))}
                      variants={itemVariants}
                    >
                      <div>
                        <EventCard 
                          coverImage={resolvePosterImage(event)}
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
                            if (added) toast.bookmarkAdd('Saved to your bookmarks!', event.title);
                            else toast.bookmarkRemove('Removed from bookmarks.', event.title);
                          }}
                          isBookmarked={bookmarkedIds.includes(eventId)}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                className="explore-empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <div className="explore-empty__icon">
                  <Search size={32} />
                </div>
                <h3>No events found</h3>
                <p>We couldn't find any events matching your current filters. Try adjusting your search.</p>
                <button type="button" className="explore-empty__btn" onClick={resetFilters}>
                  Clear Filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {hasMore && (
            <div className="explore-load-more">
              <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : `Load More (${sortedEvents.length} of ${totalCount})`}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
