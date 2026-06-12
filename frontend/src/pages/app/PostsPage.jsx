import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, PaperAirplaneIcon,
  DocumentTextIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { PLATFORM_LOGOS } from '../../utils/platforms';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-gray-100 text-gray-500',
};

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...(filter !== 'ALL' && { status: filter }) };
      const res = await api.get('/posts', { params });
      setPosts(res.data.posts);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, [filter, page]);

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
      fetchPosts();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to publish'); }
  };

  const statuses = ['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total posts</p>
        </div>
        <Link to="/compose" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FunnelIcon className="w-4 h-4 text-gray-400" />
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="card">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No posts found</p>
            <Link to="/compose" className="btn-primary mt-4 inline-flex">
              <PlusIcon className="w-4 h-4" /> Create Post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {posts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 px-5 py-4">
                {/* Platform icons */}
                <div className="flex -space-x-1 flex-shrink-0 mt-0.5">
                  {post.accounts?.slice(0, 3).map((pa) => (
                    PLATFORM_LOGOS[pa.socialAccount?.platform] ? (
                      <img
                        key={pa.id}
                        src={PLATFORM_LOGOS[pa.socialAccount?.platform]}
                        alt={pa.socialAccount?.platform}
                        className="w-7 h-7 rounded-full border-2 border-white bg-white object-cover"
                      />
                    ) : (
                      <div
                        key={pa.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white bg-gray-400"
                      >
                        ?
                      </div>
                    )
                  ))}
                  {post.accounts?.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 border-2 border-white">
                      +{post.accounts.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`badge ${STATUS_COLORS[post.status] || 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                    {post.scheduledAt && (
                      <span className="text-xs text-gray-400">
                        📅 {format(new Date(post.scheduledAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="text-xs text-gray-400">
                        ✓ {format(new Date(post.publishedAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  {post.status === 'FAILED' && (() => {
                    const reason = post.accounts?.find((a) => a.failReason)?.failReason || post.failReason;
                    return reason ? (
                      <p className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1 flex items-start gap-1">
                        <span className="flex-shrink-0">⚠️</span>
                        <span className="line-clamp-2">{reason}</span>
                      </p>
                    ) : null;
                  })()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {post.status !== 'PUBLISHED' && (
                    <>
                      <Link
                        to={`/compose/${post.id}`}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Publish now"
                      >
                        <PaperAirplaneIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 10)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 10)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
