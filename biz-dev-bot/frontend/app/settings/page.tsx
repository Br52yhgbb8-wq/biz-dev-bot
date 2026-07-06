"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Mail, ExternalLink, CheckCircle2, XCircle, Linkedin, Cog, ArrowRight } from "lucide-react"

function SettingsPageInner() {
  const router = useRouter()
  const [status, setStatus] = useState<any>(null)
  const [linkedinStatus, setLinkedinStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [liLoading, setLiLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    api.auth.profile().then(setUserProfile).catch(() => {})
  }, [])

  useEffect(() => {
    api.request<any>("/api/email/status")
      .then(setStatus)
      .catch(() => setStatus({ connected: false, credentials_configured: false }))
      .finally(() => setLoading(false))
  }, [])

  const loadLinkedinStatus = useCallback(async () => {
    setLiLoading(true)
    try {
      const data = await api.request<any>("/api/linkedin/status")
      setLinkedinStatus(data)
    } catch {
      setLinkedinStatus({ browser_running: false, logged_in: false, playwright_available: false })
    } finally {
      setLiLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLinkedinStatus()
  }, [loadLinkedinStatus])

  async function connectGmail() {
    try {
      const res = await api.request<any>(
        "/api/email/auth-url?redirect_uri=" + encodeURIComponent(window.location.origin + "/api/email/callback")
      )
      window.open(res.auth_url, "_blank")
    } catch (err: any) {
      alert(err.message || "获取授权链接失败")
    }
  }

  return (
    <div className="max-w-[600px] mx-auto px-6 py-12 pb-20">
      <div className="flex items-center justify-between mb-9">
        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px]">设置</h1>
        <button
          onClick={() => router.push("/setup")}
          className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[13px] font-medium text-[#007AFF] bg-[rgba(0,122,255,0.08)] border border-[rgba(0,122,255,0.15)] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(0,122,255,0.12)]"
        >
          <Cog className="w-3.5 h-3.5" /> 设置向导
        </button>
      </div>

      {/* Gmail Integration Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-[#f9f9fb] border-b border-[#E5E5EA]">
          <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-[0.5px]">Gmail 集成</span>
        </div>
        <div className="divide-y divide-[#f2f2f7]">
          {/* Connection Status */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">连接状态</span>
            <div className="flex items-center gap-3">
              {loading ? (
                <span className="text-sm text-[#86868b]">加载中...</span>
              ) : (
                <>
                  <span className="text-sm text-[#86868b]">
                    {status?.connected ? `已连接为 ${status.email || "unknown"}` : "未连接"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                    status?.connected
                      ? "bg-[rgba(52,199,89,0.12)] text-[#34c759]"
                      : "bg-[rgba(255,59,48,0.1)] text-[#ff3b30]"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status?.connected ? "bg-[#34c759]" : "bg-[#ff3b30]"}`} />
                    {status?.connected ? "已连接" : "未连接"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Credentials */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">凭据</span>
            {!loading && (
              <div className="flex items-center gap-2">
                {status?.credentials_configured ? (
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#34c759]" />
                ) : (
                  <XCircle className="w-[18px] h-[18px] text-[#ff9500]" />
                )}
                <span className={`text-sm ${status?.credentials_configured ? "text-[#1d1d1f]" : "text-[#ff9500]"}`}>
                  {status?.credentials_configured ? "gmail_credentials.json 已找到" : "gmail_credentials.json 未找到"}
                </span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!loading && !status?.credentials_configured && (
            <div className="px-5 py-3 bg-[#f9f9fb]">
              <ol className="text-xs text-[#86868b] space-y-1 list-decimal ml-4">
                <li>前往 <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:underline">Google Cloud Console <ExternalLink className="w-3 h-3 inline" /></a></li>
                <li>创建项目并启用 Gmail API</li>
                <li>创建 OAuth 2.0 凭据（桌面应用类型）</li>
                <li>添加重定向 URI: http://localhost:8000/api/email/callback</li>
                <li>下载为 gmail_credentials.json</li>
                <li>放入 <code className="bg-[#f2f2f7] px-1 rounded">backend/</code> 目录</li>
              </ol>
            </div>
          )}

          {/* Action */}
          <div className="px-5 py-3.5">
            <button onClick={connectGmail} disabled={!status?.credentials_configured}
              className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-white bg-[#007AFF] border border-[#007AFF] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3] hover:border-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed">
              <ExternalLink className="w-4 h-4" /> {status?.connected ? "重新连接 Gmail" : "连接 Gmail"}
            </button>
          </div>
        </div>
      </div>

      {/* LinkedIn Integration Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        <div className="px-5 py-3.5 bg-[#f9f9fb] border-b border-[#E5E5EA]">
          <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-[0.5px]">LinkedIn 集成</span>
        </div>
        <div className="divide-y divide-[#f2f2f7]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">浏览器状态</span>
            <div className="flex items-center gap-3">
              {liLoading ? (
                <span className="text-sm text-[#86868b]">加载中...</span>
              ) : (
                <>
                  <span className="text-sm text-[#86868b]">
                    {linkedinStatus?.browser_running ? "浏览器运行中" : "浏览器未启动"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                    linkedinStatus?.browser_running
                      ? "bg-[rgba(52,199,89,0.12)] text-[#34c759]"
                      : "bg-[rgba(255,149,0,0.12)] text-[#ff9500]"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${linkedinStatus?.browser_running ? "bg-[#34c759]" : "bg-[#ff9500]"}`} />
                    {linkedinStatus?.browser_running ? "运行中" : "已停止"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">LinkedIn 登录</span>
            <div className="flex items-center gap-3">
              {liLoading ? (
                <span className="text-sm text-[#86868b]">加载中...</span>
              ) : (
                <>
                  <span className="text-sm text-[#86868b]">
                    {linkedinStatus?.logged_in ? "已登录" : "未登录"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                    linkedinStatus?.logged_in
                      ? "bg-[rgba(52,199,89,0.12)] text-[#34c759]"
                      : "bg-[rgba(255,149,0,0.12)] text-[#ff9500]"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${linkedinStatus?.logged_in ? "bg-[#34c759]" : "bg-[#ff9500]"}`} />
                    {linkedinStatus?.logged_in ? "已登录" : "未登录"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="px-5 py-3.5">
            <button
              onClick={loadLinkedinStatus}
              className="inline-flex items-center gap-1.5 h-[36px] px-4 text-sm font-medium text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7]"
            >
              重新检查状态
            </button>
          </div>
        </div>
      </div>

      {/* Account Card */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f9f9fb] border-b border-[#E5E5EA]">
          <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-[0.5px]">账户</span>
        </div>
        <div className="divide-y divide-[#f2f2f7]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">用户名</span>
            <span className="text-sm text-[#86868b]">{userProfile?.username || "Mercury"}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-[#1d1d1f]">版本</span>
            <span className="text-sm text-[#86868b]">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Setup Wizard Shortcut */}
      <div className="mt-6 bg-[linear-gradient(135deg,rgba(0,122,255,0.06),rgba(88,86,214,0.06))] border border-[rgba(0,122,255,0.12)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f]">设置向导</p>
            <p className="text-xs text-[#86868b] mt-0.5">分步引导配置 Gmail 和 LinkedIn 集成</p>
          </div>
          <button
            onClick={() => router.push("/setup")}
            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
          >
            打开 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsPageInner />
    </AppLayout>
  )
}
