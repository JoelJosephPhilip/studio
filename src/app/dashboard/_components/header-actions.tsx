
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

export function HeaderActions() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    if (session) {
      await signOut({ callbackUrl: '/' });
    } else if (user) {
      await auth.signOut();
      // The redirect to '/' can be handled globally or in a useeffect on a higher component
    }
  };

  const getAvatarFallback = () => {
    const name = session?.user?.name || user?.displayName;
    if (name) {
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('');
      return initials.toUpperCase();
    }
    return 'U';
  };

  const avatarSrc = session?.user?.image || user?.photoURL || "https://placehold.co/40x40";

  if (!isMounted) {
    // Render placeholders or nothing on the server to prevent hydration mismatch
    return (
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-md bg-muted animate-pulse"></div>
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
        </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarSrc} alt="@user" data-ai-hint="person avatar" />
              <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
