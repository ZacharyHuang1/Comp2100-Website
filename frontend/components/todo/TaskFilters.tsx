'use client';

import { TodoFilter } from '@/components/todo/types';

const FILTERS: Array<{ id: TodoFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'no_due', label: 'No due date' },
  { id: 'done', label: 'Done' },
  { id: 'archived', label: 'Archived' },
];

export function TaskFilters({
  activeFilter,
  onChange,
}: {
  activeFilter: TodoFilter;
  onChange: (filter: TodoFilter) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">
        Filters
      </p>
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
            activeFilter === filter.id
              ? 'bg-stone-900 text-stone-50'
              : 'text-stone-600 hover:bg-white hover:text-stone-950'
          }`}
        >
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  );
}
