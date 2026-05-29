import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    r?: string;
    quiet?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white/80 p-8 shadow-sm shadow-stone-200/50">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
          Search Workspace
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-stone-950">
          Search the knowledge base
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
          Search code symbols, file paths, course tasks, documentation, and
          implementation notes from one place.
        </p>
        <div className="mt-6 max-w-3xl">
          <SearchBar initialQuery={q} workspace />
        </div>
      </section>

      <SearchResults />
    </div>
  );
}
