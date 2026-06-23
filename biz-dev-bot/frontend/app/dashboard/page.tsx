"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users, GitBranch, DollarSign, TrendingUp, Plus, ArrowRight,
  BarChart3, Activity, PieChart, Send
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart as RePieChart,
  Pie, Cell, Legend
} from "recharts"

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
}

const STAGE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"]

function DashboardPageInner() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.dashboard.overview(),
      api.contacts.list({ limit: 5 }),
    ]).then(([d, c]) => {
      setData(d)
      setContacts(c.items)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>
    )
  }

  const pipeline = data?.pipeline || { total_deals: 0, total_value: 0, win_rate: 0, stages: [] }
  const activityTrend = data?.activity_trend || { trend: [], total: 0 }
  const campaign = data?.campaign || { total: 0, running: 0, completed: 0, draft: 0, total_sent: 0 }

  // Chart data
  const stageChartData = pipeline.stages.map((s: any) => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    count: s.count,
    value: s.total_value,
  }))

  const pieChartData = stageChartData.map((s: any) => ({
    name: s.name,
    value: s.count,
  }))

  const trendChartData = activityTrend.trend.map((t: any) => ({
    date: t.date.slice(5),
    count: t.count,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => router.push("/pipelines")}>
          <Plus className="h-4 w-4 mr-2" /> New Deal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pipeline.total_deals}</p>
              <p className="text-xs text-muted-foreground">Total Deals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">¥{pipeline.total_value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pipeline Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pipeline.win_rate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activityTrend.total}</p>
              <p className="text-xs text-muted-foreground">Activities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline by Stage Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deals Distribution Pie Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Deal Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {pieChartData.some((d: any) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieChartData.map((_: any, i: number) => (
                        <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No deal data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trend Line Chart */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Activity Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Campaign Stats + Recent Contacts + Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {/* Campaign Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{campaign.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Running</span>
                <span className="font-medium text-green-600">{campaign.running}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{campaign.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Emails Sent</span>
                <span className="font-medium">{campaign.total_sent}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Contacts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/contacts")}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet</p>
              ) : (
                contacts.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[c.company, c.title].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{c.source}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/contacts")}>
                <Users className="h-4 w-4 mr-2" /> Manage Contacts
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/pipelines")}>
                <GitBranch className="h-4 w-4 mr-2" /> View Pipeline
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/campaigns")}>
                <Send className="h-4 w-4 mr-2" /> Campaigns
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/email")}>
                <Activity className="h-4 w-4 mr-2" /> Email Inbox
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardPageInner />
    </AppLayout>
  )
}
