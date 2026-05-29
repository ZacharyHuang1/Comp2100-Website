import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
          Loading sign in.
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

