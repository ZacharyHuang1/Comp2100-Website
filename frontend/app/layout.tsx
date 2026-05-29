import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';
import { Suspense } from 'react';

import { AuthenticatedShell } from '@/components/auth/AuthenticatedShell';
import { AuthProvider } from '@/components/auth/AuthProvider';

import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Code Knowledge Base',
  description: 'Documentation-style frontend for the code knowledge base.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${serif.variable} ${mono.variable} font-[family-name:var(--font-sans)] text-stone-900 antialiased`}
      >
        <AuthProvider>
          <Suspense fallback={null}>
            <AuthenticatedShell>{children}</AuthenticatedShell>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
