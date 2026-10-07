import React, { useState, useRef } from 'react';
import { X, Lock, User, Shield, CheckCircle2, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, setCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Edit State
  const [name, setName] = useState(currentUser.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Focus refs for accessible error handling
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updated = await api.auth.updateProfile({ name: name.trim() });
      setCurrentUser({
        ...currentUser,
        name: updated.name,
      });
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required.';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters.';
    } else if (currentPassword && newPassword === currentPassword) {
      newErrors.newPassword = 'Your new password must be different from your current password.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'New passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);

      // Focus first erroneous field
      if (newErrors.currentPassword) {
        currentPasswordRef.current?.focus();
      } else if (newErrors.newPassword) {
        newPasswordRef.current?.focus();
      } else if (newErrors.confirmPassword) {
        confirmPasswordRef.current?.focus();
      }

      // Show toast notification
      if (newErrors.confirmPassword === 'New passwords do not match.') {
        toast.error('New passwords do not match.');
      } else if (newErrors.newPassword === 'Your new password must be different from your current password.') {
        toast.error('Your new password must be different from your current password.');
      } else if (newErrors.newPassword === 'Password must be at least 8 characters.') {
        toast.error('Password must be at least 8 characters.');
      } else if (newErrors.currentPassword) {
        toast.error(newErrors.currentPassword);
      } else if (newErrors.newPassword) {
        toast.error(newErrors.newPassword);
      } else {
        toast.error(newErrors.confirmPassword || 'Please fix the errors in the form.');
      }

      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      await api.auth.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      setCurrentUser({
        ...currentUser,
        must_change_password: false,
      });

      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordErrors({});
      onClose();
    } catch (err: any) {
      const backendErrors: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {};

      if (err.errors) {
        if (err.errors.current_password?.[0]) {
          backendErrors.currentPassword = err.errors.current_password[0];
        }
        if (err.errors.new_password?.[0]) {
          const msg = err.errors.new_password[0];
          if (msg.toLowerCase().includes('match')) {
            backendErrors.confirmPassword = msg;
          } else {
            backendErrors.newPassword = msg;
          }
        }
        if (err.errors.new_password_confirmation?.[0]) {
          backendErrors.confirmPassword = err.errors.new_password_confirmation[0];
        }
      }

      setPasswordErrors(backendErrors);

      if (backendErrors.currentPassword) {
        currentPasswordRef.current?.focus();
      } else if (backendErrors.newPassword) {
        newPasswordRef.current?.focus();
      } else if (backendErrors.confirmPassword) {
        confirmPasswordRef.current?.focus();
      }

      let toastMsg = err.message;
      if (err.status === 500) {
        toastMsg = 'Unable to change your password right now. Please try again later.';
      } else if (backendErrors.currentPassword) {
        toastMsg = backendErrors.currentPassword;
      } else if (backendErrors.confirmPassword) {
        toastMsg = backendErrors.confirmPassword;
      } else if (backendErrors.newPassword) {
        toastMsg = backendErrors.newPassword;
      }
      toast.error(toastMsg || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_director': return 'Center Director';
      case 'admin_finance': return 'Finance Officer';
      case 'admin_hr': return 'HR Administrator';
      case 'staff': return 'Active Staff';
      default: return 'Administrator';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">My Account</h2>
              <p className="text-xs text-white/80">Al-Jalis Cotabato Chapter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#FF6B00] text-[#FF6B00]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#FF6B00] text-[#FF6B00]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Role & Department
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Shield size={16} className="text-[#FF6B00]" />
                  <span className="text-sm font-semibold text-gray-900">{getRoleLabel(currentUser.role)}</span>
                  <span className="text-xs text-gray-500">&bull; {currentUser.department || 'Operations'}</span>
                </div>
              </div>

              {currentUser.email && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#E66000] transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="current_password"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="current_password"
                    ref={currentPasswordRef}
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }));
                      }
                    }}
                    aria-invalid={!!passwordErrors.currentPassword}
                    aria-describedby={passwordErrors.currentPassword ? 'current-password-error' : undefined}
                    className={`w-full px-3.5 py-2.5 pr-10 bg-gray-50 border rounded-xl text-sm focus:bg-white outline-hidden text-gray-900 transition-colors ${
                      passwordErrors.currentPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-hidden cursor-pointer"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p id="current-password-error" className="text-xs text-red-600 mt-1 font-medium" role="alert">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="new_password"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    ref={newPasswordRef}
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordErrors.newPassword) {
                        setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }
                    }}
                    aria-invalid={!!passwordErrors.newPassword}
                    aria-describedby={passwordErrors.newPassword ? 'new-password-error' : 'new-password-help'}
                    className={`w-full px-3.5 py-2.5 pr-10 bg-gray-50 border rounded-xl text-sm focus:bg-white outline-hidden text-gray-900 transition-colors ${
                      passwordErrors.newPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]'
                    }`}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-hidden cursor-pointer"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.newPassword ? (
                  <p id="new-password-error" className="text-xs text-red-600 mt-1 font-medium" role="alert">
                    {passwordErrors.newPassword}
                  </p>
                ) : (
                  <p id="new-password-help" className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm_password"
                    ref={confirmPasswordRef}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    aria-invalid={!!passwordErrors.confirmPassword}
                    aria-describedby={passwordErrors.confirmPassword ? 'confirm-password-error' : undefined}
                    className={`w-full px-3.5 py-2.5 pr-10 bg-gray-50 border rounded-xl text-sm focus:bg-white outline-hidden text-gray-900 transition-colors ${
                      passwordErrors.confirmPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]'
                    }`}
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-hidden cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm new password' : 'Show confirm new password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p id="confirm-password-error" className="text-xs text-red-600 mt-1 font-medium" role="alert">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF6B00] hover:bg-[#E66000] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
