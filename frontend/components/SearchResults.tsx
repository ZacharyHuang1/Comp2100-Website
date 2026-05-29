'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/lib/config';
import { getPublicCategoryName } from '@/lib/display';
import { SearchMatch, SearchResponse, SearchResult } from '@/lib/types';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success_found'; payload: SearchResponse & { found: true } }
  | { status: 'success_not_found'; payload: SearchResponse & { found: false } }
  | { status: 'request_error' };

function isValidSearchResponse(payload: unknown): payload is SearchResponse {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const response = payload as Record<string, unknown>;

  if (typeof response.found !== 'boolean') {
    return false;
  }

  if (response.found === false) {
    return (
      response.status === 'not_found' ||
      response.status === 'error' ||
      response.status === undefined
    );
  }

  return Boolean(response.data) || Array.isArray(response.results);
}

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-48 animate-pulse rounded-full bg-stone-200" />
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" />
        <div className="mt-5 h-8 w-2/3 animate-pulse rounded-full bg-stone-200" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-stone-100" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-stone-100" />
          <div className="h-4 w-4/6 animate-pulse rounded-full bg-stone-100" />
        </div>
      </div>
    </div>
  );
}

const SEARCH_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Code', value: 'code' },
  { label: 'Docs', value: 'docs' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Topics', value: 'topics' },
] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHighlightTerms(query: string) {
  const normalizedQuery = query
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return terms.length ? terms : normalizedQuery ? [normalizedQuery] : [];
}

