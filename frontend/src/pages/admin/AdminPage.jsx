import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';

const PLAN_COLORS = {
  FREE: 'bg-gray-100 text-gray-700',
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

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null); // { id, role, plan, status }
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
      const { data } = await api.get('/admin/users', { params: { page, limit: 20, search: q } });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStats();
    fetchUsers(1, '');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">Orciid Social — Manage subscribers & users</p>
          </div>
        </div>
        <a href="/dashboard" className="text-sm text-indigo-600 hover:underline">← Back to Dashboard</a>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        {stats && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.totalUsers} color="text-indigo-600" />
              <StatCard label="Active Subscribers" value={stats.statusSummary.ACTIVE || 0} color="text-green-600" />
              <StatCard label="On Trial" value={stats.statusSummary.TRIALING || 0} color="text-cyan-600" />
              <StatCard label="Total Posts" value={stats.totalPosts} color="text-purple-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard label="Free Plan" value={stats.planSummary.FREE || 0} />
              <StatCard label="Starter Plan" value={stats.planSummary.STARTER || 0} color="text-blue-600" />
              <StatCard label="Pro Plan" value={stats.planSummary.PRO || 0} color="text-purple-600" />
              <StatCard label="Agency Plan" value={stats.planSummary.AGENCY || 0} color="text-yellow-600" />
            </div>
          </div>
        )}

        {/* Recent signups */}
        {stats?.recentUsers?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Signups</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.subscription?.plan] || 'bg-gray-100 text-gray-600'}`}>
                      {u.subscription?.plan || 'NO PLAN'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              All Users ({pagination.total})
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email…"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
                Search
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Posts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">No users found</td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {!u.isVerified && (
                        <span className="text-xs text-orange-500">⚠ unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.subscription?.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {u.subscription?.plan || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.subscription?.status] || 'bg-gray-100 text-gray-500'}`}>
                        {u.subscription?.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${u.role === 'ADMIN' ? 'text-red-600' : 'text-gray-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u._count?.posts || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
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
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => setDeleteConfirm(u)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} users)
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchUsers(pagination.page - 1)}
                    className="text-xs px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchUsers(pagination.page + 1)}
                    className="text-xs px-3 py-1 border rounded disabled:opacity-40 hover:bg-white"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit User</h3>
            <p className="text-sm text-gray-500 mb-5">{editingUser.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="AGENCY">AGENCY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TRIALING">TRIALING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>{deleteConfirm.name}</strong> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
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
