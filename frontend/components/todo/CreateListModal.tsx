'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { TodoUser } from '@/components/todo/types';

const COLOR_PRESETS = [
  '#F59E0B',
  '#2563EB',
  '#16A34A',
  '#9333EA',
  '#DC2626',
  '#64748B',
];

export function CreateListModal({
  initialList = null,
  users,
  currentUserId = '',
  onClose,
  onCreate,
  onUpdate,
}: {
  initialList?: {
    id: string;
    name: string;
    description: string;
    color: string;
    markerColor?: string;
    ownerUserId: string;
  } | null;
  users: TodoUser[];
  currentUserId?: string;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    description: string;
    color: string;
    markerColor?: string;
    ownerUserId: string;
  }) => Promise<void>;
  onUpdate?: (
    listId: string,
    payload: {
      name: string;
      description: string;
      color: string;
      markerColor?: string;
      ownerUserId: string;
    }
  ) => Promise<void>;
}) {
  const [name, setName] = useState(initialList?.name || '');
  const [description, setDescription] = useState(
    initialList?.description || ''
  );
  const [color, setColor] = useState(
    initialList?.markerColor || initialList?.color || '#F59E0B'
  );
  const [ownerUserId, setOwnerUserId] = useState(
    initialList?.ownerUserId ||
      users.find((user) => user.id === currentUserId)?.id ||
      users[0]?.id ||
      ''
  );
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
      if (initialList && onUpdate) {
        await onUpdate(initialList.id, {
          name,
          description,
          color,
          markerColor: color,
          ownerUserId,
        });
      } else {
        await onCreate({ name, description, color, markerColor: color, ownerUserId });
      }

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
        className="relative z-[200] w-[calc(100vw-32px)] max-w-[520px] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-950/25"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">
              {initialList ? 'Edit list' : 'New list'}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {initialList
                ? 'Update this project area.'
                : 'Create a project area for related tasks.'}
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
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 px-3 py-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <div className="block text-sm font-medium text-stone-700">
            Marker colour
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  aria-label={`Use ${preset}`}
                  className={`h-8 w-8 rounded-full border-2 ${
                    color.toLowerCase() === preset.toLowerCase()
                      ? 'border-stone-950'
                      : 'border-white'
                  } shadow-sm ring-1 ring-stone-200`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#F59E0B"
              className="mt-3 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Owner
            <select
              value={ownerUserId}
              onChange={(event) => setOwnerUserId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.username}
                </option>
              ))}
            </select>
          </label>
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
            disabled={isSaving}
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
