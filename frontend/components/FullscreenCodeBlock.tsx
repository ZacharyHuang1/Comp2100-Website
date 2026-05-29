'use client';

import { KeyboardEvent, useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  formatJavaIndentation,
  handleJavaEditorKeyDown,
} from '@/lib/javaIndent';

type FullscreenCodeBlockProps = {
  title: string;
  language?: string;
  code: string;
  canEdit?: boolean;
  onClose: () => void;
  onSave?: (value: string) => Promise<void>;
};

export function FullscreenCodeBlock({
  title,
  language = 'java',
  code,
  canEdit = false,
  onClose,
  onSave,
}: FullscreenCodeBlockProps) {
  const [draftValue, setDraftValue] = useState(code);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const hasUnsavedChanges = draftValue !== code;
  const isEditable = Boolean(canEdit && onSave);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftValue(code);
    }
  }, [code, hasUnsavedChanges]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        if (hasUnsavedChanges) {
          setIsConfirmingDiscard(true);
          return;
        }

        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasUnsavedChanges, onClose]);

  async function saveDraft() {
    if (!onSave) {
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await onSave(draftValue);
      setMessage('Saved.');
    } catch (saveError) {
      console.error('Fullscreen save failed:', saveError);
      setError('Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  function closeOrConfirm() {
    if (hasUnsavedChanges) {
      setIsConfirmingDiscard(true);
      return;
    }

    onClose();
  }

  function discardAndClose() {
    setDraftValue(code);
    setError('');
    setMessage('');
    setIsConfirmingDiscard(false);
    onClose();
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveDraft();
      return;
    }

    if (language === 'java') {
      handleJavaEditorKeyDown(event, draftValue, setDraftValue);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#11100d]/85 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-stone-700 bg-[#181612] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between gap-4 border-b border-stone-700 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              {language}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-stone-50">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEditable && language === 'java' ? (
              <button
                type="button"
                onClick={() =>
                  setDraftValue((currentValue) =>
                    formatJavaIndentation(currentValue)
                  )
                }
                className="rounded-xl border border-stone-600 px-3 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              >
                Format indentation
              </button>
            ) : null}
            {isEditable ? (
              <>
                <button
                  type="button"
                  onClick={discardAndClose}
                  className="rounded-xl border border-stone-600 px-3 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={isSaving}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving' : 'Save'}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={closeOrConfirm}
              className="rounded-xl bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
            >
              Close
            </button>
          </div>
        </div>

        {isEditable ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <textarea
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              className="min-h-[70vh] flex-1 resize-none rounded-2xl border border-stone-600 bg-[#0f0e0b] p-4 font-[family-name:var(--font-mono)] text-sm leading-7 text-stone-100 outline-none ring-4 ring-amber-500/10"
              autoFocus
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                {error ? <p className="text-rose-300">{error}</p> : null}
                {message ? <p className="text-emerald-300">{message}</p> : null}
              </div>
              <p className="ml-auto text-xs text-stone-400">
                Cmd/Ctrl+S saves
              </p>
            </div>
          </div>
        ) : (
          <pre className="min-h-0 flex-1 overflow-auto bg-[#0f0e0b] p-5 font-[family-name:var(--font-mono)] text-sm leading-7 text-stone-100">
            <code>{code || '// Empty'}</code>
          </pre>
        )}
        {isConfirmingDiscard ? (
          <ConfirmDialog
            title="Discard unsaved changes?"
            message="Discard unsaved changes?"
            confirmLabel="Discard"
            danger
            onCancel={() => setIsConfirmingDiscard(false)}
            onConfirm={discardAndClose}
          />
        ) : null}
      </div>
    </div>
  );
}
