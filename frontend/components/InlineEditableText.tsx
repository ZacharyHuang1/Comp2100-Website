'use client';

import { KeyboardEvent, MouseEvent, ReactNode, useEffect, useState } from 'react';

type InlineEditableTextProps = {
  canEdit: boolean;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  children?: ReactNode;
  onSave: (value: string) => Promise<void>;
  initiallyEditing?: boolean;
};

export function InlineEditableText({
  canEdit,
  value,
  placeholder = '',
  multiline = false,
  className = '',
  inputClassName = '',
  children,
  onSave,
  initiallyEditing = false,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [draftValue, setDraftValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveDraft();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  }

  function startEditing(event: MouseEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    setIsEditing(true);
  }

  if (!canEdit) {
    return <>{children ?? value}</>;
  }

  if (!isEditing) {
    return (
      <span className="group relative block">
        <span className="editable-hover-tooltip pointer-events-none absolute right-2 top-2 z-10 rounded-full border border-amber-200 bg-white/95 px-2 py-0.5 text-[10px] font-medium text-amber-700 opacity-0 shadow-sm transition group-hover:opacity-100">
          Click to edit
        </span>
        <button
          type="button"
          onClick={startEditing}
          onContextMenu={() => setError('')}
          className={`block w-full rounded-xl text-left transition hover:bg-amber-50/50 hover:ring-2 hover:ring-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 ${className}`}
          title="Click to edit"
        >
          {children ?? value}
        </button>
      </span>
    );
  }

  const sharedClassName = `w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-stone-900 outline-none ring-4 ring-amber-100 ${inputClassName}`;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-2">
      {multiline ? (
        <textarea
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${sharedClassName} min-h-32 resize-y`}
          autoFocus
        />
      ) : (
        <input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={sharedClassName}
          autoFocus
        />
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
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
