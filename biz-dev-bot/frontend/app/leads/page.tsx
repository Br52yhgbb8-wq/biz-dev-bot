"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import {
  Sparkles, Target, Crosshair, TrendingUp, Users,
  Search, Filter, Download, Plus, X, Star, Zap,
  MessageSquare, ArrowRight, ChevronLeft, ChevronRight,
  Bot, Globe, Building2, Briefcase, Mail, Linkedin,
  Check, Clock, AlertTriangle, Info, Loader2,
} from "lucide-react"

interface Lead {
  id: string
  name: string
  company: string | null
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  website: string | null
  status: string
  score: number | null
  source: string
  source_url: string | null
  summary: string | null
  tags: string[]
  notes: string | null
  outreach_template: string | null
  linked_contact_id: string | null
  discovery_attempts: number
  created_at: string
}

const STATUS_OPTIONS = ["discovered", "contacted", "qualified", "converted", "dismissed"]
const SOURCE_OPTIONS = ["manual", "gemini_discovery", "linkedin_search", "web_search", "referral", "import"]
const PAGE_SIZE = 15

const STATUS_LABELS: Record<string, string> = {
  discovered: "已发现",
  contacted: "已联系",
  qualified: "已验证",
  converted: "已转化",
  dismissed: "已排除",
}
const STATUS_COLORS: Record<string, string> = {
  discovered: "#86868b",
  contacted: "#007AFF",
  qualified: "#34c759",
  converted: "#ff9500",
  dismissed: "#ff3b30",
}
const STATUS_BG: Record<string, string> = {
  discovered: "#f2f2f7",
  contacted: "rgba(0,122,255,0.1)",
  qualified: "rgba(52,199,89,0.1)",
  converted: "rgba(255,149,0,0.1)",
  dismissed: "rgba(255,59,48,0.1)",
}

function getScoreColor(score: number | null): string {
  if (score === null) return "#86868b"
  if (score >= 80) return "#ff9500"
  if (score >= 60) return "#34c759"
  if (score >= 40) return "#007AFF"
  return "#86868b"
}

