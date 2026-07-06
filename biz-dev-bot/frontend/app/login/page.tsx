"use client"

import { useState, useRef } from "react"
import { useAuth, AuthProvider } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}

function LoginForm() {
  const { login, register } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isRegister, setIsRegister] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const formRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      if (isRegister) {
        await register(username, password, inviteCode)
      } else {
        await login(username, password)
      }
    } catch (err: any) {
      setError(err.message || "认证失败")
    } finally {
      setSubmitting(false)
    }
  }

  const accent = "#7A899C"
  const accentHover = "#667588"

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      {/* Left: Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
        <div ref={formRef} className="max-w-sm mx-auto w-full">
          {/* Brand */}
          <div className="mb-12">
            <div className="w-10 h-10 rounded-xl bg-[#F0F0F2] flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.3px] mb-2">
              Mercury
            </h1>
            <p className="text-sm text-[#86868b] font-normal">
              商业开发自动化引擎
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1d1d1f]" htmlFor="username">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                required
                className="w-full h-11 px-3.5 text-base text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-xl outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#1d1d1f]" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                className="w-full h-11 px-3.5 text-base text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-xl outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)]"
              />
            </div>

            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#1d1d1f]" htmlFor="inviteCode">
                  邀请码
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="请输入邀请码"
                  className="w-full h-11 px-3.5 text-base text-[#1d1d1f] bg-white border border-[#E5E5EA] rounded-xl outline-none transition-all duration-200 placeholder:text-[#86868b] focus:border-[#7A899C] focus:shadow-[0_0_0_3px_rgba(122,137,156,0.12)]"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2.5 -mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-base font-medium text-white rounded-xl border-none cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              style={{ backgroundColor: accent }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accent)}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? (isRegister ? "注册中..." : "登录中...") : (isRegister ? "注册" : "登录")}
            </button>
          </form>

          <div className="mt-8 border-t border-[#F0F0F2] pt-6">
            <p className="text-center text-sm text-[#86868b]">
              {isRegister ? "已有账号？" : "没有账号？"}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError("") }}
                className="font-medium hover:underline bg-transparent border-none cursor-pointer ml-1"
                style={{ color: accent }}
              >
                {isRegister ? "登录" : "注册"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Visual Panel */}
      <div className="hidden lg:flex lg:w-[55%] min-h-screen relative overflow-hidden bg-[#F8F8FA] items-center justify-center">
        {/* Geometric background pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice"
          style={{ color: accent }}>
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Geometric connection nodes */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice"
          style={{ color: accent }}>
          <circle cx="150" cy="120" r="3" fill="currentColor" />
          <circle cx="650" cy="200" r="3" fill="currentColor" />
          <circle cx="300" cy="550" r="2" fill="currentColor" />
          <circle cx="550" cy="650" r="2" fill="currentColor" />
          <circle cx="200" cy="350" r="2.5" fill="currentColor" />
          <circle cx="680" cy="450" r="2.5" fill="currentColor" />
          <circle cx="450" cy="350" r="2" fill="currentColor" />
          <circle cx="350" cy="200" r="2" fill="currentColor" />
          <line x1="150" y1="120" x2="650" y2="200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="150" y1="120" x2="300" y2="550" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="650" y1="200" x2="550" y2="650" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="300" y1="550" x2="550" y2="650" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="200" y1="350" x2="680" y2="450" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="350" y1="200" x2="450" y2="350" stroke="currentColor" strokeWidth="0.3" strokeDasharray="3 3" />
        </svg>

        {/* Large subtle geometric shapes */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice"
          style={{ color: accent }}>
          <rect x="600" y="600" width="120" height="120" rx="8" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="80" y="580" width="80" height="80" rx="6" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(15, 120, 620)" />
          <polygon points="650,120 700,200 600,200" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
        
        {/* Subtle background circle */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style={{ backgroundColor: accent, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        />

        {/* Content card */}
        <div className="relative z-10 max-w-[420px] px-12">
          <div className="bg-white rounded-2xl border border-[#E5E5EA] p-10 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-[#F0F0F2] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f]">Project Mercury</p>
                <p className="text-[12px] text-[#86868b]">一站式业务开发管理平台</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: "CRM 管理", desc: "客户数据、商机追踪、活动记录" },
                { label: "Gmail 集成", desc: "邮件同步、自动化跟进" },
                { label: "LinkedIn 获客", desc: "潜在客户搜索、批量导入" },
                { label: "AI 智能获客", desc: "智能体驱动的自动化线索发现" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                  <div>
                    <p className="text-[13px] font-medium text-[#1d1d1f]">{item.label}</p>
                    <p className="text-[12px] text-[#86868b]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[#F0F0F2]">
              <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>企业级数据安全保障</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
