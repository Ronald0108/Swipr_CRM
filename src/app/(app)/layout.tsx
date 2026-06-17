import { Suspense } from 'react';
import { AppProvider } from '../providers';

export const dynamic = 'force-dynamic';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0f] text-white">
          Loading...
        </div>
      }
    >
      <AppProvider>{children}</AppProvider>
    </Suspense>
  );
}
