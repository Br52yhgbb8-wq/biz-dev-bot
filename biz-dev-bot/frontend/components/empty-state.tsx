"use client"

import { cn } from "@/lib/api"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, children, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-[#f2f2f7] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-7 h-7 text-[#c7c7cc]" />}
      </div>
      <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#86868b] max-w-xs mb-5">{description}</p>
      )}
      {action}
      {children}
    </div>
  )
}
