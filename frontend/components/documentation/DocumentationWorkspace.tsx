'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { documentationRequest } from '@/components/documentation/documentationApi';
import {
  DocumentationPage,
  DocumentationSpace,
} from '@/components/documentation/types';
import { todoRequest } from '@/components/todo/todoApi';
import { TodoUser } from '@/components/todo/types';

const COLOR_PRESETS = ['#64748B', '#F59E0B', '#2563EB', '#16A34A', '#9333EA', '#DC2626'];
const INSTRUCTION_TYPES = [
  'general',
  'setup',
  'workflow',
  'architecture',
  'coding',
  'submission',
  'reminder',
];
const VISIBILITY_OPTIONS = ['private', 'shared', 'public_to_users'];

export function DocumentationWorkspace({ adminMode = false }: { adminMode?: boolean }) {
  const { authenticated, loading: authLoading, user } = useAuth();
  const [spaces, setSpaces] = useState<DocumentationSpace[]>([]);
  const [pages, setPages] = useState<DocumentationPage[]>([]);
  const [users, setUsers] = useState<TodoUser[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [ownerFilterId, setOwnerFilterId] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceColor, setSpaceColor] = useState('#64748B');
  const [spaceVisibility, setSpaceVisibility] = useState('public_to_users');
  const [selectedSpaceName, setSelectedSpaceName] = useState('');
  const [selectedSpaceDescription, setSelectedSpaceDescription] = useState('');
  const [selectedSpaceVisibility, setSelectedSpaceVisibility] =
    useState('public_to_users');
  const [selectedSpaceColor, setSelectedSpaceColor] = useState('#64748B');
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [instructionType, setInstructionType] = useState('general');
  const [pageVisibility, setPageVisibility] = useState('public_to_users');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) || null;
  const selectedPage = pages.find((page) => page.id === selectedPageId) || null;

  const visibleSpaces = useMemo(
    () =>
      ownerFilterId
        ? spaces.filter((space) => space.ownerUserId === ownerFilterId)
        : spaces,
    [ownerFilterId, spaces]
  );

  async function refreshSpaces() {
    const query = ownerFilterId ? `?ownerUserId=${ownerFilterId}` : '';
    const nextSpaces = await documentationRequest<DocumentationSpace[]>(
      `${adminMode ? '/admin/documentation' : '/documentation'}/spaces${query}`
    );
    setSpaces(nextSpaces);

    if (!selectedSpaceId && nextSpaces[0]) {
      setSelectedSpaceId(nextSpaces[0].id);
    }

    if (selectedSpaceId && !nextSpaces.some((space) => space.id === selectedSpaceId)) {
      setSelectedSpaceId(nextSpaces[0]?.id || '');
      setSelectedPageId('');
    }
  }

  async function refreshPages() {
    const params = new URLSearchParams();

    if (selectedSpaceId) {
      params.set('spaceId', selectedSpaceId);
    }

    if (ownerFilterId) {
      params.set('ownerUserId', ownerFilterId);
    }

    if (searchValue.trim()) {
      params.set('q', searchValue.trim());
    }

    const nextPages = await documentationRequest<DocumentationPage[]>(
      `${adminMode ? '/admin/documentation' : '/documentation'}/pages${params.toString() ? `?${params.toString()}` : ''}`
    );
    setPages(nextPages);

    if (selectedPageId && !nextPages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId('');
    }
  }

  async function loadInitialData() {
    if (!authenticated) {
      return;
    }

    setIsLoading(true);

    try {
      const [nextSpaces, nextUsers] = await Promise.all([
        documentationRequest<DocumentationSpace[]>(
          `${adminMode ? '/admin/documentation' : '/documentation'}/spaces`
        ),
        todoRequest<TodoUser[]>('/todo/users'),
      ]);

      setSpaces(nextSpaces);
      setUsers(nextUsers);
      setSelectedSpaceId((current) => current || nextSpaces[0]?.id || '');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && authenticated) {
      void loadInitialData().catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load documentation.');
        setIsLoading(false);
      });
    }
  }, [authenticated, authLoading, adminMode]);

  useEffect(() => {
    if (!authenticated || isLoading) {
      return;
    }

    void refreshPages().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : 'Could not load pages.')
    );
  }, [authenticated, adminMode, isLoading, ownerFilterId, searchValue, selectedSpaceId]);

  useEffect(() => {
    if (!selectedSpace) {
      setSelectedSpaceName('');
      setSelectedSpaceDescription('');
      setSelectedSpaceVisibility('public_to_users');
      setSelectedSpaceColor('#64748B');
      return;
    }

    setSelectedSpaceName(selectedSpace.name);
    setSelectedSpaceDescription(selectedSpace.description || '');
    setSelectedSpaceVisibility(selectedSpace.visibility || 'public_to_users');
    setSelectedSpaceColor(selectedSpace.markerColor || '#64748B');
  }, [selectedSpace]);

  useEffect(() => {
    if (!selectedPage) {
      setPageTitle('');
      setPageContent('');
      setInstructionType('general');
      setPageVisibility('public_to_users');
      return;
    }

    setPageTitle(selectedPage.title);
    setPageContent(selectedPage.content);
    setInstructionType(selectedPage.instructionType || 'general');
    setPageVisibility(selectedPage.visibility || 'public_to_users');
  }, [selectedPage]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function handleCreateSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const created = await documentationRequest<DocumentationSpace>(
        `${adminMode ? '/admin/documentation' : '/documentation'}/spaces`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: spaceName,
            description: spaceDescription,
            markerColor: spaceColor,
            ownerUserId: user?.id,
            visibility: spaceVisibility,
          }),
        }
      );
      setSpaceName('');
      setSpaceDescription('');
      setSpaceColor('#64748B');
      setSpaceVisibility('public_to_users');
      await refreshSpaces();
      setSelectedSpaceId(created.id);
      setMessage('Saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePage() {
    if (!selectedSpaceId) {
      setError('Create a documentation space first.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const created = await documentationRequest<DocumentationPage>(
        `${adminMode ? '/admin/documentation' : '/documentation'}/pages`,
        {
          method: 'POST',
          body: JSON.stringify({
            spaceId: selectedSpaceId,
            title: 'Untitled instruction',
            content: '',
            instructionType: 'general',
            ownerUserId: user?.id,
            visibility: 'public_to_users',
          }),
        }
      );
      await Promise.all([refreshSpaces(), refreshPages()]);
      setSelectedPageId(created.id);
      setMessage('Saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSavePage() {
    if (!selectedPage) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updated = await documentationRequest<DocumentationPage>(
        `${adminMode ? '/admin/documentation' : '/documentation'}/pages/${selectedPage.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: pageTitle,
            content: pageContent,
            instructionType,
            visibility: pageVisibility,
          }),
        }
      );
      setPages((currentPages) =>
        currentPages.map((page) => (page.id === updated.id ? updated : page))
      );
      setMessage('Saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchivePage() {
    if (!selectedPage || !window.confirm(`Archive ${selectedPage.title}?`)) {
      return;
    }

    await documentationRequest(
      `${adminMode ? '/admin/documentation' : '/documentation'}/pages/${selectedPage.id}/archive`,
      {
        method: 'POST',
      }
    );
    setSelectedPageId('');
    await Promise.all([refreshSpaces(), refreshPages()]);
    setMessage('Saved.');
  }

  async function handleDeletePage() {
    if (!selectedPage || !window.confirm(`Delete ${selectedPage.title}?`)) {
      return;
    }

    await documentationRequest(
      `${adminMode ? '/admin/documentation' : '/documentation'}/pages/${selectedPage.id}`,
      { method: 'DELETE' }
    );
    setSelectedPageId('');
    await Promise.all([refreshSpaces(), refreshPages()]);
    setMessage('Deleted.');
  }

  async function handleSaveSpace() {
    if (!selectedSpace) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updated = await documentationRequest<DocumentationSpace>(
        `${adminMode ? '/admin/documentation' : '/documentation'}/spaces/${selectedSpace.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: selectedSpaceName,
            description: selectedSpaceDescription,
            markerColor: selectedSpaceColor,
            visibility: selectedSpaceVisibility,
          }),
        }
      );
      setSpaces((currentSpaces) =>
        currentSpaces.map((space) => (space.id === updated.id ? updated : space))
      );
      setMessage('Saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveSpace() {
    if (!selectedSpace || !window.confirm(`Archive ${selectedSpace.name}?`)) {
      return;
    }

    await documentationRequest(
      `${adminMode ? '/admin/documentation' : '/documentation'}/spaces/${selectedSpace.id}/archive`,
      {
        method: 'POST',
      }
    );
    setSelectedSpaceId('');
    setSelectedPageId('');
    await refreshSpaces();
    setMessage('Saved.');
  }

  async function handleDeleteSpace() {
    if (
      !selectedSpace ||
      !window.confirm(`Delete ${selectedSpace.name} and all pages inside it?`)
    ) {
      return;
    }

    await documentationRequest(
      `${adminMode ? '/admin/documentation' : '/documentation'}/spaces/${selectedSpace.id}`,
      { method: 'DELETE' }
    );
    setSelectedSpaceId('');
    setSelectedPageId('');
    await refreshSpaces();
    setMessage('Deleted.');
  }

  if (authLoading || isLoading) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
        Loading documentation.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl shadow-stone-900/10">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-4 shadow-sm shadow-stone-200/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-600">
            Documentation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Instructions
          </h1>
          <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
            Owner
            <select
              value={ownerFilterId}
              onChange={(event) => {
                setOwnerFilterId(event.target.value);
                setSelectedSpaceId('');
                setSelectedPageId('');
              }}
              className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm normal-case tracking-normal text-stone-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">All visible users</option>
              {users.map((currentUser) => (
                <option key={currentUser.id} value={currentUser.id}>
                  {currentUser.displayName || currentUser.username}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5 space-y-1">
            {visibleSpaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => {
                  setSelectedSpaceId(space.id);
                  setSelectedPageId('');
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                  selectedSpaceId === space.id
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-white hover:text-stone-950'
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
            {!visibleSpaces.length ? (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                No spaces yet.
              </p>
            ) : null}
          </div>
          <form onSubmit={handleCreateSpace} className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              New space
            </p>
            <input
              value={spaceName}
              onChange={(event) => setSpaceName(event.target.value)}
              placeholder="Coding Instructions"
              className="h-10 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-slate-300"
            />
            <textarea
              value={spaceDescription}
              onChange={(event) => setSpaceDescription(event.target.value)}
              placeholder="Description"
              className="min-h-20 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
            />
            <select
              value={spaceVisibility}
              onChange={(event) => setSpaceVisibility(event.target.value)}
              className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
            >
              {VISIBILITY_OPTIONS.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSpaceColor(preset)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    spaceColor.toLowerCase() === preset.toLowerCase()
                      ? 'border-stone-950'
                      : 'border-white'
                  } shadow-sm ring-1 ring-stone-200`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
            <button
              disabled={isSaving || !spaceName.trim()}
              className="w-full rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create space
            </button>
          </form>
        </aside>

        <main className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-5 shadow-sm shadow-stone-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Pages
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                {selectedSpace?.name || 'Select a space'}
              </h2>
            </div>
            <div className="flex gap-2">
              {selectedSpace ? (
                <button
                  type="button"
                  onClick={() => void handleArchiveSpace()}
                  className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600"
                >
                  Archive space
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCreatePage()}
                disabled={!selectedSpaceId}
                className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                New page
              </button>
            </div>
          </div>
          {selectedSpace ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Space settings
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={selectedSpaceName}
                  onChange={(event) => setSelectedSpaceName(event.target.value)}
                  className="h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-slate-300"
                />
                <select
                  value={selectedSpaceVisibility}
                  onChange={(event) =>
                    setSelectedSpaceVisibility(event.target.value)
                  }
                  className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
                >
                  {VISIBILITY_OPTIONS.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </select>
                <textarea
                  value={selectedSpaceDescription}
                  onChange={(event) =>
                    setSelectedSpaceDescription(event.target.value)
                  }
                  className="min-h-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-slate-300 md:col-span-2"
                />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedSpaceColor(preset)}
                      className={`h-7 w-7 rounded-full border-2 ${
                        selectedSpaceColor.toLowerCase() === preset.toLowerCase()
                          ? 'border-stone-950'
                          : 'border-white'
                      } shadow-sm ring-1 ring-stone-200`}
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveSpace()}
                  disabled={isSaving || !selectedSpaceName.trim()}
                  className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Save space
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSpace()}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  Delete space
                </button>
              </div>
            </div>
          ) : null}
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search documentation..."
            className="mt-5 h-11 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
          />
          <div className="mt-5 space-y-2">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedPageId === page.id
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-stone-950">
                    {page.title}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-stone-500">
                    {page.instructionType}
                  </span>
                </span>
                <span className="mt-2 block truncate text-xs text-stone-500">
                  {page.content || 'No instructions yet.'}
                </span>
                <span className="mt-2 block text-xs text-stone-400">
                  Owner: {page.owner?.displayName || page.owner?.username || 'Unknown'}
                </span>
              </button>
            ))}
            {!pages.length ? (
              <p className="rounded-2xl bg-stone-50 p-6 text-sm text-stone-500">
                No instructions yet.
              </p>
            ) : null}
          </div>
        </main>

        <aside className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-5 shadow-sm shadow-stone-200/40">
          {selectedPage ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Editor
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {selectedPage.spaceName} · Owner:{' '}
                  {selectedPage.owner?.displayName || selectedPage.owner?.username}
                </p>
              </div>
              <input
                value={pageTitle}
                onChange={(event) => setPageTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-semibold outline-none focus:border-slate-300"
              />
              <select
                value={instructionType}
                onChange={(event) => setInstructionType(event.target.value)}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              >
                {INSTRUCTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={pageVisibility}
                onChange={(event) => setPageVisibility(event.target.value)}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-slate-300"
              >
                {VISIBILITY_OPTIONS.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
              <textarea
                value={pageContent}
                onChange={(event) => setPageContent(event.target.value)}
                placeholder="Write setup steps, workflows, reminders, or submission notes..."
                className="min-h-[46vh] w-full rounded-2xl border border-stone-200 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
              />
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void handleArchivePage()}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeletePage()}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => void handleSavePage()}
                  disabled={isSaving || !pageTitle.trim()}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-sm text-stone-500">
              Select or create an instruction page.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
