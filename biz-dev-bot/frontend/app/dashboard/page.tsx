"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import {
  GitBranch, DollarSign, TrendingUp, Activity, Plus,
  ArrowRight, Users, Send, BarChart3, PieChart, Mail,
  Cog, X
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart as RePieChart,
  Pie, Cell
} from "recharts"

const STAGE_LABELS: Record<string, string> = {
  discovery: "发现期", proposal: "方案期", negotiation: "谈判期",
  closed_won: "已赢单", closed_lost: "已输单",
}

const STAGE_COLORS = ["#007AFF", "#ff9500", "#af52de", "#34c759", "#ff3b30"]

function DashboardPageInner() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null)
  const [dismissSetup, setDismissSetup] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check setup status
    Promise.all([
      api.request<any>("/api/email/status").catch(() => ({ connected: false })),
      api.request<any>("/api/linkedin/status").catch(() => ({ browser_running: false, logged_in: false })),
    ]).then(([gmail, linkedin]) => {
      const needsSetup = !gmail.connected && !(linkedin.browser_running && linkedin.logged_in)
      setSetupNeeded(needsSetup)
    }).catch(() => setSetupNeeded(false))

    Promise.all([
      api.dashboard.overview(),
      api.contacts.list({ limit: 5 }),
    ]).then(([d, c]) => {
      setData(d)
      setContacts(c.items)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 pb-16">
        <div className="flex items-center justify-between mb-9">
          <Skeleton className="h-9 w-[120px]" />
          <Skeleton className="h-[38px] w-[130px] rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-9">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E5EA] rounded-lg p-5 flex items-center gap-4">
              <Skeleton className="w-11 h-11 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-9">
          {Array.from({length: 2}).map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E5EA] rounded-lg p-5">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const pipeline = data?.pipeline || { total_deals: 0, total_value: 0, win_rate: 0, stages: [] }
  const activityTrend = data?.activity_trend || { trend: [], total: 0 }
  const campaign = data?.campaign || { total: 0, running: 0, completed: 0, draft: 0, total_sent: 0 }

  const stageChartData = pipeline.stages.map((s: any) => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    count: s.count || 0,
    value: s.total_value || 0,
  }))

  const pieChartData = stageChartData.map((s: any) => ({
    name: s.name,
    value: s.count || 0,
  }))

  const trendChartData = activityTrend.trend.map((t: any) => ({
    date: t.date.slice(5),
    count: t.count || 0,
  }))

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-9">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">仪表盘</h1>
        <button
          onClick={() => router.push("/pipelines")}
          className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-[15px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] active:bg-[#0056b3]"
        >
          <Plus className="w-4 h-4" /> 新建商机
        </button>
      </div>

      {/* Setup Banner */}
      {setupNeeded && !dismissSetup && (
        <div className="bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(88,86,214,0.06))] border border-[rgba(0,122,255,0.15)] rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(0,122,255,0.1)] flex items-center justify-center shrink-0">
              <Cog className="w-[18px] h-[18px] text-[#007AFF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">完成初始配置</p>
              <p className="text-[12px] text-[#86868b]">连接 Gmail 和 LinkedIn 以启用全部功能</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/setup")}
              className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[12px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
            >
              打开设置向导 <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDismissSetup(true)}
              className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[rgba(0,0,0,0.05)] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-9">
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="w-11 h-11 rounded-lg bg-[rgba(0,122,255,0.1)] flex items-center justify-center shrink-0">
            <GitBranch className="w-[18px] h-[18px] text-[#007AFF]" />
          </div>
          <div>
            <p className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.5px]">{pipeline.total_deals}</p>
            <p className="text-[13px] font-medium text-[#86868b]">总商机数</p>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="w-11 h-11 rounded-lg bg-[rgba(52,199,89,0.1)] flex items-center justify-center shrink-0">
            <DollarSign className="w-[18px] h-[18px] text-[#34c759]" />
          </div>
          <div>
            <p className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.5px]">
              ¥{(pipeline.total_value || 0).toLocaleString()}
            </p>
            <p className="text-[13px] font-medium text-[#86868b]">管道总额</p>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="w-11 h-11 rounded-lg bg-[rgba(255,149,0,0.1)] flex items-center justify-center shrink-0">
            <TrendingUp className="w-[18px] h-[18px] text-[#ff9500]" />
          </div>
          <div>
            <p className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.5px]">{pipeline.win_rate}%</p>
            <p className="text-[13px] font-medium text-[#86868b]">赢单率</p>
          </div>
        </div>
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="w-11 h-11 rounded-lg bg-[rgba(90,200,250,0.1)] flex items-center justify-center shrink-0">
            <Activity className="w-[18px] h-[18px] text-[#5ac8fa]" />
          </div>
          <div>
            <p className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.5px]">{activityTrend.total}</p>
            <p className="text-[13px] font-medium text-[#86868b]">本月活动</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-9">
        {/* Bar Chart */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-[#86868b]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">各阶段商机数</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#86868b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#86868b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: "13px", background: "rgba(255,255,255,0.95)", border: "1px solid #E5E5EA", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="count" fill="#007AFF" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-4 h-4 text-[#86868b]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">商机分布</h3>
          </div>
          <div className="h-[200px] flex items-center justify-center">
            {pieChartData.some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value"
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieChartData.map((_: any, i: number) => (
                      <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[#86868b]">暂无商机数据</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Trend */}
      {trendChartData.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-9">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-[#86868b]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">活动趋势（近30天）</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#86868b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#86868b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: "13px", background: "rgba(255,255,255,0.95)", border: "1px solid #E5E5EA", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="count" stroke="#007AFF" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#007AFF" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Campaign Stats */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <Send className="w-4 h-4 text-[#86868b]" />
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">营销活动</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "总数", value: campaign.total },
              { label: "运行中", value: campaign.running, color: "#34c759" },
              { label: "已完成", value: campaign.completed },
              { label: "已发送邮件", value: campaign.total_sent },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-[#86868b]">{item.label}</span>
                <span className="font-medium text-[#1d1d1f]" style={item.color ? { color: item.color } : undefined}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">最近联系人</h3>
            <button
              onClick={() => router.push("/contacts")}
              className="text-[13px] text-[#007AFF] flex items-center gap-1 font-medium bg-transparent border-none cursor-pointer"
            >
              全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-[#86868b]">暂无联系人</p>
            ) : contacts.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[#f9f9fb]"
                onClick={() => router.push(`/contacts/${c.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f]">{c.name}</p>
                  <p className="text-[12px] text-[#86868b]">
                    {[c.company, c.title].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
                <span className="inline-flex items-center h-[22px] px-[8px] text-[11px] font-medium bg-[#f2f2f7] text-[#86868b] rounded-md">
                  {c.source}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-5">快捷操作</h3>
          <div className="space-y-2">
            {[
              { label: "管理联系人", icon: Users, path: "/contacts" },
              { label: "查看管道", icon: GitBranch, path: "/pipelines" },
              { label: "营销活动", icon: Send, path: "/campaigns" },
              { label: "邮件收件箱", icon: Mail, path: "/email" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="w-full inline-flex items-center gap-2 h-[38px] px-[14px] text-sm font-medium text-[#1d1d1f] bg-transparent border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardPageInner />
    </AppLayout>
  )
}
