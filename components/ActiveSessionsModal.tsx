// ==========================================
// ACTIVE SESSIONS MODAL
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface Session {
  id: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
}

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveSessionsModal({
  isOpen,
  onClose,
}: ActiveSessionsModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/sessions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions');
      }

      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);

    try {
      const response = await fetch(`/api/user/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke session');
      }

      // Remove from list
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOther = async () => {
    setRevoking('all');

    try {
      const response = await fetch('/api/user/sessions?all=true', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke sessions');
      }

      // Keep only current session
      setSessions(sessions.filter((s) => s.isCurrent));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (device: string | null) => {
    switch (device) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📲';
      default:
        return '💻';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Active Sessions"
      size="lg"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchSessions}
              className="text-sm text-teal-400 hover:text-teal-300 mt-2"
            >
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <div className="text-4xl mb-3">🔐</div>
            <p>No active sessions found</p>
            <p className="text-sm text-zinc-500 mt-1">
              Sessions will appear here when you log in from different devices.
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-zinc-400 mb-4">
              {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`bg-zinc-800/50 rounded-xl p-4 ${
                    session.isCurrent ? 'ring-2 ring-teal-500/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getDeviceIcon(session.device)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                          </span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 bg-teal-600/30 text-teal-400 text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500 mt-1">
                          {session.ipAddress || 'Unknown IP'}
                          {session.city && session.country && (
                            <> · {session.city}, {session.country}</>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">
                          Last active: {formatDate(session.lastActivity)}
                          {' · '}
                          Created: {formatDate(session.createdAt)}
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <button
                        onClick={() => revokeSession(session.id)}
                        disabled={revoking === session.id}
                        className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {revoking === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <div className="pt-4 border-t border-zinc-800">
                <Button
                  onClick={revokeAllOther}
                  disabled={revoking === 'all'}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {revoking === 'all' ? 'Revoking...' : 'Revoke All Other Sessions'}
                </Button>
                <p className="text-xs text-zinc-500 text-center mt-2">
                  This will sign you out of all devices except this one.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
