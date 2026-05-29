'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { documentationRequest } from '@/components/documentation/documentationApi';
import {
  DocumentationPage,
  DocumentationSpace,
} from '@/components/documentation/types';
import { todoRequest } from '@/components/todo/todoApi';
import { TodoUser } from '@/components/todo/types';

const INSTRUCTION_TYPES = [
  'general',
  'setup',
  'workflow',
  'architecture',
  'coding',
  'submission',
  'reminder',
];

function getExcerpt(content: string) {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 220 ? `${text.slice(0, 220)}...` : text || 'No instructions yet.';
}

function formatType(value: string) {
  return value
    .split('_')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function DocumentationBoard() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'root_manager';
  const [spaces, setSpaces] = useState<DocumentationSpace[]>([]);
  const [pages, setPages] = useState<DocumentationPage[]>([]);
  const [users, setUsers] = useState<TodoUser[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [instructionType, setInstructionType] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshBoard() {
    setIsLoading(true);
    setError('');

    try {
      const spaceQuery = ownerUserId && isManager ? `?ownerUserId=${ownerUserId}` : '';
      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set('q', searchValue.trim());
      }

      if (spaceId) {
        params.set('spaceId', spaceId);
      }

      if (instructionType) {
        params.set('instructionType', instructionType);
      }

      if (ownerUserId && isManager) {
        params.set('ownerUserId', ownerUserId);
      }

      const [nextSpaces, nextPages, nextUsers] = await Promise.all([
        documentationRequest<DocumentationSpace[]>(`/documentation/spaces${spaceQuery}`),
        documentationRequest<DocumentationPage[]>(
          `/documentation/pages${params.toString() ? `?${params.toString()}` : ''}`
        ),
        isManager ? todoRequest<TodoUser[]>('/todo/users') : Promise.resolve([]),
      ]);

      setSpaces(nextSpaces);
      setPages(nextPages);
      setUsers(nextUsers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load documentation.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, ownerUserId, searchValue, spaceId, instructionType]);

  const visibleSpaceOptions = useMemo(
    () => spaces.filter((space) => !space.archived),
    [spaces]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm shadow-stone-200/50">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
          Documentation
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950">
              Browse guides, workflows, and project instructions.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Read practical posts for setup, coding workflow, submission checks,
              architecture diagrams, and project operations.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-4">
          <div className="rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-sm shadow-stone-200/40">
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search documentation..."
              className="h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-3xl border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
              Loading documentation.
            </div>
          ) : pages.length ? (
            <div className="space-y-4">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/documentation/doc/${page.id}` as Route}
                  className="block rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/50 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-stone-200/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      {formatType(page.instructionType)}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                      {page.spaceName}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">
                    {page.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    {getExcerpt(page.content)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: page.owner?.avatarColor || '#64748B',
                        }}
                      />
                      By {page.owner?.displayName || page.owner?.username || 'Unknown'}
                    </span>
                    <span className="font-semibold text-amber-700">Open post</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10 text-sm text-stone-500">
              No documentation posts found.
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-4 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
              Filters
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Space
              <select
                value={spaceId}
                onChange={(event) => setSpaceId(event.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm normal-case tracking-normal text-stone-700 outline-none"
              >
                <option value="">All spaces</option>
                {visibleSpaceOptions.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Type
              <select
                value={instructionType}
                onChange={(event) => setInstructionType(event.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm normal-case tracking-normal text-stone-700 outline-none"
              >
                <option value="">All types</option>
                {INSTRUCTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatType(type)}
                  </option>
                ))}
              </select>
            </label>
            {isManager ? (
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Owner
                <select
                  value={ownerUserId}
                  onChange={(event) => setOwnerUserId(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm normal-case tracking-normal text-stone-700 outline-none"
                >
                  <option value="">All visible users</option>
                  {users.map((currentUser) => (
                    <option key={currentUser.id} value={currentUser.id}>
                      {currentUser.displayName || currentUser.username}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-4 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
              Spaces
            </p>
            <div className="mt-4 space-y-2">
              {visibleSpaceOptions.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => setSpaceId(space.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    spaceId === space.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-50 text-stone-600 hover:bg-white'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: space.markerColor }}
                    />
                    <span className="truncate">{space.name}</span>
                  </span>
                  <span className="text-xs opacity-70">{space.pageCount}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
