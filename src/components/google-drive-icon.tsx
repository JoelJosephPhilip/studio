
import { cn } from "@/lib/utils"

export function GoogleDriveIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={cn("h-6 w-6", className)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18.8 13.2l-6-10.4-6 10.4H18.8z" fill="#3777E3" stroke="none" />
            <path d="M2.8 13.2l6 10.4 3-5.2-9-5.2z" fill="#FFCF63" stroke="none" />
            <path d="M21.2 13.2l-9-5.2-3 5.2h12z" fill="#18B566" stroke="none" />
        </svg>
    )
}
