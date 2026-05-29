'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

type SearchBarProps = {
  initialQuery?: string;
  compact?: boolean;
  workspace?: boolean;
};

export function SearchBar({
  initialQuery = '',
  compact = false,
  workspace = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (workspace) {
      return;
    }

    function clearSearch() {
      setQuery('');
    }

    window.addEventListener('clear-global-search', clearSearch);

    return () => {
      window.removeEventListener('clear-global-search', clearSearch);
    };
  }, [workspace]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      router.push('/search');
      return;
    }

    const trimmedQuery = query.trim();

    const params = new URLSearchParams({
      q: trimmedQuery,
      r: Date.now().toString(),
    });

    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label className="sr-only" htmlFor="search-input">
        Search topics
      </label>
      <div
        className={[
          'group flex items-center rounded-2xl border border-stone-200 bg-white/90 shadow-sm shadow-stone-200/50 transition focus-within:border-amber-300 focus-within:ring-4 focus-within:ring-amber-100',
          compact ? 'h-12 px-3' : 'h-14 px-4',
        ].join(' ')}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 text-stone-400 group-focus-within:text-amber-600"
        >
          <path
            fill="currentColor"
            d="M10 4a6 6 0 1 0 3.874 10.582l4.272 4.272l1.414-1.414l-4.272-4.272A6 6 0 0 0 10 4m-4 6a4 4 0 1 1 8 0a4 4 0 0 1-8 0"
          />
        </svg>
        <input
          id="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search code symbols, paths, tasks, and notes"
          className="h-full w-full bg-transparent px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50 transition hover:bg-amber-600"
        >
          Find
        </button>
      </div>
    </form>
  );
}
