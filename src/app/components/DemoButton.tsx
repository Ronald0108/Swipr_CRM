import Link from 'next/link';
import { Play } from 'lucide-react';

export function DemoButton() {
  return (
    <Link href="/demo" className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-600">
      <Play className="h-4 w-4" aria-hidden="true" />
      Try demo
    </Link>
  );
}
