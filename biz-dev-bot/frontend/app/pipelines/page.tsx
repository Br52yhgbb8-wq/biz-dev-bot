"use client"

import { useState, useEffect, useCallback } from "react"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, ArrowRight, DollarSign, Target } from "lucide-react"

const STAGES = [
  { key: "discovery", label: "Discovery", color: "bg-blue-100 text-blue-800" },
  { key: "proposal", label: "Proposal", color: "bg-amber-100 text-amber-800" },
  { key: "negotiation", label: "Negotiation", color: "bg-purple-100 text-purple-800" },
  { key: "closed_won", label: "Closed Won", color: "bg-green-100 text-green-800" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-100 text-red-800" },
]

interface Pipeline {
  id: string
  contact_id: string
  stage: string
  deal_value: string | null
  probability: number | null
  expected_close_date: string | null
  owner_id: string | null
  created_at: string
}

function PipelinesPageInner() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState("")
  const [dealValue, setDealValue] = useState("")
  const [probability, setProbability] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.pipelines.list()
      setPipelines(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Load contacts for the create dialog
  useEffect(() => {
    api.contacts.list({ limit: 100 }).then((r) => setContacts(r.items)).catch(() => {})
  }, [])

  async function handleCreate() {
    if (!selectedContact) return
    await api.pipelines.create({
      contact_id: selectedContact,
      deal_value: dealValue || null,
      probability: probability ? parseInt(probability) : null,
    })
    setShowCreate(false)
    setSelectedContact("")
    setDealValue("")
    setProbability("")
    load()
  }

  async function advanceStage(pipelineId: string, currentStage: string) {
    const stageOrder = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"]
    const idx = stageOrder.indexOf(currentStage)
    if (idx < 0 || idx >= stageOrder.length - 1) return
    await api.pipelines.updateStage(pipelineId, stageOrder[idx + 1])
    load()
  }

  const grouped = STAGES.map((s) => ({
    ...s,
    items: pipelines.filter((p) => p.stage === s.key),
    total: pipelines.filter((p) => p.stage === s.key).reduce(
      (sum, p) => sum + (parseFloat(p.deal_value || "0") || 0), 0
    ),
  }))

  function getContactName(contactId: string): string {
    const c = contacts.find((c) => c.id === contactId)
    return c?.name || contactId.slice(0, 8)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Deal
        </Button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Deal</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Input placeholder="Deal value (¥)" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
              <Input placeholder="Probability (%)" value={probability} onChange={(e) => setProbability(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Create</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Columns */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading pipeline...</div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {grouped.map((stage) => (
            <div key={stage.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={`${stage.color} border-0`}>{stage.label}</Badge>
                <span className="text-xs text-muted-foreground">{stage.items.length}</span>
              </div>
              {stage.items.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  No deals
                </div>
              ) : (
                stage.items.map((p) => (
                  <Card key={p.id} className="shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm truncate">{getContactName(p.contact_id)}</p>
                      {p.deal_value && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" /> ¥{parseFloat(p.deal_value).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.probability != null && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" /> {p.probability}%
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("zh-CN")}
                        </span>
                        {stage.key !== "closed_won" && stage.key !== "closed_lost" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => advanceStage(p.id, p.stage)}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-4 text-center text-sm">
            {grouped.map((s) => (
              <div key={s.key}>
                <p className="text-muted-foreground">{s.label}</p>
                <p className="font-semibold">¥{s.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PipelinesPage() {
  return (
    <AppLayout>
      <PipelinesPageInner />
    </AppLayout>
  )
}
