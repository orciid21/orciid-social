import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  AGENCY: 'bg-yellow-100 text-yellow-800',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIALING: 'bg-cyan-100 text-cyan-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELED: 'bg-gray-100 text-gray-500',
  INCOMPLETE: 'bg-orange-100 text-orange-700',
};

const PLATFORM_ICONS = {
  FACEBOOK: '🔵',
  INSTAGRAM: '📸',
  TWITTER: '🐦',
  LINKEDIN: '💼',
  TIKTOK: '🎵',
};

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [blockingId, setBlockingId] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 20, search: q },
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchEmailStatus = useCallback(async () => {
    setEmailLoading(true);
    try {
      const { data } = await api.get('/admin/email-status');
      setEmailStatus(data);
    } catch (e) {
      setEmailStatus({ ok: false, error: e.response?.data?.error || 'Failed to reach server' });
    } finally {
      setEmailLoading(false);
    }
  }, []);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const { data } = await api.post('/admin/test-email');
      alert(data.message || 'Test email sent — check your inbox.');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers(1, '');
    fetchEmailStatus();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${editingUser.id}`, {
        role: editingUser.role,
        plan: editingUser.plan,
        status: editingUser.status,
      });
      setEditingUser(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async (u) => {
    const isBlocked = u.subscription?.status === 'CANCELED';
    setBlockingId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, {
        status: isBlocked ? 'ACTIVE' : 'CANCELED',
      });
      fetchUsers(pagination.page);
      fetchStats();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    } finally {
      setBlockingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setDeleteConfirm(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete user');
    }
  };

  // Client-side filter
  const filteredUsers = users.filter((u) => {
    if (filterPlan && u.subscription?.plan !== filterPlan) return false;
    if (filterStatus && u.subscription?.status !== filterStatus) return false;
    return true;
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-2">🚫</p>
          <p className="text-xl font-semibold text-gray-700">Admin access only</p>
        </div>
      </div>
    );
  }

  const revenue = stats
    ? (stats.planSummary.STARTER || 0) * 19 +
      (stats.planSummary.PRO || 0) * 49 +
      (stats.planSummary.AGENCY || 0) * 99
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Master Dashboard</h1>
              <p className="text-xs text-gray-400">Orciid Social — Admin Control Center</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
            ← Client View
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Stats */}
        {stats && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Clients" value={stats.totalUsers} color="text-indigo-600" icon="👥" />
              <StatCard
                label="Active Subscribers"
                value={(stats.statusSummary.ACTIVE || 0) + (stats.statusSummary.TRIALING || 0)}
                sub={`${stats.statusSummary.ACTIVE || 0} paid · ${stats.statusSummary.TRIALING || 0} trial`}
                color="text-green-600"
                icon="✅"
              />
              <StatCard
                label="Est. Monthly Revenue"
                value={`$${revenue}`}
                sub="Based on active paid plans"
                color="text-yellow-600"
                icon="💰"
              />
              <StatCard label="Total Posts" value={stats.totalPosts} color="text-purple-600" icon="📝" />
            </div>

            {/* Plan breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard label="Free Plan" value={stats.planSummary.FREE || 0} icon="🆓" />
              <StatCard label="Starter Plan" value={stats.planSummary.STARTER || 0} color="text-blue-600" icon="🚀" />
              <StatCard label="Pro Plan" value={stats.planSummary.PRO || 0} color="text-purple-600" icon="⭐" />
              <StatCard label="Agency Plan" value={stats.planSummary.AGENCY || 0} color="text-yellow-600" icon="🏢" />
            </div>
          </div>
        )}

        {/* System Health — Email / SMTP */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">System Health</h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✉️</span>
                <div>
                  <p className="font-semibold text-gray-900">Email / SMTP</p>
                  {emailLoading ? (
                    <p className="text-sm text-gray-400">Checking connection…</p>
                  ) : emailStatus?.ok ? (
                    <p className="text-sm text-green-600 font-medium">
                      ● Connected — {emailStatus.host}:{emailStatus.port}
                    </p>
                  ) : (
                    <p className="text-sm text-red-500 font-medium">
                      ● Not working — {emailStatus?.error || 'unknown error'}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Sends verification &amp; password-reset emails. Configure SMTP_* env vars on the server.
                  </p>
                </div>
              </div>
              <button
                onClick={handleTestEmail}
                disabled={testingEmail || !emailStatus?.ok}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                title={emailStatus?.ok ? `Send a test email to ${user?.email}` : 'SMTP must be connected first'}
              >
                {testingEmail ? 'Sending…' : 'Send test email'}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Signups */}
        {stats?.recentUsers?.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent Signups</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.subscription?.plan] || 'bg-gray-100 text-gray-600'}`}>
                      {u.subscription?.plan || 'FREE'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              All Clients ({pagination.total})
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Filters */}
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All Plans</option>
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="AGENCY">Agency</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">Trialing</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="CANCELED">Canceled / Blocked</option>
              </select>
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52 bg-white"
                />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 font-medium">
                  Search
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Renewal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Platforms</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Posts</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Joined</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          Loading clients…
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">No clients found</td>
                    </tr>
                  ) : filteredUsers.map((u) => {
                    const isBlocked = u.subscription?.status === 'CANCELED';
                    const renewalDate = u.subscription?.currentPeriodEnd || u.subscription?.trialEndsAt;
                    const days = daysUntil(renewalDate);
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isBlocked ? 'opacity-60' : ''}`}>
                        {/* Client */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 flex items-center gap-1">
                                {u.name}
                                {u.role === 'ADMIN' && <span className="text-xs bg-red-100 text-red-600 px-1 rounded">ADMIN</span>}
                              </p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                              {!u.isVerified && <span className="text-xs text-orange-400">⚠ unverified</span>}
                            </div>
                          </div>
                        </td>
                        {/* Plan */}
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.subscription?.plan] || 'bg-gray-100 text-gray-600'}`}>
                            {u.subscription?.plan || 'FREE'}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.subscription?.status] || 'bg-gray-100 text-gray-500'}`}>
                            {isBlocked ? '🚫 Blocked' : u.subscription?.status || '—'}
                          </span>
                        </td>
                        {/* Renewal */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs text-gray-700">{formatDate(renewalDate)}</p>
                            {days !== null && days > 0 && (
                              <p className={`text-xs ${days <= 7 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {days <= 7 ? `⚠ ${days}d left` : `${days}d`}
                              </p>
                            )}
                            {days !== null && days <= 0 && (
                              <p className="text-xs text-red-500 font-medium">Expired</p>
                            )}
                          </div>
                        </td>
                        {/* Platforms */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-700">{u._count?.socialAccounts || 0}</span>
                            <span className="text-xs text-gray-400">accts</span>
                          </div>
                        </td>
                        {/* Posts */}
                        <td className="px-4 py-3 text-gray-500">{u._count?.posts || 0}</td>
                        {/* Joined */}
                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingUser({
                                id: u.id,
                                name: u.name,
                                role: u.role,
                                plan: u.subscription?.plan || 'FREE',
                                status: u.subscription?.status || 'TRIALING',
                              })}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                            >
                              Edit
                            </button>
                            {u.id !== user.id && (
                              <>
                                <button
                                  onClick={() => handleBlock(u)}
                                  disabled={blockingId === u.id}
                                  className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                                    isBlocked
                                      ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                      : 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                                  }`}
                                >
                                  {blockingId === u.id ? '…' : isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(u)}
                                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} clients
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchUsers(pagination.page - 1)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white font-medium"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchUsers(pagination.page + 1)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white font-medium"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                {editingUser.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Client</h3>
                <p className="text-sm text-gray-400">{editingUser.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                <select
                  value={editingUser.plan}
                  onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER — $19/mo</option>
                  <option value="PRO">PRO — $49/mo</option>
                  <option value="AGENCY">AGENCY — $99/mo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TRIALING">TRIALING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELED">CANCELED (Blocked)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-5xl mb-3">⚠️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Client?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>{deleteConfirm.name}</strong> and all their data, posts, and connected accounts. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
