import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
      <div className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-[100px]" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-[#f2f2f7]">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? "w-[160px]" : "w-[100px]"}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[#E5E5EA] rounded-lg p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}
