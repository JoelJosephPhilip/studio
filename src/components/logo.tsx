import { PenTool } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <PenTool className="h-6 w-6 text-primary" />
      <span className="font-headline text-lg font-bold">CareerForge AI</span>
    </Link>
  );
}
