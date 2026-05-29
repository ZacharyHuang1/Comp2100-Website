'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { AuthControls } from '@/components/auth/AuthControls';
import { useAuth } from '@/components/auth/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { Sidebar } from '@/components/Sidebar';
import { API_BASE_URL } from '@/lib/config';
import { ExplorerNode } from '@/lib/types';

const PUBLIC_PATHS = new Set(['/login']);

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [explorerTree, setExplorerTree] = useState<ExplorerNode[]>([]);
  const [explorerError, setExplorerError] = useState('');
  const [explorerLoaded, setExplorerLoaded] = useState(false);
  const isPublicPath = PUBLIC_PATHS.has(pathname || '/');

  useEffect(() => {
    if (loading) {
      return;
    }

    if (isPublicPath && authenticated) {
      const next = searchParams.get('next') || '/';
      router.replace(next.startsWith('/') ? (next as Route) : '/');
      return;
    }

    if (!isPublicPath && !authenticated) {
      const nextPath = `${pathname || '/'}${
        searchParams.toString() ? `?${searchParams.toString()}` : ''
      }`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}` as Route);
    }
  }, [authenticated, isPublicPath, loading, pathname, router, searchParams]);

  useEffect(() => {
    if (!authenticated || isPublicPath) {
      setExplorerTree([]);
      setExplorerError('');
      setExplorerLoaded(false);
      return;
    }

    let cancelled = false;
    setExplorerLoaded(false);
    setExplorerError('');

    async function loadExplorer() {
      try {
        const response = await fetch(`${API_BASE_URL}/explorer`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          router.replace('/login' as Route);
          return;
        }

        if (!response.ok) {
          throw new Error('Could not load explorer.');
        }

        const tree = (await response.json()) as ExplorerNode[];

        if (!cancelled) {
          setExplorerTree(tree);
          setExplorerError('');
          setExplorerLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setExplorerTree([]);
          setExplorerError('Could not load explorer.');
          setExplorerLoaded(true);
        }
      }
    }

    void loadExplorer();

    return () => {
      cancelled = true;
    };
  }, [authenticated, isPublicPath, router]);

  if (isPublicPath) {
    return <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>;
  }

  if (loading || !authenticated) {
    return (
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
          Loading workspace.
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        explorerError={explorerError}
        explorerLoaded={explorerLoaded}
        explorerTree={explorerTree}
      />
      <div className="min-w-0 flex-1">
        <header className="border-b border-stone-200/80 bg-[#f8f5ee]/90">
          <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <SearchBar compact />
            </div>
            <AuthControls />
          </div>
        </header>
        <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
