/**
 * Skeleton — reusable shimmer placeholder components.
 *
 * Usage:
 *   <Skeleton.Box h={20} w="60%" r={8} />
 *   <Skeleton.Circle size={48} />
 *   <Skeleton.Text lines={3} />
 */

import './Skeleton.css';

/** A single shimmer rectangle */
function Box({ h = 16, w = '100%', r = 6, className = '', style = {} }) {
  return (
    <div
      className={`sk-box ${className}`}
      style={{ height: h, width: w, borderRadius: r, ...style }}
    />
  );
}

/** A shimmer circle (avatars, icons) */
function Circle({ size = 40, className = '' }) {
  return (
    <div
      className={`sk-box ${className}`}
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

/** Multiple lines of text shimmer */
function Text({ lines = 3, gap = 8, lastLineW = '70%', className = '' }) {
  return (
    <div className={`sk-text ${className}`} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Box key={i} h={14} w={i === lines - 1 && lines > 1 ? lastLineW : '100%'} r={4} />
      ))}
    </div>
  );
}

/** Event card skeleton — matches the explore-card layout */
export function EventCardSkeleton() {
  return (
    <div className="sk-event-card">
      {/* Image area */}
      <Box h={160} r={0} />
      {/* Body */}
      <div className="sk-event-card__body">
        <Box h={11} w="40%" r={4} />
        <Box h={18} w="85%" r={5} style={{ marginTop: 6 }} />
        <Box h={13} w="55%" r={4} style={{ marginTop: 4 }} />
        <div className="sk-event-card__footer">
          <Box h={24} w="45%" r={12} />
          <Box h={28} w="30%" r={8} />
        </div>
      </div>
    </div>
  );
}

/** Events page skeleton — hero carousel + grid of cards */
export function EventsPageSkeleton() {
  return (
    <div className="sk-events-page">
      {/* Hero section */}
      <div className="sk-events-hero">
        <div className="sk-events-hero__copy">
          <Box h={48} w="70%" r={8} />
          <Box h={48} w="50%" r={8} style={{ marginTop: 10 }} />
          <Box h={16} w="80%" r={4} style={{ marginTop: 16 }} />
          <Box h={16} w="60%" r={4} style={{ marginTop: 8 }} />
        </div>
        <Box className="sk-events-hero__carousel" h={240} r={16} />
      </div>

      {/* Controls bar */}
      <div className="sk-events-controls">
        <Box h={38} w={180} r={8} />
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <Box h={38} w={38} r={8} />
          <Box h={38} w={220} r={8} />
        </div>
      </div>

      {/* Cards grid */}
      <div className="sk-events-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Event Detail page skeleton — banner + sidebar layout */
export function EventDetailSkeleton() {
  return (
    <div className="sk-event-detail">
      {/* Banner */}
      <Box className="sk-event-detail__banner" h={340} r={0} />

      <div className="sk-event-detail__body">
        {/* Main content column */}
        <div className="sk-event-detail__main">
          {/* Title block */}
          <div className="sk-event-detail__title-block">
            <Box h={11} w={80} r={20} />
            <Box h={36} w="80%" r={6} style={{ marginTop: 10 }} />
            <Box h={20} w="50%" r={4} style={{ marginTop: 8 }} />
          </div>

          {/* Organiser row */}
          <div className="sk-event-detail__org-row">
            <Circle size={44} />
            <div style={{ flex: 1 }}>
              <Box h={13} w="35%" r={4} />
              <Box h={11} w="25%" r={4} style={{ marginTop: 5 }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            {[80, 100, 90, 70].map((w, i) => (
              <Box key={i} h={32} w={w} r={20} />
            ))}
          </div>

          {/* Content paragraphs */}
          <div style={{ marginTop: 24 }}>
            <Text lines={4} gap={10} />
            <div style={{ marginTop: 20 }}>
              <Text lines={3} gap={10} lastLineW="50%" />
            </div>
          </div>

          {/* Timeline cards */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="sk-event-detail__timeline-card">
                <Box h={11} w="60%" r={4} />
                <Box h={16} w="80%" r={4} style={{ marginTop: 6 }} />
                <Box h={11} w="45%" r={4} style={{ marginTop: 4 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sk-event-detail__sidebar">
          <div className="sk-event-detail__reg-card">
            <Box h={20} w="70%" r={5} />
            <Box h={14} w="50%" r={4} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Circle size={32} />
                  <div style={{ flex: 1 }}>
                    <Box h={11} w="40%" r={4} />
                    <Box h={13} w="70%" r={4} style={{ marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <Box h={44} r={10} style={{ marginTop: 20 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Organizer Dashboard skeleton — metrics + event table */
export function OrgDashboardSkeleton() {
  return (
    <div className="sk-org-dashboard">
      {/* Hero header */}
      <div className="sk-org-dashboard__hero">
        <div style={{ flex: 1 }}>
          <Box h={11} w={120} r={4} />
          <Box h={32} w="55%" r={6} style={{ marginTop: 8 }} />
          <Box h={14} w="40%" r={4} style={{ marginTop: 8 }} />
        </div>
        <Box h={40} w={160} r={10} />
      </div>

      {/* Metric tiles */}
      <div className="sk-org-dashboard__metrics">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="sk-org-dashboard__metric-tile">
            <Circle size={36} />
            <div style={{ flex: 1, marginTop: 8 }}>
              <Box h={11} w="55%" r={4} />
              <Box h={22} w="40%" r={4} style={{ marginTop: 6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '0 24px', marginTop: 12 }}>
        {[90, 110, 100, 95].map((w, i) => (
          <Box key={i} h={34} w={w} r={8} />
        ))}
      </div>

      {/* Event rows */}
      <div className="sk-org-dashboard__table">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk-org-dashboard__row">
            <Box h={56} w={56} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Box h={16} w="50%" r={5} />
              <Box h={12} w="35%" r={4} style={{ marginTop: 6 }} />
            </div>
            <Box h={26} w={80} r={14} />
            <Box h={32} w={32} r={8} />
            <Box h={32} w={32} r={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic page fallback — a subtle centered shimmer */
export function PageSkeleton() {
  return (
    <div className="sk-page-fallback">
      <div className="sk-page-fallback__inner">
        <Box h={40} w="65%" r={8} style={{ margin: '0 auto' }} />
        <Box h={20} w="45%" r={6} style={{ margin: '16px auto 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
          <Text lines={4} gap={12} />
          <Text lines={3} gap={12} lastLineW="60%" />
        </div>
      </div>
    </div>
  );
}

const Skeleton = { Box, Circle, Text };
export default Skeleton;
