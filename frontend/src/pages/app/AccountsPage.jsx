import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { LinkIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PLATFORMS = [
  { id: 'FACEBOOK', name: 'Facebook', color: '#1877F2', icon: '𝐟', desc: 'Pages & personal profiles' },
  { id: 'INSTAGRAM', name: 'Instagram', color: '#E1306C', icon: '📷', desc: 'Business & creator accounts' },
  { id: 'TWITTER', name: 'Twitter / X', color: '#000', icon: '𝕏', desc: 'Posts, replies & threads' },
  { id: 'LINKEDIN', name: 'LinkedIn', color: '#0A66C2', icon: 'in', desc: 'Personal profiles & pages' },
  { id: 'TIKTOK', name: 'TikTok', color: '#000', icon: '♪', desc: 'Video posts (coming soon)' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Show notifications from OAuth callback
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) toast.success(`${connected} connected successfully!`);
    if (error) toast.error(`Failed to connect: ${error.replace('_', ' ')}`);
    fetchAccounts();
  }, []);

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
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: platform?.color }}
                  >
                    {platform?.icon}
                  </div>
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
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: platform.color }}
                >
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{platform.name}</p>
                  <p className="text-xs text-gray-500">{platform.desc}</p>
                </div>
                {isConnected ? (
                  <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={isConnecting}
                    className="btn-secondary text-xs"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
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
    </div>
  );
}
