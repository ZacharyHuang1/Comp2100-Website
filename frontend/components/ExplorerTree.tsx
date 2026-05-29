'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { API_BASE_URL } from '@/lib/config';
import {
  ExplorerCategoryNode,
  ExplorerNode,
  ExplorerTopicNode,
} from '@/lib/types';

type ExplorerTreeProps = {
  initialTree: ExplorerNode[];
};

type ContextMenuState = {
  x: number;
  y: number;
  node: ExplorerNode | null;
};

type MarkableItemType = 'category' | 'topic';

type ModalState =
  | { type: 'create-folder'; parentId: string | null }
  | { type: 'rename-folder'; node: ExplorerCategoryNode }
  | { type: 'delete-folder'; node: ExplorerCategoryNode }
  | { type: 'create-file'; category: ExplorerCategoryNode }
  | { type: 'rename-file'; node: ExplorerTopicNode }
  | { type: 'delete-file'; node: ExplorerTopicNode };

const EXPANDED_STORAGE_KEY = 'code-knowledge-base-explorer-expanded';

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

function getNodeLabel(node: ExplorerNode) {
  return node.type === 'category' ? node.name : node.title;
}

function getTopicCategoryId(nodes: ExplorerNode[], topicId: string): string | null {
  for (const node of nodes) {
    if (node.type === 'topic' && node.id === topicId) {
      return node.categoryId;
    }

    if (node.type === 'category') {
      const categoryId = getTopicCategoryId(node.children, topicId);

      if (categoryId) {
        return categoryId;
      }
    }
  }

  return null;
}

function flattenCategories(nodes: ExplorerNode[], depth = 0) {
  const categories: Array<ExplorerCategoryNode & { depth: number }> = [];

  for (const node of nodes) {
    if (node.type !== 'category') {
      continue;
    }

    categories.push({ ...node, depth });
    categories.push(...flattenCategories(node.children, depth + 1));
  }

  return categories;
}

function collectDefaultExpandedIds(
  nodes: ExplorerNode[],
  activeCategoryId: string,
  activeTopicId: string
) {
  const categoryById = new Map<string, ExplorerCategoryNode>();
  const expandedIds = new Set<string>();
  const activeTopicCategoryId = activeTopicId
    ? getTopicCategoryId(nodes, activeTopicId)
    : null;

  function visit(nodeList: ExplorerNode[]) {
    for (const node of nodeList) {
      if (node.type !== 'category') {
        continue;
      }

      categoryById.set(node.id, node);

      if (['code bases', 'comp2100 minilab'].includes(node.name.toLowerCase())) {
        expandedIds.add(node.id);
      }

      visit(node.children);
    }
  }

  visit(nodes);

  let currentId = activeCategoryId || activeTopicCategoryId || null;

  while (currentId) {
    const category = categoryById.get(currentId);

    if (!category) {
      break;
    }

    expandedIds.add(category.id);
    currentId = category.parentId;
  }

  return Array.from(expandedIds).sort();
}

function filterTree(nodes: ExplorerNode[], filterValue: string): ExplorerNode[] {
  if (!filterValue) {
    return nodes;
  }

  return nodes
    .map((node) => {
      const labelMatches = getNodeLabel(node).toLowerCase().includes(filterValue);

      if (node.type === 'topic') {
        const pathMatches = (node.path || '').toLowerCase().includes(filterValue);
        return labelMatches || pathMatches ? node : null;
      }

      const filteredChildren = filterTree(node.children, filterValue);

      if (!labelMatches && filteredChildren.length === 0) {
        return null;
      }

      return {
        ...node,
        children: filteredChildren,
      };
    })
    .filter((node): node is ExplorerNode => Boolean(node));
}

function getMarkItemType(node: ExplorerNode): MarkableItemType {
  return node.type === 'category' ? 'category' : 'topic';
}

function updateNodeMark(
  nodes: ExplorerNode[],
  itemType: MarkableItemType,
  itemId: string,
  marked: boolean
): ExplorerNode[] {
  return nodes.map((node) => {
    if (node.type === 'topic') {
      return itemType === 'topic' && node.id === itemId
        ? { ...node, marked }
        : node;
    }

    return {
      ...node,
      marked:
        itemType === 'category' && node.id === itemId ? marked : node.marked,
      children: updateNodeMark(node.children, itemType, itemId, marked),
    };
  });
}

function ChevronIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d={open ? 'm4.5 6 3.5 3.5L11.5 6' : 'M6 4.5 9.5 8 6 11.5'}
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

function StarMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="m10 2.75 2.16 4.38 4.84.7-3.5 3.42.83 4.82L10 13.79l-4.33 2.28.83-4.82L3 7.83l4.84-.7L10 2.75Z" />
    </svg>
  );
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export function ExplorerTree({ initialTree }: ExplorerTreeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeCategoryId = pathname.match(/^\/category\/([^/]+)/)?.[1] || '';
  const activeTopicId = pathname.match(/^\/topic\/([^/]+)/)?.[1] || '';
  const [tree, setTree] = useState(initialTree);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () =>
      new Set(
        collectDefaultExpandedIds(initialTree, activeCategoryId, activeTopicId)
      )
  );
  const [filterValue, setFilterValue] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const normalizedFilter = filterValue.trim().toLowerCase();
  const visibleTree = useMemo(
    () => filterTree(tree, normalizedFilter),
    [tree, normalizedFilter]
  );
  const categories = useMemo(() => flattenCategories(tree), [tree]);
  const defaultExpandedIds = useMemo(
    () => collectDefaultExpandedIds(tree, activeCategoryId, activeTopicId),
    [tree, activeCategoryId, activeTopicId]
  );
  const defaultExpandedKey = defaultExpandedIds.join(',');

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

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
        setExpandedIds((currentExpandedIds) =>
          addIdsIfChanged(
            currentExpandedIds,
            parsedExpandedIds.filter((id): id is string => typeof id === 'string')
          )
        );
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

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    }

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeMenuOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      document.body.classList.remove('explorer-context-menu-open');
      return;
    }

    document.body.classList.add('explorer-context-menu-open');

    return () => {
      document.body.classList.remove('explorer-context-menu-open');
    };
  }, [contextMenu]);

  function updateFormValue(key: string, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  function closeModal() {
    setModal(null);
    setFormValues({});
    setErrorMessage('');
  }

  function isModalDirty() {
    if (!modal) {
      return false;
    }

    if (modal.type === 'create-folder') {
      return Boolean((formValues.name || '').trim());
    }

    if (modal.type === 'rename-folder') {
      return (formValues.name || '') !== modal.node.name;
    }

    if (modal.type === 'rename-file') {
      return (formValues.title || '') !== modal.node.title;
    }

    if (modal.type === 'create-file') {
      return (
        (formValues.fileName || '') !== 'MyNewClass.java' ||
        (formValues.code || '') !== 'public class MyNewClass {\n}\n' ||
        Boolean((formValues.explanation || '').trim()) ||
        Boolean((formValues.complexity || '').trim())
      );
    }

    return false;
  }

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

  async function refreshExplorer() {
    const nextTree = await apiRequest<ExplorerNode[]>('/explorer');
    setTree(nextTree);
    return nextTree;
  }

  useEffect(() => {
    void refreshExplorer().catch(() => {
      setErrorMessage('Could not refresh explorer.');
    });
  }, []);

  async function toggleMark(node: ExplorerNode) {
    const itemType = getMarkItemType(node);
    const nextMarked = !node.marked;

    setContextMenu(null);
    setMessage('');
    setErrorMessage('');
    setTree((currentTree) =>
      updateNodeMark(currentTree, itemType, node.id, nextMarked)
    );

    try {
      if (nextMarked) {
        await apiRequest('/explorer/marks', {
          method: 'POST',
          body: JSON.stringify({
            itemType,
            itemId: node.id,
          }),
        });
      } else {
        await apiRequest(`/explorer/marks/${itemType}/${node.id}`, {
          method: 'DELETE',
        });
      }

      setMessage(nextMarked ? 'Marked.' : 'Unmarked.');
      await refreshExplorer();
    } catch {
      setTree((currentTree) =>
        updateNodeMark(currentTree, itemType, node.id, Boolean(node.marked))
      );
      setErrorMessage('Could not update mark.');
    }
  }

  useEffect(() => {
    function handleExplorerRefresh() {
      void refreshExplorer().catch(() => {
        setErrorMessage('Could not refresh explorer.');
      });
    }

    window.addEventListener('explorer-refresh', handleExplorerRefresh);
    return () => {
      window.removeEventListener('explorer-refresh', handleExplorerRefresh);
    };
  }, []);

  useEffect(() => {
    if (!modal) {
      return;
    }

    function closeModalOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeModal();
    }

    window.addEventListener('keydown', closeModalOnEscape);

    return () => {
      window.removeEventListener('keydown', closeModalOnEscape);
    };
  }, [modal, formValues]);

  function openContextMenu(event: MouseEvent, node: ExplorerNode | null) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
    });
  }

  function openCreateFolder(parentId: string | null) {
    setFormValues({ name: '' });
    setModal({ type: 'create-folder', parentId });
  }

  function openRenameFolder(node: ExplorerCategoryNode) {
    setFormValues({ name: node.name });
    setModal({ type: 'rename-folder', node });
  }

  function openCreateFile(category: ExplorerCategoryNode) {
    setFormValues({
      fileName: 'MyNewClass.java',
      code: 'public class MyNewClass {\n}\n',
      explanation: '',
      complexity: '',
    });
    setModal({ type: 'create-file', category });
  }

  function openRenameFile(node: ExplorerTopicNode) {
    setFormValues({ title: node.title });
    setModal({ type: 'rename-file', node });
  }

  async function handleModalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!modal) {
      return;
    }

    setIsBusy(true);
    setErrorMessage('');
    setMessage('');

    try {
      if (modal.type === 'create-folder') {
        const category = await apiRequest<ExplorerCategoryNode>(
          '/explorer/categories',
          {
            method: 'POST',
            body: JSON.stringify({
              name: formValues.name,
              parentId: modal.parentId,
            }),
          }
        );
        await refreshExplorer();

        if (modal.parentId) {
          setExpandedIds((currentExpandedIds) =>
            addIdsIfChanged(currentExpandedIds, [modal.parentId || ''])
          );
        }

        setMessage('Saved.');
        router.push(`/category/${category.id}`);
      }

      if (modal.type === 'rename-folder') {
        await apiRequest(`/explorer/categories/${modal.node.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formValues.name,
            parentId: modal.node.parentId,
          }),
        });
        await refreshExplorer();
        setMessage('Saved.');
      }

      if (modal.type === 'delete-folder') {
        await apiRequest(`/explorer/categories/${modal.node.id}`, {
          method: 'DELETE',
        });
        await refreshExplorer();
        setMessage('Deleted.');

        if (activeCategoryId === modal.node.id) {
          router.push('/');
        }
      }

      if (modal.type === 'create-file') {
        const result = await apiRequest<{ topic: { id: string } }>(
          `/explorer/categories/${modal.category.id}/java-file`,
          {
            method: 'POST',
            body: JSON.stringify({
              fileName: formValues.fileName,
              code: formValues.code,
              explanation: formValues.explanation,
              complexity: formValues.complexity,
            }),
          }
        );
        await refreshExplorer();
        setExpandedIds((currentExpandedIds) =>
          addIdsIfChanged(currentExpandedIds, [modal.category.id])
        );
        setMessage('Saved.');
        router.push(`/topic/${result.topic.id}`);
      }

      if (modal.type === 'rename-file') {
        await apiRequest(`/explorer/topics/${modal.node.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formValues.title,
          }),
        });
        await refreshExplorer();
        window.dispatchEvent(new Event('explorer-refresh'));
        window.dispatchEvent(
          new CustomEvent('topic-content-updated', {
            detail: { topicId: modal.node.id },
          })
        );

        if (activeTopicId === modal.node.id) {
          router.refresh();
        }

        setMessage('Saved.');
      }

      if (modal.type === 'delete-file') {
        await apiRequest(`/explorer/topics/${modal.node.id}`, {
          method: 'DELETE',
        });
        await refreshExplorer();
        setMessage('Deleted.');

        if (activeTopicId === modal.node.id) {
          router.push(`/category/${modal.node.categoryId}`);
        }
      }

      closeModal();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not complete action.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  function renderNode(node: ExplorerNode, depth: number) {
    const isCategory = node.type === 'category';
    const hasChildren = isCategory && node.children.length > 0;
    const isExpanded =
      normalizedFilter || !isCategory ? true : expandedIds.has(node.id);
    const isActive =
      (node.type === 'category' && node.id === activeCategoryId) ||
      (node.type === 'topic' && node.id === activeTopicId);
    const label = getNodeLabel(node);

    return (
      <div key={`${node.type}-${node.id}`} data-explorer-node>
        <div
          className={`group relative flex h-7 items-center rounded-md pr-2 text-[13px] transition ${
            isActive
              ? 'bg-stone-200/90 text-stone-950'
              : 'text-stone-600 hover:bg-white/80 hover:text-stone-950'
          }`}
          style={{ paddingLeft: `${6 + depth * 12}px` }}
          onContextMenu={(event) => openContextMenu(event, node)}
        >
          {isActive ? (
            <span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-amber-600" />
          ) : null}
          {isCategory ? (
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(node.id);
              }}
              className={`mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
                hasChildren
                  ? 'text-stone-400 hover:bg-stone-200/80 hover:text-stone-700'
                  : 'text-stone-300'
              }`}
            >
              {hasChildren ? (
                <ChevronIcon open={Boolean(isExpanded)} className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="mr-0.5 h-5 w-5 shrink-0" />
          )}

          <Link
            href={isCategory ? `/category/${node.id}` : `/topic/${node.id}`}
            prefetch={false}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1"
          >
            {isCategory ? (
              <FolderIcon
                open={Boolean(isExpanded && hasChildren)}
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-amber-700' : 'text-stone-400'
                }`}
              />
            ) : (
              <FileCodeIcon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-amber-700' : 'text-stone-400'
                }`}
              />
            )}
            <span className={`truncate ${isActive ? 'font-semibold' : ''}`}>
              {label}
            </span>
            {node.marked ? (
              <StarMarkIcon
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
              />
            ) : null}
          </Link>
        </div>

        {isCategory && hasChildren && isExpanded ? (
          <div className="space-y-0.5">
            {node.children.map((childNode) => renderNode(childNode, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderContextMenu() {
    if (!contextMenu) {
      return null;
    }

    const node = contextMenu.node;
    const itemClass =
      'block w-full px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-100';

    const menu = (
      <div
        className="fixed z-[300] min-w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-2xl shadow-stone-900/20"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {!node ? (
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setContextMenu(null);
              openCreateFolder(null);
            }}
          >
            New root folder
          </button>
        ) : null}

        {node?.type === 'category' ? (
          <>
            <button
              type="button"
              className={itemClass}
              onClick={() => void toggleMark(node)}
            >
              {node.marked ? 'Unmark folder' : 'Mark folder'}
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setContextMenu(null);
                openCreateFolder(node.id);
              }}
            >
              New folder
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setContextMenu(null);
                openCreateFile(node);
              }}
            >
              New Java file
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setContextMenu(null);
                openRenameFolder(node);
              }}
            >
              Rename folder
            </button>
            <button
              type="button"
              className={`${itemClass} text-rose-700`}
              onClick={() => {
                setContextMenu(null);
                setModal({ type: 'delete-folder', node });
              }}
            >
              Delete folder
            </button>
          </>
        ) : null}

        {node?.type === 'topic' ? (
          <>
            <button
              type="button"
              className={itemClass}
              onClick={() => void toggleMark(node)}
            >
              {node.marked ? 'Unmark file' : 'Mark file'}
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setContextMenu(null);
                openRenameFile(node);
              }}
            >
              Rename file
            </button>
            <button
              type="button"
              className={`${itemClass} text-rose-700`}
              onClick={() => {
                setContextMenu(null);
                setModal({ type: 'delete-file', node });
              }}
            >
              Delete file
            </button>
          </>
        ) : null}
      </div>
    );

    return typeof document === 'undefined' ? null : createPortal(menu, document.body);
  }

  function renderModalFields() {
    if (!modal) {
      return null;
    }

    if (modal.type === 'delete-folder') {
      return (
        <p className="text-sm leading-6 text-stone-600">
          Delete folder <strong>{modal.node.name}</strong>? Non-empty folders are
          blocked by the server.
        </p>
      );
    }

    if (modal.type === 'delete-file') {
      return (
        <p className="text-sm leading-6 text-stone-600">
          Delete file <strong>{modal.node.title}</strong>? Its content and
          blocks will be removed with the topic.
        </p>
      );
    }

    if (modal.type === 'create-folder' || modal.type === 'rename-folder') {
      return (
        <label className="block text-sm font-medium text-stone-700">
          Folder name
          <input
            value={formValues.name || ''}
            onChange={(event) => updateFormValue('name', event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            autoFocus
          />
        </label>
      );
    }

    if (modal.type === 'rename-file') {
      return (
        <label className="block text-sm font-medium text-stone-700">
          File name
          <input
            value={formValues.title || ''}
            onChange={(event) => updateFormValue('title', event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            autoFocus
          />
        </label>
      );
    }

    if (modal.type === 'create-file') {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            File name
            <input
              value={formValues.fileName || ''}
              onChange={(event) => updateFormValue('fileName', event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Initial Java code
            <textarea
              value={formValues.code || ''}
              onChange={(event) => updateFormValue('code', event.target.value)}
              className="mt-2 min-h-56 w-full rounded-xl border border-stone-200 px-3 py-3 font-[family-name:var(--font-mono)] text-xs outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Explanation
            <textarea
              value={formValues.explanation || ''}
              onChange={(event) =>
                updateFormValue('explanation', event.target.value)
              }
              className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 px-3 py-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Complexity
            <input
              value={formValues.complexity || ''}
              onChange={(event) =>
                updateFormValue('complexity', event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
        </div>
      );
    }

    return null;
  }

  function getModalTitle() {
    if (!modal) {
      return '';
    }

    const titles = {
      'create-folder': 'New folder',
      'rename-folder': 'Rename folder',
      'delete-folder': 'Delete folder',
      'create-file': 'New Java file',
      'rename-file': 'Rename file',
      'delete-file': 'Delete file',
    };

    return titles[modal.type];
  }

  function renderModal() {
    if (!modal || typeof document === 'undefined') {
      return null;
    }

    const isCreateFile = modal.type === 'create-file';
    const modalMaxWidth = isCreateFile ? 'max-w-[760px]' : 'max-w-[560px]';
    const modalElement = (
      <div
        className="fixed inset-0 z-[180] flex items-center justify-center bg-stone-950/35 px-4 py-8 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isModalDirty()) {
            closeModal();
          }
        }}
      >
        <form
          onSubmit={handleModalSubmit}
          onMouseDown={(event) => event.stopPropagation()}
          className={`relative z-[200] max-h-[88vh] w-[calc(100vw-32px)] ${modalMaxWidth} overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-950/25`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-stone-950">
                {getModalTitle()}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Changes are saved to the knowledge base.
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            >
              Close
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-5">{renderModalFields()}</div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy
                ? 'Saving'
                : modal.type === 'delete-file' || modal.type === 'delete-folder'
                  ? 'Delete'
                  : 'Save'}
            </button>
          </div>
        </form>
      </div>
    );

    return createPortal(modalElement, document.body);
  }

  return (
    <div
      className="mt-3 min-h-[calc(100vh-13rem)]"
      onContextMenu={(event) => {
        const target = event.target as HTMLElement;

        if (target.closest('[data-explorer-node]') || target.closest('input')) {
          return;
        }

        openContextMenu(event, null);
      }}
    >
      <label className="sr-only" htmlFor="explorer-filter">
        Filter explorer
      </label>
      <input
        id="explorer-filter"
        type="search"
        value={filterValue}
        onChange={(event) => setFilterValue(event.target.value)}
        placeholder="Filter files..."
        className="h-8 w-full rounded-md border border-stone-200 bg-white/80 px-2.5 text-[13px] text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
      />

      {message ? (
        <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">
          {message}
        </p>
      ) : null}
      {errorMessage && !modal ? (
        <p className="mt-2 rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <nav className="mt-3 space-y-0.5">
        {visibleTree.length ? (
          visibleTree.map((node) => renderNode(node, 0))
        ) : (
          <p className="rounded-md border border-dashed border-stone-200 bg-white/60 px-3 py-4 text-sm text-stone-500">
            No matching files.
          </p>
        )}
      </nav>

      {renderContextMenu()}
      {renderModal()}
    </div>
  );
}