function HighlightedSnippet({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const terms = getHighlightTerms(query);

  if (!text || !terms.length) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'giu');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some(
          (term) => part.toLocaleLowerCase() === term.toLocaleLowerCase()
        );

        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-amber-200/70 px-0.5 text-stone-950"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

function getMatchLabel(match: SearchMatch) {
  if (match.type === 'documentation') {
    return 'Matched section';
  }

  if (match.type === 'symbol') {
    return 'Matched declaration';
  }

  if (match.type === 'code') {
    return 'Matched code';
  }

  return 'Matched note';
}

function isDocumentationResult(
  item: SearchResult
): item is Extract<SearchResult, { type: 'documentation' }> {
  return item.type === 'documentation';
}

function getSourceType(item: SearchResult) {
  return item.source_type || item.sourceType || item.type || 'topic';
}

function getMatchType(item: SearchResult) {
  return item.match_type || item.matchType || '';
}

function getSourceLabel(item: SearchResult) {
  const sourceType = getSourceType(item);

  if (sourceType === 'code') {
    return 'Code';
  }

  if (sourceType === 'doc' || item.type === 'documentation') {
    return 'Docs';
  }

  if (sourceType === 'task') {
    return 'Task';
  }

  if (sourceType === 'category') {
    return 'Topic Folder';
  }

  return 'Topic';
}

function getResultPreview(item: SearchResult) {
  if (item.preview) {
    return item.preview;
  }

  if (isDocumentationResult(item)) {
    return item.snippet;
  }

  return item.content.explanation || 'No explanation available yet.';
}

function SearchFilterTabs({
  activeFilter,
  onChange,
}: {
  activeFilter: string;
  onChange: (filter: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEARCH_FILTERS.map((filter) => {
        const active = activeFilter === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={[
              'rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition',
              active
                ? 'border-stone-900 bg-stone-900 text-stone-50'
                : 'border-stone-200 bg-white text-stone-500 hover:border-amber-300 hover:text-amber-700',
            ].join(' ')}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function MatchPreview({
  match,
  query,
}: {
  match: SearchMatch;
  query: string;
}) {
  const snippet = match.signature || match.snippet || '';

  if (!snippet) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
          {getMatchLabel(match)}
        </span>
        {match.visibility ? (
          <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500 ring-1 ring-stone-200">
            {match.visibility}
          </span>
        ) : null}
        {match.kind ? (
          <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500 ring-1 ring-stone-200">
            {match.kind}
          </span>
        ) : null}
        {match.lineNumber ? (
          <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500 ring-1 ring-stone-200">
            Line {match.lineNumber}
          </span>
        ) : null}
      </div>
      <code className="mt-3 block overflow-x-auto whitespace-pre-wrap rounded-xl bg-stone-950 px-4 py-3 font-mono text-xs leading-6 text-stone-50">
        <HighlightedSnippet text={snippet} query={query} />
      </code>
    </div>
  );
}

export function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const typeFilter = searchParams.get('type') || 'all';
  const isQuiet = searchParams.get('quiet') === '1';
  const showQuietNotFound = isQuiet && searchParams.get('notFound') === '1';
  const requestNonce = searchParams.get('r') || '';
  const lastQueryRef = useRef('');
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle',
  });

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!query) {
        lastQueryRef.current = '';
        setSearchState({ status: 'idle' });
        return;
      }

      lastQueryRef.current = query;

      setSearchState({ status: 'loading' });

      const requestParams = new URLSearchParams({
        q: query,
      });

      if (typeFilter !== 'all') {
        requestParams.set('type', typeFilter);
      }

      const requestUrl = `${API_BASE_URL}/search?${requestParams.toString()}`;
      try {
        const [response] = await Promise.all([
          fetch(requestUrl, {
            cache: 'no-store',
            credentials: 'include',
          }),
          new Promise((resolve) => setTimeout(resolve, 450)),
        ]);

        let payload: unknown;

        try {
          payload = await response.json();
        } catch (jsonError) {
          console.error('Invalid JSON response:', jsonError);
          throw new Error('Invalid JSON');
        }

        if (!isValidSearchResponse(payload)) {
          throw new Error('Invalid response format');
        }

        if (cancelled) {
          return;
        }

        if (payload.found === true) {
          setSearchState({ status: 'success_found', payload });
          return;
        }

        setSearchState({ status: 'success_not_found', payload });
      } catch (searchError) {
        console.error('Search request failed:', searchError);
        if (!cancelled) {
          setSearchState({ status: 'request_error' });
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [query, requestNonce, router, typeFilter]);

  function handleRetry() {
    const nextNonce = Date.now().toString();
    const params = new URLSearchParams({
      q: query,
      r: nextNonce,
    });

    if (typeFilter !== 'all') {
      params.set('type', typeFilter);
    }

    router.replace(`/search?${params.toString()}`);
  }

  function handleFilterChange(filter: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (filter === 'all') {
      params.delete('type');
    } else {
      params.set('type', filter);
    }

    params.set('r', Date.now().toString());

    router.replace(`/search?${params.toString()}`);
  }

  const displayResults = (() => {
    if (searchState.status !== 'success_found') {
      return [];
    }

    if (Array.isArray(searchState.payload.results)) {
      return searchState.payload.results;
    }

    if (searchState.payload.data) {
      return [searchState.payload.data];
    }

    return [];
  })();
  const filterTabs = query ? (
    <SearchFilterTabs
      activeFilter={typeFilter}
      onChange={handleFilterChange}
    />
  ) : null;

  if (!query) {
    if (showQuietNotFound) {
      return (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10">
          <p className="text-sm text-stone-600">No results found.</p>
          <p className="mt-2 text-sm text-stone-500">Try refining your search.</p>
        </div>
      );
    }

    if (isQuiet) {
      return null;
    }

    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10 text-sm text-stone-500">
        Enter a search term to browse the documentation library.
      </div>
    );
  }

  if (searchState.status === 'loading') {
    return (
      <div className="space-y-5">
        {filterTabs}
        <SearchSkeleton />
      </div>
    );
  }

  if (searchState.status === 'request_error') {
    return (
      <div className="space-y-5">
        {filterTabs}
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load data
        </div>
      </div>
    );
  }

  if (searchState.status === 'success_not_found') {
    return (
      <div className="space-y-5">
        {filterTabs}
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10">
          <p className="text-sm text-stone-600">
            No results found.
          </p>
          <p className="mt-2 text-sm text-stone-500">Try refining your search.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-amber-600"
          >
            Search Again
          </button>
        </div>
      </div>
    );
  }

  if (searchState.status === 'success_found' && displayResults.length === 0) {
    return (
      <div className="space-y-5">
        {filterTabs}
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10 text-sm text-stone-500">
          No results found.
        </div>
      </div>
    );
  }

  if (searchState.status !== 'success_found') {
    return null;
  }

  return (
    <div className="space-y-5">
      {filterTabs}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-50">
          Search Results
        </span>
        <span className="text-sm text-stone-500">
          {displayResults.length} result{displayResults.length === 1 ? '' : 's'}
        </span>
      </div>

      {displayResults.map((item) => (
        <Link
          key={`${item.id}-${item.content.id}`}
          href={
            ((item.href || (isDocumentationResult(item) ? item.href : `/topic/${item.id}`)) as Route)
          }
          className="block rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-200/50 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-200/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              {isDocumentationResult(item)
                ? item.documentId === 'git-simulator'
                  ? 'Git Simulator · Workflow Tool'
                  : `Documentation${item.spaceName ? ` · ${item.spaceName}` : ''}`
                : getPublicCategoryName(item.category)}
            </p>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-600">
              {getSourceLabel(item)}
            </span>
            {getMatchType(item) ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-800">
                {getMatchType(item)}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
            {item.title}
          </h2>
          {isDocumentationResult(item) ? (
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
              {item.matchedHeading}
            </p>
          ) : (
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-stone-400">
              {item.content.query}
            </p>
          )}
          {item.path ? (
            <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-stone-500">
              {item.path}
            </p>
          ) : null}
          <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-600">
            {getResultPreview(item)}
          </p>
          {item.matches?.length ? (
            <div className="mt-6 space-y-3">
              {item.matches.slice(0, 3).map((match, index) => (
                <MatchPreview
                  key={`${item.id}-${item.content.id}-${index}`}
                  match={match}
                  query={query}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-8 flex items-center justify-between border-t border-stone-100 pt-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
              {item.topic?.title
                ? `Topic · ${item.topic.title}`
                : isDocumentationResult(item)
                ? item.instructionType || 'Documentation'
                : item.content.complexity || 'Complexity not specified'}
            </p>
            <span className="text-sm font-medium text-amber-700">
              {getSourceType(item) === 'task'
                ? 'Open task'
                : isDocumentationResult(item)
                ? item.documentId === 'git-simulator'
                  ? 'Open simulator'
                  : 'Open document'
                : 'Open topic'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
