import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';
import {
  DocumentTextIcon, CalendarIcon, CheckCircleIcon,
  LinkIcon, PlusIcon, ArrowTrendingUpIcon,
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, postsRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/posts?limit=5'),
        ]);
        setStats(statsRes.data);
        setRecentPosts(postsRes.data.posts || []);
      } catch {
        // Use default values if API not connected yet
        setStats({ totalPosts: 0, scheduledPosts: 0, publishedPosts: 0, accountsCount: 0, engagement: {} });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Posts', value: stats?.totalPosts ?? 0, icon: DocumentTextIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Scheduled', value: stats?.scheduledPosts ?? 0, icon: CalendarIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Published', value: stats?.publishedPosts ?? 0, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Connected Accounts', value: stats?.accountsCount ?? 0, icon: LinkIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const platformColors = {
    FACEBOOK: '#1877F2', INSTAGRAM: '#E1306C', TWITTER: '#000',
    LINKEDIN: '#0A66C2', TIKTOK: '#000',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your social media</p>
        </div>
        <Link to="/compose" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Trial banner */}
      {user?.subscription?.status === 'TRIALING' && (
        <div className="card p-4 bg-gradient-to-r from-primary-50 to-purple-50 border-primary-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-primary-800 text-sm">You're on a 7-day free trial</p>
            <p className="text-primary-600 text-xs mt-0.5">Upgrade to keep access after your trial ends</p>
          </div>
          <Link to="/settings/billing" className="btn-primary text-xs">Upgrade now</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Engagement chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Engagement (7 days)</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-primary-500 rounded inline-block" />Likes</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-purple-400 rounded inline-block" />Reach</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="likes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="likes" stroke="#6366f1" strokeWidth={2} fill="url(#likes)" />
              <Area type="monotone" dataKey="reach" stroke="#a78bfa" strokeWidth={2} fill="url(#reach)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/compose" className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <PlusIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-800">Create Post</p>
                <p className="text-xs text-primary-600">Draft, schedule or publish</p>
              </div>
            </Link>
            <Link to="/calendar" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">View Calendar</p>
                <p className="text-xs text-gray-500">See scheduled posts</p>
              </div>
            </Link>
            <Link to="/accounts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Connect Account</p>
                <p className="text-xs text-gray-500">Add a social platform</p>
              </div>
            </Link>
            <Link to="/analytics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">View Analytics</p>
                <p className="text-xs text-gray-500">Track performance</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent posts */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Posts</h2>
          <Link to="/posts" className="text-sm text-primary-600 hover:underline font-medium">View all</Link>
        </div>
        {recentPosts.length === 0 ? (
          <div className="py-12 text-center">
            <DocumentTextIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No posts yet</p>
            <Link to="/compose" className="btn-primary mt-4 inline-flex">
              <PlusIcon className="w-4 h-4" />
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`badge ${
                      post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                      post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                      post.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{post.status}</span>
                    <span className="text-xs text-gray-400">
                      {post.accounts?.map((a) => a.socialAccount?.platform).join(', ')}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
