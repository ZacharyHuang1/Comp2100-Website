import Link from 'next/link';
import type { Route } from 'next';

import { getCategories } from '@/lib/api';
import { getPublicCategoryName, getPublicCategorySlug } from '@/lib/display';

export default async function HomePage() {
  const categories = await getCategories();
  const rootCategories = categories.filter(
    (category) => !(category.parent_id || category.parentId)
  );
  const codeBasesCategory = rootCategories.find(
    (category) => getPublicCategoryName(category).toLowerCase() === 'code bases'
  );
  const notesCategory = rootCategories.find(
    (category) => getPublicCategoryName(category).toLowerCase() === 'notes'
  );
  const workspaceCards = [
    codeBasesCategory
      ? {
          title: 'Code Bases',
          href: `/category/${codeBasesCategory.id}` as Route,
          slug: getPublicCategorySlug(codeBasesCategory),
          description:
            'Browse imported Java packages, files, symbols, and implementation notes.',
        }
      : null,
    notesCategory
      ? {
          title: 'Notes',
          href: `/category/${notesCategory.id}` as Route,
          slug: getPublicCategorySlug(notesCategory),
          description:
            'Review reference notes and created documents from the knowledge base.',
        }
      : null,
    {
      title: 'To-do List',
      href: '/todo' as Route,
      slug: 'tasks',
      description:
        'Plan code work, study tasks, linked notes, and hackathon practice.',
    },
    {
      title: 'Documentation',
      href: '/documentation' as Route,
      slug: 'instructions',
      description:
        'Browse guides, workflows, and project instructions.',
    },
    {
      title: 'Git Simulator',
      href: '/git-simulator' as Route,
      slug: 'git-workflow',
      description:
        'Practice commit, branch, push, pull, and merge workflows with a visual Git graph.',
    },
  ].filter(Boolean) as Array<{
    title: string;
    href: Route;
    slug: string;
    description: string;
  }>;

  return (
    <div className="space-y-10">
      <Link
        href="/todo"
        className="group block rounded-[2rem] border border-stone-200 bg-white/80 p-8 shadow-sm shadow-stone-200/50 transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-stone-200/60 sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Task Workspace
        </p>
        <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-serif)] text-4xl leading-tight tracking-tight text-stone-950 sm:text-5xl">
          Plan your code work, study tasks, and hackathon practice.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
          Create lists, track implementation tasks, link notes, and organise
          coding work from the knowledge base.
        </p>
        <span className="mt-8 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 transition group-hover:bg-amber-600">
          Open To-do List
        </span>
      </Link>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
              Library Index
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
              Categories
            </h2>
          </div>
          <p className="text-sm text-stone-500">
            {rootCategories.length} sections
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workspaceCards.map((card, index) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm shadow-stone-200/40 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/50"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Section {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-stone-950">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {card.description}
              </p>
              <div className="mt-8 flex items-center justify-between border-t border-stone-100 pt-5">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {card.slug}
                </span>
                <span className="text-sm font-medium text-amber-700">
                  Explore
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
