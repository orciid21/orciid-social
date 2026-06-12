import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LinkIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { PLATFORM_LOGOS } from '../../utils/platforms';

const PLATFORMS = [
  { id: 'FACEBOOK', name: 'Facebook', desc: 'Publish to your Facebook Pages' },
  { id: 'INSTAGRAM', name: 'Instagram', desc: 'Business & creator accounts' },
  { id: 'TWITTER', name: 'Twitter / X', desc: 'Posts, replies & threads' },
  { id: 'LINKEDIN', name: 'LinkedIn', desc: 'Personal profiles & pages' },
  { id: 'TIKTOK', name: 'TikTok', desc: 'Video posts (coming soon)' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Facebook Page picker
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbPages, setFbPages] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbSaving, setFbSaving] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState([]);

  useEffect(() => {
    // Show notifications from OAuth callback
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) toast.success(`${connected} connected successfully!`);
    if (error) toast.error(`Failed to connect: ${error.replace('_', ' ')}`);
    // After Facebook OAuth, let the user choose which Page(s) to connect.
    if (searchParams.get('select') === 'facebook') openFacebookPicker();
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSelectParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('select');
    setSearchParams(next, { replace: true });
  };

  const openFacebookPicker = async () => {
    setFbModalOpen(true);
    setFbLoading(true);
    try {
      const res = await api.get('/social/facebook/pages');
      const pages = res.data.pages || [];
      setFbPages(pages);
      // Pre-select already-connected Pages; if none, pre-select all.
      const preconnected = pages.filter((p) => p.alreadyConnected).map((p) => p.id);
      setSelectedPageIds(preconnected.length ? preconnected : pages.map((p) => p.id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load your Facebook Pages');
      closeFacebookPicker();
    } finally {
      setFbLoading(false);
    }
  };

  const closeFacebookPicker = () => {
    setFbModalOpen(false);
    setFbPages([]);
    setSelectedPageIds([]);
    clearSelectParam();
  };

  const togglePage = (id) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const confirmFacebookPages = async () => {
    if (selectedPageIds.length === 0) return toast.error('Select at least one Page');
    try {
      setFbSaving(true);
      const res = await api.post('/social/facebook/pages/connect', { pageIds: selectedPageIds });
      const n = res.data.connected;
      toast.success(`${n} Page${n === 1 ? '' : 's'} connected!`);
      await fetchAccounts();
      closeFacebookPicker();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to connect Pages');
    } finally {
      setFbSaving(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/social');
      setAccounts(res.data);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platformId) => {
    if (platformId === 'TIKTOK') {
      toast('TikTok integration coming soon!', { icon: '🚧' });
      return;
    }
    try {
      setConnecting(platformId);
      const res = await api.get(`/social/connect/${platformId}`);
      window.location.href = res.data.url;
    } catch {
      toast.error('Failed to start OAuth flow');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (accountId, name) => {
    if (!confirm(`Disconnect ${name}?`)) return;
    try {
      await api.delete(`/social/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.success('Account disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Accounts</h1>
        <p className="text-gray-500 text-sm mt-1">Connect your social media accounts to start publishing</p>
      </div>

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Connected ({accounts.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {accounts.map((acc) => {
              const platform = PLATFORMS.find((p) => p.id === acc.platform);
              return (
                <div key={acc.id} className="flex items-center gap-4 px-5 py-4">
                  <img
                    src={PLATFORM_LOGOS[acc.platform]}
                    alt={platform?.name}
                    className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{acc.name}</p>
                    <p className="text-xs text-gray-500">{platform?.name} · {acc.username ? `@${acc.username}` : 'Connected'}</p>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <button
                    onClick={() => handleDisconnect(acc.id, acc.name)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available platforms */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Account</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {PLATFORMS.map((platform) => {
            const isConnected = connectedPlatforms.has(platform.id);
            const isConnecting = connecting === platform.id;
            return (
              <div key={platform.id} className="flex items-center gap-4 px-5 py-4">
                <img
                  src={PLATFORM_LOGOS[platform.id]}
                  alt={platform.name}
                  className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{platform.name}</p>
                  <p className="text-xs text-gray-500">{platform.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isConnected && (
                    <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  )}
                  {/* Always offer (re)connect. Facebook in particular needs this:
                      a personal profile can't publish, so the user must reconnect
                      and pick a Page — and there was previously no button to do so
                      once any Facebook account was connected. */}
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={isConnecting}
                    className="btn-secondary text-xs"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {isConnecting ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <span className="font-semibold">API credentials required:</span> Each platform requires you to register an app in their developer portal and add the credentials to your <code className="bg-amber-100 px-1 rounded">.env</code> file. See the setup guide for details.
        </p>
      </div>

      {/* Facebook Page picker modal */}
      {fbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={fbSaving ? undefined : closeFacebookPicker}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: '#1877F2' }}
                >
                  𝐟
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Choose Facebook Pages</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pick the Page(s) you want to publish to.</p>
                </div>
              </div>
              <button
                onClick={closeFacebookPicker}
                disabled={fbSaving}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3">
              {fbLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading your Pages…</div>
              ) : fbPages.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <p className="text-sm font-medium text-gray-700">No Pages found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    We couldn&apos;t find any Facebook Pages you manage. Make sure you&apos;re an admin of at least one Page, then reconnect Facebook.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {fbPages.map((pg) => {
                    const selected = selectedPageIds.includes(pg.id);
                    return (
                      <button
                        key={pg.id}
                        onClick={() => togglePage(pg.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                          selected ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pg.avatar ? (
                          <img src={pg.avatar} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ backgroundColor: '#1877F2' }}
                          >
                            {(pg.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{pg.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {pg.category || 'Facebook Page'}
                            {typeof pg.followers === 'number' ? ` · ${pg.followers.toLocaleString()} followers` : ''}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
                          selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                        }`}>
                          {selected && <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!fbLoading && fbPages.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">{selectedPageIds.length} selected</span>
                <div className="flex items-center gap-2">
                  <button onClick={closeFacebookPicker} disabled={fbSaving} className="btn-secondary text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={confirmFacebookPages}
                    disabled={fbSaving || selectedPageIds.length === 0}
                    className="btn-primary text-sm"
                  >
                    {fbSaving ? 'Connecting…' : 'Connect Pages'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
