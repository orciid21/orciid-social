import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';
import ComposeModal from '../compose/ComposeModal';
import ChannelAvatar from '../ChannelAvatar';
import {
  HomeIcon, PencilSquareIcon, CalendarIcon, ChartBarIcon,
  LinkIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  Bars3Icon, XMarkIcon, BellIcon, PlusIcon, ShieldCheckIcon,
  ChevronDownIcon, DocumentTextIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/posts', label: 'Posts', icon: PencilSquareIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon },
  { to: '/accounts', label: 'Accounts', icon: LinkIcon },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/social').then((res) => setAccounts(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openCompose = () => {
    setNewMenuOpen(false);
    setSidebarOpen(false);
    setComposeOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 flex flex-col z-30
        transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Orciid</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* New button + dropdown */}
        <div className="px-4 py-4 relative">
          <button
            onClick={() => setNewMenuOpen((v) => !v)}
            className="btn-primary w-full"
          >
            <PlusIcon className="w-4 h-4" />
            New
            <ChevronDownIcon className="w-4 h-4 ml-auto" />
          </button>

          {newMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNewMenuOpen(false)} />
              <div className="absolute z-50 left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5">
                <button
                  onClick={openCompose}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <DocumentTextIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">Post</span>
                    <span className="block text-xs text-gray-400">Publish content to a channel</span>
                  </span>
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setNewMenuOpen(false); navigate('/accounts'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <Squares2X2Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">Connect a New Channel</span>
                    <span className="block text-xs text-gray-400">Add a social account</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Admin link — only for ADMIN role */}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mt-2 ${
                  isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                }`
              }
            >
              <ShieldCheckIcon className="w-5 h-5 flex-shrink-0" />
              Admin Panel
            </NavLink>
          )}

          {/* Channels */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setChannelsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600"
            >
              <span>Channels</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${channelsOpen ? '' : '-rotate-90'}`} />
            </button>

            {channelsOpen && (
              <div className="mt-1 space-y-0.5">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => navigate('/channel/' + acc.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <ChannelAvatar account={acc} size="w-7 h-7" badge="w-3.5 h-3.5" rounded="rounded-md" />
                    <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{acc.name}</span>
                  </button>
                ))}

                <button
                  onClick={() => navigate('/accounts')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
                >
                  <PlusIcon className="w-4 h-4" /> Connect channels
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-4">
          {/* Trial banner */}
          {user?.subscription?.status === 'TRIALING' && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="font-semibold">7-day trial</span> — Upgrade to keep access
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-500 transition-colors">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex-1 lg:hidden" />
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <BellIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setComposeOpen(true)}
              className="btn-primary hidden sm:inline-flex"
            >
              <PlusIcon className="w-4 h-4" />
              New Post
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} accounts={accounts} />
    </div>
  );
}
