import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddTaskButton } from '@/components/todo/AddTaskButton';
import { getCategoryTopics } from '@/lib/api';
import { getPublicCategoryName } from '@/lib/display';
import { Content, TopicSummary } from '@/lib/types';

type CategoryPageProps = {
  params: Promise<{ id: string }>;
};

function getPackageName(code: string | null) {
  return code?.match(/^\s*package\s+([^;]+);/m)?.[1] || '';
}

function getDeclaration(code: string | null) {
  const match = code?.match(
    /^\s*(?:(?:public|protected|private|abstract|final|static)\s+)*(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/m
  );

  if (!match) {
    return null;
  }

  return {
    type: match[1],
    name: match[2],
  };
}

function getPathFromQuery(content: Content | undefined) {
  const pathMatch = content?.query.match(/\b(?:src|test)\/[^\s]+\.java\b/);
  return pathMatch?.[0] || '';
}

function getScopeTag(pathValue: string) {
  if (pathValue.startsWith('test/')) {
    return 'test';
  }

  if (pathValue.startsWith('src/')) {
    return 'src';
  }

  return '';
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M2.5 6.5c0-.69.56-1.25 1.25-1.25h3.91c.37 0 .71.16.95.44l.96 1.12h6.68c.69 0 1.25.56 1.25 1.25v6.44c0 .69-.56 1.25-1.25 1.25H3.75c-.69 0-1.25-.56-1.25-1.25v-8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function FileCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M5.25 2.75h6.25l3.25 3.25v11.25h-9.5A1.25 1.25 0 0 1 4 16V4a1.25 1.25 0 0 1 1.25-1.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M11.5 2.75V6h3.25M8 10.25 6.75 11.5 8 12.75M12 10.25l1.25 1.25L12 12.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function FileCard({ topic }: { topic: TopicSummary }) {
  const primaryContent = topic.content[0];
  const packageName = getPackageName(primaryContent?.code || '');
  const declaration = getDeclaration(primaryContent?.code || '');
  const pathValue = getPathFromQuery(primaryContent);
  const scopeTag = getScopeTag(pathValue);

  return (
    <Link
      href={`/topic/${topic.id}`}
      prefetch={false}
      className="group grid gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm shadow-stone-200/40 transition hover:border-amber-200 hover:bg-amber-50/30 md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500 group-hover:border-amber-200 group-hover:bg-white group-hover:text-amber-700">
          <FileCodeIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-stone-950">
            {topic.title}
          </h2>
          {pathValue ? (
            <p className="mt-1 truncate font-[family-name:var(--font-mono)] text-xs text-stone-500">
              {pathValue}
            </p>
          ) : null}

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
            {primaryContent?.explanation ||
              'Open this file to review its implementation details.'}
          </p>
          {packageName ? (
            <p className="mt-2 truncate font-[family-name:var(--font-mono)] text-xs text-stone-500">
              package {packageName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        {scopeTag ? (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">
            {scopeTag}
          </span>
        ) : null}
        {declaration ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-700">
            {declaration.type}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const category = await getCategoryTopics(id).catch(() => null);

  if (!category) {
    notFound();
  }

  const categoryName = getPublicCategoryName(category);
  const breadcrumbs = category.breadcrumbs?.length
    ? category.breadcrumbs
    : [category];
  const isCodebaseFolder = breadcrumbs.some(
    (breadcrumb) => breadcrumb.name === 'COMP2100 MiniLab'
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-7 shadow-sm shadow-stone-200/50">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          {breadcrumbs.map((breadcrumb, index) => (
            <span key={breadcrumb.id} className="flex items-center gap-2">
              {index > 0 ? <span>/</span> : null}
              <Link
                href={`/category/${breadcrumb.id}`}
                prefetch={false}
                className="font-medium hover:text-amber-700"
              >
                {getPublicCategoryName(breadcrumb)}
              </Link>
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
          Folder
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-stone-950">
          {categoryName}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
          {isCodebaseFolder
            ? 'Folder in the COMP2100 MiniLab codebase.'
            : 'Folder in the knowledge base.'}
        </p>
        <div className="mt-6">
          <AddTaskButton
            label="+ Add task for this folder"
            defaultTitle={`Review ${categoryName}`}
            defaultDescription={`Task linked to the ${categoryName} folder.`}
            linkedCategoryId={category.id}
          />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-stone-200 bg-white/55 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
            Folders
          </p>
          <span className="text-sm text-stone-500">
            {category.subcategories?.length || 0}
          </span>
        </div>
        {category.subcategories?.length ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {category.subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/category/${subcategory.id}`}
                prefetch={false}
                className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm shadow-stone-200/30 transition hover:border-amber-200 hover:bg-amber-50/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500 group-hover:border-amber-200 group-hover:bg-white group-hover:text-amber-700">
                  <FolderIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold tracking-tight text-stone-950">
                    {getPublicCategoryName(subcategory)}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">Folder</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/70 p-6 text-sm text-stone-500">
            No folders in this folder.
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-stone-200 bg-white/55 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
            Files
          </p>
          <span className="text-sm text-stone-500">
            {category.topics.length}
          </span>
        </div>
        {category.topics.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-sm text-stone-500">
            No files in this folder.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {category.topics.map((topic) => (
              <FileCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
