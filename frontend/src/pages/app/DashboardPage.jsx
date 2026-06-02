import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';
import {
  DocumentTextIcon, CalendarIcon, CheckCircleIcon,
  LinkIcon, PlusIcon, ArrowTrendingUpIcon, SparklesIcon,
  ClockIcon, CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { day: 'Mon', likes: 120, reach: 450 },
  { day: 'Tue', likes: 180, reach: 620 },
  { day: 'Wed', likes: 150, reach: 530 },
  { day: 'Thu', likes: 240, reach: 780 },
  { day: 'Fri', likes: 200, reach: 710 },
  { day: 'Sat', likes: 310, reach: 920 },
  { day: 'Sun', likes: 280, reach: 860 },
];

const PLATFORM_COLORS = {
  FACEBOOK: 'bg-blue-500',
  INSTAGRAM: 'bg-pink-500',
  TWITTER: 'bg-sky-500',
  LINKEDIN: 'bg-blue-700',
  TIKTOK: 'bg-gray-900',
};

const PLATFORM_ICONS = {
  FACEBOOK: '🔵',
  INSTAGRAM: '📸',
  TWITTER: '🐦',
  LINKEDIN: '💼',
  TIKTOK: '🎵',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, postsRes, scheduledRes] = await Promise.all([
          api.get('/analytics/overview').catch(() => ({ data: null })),
          api.get('/posts?limit=5').catch(() => ({ data: {} })),
          api.get('/posts?status=SCHEDULED&limit=3').catch(() => ({ data: {} })),
        ]);
        setStats(statsRes.data || { totalPosts: 0, scheduledPosts: 0, publishedPosts: 0, accountsCount: 0 });
        setRecentPosts(postsRes.data?.posts || []);
        setScheduledPosts(scheduledRes.data?.posts || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const accountsConnected = stats?.accountsCount ?? 0;
  const hasFirstPost = (stats?.totalPosts ?? 0) > 0;
  const setupSteps = [
    {
      id: 'account',
      label: 'Connect a social account',
      desc: 'Link Instagram, Facebook, LinkedIn…',
      done: accountsConnected > 0,
      href: '/accounts',
      icon: LinkIcon,
    },
    {
      id: 'post',
      label: 'Create your first post',
      desc: 'Draft, schedule or publish content',
      done: hasFirstPost,
      href: '/compose',
      icon: DocumentTextIcon,
    },
    {
      id: 'calendar',
      label: 'View your content calendar',
      desc: 'See all your scheduled content',
      done: false,
      href: '/calendar',
      icon: CalendarIcon,
    },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;
  const showSetup = setupDone < setupSteps.length;

  const statCards = [
    { label: 'Total Posts', value: stats?.totalPosts ?? 0, icon: DocumentTextIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Scheduled', value: stats?.scheduledPosts ?? 0, icon: ClockIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Published', value: stats?.publishedPosts ?? 0, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Connected Accounts', value: accountsConnected, icon: LinkIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Here's your social media overview</p>
        </div>
        <Link to="/compose" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Trial banner */}
      {user?.subscription?.status === 'TRIALING' && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-indigo-800 text-sm">🎁 You're on a 7-day free trial</p>
            <p className="text-indigo-500 text-xs mt-0.5">Upgrade to keep access after your trial ends</p>
          </div>
          <Link to="/settings/billing" className="btn-primary text-xs">Upgrade now</Link>
        </div>
      )}

      {/* Setup checklist — show until all steps done */}
      {showSetup && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Let's finish your setup</h2>
              <p className="text-xs text-gray-400 mt-0.5">{setupDone} of {setupSteps.length} steps complete</p>
            </div>
            {/* Progress bar */}
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(setupDone / setupSteps.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {setupSteps.map(({ id, label, desc, done, href, icon: Icon }) => (
              <Link
                key={id}
                to={done ? '#' : href}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${done ? 'opacity-60 cursor-default' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-indigo-50'}`}>
                  {done
                    ? <CheckBadgeIcon className="w-5 h-5 text-green-500" />
                    : <Icon className="w-5 h-5 text-indigo-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                {!done && (
                  <span className="text-xs text-indigo-600 font-medium flex-shrink-0">Start →</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-sm text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart + Upcoming + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Engagement chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Engagement (7 days)</h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 bg-indigo-500 rounded inline-block" />Likes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 bg-purple-400 rounded inline-block" />Reach
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
              />
              <Area type="monotone" dataKey="likes" stroke="#6366f1" strokeWidth={2.5} fill="url(#gLikes)" dot={false} />
              <Area type="monotone" dataKey="reach" stroke="#a78bfa" strokeWidth={2.5} fill="url(#gReach)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming scheduled posts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Posts</h2>
            <Link to="/calendar" className="text-xs text-indigo-600 hover:underline">View calendar</Link>
          </div>
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-6">
              <CalendarIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No scheduled posts</p>
              <Link to="/compose" className="text-xs text-indigo-600 hover:underline mt-1 block">
                Schedule your first post →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <ClockIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{post.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent Posts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent posts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Posts</h2>
            <Link to="/posts" className="text-sm text-indigo-600 hover:underline font-medium">View all</Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="py-12 text-center">
              <DocumentTextIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No posts yet</p>
              <Link to="/compose" className="btn-primary mt-4 inline-flex text-sm">
                <PlusIcon className="w-4 h-4" />
                Create your first post
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPosts.map((post) => (
                <Link key={post.id} to={`/compose/${post.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{post.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                        post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        post.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {post.status}
                      </span>
                      {post.accounts?.map((a) => (
                        <span key={a.id} className="text-xs text-gray-400">
                          {PLATFORM_ICONS[a.socialAccount?.platform] || ''} {a.socialAccount?.platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/compose" className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm">
                <PlusIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-800">Create Post</p>
                <p className="text-xs text-indigo-500">Draft, schedule or publish</p>
              </div>
            </Link>
            <Link to="/calendar" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">View Calendar</p>
                <p className="text-xs text-gray-400">See scheduled posts</p>
              </div>
            </Link>
            <Link to="/accounts" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Connect Account</p>
                <p className="text-xs text-gray-400">Add a social platform</p>
              </div>
            </Link>
            <Link to="/analytics" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">View Analytics</p>
                <p className="text-xs text-gray-400">Track performance</p>
              </div>
            </Link>
            <Link to="/compose" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">AI Generate</p>
                <p className="text-xs text-gray-400">Write with AI assistance</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
