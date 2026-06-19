import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  PlusIcon, PencilIcon, TrashIcon, PaperAirplaneIcon, DocumentTextIcon,
  ClockIcon, CheckBadgeIcon, ChatBubbleLeftRightIcon, ChartBarIcon, LockClosedIcon,
  HandThumbUpIcon, ChatBubbleOvalLeftIcon, EyeIcon, ShareIcon, CursorArrowRaysIcon,
  CheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import ChannelAvatar from '../../components/ChannelAvatar';

// Buffer-style per-channel Publish hub. Channel sub-nav = Publish (live) +
// Community/Analytics (phase 2). Publish tabs = Queue / Drafts / Approvals / Sent.
const TABS = [
  { key: 'queue', label: 'Queue', status: 'SCHEDULED' },
  { key: 'drafts', label: 'Drafts', status: 'DRAFT' },
  { key: 'approvals', label: 'Approvals', status: 'PENDING_APPROVAL' },
  { key: 'sent', label: 'Sent', status: 'PUBLISHED' },
];

const dayKey = (d) => format(new Date(d), 'EEEE, MMMM d');

function MetricsRow({ post }) {
  // Per-post analytics aren't fetched yet (phase 2); show the Buffer-style row.
  const a = post.analytics?.[0] || {};
  const items = [
    { icon: HandThumbUpIcon, label: 'Likes', value: a.likes ?? 0 },
    { icon: ChatBubbleOvalLeftIcon, label: 'Comments', value: a.comments ?? 0 },
    { icon: EyeIcon, label: 'Impressions', value: a.impressions ?? 0 },
    { icon: ShareIcon, label: 'Shares', value: a.shares ?? 0 },
    { icon: CursorArrowRaysIcon, label: 'Clicks', value: a.clicks ?? 0 },
  ];
  return (
    <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-100 flex-wrap">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-gray-500">
          <Icon className="w-4 h-4" />
          <span className="text-xs">{label}</span>
          <span className="text-sm font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChannelPublishPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('queue');
  const [role, setRole] = useState('OWNER');

  const load = async () => {
    setLoading(true);
    try {
      const [accRes, postRes, teamRes] = await Promise.all([
        api.get('/social'),
        api.get('/posts', { params: { limit: 200 } }),
        api.get('/workspaces/team').catch(() => null),
      ]);
      setAccount(accRes.data.find((a) => a.id === accountId) || null);
      setPosts(postRes.data.posts || []);
      if (teamRes?.data?.currentRole) setRole(teamRes.data.currentRole);
    } catch { toast.error('Failed to load channel'); }
    finally { setLoading(false); }
  };

  const canReview = role === 'OWNER' || role === 'ADMIN';
  const handleApprove = async (id) => {
    try { await api.post(`/posts/${id}/approve`); toast.success('Approved'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to approve'); }
  };
  const handleReject = async (id) => {
    try { await api.post(`/posts/${id}/reject`); toast.success('Sent back to drafts'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to reject'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [accountId]);

  // Posts that include this channel.
  const channelPosts = useMemo(
    () => posts.filter((p) => p.accounts?.some((pa) => pa.socialAccount?.id === accountId)),
    [posts, accountId]
  );
  const counts = useMemo(() => {
    const c = {};
    for (const t of TABS) c[t.key] = channelPosts.filter((p) => p.status === t.status).length;
    return c;
  }, [channelPosts]);

  const tabPosts = channelPosts
    .filter((p) => p.status === TABS.find((t) => t.key === tab).status)
    .sort((a, b) => new Date(b.publishedAt || b.scheduledAt || b.createdAt) - new Date(a.publishedAt || a.scheduledAt || a.createdAt));

  // Group by day for the Sent (and Queue) timeline look.
  const grouped = useMemo(() => {
    const g = {};
    for (const p of tabPosts) {
      const k = dayKey(p.publishedAt || p.scheduledAt || p.createdAt);
      (g[k] = g[k] || []).push(p);
    }
    return Object.entries(g);
  }, [tabPosts]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };
  const handlePublishNow = async (id) => {
    try {
      await api.post(`/posts/${id}/publish`);
      toast.success('Post queued for publishing');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to publish'); }
  };

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;
  if (!account) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 mb-4">Channel not found.</p>
        <Link to="/accounts" className="btn-primary inline-flex">Go to Accounts</Link>
      </div>
    );
  }

  const subNav = [
    { key: 'publish', label: 'Publish', icon: PaperAirplaneIcon, live: true },
    { key: 'community', label: 'Community', icon: ChatBubbleLeftRightIcon, live: false },
    { key: 'analytics', label: 'Analytics', icon: ChartBarIcon, live: false },
  ];

  return (
    <div className="space-y-5">
      {/* Channel header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ChannelAvatar account={account} size="w-11 h-11" badge="w-4 h-4" rounded="rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{account.name}</h1>
            <p className="text-xs text-gray-400">{account.username ? `@${account.username}` : account.platform}</p>
          </div>
        </div>
        <Link to="/compose" className="btn-primary"><PlusIcon className="w-4 h-4" /> New Post</Link>
      </div>

      {/* Channel sub-nav: Publish (live) + Community / Analytics (phase 2) */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {subNav.map(({ key, label, icon: Icon, live }) => (
          <button
            key={key}
            disabled={!live}
            title={live ? '' : 'Coming in phase 2'}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              key === 'publish'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-400 cursor-not-allowed'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {!live && <LockClosedIcon className="w-3 h-3" />}
          </button>
        ))}
      </div>

      {/* Publish tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 rounded-full ${tab === t.key ? 'bg-primary-100' : 'bg-gray-100'}`}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'approvals' && counts.approvals === 0 ? (
        <div className="card py-14 text-center">
          <CheckBadgeIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No posts awaiting approval</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            With team roles, members' posts land here for an admin to review and approve before they go live.
          </p>
        </div>
      ) : tabPosts.length === 0 ? (
        <div className="card py-16 text-center">
          {tab === 'sent'
            ? <CheckBadgeIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            : tab === 'queue'
              ? <ClockIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              : <DocumentTextIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />}
          <p className="text-gray-500">Nothing here yet</p>
          <Link to="/compose" className="btn-primary mt-4 inline-flex"><PlusIcon className="w-4 h-4" /> Create Post</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayPosts]) => (
            <div key={day}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{day}</p>
              <div className="space-y-3">
                {dayPosts.map((post) => {
                  const when = post.publishedAt || post.scheduledAt || post.createdAt;
                  return (
                    <div key={post.id} className="card p-4">
                      <div className="flex items-start gap-3">
                        <ChannelAvatar account={account} size="w-9 h-9" badge="w-3.5 h-3.5" rounded="rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{account.name}</span>
                            <span className="text-xs text-gray-400">{format(new Date(when), 'h:mm a')}</span>
                          </div>
                          <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words line-clamp-4">{post.content}</p>
                        </div>
                        {post.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {canReview ? (
                              <>
                                <button onClick={() => handleReject(post.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" title="Reject"><XMarkIcon className="w-4 h-4" /> Reject</button>
                                <button onClick={() => handleApprove(post.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg" title="Approve"><CheckIcon className="w-4 h-4" /> Approve</button>
                              </>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-600 border border-amber-200">Pending review</span>
                            )}
                          </div>
                        ) : post.status !== 'PUBLISHED' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Link to={`/compose/${post.id}`} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Edit"><PencilIcon className="w-4 h-4" /></Link>
                            <button onClick={() => handlePublishNow(post.id)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Publish now"><PaperAirplaneIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      {tab === 'sent' && <MetricsRow post={post} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
