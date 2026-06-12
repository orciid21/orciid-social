import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ChannelAvatar from '../ChannelAvatar';
import { PLATFORM_META } from '../../utils/platforms';
import {
  PhotoIcon, FaceSmileIcon, HashtagIcon, CalendarIcon,
  PaperAirplaneIcon, XMarkIcon, DocumentIcon,
  HandThumbUpIcon, ChatBubbleOvalLeftIcon, ShareIcon, HeartIcon,
} from '@heroicons/react/24/outline';

const PLATFORM_LIMITS = {
  TWITTER: 280, FACEBOOK: 63206, INSTAGRAM: 2200, LINKEDIN: 3000, TIKTOK: 2200,
};

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳','😉','🙂','🤗','🤔','😴','😇',
  '👍','👏','🙌','🙏','💪','🔥','✨','🎉','🎊','💯','⭐','🌟','❤️','🧡','💛','💚',
  '💙','💜','🖤','💖','💕','😢','😭','😡','😱','👀','🚀','📈','💡','✅','📢','🎁',
];

const MAX_FILE_MB = 10;
const MAX_IMAGE_DIM = 2048; // downscale large images so the upload payload stays small
const isVideoUrl = (url) => /\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i.test(url || '');

// Read a File/Blob as a base64 data URL (data:<mime>;base64,<data>).
const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

// Re-encode an image through a canvas, shrinking it to MAX_IMAGE_DIM on the
// longest side. Returns a data URL, or null if the image can't be processed
// (the caller then falls back to the original file bytes).
const downscaleImage = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const isPng = /png$/i.test(file.type);
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

function Avatar({ account, size = 'w-10 h-10' }) {
  return <ChannelAvatar account={account} size={size} badge="w-4 h-4" />;
}

function PreviewCard({ account, content, media }) {
  const meta = PLATFORM_META[account.platform] || {};
  const first = media[0];
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 p-3">
        <Avatar account={account} size="w-9 h-9" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{account.name}</p>
          <p className="text-xs text-gray-400">Just now · 🌐</p>
        </div>
      </div>
      {content && <p className="px-3 pb-3 text-sm text-gray-800 whitespace-pre-wrap break-words">{content}</p>}
      {first && (
        first.type === 'video'
          ? <video src={first.url} className="w-full max-h-80 object-cover bg-black" controls />
          : <img src={first.url} alt="" className="w-full max-h-80 object-cover" />
      )}
      {account.platform === 'INSTAGRAM' ? (
        <div className="flex items-center gap-4 px-3 py-2.5 text-gray-600">
          <HeartIcon className="w-5 h-5" />
          <ChatBubbleOvalLeftIcon className="w-5 h-5" />
          <PaperAirplaneIcon className="w-5 h-5" />
        </div>
      ) : (
        <div className="flex items-center justify-around px-3 py-2 border-t border-gray-100 text-gray-500 text-xs font-medium">
          <span className="flex items-center gap-1.5"><HandThumbUpIcon className="w-4 h-4" /> Like</span>
          <span className="flex items-center gap-1.5"><ChatBubbleOvalLeftIcon className="w-4 h-4" /> Comment</span>
          <span className="flex items-center gap-1.5"><ShareIcon className="w-4 h-4" /> Share</span>
        </div>
      )}
    </div>
  );
}

