'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { CreateTaskModal } from '@/components/todo/CreateTaskModal';
import { TaskInspector } from '@/components/todo/TaskInspector';
import { TaskList } from '@/components/todo/TaskList';
import { TodoLayout } from '@/components/todo/TodoLayout';
import { TodoListSidebar } from '@/components/todo/TodoListSidebar';
import { todoRequest } from '@/components/todo/todoApi';
import {
  CreateTaskInput,
  TodoFilter,
  TodoSubtask,
  TodoTask,
} from '@/components/todo/types';

function getFilterParams(filter: TodoFilter) {
  if (filter === 'today') {
    return 'due=today';
  }

  if (filter === 'upcoming') {
    return 'due=upcoming';
  }

  if (filter === 'overdue') {
    return 'due=overdue';
  }

  if (filter === 'no_due') {
    return 'due=none';
  }

  if (filter === 'done') {
    return 'status=done';
  }

  if (filter === 'archived') {
    return 'status=archived&archived=true';
  }

  return '';
}

export function TodoWorkspace({
  initialListId = null,
  initialTaskId = null,
}: {
  initialListId?: string | null;
  initialTaskId?: string | null;
}) {
  const { authenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialListId
  );
  const [activeFilter, setActiveFilter] = useState<TodoFilter>('all');
  const [selectedTask, setSelectedTask] = useState<TodoTask | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [toast, setToast] = useState('');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshTasks() {
    const params = new URLSearchParams();
    const filterParams = new URLSearchParams(getFilterParams(activeFilter));

    if (selectedListId) {
      params.set('listId', selectedListId);
    }

    filterParams.forEach((value, key) => params.set(key, value));

    if (searchValue.trim()) {
      params.set('q', searchValue.trim());
    }

    const nextTasks = await todoRequest<TodoTask[]>(
      `/todo/tasks${params.toString() ? `?${params.toString()}` : ''}`
    );

    setTasks(nextTasks);

    if (selectedTask) {
      const stillVisible = nextTasks.find((task) => task.id === selectedTask.id);

      if (!stillVisible) {
        setSelectedTask(null);
      }
    }
  }

  async function loadInitialData() {
    if (!authenticated) {
      return;
    }

    setIsLoading(true);

    try {
      setSelectedListId(initialListId || null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!authenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname || '/todo')}` as Route
      );
      return;
    }

    void loadInitialData();
  }, [authenticated, authLoading, pathname, router]);

  useEffect(() => {
    if (!authenticated || isLoading) {
      return;
    }

    void refreshTasks().catch(() => setToast('Could not load tasks.'));
  }, [authenticated, isLoading, selectedListId, activeFilter, searchValue]);

  useEffect(() => {
    if (!authenticated || !initialTaskId) {
      return;
    }

    void selectTaskById(initialTaskId).catch(() => {
      setToast('Could not load task.');
    });
  }, [authenticated, initialTaskId]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const viewTitle =
    activeFilter !== 'all'
      ? activeFilter.replace('_', ' ')
      : 'All tasks';
  const isManagerView =
    user?.role === 'manager' || user?.role === 'root_manager';

  async function selectTaskById(taskId: string) {
    const task = await todoRequest<TodoTask>(`/todo/tasks/${taskId}`);
    setSelectedTask(task);
  }

  async function handleSelectTask(task: TodoTask) {
    await selectTaskById(task.id);
  }

  async function handleCreateTask(payload: CreateTaskInput) {
    const task = await todoRequest<TodoTask>('/todo/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshTasks();
    await selectTaskById(task.id);
    setToast('Task created.');
  }

  async function handleQuickAdd(title: string) {
    await handleCreateTask({
      title,
    });
  }

  async function handleUpdateTask(task: TodoTask, patch: Partial<TodoTask>) {
    const updated = await todoRequest<TodoTask>(`/todo/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    setSelectedTask(updated);
    await refreshTasks();
    setToast('Saved.');
  }

  async function handleToggleComplete(task: TodoTask) {
    const endpoint =
      task.status === 'done'
        ? `/todo/tasks/${task.id}/reopen`
        : `/todo/tasks/${task.id}/complete`;
    const updated = await todoRequest<TodoTask>(endpoint, { method: 'POST' });

    if (selectedTask?.id === task.id) {
      setSelectedTask(updated);
    }

    await refreshTasks();
    setToast(task.status === 'done' ? 'Task reopened.' : 'Task completed.');
  }

  async function handleDeleteTask(task: TodoTask) {
    await todoRequest(`/todo/tasks/${task.id}`, { method: 'DELETE' });
    setSelectedTask(null);
    await refreshTasks();
    setToast('Deleted.');
  }

  async function handleArchiveTask(task: TodoTask) {
    const updated = await todoRequest<TodoTask>(`/todo/tasks/${task.id}/archive`, {
      method: 'POST',
    });
    setSelectedTask(updated);
    await refreshTasks();
    setToast('Saved.');
  }

  async function handleAddSubtask(task: TodoTask, title: string) {
    await todoRequest(`/todo/tasks/${task.id}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    await selectTaskById(task.id);
    await refreshTasks();
    setToast('Saved.');
  }

  async function handleUpdateSubtask(
    subtask: TodoSubtask,
    patch: Partial<TodoSubtask>
  ) {
    await todoRequest(`/todo/subtasks/${subtask.id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });

    if (selectedTask) {
      await selectTaskById(selectedTask.id);
    }

    await refreshTasks();
  }

  async function handleDeleteSubtask(subtask: TodoSubtask) {
    await todoRequest(`/todo/subtasks/${subtask.id}`, { method: 'DELETE' });

    if (selectedTask) {
      await selectTaskById(selectedTask.id);
    }

    await refreshTasks();
    setToast('Deleted.');
  }

  if (authLoading || isLoading) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
        Loading workspace.
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
        Redirecting to sign in.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl shadow-stone-900/10">
          {toast}
        </div>
      ) : null}

      <TodoLayout
        sidebar={
          <TodoListSidebar
            activeFilter={activeFilter}
            onSelectFilter={(filter) => setActiveFilter(filter)}
          />
        }
        main={
          <TaskList
            title={viewTitle}
            tasks={tasks}
            selectedTaskId={selectedTask?.id || null}
            onSelectTask={(task) => void handleSelectTask(task)}
            onQuickAdd={handleQuickAdd}
            onToggleComplete={handleToggleComplete}
            onCreateTask={() => setIsCreateTaskOpen(true)}
            showOwnerBadges={isManagerView}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        }
        inspector={
          <TaskInspector
            task={selectedTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onArchiveTask={handleArchiveTask}
            onAddSubtask={handleAddSubtask}
            onUpdateSubtask={handleUpdateSubtask}
            onDeleteSubtask={handleDeleteSubtask}
          />
        }
      />

      {isCreateTaskOpen ? (
        <CreateTaskModal
          onClose={() => setIsCreateTaskOpen(false)}
          onCreate={handleCreateTask}
        />
      ) : null}
    </div>
  );
}
