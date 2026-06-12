import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  PhotoIcon, CalendarIcon, PaperAirplaneIcon,
  XMarkIcon, DocumentIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import ChannelAvatar from '../../components/ChannelAvatar';
import { PLATFORM_META as PLATFORM_ICONS } from '../../utils/platforms';

const PLATFORM_LIMITS = {
  TWITTER: 280, FACEBOOK: 63206, INSTAGRAM: 2200,
  LINKEDIN: 3000, TIKTOK: 2200,
};

const MAX_FILE_MB = 10;
const isVideoUrl = (url) => /\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i.test(url || '');

export default function ComposePage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState([]); // [{ url, type: 'image' | 'video' }]
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/social').then((res) => setAccounts(res.data)).catch(() => {});
    if (postId) {
      api.get(`/posts/${postId}`).then((res) => {
        const post = res.data;
        setContent(post.content);
        setSelectedAccounts(post.accounts.map((a) => a.socialAccountId));
        if (Array.isArray(post.mediaUrls)) {
          setMedia(post.mediaUrls.filter(Boolean).map((url) => ({ url, type: isVideoUrl(url) ? 'video' : 'image' })));
        }
        if (post.scheduledAt) {
          setScheduledAt(format(new Date(post.scheduledAt), "yyyy-MM-dd'T'HH:mm"));
        }
      }).catch(() => toast.error('Post not found'));
    }
  }, [postId]);

  const toggleAccount = (id) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return toast.error(`File is too large. Maximum size is ${MAX_FILE_MB}MB.`);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMedia((prev) => [...prev, { url: res.data.url, type: res.data.type }]);
      toast.success('Media added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (url) => {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  };

  const handleSave = async (action) => {
    if (!content.trim()) return toast.error('Write something first');
    if (selectedAccounts.length === 0) return toast.error('Select at least one account');
    if (action === 'schedule' && !scheduledAt) return toast.error('Pick a scheduled time');

    const data = {
      content,
      accountIds: selectedAccounts,
      mediaUrls: media.map((m) => m.url),
      // datetime-local gives a naive local string; send an absolute ISO instant
      // so the server can't misread it in its own timezone.
      ...(action === 'schedule' && { scheduledAt: new Date(scheduledAt).toISOString() }),
    };

    try {
      setSaving(true);
      if (postId) {
        await api.patch(`/posts/${postId}`, data);
        toast.success('Post updated');
      } else {
        const res = await api.post('/posts', data);
        if (action === 'publish') {
          await api.post(`/posts/${res.data.id}/publish`);
          toast.success('Post sent for publishing!');
        } else if (action === 'schedule') {
          toast.success('Post scheduled!');
        } else {
          toast.success('Draft saved');
        }
      }
      navigate('/posts');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // Active platform limits
  const activePlatforms = accounts
    .filter((a) => selectedAccounts.includes(a.id))
    .map((a) => a.platform);

  const strictestLimit = activePlatforms.length > 0
    ? Math.min(...activePlatforms.map((p) => PLATFORM_LIMITS[p] || Infinity))
    : null;

  const charCount = content.length;
  const isOverLimit = strictestLimit && charCount > strictestLimit;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{postId ? 'Edit Post' : 'Create Post'}</h1>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Compose area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <label className="label">Content</label>
            <textarea
              className="input resize-none"
              rows={8}
              placeholder="What do you want to share today?..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add image or video"
                >
                  <PhotoIcon className="w-5 h-5" />
                </button>
                {uploading && <span className="text-xs text-gray-400">Uploading…</span>}
              </div>
              <span className={`text-xs ${isOverLimit ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {charCount}{strictestLimit ? `/${strictestLimit}` : ''} characters
                {isOverLimit && ' — Too long!'}
              </span>
            </div>

            {/* Selected media */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                {media.map((m) => (
                  <div key={m.url} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                    {m.type === 'video' ? (
                      <video src={m.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={m.url} alt="media" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(m.url)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white"
                      title="Remove"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                    {m.type === 'video' && (
                      <span className="absolute bottom-1 left-1 text-[10px] font-medium px-1.5 py-0.5 bg-black/60 rounded text-white">
                        Video
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {content && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Preview</h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500" />
                  <div>
                    <div className="h-3 bg-gray-300 rounded w-24" />
                    <div className="h-2.5 bg-gray-200 rounded w-16 mt-1" />
                  </div>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Account selection */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Publish to</h3>
            {accounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No accounts connected</p>
                <button
                  onClick={() => navigate('/accounts')}
                  className="text-xs text-primary-600 font-medium hover:underline"
                >
                  + Connect accounts
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const meta = PLATFORM_ICONS[acc.platform] || {};
                  const selected = selectedAccounts.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => toggleAccount(acc.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        selected ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <ChannelAvatar account={acc} size="w-8 h-8" badge="w-3.5 h-3.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{acc.name}</p>
                        <p className="text-xs text-gray-500">{meta.label}</p>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                      }`}>
                        {selected && <XMarkIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              Schedule (optional)
            </h3>
            <input
              type="datetime-local"
              className="input text-sm"
              value={scheduledAt}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => handleSave('publish')}
              disabled={saving || uploading || isOverLimit}
              className="btn-primary w-full"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {saving ? 'Publishing...' : 'Publish Now'}
            </button>
            {scheduledAt && (
              <button
                onClick={() => handleSave('schedule')}
                disabled={saving || uploading || isOverLimit}
                className="btn-secondary w-full"
              >
                <CalendarIcon className="w-4 h-4" />
                Schedule Post
              </button>
            )}
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="btn-secondary w-full text-gray-600"
            >
              <DocumentIcon className="w-4 h-4" />
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
