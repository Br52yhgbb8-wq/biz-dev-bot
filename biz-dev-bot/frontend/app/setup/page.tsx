"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getStoredAuth, clearAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import {
  Bot, Mail, Linkedin, CheckCircle2, XCircle, Loader2, ExternalLink,
  ArrowRight, ArrowLeft, ChevronRight, Power, LogOut, Globe, PowerOff
} from "lucide-react"

const STEPS = [
  { key: "welcome", label: "欢迎", cn: "欢迎" },
  { key: "gmail", label: "Gmail", cn: "Gmail" },
  { key: "linkedin", label: "LinkedIn", cn: "LinkedIn" },
  { key: "complete", label: "完成", cn: "完成" },
]

type StepKey = (typeof STEPS)[number]["key"]

export default function SetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<StepKey>("welcome")
  const [gmailStatus, setGmailStatus] = useState<any>({ loading: true })
  const [linkedinStatus, setLinkedinStatus] = useState<any>({ loading: true })
  const [gmailConnecting, setGmailConnecting] = useState(false)
  const [linkedinConnecting, setLinkedinConnecting] = useState(false)
  const [gmailError, setGmailError] = useState("")
  const [linkedinError, setLinkedinError] = useState("")
  const [authChecked, setAuthChecked] = useState(false)

  const { isAuthenticated, username, token } = getStoredAuth()

  // Check auth on mount
  useEffect(() => {
    if (!token) {
      router.replace("/login")
      return
    }
    setAuthChecked(true)
  }, [token, router])

  const loadGmailStatus = useCallback(async () => {
    setGmailStatus((prev: any) => ({ ...prev, loading: true }))
    try {
      const data = await api.request<any>("/api/email/status")
      setGmailStatus({ ...data, loading: false })
    } catch {
      setGmailStatus({ connected: false, credentials_configured: false, loading: false })
    }
  }, [])

  const loadLinkedinStatus = useCallback(async () => {
    setLinkedinStatus((prev: any) => ({ ...prev, loading: true }))
    try {
      const data = await api.request<any>("/api/linkedin/status")
      setLinkedinStatus({ ...data, loading: false })
    } catch {
      setLinkedinStatus({ browser_running: false, logged_in: false, playwright_available: false, loading: false })
    }
  }, [])

  useEffect(() => {
    if (authChecked) {
      loadGmailStatus()
      loadLinkedinStatus()
    }
  }, [authChecked, loadGmailStatus, loadLinkedinStatus])

  async function connectGmail() {
    setGmailConnecting(true)
    setGmailError("")
    try {
      const res = await api.request<any>(
        "/api/email/auth-url?redirect_uri=" +
          encodeURIComponent(window.location.origin + "/api/email/callback")
      )
      window.open(res.auth_url, "_blank", "width=600,height=700")
      // Poll status until connected or user cancels
      const poll = setInterval(async () => {
        try {
          const s = await api.request<any>("/api/email/status")
          setGmailStatus({ ...s, loading: false })
          if (s.connected) {
            clearInterval(poll)
            setGmailConnecting(false)
          }
        } catch {}
      }, 2000)
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(poll)
        setGmailConnecting(false)
        if (!gmailStatus?.connected) {
          setGmailError("认证超时。如已完成 Google 授权，点击「重新检查」按钮。")
        }
      }, 120000)
    } catch (err: any) {
      setGmailError(err.message || "获取授权链接失败")
      setGmailConnecting(false)
    }
  }

  async function connectLinkedin() {
    setLinkedinConnecting(true)
    setLinkedinError("")
    try {
      const res = await api.request<{ message: string }>("/api/linkedin/connect", {
        method: "POST",
      })
      await loadLinkedinStatus()
      setLinkedinConnecting(false)
    } catch (err: any) {
      setLinkedinError(err.message || "启动浏览器失败")
      setLinkedinConnecting(false)
    }
  }

  function stepIndex(key: StepKey) {
    return STEPS.findIndex((s) => s.key === key)
  }

  function goNext() {
    const idx = stepIndex(currentStep)
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key as StepKey)
    }
  }

  function goPrev() {
    const idx = stepIndex(currentStep)
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key as StepKey)
    }
  }

  function goToDashboard() {
    router.push("/dashboard")
  }

  function logout() {
    clearAuth()
    router.push("/login")
  }

  if (!authChecked) return null

  const currentIdx = stepIndex(currentStep)
  const gmailDone = !gmailStatus.loading && gmailStatus.connected
  const linkedinDone =
    !linkedinStatus.loading && linkedinStatus.browser_running && linkedinStatus.logged_in
  const allDone = gmailDone && linkedinDone

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Left: Step Navigation */}
      <div className="w-[280px] min-h-screen border-r border-[#E5E5EA] bg-[#f9f9fb] flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-[#1d1d1f]">Mercury</span>
          </div>

          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const isActive = step.key === currentStep
              const isPast = stepIndex(step.key as StepKey) < currentIdx
              const isFuture = stepIndex(step.key as StepKey) > currentIdx

              let stepStatus: "active" | "past" | "future" | "current-done" = "future"
              if (isActive) stepStatus = "active"
              else if (isPast) stepStatus = "past"

              // Check per-step completion
              if (step.key === "gmail" && gmailDone && isPast) stepStatus = "past"
              if (step.key === "linkedin" && linkedinDone && isPast) stepStatus = "past"

              return (
                <button
                  key={step.key}
                  onClick={() => {
                    // Only allow clicking past steps
                    if (!isFuture) setCurrentStep(step.key as StepKey)
                  }}
                  disabled={isFuture}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer border-none
                    ${
                      stepStatus === "active"
                        ? "bg-[#007AFF] text-white shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                        : "bg-transparent text-[#86868b] hover:bg-[#f2f2f7]"
                    }
                    ${isFuture ? "opacity-40 cursor-default" : ""}
                  `}
                >
                  {/* Step number */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border-2 transition-all duration-200
                      ${
                        stepStatus === "active"
                          ? "bg-white/20 border-white text-white"
                          : stepStatus === "past"
                          ? "bg-[#34c759] border-[#34c759] text-white"
                          : "bg-transparent border-[#c7c7cc] text-[#c7c7cc]"
                      }
                    `}
                  >
                    {stepStatus === "past" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-medium ${
                        stepStatus === "active" ? "text-white" : "text-[#1d1d1f]"
                      }`}
                    >
                      {step.cn}
                    </span>
                    <span className="text-[11px] text-inherit opacity-70">{step.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* User info at bottom */}
        <div className="mt-auto p-4 border-t border-[#E5E5EA]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center text-xs font-semibold text-white">
                {username?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-sm text-[#1d1d1f]">{username || "User"}</span>
            </div>
            <button
              onClick={logout}
              className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:bg-[#f2f2f7] rounded-lg transition-colors bg-transparent border-none cursor-pointer"
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[620px] mx-auto px-10 py-16 pb-24">
          {/* Welcome Step */}
          {currentStep === "welcome" && (
            <div>
              <div className="mb-10">
                <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#007AFF,#5856D6)] flex items-center justify-center mb-6 shadow-[0_4px_16px_rgba(0,122,255,0.25)]">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-[36px] font-bold text-[#1d1d1f] tracking-[-0.5px] mb-3">
                  欢迎使用 Mercury
                </h1>
                <p className="text-[17px] text-[#86868b] leading-relaxed">
                  在开始使用之前，我们需要配置两个外部服务。整个过程大约需要 10 分钟。
                </p>
              </div>

              <div className="space-y-4 mb-10">
                {/* Gmail Card */}
                <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[rgba(0,122,255,0.1)] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-[#007AFF]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">Gmail 集成</h3>
                      <p className="text-[13px] text-[#86868b] leading-relaxed">
                        连接你的 Gmail 账号，实现邮件发送、收件箱同步和自动跟进。
                        需要 Google Cloud Console 的 OAuth 凭据。
                      </p>
                      {!gmailStatus.loading && (
                        <div className="mt-3 flex items-center gap-2">
                          {gmailStatus.credentials_configured ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(52,199,89,0.12)] text-[#34c759] rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> 凭据就绪
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(255,149,0,0.12)] text-[#ff9500] rounded-full">
                              <XCircle className="w-3 h-3" /> 需要配置
                            </span>
                          )}
                          {gmailStatus.connected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(52,199,89,0.12)] text-[#34c759] rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> 已连接
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#c7c7cc] shrink-0" />
                  </div>
                </div>

                {/* LinkedIn Card */}
                <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[rgba(10,102,194,0.1)] flex items-center justify-center shrink-0">
                      <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">LinkedIn 集成</h3>
                      <p className="text-[13px] text-[#86868b] leading-relaxed">
                        通过浏览器自动化访问 LinkedIn，实现人脉搜索、资料抓取和自动邀请。
                        需要首次手动登录后保持会话。
                      </p>
                      {!linkedinStatus.loading && (
                        <div className="mt-3 flex items-center gap-2">
                          {linkedinStatus.playwright_available ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(52,199,89,0.12)] text-[#34c759] rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Playwright 就绪
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(255,59,48,0.1)] text-[#ff3b30] rounded-full">
                              <XCircle className="w-3 h-3" /> 需要安装
                            </span>
                          )}
                          {linkedinStatus.logged_in && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-[rgba(52,199,89,0.12)] text-[#34c759] rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> 已登录
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#c7c7cc] shrink-0" />
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 h-[44px] px-6 text-[15px] font-medium text-white bg-[#007AFF] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#0071e3] hover:shadow-[0_4px_12px_rgba(0,122,255,0.3)] active:scale-[0.98]"
              >
                开始配置 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Gmail Step */}
          {currentStep === "gmail" && (
            <div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-[rgba(0,122,255,0.1)] flex items-center justify-center mb-5">
                  <Mail className="w-6 h-6 text-[#007AFF]" />
                </div>
                <h2 className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.3px] mb-2">
                  配置 Gmail
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  连接 Gmail 账号以发送邮件、同步收件箱和自动跟进联系人。
                </p>
              </div>

              {/* Status */}
              <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mb-6">
                <div className="divide-y divide-[#f2f2f7]">
                  <StatusRow
                    label="OAuth 凭据"
                    loading={gmailStatus.loading}
                    ok={gmailStatus.credentials_configured}
                    okText="gmail_credentials.json 已就绪"
                    failText="gmail_credentials.json 未找到"
                  />
                  <StatusRow
                    label="认证状态"
                    loading={gmailStatus.loading}
                    ok={gmailStatus.connected}
                    okText={gmailStatus.email ? `已连接为 ${gmailStatus.email}` : "已连接"}
                    failText="未认证"
                  />
                </div>
              </div>

              {/* Google Cloud Instructions */}
              {!gmailStatus.loading && !gmailStatus.credentials_configured && (
                <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 mb-6">
                  <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">获取 OAuth 凭据</h4>
                  <ol className="text-[13px] text-[#86868b] space-y-2 leading-relaxed">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>前往 <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#007AFF] hover:underline inline-flex items-center gap-0.5">
                        Google Cloud Console <ExternalLink className="w-3 h-3" />
                      </a></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>创建项目并启用 Gmail API</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>创建 OAuth 2.0 凭据（桌面应用类型）</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>添加重定向 URI: <code className="bg-[#f2f2f7] px-1.5 py-0.5 rounded text-[11px]">http://localhost:8000/api/email/callback</code></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">5</span>
                      <span>下载为 <code className="bg-[#f2f2f7] px-1.5 py-0.5 rounded text-[11px]">gmail_credentials.json</code> 并放入 <code className="bg-[#f2f2f7] px-1.5 py-0.5 rounded text-[11px]">backend/</code> 目录</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">6</span>
                      <span>重启后端后点击下方「重新检查」按钮</span>
                    </li>
                  </ol>
                </div>
              )}

              {gmailError && (
                <div className="bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.2)] rounded-xl px-4 py-3 mb-6">
                  <p className="text-[13px] text-[#ff3b30]">{gmailError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-8">
                {gmailStatus.credentials_configured && (
                  <button
                    onClick={connectGmail}
                    disabled={gmailConnecting}
                    className="inline-flex items-center gap-2 h-[40px] px-5 text-[14px] font-medium text-white bg-[#007AFF] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gmailConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    {gmailConnecting
                      ? "等待授权中..."
                      : gmailStatus.connected
                      ? "重新连接 Gmail"
                      : "连接 Gmail"}
                  </button>
                )}

                <button
                  onClick={loadGmailStatus}
                  disabled={gmailStatus.loading}
                  className="inline-flex items-center gap-2 h-[40px] px-5 text-[14px] font-medium text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] disabled:opacity-50"
                >
                  {gmailStatus.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Loader2 className="w-4 h-4" />
                  )}
                  重新检查
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-[#E5E5EA] pt-6">
                <button
                  onClick={goPrev}
                  className="inline-flex items-center gap-1.5 h-[38px] px-4 text-[14px] font-medium text-[#86868b] bg-transparent border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7]"
                >
                  <ArrowLeft className="w-4 h-4" /> 返回
                </button>
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 h-[38px] px-5 text-[14px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
                >
                  {gmailDone ? "下一步" : "跳过，继续设置 LinkedIn"} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* LinkedIn Step */}
          {currentStep === "linkedin" && (
            <div>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-[rgba(10,102,194,0.1)] flex items-center justify-center mb-5">
                  <Linkedin className="w-6 h-6 text-[#0a66c2]" />
                </div>
                <h2 className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.3px] mb-2">
                  配置 LinkedIn
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  启动浏览器自动化，实现 LinkedIn 人脉搜索、资料抓取和自动邀请。
                </p>
              </div>

              {/* Status */}
              <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mb-6">
                <div className="divide-y divide-[#f2f2f7]">
                  <StatusRow
                    label="Playwright"
                    loading={linkedinStatus.loading}
                    ok={linkedinStatus.playwright_available}
                    okText="Playwright 已安装"
                    failText="需要安装 Playwright（pip install playwright && playwright install chromium）"
                  />
                  <StatusRow
                    label="浏览器状态"
                    loading={linkedinStatus.loading}
                    ok={linkedinStatus.browser_running}
                    okText="浏览器正在运行"
                    failText="浏览器未启动"
                  />
                  <StatusRow
                    label="LinkedIn 登录"
                    loading={linkedinStatus.loading}
                    ok={linkedinStatus.logged_in}
                    okText="已登录 LinkedIn"
                    failText="未登录（请在弹出的浏览器窗口中登录）"
                  />
                </div>
              </div>

              {/* LinkedIn Setup Instructions */}
              <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 mb-6">
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">设置步骤</h4>
                <ol className="text-[13px] text-[#86868b] space-y-2 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0a66c2] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>点击下方「启动浏览器」按钮，Playwright 会打开一个浏览器窗口并导航到 LinkedIn</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0a66c2] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>在窗口中手动登录你的 LinkedIn 账号（首次只需登录一次，后续会话自动保持）</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0a66c2] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>登录完成后，点击「重新检查」确认状态</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0a66c2] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>⚠️ 保持浏览器窗口打开，关闭后将失去会话（Docker 部署时，会话会持久化到 volume）</span>
                  </li>
                </ol>
              </div>

              {linkedinError && (
                <div className="bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.2)] rounded-xl px-4 py-3 mb-6">
                  <p className="text-[13px] text-[#ff3b30]">{linkedinError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-8">
                {!linkedinStatus.browser_running && (
                  <button
                    onClick={connectLinkedin}
                    disabled={linkedinConnecting || !linkedinStatus.playwright_available}
                    className="inline-flex items-center gap-2 h-[40px] px-5 text-[14px] font-medium text-white bg-[#0a66c2] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {linkedinConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    {linkedinConnecting ? "启动中..." : "启动浏览器"}
                  </button>
                )}

                {linkedinStatus.browser_running && (
                  <button
                    onClick={async () => {
                      try {
                        await api.request<any>("/api/linkedin/disconnect", { method: "POST" })
                        await loadLinkedinStatus()
                      } catch {}
                    }}
                    className="inline-flex items-center gap-2 h-[40px] px-5 text-[14px] font-medium text-[#ff3b30] bg-white border border-[rgba(255,59,48,0.3)] rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(255,59,48,0.05)]"
                  >
                    <PowerOff className="w-4 h-4" />
                    关闭浏览器
                  </button>
                )}

                <button
                  onClick={loadLinkedinStatus}
                  disabled={linkedinStatus.loading}
                  className="inline-flex items-center gap-2 h-[40px] px-5 text-[14px] font-medium text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7] disabled:opacity-50"
                >
                  {linkedinStatus.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Loader2 className="w-4 h-4" />
                  )}
                  重新检查
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-[#E5E5EA] pt-6">
                <button
                  onClick={goPrev}
                  className="inline-flex items-center gap-1.5 h-[38px] px-4 text-[14px] font-medium text-[#86868b] bg-transparent border border-[#E5E5EA] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f5f5f7]"
                >
                  <ArrowLeft className="w-4 h-4" /> 返回
                </button>
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 h-[38px] px-5 text-[14px] font-medium text-white bg-[#007AFF] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#0071e3]"
                >
                  查看配置总结 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div>
              <div className="mb-10 text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ${
                    allDone
                      ? "bg-[rgba(52,199,89,0.15)] scale-100"
                      : "bg-[rgba(255,149,0,0.12)] scale-100"
                  }`}
                >
                  {allDone ? (
                    <CheckCircle2 className="w-10 h-10 text-[#34c759]" />
                  ) : (
                    <Globe className="w-10 h-10 text-[#ff9500]" />
                  )}
                </div>
                <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-[-0.5px] mb-3">
                  {allDone ? "全部配置完成！" : "配置完成"}
                </h1>
                <p className="text-[15px] text-[#86868b]">
                  {allDone
                    ? "Gmail 和 LinkedIn 都已就绪，你可以开始使用 Mercury 的全部功能了。"
                    : "基本配置已完成，未完成的集成可以在设置页面中随时配置。"}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mb-8">
                <div className="px-5 py-3.5 bg-[#f9f9fb] border-b border-[#E5E5EA]">
                  <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-[0.5px]">
                    集成状态
                  </span>
                </div>
                <div className="divide-y divide-[#f2f2f7]">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-[#007AFF]" />
                      <span className="text-sm font-medium text-[#1d1d1f]">Gmail</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                        gmailDone
                          ? "bg-[rgba(52,199,89,0.12)] text-[#34c759]"
                          : "bg-[rgba(255,149,0,0.12)] text-[#ff9500]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          gmailDone ? "bg-[#34c759]" : "bg-[#ff9500]"
                        }`}
                      />
                      {gmailDone ? "已连接" : "未连接"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                      <span className="text-sm font-medium text-[#1d1d1f]">LinkedIn</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                        linkedinDone
                          ? "bg-[rgba(52,199,89,0.12)] text-[#34c759]"
                          : "bg-[rgba(255,149,0,0.12)] text-[#ff9500]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          linkedinDone ? "bg-[#34c759]" : "bg-[#ff9500]"
                        }`}
                      />
                      {linkedinDone ? "已连接" : "未连接"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={goToDashboard}
                  className="inline-flex items-center gap-2 h-[44px] px-7 text-[15px] font-medium text-white bg-[#007AFF] border-none rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#0071e3] hover:shadow-[0_4px_12px_rgba(0,122,255,0.3)] active:scale-[0.98]"
                >
                  进入仪表盘 <ArrowRight className="w-4 h-4" />
                </button>
                {!allDone && (
                  <button
                    onClick={() => setCurrentStep("welcome")}
                    className="text-[13px] text-[#007AFF] bg-transparent border-none cursor-pointer hover:underline"
                  >
                    返回配置未完成的集成
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Status Row Component ── */

function StatusRow({
  label,
  loading,
  ok,
  okText,
  failText,
}: {
  label: string
  loading: boolean
  ok: boolean
  okText: string
  failText: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm font-medium text-[#1d1d1f]">{label}</span>
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="text-sm text-[#86868b]">检测中...</span>
        ) : (
          <>
            {ok ? (
              <CheckCircle2 className="w-[18px] h-[18px] text-[#34c759]" />
            ) : (
              <XCircle className="w-[18px] h-[18px] text-[#ff9500]" />
            )}
            <span className={`text-sm ${ok ? "text-[#1d1d1f]" : "text-[#ff9500]"}`}>
              {ok ? okText : failText}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
