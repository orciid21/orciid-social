import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserCircleIcon, LockClosedIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', { name: profile.name });
      updateUser({ ...user, name: res.data.name });
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwords.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setSaving(true);
    try {
      await api.patch('/users/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <UserCircleIcon className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              className="input"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input bg-gray-50" value={profile.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <LockClosedIcon className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Repeat new password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Billing shortcut */}
      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCardIcon className="w-5 h-5 text-primary-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Billing & Subscription</h2>
            <p className="text-sm text-gray-500">Manage your plan and payment details</p>
          </div>
        </div>
        <Link to="/settings/billing" className="btn-secondary">Manage</Link>
      </div>
    </div>
  );
}
