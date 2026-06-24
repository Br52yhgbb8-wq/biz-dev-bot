"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Building2, Briefcase, Mail, Phone, Linkedin,
  Edit2, Trash2, Plus, Clock, MessageSquare, PhoneCall,
  Calendar, UserPlus, Activity as ActivityIcon, X
} from "lucide-react"

const ACTIVITY_ICONS: Record<string, any> = {
  email: Mail,
  call: PhoneCall,
  meeting: Calendar,
  note: MessageSquare,
  linkedin: UserPlus,
}

const ACTIVITY_LABELS: Record<string, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  note: "Note",
  linkedin: "LinkedIn",
}

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  source: string
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

interface Activity {
  id: string
  contact_id: string
  pipeline_id: string | null
  type: string
  description: string | null
  outcome: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_by: string | null
  meta: any | null
  created_at: string
  updated_at: string
}

function ContactDetailInner() {
  const params = useParams()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editCompany, setEditCompany] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // Activity form
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [actType, setActType] = useState("note")
  const [actDescription, setActDescription] = useState("")
  const [actOutcome, setActOutcome] = useState("")

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      api.contacts.get(id),
      api.activities.listByContact(id, { limit: 20 }),
    ]).then(([c, a]) => {
      setContact(c)
      setActivities(a.items)
      setActivityTotal(a.total)
      setEditName(c.name)
      setEditCompany(c.company || "")
      setEditTitle(c.title || "")
      setEditTags((c.tags || []).join(", "))
      setEditNotes(c.notes || "")
    }).catch(() => router.push("/contacts")).finally(() => setLoading(false))
  }, [params.id, router])

  async function handleSave() {
    if (!contact) return
    const tags = editTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    await api.contacts.update(contact.id, {
      name: editName,
      company: editCompany || null,
      title: editTitle || null,
      tags,
      notes: editNotes || null,
    })
    setContact({ ...contact, name: editName, company: editCompany, title: editTitle, tags, notes: editNotes })
    setEditing(false)
  }

  async function handleDelete() {
    if (!contact || !confirm("Delete this contact?")) return
    await api.contacts.delete(contact.id)
    router.push("/contacts")
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!contact || !actDescription.trim()) return
    const activity = await api.activities.create({
      contact_id: contact.id,
      type: actType,
      description: actDescription,
      outcome: actOutcome || undefined,
    })
    setActivities([activity, ...activities])
    setActivityTotal(activityTotal + 1)
    setShowActivityForm(false)
    setActType("note")
    setActDescription("")
    setActOutcome("")
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
  )
  if (!contact) return null

  return (
    <div className="space-y-4 max-w-3xl">
      <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </Button>

      {/* Contact Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            {editing ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" />
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (comma separated)" />
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            ) : (
              <>
                <CardTitle className="text-xl">{contact.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {[contact.company, contact.title].filter(Boolean).join(" · ") || "No details"}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-1">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contact.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{contact.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{contact.company || "No company"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{contact.title || "No title"}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              {contact.linkedin_url ? (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {contact.linkedin_url}
                </a>
              ) : (
                <span className="text-muted-foreground">No LinkedIn</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap pt-1">
            <span className="text-xs text-muted-foreground mr-1">Source: {contact.source}</span>
            {contact.tags?.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
          {contact.notes && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Activity Timeline</CardTitle>
          </div>
          <Button size="sm" onClick={() => setShowActivityForm(!showActivityForm)}>
            {showActivityForm ? (
              <X className="h-3 w-3 mr-1" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {showActivityForm ? "Cancel" : "Add Activity"}
          </Button>
        </CardHeader>
        <Separator />

        {/* Add Activity Form */}
        {showActivityForm && (
          <CardContent className="pt-4">
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div className="flex gap-2">
                {["note", "email", "call", "meeting", "linkedin"].map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={actType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActType(t)}
                    className="capitalize"
                  >
                    {ACTIVITY_LABELS[t] || t}
                  </Button>
                ))}
              </div>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Describe the activity..."
                value={actDescription}
                onChange={(e) => setActDescription(e.target.value)}
                required
              />
              <Input
                placeholder="Outcome (optional)"
                value={actOutcome}
                onChange={(e) => setActOutcome(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={!actDescription.trim()}>Add</Button>
              </div>
            </form>
          </CardContent>
        )}

        {/* Activity List */}
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No activities recorded yet
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] || ActivityIcon
                return (
                  <div key={a.id} className="px-4 py-3 hover:bg-muted/20">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {ACTIVITY_LABELS[a.type] || a.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString("zh-CN", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        {a.description && (
                          <p className="text-sm mt-1 whitespace-pre-wrap">{a.description}</p>
                        )}
                        {a.outcome && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Outcome: {a.outcome}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {activityTotal > activities.length && (
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Show all {activityTotal} activities
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ContactDetailPage() {
  return (
    <AppLayout>
      <ContactDetailInner />
    </AppLayout>
  )
}
