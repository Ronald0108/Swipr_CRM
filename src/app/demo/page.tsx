import { Suspense } from 'react';
import { AppProvider } from '@/app/providers';
import Dashboard from '@/app/(app)/dashboard/page';

export default function DemoPage() {
  return (
    <Suspense fallback={<div>Loading demo...</div>}>
      <AppProvider demoMode>
        <Dashboard />
      </AppProvider>
    </Suspense>
  );
}
