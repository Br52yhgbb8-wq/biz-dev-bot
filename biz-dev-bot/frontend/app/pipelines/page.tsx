"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { CardGridSkeleton } from "@/components/table-skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorBoundary } from "@/components/error-boundary"
import { Plus, ArrowRight, DollarSign, Download, X } from "lucide-react"

const STAGES = [
  { key: "discovery", label: "发现期", color: "text-[#007AFF] bg-[rgba(0,122,255,0.1)]" },
  { key: "proposal", label: "方案期", color: "text-[#ff9500] bg-[rgba(255,149,0,0.1)]" },
  { key: "negotiation", label: "谈判期", color: "text-[#af52de] bg-[rgba(175,82,222,0.1)]" },
  { key: "closed_won", label: "已赢单", color: "text-[#34c759] bg-[rgba(52,199,89,0.1)]" },
  { key: "closed_lost", label: "已输单", color: "text-[#ff3b30] bg-[rgba(255,59,48,0.1)]" },
]

interface Pipeline {
  id: string; contact_id: string; stage: string; deal_value: string | null;
  probability: number | null; expected_close_date: string | null; owner_id: string | null; created_at: string;
}

function PipelinesPageInner() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState("")
  const [dealValue, setDealValue] = useState("")
  const [probability, setProbability] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.pipelines.list()
      setPipelines(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.contacts.list({ limit: 100 }).then((r) => setContacts(r.items)).catch(() => {}) }, [])

  async function handleCreate() {
    if (!selectedContact) return
    await api.pipelines.create({
      contact_id: selectedContact,
      deal_value: dealValue || null,
      probability: probability ? parseInt(probability) : null,
    })
    toast({ title: "商机已创建", variant: "success" })
    setShowCreate(false)
    setSelectedContact("")
    setDealValue("")
    setProbability("")
    load()
  }

  async function advanceStage(pipelineId: string, currentStage: string) {
    const stageOrder = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"]
    const idx = stageOrder.indexOf(currentStage)
    if (idx < 0 || idx >= stageOrder.length - 1) return
    await api.pipelines.updateStage(pipelineId, stageOrder[idx + 1])
    toast({ title: "阶段已推进", variant: "success" })
    load()
  }

  const grouped = STAGES.map((s) => ({
    ...s,
    items: pipelines.filter((p) => p.stage === s.key),
    total: pipelines.filter((p) => p.stage === s.key).reduce(
      (sum, p) => sum + (parseFloat(p.deal_value || "0") || 0), 0
    ),
  }))

  function getContactName(contactId: string): string {
    const c = contacts.find((c) => c.id === contactId)
    return c?.name || contactId.slice(0, 8)
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">销售管道</h1>
        <div className="flex gap-2.5">
          <button onClick={() => window.open(api.pipelines.exportCsvUrl(), "_blank")}
            className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6] bg-transparent">
            <Download className="w-4 h-4" /> 导出
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] active:bg-[#0056b3]">
            <Plus className="w-4 h-4" /> 添加商机
          </button>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 mb-6 max-w-md">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">新建商机</h3>
          <div className="space-y-3">
            <select value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}
              className="w-full h-[42px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] bg-white">
              <option value="">选择联系人...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input placeholder="商机金额 (¥)" value={dealValue} onChange={(e) => setDealValue(e.target.value)}
              className="w-full h-[42px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="赢单概率 (%)" value={probability} onChange={(e) => setProbability(e.target.value)}
              className="w-full h-[42px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]">创建</button>
              <button onClick={() => setShowCreate(false)}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <CardGridSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {grouped.map((stage) => (
            <div key={stage.key} className="flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold rounded-md ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-semibold text-[#86868b] bg-white px-2 py-0.5 rounded-full">{stage.items.length}</span>
              </div>

              {/* Column Cards */}
              <div className="flex flex-col gap-3 flex-1">
                {stage.items.length === 0 ? (
                  <div className="text-xs text-[#c7c7cc] text-center py-6 border border-dashed border-[#E5E5EA] rounded-lg">
                    暂无商机
                  </div>
                ) : stage.items.map((p) => (
                  <div key={p.id}
                    className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 cursor-pointer transition-all duration-200 hover:border-[#d1d1d6] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <p className="text-sm font-semibold text-[#1d1d1f] mb-2.5 truncate">{getContactName(p.contact_id)}</p>
                    <div className="space-y-1.5 mb-3">
                      {p.deal_value && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#86868b]">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium text-[#1d1d1f]">¥{parseFloat(p.deal_value).toLocaleString()}</span>
                        </div>
                      )}
                      {p.probability != null && (
                        <div className="text-[11px] text-[#86868b]">{p.probability}%</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#c7c7cc]">
                        {new Date(p.created_at).toLocaleDateString("zh-CN")}
                      </span>
                      {stage.key !== "closed_won" && stage.key !== "closed_lost" && (
                        <button onClick={() => advanceStage(p.id, p.stage)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border-none rounded cursor-pointer transition-all duration-200 hover:bg-[rgba(0,122,255,0.15)]">
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center text-sm">
          {grouped.map((s) => (
            <div key={s.key}>
              <p className="text-[#86868b]">{s.label}</p>
              <p className="font-semibold text-[#1d1d1f]">¥{s.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PipelinesPage() {
  return (
    <AppLayout>
      <PipelinesPageInner />
    </AppLayout>
  )
}
