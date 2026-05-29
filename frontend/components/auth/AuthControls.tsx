'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/AuthProvider';

export function AuthControls() {
  const { authenticated, loading, logout, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="h-10 w-24 animate-pulse rounded-2xl bg-stone-200/70" />
    );
  }

  if (!authenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname || '/')}`}
        className="whitespace-nowrap rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="hidden max-w-32 truncate rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700 sm:block"
        title={user?.displayName || user?.username}
      >
        {user?.displayName || user?.username}
      </Link>
      <button
        type="button"
        onClick={() => {
          void logout().then(() => router.push('/login'));
        }}
        className="whitespace-nowrap rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        Sign out
      </button>
    </div>
  );
}

