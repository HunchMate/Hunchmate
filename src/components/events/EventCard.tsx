import React, { useState } from 'react';
import {
  Code2,
  Monitor,
  Users2,
  Globe,
  Calendar,
  Hourglass,
  MapPin,
  Tag,
  Users,
  Bookmark
} from 'lucide-react';

export interface EventCardProps {
  coverImage: string;
  title: string;
  categories: {
    label: string;
    icon: 'code' | 'monitor' | 'users' | 'globe';
    color: 'purple' | 'blue' | 'green' | 'orange';
  }[];
  registeredCount: number;
  startDate: string;
  endDate: string;
  daysLeftToRegister: number;
  location: string;
  isFree: boolean;
  teamSizeMin: number;
  teamSizeMax: number;
  onRegister: () => void;
  onBookmark: () => void;
  isBookmarked?: boolean;
}

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatDateRange = (startIso: string, endIso: string) => {
  if (!startIso || !endIso) return '';
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.toLocaleString('default', { month: 'short' });
  const endMonth = endDate.toLocaleString('default', { month: 'short' });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const startStr = `${startDay}${getOrdinalSuffix(startDay)}`;
  const endStr = `${endDay}${getOrdinalSuffix(endDay)}`;

  if (startMonth === endMonth && startYear === endYear) {
    if (startDay === endDay) {
      return `${startStr} ${startMonth}, ${startYear}`;
    }
    return `${startStr} – ${endStr} ${startMonth}, ${startYear}`;
  } else if (startYear === endYear) {
    return `${startStr} ${startMonth} – ${endStr} ${endMonth}, ${startYear}`;
  }
  return `${startStr} ${startMonth} ${startYear} – ${endStr} ${endMonth} ${endYear}`;
};

const IconMap = {
  code: Code2,
  monitor: Monitor,
  users: Users2,
  globe: Globe,
};

const ColorMap = {
  purple: 'bg-purple-100 text-purple-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
};

const IconBgMap = {
  purple: 'bg-purple-700 text-white',
  blue: 'bg-blue-700 text-white',
  green: 'bg-green-700 text-white',
  orange: 'bg-orange-700 text-white',
};

export default function EventCard({
  coverImage,
  title,
  categories,
  registeredCount,
  startDate,
  endDate,
  daysLeftToRegister,
  location,
  isFree,
  teamSizeMin,
  teamSizeMax,
  onRegister,
  onBookmark,
  isBookmarked
}: EventCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white max-w-sm flex flex-col hover:shadow-lg transition-shadow duration-300">
      {/* Hero image area */}
      <div className="relative w-full h-36">
        {!imgError && coverImage ? (
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-sm">
            <span>No Image</span>
          </div>
        )}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBookmark();
          }}
          className="absolute top-2 right-2 bg-gray-900/80 p-1.5 rounded-full text-white hover:bg-gray-900 transition-colors"
          aria-label="Bookmark event"
        >
          <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Info section */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        
        {/* Row 1 */}
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 className="font-bold text-lg text-gray-900 leading-tight">
            {title}
          </h3>
          <div className="flex flex-col items-center justify-center bg-green-50 text-green-700 rounded-lg px-2.5 py-1.5 flex-shrink-0 min-w-[64px]">
            <div className="flex items-center gap-1 font-bold text-sm leading-none">
              <Users2 size={14} />
              <span>{registeredCount}+</span>
            </div>
            <span className="text-[9px] font-semibold mt-0.5 uppercase tracking-wide">Registered</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {categories.map((cat, idx) => {
            const IconCmp = IconMap[cat.icon] || Code2;
            const badgeClasses = ColorMap[cat.color] || ColorMap.purple;
            const iconBgClasses = IconBgMap[cat.color] || IconBgMap.purple;
            
            return (
              <div key={idx} className={`rounded-full px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 ${badgeClasses}`}>
                <div className={`p-0.5 rounded-[3px] ${iconBgClasses}`}>
                  <IconCmp size={10} strokeWidth={3} />
                </div>
                {cat.label}
              </div>
            );
          })}
        </div>

        <div className="w-full h-px border-t border-dashed border-gray-200 mb-3" />

        {/* Row 3 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <Calendar size={14} className="text-purple-700" />
            <span>{formatDateRange(startDate, endDate)}</span>
          </div>
          <div className="bg-orange-50 text-orange-600 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
            <Hourglass size={10} strokeWidth={3} />
            <span>
              {daysLeftToRegister > 0 ? `${daysLeftToRegister} days left` : 'Closed'}
            </span>
          </div>
        </div>

        <div className="w-full h-px border-t border-dashed border-gray-200 mb-3" />

        {/* Row 4 */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-3">
          <MapPin size={14} className="text-purple-700" />
          <span className="truncate">{location}</span>
        </div>

        <div className="w-full h-px border-t border-dashed border-gray-200 mb-3" />

        {/* Row 5 */}
        <div className="flex items-stretch gap-1.5 mt-auto">
          {/* FREE / Registration */}
          <div className="rounded-lg border border-gray-200 px-2 py-1.5 text-center flex-1 flex flex-col justify-center items-center">
            <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
              <Tag size={12} />
              <span>{isFree ? 'FREE' : 'Paid'}</span>
            </div>
            <span className="text-[9px] text-gray-500 font-semibold mt-0.5 uppercase tracking-wide">Reg Fee</span>
          </div>

          {/* Team Size */}
          <div className="rounded-lg border border-gray-200 px-2 py-1.5 text-center flex-1 flex flex-col justify-center items-center">
            <div className="flex items-center gap-1 text-purple-800 font-bold text-xs">
              <Users size={12} />
              <span>
                {teamSizeMin === teamSizeMax 
                  ? teamSizeMax 
                  : `${teamSizeMin}–${teamSizeMax}`}
              </span>
            </div>
            <span className="text-[9px] text-gray-500 font-semibold mt-0.5 uppercase tracking-wide">Team</span>
          </div>

          {/* Register Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegister();
            }}
            className="group relative inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-black text-white font-bold py-1.5 px-3 transition-colors duration-300 flex-[1.5]"
          >
            <span className="whitespace-nowrap text-xs">Register Now</span>
            <span className="relative flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-orange-500 group-hover:text-black transition-colors duration-300 ml-0.5">
              <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[8px] transition-transform duration-300 ease-in-out group-hover:translate-x-[150%] group-hover:-translate-y-[150%]">
                <path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"></path>
              </svg>
              <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute w-[8px] -translate-x-[150%] translate-y-[150%] transition-transform duration-300 ease-in-out delay-100 group-hover:translate-x-0 group-hover:translate-y-0">
                <path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"></path>
              </svg>
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