export default function ComposeModal({ open, onClose, accounts = [] }) {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [media, setMedia] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Reset everything each time the modal opens; pre-select all channels.
  // Depends only on `open` so a late-arriving channel list never wipes typed content.
  useEffect(() => {
    if (open) {
      setContent('');
      setMedia([]);
      setScheduledAt('');
      setEmojiOpen(false);
      setDragActive(false);
      setSelectedAccounts(accounts.map((a) => a.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleAccount = (id) =>
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const insertAtCaret = (text) => {
    const el = textareaRef.current;
    if (!el) return setContent((c) => c + text);
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setUploading(true);
    let added = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name || 'File'} is too large. Maximum size is ${MAX_FILE_MB}MB.`);
        continue;
      }
      try {
        // Images are re-encoded through a canvas to shrink them; videos/gifs are
        // sent as-is. Either way the file travels as a base64 string inside a JSON
        // body — Hostinger's CDN blocks binary multipart uploads (405), but lets
        // JSON through, so this is what actually makes uploads work in production.
        const isImage = file.type.startsWith('image/') && !/gif$/i.test(file.type);
        let dataUrl = isImage ? await downscaleImage(file) : null;
        if (!dataUrl) dataUrl = await readAsDataURL(file);

        const res = await api.post('/uploads', {
          dataBase64: dataUrl,
          contentType: file.type || undefined,
          name: file.name,
        });
        setMedia((prev) => [...prev, { url: res.data.url, type: res.data.type }]);
        added += 1;
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to upload media');
      }
    }
    setUploading(false);
    if (added > 0) toast.success(added > 1 ? `${added} files added` : 'Media added');
  };

  const handleFileSelect = (e) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Ignore "leave" events fired when the cursor moves onto a child element.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const removeMedia = (url) => setMedia((prev) => prev.filter((m) => m.url !== url));

  const selected = accounts.filter((a) => selectedAccounts.includes(a.id));
  const activePlatforms = selected.map((a) => a.platform);
  const strictestLimit = activePlatforms.length
    ? Math.min(...activePlatforms.map((p) => PLATFORM_LIMITS[p] || Infinity))
    : null;
  const charCount = content.length;
  const isOverLimit = strictestLimit && charCount > strictestLimit;
  const igNeedsImage = activePlatforms.includes('INSTAGRAM') && media.length === 0;

  const handleSave = async (action) => {
    if (!content.trim()) return toast.error('Write something first');
    if (selectedAccounts.length === 0) return toast.error('Select at least one channel');
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
      const res = await api.post('/posts', data);
      if (action === 'publish') {
        await api.post(`/posts/${res.data.id}/publish`);
        toast.success('Post sent for publishing!');
      } else if (action === 'schedule') {
        toast.success('Post scheduled!');
      } else {
        toast.success('Draft saved');
      }
      onClose();
      navigate('/posts');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Create Post</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 grid lg:grid-cols-2 overflow-hidden">
          {/* LEFT: editor */}
          <div className="flex flex-col overflow-y-auto p-5 gap-4">
            {/* Channel selector */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Channels</p>
              {accounts.length === 0 ? (
                <button onClick={() => { onClose(); navigate('/accounts'); }}
                  className="text-sm text-primary-600 font-medium hover:underline">
                  + Connect a channel first
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {accounts.map((acc) => {
                    const on = selectedAccounts.includes(acc.id);
                    return (
                      <button key={acc.id} onClick={() => toggleAccount(acc.id)} title={acc.name}
                        className={`rounded-xl p-0.5 transition-all ${on ? 'ring-2 ring-primary-500' : 'ring-2 ring-transparent opacity-50 hover:opacity-100'}`}>
                        <Avatar account={acc} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Editor */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border rounded-xl p-3 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent ${dragActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-200'}`}
            >
              <textarea
                ref={textareaRef}
                className="w-full resize-none outline-none text-sm min-h-[140px]"
                placeholder="What do you want to share today?..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              {/* Media thumbnails */}
              {media.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {media.map((m) => (
                    <div key={m.url} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                      {m.type === 'video'
                        ? <video src={m.url} className="w-full h-full object-cover" muted />
                        : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                      <button onClick={() => removeMedia(m.url)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white">
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                      {m.type === 'video' && (
                        <span className="absolute bottom-1 left-1 text-[10px] font-medium px-1.5 py-0.5 bg-black/60 rounded text-white">Video</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Buffer-style drag & drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`mt-3 cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 px-4 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50/60 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <PhotoIcon className="w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-primary-600">Drag &amp; drop</span>
                  <span className="text-gray-500"> or </span>
                  <span className="font-semibold text-primary-600">select a file</span>
                </p>
                <p className="text-xs text-gray-400">Images &amp; videos up to {MAX_FILE_MB}MB</p>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 relative">
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Add image or video">
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setEmojiOpen((v) => !v)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Emoji">
                    <FaceSmileIcon className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => insertAtCaret('#')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Hashtag">
                    <HashtagIcon className="w-5 h-5" />
                  </button>
                  {uploading && <span className="text-xs text-gray-400 ml-1">Uploading…</span>}

                  {emojiOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                      <div className="absolute z-20 bottom-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-64 grid grid-cols-8 gap-0.5">
                        {EMOJIS.map((e) => (
                          <button key={e} type="button"
                            onClick={() => { insertAtCaret(e); setEmojiOpen(false); }}
                            className="text-lg hover:bg-gray-100 rounded p-0.5">{e}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span className={`text-xs ${isOverLimit ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {charCount}{strictestLimit ? `/${strictestLimit}` : ''}{isOverLimit ? ' — Too long!' : ''}
                </span>
              </div>
            </div>

            {igNeedsImage && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Instagram requires at least one image to publish.
              </p>
            )}

            {/* Schedule */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" /> Schedule (optional)
              </label>
              <input type="datetime-local" className="input text-sm"
                value={scheduledAt} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="hidden lg:flex flex-col overflow-y-auto bg-gray-50 border-l border-gray-100 p-5 gap-3">
            <p className="text-sm font-semibold text-gray-700">Post Previews</p>
            {selected.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-10">Select a channel to see a preview</div>
            ) : (
              selected.map((acc) => (
                <PreviewCard key={acc.id} account={acc} content={content} media={media} />
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => handleSave('draft')} disabled={saving || uploading}
            className="btn-secondary text-gray-600">
            <DocumentIcon className="w-4 h-4" /> Draft
          </button>
          {scheduledAt && (
            <button onClick={() => handleSave('schedule')} disabled={saving || uploading || isOverLimit}
              className="btn-secondary">
              <CalendarIcon className="w-4 h-4" /> Schedule
            </button>
          )}
          <button onClick={() => handleSave('publish')} disabled={saving || uploading || isOverLimit}
            className="btn-primary">
            <PaperAirplaneIcon className="w-4 h-4" />
            {saving ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
