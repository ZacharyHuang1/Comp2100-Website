'use client';

import { KeyboardEvent, useEffect, useState } from 'react';

import { CodeBlock } from '@/components/CodeBlock';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullscreenCodeBlock } from '@/components/FullscreenCodeBlock';
import {
  formatJavaIndentation,
  handleJavaEditorKeyDown,
} from '@/lib/javaIndent';

type InlineEditableCodeProps = {
  canEdit: boolean;
  value: string;
  language?: string;
  title?: string;
  activeSearchMatchIndex?: number;
  downloadName?: string;
  highlightTerm?: string;
  searchMatchStartIndex?: number;
  collapsedLabel?: string;
  deleteTitle?: string;
  deleteMessage?: string;
  onSave: (value: string) => Promise<void>;
  onBeforeFullscreen?: () => Promise<boolean> | boolean;
  onDelete?: () => Promise<void>;
  initiallyEditing?: boolean;
};

const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  java: 'java',
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  jsx: 'jsx',
  tsx: 'tsx',
  mermaid: 'mmd',
  python: 'py',
  py: 'py',
  sql: 'sql',
  json: 'json',
  html: 'html',
  css: 'css',
};

function getJavaDeclarationName(code: string) {
  const declarationMatch = code.match(
    /^\s*(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/m
  );

  return declarationMatch?.[1] || '';
}

function sanitizeFileStem(value: string, extension: string) {
  const withoutExtension = value.replace(
    new RegExp(`\\.${extension}$`, 'i'),
    ''
  );

  return withoutExtension
    .trim()
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDownloadFileName({
  code,
  downloadName,
  language,
  title,
}: {
  code: string;
  downloadName?: string;
  language: string;
  title?: string;
}) {
  const extension = EXTENSION_BY_LANGUAGE[language.toLowerCase()] || 'txt';
  const declarationName =
    language.toLowerCase() === 'java' ? getJavaDeclarationName(code) : '';
  const baseName = sanitizeFileStem(
    declarationName || downloadName || title || language || 'code',
    extension
  );

  return `${baseName || 'code'}.${extension}`;
}

export function InlineEditableCode({
  canEdit,
  value,
  language = 'java',
  title,
  activeSearchMatchIndex,
  downloadName,
  highlightTerm = '',
  searchMatchStartIndex = 0,
  collapsedLabel,
  deleteTitle = 'Delete block',
  deleteMessage = 'Delete this block? This cannot be undone.',
  onSave,
  onBeforeFullscreen,
  onDelete,
  initiallyEditing = false,
}: InlineEditableCodeProps) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [draftValue, setDraftValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenCanEdit, setFullscreenCanEdit] = useState(canEdit);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (highlightTerm.trim()) {
      setIsCollapsed(false);
    }
  }, [highlightTerm]);

  async function saveDraft() {
    setIsSaving(true);
    setError('');

    try {
      await onSave(draftValue);
      setIsEditing(false);
    } catch {
      setError('Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEdit() {
    setDraftValue(value);
    setError('');
    setIsEditing(false);
  }

  async function openFullscreen() {
    try {
      const nextCanEdit = onBeforeFullscreen
        ? await onBeforeFullscreen()
        : canEdit;

      setFullscreenCanEdit(Boolean(nextCanEdit));
    } catch {
      setFullscreenCanEdit(false);
    } finally {
      setIsFullscreen(true);
    }
  }

  function downloadCode() {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getDownloadFileName({
      code: value,
      downloadName,
      language,
      title,
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveDraft();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (language === 'java') {
      handleJavaEditorKeyDown(event, draftValue, setDraftValue);
    }
  }

  if (!canEdit) {
    return (
      <>
        <CodeBlock
          code={value}
          language={language}
          title={title}
          activeSearchMatchIndex={activeSearchMatchIndex}
          highlightTerm={highlightTerm}
          searchMatchStartIndex={searchMatchStartIndex}
          isCollapsed={isCollapsed}
          collapsedLabel={collapsedLabel}
          onDownload={downloadCode}
          onToggleCollapse={() => setIsCollapsed((current) => !current)}
          onFullscreen={() => void openFullscreen()}
        />
        {isFullscreen ? (
          <FullscreenCodeBlock
            title={title || language}
            language={language}
            code={value}
            canEdit={fullscreenCanEdit}
            onSave={fullscreenCanEdit ? onSave : undefined}
            onClose={() => setIsFullscreen(false)}
          />
        ) : null}
      </>
    );
  }

  if (!isEditing) {
    return (
      <>
        <div
          className="relative rounded-3xl"
          onContextMenu={() => setError('')}
        >
          <CodeBlock
            code={value}
            language={language}
            title={title}
            activeSearchMatchIndex={activeSearchMatchIndex}
            highlightTerm={highlightTerm}
            searchMatchStartIndex={searchMatchStartIndex}
            isCollapsed={isCollapsed}
            collapsedLabel={collapsedLabel}
            onDownload={downloadCode}
            onDelete={onDelete ? () => setIsConfirmingDelete(true) : undefined}
            onToggleCollapse={() => setIsCollapsed((current) => !current)}
            onFullscreen={() => void openFullscreen()}
          />
        </div>
        {isFullscreen ? (
          <FullscreenCodeBlock
            title={title || language}
            language={language}
            code={value}
            canEdit={fullscreenCanEdit}
            onSave={fullscreenCanEdit ? onSave : undefined}
            onClose={() => setIsFullscreen(false)}
          />
        ) : null}
        {isConfirmingDelete && onDelete ? (
          <ConfirmDialog
            title={deleteTitle}
            message={deleteMessage}
            confirmLabel="Delete"
            danger
            onCancel={() => setIsConfirmingDelete(false)}
            onConfirm={async () => {
              await onDelete();
              setIsConfirmingDelete(false);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-3 shadow-sm shadow-stone-200/50">
      <div className="mb-3 flex items-center justify-between border-b border-amber-200/70 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            {language}
          </p>
          {title ? (
            <p className="mt-1 text-xs text-stone-500">{title}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {language === 'java' ? (
            <button
              type="button"
              onClick={() =>
                setDraftValue((currentValue) =>
                  formatJavaIndentation(currentValue)
                )
              }
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-amber-50"
            >
              Format indentation
            </button>
          ) : null}
          <p className="text-xs text-stone-500">Cmd/Ctrl+S saves</p>
        </div>
      </div>
      <textarea
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[28rem] w-full resize-y rounded-2xl border border-amber-200 bg-[#fffdf8] px-4 py-4 font-[family-name:var(--font-mono)] text-sm leading-7 text-stone-900 outline-none ring-4 ring-amber-100"
        autoFocus
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-rose-600">{error}</p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={isSaving}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
