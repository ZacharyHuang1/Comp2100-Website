'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ username, password, rememberDevice });
      const nextPath = searchParams.get('next') || '/';
      router.push(nextPath.startsWith('/') ? (nextPath as Route) : '/');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Invalid username or password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm shadow-stone-200/60">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
        Account
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight text-stone-950">
        Sign in
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        Accounts are created by the manager. Use the username and temporary
        password you were given.
      </p>
      {error ? (
        <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-stone-700">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            autoFocus
          />
        </label>
        <label className="block text-sm font-semibold text-stone-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-600"
          />
          Remember this device
        </label>
        <button
          type="submit"
          disabled={isSubmitting || !username.trim() || !password}
          className="h-12 w-full rounded-2xl bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
