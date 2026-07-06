"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/table-skeleton"
import { EmptyState } from "@/components/empty-state"
import { Plus, Search, Mail, Building2, Briefcase, ChevronLeft, ChevronRight, Filter, Upload, Download, X, Check, AlertTriangle, Tags, Trash2, Square, CheckSquare } from "lucide-react"

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  email: string | null
  source: string
  tags: string[]
  created_at: string
}

const SOURCE_OPTIONS = ["manual", "linkedin", "import"]
const PAGE_SIZE = 15

function ContactsPageInner() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [tag, setTag] = useState("")
  const [source, setSource] = useState("")
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newTags, setNewTags] = useState("")
  const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showBatchTag, setShowBatchTag] = useState(false)
  const [batchTagInput, setBatchTagInput] = useState("")
  const [batchTagAction, setBatchTagAction] = useState<"add" | "remove">("add")
  const [batchResult, setBatchResult] = useState<any>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

    const load = useCallback(async (params?: { search?: string; tag?: string; source?: string; skip?: number }) => {
    setLoading(true)
    try {
      const res = await api.contacts.list({
        search: params?.search || undefined,
        tag: params?.tag || undefined,
        source: params?.source || undefined,
        skip: params?.skip ?? skip,
        limit: PAGE_SIZE,
      })
      setContacts(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }

  async function handleBatchTag() {
    if (!batchTagInput.trim() || selectedIds.size === 0) return
    const tags = batchTagInput.split(",").map((t) => t.trim()).filter(Boolean)
    try {
      const result = await api.contacts.batchTag({
        contact_ids: Array.from(selectedIds),
        tags,
        action: batchTagAction,
      })
      toast({ title: "标签已更新", description: `${result.count} 个联系人已更新`, variant: "success" })
      setBatchResult(result)
      setShowBatchTag(false)
      setBatchTagInput("")
      setSelectedIds(new Set())
      load()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除 ${selectedIds.size} 个联系人？此操作不可撤销。`)) return
    try {
      const result = await api.contacts.batchDelete(Array.from(selectedIds))
      toast({ title: "已删除", description: `${result.count} 个联系人已删除`, variant: "info" })
      setBatchResult(result)
      setSelectedIds(new Set())
      load()
    } catch (e) {
      console.error(e)
      toast({ title: "删除失败", variant: "error" })
  }
  }

  async function handleBatchExport() {
    if (selectedIds.size === 0) return
    try {
      const blob = await api.contacts.batchExportCsv(Array.from(selectedIds))
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "contacts-selected.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  function toggleSelectMode() {
    setSelectMode(!selectMode)
    setSelectedIds(new Set())
  }



  function handleSearch() {
    setSkip(0)
    load({ search, tag, source, skip: 0 })
  }

  function handleClearFilters() {
    setSearch("")
    setTag("")
    setSource("")
    setSkip(0)
    load({ search: "", tag: "", source: "", skip: 0 })
  }

  function handlePageChange(newSkip: number) {
    setSkip(newSkip)
    load({ search, tag, source, skip: newSkip })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean)
    try {
      await api.contacts.create({
        name: newName,
        company: newCompany || undefined,
        title: newTitle || undefined,
        email: newEmail || undefined,
        tags,
      })
      toast({ title: "联系人已创建", variant: "success" })
      setShowCreate(false)
      setNewName("")
      setNewCompany("")
      setNewTitle("")
      setNewEmail("")
      setNewTags("")
      setSkip(0)
      load({ skip: 0 })
    } catch (e) {
      console.error(e)
    }
  }

  const hasFilters = search || tag || source

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">联系人</h1>
        <div className="flex items-center gap-2.5">
                    <button
            onClick={() => toggleSelectMode()}
            className={`inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium rounded-lg border transition-all duration-200 cursor-pointer ${selectMode ? "border-[#007AFF] text-[#007AFF] bg-[rgba(0,122,255,0.08)]" : "border-[#E5E5EA] text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"}`}
          >
            {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} 多选
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium rounded-lg border transition-all duration-200 cursor-pointer ${hasFilters ? "border-[#007AFF] text-[#007AFF]" : "border-[#E5E5EA] text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"}`}
          >
            <Filter className="w-4 h-4" /> 筛选
          </button>
          <button
            onClick={() => document.getElementById("csv-input")?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"
          >
            <Upload className="w-4 h-4" /> 导入
          </button>
          <input id="csv-input" type="file" accept=".csv" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setImporting(true)
              setImportResult(null)
              try {
                const result = await api.contacts.importCsv(file)
                setImportResult(result)
                load()
              } catch (err: any) {
                setImportResult({ error: err.message })
              } finally {
                setImporting(false)
                e.target.value = ""
              }
            }}
          />
          <button
            onClick={() => window.open(api.contacts.exportCsvUrl(), "_blank")}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"
          >
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => document.getElementById("csv-input")?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"
          >
            <Upload className="w-4 h-4" /> 导入
          </button>
          <input id="csv-input" type="file" accept=".csv" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setImporting(true)
              setImportResult(null)
              try {
                const result = await api.contacts.importCsv(file)
                setImportResult(result)
                load()
              } catch (err: any) {
                setImportResult({ error: err.message })
              } finally {
                setImporting(false)
                e.target.value = ""
              }
            }}
          />
          <button
            onClick={() => window.open(api.contacts.exportCsvUrl(), "_blank")}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] hover:border-[#d1d1d6]"
          >
            <Download className="w-4 h-4" /> 导出
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium text-white bg-[#007AFF] border border-[#007AFF] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
          >
            <Plus className="w-4 h-4" /> 添加联系人
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b] pointer-events-none" />
          <input
            placeholder="按姓名、公司或邮箱搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-[42px] pl-[44px] pr-[14px] text-[15px] text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
          />
        </div>
        <button onClick={handleSearch}
          className="inline-flex items-center gap-1.5 h-[42px] px-6 text-[15px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]">
          搜索
        </button>
      </div>

      {/* Batch Toolbar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="bg-[#007AFF] text-white rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">已选 {selectedIds.size} 个联系人</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBatchTag(true)}
              className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium text-white bg-white/20 border border-white/30 rounded-lg cursor-pointer hover:bg-white/30 transition-all">
              <Tags className="w-3 h-3" /> 批量标签
            </button>
            <button onClick={handleBatchExport}
              className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium text-white bg-white/20 border border-white/30 rounded-lg cursor-pointer hover:bg-white/30 transition-all">
              <Download className="w-3 h-3" /> 导出选中
            </button>
            <button onClick={handleBatchDelete}
              className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium text-white bg-red-500/30 border border-red-300/30 rounded-lg cursor-pointer hover:bg-red-500/50 transition-all">
              <Trash2 className="w-3 h-3" /> 删除
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 h-[32px] px-3 text-xs font-medium text-white/70 border border-white/20 rounded-lg cursor-pointer hover:text-white transition-all">
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Batch Tag Dialog */}
      {showBatchTag && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 mb-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">批量标签（{selectedIds.size} 个联系人）</h3>
          <div className="flex gap-2 mb-3">
            {["add", "remove"].map((act) => (
              <button key={act}
                onClick={() => setBatchTagAction(act as "add" | "remove")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-all ${
                  batchTagAction === act
                    ? "bg-[#007AFF] text-white border-[#007AFF]"
                    : "border-[#E5E5EA] text-[#86868b] hover:bg-[#f5f5f7]"
                }`}
              >
                {act === "add" ? "添加标签" : "移除标签"}
              </button>
            ))}
          </div>
          <input placeholder="标签（逗号分隔）" value={batchTagInput} onChange={(e) => setBatchTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBatchTag()}
            className="w-full h-[42px] px-3 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleBatchTag}
              className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer hover:bg-[#0071e3] transition-all">应用</button>
            <button onClick={() => setShowBatchTag(false)}
              className="inline-flex items-center gap-1.5 h-[36px] px-[14px] text-sm font-medium border border-[#E5E5EA] rounded-lg cursor-pointer hover:bg-[#f5f5f7] transition-all bg-transparent">取消</button>
          </div>
        </div>
      )}

      {/* Batch Result */}
      {batchResult && (
        <div className="bg-white border border-[rgba(52,199,89,0.2)] rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-green-600">{batchResult.message}</p>
          <button onClick={() => setBatchResult(null)} className="text-[#86868b] hover:text-[#1d1d1f] bg-transparent border-none cursor-pointer text-sm">关闭</button>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-3 mb-4 flex items-center justify-between">
          {importResult.error ? (
            <p className="text-sm text-red-500">{importResult.error}</p>
          ) : (
            <p className="text-sm text-green-600">
              已导入 {importResult.imported} 个联系人
              {importResult.skipped > 0 && `，跳过 ${importResult.skipped}`}
              {importResult.errors?.length > 0 && <span className="text-amber-600">（{importResult.errors.length} 条警告）</span>}
            </p>
          )}
          <button onClick={() => setImportResult(null)} className="text-[#86868b] hover:text-[#1d1d1f] bg-transparent border-none cursor-pointer text-sm">关闭</button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 mb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#86868b]">标签</label>
              <input
                placeholder="按标签筛选..."
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-[36px] w-[160px] px-3 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#007AFF]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#86868b]">来源</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-[36px] w-[140px] px-3 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF]"
              >
                <option value="">全部来源</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button onClick={handleClearFilters}
                className="inline-flex items-center gap-1 h-[36px] px-3 text-sm text-[#007AFF] bg-transparent border-none cursor-pointer hover:underline">
                <X className="w-3 h-3" /> 清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 mb-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">新建联系人</h3>
          <div className="grid gap-3 max-w-md">
            <input placeholder="姓名 *" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="h-[42px] px-3.5 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)] placeholder:text-[#86868b]" />
            <input placeholder="公司" value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
              className="h-[42px] px-3.5 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="职位" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              className="h-[42px] px-3.5 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="邮箱" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="h-[42px] px-3.5 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="标签（逗号分隔）" value={newTags} onChange={(e) => setNewTags(e.target.value)}
              className="h-[42px] px-3.5 text-sm text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]">创建</button>
              <button onClick={() => setShowCreate(false)}
                className="inline-flex items-center gap-1.5 h-[38px] px-[18px] text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7]">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : contacts.length === 0 ? (
          <EmptyState
              title={hasFilters ? "没有找到匹配的联系人" : "暂无联系人"}
              description={hasFilters ? "尝试调整筛选条件或搜索关键词" : "点击右上角「添加联系人」开始建立您的客户库"}
            />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F5F5F7]">
                                    {selectMode && (
                    <th className="px-2 py-3 border-b border-[#E5E5EA] w-10">
                      <button onClick={toggleSelectAll}
                        className="w-5 h-5 inline-flex items-center justify-center border border-[#c7c7cc] rounded cursor-pointer bg-transparent hover:bg-[#e5e5ea] transition-colors">
                        {selectedIds.size === contacts.length && contacts.length > 0 ? <Check className="w-3 h-3 text-[#007AFF]" /> : null}
                      </button>
                    </th>
                  )}
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">姓名</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">公司</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] hidden md:table-cell">职位</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA] hidden lg:table-cell">邮箱</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-[#86868b] text-left border-b border-[#E5E5EA]">标签</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => selectMode ? toggleSelect(c.id) : router.push(`/contacts/${c.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[#f9f9fb]"
                  >
                                        {selectMode && (
                      <td className="px-2 py-3.5 border-b border-[#f2f2f7]">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(c.id) }}
                          className={`w-5 h-5 inline-flex items-center justify-center border rounded cursor-pointer transition-colors ${
                            selectedIds.has(c.id)
                              ? "bg-[#007AFF] border-[#007AFF] text-white"
                              : "border-[#c7c7cc] hover:bg-[#f5f5f7]"
                          }`}>
                          {selectedIds.has(c.id) && <Check className="w-3 h-3" />}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-sm font-medium text-[#1d1d1f] border-b border-[#f2f2f7]">{c.name}</td>
                    <td className="px-4 py-3.5 text-sm text-[#1d1d1f] border-b border-[#f2f2f7]">
                      <span className="flex items-center gap-1.5 text-[#86868b]">
                        <Building2 className="w-3 h-3" /> {c.company || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#86868b] border-b border-[#f2f2f7] hidden md:table-cell">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3" /> {c.title || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#86868b] border-b border-[#f2f2f7] hidden lg:table-cell">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {c.email || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-b border-[#f2f2f7]">
                      <div className="flex gap-1 flex-wrap">
                        {c.tags?.length > 0 ? c.tags.map((t) => (
                          <span key={t} className="inline-flex items-center h-[22px] px-[8px] text-[11px] font-medium bg-[#f2f2f7] text-[#86868b] rounded-md">{t}</span>
                        )) : <span className="text-sm text-[#86868b]">-</span>}
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
              ? `共 ${total} 条记录`
              : `显示第 ${skip + 1}-${Math.min(skip + PAGE_SIZE, total)} 条，共 ${total} 条`
            }
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
    </div>
  )
}

export default function ContactsPage() {
  return (
    <AppLayout>
      <ContactsPageInner />
    </AppLayout>
  )
}
