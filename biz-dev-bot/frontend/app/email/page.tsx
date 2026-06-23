"use client"

import { useState, useEffect } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Search, Send, RefreshCw, Paperclip } from "lucide-react"

function EmailPageInner() {
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  async function loadThreads() {
    setLoading(true)
    setError("")
    try {
      const data = await api.request<any[]>("/api/email/threads")
      setThreads(data)
    } catch (e: any) {
      if (e.message?.includes("Not authenticated")) {
        setError("Gmail not connected. Go to Settings to configure.")
      } else {
        setError(e.message || "Failed to load emails")
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
      setShowCompose(false)
      setTo("")
      setSubject("")
      setBody("")
    } catch (e: any) {
      alert(e.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadThreads} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCompose(true)}>
            <Send className="h-4 w-4 mr-2" /> Compose
          </Button>
        </div>
      </div>

      {/* Compose Dialog */}
      {showCompose && (
        <Card>
          <CardHeader><CardTitle>New Message</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-3">
              <Input
                placeholder="To (comma separated)"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending..." : "Send"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Thread List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading inbox...</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No emails yet</div>
          ) : (
            <div className="divide-y">
              {threads.map((t: any) => (
                <div key={t.id} className="px-4 py-3 hover:bg-muted/30 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${!t.is_read ? "text-primary" : ""}`}>
                      {t.subject}
                    </p>
                    <span className="text-xs text-muted-foreground">{t.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.from_}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{t.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
