import { cn } from "@/lib/api"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#f2f2f7]", className)}
      {...props}
    />
  )
}
