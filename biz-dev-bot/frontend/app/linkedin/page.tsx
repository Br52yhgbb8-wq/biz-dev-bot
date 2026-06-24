"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Linkedin, Search as SearchIcon, Download, Power, PowerOff, 
  ExternalLink, Loader2, UserPlus, Eye 
} from "lucide-react"

interface SearchResult {
  name: string
  title: string
  location: string
  profile_url: string
  img_url: string
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
      setMessage(res.message || "Browser launched")
      await loadStatus()
    } catch (e: any) {
      setError(e.message || "Failed to connect")
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setError("")
    setMessage("")
    try {
      await api.request<any>("/api/linkedin/disconnect", { method: "POST" })
      setMessage("Browser closed")
      await loadStatus()
    } catch (e: any) {
      setError(e.message || "Failed to disconnect")
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
      setMessage(`Found ${data.length} results`)
    } catch (e: any) {
      setError(e.message || "Search failed")
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
        method: "POST",
        body: JSON.stringify({ results }),
      })
      setMessage(`Imported ${data.imported}, skipped ${data.skipped} (${data.total} total)`)
      setResults([])
    } catch (e: any) {
      setError(e.message || "Import failed")
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LinkedIn Lead Research</h1>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${status?.browser_running ? "bg-green-500" : "bg-gray-300"}`} />
              <div>
                <p className="text-sm font-medium">
                  Browser: {status?.browser_running ? "Running" : "Not running"}
                </p>
                {status?.browser_running && (
                  <p className="text-xs text-muted-foreground">
                    LinkedIn: {status?.logged_in ? "Logged in" : "Not logged in"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {status?.browser_running ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <PowerOff className="h-3 w-3 mr-1" /> Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Power className="h-3 w-3 mr-1" />}
                  {connecting ? "Starting..." : "Connect"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Card>
          <CardContent className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border-green-200">
            {message}
          </CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border-destructive/20">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Search Form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Search LinkedIn</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Input
              placeholder="Keywords (e.g. CTO, VP Engineering, AI startup)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Location (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-20"
                type="number"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={!keywords.trim() || searching || !status?.browser_running}>
                {searching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SearchIcon className="h-4 w-4 mr-2" />
                )}
                {searching ? "Searching..." : "Search"}
              </Button>
              {results.length > 0 && (
                <Button variant="secondary" onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {importing ? "Importing..." : `Import ${results.length} to CRM`}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Results ({results.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {results.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.title}</p>
                    {r.location && <p className="text-xs text-muted-foreground">{r.location}</p>}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    {r.profile_url && (
                      <a href={r.profile_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Guide */}
      <Card>
        <CardHeader><CardTitle className="text-base">How It Works</CardTitle></CardHeader>
        <CardContent>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal ml-4">
            <li>Click <strong>Connect</strong> &mdash; a browser window opens to LinkedIn</li>
            <li>Log in to LinkedIn in that window (first time only)</li>
            <li>Enter search keywords (e.g. &quot;CTO Singapore AI&quot;)</li>
            <li>Review results and click <strong>Import to CRM</strong></li>
            <li>Contacts appear in the <strong>Contacts</strong> page with source=&quot;linkedin&quot;</li>
          </ol>
        </CardContent>
      </Card>
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
