import { PenTool } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  isLink?: boolean;
  className?: string;
}

export function Logo({ isLink, className }: LogoProps) {
  const content = (
    <>
      <PenTool className="h-6 w-6 text-primary" />
      <span className="font-headline text-lg font-bold">CareerForge AI</span>
    </>
  );

  if (isLink) {
    return (
      <Link href="/" className={cn('flex items-center gap-2', className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn('flex items-center gap-2', className)}>{content}</div>;
}
