'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';

import { InlineEditableCode } from '@/components/InlineEditableCode';
import { InlineEditableText } from '@/components/InlineEditableText';
import { AddTaskButton } from '@/components/todo/AddTaskButton';
import { API_BASE_URL, PUBLIC_DOCUMENT_EDITING } from '@/lib/config';
import { getPublicCategoryName } from '@/lib/display';
import { Content, ContentVariant, TopicSummary } from '@/lib/types';

type ArticleDetailProps = {
  initialTopic: TopicSummary;
};

type BlockType = 'java_function' | 'java_class' | 'explanation' | 'note' | 'uml';

type CodeSearchBlock = {
  key: string;
  matchCount: number;
  startIndex: number;
};

const BLOCK_OPTIONS: Array<{ type: BlockType; label: string }> = [
  { type: 'java_function', label: 'Java function' },
  { type: 'java_class', label: 'Java class' },
  { type: 'explanation', label: 'Explanation' },
  { type: 'note', label: 'Note' },
  { type: 'uml', label: 'UML' },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({
  text,
  term,
}: {
  text: string;
  term: string;
}) {
  const normalizedTerm = term.trim();

  if (!normalizedTerm) {
    return text;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(normalizedTerm)})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedTerm.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function TaskDescriptionText({
  text,
  term,
}: {
  text: string;
  term: string;
}) {
  return (
    <div className="space-y-3 text-sm leading-7 text-stone-800">
      {text.split('\n').map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return <div key={`gap-${index}`} className="h-1" />;
        }

        const fieldMatch = trimmedLine.match(/^\*\*(.+?):\*\*\s*(.*)$/);

        if (fieldMatch) {
          return (
            <p key={`${trimmedLine}-${index}`}>
              <span className="font-semibold text-stone-950">
                {fieldMatch[1]}:
              </span>{' '}
              {fieldMatch[2] ? (
                <HighlightedText text={fieldMatch[2]} term={term} />
              ) : null}
            </p>
          );
        }

        if (trimmedLine.startsWith('- ')) {
          return (
            <p key={`${trimmedLine}-${index}`} className="pl-4">
              <span className="mr-2 text-amber-700">•</span>
              <HighlightedText text={trimmedLine.slice(2)} term={term} />
            </p>
          );
        }

        return (
          <p key={`${trimmedLine}-${index}`}>
            <HighlightedText text={trimmedLine} term={term} />
          </p>
        );
      })}
    </div>
  );
}

function countMatches(text: string, term: string) {
  const normalizedTerm = term.trim();

  if (!normalizedTerm) {
    return 0;
  }

  return (text.match(new RegExp(escapeRegExp(normalizedTerm), 'gi')) || [])
    .length;
}

function buildCodeSearchState({
  primaryCode,
  searchTerm,
  variants,
}: {
  primaryCode: string;
  searchTerm: string;
  variants: ContentVariant[];
}) {
  let startIndex = 0;
  const byKey = new Map<string, CodeSearchBlock>();

  function addBlock(key: string, code: string) {
    const matchCount = countMatches(code, searchTerm);
    byKey.set(key, {
      key,
      matchCount,
      startIndex,
    });
    startIndex += matchCount;
  }

  addBlock('primary-code', primaryCode);

  for (const variant of variants) {
    if (variant.code) {
      addBlock(`variant-code-${variant.id}`, variant.code);
    }
  }

  return {
    byKey,
    totalMatches: startIndex,
  };
}

const ARCHITECTURE_DESCRIPTION_LABEL = 'Software Architecture and UML Description';
const GENERIC_COMPLEXITY_TEXT =
  'Complexity depends on the methods used in this class. Review loops, collection operations, and persistence calls for exact bounds.';

function getComplexityDisplayLabel(value?: string | null) {
  return String(value || '').trim().startsWith(`${ARCHITECTURE_DESCRIPTION_LABEL}:`)
    ? ARCHITECTURE_DESCRIPTION_LABEL
    : 'Complexity';
}

function getUsefulComplexity(value?: string | null) {
  const text = String(value || '').trim();

  if (!text || text === GENERIC_COMPLEXITY_TEXT || text === 'Not specified.') {
    return '';
  }

  return text;
}

