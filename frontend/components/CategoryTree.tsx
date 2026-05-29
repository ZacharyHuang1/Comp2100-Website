'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { getPublicCategoryName } from '@/lib/display';
import { Category } from '@/lib/types';

type CategoryNode = Category & {
  children: CategoryNode[];
};

type CategoryTreeProps = {
  categories: Category[];
};

const EXPANDED_STORAGE_KEY = 'code-knowledge-base-expanded-categories';

function areSetsEqual(firstSet: Set<string>, secondSet: Set<string>) {
  if (firstSet.size !== secondSet.size) {
    return false;
  }

  for (const item of firstSet) {
    if (!secondSet.has(item)) {
      return false;
    }
  }

  return true;
}

function addIdsIfChanged(currentIds: Set<string>, idsToAdd: string[]) {
  const nextIds = new Set(currentIds);

  idsToAdd.forEach((id) => nextIds.add(id));

  return areSetsEqual(currentIds, nextIds) ? currentIds : nextIds;
}

function getParentId(category: Category) {
  const parentId = category.parent_id ?? category.parentId ?? null;
  return parentId === null ? null : String(parentId);
}

function getRootRank(category: Category) {
  return category.name.toLowerCase() === 'code bases' ? 0 : 1;
}

function buildCategoryTree(categories: Category[]) {
  const nodes = new Map<string, CategoryNode>();

  for (const category of categories) {
    const id = String(category.id);
    const parentId = getParentId(category);

    nodes.set(id, {
      ...category,
      id,
      parent_id: parentId,
      parentId,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const node of nodes.values()) {
    const parentId = getParentId(node);

    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: CategoryNode[]) => {
    items.sort((left, right) => {
      const rankDifference = getRootRank(left) - getRootRank(right);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      return getPublicCategoryName(left).localeCompare(
        getPublicCategoryName(right)
      );
    });
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
}

function collectDefaultExpandedIds(
  categories: Category[],
  currentCategoryId: string
) {
  const categoriesById = new Map(
    categories.map((category) => [String(category.id), category])
  );
  const expandedIds = new Set<string>();

  for (const category of categories) {
    if (['code bases', 'comp2100 minilab'].includes(category.name.toLowerCase())) {
      expandedIds.add(String(category.id));
    }
  }

  let currentCategory = categoriesById.get(currentCategoryId);

  while (currentCategory) {
    expandedIds.add(String(currentCategory.id));
    const parentId = getParentId(currentCategory);
    currentCategory = parentId ? categoriesById.get(parentId) : undefined;
  }

  return Array.from(expandedIds).sort();
}

function filterTree(nodes: CategoryNode[], filterValue: string): CategoryNode[] {
  if (!filterValue) {
    return nodes;
  }

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children, filterValue);
      const labelMatches = getPublicCategoryName(node)
        .toLowerCase()
        .includes(filterValue);

      if (!labelMatches && filteredChildren.length === 0) {
        return null;
      }

      return {
        ...node,
        children: filteredChildren,
      };
    })
    .filter((node): node is CategoryNode => Boolean(node));
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M6 4.5 9.5 8 6 11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m4.5 6 3.5 3.5L11.5 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function FolderIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d={
          open
            ? 'M3.75 6.25h4.06l1.25 1.5h7.19c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25H3.75c-.69 0-1.25-.56-1.25-1.25v-7c0-.69.56-1.25 1.25-1.25Z'
            : 'M2.5 6.5c0-.69.56-1.25 1.25-1.25h3.91c.37 0 .71.16.95.44l.96 1.12h6.68c.69 0 1.25.56 1.25 1.25v6.44c0 .69-.56 1.25-1.25 1.25H3.75c-.69 0-1.25-.56-1.25-1.25v-8Z'
        }
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function CategoryTree({ categories }: CategoryTreeProps) {
  const pathname = usePathname();
  const currentCategoryId = pathname.match(/^\/category\/([^/]+)/)?.[1] || '';
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const defaultExpandedIds = useMemo(
    () => collectDefaultExpandedIds(categories, currentCategoryId),
    [categories, currentCategoryId]
  );
  const defaultExpandedKey = defaultExpandedIds.join(',');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(defaultExpandedIds)
  );
  const [filterValue, setFilterValue] = useState('');
  const normalizedFilter = filterValue.trim().toLowerCase();
  const visibleTree = useMemo(
    () => filterTree(categoryTree, normalizedFilter),
    [categoryTree, normalizedFilter]
  );

  useEffect(() => {
    const idsToExpand = defaultExpandedKey
      ? defaultExpandedKey.split(',').filter(Boolean)
      : [];

    setExpandedIds((currentExpandedIds) =>
      addIdsIfChanged(currentExpandedIds, idsToExpand)
    );
  }, [defaultExpandedKey]);

  useEffect(() => {
    const storedExpandedIds = window.localStorage.getItem(EXPANDED_STORAGE_KEY);

    if (!storedExpandedIds) {
      return;
    }

    try {
      const parsedExpandedIds = JSON.parse(storedExpandedIds);

      if (Array.isArray(parsedExpandedIds)) {
        setExpandedIds((currentExpandedIds) => {
          const idsToAdd = parsedExpandedIds.filter(
            (id): id is string => typeof id === 'string'
          );
          return addIdsIfChanged(currentExpandedIds, idsToAdd);
        });
      }
    } catch {
      window.localStorage.removeItem(EXPANDED_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      EXPANDED_STORAGE_KEY,
      JSON.stringify(Array.from(expandedIds))
    );
  }, [expandedIds]);

  function toggleExpanded(categoryId: string) {
    setExpandedIds((currentExpandedIds) => {
      const nextExpandedIds = new Set(currentExpandedIds);

      if (nextExpandedIds.has(categoryId)) {
        nextExpandedIds.delete(categoryId);
      } else {
        nextExpandedIds.add(categoryId);
      }

      return nextExpandedIds;
    });
  }

  function renderNode(category: CategoryNode, depth: number) {
    const hasChildren = category.children.length > 0;
    const isExpanded = normalizedFilter ? true : expandedIds.has(category.id);
    const isSelected = category.id === currentCategoryId;
    const label = getPublicCategoryName(category);

    return (
      <div key={category.id}>
        <div
          className={`group relative flex h-8 items-center rounded-lg pr-2 text-sm transition ${
            isSelected
              ? 'bg-stone-200/80 text-stone-950 shadow-sm shadow-stone-200/60'
              : 'text-stone-600 hover:bg-white/80 hover:text-stone-950'
          }`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {isSelected ? (
            <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-amber-600" />
          ) : null}
          <button
            type="button"
            aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
            onClick={(event) => {
              event.stopPropagation();

              if (hasChildren) {
                toggleExpanded(category.id);
              }
            }}
            className={`mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
              hasChildren
                ? 'text-stone-400 hover:bg-stone-200/70 hover:text-stone-700'
                : 'text-transparent'
            }`}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>
          <Link
            href={`/category/${category.id}`}
            prefetch={false}
            className="flex min-w-0 flex-1 items-center gap-2 py-1"
          >
            <FolderIcon
              open={hasChildren && isExpanded}
              className={`h-4 w-4 shrink-0 ${
                isSelected ? 'text-amber-700' : 'text-stone-400'
              }`}
            />
            <span
              className={`truncate ${
                depth === 0 || isSelected ? 'font-semibold' : 'font-medium'
              }`}
            >
              {label}
            </span>
          </Link>
        </div>

        {hasChildren && isExpanded ? (
          <div className="mt-0.5 space-y-0.5">
            {category.children.map((childCategory) =>
              renderNode(childCategory, depth + 1)
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label className="sr-only" htmlFor="category-filter">
        Filter explorer
      </label>
      <input
        id="category-filter"
        type="search"
        value={filterValue}
        onChange={(event) => setFilterValue(event.target.value)}
        placeholder="Filter files..."
        className="h-9 w-full rounded-xl border border-stone-200 bg-white/80 px-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
      />
      <nav className="mt-3 space-y-0.5">
        {visibleTree.length ? (
          visibleTree.map((node) => renderNode(node, 0))
        ) : (
          <p className="rounded-xl border border-dashed border-stone-200 bg-white/60 px-3 py-4 text-sm text-stone-500">
            No matching folders.
          </p>
        )}
      </nav>
    </div>
  );
}
