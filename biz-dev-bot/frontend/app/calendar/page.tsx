"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, Mail, PhoneCall, MessageSquare, CalendarDays, UserPlus, Plus, Trash2, Loader2 } from "lucide-react"

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]
const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]

const ACTIVITY_STYLES: Record<string, string> = {
  email: "bg-[rgba(0,122,255,0.1)] text-[#007AFF]",
  call: "bg-[rgba(52,199,89,0.1)] text-[#34c759]",
  meeting: "bg-[rgba(175,82,222,0.1)] text-[#af52de]",
  note: "bg-[rgba(255,149,0,0.1)] text-[#ff9500]",
  linkedin: "bg-[rgba(90,200,250,0.1)] text-[#5ac8fa]",
}

const ACTIVITY_TYPES = [
  { key: "email", label: "邮件" },
  { key: "call", label: "通话" },
  { key: "meeting", label: "会议" },
  { key: "note", label: "备注" },
  { key: "linkedin", label: "LinkedIn" },
]

const DOT_COLORS: Record<string, string> = {
  email: "bg-[#007AFF]", call: "bg-[#34c759]", meeting: "bg-[#af52de]",
  note: "bg-[#ff9500]", linkedin: "bg-[#5ac8fa]",
}

function CalendarPageInner() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreateActivity, setShowCreateActivity] = useState(false)
  const [newActivityType, setNewActivityType] = useState("note")
  const [newActivityDesc, setNewActivityDesc] = useState("")
  const [contacts, setContacts] = useState<any[]>([])
  const [newActivityContactId, setNewActivityContactId] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.activities.calendar(year, month, typeFilter || undefined)
      setActivities(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [year, month, typeFilter])

  useEffect(() => { load() }, [load])

  const loadContacts = useCallback(async () => {
    try {
      const r = await api.contacts.list({ limit: 200 })
      setContacts(r.items)
    } catch (e) { /* ignore */ }
  }, [])
  useEffect(() => { loadContacts() }, [loadContacts])

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7

  const days: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const activitiesByDay: Record<number, any[]> = {}
  const today = new Date()
  activities.forEach((a) => {
    const d = new Date(a.created_at || a.scheduled_at)
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const day = d.getDate()
      if (!activitiesByDay[day]) activitiesByDay[day] = []
      activitiesByDay[day].push(a)
    }
  })

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1)
    setSelectedDay(null)
  }

  const selectedActivities = selectedDay ? activitiesByDay[selectedDay] || [] : []

  async function handleCreateActivity() {
    if (!selectedDay || !newActivityDesc.trim()) return
    if (!newActivityContactId) {
      toast({ title: "请选择联系人", variant: "error" })
      return
    }
    setCreating(true)
    try {
      const scheduledAt = new Date(year, month - 1, selectedDay).toISOString()
      await api.activities.create({
        contact_id: newActivityContactId,
        type: newActivityType,
        description: newActivityDesc,
        completed_at: scheduledAt,
      })
      toast({ title: "活动已创建", variant: "success" })
      setShowCreateActivity(false)
      setNewActivityDesc("")
      setNewActivityType("note")
      setNewActivityContactId("")
      await load()
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message, variant: "error" })
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteActivity(activityId: string) {
    setDeletingId(activityId)
    try {
      await api.activities.delete(activityId)
      toast({ title: "活动已删除", variant: "success" })
      await load()
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message, variant: "error" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">活动日历</h1>
        <div className="flex gap-2">
          {[
            { key: "", label: "全部" },
            { key: "email", label: "邮件" },
            { key: "call", label: "通话" },
            { key: "meeting", label: "会议" },
            { key: "note", label: "备注" },
            { key: "linkedin", label: "LinkedIn" },
          ].map((t) => (
            <button key={t.key}
              onClick={() => setTypeFilter(typeFilter === t.key ? "" : t.key)}
              className={`inline-flex items-center h-[32px] px-[14px] text-[13px] font-medium rounded-full border transition-all duration-200 cursor-pointer ${
                typeFilter === t.key
                  ? "bg-[#007AFF] border-[#007AFF] text-white"
                  : "bg-transparent border-[#E5E5EA] text-[#1d1d1f] hover:bg-[#f5f5f7]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[40%_1px_60%] gap-0">
        {/* Calendar Grid */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 lg:rounded-r-none lg:border-r-0">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth}
              className="w-8 h-8 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-[#1d1d1f]">{MONTHS[month - 1]} {year}</h2>
            <button onClick={nextMonth}
              className="w-8 h-8 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[#86868b] py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="h-[80px]" />
              const dayActivities = activitiesByDay[day] || []
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
              const isSelected = selectedDay === day

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`h-[80px] rounded-md border p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "border-[#007AFF] bg-[rgba(0,122,255,0.05)]" : "border-transparent hover:bg-[#f9f9fb]"
                  } ${isToday ? "ring-2 ring-[rgba(0,122,255,0.3)]" : ""}`}
                >
                  <div className={`text-xs font-medium mb-0.5 ${isSelected || isToday ? "text-[#007AFF]" : "text-[#1d1d1f]"}`}>{day}</div>
                  {dayActivities.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {dayActivities.slice(0, 3).map((a) => (
                        <div key={a.id} className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[a.type] || "bg-[#c7c7cc]"}`} />
                      ))}
                      {dayActivities.length > 3 && (
                        <span className="text-[9px] text-[#86868b] ml-0.5">+{dayActivities.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-[#E5E5EA] mx-7" />

        {/* Day Details */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 lg:rounded-l-none lg:border-l-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
              {selectedDay ? `${MONTHS[month - 1]} ${selectedDay}日，${year}` : "选择日期查看活动"}
            </h3>
            {selectedDay && !showCreateActivity && (
              <button onClick={() => setShowCreateActivity(true)}
                className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium text-[#007AFF] border border-[#007AFF] rounded-lg cursor-pointer transition-all hover:bg-[rgba(0,122,255,0.05)] bg-transparent">
                <Plus className="w-3 h-3" /> 添加活动
              </button>
            )}
          </div>

          {/* Create Activity Form */}
          {showCreateActivity && (
            <div className="bg-[#f9f9fb] border border-[#E5E5EA] rounded-lg p-4 mb-4 space-y-3">
              {/* Contact Select */}
              <div>
                <p className="text-xs font-medium text-[#86868b] mb-1.5">联系人 *</p>
                <select value={newActivityContactId} onChange={(e) => setNewActivityContactId(e.target.value)}
                  className="w-full h-[38px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none bg-white transition-all focus:border-[#007AFF]">
                  <option value="">选择联系人...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                  ))}
                </select>
              </div>
              {/* Type Select */}
              <div>
                <p className="text-xs font-medium text-[#86868b] mb-1.5">类型</p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPES.map((t) => (
                    <button key={t.key} type="button" onClick={() => setNewActivityType(t.key)}
                      className={`inline-flex items-center h-[30px] px-3 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                        newActivityType === t.key
                          ? "bg-[#007AFF] border-[#007AFF] text-white"
                          : "bg-white border-[#E5E5EA] text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Description */}
              <div>
                <p className="text-xs font-medium text-[#86868b] mb-1.5">描述</p>
                <textarea value={newActivityDesc} onChange={(e) => setNewActivityDesc(e.target.value)} placeholder="活动描述..."
                  className="w-full min-h-[60px] px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleCreateActivity} disabled={creating || !newActivityDesc.trim() || !newActivityContactId}
                  className="inline-flex items-center gap-1.5 h-[34px] px-4 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {creating ? "创建中..." : "创建"}
                </button>
                <button onClick={() => { setShowCreateActivity(false); setNewActivityDesc(""); setNewActivityContactId("") }}
                  className="inline-flex items-center h-[34px] px-4 text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                  取消
                </button>
              </div>
            </div>
          )}

          {!selectedDay ? (
            <p className="text-sm text-[#86868b]">点击日历中的日期查看当天活动</p>
          ) : selectedActivities.length === 0 && !showCreateActivity ? (
            <p className="text-sm text-[#86868b]">当天无活动，点击"添加活动"创建</p>
          ) : (
            <div className="space-y-2">
              {selectedActivities.map((a) => (
                <div key={a.id} className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#f9f9fb]">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md shrink-0 ${ACTIVITY_STYLES[a.type] || "bg-[#f2f2f7] text-[#86868b]"}`}>
                    {ACTIVITY_TYPES.find((t) => t.key === a.type)?.label || a.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1d1d1f]">{a.description || "（无描述）"}</p>
                    <p className="text-xs text-[#86868b] mt-0.5">
                      {new Date(a.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleDeleteActivity(a.id)} disabled={deletingId === a.id}
                    className="shrink-0 w-7 h-7 inline-flex items-center justify-center text-[#86868b] opacity-0 group-hover:opacity-100 hover:text-[#ff3b30] bg-transparent border-none rounded-md cursor-pointer transition-all hover:bg-[rgba(255,59,48,0.08)]">
                    {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  {a.outcome && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-[#f2f2f7] text-[#86868b] rounded-md shrink-0">{a.outcome}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <AppLayout>
      <CalendarPageInner />
    </AppLayout>
  )
}