function LeadGenPageInner() {
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [minScore, setMinScore] = useState(0)

  // AI Discovery modal
  const [showDiscover, setShowDiscover] = useState(false)
  const [discoverIndustry, setDiscoverIndustry] = useState("")
  const [discoverRegion, setDiscoverRegion] = useState("")
  const [discoverCriteria, setDiscoverCriteria] = useState("")
  const [discoverCount, setDiscoverCount] = useState(10)
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState<any>(null)

  // Lead actions
  const [actionLead, setActionLead] = useState<Lead | null>(null)
  const [showOutreach, setShowOutreach] = useState(false)
  const [outreachChannel, setOutreachChannel] = useState("email")
  const [outreachTone, setOutreachTone] = useState("professional")
  const [outreachContext, setOutreachContext] = useState("")
  const [outreachResult, setOutreachResult] = useState<any>(null)
  const [generatingOutreach, setGeneratingOutreach] = useState(false)

  const [showConvert, setShowConvert] = useState(false)
  const [convertDealValue, setConvertDealValue] = useState("")
  const [convertStage, setConvertStage] = useState("discovery")
  const [converting, setConverting] = useState(false)

  const [showEnrich, setShowEnrich] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [enrichResult, setEnrichResult] = useState<any>(null)

  const [scoringIds, setScoringIds] = useState<string[]>([])
  const [scoring, setScoring] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

  // ── Data loading ────────────────────────────────────────────

  const loadLeads = useCallback(async (params?: any) => {
    setLoading(true)
    try {
      const res = await api.leads.list({
        search: params?.search || undefined,
        status: params?.status || undefined,
        source: params?.source || undefined,
        min_score: params?.minScore || undefined,
        skip: params?.skip ?? skip,
        limit: PAGE_SIZE,
      })
      setLeads(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => {
    loadLeads()
    api.leads.stats().then(setStats).catch(() => {})
  }, [loadLeads])

  function handleSearch() {
    setSkip(0)
    loadLeads({ search, status: statusFilter, source: sourceFilter, minScore, skip: 0 })
  }

  function handlePageChange(newSkip: number) {
    setSkip(newSkip)
    loadLeads({ search, status: statusFilter, source: sourceFilter, minScore, skip: newSkip })
  }

  // ── AI Discovery ────────────────────────────────────────────

  async function handleDiscover() {
    if (!discoverIndustry.trim()) return
    setDiscovering(true)
    setDiscoverResult(null)
    try {
      const res = await api.leads.discover({
        industry: discoverIndustry,
        region: discoverRegion || undefined,
        criteria: discoverCriteria || undefined,
        count: discoverCount,
        auto_enrich: true,
      })
      setDiscoverResult(res)
      toast({ title: "发现完成", description: `发现 ${res.total_discovered} 个新线索`, variant: "success" })
      loadLeads()
      api.leads.stats().then(setStats)
    } catch (e: any) {
      toast({ title: "发现失败", description: e.message, variant: "error" })
    } finally {
      setDiscovering(false)
    }
  }

  // ── Scoring ─────────────────────────────────────────────────

  async function handleScoreAll() {
    const ids = leads.filter(l => l.score === null || l.score < 40).map(l => l.id)
    if (ids.length === 0) {
      toast({ title: "暂无待评分线索", variant: "info" })
      return
    }
    setScoringIds(ids)
    setScoring(true)
    try {
      const res = await api.leads.score(ids)
      toast({ title: "评分完成", description: `已为 ${res.results.length} 个线索评分`, variant: "success" })
      loadLeads()
    } catch (e: any) {
      toast({ title: "评分失败", description: e.message, variant: "error" })
    } finally {
      setScoring(false)
      setScoringIds([])
    }
  }

  // ── Enrichment ──────────────────────────────────────────────

  async function handleEnrich(leadId: string) {
    setEnriching(true)
    setEnrichResult(null)
    try {
      const res = await api.leads.enrich(leadId)
      setEnrichResult(res)
      toast({ title: "丰富完成", variant: "success" })
      loadLeads()
    } catch (e: any) {
      toast({ title: "丰富失败", description: e.message, variant: "error" })
    } finally {
      setEnriching(false)
    }
  }

  // ── Outreach ────────────────────────────────────────────────

  async function handleGenerateOutreach() {
    if (!actionLead) return
    setGeneratingOutreach(true)
    setOutreachResult(null)
    try {
      const res = await api.leads.outreach({
        lead_id: actionLead.id,
        channel: outreachChannel,
        tone: outreachTone,
        context: outreachContext || undefined,
      })
      setOutreachResult(res)
      toast({ title: "已生成", variant: "success" })
    } catch (e: any) {
      toast({ title: "生成失败", description: e.message, variant: "error" })
    } finally {
      setGeneratingOutreach(false)
    }
  }

  // ── Conversion ──────────────────────────────────────────────

  async function handleConvert() {
    if (!actionLead) return
    setConverting(true)
    try {
      const res = await api.leads.convert({
        lead_id: actionLead.id,
        deal_value: convertDealValue ? parseFloat(convertDealValue) : undefined,
        pipeline_stage: convertStage,
      })
      toast({
        title: "转化成功",
        description: `已创建联系人并进入 ${convertStage} 管道`,
        variant: "success",
      })
      setShowConvert(false)
      setActionLead(null)
      loadLeads()
      api.leads.stats().then(setStats)
    } catch (e: any) {
      toast({ title: "转化失败", description: e.message, variant: "error" })
    } finally {
      setConverting(false)
    }
  }

  // ── Bulk Status ─────────────────────────────────────────────

  async function handleBulkStatus(status: string) {
    const ids = leads.filter(l => l.status !== status).map(l => l.id)
    if (ids.length === 0) return
    try {
      await api.leads.bulkStatus({ lead_ids: ids, status })
      toast({ title: "状态已更新", variant: "success" })
      loadLeads()
    } catch (e: any) {
      toast({ title: "更新失败", description: e.message, variant: "error" })
    }
  }

  // ── Delete ──────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("确定删除此线索？")) return
    try {
      await api.leads.delete(id)
      toast({ title: "已删除", variant: "info" })
      loadLeads()
    } catch (e: any) {
      toast({ title: "删除失败", description: e.message, variant: "error" })
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px] flex items-center gap-3">
            <Target className="w-7 h-7 text-[#007AFF]" />
            智能获客
          </h1>
          <p className="text-sm text-[#86868b] mt-1">
            AI 驱动的线索发现、评分、丰富和转化
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleScoreAll}
            disabled={scoring || leads.length === 0}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] disabled:opacity-40 bg-transparent"
          >
            {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            批量评分
          </button>
          <button
            onClick={() => setShowDiscover(true)}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
          >
            <Sparkles className="w-4 h-4" /> AI 发现线索
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-7">
          {[
            { label: "总线索数", value: stats.total_leads, icon: Users, color: "#007AFF" },
            { label: "高价值", value: stats.high_value, icon: Zap, color: "#ff9500" },
            { label: "已联系", value: stats.contacted, icon: MessageSquare, color: "#34c759" },
            { label: "已转化", value: stats.converted, icon: Check, color: "#af52de" },
            { label: "今日发现", value: stats.discovery_today, icon: Globe, color: "#5ac8fa" },
            { label: "剩余配额", value: stats.daily_quota_remaining, icon: Clock, color: "#86868b" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="bg-white border border-[#E5E5EA] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  <span className="text-[11px] font-medium text-[#86868b]">{item.label}</span>
                </div>
                <p className="text-[22px] font-bold text-[#1d1d1f]" style={{ color: item.label === "高价值" ? "#ff9500" : undefined }}>
                  {item.value}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Discovery Modal */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !discovering && setShowDiscover(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-[520px] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#007AFF]" />
                AI 线索发现
              </h3>
              <button onClick={() => setShowDiscover(false)}
                className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#86868b] mb-1 block">目标行业 *</label>
                <input placeholder="例如: SaaS, 电商, 人工智能, 生物科技..."
                  value={discoverIndustry} onChange={(e) => setDiscoverIndustry(e.target.value)}
                  className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#86868b] mb-1 block">目标地区</label>
                  <input placeholder="例如: 中国, 华东, 北美..."
                    value={discoverRegion} onChange={(e) => setDiscoverRegion(e.target.value)}
                    className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
                </div>
                <div className="w-[100px]">
                  <label className="text-xs font-medium text-[#86868b] mb-1 block">数量</label>
                  <input type="number" min={1} max={50}
                    value={discoverCount} onChange={(e) => setDiscoverCount(Number(e.target.value))}
                    className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#86868b] mb-1 block">附加条件</label>
                <textarea placeholder="例如: 年营收5000万以上, 有海外业务, 正在招聘销售VP..."
                  value={discoverCriteria} onChange={(e) => setDiscoverCriteria(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
              </div>
              <button onClick={handleDiscover} disabled={discovering || !discoverIndustry.trim()}
                className="w-full h-[42px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-40 inline-flex items-center justify-center gap-2">
                {discovering ? <><Loader2 className="w-4 h-4 animate-spin" /> 正在分析...</> : <><Sparkles className="w-4 h-4" /> 开始发现</>}
              </button>

              {discoverResult && (
                <div className="bg-[rgba(52,199,89,0.06)] border border-[rgba(52,199,89,0.2)] rounded-lg p-3 mt-2">
                  <p className="text-sm font-medium text-[#34c759]">
                    发现 {discoverResult.total_discovered} 个新线索
                  </p>
                  {discoverResult.conversation && (
                    <p className="text-xs text-[#86868b] mt-1">{discoverResult.conversation}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {discoverResult.leads?.slice(0, 3).map((l: any, i: number) => (
                      <span key={i} className="inline-flex items-center h-[24px] px-2 text-[10px] font-medium bg-[#f2f2f7] text-[#1d1d1f] rounded-md">
                        {l.company || l.name}
                      </span>
                    ))}
                    {discoverResult.leads?.length > 3 && (
                      <span className="text-[10px] text-[#86868b] self-center">+{discoverResult.leads.length - 3}...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b] pointer-events-none" />
          <input placeholder="按姓名、公司或邮箱搜索线索..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-[42px] pl-[44px] pr-[14px] text-[15px] text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); loadLeads({ search, status: e.target.value, source: sourceFilter, minScore, skip: 0 }) }}
          className="h-[42px] px-3 text-sm bg-white border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]">
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); loadLeads({ search, status: statusFilter, source: e.target.value, minScore, skip: 0 }) }}
          className="h-[42px] px-3 text-sm bg-white border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]">
          <option value="">全部来源</option>
          {SOURCE_OPTIONS.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={minScore} onChange={(e) => { setMinScore(Number(e.target.value)); loadLeads({ search, status: statusFilter, source: sourceFilter, minScore: Number(e.target.value), skip: 0 }) }}
          className="h-[42px] px-3 text-sm bg-white border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]">
          <option value={0}>最低分: 不限</option>
          <option value={80}>最低分: ≥80</option>
          <option value={60}>最低分: ≥60</option>
          <option value={40}>最低分: ≥40</option>
        </select>
      </div>

      {/* Quick Actions Row */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-[#86868b]">批量操作:</span>
        {["contacted", "qualified", "dismissed"].map((s) => (
          <button key={s} onClick={() => handleBulkStatus(s)}
            className="inline-flex items-center gap-1 h-[28px] px-2.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent"
            style={{ color: STATUS_COLORS[s] }}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Lead Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({length: 6}).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState title="暂无线索" description={search ? "尝试调整搜索条件" : "点击「AI 发现线索」开始发现潜在客户"}>
            <button onClick={() => setShowDiscover(true)}
              className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer mt-3">
              <Sparkles className="w-4 h-4" /> AI 发现线索
            </button>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F5F5F7]">
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">线索</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] hidden md:table-cell">来源</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-center border-b border-[#E5E5EA]">评分</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-center border-b border-[#E5E5EA]">状态</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-center border-b border-[#E5E5EA]">操作</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#f2f2f7] hover:bg-[#f9f9fb] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-[#007AFF]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1d1d1f]">{lead.name}</p>
                          <p className="text-[12px] text-[#86868b] flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {lead.company || "-"}
                            {lead.title && <><span className="mx-0.5">·</span><Briefcase className="w-3 h-3" />{lead.title}</>}
                          </p>
                          {lead.email && (
                            <p className="text-[11px] text-[#c7c7cc] flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" />{lead.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center h-[22px] px-[8px] text-[11px] font-medium bg-[#f2f2f7] text-[#86868b] rounded-md">
                        {lead.source.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold" style={{ color: getScoreColor(lead.score) }}>
                        {lead.score !== null ? lead.score : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center h-[24px] px-[10px] text-[11px] font-medium rounded-md"
                        style={{
                          backgroundColor: STATUS_BG[lead.status] || "#f2f2f7",
                          color: STATUS_COLORS[lead.status] || "#86868b",
                        }}>
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); handleEnrich(lead.id); setShowEnrich(lead.id) }}
                          disabled={enriching && showEnrich === lead.id}
                          className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                          title="丰富信息">
                          {enriching && showEnrich === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Info className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { setActionLead(lead); setShowOutreach(true); setOutreachResult(null) }}
                          className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                          title="生成触达文案">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setActionLead(lead); setShowConvert(true) }}
                          className="w-7 h-7 flex items-center justify-center text-[#34c759] hover:bg-[rgba(52,199,89,0.1)] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                          title="转化为联系人">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)}
                          className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[rgba(255,59,48,0.1)] hover:text-[#ff3b30] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                          title="删除">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#86868b]">
            {total <= PAGE_SIZE
              ? `共 ${total} 条线索`
              : `显示第 ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} 条，共 ${total} 条`}
          </p>
          {total > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button disabled={skip === 0} onClick={() => handlePageChange(skip - PAGE_SIZE)}
                className="inline-flex items-center gap-1 h-[32px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg transition-all duration-200 hover:bg-[#f5f5f7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-transparent">
                <ChevronLeft className="w-4 h-4" /> 上一页
              </button>
              <span className="text-sm text-[#86868b]">第 {currentPage}/{totalPages || 1} 页</span>
              <button disabled={skip + PAGE_SIZE >= total} onClick={() => handlePageChange(skip + PAGE_SIZE)}
                className="inline-flex items-center gap-1 h-[32px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg transition-all duration-200 hover:bg-[#f5f5f7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-transparent">
                下一页 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Outreach Modal */}
      {showOutreach && actionLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowOutreach(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-[540px] w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">生成触达文案</h3>
              <button onClick={() => setShowOutreach(false)}
                className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg bg-transparent border-none cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-[#f5f5f7] rounded-lg p-3 text-sm">
                <p className="font-medium text-[#1d1d1f]">{actionLead.name}</p>
                <p className="text-[#86868b] text-xs">{actionLead.company} · {actionLead.title}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOutreachChannel("email")}
                  className={`flex-1 h-[36px] text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                    outreachChannel === "email"
                      ? "bg-[#007AFF] text-white border-[#007AFF]"
                      : "border-[#E5E5EA] text-[#86868b] hover:bg-[#f5f5f7] bg-transparent"
                  }`}>邮件</button>
                <button onClick={() => setOutreachChannel("linkedin")}
                  className={`flex-1 h-[36px] text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                    outreachChannel === "linkedin"
                      ? "bg-[#007AFF] text-white border-[#007AFF]"
                      : "border-[#E5E5EA] text-[#86868b] hover:bg-[#f5f5f7] bg-transparent"
                  }`}>LinkedIn</button>
              </div>
              <div className="flex gap-2">
                {["professional", "warm", "casual"].map((t) => (
                  <button key={t} onClick={() => setOutreachTone(t)}
                    className={`flex-1 h-[32px] text-[11px] font-medium rounded-lg border cursor-pointer transition-all ${
                      outreachTone === t
                        ? "bg-[#007AFF] text-white border-[#007AFF]"
                        : "border-[#E5E5EA] text-[#86868b] hover:bg-[#f5f5f7] bg-transparent"
                    }`}>{t === "professional" ? "专业" : t === "warm" ? "友好" : "轻松"}</button>
                ))}
              </div>
              <textarea placeholder="附加上下文（可选）"
                value={outreachContext} onChange={(e) => setOutreachContext(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
              <button onClick={handleGenerateOutreach} disabled={generatingOutreach}
                className="w-full h-[42px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3] disabled:opacity-40 inline-flex items-center justify-center gap-2">
                {generatingOutreach ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Sparkles className="w-4 h-4" /> 生成文案</>}
              </button>
              {outreachResult && (
                <div className="bg-[#f9f9fb] rounded-lg p-3 border border-[#E5E5EA] space-y-2">
                  {outreachResult.subject && (
                    <div>
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase">主题</span>
                      <p className="text-sm font-medium text-[#1d1d1f]">{outreachResult.subject}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase">正文</span>
                    <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap">{outreachResult.body}</p>
                  </div>
                  {outreachResult.cta && (
                    <div className="bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-lg p-2">
                      <span className="text-[10px] font-semibold text-[#007AFF]">建议 CTA</span>
                      <p className="text-sm text-[#1d1d1f]">{outreachResult.cta}</p>
                    </div>
                  )}
                  <button onClick={() => {
                    navigator.clipboard.writeText(outreachResult.body || "")
                    toast({ title: "已复制到剪贴板", variant: "success" })
                  }}
                    className="text-xs text-[#007AFF] bg-transparent border-none cursor-pointer hover:underline">
                    复制文案
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvert && actionLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowConvert(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-[420px] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">转化为联系人</h3>
              <button onClick={() => setShowConvert(false)}
                className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg bg-transparent border-none cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-[#f5f5f7] rounded-lg p-3 text-sm">
                <p className="font-medium text-[#1d1d1f]">{actionLead.name}</p>
                <p className="text-[#86868b] text-xs">{actionLead.company} · {actionLead.title}</p>
                {actionLead.score !== null && (
                  <p className="text-xs mt-1" style={{ color: getScoreColor(actionLead.score) }}>
                    评分: {actionLead.score}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-[#86868b] mb-1 block">管道阶段</label>
                <select value={convertStage} onChange={(e) => setConvertStage(e.target.value)}
                  className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]">
                  <option value="discovery">发现期</option>
                  <option value="proposal">方案期</option>
                  <option value="negotiation">谈判期</option>
                  <option value="closed_won">已赢单</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#86868b] mb-1 block">预计交易额（可选）</label>
                <input placeholder="例如: 100000" type="number"
                  value={convertDealValue} onChange={(e) => setConvertDealValue(e.target.value)}
                  className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
              </div>
              <button onClick={handleConvert} disabled={converting}
                className="w-full h-[42px] text-sm font-medium text-white bg-[#34c759] border-none rounded-lg cursor-pointer transition-all hover:bg-[#30b753] disabled:opacity-40 inline-flex items-center justify-center gap-2">
                {converting ? <><Loader2 className="w-4 h-4 animate-spin" /> 转化中...</> : <><Check className="w-4 h-4" /> 确认转化</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrich Result Modal */}
      {showEnrich && enrichResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setShowEnrich(null); setEnrichResult(null) }}>
          <div className="bg-white rounded-xl shadow-xl max-w-[500px] w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">AI 丰富信息</h3>
              <button onClick={() => { setShowEnrich(null); setEnrichResult(null) }}
                className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] rounded-lg bg-transparent border-none cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {enrichResult.company_info && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">公司信息</h4>
                  <div className="bg-[#f9f9fb] rounded-lg p-3 space-y-1.5">
                    {Object.entries(enrichResult.company_info || {}).map(([key, val]) =>
                      val ? (
                        <div key={key} className="flex gap-2">
                          <span className="text-[#86868b] min-w-[80px]">
                            {{full_name: "全称", description: "描述", estimated_size: "规模", headquarters: "总部", industry: "行业", founded_year: "成立"}[key] || key}
                          </span>
                          <span className="text-[#1d1d1f]">{String(val)}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
              {enrichResult.technologies && enrichResult.technologies.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">技术栈</h4>
                  <div className="flex flex-wrap gap-1">
                    {enrichResult.technologies.map((t: string, i: number) => (
                      <span key={i} className="inline-flex items-center h-[24px] px-2.5 text-[11px] font-medium bg-[#f2f2f7] text-[#1d1d1f] rounded-md">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {enrichResult.relevance_to_business && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">业务关联度</h4>
                  <p className="text-sm text-[#1d1d1f] leading-relaxed">{enrichResult.relevance_to_business}</p>
                </div>
              )}
              {enrichResult.recent_news && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">近期动态</h4>
                  <p className="text-sm text-[#1d1d1f]">{enrichResult.recent_news}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrich loading overlay */}
      {enriching && !enrichResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
            <span className="text-sm text-[#1d1d1f]">AI 正在分析线索...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <LeadGenPageInner />
      </ErrorBoundary>
    </AppLayout>
  )
}
