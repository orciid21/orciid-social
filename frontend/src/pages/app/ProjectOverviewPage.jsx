import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import ChannelAvatar from '../../components/ChannelAvatar';
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon, LinkIcon,
  PlusIcon, CalendarIcon, ArrowRightIcon, HeartIcon,
  ChatBubbleLeftIcon, ArrowPathRoundedSquareIcon, EyeIcon,
} from '@heroicons/react/24/outline';

const fmt = (n) => (n ?? 0).toLocaleString();

const STATUS_STYLES = {
  PUBLISHED: 'bg-green-50 text-green-700',
  SCHEDULED: 'bg-primary-50 text-primary-700',
  PENDING_APPROVAL: 'bg-coral-light/20 text-coral-dark',
  DRAFT: 'bg-gray-100 text-gray-600',
};

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/projects/${projectId}/overview`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this project'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-700 font-medium">{error}</p>
        <Link to="/accounts" className="btn-secondary text-sm mt-4 inline-flex">Back to projects</Link>
      </div>
    );
  }

  const { project, channels, stats, engagement, recentPosts, upcomingPosts } = data;

  const tiles = [
    { label: 'Channels', value: stats.channels, icon: LinkIcon, tint: 'bg-primary-50 text-primary-600' },
    { label: 'Total posts', value: stats.totalPosts, icon: DocumentTextIcon, tint: 'bg-iris-light/15 text-iris-dark' },
    { label: 'Scheduled', value: stats.scheduled, icon: ClockIcon, tint: 'bg-amber-50 text-amber-600' },
    { label: 'Published', value: stats.published, icon: CheckCircleIcon, tint: 'bg-green-50 text-green-600' },
  ];

  const engagementRows = [
    { label: 'Likes', value: engagement.likes, icon: HeartIcon },
    { label: 'Comments', value: engagement.comments, icon: ChatBubbleLeftIcon },
    { label: 'Shares', value: engagement.shares, icon: ArrowPathRoundedSquareIcon },
    { label: 'Impressions', value: engagement.impressions, icon: EyeIcon },
  ];

  return (
    <div className="space-y-5">
      {/* Header + the three things you'd want to do from here */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color || '#5B53FF' }}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <p className="text-sm text-gray-500">
              {stats.channels} channel{stats.channels === 1 ? '' : 's'} · {stats.totalPosts} post
              {stats.totalPosts === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/compose" className="btn-primary text-sm">
            <PlusIcon className="w-4 h-4" /> New post
          </Link>
          <Link to="/calendar" className="btn-secondary text-sm">
            <CalendarIcon className="w-4 h-4" /> Schedule
          </Link>
          <Link to="/accounts" className="btn-secondary text-sm">
            <LinkIcon className="w-4 h-4" /> Add channel
          </Link>
        </div>
      </div>

      {/* Numbers for this project only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className={`inline-flex w-10 h-10 rounded-xl items-center justify-center ${tint}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="text-2xl font-bold text-gray-900 mt-3">{fmt(value)}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Engagement — real totals from published posts, not a projection */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Engagement</h2>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>

          {engagement.total === 0 && engagement.impressions === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Nothing to measure yet — numbers appear once this project&apos;s posts are live.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {engagementRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-gray-100 p-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </span>
                  <div className="text-xl font-bold text-gray-900 mt-1">{fmt(value)}</div>
                </div>
              ))}
            </div>
          )}

          {/* This project's channels */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Channels</h3>
            {channels.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No channels in this project yet.</p>
                <Link to="/accounts" className="btn-secondary text-xs mt-3 inline-flex">
                  <PlusIcon className="w-3.5 h-3.5" /> Add a channel
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => navigate(`/channel/${ch.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ChannelAvatar account={ch} size="w-8 h-8" badge="w-3.5 h-3.5" rounded="rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{ch.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {ch.username ? `@${ch.username}` : ch.platform.toLowerCase()}
                      </p>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coming up + what just went out */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Up next</h2>
              <Link to="/calendar" className="text-xs font-medium text-primary-600">Calendar</Link>
            </div>
            {upcomingPosts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingPosts.map((post) => (
                  <div key={post.id} className="flex items-start gap-2.5">
                    <div className="flex -space-x-1.5 flex-shrink-0 pt-0.5">
                      {post.accounts?.slice(0, 2).map((pa) => (
                        <ChannelAvatar
                          key={pa.id}
                          account={pa.socialAccount}
                          size="w-6 h-6"
                          badge="w-3 h-3"
                          rounded="rounded-md"
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 line-clamp-2">{post.content}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(post.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Recent</h2>
              <Link to="/posts" className="text-xs font-medium text-primary-600">All posts</Link>
            </div>
            {recentPosts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div key={post.id}>
                    <p className="text-xs text-gray-700 line-clamp-2">{post.content}</p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        STATUS_STYLES[post.status] || STATUS_STYLES.DRAFT
                      }`}
                    >
                      {post.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
