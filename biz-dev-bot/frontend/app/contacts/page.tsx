"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Mail, Building2, Briefcase, ChevronLeft, ChevronRight, X, Filter } from "lucide-react"

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  email: string | null
  source: string
  tags: string[]
  created_at: string
}

const SOURCE_OPTIONS = ["manual", "linkedin", "import"]
const PAGE_SIZE = 20

function ContactsPageInner() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [tag, setTag] = useState("")
  const [source, setSource] = useState("")
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newTags, setNewTags] = useState("")

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

  const load = useCallback(async (params?: {
    search?: string; tag?: string; source?: string; skip?: number
  }) => {
    setLoading(true)
    try {
      const res = await api.contacts.list({
        search: params?.search || undefined,
        tag: params?.tag || undefined,
        source: params?.source || undefined,
        skip: params?.skip ?? skip,
        limit: PAGE_SIZE,
      })
      setContacts(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => { load() }, [load])

  function handleSearch() {
    setSkip(0)
    load({ search, tag, source, skip: 0 })
  }

  function handleClearFilters() {
    setSearch("")
    setTag("")
    setSource("")
    setSkip(0)
    load({ search: "", tag: "", source: "", skip: 0 })
  }

  function handlePageChange(newSkip: number) {
    setSkip(newSkip)
    load({ search, tag, source, skip: newSkip })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const tags = newTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    try {
      await api.contacts.create({
        name: newName,
        company: newCompany || undefined,
        title: newTitle || undefined,
        email: newEmail || undefined,
        tags,
      })
      setShowCreate(false)
      setNewName("")
      setNewCompany("")
      setNewTitle("")
      setNewEmail("")
      setNewTags("")
      setSkip(0)
      load({ skip: 0 })
    } catch (e) {
      console.error(e)
    }
  }

  const hasFilters = search || tag || source

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasFilters ? "border-primary text-primary" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasFilters && <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs">!</Badge>}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>Search</Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tag</label>
                <Input
                  placeholder="Filter by tag..."
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-40 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">All sources</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9">
                  <X className="h-3 w-3 mr-1" /> Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Input placeholder="Name *" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Input placeholder="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Create</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {hasFilters ? "No contacts match your filters" : "No contacts yet"}
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-medium text-muted-foreground bg-muted/30">
                <div>Name</div>
                <div>Company</div>
                <div>Title</div>
                <div>Contact</div>
                <div>Tags</div>
              </div>
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-5 gap-4 px-6 py-3 text-sm hover:bg-muted/20 cursor-pointer items-center"
                  onClick={() => router.push(`/contacts/${c.id}`)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {c.company || "-"}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> {c.title || "-"}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" /> {c.email || "-"}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {c.tags?.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                    {(!c.tags || c.tags.length === 0) && <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(skip + 1)}-{Math.min(skip + PAGE_SIZE, total)} of {total} contact{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={skip === 0}
              onClick={() => handlePageChange(skip - PAGE_SIZE)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => handlePageChange(skip + PAGE_SIZE)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {total <= PAGE_SIZE && total > 0 && (
        <p className="text-sm text-muted-foreground">{total} contact{total !== 1 ? "s" : ""}</p>
      )}
    </div>
  )
}

export default function ContactsPage() {
  return (
    <AppLayout>
      <ContactsPageInner />
    </AppLayout>
  )
}
