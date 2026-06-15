import type { Metadata } from 'next';
import '@/styles/index.css';
import { AppProvider } from './providers';

export const metadata: Metadata = {
  title: 'Swipr CRM',
  description: 'A modern CRM for managing and reviewing leads with a swipe-based rolodex interface.',
};

import { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0f] text-white">Loading...</div>}>
          <AppProvider>{children}</AppProvider>
        </Suspense>
      </body>
    </html>
  );
}
