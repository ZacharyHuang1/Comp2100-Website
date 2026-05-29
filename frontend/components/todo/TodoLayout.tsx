'use client';

import { ReactNode } from 'react';

export function TodoLayout({
  sidebar,
  main,
  inspector,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
      {sidebar}
      {main}
      {inspector}
    </div>
  );
}
