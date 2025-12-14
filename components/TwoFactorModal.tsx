// ==========================================
// TWO-FACTOR AUTHENTICATION MODAL
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useLanguage } from '@/lib/i18n';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onSuccess?: () => void;
}

type Step = 'initial' | 'setup' | 'verify' | 'backup' | 'disable' | 'success';

export function TwoFactorModal({
  isOpen,
  onClose,
  isEnabled,
  onSuccess,
}: TwoFactorModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Setup state
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');

  // Disable state
  const [password, setPassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setError('');
      setVerifyCode('');
      setPassword('');
      setDisableCode('');
    }
  }, [isOpen]);

  const handleClose = () => {
    setStep('initial');
    setError('');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
    setVerifyCode('');
    setPassword('');
    setDisableCode('');
    onClose();
  };

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/2fa/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError(t.modals.twoFactor.errors.codeRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setStep('backup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBackup = () => {
    setStep('success');
    onSuccess?.();
  };

  const handleDisable = async () => {
    if (!password) {
      setError(t.modals.twoFactor.errors.passwordRequired);
      return;
    }
    if (disableCode.length !== 6 && disableCode.length !== 8) {
      setError(t.modals.twoFactor.errors.invalidCode);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code: disableCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setStep('success');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
  };

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="space-y-4">
            {isEnabled ? (
              <>
                <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <h3 className="font-semibold text-green-400">{t.modals.twoFactor.enabled}</h3>
                      <p className="text-sm text-zinc-400">
                        {t.modals.twoFactor.enabledDescription}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setStep('disable')}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {t.modals.twoFactor.disable}
                </Button>
              </>
            ) : (
              <>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🔐</div>
                    <div>
                      <h3 className="font-semibold text-white">{t.modals.twoFactor.secureAccount}</h3>
                      <p className="text-sm text-zinc-400">
                        {t.modals.twoFactor.setupDescription}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400 space-y-2">
                  <ul className="list-disc list-inside text-zinc-500">
                    <li>Google Authenticator</li>
                    <li>Authy</li>
                    <li>1Password</li>
                    <li>Microsoft Authenticator</li>
                  </ul>
                </div>
                <Button onClick={handleStartSetup} disabled={loading} className="w-full">
                  {loading ? '...' : t.modals.twoFactor.enable}
                </Button>
              </>
            )}
          </div>
        );

      case 'setup':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-zinc-400 mb-4">
                {t.modals.twoFactor.scanInstructions}
              </p>
              {qrCode && (
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-2">Or:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-teal-400 break-all">
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Copy"
                >
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              {t.modals.twoFactor.verify}
            </Button>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              {t.modals.twoFactor.enterCode}
            </p>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.modals.twoFactor.codePlaceholder}
              </label>
              <Input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('setup')} className="flex-1">
                ←
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verifyCode.length !== 6}
                className="flex-1"
              >
                {loading ? t.modals.twoFactor.verifying : t.modals.twoFactor.verify}
              </Button>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-yellow-400">{t.modals.twoFactor.backupCodes}</h3>
                  <p className="text-sm text-zinc-400">
                    {t.modals.twoFactor.backupCodesDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="font-mono text-sm text-zinc-300 bg-zinc-900 px-3 py-2 rounded">
                    {code}
                  </code>
                ))}
              </div>
              <button
                onClick={copyBackupCodes}
                className="w-full mt-3 py-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {t.modals.twoFactor.copyBackupCodes}
              </button>
            </div>

            <Button onClick={handleConfirmBackup} className="w-full">
              {t.modals.twoFactor.done}
            </Button>
          </div>
        );

      case 'disable':
        return (
          <div className="space-y-4">
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-red-400">{t.modals.twoFactor.disableConfirm}</h3>
                  <p className="text-sm text-zinc-400">
                    {t.modals.twoFactor.disableWarning}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.profile.password || 'Password'}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.modals.twoFactor.codePlaceholder}
              </label>
              <Input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))}
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('initial')} className="flex-1">
                {t.modals.deleteAccount.cancel}
              </Button>
              <Button
                onClick={handleDisable}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {loading ? t.modals.twoFactor.disabling : t.modals.twoFactor.disable}
              </Button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {isEnabled ? t.modals.twoFactor.disable : t.modals.twoFactor.enabled}
            </h3>
            <p className="text-zinc-400 mb-6">
              {isEnabled
                ? t.modals.twoFactor.disableWarning
                : t.modals.twoFactor.enabledDescription}
            </p>
            <Button onClick={handleClose} className="w-full">
              {t.modals.twoFactor.done}
            </Button>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'initial':
        return t.modals.twoFactor.title;
      case 'setup':
        return t.modals.twoFactor.scanQrCode;
      case 'verify':
        return t.modals.twoFactor.verify;
      case 'backup':
        return t.modals.twoFactor.backupCodes;
      case 'disable':
        return t.modals.twoFactor.disable;
      case 'success':
        return '✓';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      size="md"
    >
      {renderContent()}
    </Modal>
  );
}
