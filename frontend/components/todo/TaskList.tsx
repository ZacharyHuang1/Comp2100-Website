'use client';

import { FormEvent, useState } from 'react';

import { TaskRow } from '@/components/todo/TaskRow';
import { TodoTask } from '@/components/todo/types';

export function TaskList({
  title,
  tasks,
  selectedTaskId,
  onSelectTask,
  onQuickAdd,
  onToggleComplete,
  onCreateTask,
  showOwnerBadges = false,
  searchValue,
  onSearchChange,
}: {
  title: string;
  tasks: TodoTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: TodoTask) => void;
  onQuickAdd: (title: string) => Promise<void>;
  onToggleComplete: (task: TodoTask) => Promise<void>;
  onCreateTask: () => void;
  showOwnerBadges?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const titleValue = quickTitle.trim();

    if (!titleValue) {
      return;
    }

    setIsAdding(true);

    try {
      await onQuickAdd(titleValue);
      setQuickTitle('');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="min-w-0 rounded-[1.75rem] border border-stone-200 bg-white/70 p-5 shadow-sm shadow-stone-200/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">
            Tasks
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
            {title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateTask}
            className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-50 transition hover:bg-amber-600"
          >
            New task
          </button>
        </div>
      </div>

      <form onSubmit={handleQuickAdd} className="mt-5">
        <input
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          placeholder="Add a task..."
          className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
          disabled={isAdding}
        />
      </form>

      <input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search this task view"
        className="mt-3 h-10 w-full rounded-xl border border-stone-200 bg-white/80 px-3 text-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
      />

      <div className="mt-5 space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              showOwnerBadge={showOwnerBadges}
              onSelect={() => onSelectTask(task)}
              onToggleComplete={() => onToggleComplete(task)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-sm text-stone-500">
            Nothing here yet.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onCreateTask}
        className="mt-4 flex w-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-3 text-sm font-semibold text-stone-600 transition hover:border-amber-300 hover:text-amber-700"
      >
        + Add task
      </button>
    </section>
  );
}
