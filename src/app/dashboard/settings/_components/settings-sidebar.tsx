
'use client';

import { cn } from "@/lib/utils";
import { FileText, User, Shield, CreditCard, Settings, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsSidebarProps {
    activeSection: string;
    setActiveSection: (section: string) => void;
}

const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'resumes', label: 'Resume Manager', icon: FileText },
]

export function SettingsSidebar({ activeSection, setActiveSection }: SettingsSidebarProps) {
    return (
        <nav className="flex flex-col gap-1">
            {navItems.map(item => (
                <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                        "justify-start",
                        activeSection === item.id && "bg-muted font-semibold"
                    )}
                    onClick={() => setActiveSection(item.id)}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                </Button>
            ))}
        </nav>
    );
}
