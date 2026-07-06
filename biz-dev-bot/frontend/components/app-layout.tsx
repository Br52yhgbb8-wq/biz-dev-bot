"use client"

import { useAuth, AuthProvider } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter, usePathname } from "next/navigation"
import { Target, LayoutDashboard, Users, GitBranch, SendHorizontal, Mail, Settings, LogOut, Bot, Linkedin, FileText, CalendarDays, Bell, Search, X, ExternalLink, Menu, Moon, Sun, Keyboard } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", cn: "仪表盘", en: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", cn: "联系人", en: "Contacts", icon: Users },
  { href: "/pipelines", cn: "销售管道", en: "Pipelines", icon: GitBranch },
  { href: "/campaigns", cn: "营销活动", en: "Campaigns", icon: SendHorizontal },
  { href: "/email", cn: "邮件", en: "Email", icon: Mail },
  { href: "/linkedin", cn: "LinkedIn", en: "LinkedIn", icon: Linkedin },
  { href: "/leads", cn: "智能获客", en: "Lead Gen", icon: Target },
  { href: "/email-templates", cn: "邮件模板", en: "Templates", icon: FileText },
  { href: "/calendar", cn: "活动日历", en: "Calendar", icon: CalendarDays },
  { href: "/llm", cn: "AI 助手", en: "AI Assistant", icon: Bot },

  { href: "/settings", cn: "设置", en: "Settings", icon: Settings },
]

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { username, logout, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Load dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem("darkMode")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored !== null ? stored === "true" : prefersDark
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    if (!isAuthenticated) return
    const loadUnread = async () => {
      try {
        const res = await api.notifications.unreadCount()
        setUnreadCount(res.count)
      } catch (e) {}
    }
    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchResults(null)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K: toggle global search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
        return
      }
      // Escape: close search, notifications, shortcuts panel
      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return }
        if (showNotifications) { setShowNotifications(false); return }
        if (searchOpen) { setSearchOpen(false); setSearchResults(null); return }
        return
      }
      // ?: show shortcuts panel (only when nothing else is open)
      if (e.key === "?" && !searchOpen && !showNotifications && !showShortcuts) {
        e.preventDefault()
        setShowShortcuts(true)
        return
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, showNotifications, showShortcuts])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.search.global(searchQuery)
      setSearchResults(res)
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  async function openNotifications() {
    setShowNotifications(!showNotifications)
    if (!showNotifications) {
      try {
        const res = await api.notifications.list({ limit: 10 })
        setNotifications(res.items)
      } catch (e) {}
    }
  }

  async function markNotifRead(id: string) {
    try {
      await api.notifications.markRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (e) {}
  }

  async function markAllRead() {
    try {
      await api.notifications.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {}
  }


  if (loading) return null
  if (!isAuthenticated) {
    router.push("/login")
    return null
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r border-[#E5E5EA] bg-white flex flex-col shadow-[1px_0_8px_rgba(0,0,0,0.04)] z-10">
        <div className="p-4 flex items-center gap-2 font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          <span>Mercury</span>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {/* Global Search */}
          <div ref={searchRef} className="relative mb-1">
            {searchOpen ? (
              <div className="bg-white border border-[#E5E5EA] rounded-lg shadow-lg p-1.5">
                <div className="flex gap-1">
                  <input
                    autoFocus
                    placeholder="搜索联系人、邮件、活动..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
                    className="flex-1 h-[34px] px-2.5 text-xs border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] placeholder:text-[#86868b]"
                  />
                  <button onClick={handleSearch}
                    className="h-[34px] w-[34px] flex items-center justify-center text-white bg-[#007AFF] rounded-lg border-none cursor-pointer hover:bg-[#0071e3] shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setSearchOpen(false); setSearchResults(null) }}
                    className="h-[34px] w-[34px] flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer bg-transparent hover:bg-[#f5f5f7] shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {searching && <p className="text-[11px] text-[#86868b] px-2 py-1">搜索中...</p>}
                {searchResults && (
                  <div className="mt-1 max-h-[260px] overflow-y-auto">
                    {searchResults.total === 0 ? (
                      <p className="text-[11px] text-[#86868b] p-2 text-center">无结果</p>
                    ) : (
                      <>
                        {searchResults.contacts?.length > 0 && (
                          <div className="mb-1">
                            <p className="text-[10px] font-semibold text-[#86868b] px-2 py-1 uppercase">联系人 ({searchResults.contacts.length})</p>
                            {searchResults.contacts.map((c: any) => (
                              <button key={c.id} onClick={() => { router.push(`/contacts/${c.id}`); setSearchOpen(false) }}
                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-[#f5f5f7] rounded flex items-center gap-2 bg-transparent border-none cursor-pointer transition-colors">
                                <span className="font-medium text-[#1d1d1f]">{c.name}</span>
                                <span className="text-[#86868b] truncate">{c.company || c.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.emails?.length > 0 && (
                          <div className="mb-1">
                            <p className="text-[10px] font-semibold text-[#86868b] px-2 py-1 uppercase">邮件 ({searchResults.emails.length})</p>
                            {searchResults.emails.map((e: any) => (
                              <div key={e.id} className="px-2 py-1 text-xs">
                                <p className="font-medium text-[#1d1d1f] truncate">{e.subject}</p>
                                <p className="text-[#86868b] truncate text-[10px]">{e.snippet}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {searchResults.activities?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#86868b] px-2 py-1 uppercase">活动 ({searchResults.activities.length})</p>
                            {searchResults.activities.map((a: any) => (
                              <div key={a.id} className="px-2 py-1 text-xs">
                                <p className="font-medium text-[#1d1d1f] truncate">{a.type} - {a.description}</p>
                                <p className="text-[#86868b] text-[10px]">{a.contact_name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 h-[34px] px-2.5 text-xs text-[#86868b] bg-[#f5f5f7] border border-[#E5E5EA] rounded-lg cursor-pointer hover:bg-[#ebebed] transition-all">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>搜索联系人、邮件、活动...</span>
              </button>
            )}
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
            <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 h-auto py-2"
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{item.cn}</span>
                  <span className="text-[10px] text-[#86868b] font-normal">{item.en}</span>
                </div>
              </Button>
            )
          })}
        </nav>
        <Separator />
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button onClick={openNotifications}
                className="w-[32px] h-[32px] flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff3b30] text-white text-[9px] font-bold w-[15px] h-[15px] flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute bottom-full mb-2 left-0 w-[300px] bg-white border border-[#E5E5EA] rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5EA]">
                    <span className="text-sm font-medium text-[#1d1d1f]">通知</span>
                    <button onClick={markAllRead}
                      className="text-xs text-[#007AFF] bg-transparent border-none cursor-pointer hover:underline">全部已读</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#86868b] p-3 text-center">暂无通知</p>
                  ) : (
                    <div className="max-h-[280px] overflow-y-auto">
                      {notifications.map((n: any) => (
                        <div key={n.id}
                          onClick={() => { markNotifRead(n.id); if (n.link_url) router.push(n.link_url) }}
                          className={`px-3 py-2.5 text-sm cursor-pointer border-b border-[#f2f2f7] last:border-none hover:bg-[#f9f9fb] ${!n.is_read ? "bg-[rgba(0,122,255,0.03)]" : ""}`}>
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-[#007AFF]" : "bg-transparent"}`} />
                            <div>
                              <p className={`text-sm ${!n.is_read ? "font-medium text-[#1d1d1f]" : "text-[#86868b]"}`}>{n.title}</p>
                              {n.message && <p className="text-xs text-[#86868b] mt-0.5">{n.message}</p>}
                              <p className="text-[10px] text-[#c7c7cc] mt-1">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : ""}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{username}</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className="w-[32px] h-[32px] flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent"
            title={darkMode ? "切换浅色模式" : "切换深色模式"}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowShortcuts(true)}
            className="w-[32px] h-[32px] flex items-center justify-center text-[#86868b] border border-[#E5E5EA] rounded-lg cursor-pointer transition-all hover:bg-[#f5f5f7] bg-transparent"
            title="快捷键">
            <Keyboard className="w-4 h-4" />
          </button>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-[#E5E5EA] flex items-center justify-between px-4 z-20">
        <button onClick={() => setMobileSidebarOpen(true)}
          className="w-8 h-8 flex items-center justify-center text-[#86868b] bg-transparent border-none cursor-pointer">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-[#1d1d1f]">Mercury</span>
        <div className="w-8" />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg pt-4">
            <div className="flex justify-end px-4 mb-2">
              <button onClick={() => setMobileSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#86868b] bg-transparent border-none cursor-pointer hover:bg-[#f5f5f7] rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Re-render sidebar content by copying the navigation */}
            <nav className="px-2 space-y-1">
              {/* Mobile search */}
              <div className="mb-2">
                <button
                  className="w-full flex items-center gap-2 h-[34px] px-2.5 text-xs text-[#86868b] bg-[#f5f5f7] border border-[#E5E5EA] rounded-lg cursor-pointer hover:bg-[#ebebed] transition-all"
                  onClick={() => { setMobileSidebarOpen(false); setSearchOpen(true) }}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>搜索...</span>
                </button>
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setMobileSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 h-[40px] px-3 text-sm rounded-lg transition-all cursor-pointer ${
                      active ? "bg-[#f5f5f7] font-semibold text-[#1d1d1f]" : "text-[#86868b] hover:bg-[#f5f5f7]"
                    } bg-transparent border-none`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.cn}</span>
                  </button>
                )
              })}
              <div className="border-t border-[#E5E5EA] my-2" />
              <button onClick={() => { logout(); setMobileSidebarOpen(false) }}
                className="w-full flex items-center gap-3 h-[40px] px-3 text-sm rounded-lg text-[#86868b] hover:bg-[#f5f5f7] transition-all bg-transparent border-none cursor-pointer">
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto bg-[#f2f2f7] lg:pt-0 pt-12">
        <ErrorBoundary>
          {children}
          <Toaster />
        </ErrorBoundary>
      </main>

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-xl max-w-[400px] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#38383a]">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">快捷键</h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { keys: "Cmd+K", desc: "全局搜索" },
                { keys: "ESC", desc: "关闭面板/弹窗" },
                { keys: "?", desc: "显示快捷键" },
              ].map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between">
                  <span className="text-sm text-[#86868b]">{shortcut.desc}</span>
                  <kbd className="px-2 py-1 text-xs font-medium bg-[#f5f5f7] dark:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] border border-[#E5E5EA] dark:border-[#38383a] rounded-md">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
              <p className="text-xs text-[#86868b] pt-2 border-t border-[#E5E5EA] dark:border-[#38383a]">点击任意处或按 ESC 关闭</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthProvider>
  )
}
