"use client"

import { useState, useEffect } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, CheckCircle2, XCircle, ExternalLink } from "lucide-react"

function SettingsPageInner() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request<any>("/api/email/status")
      .then(setStatus)
      .catch(() => setStatus({ connected: false, credentials_configured: false }))
      .finally(() => setLoading(false))
  }, [])

  async function connectGmail() {
    try {
      const res = await api.request<any>("/api/email/auth-url?redirect_uri=" + encodeURIComponent(window.location.origin + "/api/email/callback"))
      window.open(res.auth_url, "_blank")
    } catch (e: any) {
      alert(e.message || "Failed to get auth URL")
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Gmail Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Gmail Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Connection Status</p>
                  <p className="text-xs text-muted-foreground">
                    {status?.connected
                      ? `Connected as ${status.email || "unknown"}`
                      : "Not connected"}
                  </p>
                </div>
                <Badge variant={status?.connected ? "default" : "secondary"}>
                  {status?.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Credentials</p>
                <div className="flex items-center gap-2">
                  {status?.credentials_configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">
                    {status?.credentials_configured
                      ? "gmail_credentials.json found"
                      : "gmail_credentials.json not found"}
                  </span>
                </div>
                {!status?.credentials_configured && (
                  <ol className="text-xs text-muted-foreground space-y-1 mt-2 ml-4 list-decimal">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console <ExternalLink className="h-3 w-3 inline" /></a></li>
                    <li>Create a project and enable Gmail API</li>
                    <li>Create OAuth 2.0 credentials (Desktop app type)</li>
                    <li>Add redirect URI: http://localhost:8000/api/email/callback</li>
                    <li>Download as gmail_credentials.json</li>
                    <li>Place it in the <code>backend/</code> directory</li>
                  </ol>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={connectGmail} disabled={!status?.credentials_configured}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {status?.connected ? "Reconnect Gmail" : "Connect Gmail"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
