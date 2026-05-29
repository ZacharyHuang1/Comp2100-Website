'use client';

import { useEffect, useState } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  async function handleConfirm() {
    setIsWorking(true);
    setError('');

    try {
      await onConfirm();
    } catch {
      setError('Could not complete this action.');
      setIsWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/35 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl shadow-stone-950/25">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          Confirm
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-stone-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">{message}</p>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isWorking}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-stone-900 hover:bg-amber-600'
            }`}
          >
            {isWorking ? 'Working' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
