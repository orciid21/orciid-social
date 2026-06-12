import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';

import { PLATFORM_LOGOS } from '../../utils/platforms';

// Colors for the tiny per-day chips in the month grid (logos don't fit there).
const PLATFORM_BG = { FACEBOOK: '#1877F2', INSTAGRAM: '#E1306C', TWITTER: '#000', LINKEDIN: '#0A66C2', TIKTOK: '#000' };

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [currentDate]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts/calendar', {
        params: {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        },
      });
      setPosts(res.data);
    } catch { toast.error('Failed to load calendar'); }
    finally { setLoading(false); }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  const dayPosts = (date) => posts.filter((p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), date));
  const selectedPosts = selectedDay ? dayPosts(selectedDay) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <Link to="/compose" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Schedule Post
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="font-semibold text-gray-900 text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding */}
            {Array(startPadding).fill(null).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {/* Days */}
            {days.map((day) => {
              const dp = dayPosts(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  className={`min-h-[60px] p-1.5 rounded-lg text-left transition-all ${
                    isSelected ? 'bg-primary-50 border-2 border-primary-400' :
                    isToday(day) ? 'bg-primary-600 text-white' :
                    'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={`text-xs font-semibold block mb-1 ${isToday(day) && !isSelected ? 'text-white' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dp.slice(0, 2).map((post) => {
                      const platform = post.accounts?.[0]?.socialAccount?.platform;
                      return (
                        <div
                          key={post.id}
                          className="text-xs px-1 py-0.5 rounded text-white truncate"
                          style={{ backgroundColor: PLATFORM_BG[platform] || '#6366f1' }}
                        >
                          {post.content.slice(0, 12)}...
                        </div>
                      );
                    })}
                    {dp.length > 2 && (
                      <div className="text-xs text-gray-400 px-1">+{dp.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Select a day'}
          </h3>
          {!selectedDay ? (
            <p className="text-sm text-gray-500">Click on a day to see scheduled posts</p>
          ) : selectedPosts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">No posts scheduled</p>
              <Link
                to={`/compose`}
                className="btn-primary text-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Schedule post
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedPosts.map((post) => (
                <div key={post.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {post.accounts?.map((pa) => (
                      PLATFORM_LOGOS[pa.socialAccount?.platform] ? (
                        <img
                          key={pa.id}
                          src={PLATFORM_LOGOS[pa.socialAccount?.platform]}
                          alt={pa.socialAccount?.platform}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div key={pa.id} className="w-5 h-5 rounded-full bg-gray-400" />
                      )
                    ))}
                    <span className="text-xs text-gray-500">
                      {post.scheduledAt ? format(new Date(post.scheduledAt), 'h:mm a') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`badge ${post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                    <Link to={`/compose/${post.id}`} className="text-xs text-primary-600 hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
