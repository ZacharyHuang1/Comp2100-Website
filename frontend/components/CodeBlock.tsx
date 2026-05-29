'use client';

import dynamic from 'next/dynamic';
import type { MouseEvent } from 'react';

type CodeBlockProps = {
  code: string;
  language?: string;
  highlightTerm?: string;
  title?: string;
  activeSearchMatchIndex?: number;
  searchMatchStartIndex?: number;
  isCollapsed?: boolean;
  collapsedLabel?: string;
  onDelete?: () => void;
  onToggleCollapse?: () => void;
  onFullscreen?: () => void;
  onDownload?: () => void;
};

const SyntaxHighlightedCode = dynamic(
  () =>
    import('@/components/SyntaxHighlightedCode').then(
      (module) => module.SyntaxHighlightedCode
    ),
  {
    ssr: false,
    loading: () => (
      <pre className="m-0 overflow-x-auto bg-[#faf8f3] p-6 font-[family-name:var(--font-mono)] text-[0.9rem] leading-7 text-stone-900">
        <code>Loading</code>
      </pre>
    ),
  }
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedCode({
  activeSearchMatchIndex,
  code,
  highlightTerm,
  searchMatchStartIndex,
}: {
  activeSearchMatchIndex?: number;
  code: string;
  highlightTerm: string;
  searchMatchStartIndex?: number;
}) {
  const parts = code.split(new RegExp(`(${escapeRegExp(highlightTerm)})`, 'gi'));
  let localMatchIndex = 0;

  return (
    <pre className="m-0 overflow-x-auto bg-[#faf8f3] p-6 font-[family-name:var(--font-mono)] text-[0.9rem] leading-7 text-stone-900">
      <code>
        {parts.map((part, index) => {
          if (part.toLowerCase() !== highlightTerm.toLowerCase()) {
            return <span key={`${part}-${index}`}>{part}</span>;
          }

          const searchIndex = (searchMatchStartIndex || 0) + localMatchIndex;
          localMatchIndex += 1;
          const isActive = searchIndex === activeSearchMatchIndex;

          return (
            <mark
              key={`${part}-${index}`}
              data-code-search-index={searchIndex}
              className={`rounded px-0.5 ${
                isActive
                  ? 'bg-amber-400 ring-2 ring-amber-500/70'
                  : 'bg-amber-200'
              }`}
            >
              {part}
            </mark>
          );
        })}
      </code>
    </pre>
  );
}

export function CodeBlock({
  activeSearchMatchIndex,
  code,
  language = 'java',
  highlightTerm = '',
  searchMatchStartIndex = 0,
  title,
  isCollapsed = false,
  collapsedLabel,
  onDelete,
  onToggleCollapse,
  onFullscreen,
  onDownload,
}: CodeBlockProps) {
  const normalizedHighlightTerm = highlightTerm.trim();
  const displayCode = code || '// Empty';

  function handleControlClick(action: () => void) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[#faf8f3] shadow-sm shadow-stone-200/60">
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {language}
          </p>
          {title || isCollapsed ? (
            <p className="mt-1 truncate text-xs text-stone-500">
              {isCollapsed ? collapsedLabel || `${title || language} collapsed` : title}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onDownload ? (
            <button
              type="button"
              data-code-control
              onClick={handleControlClick(onDownload)}
              className="mr-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500 transition hover:border-stone-400 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
            >
              Download
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label="Delete block"
              data-code-control
              onClick={handleControlClick(onDelete)}
              className="h-3 w-3 rounded-full bg-rose-400 transition hover:scale-110 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          ) : (
            <span className="h-3 w-3 rounded-full bg-rose-200" />
          )}
          {onToggleCollapse ? (
            <button
              type="button"
              aria-label={isCollapsed ? 'Expand block' : 'Collapse block'}
              data-code-control
              onClick={handleControlClick(onToggleCollapse)}
              className="h-3 w-3 rounded-full bg-amber-400 transition hover:scale-110 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          ) : (
            <span className="h-3 w-3 rounded-full bg-amber-200" />
          )}
          {onFullscreen ? (
            <button
              type="button"
              aria-label="Fullscreen block"
              data-code-control
              onClick={handleControlClick(onFullscreen)}
              className="h-3 w-3 rounded-full bg-emerald-400 transition hover:scale-110 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          ) : (
            <span className="h-3 w-3 rounded-full bg-emerald-200" />
          )}
        </div>
      </div>
      {isCollapsed ? null : normalizedHighlightTerm ? (
        <HighlightedCode
          activeSearchMatchIndex={activeSearchMatchIndex}
          code={displayCode}
          highlightTerm={normalizedHighlightTerm}
          searchMatchStartIndex={searchMatchStartIndex}
        />
      ) : (
        <SyntaxHighlightedCode code={displayCode} language={language} />
      )}
    </div>
  );
}
