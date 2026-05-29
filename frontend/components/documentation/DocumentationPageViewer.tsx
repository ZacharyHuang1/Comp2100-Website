'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { DocumentationPage } from '@/components/documentation/types';
import {
  getHighlightTerms,
  slugifyDocumentationHeading,
} from '@/lib/documentation';

type MarkdownBlock =
  | { type: 'code'; language: string; content: string }
  | { type: 'text'; lines: string[] };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, highlight: string) {
  const terms = getHighlightTerms(highlight);

  if (!terms.length) {
    return text;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'giu');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const matched = terms.some(
      (term) => part.toLocaleLowerCase() === term.toLocaleLowerCase()
    );

    return matched ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-amber-200/75 px-0.5 text-stone-950"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let textLines: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage = '';
  let inCode = false;

  function flushText() {
    if (textLines.length) {
      blocks.push({ type: 'text', lines: textLines });
      textLines = [];
    }
  }

  function flushCode() {
    blocks.push({
      type: 'code',
      language: codeLanguage,
      content: codeLines.join('\n'),
    });
    codeLines = [];
    codeLanguage = '';
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w+)?\s*$/);

    if (fenceMatch && !inCode) {
      flushText();
      inCode = true;
      codeLanguage = fenceMatch[1] || '';
      continue;
    }

    if (line.trim() === '```' && inCode) {
      inCode = false;
      flushCode();
      continue;
    }

    if (inCode) {
      codeLines.push(line);
    } else {
      textLines.push(line);
    }
  }

  if (inCode) {
    flushCode();
  }

  flushText();
  return blocks;
}

function TextLines({ lines, highlight }: { lines: string[]; highlight: string }) {
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
        const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)\s*$/);

        if (headingMatch) {
          const level = headingMatch[1].length;
          const heading = headingMatch[2].trim();
          const id = slugifyDocumentationHeading(heading);
          const sizeClass =
            level === 1
              ? 'mt-3 text-4xl'
              : level === 2
                ? 'mt-10 text-2xl'
                : 'mt-7 text-xl';
          const headingContent = renderHighlightedText(heading, highlight);

          if (level === 1) {
            return (
              <h1
                key={`${id}-${index}`}
                id={id}
                className={`${sizeClass} scroll-mt-24 font-semibold tracking-tight text-stone-950`}
              >
                {headingContent}
              </h1>
            );
          }

          if (level === 2) {
            return (
              <h2
                key={`${id}-${index}`}
                id={id}
                className={`${sizeClass} scroll-mt-24 font-semibold tracking-tight text-stone-950`}
              >
                {headingContent}
              </h2>
            );
          }

          return (
            <h3
              key={`${id}-${index}`}
              id={id}
              className={`${sizeClass} scroll-mt-24 font-semibold tracking-tight text-stone-950`}
            >
              {headingContent}
            </h3>
          );
        }

        if (imageMatch) {
          const caption = imageMatch[1].trim();
          const src = imageMatch[2].trim();

          return (
            <figure
              key={`image-${src}-${index}`}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
            >
              <img
                src={src}
                alt={caption}
                className="block max-h-[720px] w-full object-contain"
              />
              {caption ? (
                <figcaption className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }

        if (/^\s*[-*]\s+/.test(line)) {
          return (
            <p key={index} className="pl-4 text-sm leading-7 text-stone-700">
              <span className="mr-2 text-stone-400">•</span>
              {renderHighlightedText(line.replace(/^\s*[-*]\s+/, ''), highlight)}
            </p>
          );
        }

        return (
          <p key={index} className="text-sm leading-7 text-stone-700">
            {renderHighlightedText(line, highlight)}
          </p>
        );
      })}
    </div>
  );
}

export function DocumentationPageViewer({
  page,
  highlight = '',
}: {
  page: DocumentationPage;
  highlight?: string;
}) {
  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(id);

    if (target) {
      target.scrollIntoView({ block: 'start' });
    }
  }, [page.id]);

  const blocks = parseMarkdownBlocks(page.content || '');
  const showGitSimulatorLink = /git/i.test(page.title);

  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm shadow-stone-200/50 sm:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Documentation · {page.spaceName}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">
            {page.title}
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            {page.instructionType} · Owner:{' '}
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: page.owner?.avatarColor || '#64748B',
                }}
              />
              {page.owner?.displayName || page.owner?.username || 'Unknown'}
            </span>
          </p>
        </div>
        {showGitSimulatorLink ? (
          <Link
            href="/git-simulator"
            className="rounded-2xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Open Git Simulator
          </Link>
        ) : null}
      </div>

      <div className="space-y-5">
        {blocks.map((block, index) =>
          block.type === 'code' ? (
            <pre
              key={`code-${index}`}
              className="overflow-x-auto rounded-2xl bg-stone-950 px-4 py-4 font-mono text-xs leading-6 text-stone-50"
            >
              <code>{block.content}</code>
            </pre>
          ) : (
            <TextLines
              key={`text-${index}`}
              lines={block.lines}
              highlight={highlight}
            />
          )
        )}
      </div>
    </article>
  );
}
