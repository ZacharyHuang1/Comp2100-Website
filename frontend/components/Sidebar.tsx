'use client';

import Link from 'next/link';

import { ExplorerTree } from '@/components/ExplorerTree';
import { ExplorerNode } from '@/lib/types';

type SidebarProps = {
  explorerTree: ExplorerNode[];
  explorerError?: string;
  explorerLoaded?: boolean;
};

export function Sidebar({
  explorerError = '',
  explorerLoaded = true,
  explorerTree,
}: SidebarProps) {
  return (
    <aside className="hidden w-[305px] shrink-0 border-r border-stone-200/80 bg-[#fbfaf7] lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-stone-200/80 px-5 py-5">
          <Link href="/" className="block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              CODE KNOWLEDGE BASE
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Field Notes
            </h1>
          </Link>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Browse codebase folders, notes, tasks, and documentation.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 space-y-1">
            <Link
              href="/todo"
              className="block rounded-xl px-2 py-2 text-sm font-semibold text-stone-700 transition hover:bg-white hover:text-amber-700"
            >
              To-do List
            </Link>
            <Link
              href="/documentation"
              className="block rounded-xl px-2 py-2 text-sm font-semibold text-stone-700 transition hover:bg-white hover:text-amber-700"
            >
              Documentation
            </Link>
            <Link
              href="/git-simulator"
              className="block rounded-xl px-2 py-2 text-sm font-semibold text-stone-700 transition hover:bg-white hover:text-amber-700"
            >
              Git Simulator
            </Link>
          </div>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-400">
            EXPLORER
          </p>
          {!explorerLoaded ? (
            <p className="mt-3 rounded-md border border-stone-200 bg-white/60 px-3 py-4 text-sm text-stone-500">
              Loading explorer.
            </p>
          ) : explorerError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-4 text-sm text-rose-700">
              {explorerError}
            </p>
          ) : (
            <ExplorerTree initialTree={explorerTree} />
          )}
        </div>
      </div>
    </aside>
  );
}
