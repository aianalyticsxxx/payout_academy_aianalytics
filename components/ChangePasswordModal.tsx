// ==========================================
// CHANGE PASSWORD MODAL
// ==========================================

'use client';

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useLanguage } from '@/lib/i18n';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t.modals.changePassword.errors.minLength;
    }
    if (!/[A-Z]/.test(password)) {
      return t.modals.changePassword.errors.uppercase;
    }
    if (!/[a-z]/.test(password)) {
      return t.modals.changePassword.errors.lowercase;
    }
    if (!/[0-9]/.test(password)) {
      return t.modals.changePassword.errors.number;
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!currentPassword) {
      setError(t.modals.changePassword.errors.currentRequired);
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.modals.changePassword.errors.mismatch);
      return;
    }

    if (currentPassword === newPassword) {
      setError(t.modals.changePassword.errors.sameAsOld);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);
      onSuccess?.();

      // Close after showing success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, text: t.modals.changePassword.strength.weak, color: 'bg-red-500' };
    if (score <= 4) return { level: 2, text: t.modals.changePassword.strength.medium, color: 'bg-yellow-500' };
    return { level: 3, text: t.modals.changePassword.strength.strong, color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t.modals.changePassword.title}
      size="md"
      footer={
        !success && (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              {t.modals.changePassword.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? t.modals.changePassword.updating : t.modals.changePassword.updatePassword}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t.modals.changePassword.success}</h3>
          <p className="text-zinc-400">{t.modals.changePassword.successMessage}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t.modals.changePassword.currentPassword}
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t.modals.changePassword.currentPasswordPlaceholder}
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t.modals.changePassword.newPassword}
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.modals.changePassword.newPasswordPlaceholder}
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all`}
                      style={{ width: `${(strength.level / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{strength.text}</span>
                </div>
                <ul className="text-xs text-zinc-500 space-y-0.5">
                  <li className={newPassword.length >= 8 ? 'text-green-500' : ''}>
                    {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-500' : ''}>
                    {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-500' : ''}>
                    {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t.modals.changePassword.confirmPassword}
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.modals.changePassword.confirmPasswordPlaceholder}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">{t.modals.changePassword.errors.mismatch}</p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-500 mt-1">✓</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
