'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CreateTaskInput } from '@/components/todo/types';

export function CreateTaskModal({
  defaultTitle = '',
  defaultDescription = '',
  linkedTopicId = null,
  linkedCategoryId = null,
  onClose,
  onCreate,
}: {
  defaultTitle?: string;
  defaultDescription?: string;
  linkedTopicId?: string | null;
  linkedCategoryId?: string | null;
  onClose: () => void;
  onCreate: (payload: CreateTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [dueDate, setDueDate] = useState('');
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await onCreate({
        title,
        description,
        dueDate: dueDate || null,
        subtasks: subtaskTitles
          .map((subtaskTitle) => subtaskTitle.trim())
          .filter(Boolean)
          .map((subtaskTitle) => ({ title: subtaskTitle })),
        linkedTopicId,
        linkedCategoryId,
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-stone-950/35 px-4 py-8 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="relative z-[200] max-h-[88vh] w-[calc(100vw-32px)] max-w-[720px] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-950/25"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">
              New task
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Track study, implementation, and review work.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Close
          </button>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Description <span className="font-normal text-stone-400">optional</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-stone-200 px-3 py-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Due date and time
            <input
              type="datetime-local"
              step={60}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-700">
                  Checklist / Small tasks
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Add optional checklist items before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubtaskTitles((current) => [...current, ''])}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-amber-300 hover:text-amber-700"
              >
                + Add small task
              </button>
            </div>
            {subtaskTitles.length ? (
              <div className="mt-4 space-y-2">
                {subtaskTitles.map((subtaskTitle, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2"
                  >
                    <span className="h-4 w-4 rounded border border-stone-300" />
                    <input
                      value={subtaskTitle}
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        setSubtaskTitles((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? nextTitle : item
                          )
                        );
                      }}
                      placeholder="Small task description..."
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSubtaskTitles((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="text-xs font-semibold text-stone-400 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
