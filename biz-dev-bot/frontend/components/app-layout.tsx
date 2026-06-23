"use client"

import { useAuth, AuthProvider } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useRouter, usePathname } from "next/navigation"
 import { LayoutDashboard, Users, GitBranch, SendHorizontal, Mail, Settings, LogOut, Bot, Linkedin } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
   { href: "/pipelines", label: "Pipelines", icon: GitBranch },
   { href: "/campaigns", label: "Campaigns", icon: SendHorizontal },
 { href: "/email", label: "Email", icon: Mail },
  { href: "/linkedin", label: "LinkedIn", icon: Linkedin },
  { href: "/settings", label: "Settings", icon: Settings },
]

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { username, logout, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (loading) return null
  if (!isAuthenticated) {
    router.push("/login")
    return null
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/20 flex flex-col">
        <div className="p-4 flex items-center gap-2 font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          <span>Biz Dev Bot</span>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </nav>
        <Separator />
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{username}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
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
