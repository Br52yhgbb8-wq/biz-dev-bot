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
   SendHorizontal, Plus, Play, Pause, RotateCcw,
   ExternalLink, Loader2, Calendar
 } from "lucide-react"
 
 const STATUS_COLORS: Record<string, string> = {
   draft: "bg-gray-100 text-gray-700",
   running: "bg-green-100 text-green-700",
   paused: "bg-amber-100 text-amber-700",
   completed: "bg-blue-100 text-blue-700",
 }
 
 function CampaignsPageInner() {
   const [campaigns, setCampaigns] = useState<any[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [showCreate, setShowCreate] = useState(false)
   const [name, setName] = useState("")
   const [error, setError] = useState("")
 
   const load = useCallback(async () => {
     setLoading(true)
     try {
       const res = await api.request<{ items: any[]; total: number }>("/api/campaigns")
       setCampaigns(res.items)
       setTotal(res.total)
     } catch (e) {
       console.error(e)
     } finally {
       setLoading(false)
     }
   }, [])
 
   useEffect(() => { load() }, [load])
 
   async function handleCreate() {
     if (!name.trim()) return
     try {
       await api.request("/api/campaigns", {
         method: "POST",
         body: JSON.stringify({ name, sequence: [] }),
       })
       setShowCreate(false)
       setName("")
       load()
     } catch (e: any) {
       setError(e.message)
     }
   }
 
   async function handleAction(id: string, action: string) {
     try {
       await api.request(`/api/campaigns/${id}/${action}`, { method: "POST" })
       load()
     } catch (e: any) {
       setError(e.message)
     }
   }
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold">Campaigns</h1>
         <Button onClick={() => setShowCreate(true)}>
           <Plus className="h-4 w-4 mr-2" /> New Campaign
         </Button>
       </div>
 
       {error && (
         <Card className="border-destructive/50">
           <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
         </Card>
       )}
 
       {showCreate && (
         <Card>
           <CardHeader><CardTitle>New Campaign</CardTitle></CardHeader>
           <CardContent>
             <div className="flex gap-2">
               <Input
                 placeholder="Campaign name"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleCreate()}
               />
               <Button onClick={handleCreate}>Create</Button>
               <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
             </div>
           </CardContent>
         </Card>
       )}
 
       <Card>
         <CardContent className="p-0">
           {loading ? (
             <div className="p-6 text-center text-muted-foreground">Loading...</div>
           ) : campaigns.length === 0 ? (
             <div className="p-6 text-center text-muted-foreground">No campaigns yet</div>
           ) : (
             <div className="divide-y">
               <div className="grid grid-cols-6 gap-4 px-6 py-3 text-sm font-medium text-muted-foreground bg-muted/30">
                 <div className="col-span-2">Name</div>
                 <div>Status</div>
                 <div>Created</div>
                 <div>Steps</div>
                 <div>Actions</div>
               </div>
               {campaigns.map((c: any) => (
                 <div key={c.id} className="grid grid-cols-6 gap-4 px-6 py-3 text-sm items-center hover:bg-muted/20">
                   <div className="col-span-2 font-medium truncate">{c.name}</div>
                   <div>
                     <Badge className={`${STATUS_COLORS[c.status] || ""} border-0`}>
                       {c.status}
                     </Badge>
                   </div>
                   <div className="text-muted-foreground">
                     {new Date(c.created_at).toLocaleDateString("zh-CN")}
                   </div>
                   <div className="text-muted-foreground">
                     {(c.sequence || []).length}
                   </div>
                   <div className="flex gap-1">
                     {c.status === "draft" && (
                       <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleAction(c.id, "start")}>
                         <Play className="h-3 w-3 mr-1" /> Start
                       </Button>
                     )}
                     {c.status === "running" && (
                       <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleAction(c.id, "pause")}>
                         <Pause className="h-3 w-3 mr-1" /> Pause
                       </Button>
                     )}
                     {c.status === "paused" && (
                       <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleAction(c.id, "resume")}>
                         <RotateCcw className="h-3 w-3 mr-1" /> Resume
                       </Button>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
       <p className="text-sm text-muted-foreground">{total} campaign{total !== 1 ? "s" : ""}</p>
     </div>
   )
 }
 
 export default function CampaignsPage() {
   return (
     <AppLayout>
       <CampaignsPageInner />
     </AppLayout>
   )
 }
