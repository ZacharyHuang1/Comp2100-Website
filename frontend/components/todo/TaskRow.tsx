'use client';

import { TodoTask } from '@/components/todo/types';

function formatDueDate(value: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isOverdue(task: TodoTask) {
  return (
    Boolean(task.dueDate) &&
    task.status !== 'done' &&
    new Date(task.dueDate as string).getTime() < Date.now()
  );
}

function getOwnerInitials(task: TodoTask) {
  const ownerName = task.owner?.displayName || task.owner?.username || '';

  if (!ownerName.trim()) {
    return 'U';
  }

  return ownerName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TaskRow({
  task,
  selected,
  showOwnerBadge = false,
  onSelect,
  onToggleComplete,
}: {
  task: TodoTask;
  selected: boolean;
  showOwnerBadge?: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition md:grid-cols-[auto_minmax(0,1fr)_auto] ${
        selected
          ? 'border-amber-300 bg-amber-50 shadow-amber-100/70'
          : 'border-stone-200 bg-white shadow-stone-200/40 hover:border-amber-200 hover:bg-amber-50/30'
      }`}
    >
      <span
        role="checkbox"
        aria-checked={task.status === 'done'}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete();
        }}
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
          task.status === 'done'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-stone-300 bg-white text-transparent'
        }`}
      >
        ✓
      </span>

      <span className="min-w-0">
        <span
          className={`block truncate text-sm font-semibold tracking-tight ${
            task.status === 'done'
              ? 'text-stone-400 line-through'
              : 'text-stone-950'
          }`}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: task.listColor || '#F59E0B' }}
          />
          {showOwnerBadge && task.owner ? (
            <span>Owner: {task.owner.displayName || task.owner.username}</span>
          ) : null}
          {task.linkedTopic ? <span>Topic linked</span> : null}
          {task.linkedCategory ? <span>Folder linked</span> : null}
          {task.subtaskCount ? (
            <span>
              {task.completedSubtaskCount}/{task.subtaskCount} subtasks
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex flex-wrap items-start justify-end gap-2">
        {showOwnerBadge && task.owner ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: task.owner.avatarColor || '#d97706' }}
            title={task.owner.displayName || task.owner.username}
          >
            {getOwnerInitials(task)}
          </span>
        ) : null}
        {task.dueDate ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              isOverdue(task)
                ? 'bg-rose-50 text-rose-700'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            {formatDueDate(task.dueDate)}
          </span>
        ) : null}
      </span>
    </button>
  );
}
