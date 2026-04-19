import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Trophy, Zap, Building2, Ticket } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { buildEventDetailPath, formatDate } from '../../utils/helpers';
import './EventCard.css';

const categoryColors = {
  Hackathon: { bg: '#ea7a32', text: '#fff' },
  Competition: { bg: '#7B93DB', text: '#fff' },
  Workshop: { bg: '#ea7a32', text: '#fff' },
  Conference: { bg: '#7B93DB', text: '#fff' },
  Bootcamp: { bg: '#ea7a32', text: '#fff' },
  Meetup: { bg: '#7B93DB', text: '#fff' },
};

const gradientMap = {
  Hackathon: 'linear-gradient(135deg, #ea7a32 0%, #f5a623 100%)',
  Competition: 'linear-gradient(135deg, #7B93DB 0%, #5a6fb5 100%)',
  Workshop: 'linear-gradient(135deg, #f5a623 0%, #ea7a32 100%)',
  Conference: 'linear-gradient(135deg, #5a6fb5 0%, #7B93DB 100%)',
  Bootcamp: 'linear-gradient(135deg, #ea7a32 0%, #df995e 100%)',
  Meetup: 'linear-gradient(135deg, #7B93DB 0%, #9baee0 100%)',
};

export default function EventCard({ event, index = 0 }) {
  const { user } = useAuth();
  const { getEventRegistrationForUser } = useEvents();
  const {
    id, title, category, mode, status,
    organizer, timeline, venue, prize, fee,
    registeredCount
  } = event;

  const dateStart = formatDate(timeline.eventStart);
  const dateEnd = formatDate(timeline.eventEnd);
  const dateRange = dateStart === dateEnd ? dateStart : `${dateStart} - ${dateEnd}`;
  const colors = categoryColors[category] || categoryColors.Hackathon;
  const gradient = gradientMap[category] || gradientMap.Hackathon;
  const currentRegistration = user ? getEventRegistrationForUser(id, user) : null;

  const statusLabel = {
    open: 'Open',
    upcoming: 'Upcoming',
    ongoing: 'Live',
    completed: 'Ended',
  };

  return (
    <Link
      to={buildEventDetailPath(event)}
      className="hc-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image / Header Area */}
      <div className="hc-card__image" style={{ background: gradient }}>
        {/* Category badge */}
        <div className="hc-card__category-badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {category}
        </div>

        {/* Status badge */}
        <div className={`hc-card__status-badge hc-card__status-badge--${status}`}>
          {statusLabel[status] || status}
        </div>

        {/* Prize */}
        {prize && (
          <div className="hc-card__prize">
            <Trophy size={13} />
            {prize}
          </div>
        )}

        {/* Date pill */}
        <div className="hc-card__date-pill">
          <Calendar size={13} />
          <span>{dateRange}</span>
        </div>
      </div>

      {/* Body */}
      <div className="hc-card__body">
        <h3 className="hc-card__title">{title}</h3>

        <div className="hc-card__meta">
          <div className="hc-card__meta-row">
            <Building2 size={14} />
            <span>{organizer.name}</span>
          </div>
          <div className="hc-card__meta-row">
            <MapPin size={14} />
            <span>{venue || mode}</span>
          </div>
          <div className="hc-card__meta-row" style={{ color: fee && fee.trim() !== '' && fee.toLowerCase() !== 'free' ? '#ea7a32' : '#166534', fontWeight: 600 }}>
            <Ticket size={14} style={{ color: 'inherit' }} />
            <span>{fee && fee.trim() !== '' && fee.toLowerCase() !== 'free' ? fee : 'Free Entry'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="hc-card__footer">
          <div className="hc-card__participants">
            <Users size={14} />
            <span>{registeredCount || 0} Participants</span>
          </div>
          <div
            className={`hc-card__cta ${currentRegistration ? 'is-registered' : ''}`}
            style={{ background: colors.bg }}
          >
            {currentRegistration ? 'Already Registered' : 'Register Now'} <Zap size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
