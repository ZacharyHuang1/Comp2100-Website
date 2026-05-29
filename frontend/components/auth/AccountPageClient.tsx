'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { API_BASE_URL } from '@/lib/config';

type UserSession = {
  id: string;
  deviceLabel: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

async function accountRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload as T;
}

export function AccountPageClient() {
  const { authenticated, loading, logout, user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      router.replace('/login?next=/account');
      return;
    }

    void accountRequest<UserSession[]>('/auth/sessions')
      .then(setSessions)
      .catch(() => setError('Could not load sessions.'));
  }, [authenticated, loading, router]);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSaving(true);

    try {
      await accountRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    await accountRequest(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  if (loading || !authenticated) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
        Loading account.
      </div>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm shadow-stone-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Account
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight text-stone-950">
          {user?.displayName || user?.username}
        </h1>
        <dl className="mt-6 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 p-4">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">
              Username
            </dt>
            <dd className="mt-1 font-semibold text-stone-900">
              {user?.username}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">
              Role
            </dt>
            <dd className="mt-1 font-semibold text-stone-900">{user?.role}</dd>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4 sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">
              Email
            </dt>
            <dd className="mt-1 font-semibold text-stone-900">
              {user?.email || 'Not set'}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.push('/login'));
          }}
          className="mt-6 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Sign out
        </button>
      </div>

      <div className="space-y-6">
        <form
          onSubmit={handleChangePassword}
          className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm shadow-stone-200/60"
        >
          <h2 className="text-lg font-semibold text-stone-950">
            Change password
          </h2>
          {message ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="h-11 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="h-11 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="h-11 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="mt-4 w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving' : 'Update password'}
          </button>
        </form>

        <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm shadow-stone-200/60">
          <h2 className="text-lg font-semibold text-stone-950">
            Active sessions
          </h2>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {session.deviceLabel}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Last seen {new Date(session.lastSeenAt).toLocaleString()}
                    </p>
                    {session.current ? (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Current session
                      </p>
                    ) : null}
                  </div>
                  {!session.current ? (
                    <button
                      type="button"
                      onClick={() => void handleRevokeSession(session.id)}
                      className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!sessions.length ? (
              <p className="text-sm text-stone-500">No active sessions.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

