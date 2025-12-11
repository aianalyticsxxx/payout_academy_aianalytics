// ==========================================
// PROFILE EDIT MODAL
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string | null;
  currentAvatar: string;
  onSave: (username: string, avatar: string) => Promise<void>;
}

const AVATAR_OPTIONS = [
  '🎲', '🎯', '🏀', '🏈', '⚽', '🏒', '⚾', '🎾', '🥊', '💰',
  '🔥', '⚡', '🌟', '👑', '🦁', '🐺', '🦅', '🐉', '💎', '🏆',
];

export function ProfileEditModal({
  isOpen,
  onClose,
  currentUsername,
  currentAvatar,
  onSave,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(currentUsername || '');
  const [avatar, setAvatar] = useState(currentAvatar || '🎲');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername || '');
      setAvatar(currentAvatar || '🎲');
      setError('');
    }
  }, [isOpen, currentUsername, currentAvatar]);

  const handleSave = async () => {
    // Validate username
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (username.length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(username, avatar);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Avatar Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Choose Avatar
          </label>
          <div className="grid grid-cols-10 gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  avatar === emoji
                    ? 'bg-teal-600 ring-2 ring-teal-400 scale-110'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Username
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            maxLength={20}
          />
          <p className="text-xs text-zinc-500 mt-1">
            {username.length}/20 characters (min 3)
          </p>
        </div>

        {/* Preview */}
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{avatar}</span>
            <span className="text-xl font-bold text-white">
              {username || 'Username'}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
