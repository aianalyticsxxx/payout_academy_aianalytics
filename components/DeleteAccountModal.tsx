// ==========================================
// DELETE ACCOUNT MODAL
// ==========================================

'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useLanguage } from '@/lib/i18n';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const resetForm = () => {
    setPassword('');
    setConfirmation('');
    setError('');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleContinue = () => {
    if (!password) {
      setError(t.modals.deleteAccount.errors.passwordRequired);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleDelete = async () => {
    if (confirmation !== 'DELETE MY ACCOUNT') {
      setError(t.modals.deleteAccount.errors.confirmRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          confirmation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out and redirect
      await signOut({ callbackUrl: '/login?deleted=true' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? t.modals.deleteAccount.title : t.modals.deleteAccount.confirmTitle}
      size="md"
      footer={
        step === 1 ? (
          <>
            <Button variant="secondary" onClick={handleClose}>
              {t.modals.deleteAccount.cancel}
            </Button>
            <Button
              onClick={handleContinue}
              className="bg-red-600 hover:bg-red-700"
            >
              {t.modals.deleteAccount.continue}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
              {t.modals.deleteAccount.back}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading || confirmation !== 'DELETE MY ACCOUNT'}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-900"
            >
              {loading ? t.modals.deleteAccount.deleting : t.modals.deleteAccount.deleteButton}
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-400 mb-1">{t.modals.deleteAccount.warning}</h3>
                <p className="text-sm text-zinc-400">
                  {t.modals.deleteAccount.description}
                </p>
                <ul className="text-sm text-zinc-400 mt-2 space-y-1 list-disc list-inside">
                  <li>{t.modals.deleteAccount.dataList.profile}</li>
                  <li>{t.modals.deleteAccount.dataList.history}</li>
                  <li>{t.modals.deleteAccount.dataList.challenges}</li>
                  <li>{t.modals.deleteAccount.dataList.leaderboard}</li>
                  <li>{t.modals.deleteAccount.dataList.parlays}</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t.modals.deleteAccount.enterPassword}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.modals.deleteAccount.passwordPlaceholder}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-semibold text-red-400 mb-2">{t.modals.deleteAccount.finalStep}</h3>
            <p className="text-sm text-zinc-400">
              {t.modals.deleteAccount.typeToConfirm}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t.modals.deleteAccount.confirmPlaceholder}
            </label>
            <Input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={t.modals.deleteAccount.confirmText}
              className={confirmation === 'DELETE MY ACCOUNT' ? 'border-red-500' : ''}
            />
            {confirmation && confirmation !== 'DELETE MY ACCOUNT' && (
              <p className="text-xs text-zinc-500 mt-1">
                {t.modals.deleteAccount.typeExactly}
              </p>
            )}
            {confirmation === 'DELETE MY ACCOUNT' && (
              <p className="text-xs text-red-400 mt-1">
                {t.modals.deleteAccount.readyToDelete}
              </p>
            )}
          </div>

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