async function fetchTopic(topicId: string) {
  const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Topic refresh failed');
  }

  return response.json() as Promise<TopicSummary>;
}

async function editFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed: ${path}`);
  }

  return payload as T;
}

function buildContentPayload(
  topic: TopicSummary,
  content: Content,
  patch: Partial<Content> & { title?: string }
) {
  const nextQuery =
    patch.title && patch.query === undefined
      ? mergeTitleIntoQuery({
          previousTitle: topic.title,
          nextTitle: patch.title,
          query: content.query,
        })
      : patch.query;
  const nextContent = {
    ...content,
    ...patch,
    ...(nextQuery !== undefined ? { query: nextQuery } : {}),
  };

  return {
    topicId: topic.id,
    title: patch.title ?? topic.title,
    categoryId: topic.category.id,
    query: nextContent.query,
    code: nextContent.code || '',
    explanation: nextContent.explanation || '',
    complexity: nextContent.complexity || '',
    uml: nextContent.uml || '',
  };
}

function mergeTitleIntoQuery({
  previousTitle,
  nextTitle,
  query,
}: {
  previousTitle: string;
  nextTitle: string;
  query: string;
}) {
  const parts = query
    .split(/\s+/)
    .filter((part) => part && part !== previousTitle && part !== nextTitle);

  return [nextTitle, ...parts].join(' ').trim();
}

function buildVariantPayload(
  variant: ContentVariant,
  patch: Partial<ContentVariant>
) {
  const nextVariant = {
    ...variant,
    ...patch,
  };

  return {
    label: nextVariant.label,
    code: nextVariant.code || '',
    explanation: nextVariant.explanation || '',
    complexity: nextVariant.complexity || '',
    uml: nextVariant.uml || '',
  };
}

export function ArticleDetail({ initialTopic }: ArticleDetailProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const [toast, setToast] = useState('');
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [editingNewBlockId, setEditingNewBlockId] = useState<string | null>(
    null
  );
  const [documentEditingEnabled, setDocumentEditingEnabled] = useState(
    PUBLIC_DOCUMENT_EDITING
  );
  const primaryContent = topic.content[0] || null;
  const variants = topic.variants || [];
  const breadcrumbs = topic.breadcrumbs || [topic.category];
  const canEdit = documentEditingEnabled;
  const primaryComplexityLabel = getComplexityDisplayLabel(
    primaryContent?.complexity
  );
  const primaryUsefulComplexity = getUsefulComplexity(primaryContent?.complexity);

  useEffect(() => {
    fetch(`${API_BASE_URL}/document-editing`, {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((payload) => {
        if (typeof payload.enabled === 'boolean') {
          setDocumentEditingEnabled(payload.enabled);
        }
      })
      .catch(() => {
        setDocumentEditingEnabled(PUBLIC_DOCUMENT_EDITING);
      });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function handleTopicContentUpdated(event: Event) {
      const detail = (event as CustomEvent<{ topicId?: string }>).detail;

      if (detail?.topicId !== topic.id) {
        return;
      }

      try {
        setTopic(await fetchTopic(topic.id));
      } catch {
        setToast('Could not refresh.');
      }
    }

    window.addEventListener('topic-content-updated', handleTopicContentUpdated);

    return () => {
      window.removeEventListener(
        'topic-content-updated',
        handleTopicContentUpdated
      );
    };
  }, [topic.id]);

  const normalizedSearchTerm = searchTerm.trim();
  const codeSearchState = useMemo(
    () =>
      buildCodeSearchState({
        primaryCode: primaryContent?.code || '',
        searchTerm,
        variants,
      }),
    [primaryContent?.code, searchTerm, variants]
  );

  const matchCount = codeSearchState.totalMatches;

  useEffect(() => {
    setActiveSearchMatchIndex(0);
  }, [normalizedSearchTerm, topic.id]);

  useEffect(() => {
    if (!matchCount) {
      setActiveSearchMatchIndex(0);
      return;
    }

    if (activeSearchMatchIndex >= matchCount) {
      setActiveSearchMatchIndex(0);
    }
  }, [activeSearchMatchIndex, matchCount]);

  useEffect(() => {
    if (!normalizedSearchTerm || !matchCount) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-code-search-index="${activeSearchMatchIndex}"]`)
        ?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSearchMatchIndex, matchCount, normalizedSearchTerm]);

  function refreshTopicInBackground() {
    void fetchTopic(topic.id)
      .then((nextTopic) => setTopic(nextTopic))
      .catch(() => {
        setToast('Could not refresh.');
      });
  }

  async function savePrimaryContent(
    patch: Partial<Content> & { title?: string }
  ) {
    if (!primaryContent) {
      throw new Error('No content to update');
    }

    const payload = buildContentPayload(topic, primaryContent, patch);
    await editFetch(`/contents/${primaryContent.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    setTopic((currentTopic) => ({
      ...currentTopic,
      title: payload.title,
      content: currentTopic.content.map((content) =>
        content.id === primaryContent.id
          ? {
              ...content,
              query: payload.query,
              code: payload.code,
              explanation: payload.explanation,
              complexity: payload.complexity,
              uml: payload.uml,
            }
          : content
      ),
    }));
    setToast('Saved.');

    if (patch.title !== undefined || patch.query !== undefined) {
      window.dispatchEvent(new Event('explorer-refresh'));
    }

    refreshTopicInBackground();
  }

  async function saveVariant(
    variant: ContentVariant,
    patch: Partial<ContentVariant>
  ) {
    const payload = buildVariantPayload(variant, patch);
    await editFetch(`/variants/${variant.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    setTopic((currentTopic) => ({
      ...currentTopic,
      variants: (currentTopic.variants || []).map((currentVariant) =>
        currentVariant.id === variant.id
          ? {
              ...currentVariant,
              ...payload,
            }
          : currentVariant
      ),
    }));
    setToast('Saved.');
    refreshTopicInBackground();
  }

  async function clearPrimaryCode() {
    await savePrimaryContent({ code: '' });
  }

  async function deleteVariant(variant: ContentVariant) {
    await editFetch(`/variants/${variant.id}`, {
      method: 'DELETE',
    });

    setTopic((currentTopic) => ({
      ...currentTopic,
      variants: (currentTopic.variants || []).filter(
        (currentVariant) => currentVariant.id !== variant.id
      ),
    }));
    setToast('Deleted.');
    refreshTopicInBackground();
  }

  async function addBlock(type: BlockType) {
    try {
      const createdBlock = await editFetch<ContentVariant>(
        `/topics/${topic.id}/blocks`,
        {
          method: 'POST',
          body: JSON.stringify({ type }),
        }
      );

      setTopic((currentTopic) => ({
        ...currentTopic,
        variants: [...(currentTopic.variants || []), createdBlock],
      }));
      setEditingNewBlockId(createdBlock.id);
      setIsAddBlockOpen(false);
      setToast('Added.');
      refreshTopicInBackground();
    } catch (error) {
      console.error('Add block failed:', error);
      setToast('Could not add block.');
    }
  }

  function runCodeSearch(direction: 'next' | 'previous' = 'next') {
    const nextSearchTerm = inputValue.trim();

    if (!nextSearchTerm) {
      setSearchTerm('');
      setActiveSearchMatchIndex(0);
      return;
    }

    const nextMatchCount = buildCodeSearchState({
      primaryCode: primaryContent?.code || '',
      searchTerm: nextSearchTerm,
      variants,
    }).totalMatches;

    if (!nextMatchCount) {
      setSearchTerm(nextSearchTerm);
      setActiveSearchMatchIndex(0);
      return;
    }

    if (nextSearchTerm !== normalizedSearchTerm) {
      setActiveSearchMatchIndex(0);
      setSearchTerm(nextSearchTerm);
      return;
    }

    setActiveSearchMatchIndex((currentIndex) => {
      if (direction === 'previous') {
        return (currentIndex - 1 + nextMatchCount) % nextMatchCount;
      }

      return (currentIndex + 1) % nextMatchCount;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runCodeSearch();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    runCodeSearch(event.shiftKey ? 'previous' : 'next');
  }

  function getCodeSearchBlock(key: string) {
    return codeSearchState.byKey.get(key);
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl shadow-stone-900/10">
          {toast}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm shadow-stone-200/50 sm:p-10">
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
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl tracking-tight text-stone-950 sm:text-5xl">
          <InlineEditableText
            canEdit={canEdit}
            value={topic.title}
            inputClassName="font-[family-name:var(--font-serif)] text-4xl sm:text-5xl"
            onSave={(value) => savePrimaryContent({ title: value })}
          >
            <HighlightedText text={topic.title} term="" />
          </InlineEditableText>
        </h1>
        <form onSubmit={handleSubmit} className="mt-7 max-w-xl">
          <div className="flex overflow-hidden rounded-2xl border border-stone-300 bg-white focus-within:border-stone-900">
            <input
              value={inputValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setInputValue(nextValue);
                setSearchTerm('');
                setActiveSearchMatchIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search code in this post"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
            />
            {normalizedSearchTerm ? (
              <span className="flex items-center border-l border-stone-200 px-3 text-xs font-medium text-stone-500">
                {matchCount ? `${activeSearchMatchIndex + 1}/${matchCount}` : '0/0'}
              </span>
            ) : null}
          </div>
        </form>
        {searchTerm && matchCount === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No matches in code
          </p>
        ) : null}
        <div className="mt-5">
          <AddTaskButton
            defaultTitle={`Review ${topic.title}`}
            defaultDescription={`Task linked to ${topic.title}.`}
            linkedTopicId={topic.id}
          />
        </div>
      </section>

      {primaryContent ? (
        <div className="space-y-8">
          {primaryContent.taskDescription ? (
            <section className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-7 shadow-sm shadow-amber-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Task Description
              </p>
              <div className="mt-5">
                <TaskDescriptionText
                  text={primaryContent.taskDescription}
                  term=""
                />
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm shadow-stone-200/40">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Explanation
              </p>
              <div className="mt-4 text-sm leading-8 text-stone-700">
                <InlineEditableText
                  canEdit={canEdit}
                  value={
                    primaryContent.explanation ||
                    'No explanation available yet.'
                  }
                  multiline
                  inputClassName="text-sm leading-7"
                  onSave={(value) =>
                    savePrimaryContent({ explanation: value })
                  }
                >
                  <HighlightedText
                    text={
                      primaryContent.explanation ||
                      'No explanation available yet.'
                    }
                    term=""
                  />
                </InlineEditableText>
              </div>
            </div>

            {primaryUsefulComplexity ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm shadow-stone-200/40">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  {primaryComplexityLabel}
                </p>
                <div className="mt-4 text-sm leading-8 text-stone-700">
                  <InlineEditableText
                    canEdit={canEdit}
                    value={primaryUsefulComplexity}
                    inputClassName="text-sm"
                    onSave={(value) => savePrimaryContent({ complexity: value })}
                  >
                    <HighlightedText
                      text={primaryUsefulComplexity}
                      term=""
                    />
                  </InlineEditableText>
                </div>
              </div>
            ) : null}
          </section>

          {primaryContent.uml ? (
            <section className="space-y-4">
              <h2 className="font-[family-name:var(--font-serif)] text-3xl tracking-tight text-stone-950">
                UML
              </h2>
              <InlineEditableCode
                canEdit={canEdit}
                value={primaryContent.uml}
                language="mermaid"
                title="UML"
                downloadName={`${topic.title} UML`}
                highlightTerm=""
                collapsedLabel="UML collapsed"
                onSave={(value) => savePrimaryContent({ uml: value })}
                onDelete={
                  canEdit
                    ? () => savePrimaryContent({ uml: '' })
                    : undefined
                }
                deleteTitle="Delete UML section"
                deleteMessage="Delete this UML section?"
              />
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="font-[family-name:var(--font-serif)] text-3xl tracking-tight text-stone-950">
              Code
            </h2>
            <InlineEditableCode
              canEdit={canEdit}
              value={primaryContent.code || ''}
              title="Code"
              downloadName={topic.title}
              activeSearchMatchIndex={activeSearchMatchIndex}
              highlightTerm={searchTerm}
              searchMatchStartIndex={
                getCodeSearchBlock('primary-code')?.startIndex || 0
              }
              collapsedLabel="Code collapsed"
              onSave={(value) => savePrimaryContent({ code: value })}
              onDelete={
                canEdit
                  ? clearPrimaryCode
                  : undefined
              }
              deleteTitle="Clear code"
              deleteMessage="Clear this code block? This cannot be undone."
            />
          </section>

          {variants.map((variant) => (
            <section key={variant.id} className="space-y-5">
              <h2 className="font-[family-name:var(--font-serif)] text-3xl tracking-tight text-stone-950">
                <InlineEditableText
                  canEdit={canEdit}
                  value={variant.label}
                  inputClassName="font-[family-name:var(--font-serif)] text-3xl"
                  onSave={(value) => saveVariant(variant, { label: value })}
                >
                  <HighlightedText text={variant.label} term="" />
                </InlineEditableText>
              </h2>
              {variant.code ? (
                <InlineEditableCode
                  canEdit={canEdit}
                  value={variant.code}
                  title={variant.label}
                  downloadName={variant.label}
                  activeSearchMatchIndex={activeSearchMatchIndex}
                  highlightTerm={searchTerm}
                  searchMatchStartIndex={
                    getCodeSearchBlock(`variant-code-${variant.id}`)?.startIndex ||
                    0
                  }
                  collapsedLabel={`${variant.label} collapsed`}
                  initiallyEditing={editingNewBlockId === variant.id}
                  onSave={(value) => saveVariant(variant, { code: value })}
                  onDelete={
                    canEdit ? () => deleteVariant(variant) : undefined
                  }
                  deleteTitle="Delete block"
                  deleteMessage="Delete this block? This cannot be undone."
                />
              ) : null}
              {variant.explanation ? (
                <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm shadow-stone-200/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                    {variant.label === 'Note' ? 'Note' : 'Explanation'}
                  </p>
                  <div className="mt-4 text-sm leading-8 text-stone-700">
                    <InlineEditableText
                      canEdit={canEdit}
                      value={variant.explanation}
                      multiline
                      inputClassName="text-sm leading-7"
                      initiallyEditing={editingNewBlockId === variant.id}
                      onSave={(value) =>
                        saveVariant(variant, { explanation: value })
                      }
                    >
                      <HighlightedText
                        text={variant.explanation}
                        term=""
                      />
                    </InlineEditableText>
                  </div>
                </div>
              ) : null}
              {variant.complexity ? (
                <div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm shadow-stone-200/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                    Complexity
                  </p>
                  <div className="mt-4 text-sm leading-8 text-stone-700">
                    <InlineEditableText
                      canEdit={canEdit}
                      value={variant.complexity}
                      inputClassName="text-sm"
                      onSave={(value) =>
                        saveVariant(variant, { complexity: value })
                      }
                    >
                      <HighlightedText
                        text={variant.complexity}
                        term=""
                      />
                    </InlineEditableText>
                  </div>
                </div>
              ) : null}
              {variant.uml ? (
                <InlineEditableCode
                  canEdit={canEdit}
                  value={variant.uml}
                  language="mermaid"
                  title={`${variant.label} UML`}
                  downloadName={`${variant.label} UML`}
                  highlightTerm=""
                  collapsedLabel={`${variant.label} UML collapsed`}
                  initiallyEditing={editingNewBlockId === variant.id}
                  onSave={(value) => saveVariant(variant, { uml: value })}
                  onDelete={
                    canEdit ? () => deleteVariant(variant) : undefined
                  }
                  deleteTitle="Delete block"
                  deleteMessage="Delete this block? This cannot be undone."
                />
              ) : null}
            </section>
          ))}

          {canEdit ? (
            <div className="relative border-t border-dashed border-stone-300 pt-6">
              <button
                type="button"
                onClick={() => setIsAddBlockOpen((current) => !current)}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm shadow-stone-200/50 transition hover:border-amber-300 hover:text-amber-700"
              >
                + Add block
              </button>
              {isAddBlockOpen ? (
                <div className="absolute bottom-full left-0 z-20 mb-3 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-xl shadow-stone-900/10">
                  {BLOCK_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => void addBlock(option.type)}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-amber-50 hover:text-amber-700"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/70 p-8 text-sm text-stone-500">
          This topic exists, but it does not have content yet.
        </div>
      )}
    </div>
  );
}
