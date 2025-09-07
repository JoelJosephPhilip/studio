
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  FileText,
  Languages,
  LayoutGrid,
  Lightbulb,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Wand,
  Archive,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/dashboard/resume-builder', label: 'Resume Builder', icon: FileText },
    { href: '/dashboard/resume-store', label: 'Resume Store', icon: Archive },
    { href: '/dashboard/cover-letter', label: 'Cover Letter', icon: Mail },
    { href: '/dashboard/ats-analyzer', label: 'ATS Analyzer', icon: BarChart3 },
    { href: '/dashboard/fix-my-resume', label: 'Fix My Resume', icon: Wand },
    { href: '/dashboard/jd-matcher', label: 'JD Matcher', icon: Search },
    { href: '/dashboard/interview-coach', label: 'Interview Coach', icon: MessageSquare },
    { href: '/dashboard/job-search', label: 'Job Search', icon: Briefcase },
    { href: '/dashboard/career-path', label: 'Career Path', icon: Lightbulb },
    { href: '/dashboard/translate', label: 'Translator', icon: Languages },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex-1 overflow-auto py-2">
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            pathname === item.href && "bg-muted text-primary"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
    </div>
  );
}
