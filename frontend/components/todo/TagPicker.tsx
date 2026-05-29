'use client';

import { FormEvent, useState } from 'react';

import { TodoTag } from '@/components/todo/types';

export function TagPicker({
  tags,
  selectedTags,
  onAddTag,
  onRemoveTag,
}: {
  tags: TodoTag[];
  selectedTags: TodoTag[];
  onAddTag: (name: string) => Promise<void>;
  onRemoveTag: (tag: TodoTag) => Promise<void>;
}) {
  const [tagName, setTagName] = useState('');
  const selectedIds = new Set(selectedTags.map((tag) => tag.id));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = tagName.trim();

    if (!nextName) {
      return;
    }

    await onAddTag(nextName);
    setTagName('');
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => void onRemoveTag(tag)}
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
          >
            {tag.name} ×
          </button>
        ))}
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {tags
            .filter((tag) => !selectedIds.has(tag.id))
            .slice(0, 10)
            .map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => void onAddTag(tag.name)}
                className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600 hover:border-amber-200 hover:text-amber-700"
              >
                {tag.name}
              </button>
            ))}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
          placeholder="Add tag..."
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
