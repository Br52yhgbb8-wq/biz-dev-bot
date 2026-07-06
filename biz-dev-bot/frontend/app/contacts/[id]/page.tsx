"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import {
  ArrowLeft, Building2, Briefcase, Mail, Phone, Linkedin,
  Edit2, Trash2, Plus, MessageSquare, PhoneCall,
  Calendar, UserPlus, Activity as ActivityIcon, X
} from "lucide-react"

const ACTIVITY_ICONS: Record<string, any> = {
  email: Mail, call: PhoneCall, meeting: Calendar, note: MessageSquare, linkedin: UserPlus,
}

const ACTIVITY_LABELS: Record<string, string> = {
  email: "邮件", call: "通话", meeting: "会议", note: "备注", linkedin: "LinkedIn",
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
]

interface Contact {
  id: string; name: string; company: string | null; title: string | null;
  email: string | null; phone: string | null; linkedin_url: string | null;
  source: string; tags: string[]; notes: string | null; created_at: string; updated_at: string
}

interface Activity {
  id: string; contact_id: string; pipeline_id: string | null; type: string;
  description: string | null; outcome: string | null; scheduled_at: string | null;
  completed_at: string | null; created_by: string | null; meta: any | null;
  created_at: string; updated_at: string
}

function ContactDetailInner() {
  const params = useParams()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editCompany, setEditCompany] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [actType, setActType] = useState("note")
  const [actDescription, setActDescription] = useState("")
  const [actOutcome, setActOutcome] = useState("")

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      api.contacts.get(id),
      api.activities.listByContact(id, { limit: 20 }),
    ]).then(([c, a]) => {
      setContact(c)
      setActivities(a.items)
      setActivityTotal(a.total)
      setEditName(c.name)
      setEditCompany(c.company || "")
      setEditTitle(c.title || "")
      setEditTags((c.tags || []).join(", "))
      setEditNotes(c.notes || "")
    }).catch(() => router.push("/contacts")).finally(() => setLoading(false))
  }, [params.id, router])

  async function handleSave() {
    if (!contact) return
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean)
    await api.contacts.update(contact.id, {
      name: editName, company: editCompany || null, title: editTitle || null, tags, notes: editNotes || null,
    })
    setContact({ ...contact, name: editName, company: editCompany, title: editTitle, tags, notes: editNotes })
    setEditing(false)
  }

  async function handleDelete() {
    if (!contact || !confirm("确定删除此联系人？")) return
    await api.contacts.delete(contact.id)
    router.push("/contacts")
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!contact || !actDescription.trim()) return
    const activity = await api.activities.create({
      contact_id: contact.id, type: actType, description: actDescription, outcome: actOutcome || undefined,
    })
    setActivities([activity, ...activities])
    setActivityTotal(activityTotal + 1)
    setShowActivityForm(false)
    setActType("note")
    setActDescription("")
    setActOutcome("")
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-[#86868b]">加载中...</div>
  )
  if (!contact) return null

  const avatarBg = AVATAR_COLORS[contact.name.length % AVATAR_COLORS.length]

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Back Link */}
      <button onClick={() => router.push("/contacts")}
        className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] bg-transparent border-none cursor-pointer mb-7 transition-colors hover:text-[#0071e3]">
        <ArrowLeft className="w-[18px] h-[18px]" /> 返回联系人
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8">
        {/* Left: Contact Info */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-7">
          {/* Header */}
          <div className="flex justify-between items-start mb-7">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-white shrink-0"
                style={{ background: avatarBg }}
              >
                {contact.name[0]}
              </div>
              {editing ? (
                <div className="space-y-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="姓名"
                    className="block w-[200px] h-[36px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
                  <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="公司"
                    className="block w-[200px] h-[36px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="职位"
                    className="block w-[200px] h-[36px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-[#1d1d1f]">{contact.name}</h2>
                  <p className="text-sm text-[#86868b] mt-1">
                    {[contact.company, contact.title].filter(Boolean).join(" · ") || "暂无信息"}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {editing ? (
                <>
                  <button onClick={handleSave}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]">保存</button>
                  <button onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">取消</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3 text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">
                    <Edit2 className="w-3 h-3" /> 编辑
                  </button>
                  <button onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3 text-sm font-medium text-red-500 border border-[#ff3b30] rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-50 bg-transparent">
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info Grid */}
          {!editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{contact.email || "暂无邮箱"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{contact.phone || "暂无电话"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{contact.company || "暂无公司"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-[#86868b] shrink-0" />
                <span>{contact.title || "暂无职位"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm col-span-1 sm:col-span-2">
                <Linkedin className="w-4 h-4 text-[#86868b] shrink-0" />
                {contact.linkedin_url ? (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:underline truncate">
                    {contact.linkedin_url}
                  </a>
                ) : (
                  <span className="text-[#86868b]">暂无 LinkedIn</span>
                )}
              </div>
            </div>
          )}

          {/* Tags & Source */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-[#86868b]">来源: {contact.source}</span>
            {contact.tags?.map((t) => (
              <span key={t} className="inline-flex items-center h-[22px] px-[8px] text-[11px] font-medium bg-[rgba(0,122,255,0.1)] text-[#007AFF] rounded-md">{t}</span>
            ))}
          </div>

          {/* Edit tags/notes */}
          {editing && (
            <div className="space-y-2 mb-4">
              <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="标签（逗号分隔）"
                className="block w-full h-[36px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="备注"
                className="block w-full min-h-[60px] px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
            </div>
          )}

          {/* Notes */}
          {!editing && contact.notes && (
            <div>
              <p className="text-xs font-medium text-[#86868b] mb-1">备注</p>
              <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Activity Timeline */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-[#86868b]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">活动时间线</h3>
            </div>
            <button onClick={() => setShowActivityForm(!showActivityForm)}
              className="inline-flex items-center gap-1 h-[32px] px-3 text-sm font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(0,122,255,0.15)]">
              {showActivityForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showActivityForm ? "取消" : "添加活动"}
            </button>
          </div>

          {/* Activity Form */}
          {showActivityForm && (
            <div className="px-4 pb-4 border-b border-[#E5E5EA]">
              <form onSubmit={handleAddActivity} className="space-y-3">
                <div className="flex gap-2">
                  {["note", "email", "call", "meeting", "linkedin"].map((t) => (
                    <button key={t} type="button"
                      onClick={() => setActType(t)}
                      className={`h-[30px] px-3 text-xs font-medium border rounded-lg cursor-pointer transition-all duration-200 ${
                        actType === t
                          ? "bg-[#007AFF] text-white border-[#007AFF]"
                          : "bg-transparent text-[#1d1d1f] border-[#E5E5EA] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      {ACTIVITY_LABELS[t] || t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={actDescription} onChange={(e) => setActDescription(e.target.value)}
                  placeholder="描述活动内容..."
                  required
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b] resize-none"
                />
                <input value={actOutcome} onChange={(e) => setActOutcome(e.target.value)} placeholder="结果（可选）"
                  className="w-full h-[36px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
                <button type="submit" disabled={!actDescription.trim()}
                  className="inline-flex items-center gap-1.5 h-[34px] px-4 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
                  添加
                </button>
              </form>
            </div>
          )}

          {/* Activity List */}
          <div className="divide-y divide-[#f2f2f7]">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#86868b]">暂无活动记录</div>
            ) : activities.map((a) => {
              const Icon = ACTIVITY_ICONS[a.type] || ActivityIcon
              return (
                <div key={a.id} className="px-4 py-3 hover:bg-[#f9f9fb]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-[#f2f2f7] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#86868b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-[#86868b]">
                          {ACTIVITY_LABELS[a.type] || a.type}
                        </span>
                        <span className="text-xs text-[#86868b]">
                          {new Date(a.created_at).toLocaleDateString("zh-CN", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-sm mt-1 text-[#1d1d1f] whitespace-pre-wrap">{a.description}</p>
                      )}
                      {a.outcome && (
                        <p className="text-xs text-[#86868b] mt-1 italic">结果: {a.outcome}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {activityTotal > activities.length && (
            <div className="p-3 text-center">
              <button className="text-xs text-[#007AFF] bg-transparent border-none cursor-pointer hover:underline">
                查看全部 {activityTotal} 条活动
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ContactDetailPage() {
  return (
    <AppLayout>
      <ContactDetailInner />
    </AppLayout>
  )
}
