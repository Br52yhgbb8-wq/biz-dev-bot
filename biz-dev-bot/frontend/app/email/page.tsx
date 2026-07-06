"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/table-skeleton"
import { EmptyState } from "@/components/empty-state"
import { Send, RefreshCw, Mail, Paperclip, Upload, X, FileText, Eye, Check, ChevronLeft } from "lucide-react"

function extractVariables(text: string): string[] {
  const vars = new Set<string>()
  const re = /\{\{(\w+)\}\}/g
  let m
  while ((m = re.exec(text)) !== null) {
    vars.add(m[1])
  }
  return Array.from(vars)
}

function EmailPageInner() {
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [templateStep, setTemplateStep] = useState<"list" | "vars" | "preview">("list")
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [templateVarsList, setTemplateVarsList] = useState<string[]>([])

  async function loadThreads() {
    setLoading(true)
    setError("")
    try {
      const data = await api.request<any[]>("/api/email/threads")
      setThreads(data)
    } catch (err: any) {
      if (err.message?.includes("Not authenticated")) {
        setError("Gmail 未连接。请前往设置页面配置。")
      } else {
        setError(err.message || "加载邮件失败")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadThreads() }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      await api.request("/api/email/send", {
        method: "POST",
        body: JSON.stringify({
          to: to.split(",").map((s: string) => s.trim()),
          subject,
          body_text: body,
        }),
      })
      toast({ title: "邮件已发送", variant: "success" })
      setShowCompose(false)
      setTo("")
      setSubject("")
      setBody("")
      setFiles([])
      resetTemplatePicker()
    } catch (err: any) {
      toast({ title: "发送失败", description: err.message || "请检查 Gmail 连接", variant: "error" })
    } finally {
      setSending(false)
    }
  }

  function resetTemplatePicker() {
    setShowTemplatePicker(false)
    setSelectedTemplate(null)
    setTemplateStep("list")
    setTemplateVariables({})
    setPreviewResult(null)
    setTemplateVarsList([])
  }

  async function openTemplatePicker() {
    setShowTemplatePicker(true)
    setTemplateStep("list")
    setSelectedTemplate(null)
    setTemplateVariables({})
    setPreviewResult(null)
    setTemplateVarsList([])
    setLoadingTemplates(true)
    try {
      const data = await api.emailTemplates.list()
      setTemplates(data.items || [])
    } catch (err: any) {
      toast({ title: "加载模板失败", description: err.message, variant: "error" })
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  function handleTemplateSelect(tpl: any) {
    setSelectedTemplate(tpl)
    const vars = extractVariables(tpl.subject + " " + (tpl.body_text || ""))
    setTemplateVarsList(vars)
    const initial: Record<string, string> = {}
    vars.forEach((v) => { initial[v] = "" })
    setTemplateVariables(initial)
    setTemplateStep(vars.length > 0 ? "vars" : "preview")
    if (vars.length === 0) {
      // No variables to fill, show preview directly
      setPreviewResult({ subject: tpl.subject, body_text: tpl.body_text, body_html: tpl.body_html })
    }
  }

  async function handlePreview() {
    if (!selectedTemplate) return
    try {
      const result = await api.emailTemplates.render(selectedTemplate.id, templateVariables)
      setPreviewResult(result)
      setTemplateStep("preview")
    } catch (err: any) {
      toast({ title: "预览失败", description: err.message, variant: "error" })
    }
  }

  function handleApplyTemplate() {
    if (!previewResult) return
    setSubject(previewResult.subject || "")
    setBody(previewResult.body_text || "")
    resetTemplatePicker()
    toast({ title: "模板已应用", variant: "success" })
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">邮件</h1>
        <div className="flex gap-2.5">
          <button onClick={loadThreads} disabled={loading}
            className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6] bg-transparent">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> 刷新
          </button>
          <button onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-white bg-[#007AFF] border border-[#007AFF] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]">
            <Send className="w-4 h-4" /> 写邮件
          </button>
        </div>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 mb-5">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">新邮件</h3>
          <form onSubmit={handleSend} className="space-y-3">
            {/* Template + File Upload Row */}
            <div>
              <input type="file" multiple id="email-file-input" className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || [])
                  setFiles((prev) => [...prev, ...newFiles])
                  e.target.value = ""
                }} />
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => document.getElementById("email-file-input")?.click()}
                  className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                  <Upload className="w-3 h-3" /> 添加附件
                </button>
                <button type="button" onClick={openTemplatePicker}
                  className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent">
                  <FileText className="w-3 h-3" /> 使用模板
                </button>
                {files.length > 0 && (
                  <span className="text-xs text-[#86868b]">{files.length} 个文件</span>
                )}
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#f2f2f7] text-[#86868b] rounded-md">
                      <Paperclip className="w-3 h-3" />
                      {f.name}
                      <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-[#86868b] hover:text-[#1d1d1f] bg-transparent border-none cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <input placeholder="收件人（逗号分隔）" value={to} onChange={(e) => setTo(e.target.value)} required
              className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)] placeholder:text-[#86868b]" />
            <input placeholder="主题" value={subject} onChange={(e) => setSubject(e.target.value)} required
              className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <textarea placeholder="邮件正文" value={body} onChange={(e) => setBody(e.target.value)} required
              className="w-full min-h-[120px] px-3.5 py-2.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b] resize-none" />
            <div className="flex gap-2">
              <button type="submit" disabled={sending}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? "发送中..." : "发送"}
              </button>
              <button type="button" onClick={() => setShowCompose(false)}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => resetTemplatePicker()}>
          <div className="bg-white rounded-xl shadow-xl max-w-[520px] w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E5EA]">
              {templateStep !== "list" && (
                <button type="button" onClick={() => setTemplateStep("list")}
                  className="bg-transparent border-none cursor-pointer text-[#86868b] hover:text-[#1d1d1f] p-0.5">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <FileText className="w-4 h-4 text-[#007AFF]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                {templateStep === "list" ? "选择邮件模板" : templateStep === "vars" ? "填写变量" : "预览"}
              </h3>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-5">
              {/* Step: Template List */}
              {templateStep === "list" && (
                loadingTemplates ? (
                  <TableSkeleton rows={3} columns={1} />
                ) : templates.length === 0 ? (
                  <EmptyState title="暂无模板" description="请先在模板页面创建邮件模板。" />
                ) : (
                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => handleTemplateSelect(tpl)}
                        className="w-full text-left p-3.5 rounded-lg border border-[#E5E5EA] cursor-pointer transition-all hover:border-[#007AFF] hover:bg-[rgba(0,122,255,0.03)] bg-white">
                        <p className="text-sm font-medium text-[#1d1d1f]">{tpl.name}</p>
                        <p className="text-xs text-[#86868b] mt-1 truncate">{tpl.subject}</p>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* Step: Fill Variables */}
              {templateStep === "vars" && selectedTemplate && (
                <div className="space-y-4">
                  {templateVarsList.map((v) => (
                    <div key={v}>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">{v}</label>
                      <input value={templateVariables[v] || ""} onChange={(e) => setTemplateVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                        className="w-full h-[38px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
                    </div>
                  ))}
                  <button type="button" onClick={handlePreview}
                    disabled={templateVarsList.some((v) => !templateVariables[v])}
                    className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
                    <Eye className="w-4 h-4" /> 预览
                  </button>
                </div>
              )}

              {/* Step: Preview */}
              {templateStep === "preview" && previewResult && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#86868b] mb-1">主题</p>
                    <p className="text-sm text-[#1d1d1f] bg-[#f9f9fb] p-2.5 rounded-lg">{previewResult.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#86868b] mb-1">正文</p>
                    <p className="text-sm text-[#1d1d1f] bg-[#f9f9fb] p-2.5 rounded-lg whitespace-pre-wrap">{previewResult.body_text}</p>
                  </div>
                  <button type="button" onClick={handleApplyTemplate}
                    className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all hover:bg-[#0071e3]">
                    <Check className="w-4 h-4" /> 应用模板
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-white border border-[#ff3b30] rounded-lg p-4 mb-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Thread List */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : threads.length === 0 ? (
          <EmptyState title="暂无邮件" description="连接 Gmail 后，您的邮件将自动同步到这里。" />
        ) : (
          <div className="divide-y divide-[#f2f2f7]">
            {threads.map((t: any) => (
              <div key={t.id} className="px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#f9f9fb]">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${!t.is_read ? "text-[#007AFF]" : "text-[#1d1d1f]"}`}>
                    {t.subject || "(无主题)"}
                  </p>
                  <span className="text-xs text-[#86868b] shrink-0 ml-2">{t.date}</span>
                </div>
                <p className="text-xs text-[#86868b] mt-1">{t.from_}</p>
                <p className="text-xs text-[#86868b] truncate mt-1">{t.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EmailPage() {
  return (
    <AppLayout>
      <EmailPageInner />
    </AppLayout>
  )
}
