"use client"

import { cn } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  skip: number
  limit: number
  total: number
  onPageChange: (skip: number) => void
}

export function Pagination({ skip, limit, total, onPageChange }: PaginationProps) {
  if (total <= limit) return null

  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-[#86868b]">
        {total <= limit
          ? `共 ${total} 条记录`
          : `显示第 ${skip + 1}-${Math.min(skip + limit, total)} 条，共 ${total} 条`
        }
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={skip === 0}
          onClick={() => onPageChange(skip - limit)}
          className={cn(
            "inline-flex items-center gap-1 h-[32px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg transition-all duration-200 hover:bg-[#f5f5f7]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "bg-transparent cursor-pointer"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> 上一页
        </button>
        <span className="text-sm text-[#86868b]">第 {currentPage}/{totalPages || 1} 页</span>
        <button
          disabled={skip + limit >= total}
          onClick={() => onPageChange(skip + limit)}
          className={cn(
            "inline-flex items-center gap-1 h-[32px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg transition-all duration-200 hover:bg-[#f5f5f7]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "bg-transparent cursor-pointer"
          )}
        >
          下一页 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
