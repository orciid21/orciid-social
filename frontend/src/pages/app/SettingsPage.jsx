import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { PLATFORM_META } from '../../utils/platforms';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon, AdjustmentsHorizontalIcon, BellIcon,
  BuildingOffice2Icon, UsersIcon, Squares2X2Icon, CreditCardIcon,
  TagIcon, FolderIcon, ChatBubbleLeftRightIcon,
  PlusIcon, TrashIcon, ClipboardIcon, CheckIcon, ArrowUpRightIcon,
} from '@heroicons/react/24/outline';

/* ------------------------------------------------------------------ */
/* small shared bits                                                   */
/* ------------------------------------------------------------------ */

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

function Avatar({ name, src, size = 40 }) {
  const s = { width: size, height: size };
  if (src) return <img src={src} alt={name} style={s} className="rounded-full object-cover" />;
  return (
    <div style={s} className="rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
      {initials(name)}
    </div>
  );
}

const ROLE_STYLES = {
  OWNER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-primary-100 text-primary-700',
  MEMBER: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-gray-100 text-gray-500',
};
function RoleBadge({ role }) {
  const label = role.charAt(0) + role.slice(1).toLowerCase();
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[role] || ROLE_STYLES.MEMBER}`}>{label}</span>;
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function PanelHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// localStorage-backed state for the lightweight feature panels.
function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const save = useCallback((next) => {
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);
  return [val, save];
}

/* ------------------------------------------------------------------ */
/* Account › Profile                                                   */
/* ------------------------------------------------------------------ */

function ProfilePanel() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', { name: profile.name });
      updateUser({ ...user, name: res.data.name });
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) return toast.error('Passwords do not match');
    if (pw.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.patch('/users/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <PanelHeader title="Profile" subtitle="Your personal account details" />
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile.name} src={user?.avatar} size={64} />
          <div>
            <p className="font-semibold text-gray-900">{profile.name || 'Your name'}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input bg-gray-50" value={profile.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email can’t be changed</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
        </form>
      </div>

      <div className="border-t border-gray-100 pt-8">
        <PanelHeader title="Change Password" subtitle="Use at least 8 characters" />
        <form onSubmit={savePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" placeholder="••••••••" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" placeholder="Min. 8 characters" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" placeholder="Repeat new password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Updating…' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account › Preferences                                               */
/* ------------------------------------------------------------------ */

const TIMEZONES = ['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'UTC'];

function PreferencesPanel() {
  const [prefs, setPrefs] = useLocalState('orciid-prefs', {
    timezone: 'Africa/Cairo', timeFormat: '12h', weekStart: 'Sunday',
  });
  const set = (k, v) => setPrefs({ ...prefs, [k]: v });
  return (
    <div>
      <PanelHeader title="Preferences" subtitle="Defaults used across your workspace" />
      <div className="space-y-5 max-w-lg">
        <div>
          <label className="label">Time zone</label>
          <select className="input" value={prefs.timezone} onChange={(e) => set('timezone', e.target.value)}>
            {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">Scheduling times are shown in this zone.</p>
        </div>
        <div>
          <label className="label">Time format</label>
          <div className="flex gap-2">
            {['12h', '24h'].map((f) => (
              <button key={f} onClick={() => set('timeFormat', f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${prefs.timeFormat === f ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {f === '12h' ? '12-hour' : '24-hour'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Week starts on</label>
          <div className="flex gap-2">
            {['Sunday', 'Monday'].map((d) => (
              <button key={d} onClick={() => set('weekStart', d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${prefs.weekStart === d ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-green-600">Preferences are saved automatically.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account › Notifications                                             */
/* ------------------------------------------------------------------ */

const NOTIF_OPTIONS = [
  { key: 'postPublished', label: 'Post published', desc: 'Email me when a scheduled post goes live' },
  { key: 'postFailed', label: 'Post failed', desc: 'Email me if a post fails to publish' },
  { key: 'weeklyDigest', label: 'Weekly performance digest', desc: 'A summary of your reach and engagement' },
  { key: 'productUpdates', label: 'Product updates', desc: 'New features and improvements from Orciid' },
];

function NotificationsPanel() {
  const [notif, setNotif] = useLocalState('orciid-notif', {
    postPublished: true, postFailed: true, weeklyDigest: false, productUpdates: true,
  });
  return (
    <div>
      <PanelHeader title="Notifications" subtitle="Choose what Orciid emails you about" />
      <div className="divide-y divide-gray-100 max-w-xl border border-gray-100 rounded-xl">
        {NOTIF_OPTIONS.map((o) => (
          <div key={o.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium text-gray-900 text-sm">{o.label}</p>
              <p className="text-xs text-gray-500">{o.desc}</p>
            </div>
            <Toggle checked={!!notif[o.key]} onChange={(v) => setNotif({ ...notif, [o.key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization › General                                              */
/* ------------------------------------------------------------------ */

function GeneralPanel({ team, reload }) {
  const [name, setName] = useState(team?.workspace?.name || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(team?.workspace?.name || ''); }, [team?.workspace?.name]);

  const canEdit = team && (team.currentRole === 'OWNER' || team.currentRole === 'ADMIN');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await api.patch('/workspaces/team', { name }); toast.success('Workspace updated'); reload(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PanelHeader title="General" subtitle="Your workspace identity" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-bold">
          {initials(name || 'W')}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{name || 'Workspace'}</p>
          <p className="text-sm text-gray-500">{team?.members?.length || 0} member{(team?.members?.length || 0) === 1 ? '' : 's'}</p>
        </div>
      </div>
      <form onSubmit={save} className="space-y-4 max-w-lg">
        <div>
          <label className="label">Workspace name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          {!canEdit && <p className="text-xs text-gray-400 mt-1">Only owners and admins can rename the workspace.</p>}
        </div>
        {canEdit && <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization › Team Members  ⭐                                      */
/* ------------------------------------------------------------------ */

function TeamPanel({ team, reload, loading }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);

  if (loading || !team) {
    return <div className="text-gray-400 text-sm">Loading team…</div>;
  }

  const canManage = team.currentRole === 'OWNER' || team.currentRole === 'ADMIN';

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post('/workspaces/team/invite', { email: email.trim(), role });
      setEmail('');
      toast.success('Invitation sent');
      reload();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to invite'); }
    finally { setBusy(false); }
  };

  const changeRole = async (userId, newRole) => {
    try { await api.patch(`/workspaces/team/members/${userId}`, { role: newRole }); reload(); toast.success('Role updated'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to update role'); }
  };
  const removeMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from the workspace?`)) return;
    try { await api.delete(`/workspaces/team/members/${userId}`); reload(); toast.success('Member removed'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to remove'); }
  };
  const cancelInvite = async (id) => {
    try { await api.delete(`/workspaces/team/invites/${id}`); reload(); }
    catch { toast.error('Failed to cancel invite'); }
  };
  const copyLink = (token) => {
    const link = `${window.location.origin}/register`;
    navigator.clipboard?.writeText(link).then(() => { setCopied(token); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  };

  return (
    <div>
      <PanelHeader title="Team Members" subtitle="Invite your team and manage what they can do" />

      {/* Invite */}
      {canManage && (
        <form onSubmit={invite} className="bg-primary-50/60 border border-primary-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="label">Invite by email</label>
            <input className="input bg-white" type="email" placeholder="teammate@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="sm:w-40">
            <label className="label">Role</label>
            <select className="input bg-white" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={busy} className="btn-primary whitespace-nowrap">
            <PlusIcon className="w-4 h-4 inline -mt-0.5 mr-1" />{busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      )}

      {/* Members */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Members · {team.members.length}</p>
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-8">
        {team.members.map((m) => {
          const isSelf = m.id === team.currentUserId;
          const editable = canManage && m.role !== 'OWNER';
          return (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <Avatar name={m.name} src={m.avatar} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{m.name}{isSelf && <span className="text-gray-400 font-normal"> (you)</span>}</p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              </div>
              {editable ? (
                <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white">
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              ) : <RoleBadge role={m.role} />}
              {editable && (
                <button onClick={() => removeMember(m.id, m.name)} className="text-gray-300 hover:text-red-500 p-1" title="Remove">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {team.invitations.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pending invitations · {team.invitations.length}</p>
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-8">
            {team.invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500">Invited as {inv.role.toLowerCase()} · will join when they sign up</p>
                </div>
                <RoleBadge role="PENDING" />
                {canManage && (
                  <>
                    <button onClick={() => copyLink(inv.token)} className="text-gray-400 hover:text-primary-600 p-1" title="Copy sign-up link">
                      {copied === inv.token ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => cancelInvite(inv.id)} className="text-gray-300 hover:text-red-500 p-1" title="Cancel">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Roles legend */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm">
        <p className="font-semibold text-gray-700 mb-2">What roles can do</p>
        <ul className="space-y-1 text-gray-600">
          <li><span className="font-medium text-amber-700">Owner</span> — full control, including billing and deleting the workspace.</li>
          <li><span className="font-medium text-primary-700">Admin</span> — manage team members, channels and all content.</li>
          <li><span className="font-medium text-gray-700">Member</span> — create, schedule and publish posts.</li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization › Channels                                             */
/* ------------------------------------------------------------------ */

function ChannelsPanel() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState(null);
  useEffect(() => { api.get('/social').then((r) => setAccounts(r.data)).catch(() => setAccounts([])); }, []);

  return (
    <div>
      <PanelHeader title="Channels" subtitle="Social accounts connected to this workspace">
        <button onClick={() => navigate('/accounts')} className="btn-primary whitespace-nowrap">
          <PlusIcon className="w-4 h-4 inline -mt-0.5 mr-1" />Connect channel
        </button>
      </PanelHeader>
      {accounts === null ? (
        <p className="text-gray-400 text-sm">Loading channels…</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-500 mb-3">No channels connected yet.</p>
          <button onClick={() => navigate('/accounts')} className="btn-secondary">Connect your first channel</button>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
          {accounts.map((a) => {
            const meta = PLATFORM_META[a.platform] || {};
            return (
              <div key={a.id} className="flex items-center gap-3 p-4">
                {meta.logo
                  ? <img src={meta.logo} alt={meta.label} className="w-9 h-9 rounded-lg" />
                  : <div className="w-9 h-9 rounded-lg bg-gray-200" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{meta.label || a.platform}{a.username ? ` · @${a.username}` : ''}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Connected</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization › Billing                                              */
/* ------------------------------------------------------------------ */

function BillingPanel() {
  const navigate = useNavigate();
  return (
    <div>
      <PanelHeader title="Billing" subtitle="Your plan and payment details" />
      <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6 max-w-lg mb-5">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">Free trial</p>
        <p className="text-sm text-gray-500 mt-1">You’re on a 7-day trial. Upgrade any time to keep publishing without limits.</p>
        <button onClick={() => navigate('/settings/billing')} className="btn-primary mt-4">
          Manage subscription <ArrowUpRightIcon className="w-4 h-4 inline -mt-0.5 ml-0.5" />
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Need a custom plan for your agency? <button onClick={() => navigate('/pricing')} className="text-primary-600 font-medium hover:underline">See all plans</button>.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features › Tags                                                     */
/* ------------------------------------------------------------------ */

const TAG_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

function TagsPanel() {
  const [tags, setTags] = useLocalState('orciid-tags', []);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setTags([...tags, { id: `${Date.now()}`, name: name.trim(), color }]);
    setName('');
  };
  const remove = (id) => setTags(tags.filter((t) => t.id !== id));
  return (
    <div>
      <PanelHeader title="Tags" subtitle="Color-code and organize your posts" />
      <form onSubmit={add} className="flex gap-2 items-end mb-5 max-w-lg">
        <div className="flex-1">
          <label className="label">Tag name</label>
          <input className="input" placeholder="e.g. Campaign, Promo" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)} style={{ background: c }}
                className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} />
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary"><PlusIcon className="w-4 h-4" /></button>
      </form>
      {tags.length === 0 ? (
        <p className="text-gray-400 text-sm">No tags yet — add your first one above.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: t.color }}>
              {t.name}
              <button onClick={() => remove(t.id)} className="opacity-80 hover:opacity-100"><TrashIcon className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features › Channel Groups                                           */
/* ------------------------------------------------------------------ */

function GroupsPanel() {
  const [groups, setGroups] = useLocalState('orciid-groups', []);
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState([]);
  useEffect(() => { api.get('/social').then((r) => setAccounts(r.data)).catch(() => {}); }, []);

  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setGroups([...groups, { id: `${Date.now()}`, name: name.trim(), channelIds: picked }]);
    setName(''); setPicked([]);
  };
  const remove = (id) => setGroups(groups.filter((g) => g.id !== id));
  const channelName = (id) => accounts.find((a) => a.id === id)?.name || 'channel';

  return (
    <div>
      <PanelHeader title="Channel Groups" subtitle="Bundle channels so you can post to several at once" />
      <form onSubmit={add} className="bg-gray-50 rounded-xl p-4 mb-6 max-w-xl">
        <label className="label">Group name</label>
        <input className="input bg-white mb-3" placeholder="e.g. All brand accounts" value={name} onChange={(e) => setName(e.target.value)} />
        {accounts.length > 0 && (
          <>
            <label className="label">Channels in this group</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {accounts.map((a) => {
                const meta = PLATFORM_META[a.platform] || {};
                const on = picked.includes(a.id);
                return (
                  <button type="button" key={a.id} onClick={() => toggle(a.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm ${on ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 bg-white'}`}>
                    {meta.logo && <img src={meta.logo} className="w-4 h-4 rounded" alt="" />}{a.name}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button type="submit" className="btn-primary"><PlusIcon className="w-4 h-4 inline -mt-0.5 mr-1" />Create group</button>
      </form>
      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">No groups yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{g.name}</p>
                <p className="text-xs text-gray-500">{g.channelIds.length ? g.channelIds.map(channelName).join(', ') : 'No channels'}</p>
              </div>
              <button onClick={() => remove(g.id)} className="text-gray-300 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features › Saved Replies                                            */
/* ------------------------------------------------------------------ */

function RepliesPanel() {
  const [replies, setReplies] = useLocalState('orciid-replies', []);
  const [draft, setDraft] = useState({ title: '', text: '' });
  const add = (e) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.text.trim()) return;
    setReplies([...replies, { id: `${Date.now()}`, ...draft }]);
    setDraft({ title: '', text: '' });
  };
  const remove = (id) => setReplies(replies.filter((r) => r.id !== id));
  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Copied'); };
  return (
    <div>
      <PanelHeader title="Saved Replies" subtitle="Reusable snippets for captions and comments" />
      <form onSubmit={add} className="bg-gray-50 rounded-xl p-4 mb-6 max-w-xl space-y-3">
        <input className="input bg-white" placeholder="Title (e.g. Thank you reply)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea className="input bg-white" rows={3} placeholder="Write the reusable text…" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <button type="submit" className="btn-primary"><PlusIcon className="w-4 h-4 inline -mt-0.5 mr-1" />Save reply</button>
      </form>
      {replies.length === 0 ? (
        <p className="text-gray-400 text-sm">No saved replies yet.</p>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                <div className="flex gap-1">
                  <button onClick={() => copy(r.text)} className="text-gray-400 hover:text-primary-600 p-1" title="Copy"><ClipboardIcon className="w-4 h-4" /></button>
                  <button onClick={() => remove(r.id)} className="text-gray-300 hover:text-red-500 p-1" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [section, setSection] = useState(() => (window.location.hash || '').replace('#', '') || 'profile');
  const [team, setTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);

  const loadTeam = useCallback(() => {
    setTeamLoading(true);
    api.get('/workspaces/team')
      .then((r) => setTeam(r.data))
      .catch(() => setTeam(null))
      .finally(() => setTeamLoading(false));
  }, []);
  useEffect(() => { loadTeam(); }, [loadTeam]);

  const NAV = [
    { group: 'Account', items: [
      { id: 'profile', label: 'Profile', icon: UserCircleIcon },
      { id: 'preferences', label: 'Preferences', icon: AdjustmentsHorizontalIcon },
      { id: 'notifications', label: 'Notifications', icon: BellIcon },
    ] },
    { group: 'Organization', items: [
      { id: 'general', label: 'General', icon: BuildingOffice2Icon },
      { id: 'team', label: 'Team Members', icon: UsersIcon, badge: team?.members?.length },
      { id: 'channels', label: 'Channels', icon: Squares2X2Icon },
      { id: 'billing', label: 'Billing', icon: CreditCardIcon },
    ] },
    { group: 'Features', items: [
      { id: 'tags', label: 'Tags', icon: TagIcon },
      { id: 'groups', label: 'Channel Groups', icon: FolderIcon },
      { id: 'replies', label: 'Saved Replies', icon: ChatBubbleLeftRightIcon },
    ] },
  ];

  const go = (id) => { setSection(id); window.history.replaceState(null, '', `#${id}`); };

  const render = () => {
    switch (section) {
      case 'profile': return <ProfilePanel />;
      case 'preferences': return <PreferencesPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'general': return <GeneralPanel team={team} reload={loadTeam} />;
      case 'team': return <TeamPanel team={team} reload={loadTeam} loading={teamLoading} />;
      case 'channels': return <ChannelsPanel />;
      case 'billing': return <BillingPanel />;
      case 'tags': return <TagsPanel />;
      case 'groups': return <GroupsPanel />;
      case 'replies': return <RepliesPanel />;
      default: return <ProfilePanel />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* sidebar */}
        <nav className="md:w-56 shrink-0 space-y-5">
          {NAV.map((grp) => (
            <div key={grp.group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">{grp.group}</p>
              <div className="space-y-0.5">
                {grp.items.map((it) => {
                  const Icon = it.icon;
                  const active = section === it.id;
                  return (
                    <button key={it.id} onClick={() => go(it.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-left">{it.label}</span>
                      {typeof it.badge === 'number' && it.badge > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{it.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="card p-6 md:p-8">{render()}</div>
        </div>
      </div>
    </div>
  );
}
