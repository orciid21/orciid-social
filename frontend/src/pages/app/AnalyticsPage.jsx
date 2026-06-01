import { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#000', '#0A66C2', '#f59e0b'];
const PLATFORM_NAMES = { FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', TWITTER: 'Twitter/X', LINKEDIN: 'LinkedIn', TIKTOK: 'TikTok' };

const StatCard = ({ label, value, sub }) => (
  <div className="card p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() ?? 0}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [accountData, setAccountData] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [o, a] = await Promise.all([
          api.get(`/analytics/overview?days=${days}`),
          api.get(`/analytics/accounts?days=${days}`),
        ]);
        setOverview(o.data);
        setAccountData(a.data.map((d) => ({
          name: PLATFORM_NAMES[d.platform] || d.platform,
          likes: d._sum.likes || 0,
          comments: d._sum.comments || 0,
          shares: d._sum.shares || 0,
          reach: d._sum.reach || 0,
        })));
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [days]);

  const pieData = accountData.map((d) => ({ name: d.name, value: d.reach }));

  const engagement = overview?.engagement || {};
  const totalEngagement = (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your social media performance</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="input w-36 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Likes" value={engagement.likes} />
        <StatCard label="Comments" value={engagement.comments} />
        <StatCard label="Shares" value={engagement.shares} />
        <StatCard label="Total Reach" value={engagement.reach} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Bar chart - engagement by platform */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Engagement by Platform</h2>
          {accountData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No data yet — publish posts to see analytics
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={accountData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="likes" name="Likes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" name="Comments" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" name="Shares" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart - reach by platform */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Reach by Platform</h2>
          {pieData.length === 0 || pieData.every((d) => d.value === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No reach data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Posts Published</p>
          <p className="text-3xl font-bold text-green-600">{overview?.publishedPosts ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">in the last {days} days</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total Engagement</p>
          <p className="text-3xl font-bold text-primary-600">{totalEngagement.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">likes + comments + shares</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Avg. per Post</p>
          <p className="text-3xl font-bold text-purple-600">
            {overview?.publishedPosts ? Math.round(totalEngagement / overview.publishedPosts) : 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">engagement per published post</p>
        </div>
      </div>
    </div>
  );
}
