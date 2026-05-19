import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api-client';
import { FileUpload } from '../FileUpload';
import { Modal } from '../ui/Modal';
import { Loader2, User, Mail, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user, role } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (url: string) => {
    setPhotoURL(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await apiClient.request('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName,
          photoURL,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[Profile Update Error]', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile Settings"
      description="Update your personal details and upload a profile picture."
    >
      <form onSubmit={handleSave} className="space-y-4 mt-4">
        {/* User Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md dark:border-slate-800">
            <img
              src={photoURL || `https://ui-avatars.com/api/?name=${displayName || user?.email}`}
              alt="Avatar Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
              {user?.email}
            </h4>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              Role: {role}
            </span>
          </div>
        </div>

        {/* Display Name Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
            placeholder="John Doe"
            required
          />
        </div>

        {/* Photo Upload Box */}
        <div className="space-y-1">
          <FileUpload
            label="Profile Picture"
            path={`avatars/${user?.uid}`}
            accept="image/*"
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}

        {success && (
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Profile updated successfully!
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 size={14} className="animate-spin" /> Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
