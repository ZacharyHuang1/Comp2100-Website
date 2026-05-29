'use client';

import { TaskFilters } from '@/components/todo/TaskFilters';
import { TodoFilter } from '@/components/todo/types';

export function TodoListSidebar({
  activeFilter,
  onSelectFilter,
}: {
  activeFilter: TodoFilter;
  onSelectFilter: (filter: TodoFilter) => void;
}) {
  return (
    <aside className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-4 shadow-sm shadow-stone-200/40 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700">
            Task workspace
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
            To-do List
          </h2>
        </div>
      </div>

      <div className="mt-6">
        <TaskFilters activeFilter={activeFilter} onChange={onSelectFilter} />
      </div>
    </aside>
  );
}
