'use client';

import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';

import { TodoSubtask } from '@/components/todo/types';

function SubtaskRow({
  subtask,
  onUpdate,
  onDelete,
}: {
  subtask: TodoSubtask;
  onUpdate: (subtask: TodoSubtask, patch: Partial<TodoSubtask>) => Promise<void>;
  onDelete: (subtask: TodoSubtask) => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState(subtask.title);

  useEffect(() => {
    setDraftTitle(subtask.title);
  }, [subtask.title]);

  async function saveTitle() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle || nextTitle === subtask.title) {
      setDraftTitle(subtask.title);
      return;
    }

    await onUpdate(subtask, { title: nextTitle });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }

    if (event.key === 'Escape') {
      setDraftTitle(subtask.title);
      event.currentTarget.blur();
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={(event) =>
          void onUpdate(subtask, { completed: event.target.checked })
        }
        className="h-4 w-4 accent-amber-600"
      />
      <input
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onBlur={() => void saveTitle()}
        onKeyDown={handleKeyDown}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
          subtask.completed ? 'text-stone-400 line-through' : 'text-stone-700'
        }`}
      />
      <button
        type="button"
        onClick={() => void onDelete(subtask)}
        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
      >
        Delete
      </button>
    </div>
  );
}

export function SubtaskChecklist({
  subtasks,
  onAdd,
  onUpdate,
  onDelete,
}: {
  subtasks: TodoSubtask[];
  onAdd: (title: string) => Promise<void>;
  onUpdate: (subtask: TodoSubtask, patch: Partial<TodoSubtask>) => Promise<void>;
  onDelete: (subtask: TodoSubtask) => Promise<void>;
}) {
  const [title, setTitle] = useState('');

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    await onAdd(nextTitle);
    setTitle('');
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add checklist item..."
          className="h-10 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Add
        </button>
      </form>
    </div>
  );
}
