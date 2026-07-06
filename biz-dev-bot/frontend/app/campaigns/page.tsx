"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Pagination } from "@/components/pagination"
import { TableSkeleton } from "@/components/table-skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorBoundary } from "@/components/error-boundary"
import { Plus, Play, Pause, RotateCcw, SendHorizontal } from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#f2f2f7] text-[#86868b]",
  running: "bg-[rgba(52,199,89,0.1)] text-[#34c759]",
  paused: "bg-[rgba(255,149,0,0.1)] text-[#ff9500]",
  completed: "bg-[rgba(0,122,255,0.1)] text-[#007AFF]",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿", running: "运行中", paused: "已暂停", completed: "已完成",
}

function CampaignsPageInner() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async (newSkip?: number) => {
    setLoading(true)
    try {
      const s = newSkip ?? skip
      const res = await api.request<{ items: any[]; total: number }>(`/api/campaigns?skip=${s}&limit=${limit}`)
      setCampaigns(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await api.request("/api/campaigns", {
        method: "POST", body: JSON.stringify({ name, sequence: [] }),
      })
      setShowCreate(false)
      setName("")
      toast({ title: "活动已创建", variant: "success" })
      load()
    } catch (err: any) {
      setError(err.message)
      toast({ title: "创建失败", description: err.message, variant: "error" })
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      await api.request(`/api/campaigns/${id}/${action}`, { method: "POST" })
      const labels: Record<string, string> = { start: "已启动", pause: "已暂停", resume: "已恢复" }
      toast({ title: `活动${labels[action] || action}`, variant: "success" })
      load()
    } catch (err: any) {
      setError(err.message)
      toast({ title: "操作失败", description: err.message, variant: "error" })
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">营销活动</h1>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] active:bg-[#0056b3]">
          <Plus className="w-4 h-4" /> 新建活动
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-white border border-[#ff3b30] rounded-lg p-3 mb-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 mb-4 max-w-md">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">新建活动</h3>
          <div className="flex gap-2">
            <input placeholder="活动名称" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 h-[42px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <button onClick={handleCreate}
              className="inline-flex items-center gap-1.5 h-[42px] px-4 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]">创建</button>
            <button onClick={() => setShowCreate(false)}
              className="inline-flex items-center gap-1.5 h-[42px] px-4 text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">取消</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : campaigns.length === 0 ? (
          <EmptyState title="暂无营销活动" description="创建您的第一个营销活动，开始自动化线索跟进。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F5F5F7]">
                  <th className="px-5 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] w-[40%]">名称</th>
                  <th className="px-5 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">状态</th>
                  <th className="px-5 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] hidden sm:table-cell">创建日期</th>
                  <th className="px-5 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] hidden md:table-cell">步骤</th>
                  <th className="px-5 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">操作</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#f9f9fb]">
                    <td className="px-5 py-3.5 text-sm font-medium text-[#1d1d1f] border-b border-[#f2f2f7] truncate">{c.name}</td>
                    <td className="px-5 py-3.5 border-b border-[#f2f2f7]">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${STATUS_STYLES[c.status] || ""}`}>
                        {(c.status && STATUS_LABELS[c.status]) || c.status || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#86868b] border-b border-[#f2f2f7] hidden sm:table-cell">
                      {new Date(c.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#86868b] border-b border-[#f2f2f7] hidden md:table-cell">
                      {(c.sequence || []).length}
                    </td>
                    <td className="px-5 py-3.5 border-b border-[#f2f2f7]">
                      <div className="flex gap-1">
                        {c.status === "draft" && (
                          <button onClick={() => handleAction(c.id, "start")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border-none rounded cursor-pointer hover:bg-[rgba(0,122,255,0.15)]">
                            <Play className="w-3 h-3" /> 启动
                          </button>
                        )}
                        {c.status === "running" && (
                          <button onClick={() => handleAction(c.id, "pause")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#ff9500] bg-[rgba(255,149,0,0.08)] border-none rounded cursor-pointer hover:bg-[rgba(255,149,0,0.15)]">
                            <Pause className="w-3 h-3" /> 暂停
                          </button>
                        )}
                        {c.status === "paused" && (
                          <button onClick={() => handleAction(c.id, "resume")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border-none rounded cursor-pointer hover:bg-[rgba(0,122,255,0.15)]">
                            <RotateCcw className="w-3 h-3" /> 继续
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

            <div className="mt-4">
        <Pagination skip={skip} limit={limit} total={total} onPageChange={(s) => { setSkip(s); load(s) }} />
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <AppLayout>
      <CampaignsPageInner />
    </AppLayout>
  )
}
