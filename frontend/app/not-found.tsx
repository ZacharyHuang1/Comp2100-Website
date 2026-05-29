import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-10 shadow-sm shadow-stone-200/40">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
        Not Found
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-stone-950">
        This page does not exist.
      </h1>
      <p className="mt-4 text-sm leading-8 text-stone-600">
        The requested category or topic could not be loaded from the backend.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-amber-600"
      >
        Return home
      </Link>
    </div>
  );
}
