"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import {
  Search as SearchIcon, Power, PowerOff, ExternalLink, Loader2, UserPlus, Linkedin as LinkedinIcon
} from "lucide-react"

interface SearchResult {
  name: string; title: string; location: string; profile_url: string; img_url: string
}

function LinkedInPageInner() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState("")
  const [location, setLocation] = useState("")
  const [limit, setLimit] = useState("10")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.request<any>("/api/linkedin/status")
      setStatus(data)
    } catch (e) {
      setStatus({ browser_running: false, logged_in: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function handleConnect() {
    setConnecting(true)
    setError("")
    setMessage("")
    try {
      const res = await api.request<any>("/api/linkedin/connect", { method: "POST" })
      setMessage(res.message || "浏览器已启动")
      await loadStatus()
    } catch (err: any) {
      setError(err.message || "连接失败")
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setError("")
    setMessage("")
    try {
      await api.request<any>("/api/linkedin/disconnect", { method: "POST" })
      setMessage("浏览器已关闭")
      await loadStatus()
    } catch (err: any) {
      setError(err.message || "断开连接失败")
    }
  }

  async function handleSearch() {
    if (!keywords.trim()) return
    setSearching(true)
    setError("")
    setMessage("")
    try {
      const data = await api.request<SearchResult[]>("/api/linkedin/search", {
        method: "POST",
        body: JSON.stringify({ keywords, location, limit: parseInt(limit) || 10 }),
      })
      setResults(data)
      setMessage(`找到 ${data.length} 条结果`)
    } catch (err: any) {
      setError(err.message || "搜索失败")
    } finally {
      setSearching(false)
    }
  }

  async function handleImport() {
    if (results.length === 0) return
    setImporting(true)
    setError("")
    try {
      const data = await api.request<any>("/api/linkedin/export", {
        method: "POST", body: JSON.stringify({ results }),
      })
      setMessage(`已导入 ${data.imported}，跳过 ${data.skipped}（共 ${data.total}）`)
      setResults([])
    } catch (err: any) {
      setError(err.message || "导入失败")
    } finally {
      setImporting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-[#86868b]">加载中...</div>
  )

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-8 pb-16">
      <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px] mb-7">LinkedIn 线索研究</h1>

      {/* Connection Status */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${status?.browser_running ? "bg-[#34c759] animate-pulse" : "bg-[#c7c7cc]"}`} />
            <div>
              <p className="text-sm text-[#1d1d1f]">
                <span className="text-[#86868b]">浏览器:</span> {status?.browser_running ? "运行中" : "未运行"}
              </p>
              {status?.browser_running && (
                <p className="text-xs text-[#86868b] mt-0.5">
                  <span className="text-[#86868b]">LinkedIn:</span> {status?.logged_in ? "已登录" : "未登录"}
                </p>
              )}
            </div>
          </div>
          {status?.browser_running ? (
            <button onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-red-500 border border-[#ff3b30] rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-50 bg-transparent">
              <PowerOff className="w-4 h-4" /> 断开
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting}
              className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              {connecting ? "启动中..." : "连接"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-[rgba(52,199,89,0.08)] border border-[rgba(52,199,89,0.2)] rounded-lg p-3 text-sm text-[#34c759] mb-4">{message}</div>
      )}
      {error && (
        <div className="bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.2)] rounded-lg p-3 text-sm text-red-500 mb-4">{error}</div>
      )}

      {/* Search Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 mb-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-5">搜索 LinkedIn</h3>
        <div className="space-y-3">
          <input placeholder="关键词（如 CTO、VP Engineering、AI 创业公司）" value={keywords} onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)] placeholder:text-[#86868b]" />
          <div className="flex gap-2">
            <input placeholder="位置（可选）" value={location} onChange={(e) => setLocation(e.target.value)}
              className="flex-1 h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF] placeholder:text-[#86868b]" />
            <input placeholder="数量" value={limit} onChange={(e) => setLimit(e.target.value)} type="number"
              className="w-20 h-[42px] px-3.5 text-sm border border-[#E5E5EA] rounded-lg outline-none transition-all focus:border-[#007AFF]" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch} disabled={!keywords.trim() || searching || !status?.browser_running}
              className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
              {searching ? "搜索中..." : "搜索"}
            </button>
            {results.length > 0 && (
              <button onClick={handleImport} disabled={importing}
                className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-[#1d1d1f] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {importing ? "导入中..." : `导入 ${results.length} 条到 CRM`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-[#E5E5EA]">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">搜索结果（{results.length}）</h3>
          </div>
          <div className="divide-y divide-[#f2f2f7]">
            {results.map((r, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#f9f9fb]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] truncate">{r.name}</p>
                  <p className="text-xs text-[#86868b] truncate">{r.title}</p>
                  {r.location && <p className="text-xs text-[#86868b]">{r.location}</p>}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  {r.profile_url && (
                    <a href={r.profile_url} target="_blank" rel="noopener noreferrer">
                      <button className="w-8 h-8 inline-flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] bg-transparent">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">使用说明</h3>
        <ol className="text-xs text-[#86868b] space-y-1.5 list-decimal ml-4">
          <li>点击 <strong>连接</strong> — 浏览器窗口将打开 LinkedIn</li>
          <li>在浏览器中登录 LinkedIn（首次需要）</li>
          <li>输入搜索关键词（如 "CTO 新加坡 AI"）</li>
          <li>查看结果后点击 <strong>导入到 CRM</strong></li>
          <li>联系人将出现在 <strong>联系人</strong> 页面，来源标记为 "linkedin"</li>
        </ol>
      </div>
    </div>
  )
}

export default function LinkedInPage() {
  return (
    <AppLayout>
      <LinkedInPageInner />
    </AppLayout>
  )
}
