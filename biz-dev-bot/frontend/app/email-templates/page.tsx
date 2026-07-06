"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { Pagination } from "@/components/pagination"
import { TableSkeleton } from "@/components/table-skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorBoundary } from "@/components/error-boundary"
import { Plus, Edit2, Trash2, Eye, X, Save } from "lucide-react"

function TemplatesPageInner() {
  const [templates, setTemplates] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [previewVars, setPreviewVars] = useState("")
  const [preview, setPreview] = useState<any>(null)

  const load = useCallback(async (newSkip?: number) => {
    setLoading(true)
    try {
      const s = newSkip ?? skip
      const res = await api.emailTemplates.list({ skip: s, limit })
      setTemplates(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function resetForm() { setName(""); setSubject(""); setBodyText(""); setBodyHtml(""); setPreviewVars(""); setPreview(null) }

  async function handleCreate() {
    if (!name.trim() || !subject.trim() || !bodyText.trim()) return
    await api.emailTemplates.create({ name, subject, body_text: bodyText, body_html: bodyHtml || undefined })
    setShowCreate(false)
    resetForm()
    load()
  }

  async function handleUpdate(id: string) {
    if (!name.trim() || !subject.trim() || !bodyText.trim()) return
    await api.emailTemplates.update(id, { name, subject, body_text: bodyText, body_html: bodyHtml || undefined })
    setEditingId(null)
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此模板？")) return
    await api.emailTemplates.delete(id)
      toast({ title: "模板已删除", variant: "info" })
      load()
  }

  function startEdit(t: any) {
    setEditingId(t.id)
    setName(t.name); setSubject(t.subject); setBodyText(t.body_text); setBodyHtml(t.body_html || "")
    setPreviewId(t.id)
  }

  async function handlePreview(id: string) {
    try {
      const vars: Record<string, string> = {}
      if (previewVars.trim()) {
        previewVars.split(",").forEach((v) => {
          const [k, ...rest] = v.trim().split("=")
          if (k) vars[k.trim()] = rest.join("=").trim()
        })
      }
      const result = await api.emailTemplates.render(id, vars)
      setPreview(result)
      setPreviewId(id)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">邮件模板</h1>
        <button onClick={() => { setShowCreate(!showCreate); resetForm() }}
          className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border border-[#007AFF] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] hover:border-[#0071e3]">
          <Plus className="w-4 h-4" /> 新建模板
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA]">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{editingId ? "编辑模板" : "新建模板"}</h3>
            <button onClick={() => { setShowCreate(false); setEditingId(null); resetForm() }}
              className="w-8 h-8 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <input placeholder="模板名称" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="主题行（使用 {{variable}} 做变量替换）" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <div>
              <label className="text-xs text-[#86868b] mb-1 block">正文（纯文本）:</label>
              <textarea placeholder="Hello {{name}},\n\n感谢您的关注..." value={bodyText} onChange={(e) => setBodyText(e.target.value)}
                className="w-full min-h-[120px] px-3.5 py-2.5 text-sm font-mono border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
            </div>
            <input placeholder="HTML 正文（可选）" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)}
              className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <div className="flex gap-2">
              {editingId ? (
                <button onClick={() => handleUpdate(editingId)}
                  className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]">
                  <Save className="w-4 h-4" /> 保存
                </button>
              ) : (
                <button onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]">创建</button>
              )}
              <button onClick={() => { setShowCreate(false); setEditingId(null); resetForm() }}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        {loading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : templates.length === 0 ? (
          <EmptyState title="暂无邮件模板" description="创建邮件模板并使用 {{variable}} 做变量替换，让邮件发送更高效。" />
        ) : (
          <div className="divide-y divide-[#f2f2f7]">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f9f9fb]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] truncate">{t.name}</p>
                  <p className="text-xs text-[#86868b] truncate mt-0.5">{t.subject}</p>
                  <p className="text-[10px] text-[#c7c7cc] mt-1">
                    创建于 {new Date(t.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button onClick={() => handlePreview(t.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border-none rounded cursor-pointer transition-all hover:bg-[rgba(0,122,255,0.15)]">
                    <Eye className="w-3 h-3" /> 预览
                  </button>
                  <button onClick={() => startEdit(t)}
                    className="w-7 h-7 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="w-7 h-7 inline-flex items-center justify-center text-red-500 border border-[#ff3b30] rounded cursor-pointer transition-all hover:bg-red-50 bg-transparent">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6"><Pagination skip={skip} limit={limit} total={total} onPageChange={(s) => { setSkip(s); load(s) }} /></div>

      {/* Preview Panel */}
      {preview && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA]">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">预览</h3>
            <div className="flex items-center gap-2">
              <input placeholder="变量: name=John, company=Acme" value={previewVars} onChange={(e) => setPreviewVars(e.target.value)}
                className="w-[200px] h-[32px] px-3 text-xs border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]" />
              <button onClick={() => handlePreview(previewId!)}
                className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                <Eye className="w-3 h-3" /> 刷新
              </button>
              <button onClick={() => setPreview(null)}
                className="w-7 h-7 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-[#86868b]">主题:</p>
              <p className="text-sm font-medium text-[#1d1d1f]">{preview.subject}</p>
            </div>
            <div>
              <p className="text-xs text-[#86868b] mb-1">正文:</p>
              <pre className="text-sm text-[#1d1d1f] whitespace-pre-wrap bg-[#f9f9fb] rounded-md p-3">{preview.body_text}</pre>
            </div>
            {preview.body_html && (
              <div>
                <p className="text-xs text-[#86868b] mb-1">HTML 预览:</p>
                <div className="border border-[#E5E5EA] rounded-md p-3 text-sm" dangerouslySetInnerHTML={{ __html: preview.body_html }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <AppLayout>
      <TemplatesPageInner />
    </AppLayout>
  )
}
