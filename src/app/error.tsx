'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-900 p-4">
      <h2 className="mb-4 text-2xl font-bold text-white">Something went wrong!</h2>
      <p className="mb-8 text-gray-400">We apologize for the inconvenience.</p>
      <button
        onClick={() => reset()}
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        Try again
      </button>
    </div>
  );
}
