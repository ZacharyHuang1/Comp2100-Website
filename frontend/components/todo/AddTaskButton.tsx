'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { CreateTaskModal } from '@/components/todo/CreateTaskModal';
import { todoRequest } from '@/components/todo/todoApi';
import { CreateTaskInput } from '@/components/todo/types';

export function AddTaskButton({
  label = '+ Add task',
  defaultTitle,
  defaultDescription = '',
  linkedTopicId = null,
  linkedCategoryId = null,
}: {
  label?: string;
  defaultTitle: string;
  defaultDescription?: string;
  linkedTopicId?: string | null;
  linkedCategoryId?: string | null;
}) {
  const { authenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState('');

  async function openModal() {
    if (!authenticated) {
      router.push(`/login?next=${encodeURIComponent(pathname || '/')}` as Route);
      return;
    }

    setIsOpen(true);
  }

  async function createTask(payload: CreateTaskInput) {
    await todoRequest('/todo/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToast('Task created.');
    window.setTimeout(() => setToast(''), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm shadow-stone-200/40 transition hover:border-amber-300 hover:text-amber-700"
      >
        {label}
      </button>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl shadow-stone-900/10">
          {toast}
        </div>
      ) : null}
      {isOpen ? (
        <CreateTaskModal
          defaultTitle={defaultTitle}
          defaultDescription={defaultDescription}
          linkedTopicId={linkedTopicId}
          linkedCategoryId={linkedCategoryId}
          onClose={() => setIsOpen(false)}
          onCreate={createTask}
        />
      ) : null}
    </>
  );
}
