'use client';

import Link from 'next/link';
import { KeyboardEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { SubtaskChecklist } from '@/components/todo/SubtaskChecklist';
import { TodoActivity, TodoSubtask, TodoTask } from '@/components/todo/types';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
    'T',
    padDatePart(date.getHours()),
    ':',
    padDatePart(date.getMinutes()),
  ].join('');
}

function formatActivityTime(value?: string) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date) + ' at ' + new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatDueDate(value?: unknown) {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  return formatActivityTime(value);
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function ensurePeriod(value: string) {
  return /[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`;
}

function getActivityKind(eventType: string) {
  if (eventType === 'task_created') {
    return { label: 'Create', className: 'bg-emerald-50 text-emerald-700' };
  }

  if (eventType.includes('due')) {
    return { label: 'Due', className: 'bg-sky-50 text-sky-700' };
  }

  if (eventType.includes('checklist')) {
    return { label: 'Checklist', className: 'bg-amber-50 text-amber-700' };
  }

  if (eventType.includes('archive') || eventType.includes('restored')) {
    return { label: 'Archive', className: 'bg-stone-100 text-stone-600' };
  }

  if (eventType.includes('complete') || eventType.includes('reopened')) {
    return { label: 'Done', className: 'bg-lime-50 text-lime-700' };
  }

  if (eventType.includes('changed') || eventType.includes('edited')) {
    return { label: 'Edit', className: 'bg-orange-50 text-orange-700' };
  }

  return { label: 'Update', className: 'bg-stone-100 text-stone-600' };
}

function renderActivityMessage(activity: TodoActivity) {
  const metadata = activity.metadata || {};

  switch (activity.eventType) {
    case 'task_created':
      return 'created this task';
    case 'task_title_changed': {
      const oldTitle = metadataString(metadata, 'oldTitle');
      const newTitle = metadataString(metadata, 'newTitle');
      return oldTitle && newTitle
        ? `renamed the task from "${oldTitle}" to "${newTitle}"`
        : 'renamed the task';
    }
    case 'task_description_changed':
      return 'changed the description';
    case 'task_due_set': {
      const newDueAt = formatDueDate(metadata.newDueAt);
      return newDueAt ? `set the due date to ${newDueAt}` : 'set the due date';
    }
    case 'task_due_changed': {
      const oldDueAt = formatDueDate(metadata.oldDueAt);
      const newDueAt = formatDueDate(metadata.newDueAt);
      return oldDueAt && newDueAt
        ? `changed the due date from ${oldDueAt} to ${newDueAt}`
        : 'changed the due date';
    }
    case 'task_due_removed':
      return 'removed the due date';
    case 'checklist_item_added': {
      const text = metadataString(metadata, 'checklistItemText');
      return text ? `added checklist item "${text}"` : 'added a checklist item';
    }
    case 'checklist_item_toggled_done': {
      const text = metadataString(metadata, 'checklistItemText');
      return text
        ? `marked checklist item "${text}" as done`
        : 'marked a checklist item as done';
    }
    case 'checklist_item_toggled_undone': {
      const text = metadataString(metadata, 'checklistItemText');
      return text
        ? `marked checklist item "${text}" as not done`
        : 'marked a checklist item as not done';
    }
    case 'checklist_item_edited': {
      const oldText = metadataString(metadata, 'oldChecklistItemText');
      const text = metadataString(metadata, 'checklistItemText');
      return oldText && text
        ? `edited checklist item "${oldText}" to "${text}"`
        : 'edited a checklist item';
    }
    case 'checklist_item_deleted': {
      const text = metadataString(metadata, 'checklistItemText');
      return text ? `deleted checklist item "${text}"` : 'deleted a checklist item';
    }
    case 'task_archived':
      return 'archived this task';
    case 'task_restored':
      return 'restored this task';
    case 'task_completed':
      return 'completed this task';
    case 'task_reopened':
      return 'reopened this task';
    default:
      return activity.message || 'updated this task';
  }
}

function DescriptionEditModal({
  initialDescription,
  onCancel,
  onSave,
}: {
  initialDescription: string;
  onCancel: () => void;
  onSave: (description: string) => Promise<void>;
}) {
  const [draftDescription, setDraftDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  async function saveDescription() {
    setIsSaving(true);

    try {
      await onSave(draftDescription);
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void saveDescription();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-900/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">
              Edit description
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Save updates this task immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-50"
          >
            Esc
          </button>
        </div>
        <textarea
          autoFocus
          value={draftDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-4 min-h-52 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveDescription()}
            disabled={isSaving}
            className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TaskInspector({
  task,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  task: TodoTask | null;
  onUpdateTask: (task: TodoTask, patch: Partial<TodoTask>) => Promise<void>;
  onDeleteTask: (task: TodoTask) => Promise<void>;
  onArchiveTask: (task: TodoTask) => Promise<void>;
  onAddSubtask: (task: TodoTask, title: string) => Promise<void>;
  onUpdateSubtask: (
    subtask: TodoSubtask,
    patch: Partial<TodoSubtask>
  ) => Promise<void>;
  onDeleteSubtask: (subtask: TodoSubtask) => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState(task?.title || '');
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  useEffect(() => {
    setDraftTitle(task?.title || '');
    setIsDescriptionModalOpen(false);
    setIsActivityOpen(false);
  }, [task?.id, task?.title]);

  if (!task) {
    return (
      <aside className="rounded-[1.75rem] border border-stone-200 bg-white/75 p-6 text-sm text-stone-500 shadow-sm shadow-stone-200/40 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        Select or create a task to manage details.
      </aside>
    );
  }

  async function saveTitle(nextTitle = draftTitle) {
    const normalizedTitle = nextTitle.trim();

    if (!task || !normalizedTitle || normalizedTitle === task.title) {
      return;
    }

    await onUpdateTask(task, { title: normalizedTitle } as Partial<TodoTask>);
  }

  async function saveDescription(nextDescription: string) {
    if (!task || nextDescription === task.description) {
      setIsDescriptionModalOpen(false);
      return;
    }

    await onUpdateTask(task, {
      description: nextDescription,
    } as Partial<TodoTask>);
    setIsDescriptionModalOpen(false);
  }

  return (
    <aside className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          Inspector
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Task details and checklist
        </p>
      </div>

      <input
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onBlur={(event) => void saveTitle(event.currentTarget.value)}
        className="mt-5 w-full rounded-xl border border-transparent bg-transparent px-1 text-2xl font-semibold tracking-tight text-stone-950 outline-none transition focus:border-amber-200 focus:bg-amber-50/50 focus:px-3 focus:py-2"
      />

      <div className="mt-5 grid gap-3">
        <div className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Owner
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium normal-case tracking-normal text-stone-700">
            {task.owner?.displayName || task.owner?.username || 'Current user'}
          </div>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Due date and time
          <input
            type="datetime-local"
            step={60}
            value={toDateTimeInputValue(task.dueDate)}
            onChange={(event) =>
              void onUpdateTask(task, {
                dueDate: event.target.value || null,
              } as Partial<TodoTask>)
            }
            className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm normal-case tracking-normal text-stone-700 outline-none"
          />
        </label>
      </div>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Description
          </p>
          <span className="text-[0.68rem] font-medium text-stone-400">
            Double-click to edit
          </span>
        </div>
        <button
          type="button"
          onDoubleClick={() => setIsDescriptionModalOpen(true)}
          className="mt-2 max-h-72 min-h-24 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white px-3 py-3 text-left text-sm leading-6 text-stone-700 transition hover:border-amber-200 hover:bg-amber-50/30"
        >
          {task.description ? (
            <span className="whitespace-pre-wrap">{task.description}</span>
          ) : (
            <span className="text-stone-400">
              No description yet. Double-click to add one.
            </span>
          )}
        </button>
      </section>

      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Checklist
        </p>
        <SubtaskChecklist
          subtasks={task.subtasks || []}
          onAdd={(title) => onAddSubtask(task, title)}
          onUpdate={onUpdateSubtask}
          onDelete={onDeleteSubtask}
        />
      </div>

      {task.linkedTopic || task.linkedCategory ? (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Knowledge base link
          </p>
          {task.linkedTopic ? (
            <Link
              href={`/topic/${task.linkedTopic.id}`}
              className="mt-3 block text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              Open topic: {task.linkedTopic.title}
            </Link>
          ) : null}
          {task.linkedCategory ? (
            <Link
              href={`/category/${task.linkedCategory.id}`}
              className="mt-3 block text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              Open folder: {task.linkedCategory.name}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onArchiveTask(task)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this task?')) {
              void onDeleteTask(task);
            }
          }}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Delete
        </button>
      </div>

      <div className="mt-6 border-t border-stone-200 pt-5">
        <button
          type="button"
          onClick={() => setIsActivityOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 hover:bg-stone-50"
        >
          <span>{isActivityOpen ? '▾' : '▸'} Activity</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] tracking-normal text-stone-500">
            {task.activity?.length || 0}
          </span>
        </button>
        {isActivityOpen ? (
          <div className="mt-3 space-y-2">
            {task.activity?.length ? (
              task.activity.map((item) => {
                const kind = getActivityKind(item.eventType);
                const actorName =
                  item.user?.displayName || item.user?.username || 'Someone';

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${kind.className}`}
                      >
                        {kind.label}
                      </span>
                      <span className="text-stone-400">
                        {formatActivityTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 leading-5 text-stone-600">
                      <span className="font-semibold text-stone-800">
                        {actorName}
                      </span>{' '}
                      {ensurePeriod(renderActivityMessage(item))}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-xs text-stone-400">
                No activity yet.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {isDescriptionModalOpen ? (
        <DescriptionEditModal
          initialDescription={task.description || ''}
          onCancel={() => setIsDescriptionModalOpen(false)}
          onSave={saveDescription}
        />
      ) : null}
    </aside>
  );
}
