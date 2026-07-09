import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  auth: {
    login: (data: { username: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    register: (data: { username: string; password: string; invite_code?: string }) =>
      request<{ access_token: string; token_type: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    profile: () => request<{ username: string; role: string }>("/api/auth/profile"),
  },
  search: {
    global: (q: string, limit = 5) =>
      request<{ contacts: any[]; emails: any[]; activities: any[]; total: number }>(
        `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
      ),
  },
  notifications: {
    list: (params?: { unread_only?: boolean; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.unread_only) qs.set("unread_only", "true")
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/notifications${q ? `?${q}` : ""}`)
    },
    unreadCount: () => request<{ count: number }>("/api/notifications/unread-count"),
    markRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => request<any>("/api/notifications/mark-all-read", { method: "POST" }),
  },
  attachments: {
    upload: (file: File, contact_id?: string) => {
      const formData = new FormData()
      formData.append("file", file)
      const params = new URLSearchParams()
      if (contact_id) params.set("contact_id", contact_id)
      const q = params.toString()
      const token = localStorage.getItem("token")
      return fetch(`${API_BASE}/api/attachments/upload${q ? `?${q}` : ""}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }).then((r) => r.json())
    },
    listByContact: (contact_id: string) =>
      request<any[]>(`/api/attachments/by-contact/${contact_id}`),
    delete: (id: string) =>
      request<any>(`/api/attachments/${id}`, { method: "DELETE" }),
  },
  contacts: {
    list: (params?: { search?: string; tag?: string; source?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set("search", params.search)
      if (params?.tag) qs.set("tag", params.tag)
      if (params?.source) qs.set("source", params.source)
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/contacts${q ? `?${q}` : ""}`)
    },
    get: (id: string) => request<any>(`/api/contacts/${id}`),
    create: (data: any) =>
      request<any>("/api/contacts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/contacts/${id}`, { method: "DELETE" }),
    importCsv: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const token = localStorage.getItem("token")
      return fetch(`${API_BASE}/api/contacts/import-csv`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }).then((r) => r.json())
    },
    exportCsvUrl: () => `${API_BASE}/api/contacts/export-csv`,
    batchTag: (data: { contact_ids: string[]; tags: string[]; action: string }) =>
      request<any>("/api/contacts/batch/tag", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    batchDelete: (contact_ids: string[]) =>
      request<any>("/api/contacts/batch/delete", {
        method: "POST",
        body: JSON.stringify({ contact_ids }),
      }),
    batchExportCsv: (contact_ids: string[]) => {
      const token = localStorage.getItem("token")
      return fetch(`${API_BASE}/api/contacts/batch/export-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contact_ids }),
      }).then((r) => {
        if (!r.ok) throw new Error("Export failed")
        return r.blob()
      })
    },
  },
  pipelines: {
    list: (params?: { stage?: string; contact_id?: string }) => {
      const qs = new URLSearchParams()
      if (params?.stage) qs.set("stage", params.stage)
      if (params?.contact_id) qs.set("contact_id", params.contact_id)
      const q = qs.toString()
      return request<any[]>(`/api/pipelines${q ? `?${q}` : ""}`)
    },
    get: (id: string) => request<any>(`/api/pipelines/${id}`),
    create: (data: any) =>
      request<any>("/api/pipelines", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/pipelines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateStage: (id: string, stage: string) =>
      request<any>(`/api/pipelines/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage }),
      }),
    delete: (id: string) =>
      request<void>(`/api/pipelines/${id}`, { method: "DELETE" }),
    exportCsvUrl: () => `${API_BASE}/api/pipelines/export-csv`,
  },
  dashboard: {
    overview: () => request<any>("/api/dashboard/full"),
    pipelineOverview: () => request<any>("/api/dashboard/pipeline-overview"),
    activityTrend: (days = 30) => request<any>(`/api/dashboard/activity-trend?days=${days}`),
    campaignStats: () => request<any>("/api/dashboard/campaign-stats"),
  },
  activities: {
    listByContact: (contactId: string, params?: { skip?: number; limit?: number; activity_type?: string }) => {
      const qs = new URLSearchParams()
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      if (params?.activity_type) qs.set("activity_type", params.activity_type)
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/contacts/${contactId}/activities${q ? `?${q}` : ""}`)
    },
    list: (params?: { activity_type?: string; days?: number; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.activity_type) qs.set("activity_type", params.activity_type)
      if (params?.days) qs.set("days", String(params.days))
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/activities${q ? `?${q}` : ""}`)
    },
    calendar: (year: number, month: number, activity_type?: string) => {
      let path = `/api/activities/calendar?year=${year}&month=${month}`
      if (activity_type) path += `&activity_type=${activity_type}`
      return request<any[]>(path)
    },
    create: (data: any) =>
      request<any>("/api/activities", { method: "POST", body: JSON.stringify(data) }),
    getTypes: () => request<{ key: string; label: string }[]>("/api/activities/types"),
    update: (id: string, data: any) =>
      request<any>(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/activities/${id}`, { method: "DELETE" }),
  },
  emailTemplates: {
    list: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/email-templates${q ? `?${q}` : ""}`)
    },
    get: (id: string) => request<any>(`/api/email-templates/${id}`),
    create: (data: any) =>
      request<any>("/api/email-templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/email-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/email-templates/${id}`, { method: "DELETE" }),
    render: (template_id: string, variables: Record<string, string>) =>
      request<any>("/api/email-templates/render", {
        method: "POST",
        body: JSON.stringify({ template_id, variables }),
      }),
  },

  uniepu: {
    inquiry: (data: { name: string; email: string; company?: string; phone?: string; country?: string; interest?: string; message?: string }) =>
      request<{ success: boolean; message: string; lead_id: string }>("/api/uniepu/inquiry", { method: "POST", body: JSON.stringify(data) }),
    hermesChat: (data: { message: string; session_id?: string }) =>
      request<{ reply: string; session_id: string }>("/api/uniepu/hermes-chat", { method: "POST", body: JSON.stringify(data) }),
  },
  llm: {
    chat: (data: { message: string; conversation_id?: string; system_prompt?: string; temperature?: number }) =>
      request<{ conversation_id: string; reply: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>(
        "/api/llm/chat", { method: "POST", body: JSON.stringify(data) }
      ),
    conversations: (limit = 20, offset = 0) =>
      request<{ conversations: any[]; total: number }>(`/api/llm/conversations?limit=${limit}&offset=${offset}`),
    deleteConversation: (id: string) =>
      request<void>(`/api/llm/conversations/${id}`, { method: "DELETE" }),
    generateEmail: (data: { contact_name?: string; company?: string; product?: string; goal?: string; tone?: string; additional_context?: string }) =>
      request<{ conversation_id: string; reply: string; usage: any }>("/api/llm/generate/email", { method: "POST", body: JSON.stringify(data) }),
    generateLinkedIn: (data: { name?: string; company?: string; goal?: string; tone?: string; additional_context?: string }) =>
      request<{ conversation_id: string; reply: string; usage: any }>("/api/llm/generate/linkedin", { method: "POST", body: JSON.stringify(data) }),
    status: () =>
      request<{ enabled: boolean; configured: boolean; api_key_valid: boolean; models: string[]; default_model: string; error?: string }>("/api/llm/status"),
  },
  leads: {
    stats: () =>
      request<{ total_leads: number; by_status: Record<string, number>; avg_score: number; high_value: number; contacted: number; converted: number; discovery_today: number; daily_quota_remaining: number; enabled: boolean; model: string }>("/api/leads/stats"),
    list: (params?: { status?: string; source?: string; min_score?: number; search?: string; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set("status", params.status)
      if (params?.source) qs.set("source", params.source)
      if (params?.min_score) qs.set("min_score", String(params.min_score))
      if (params?.search) qs.set("search", params.search)
      if (params?.skip) qs.set("skip", String(params.skip))
      if (params?.limit) qs.set("limit", String(params.limit))
      const q = qs.toString()
      return request<{ items: any[]; total: number }>(`/api/leads${q ? `?${q}` : ""}`)
    },
    get: (id: string) => request<any>(`/api/leads/${id}`),
    create: (data: any) => request<any>("/api/leads", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/leads/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/leads/${id}`, { method: "DELETE" }),
    discover: (data: { industry: string; region?: string; criteria?: string; count?: number; auto_enrich?: boolean }) =>
      request<{ leads: any[]; total_discovered: number; conversation?: string }>("/api/leads/discover", { method: "POST", body: JSON.stringify(data) }),
    score: (lead_ids: string[]) =>
      request<{ results: any[] }>("/api/leads/score", { method: "POST", body: JSON.stringify({ lead_ids }) }),
    enrich: (lead_id: string) =>
      request<Record<string, any>>("/api/leads/enrich", { method: "POST", body: JSON.stringify({ lead_id }) }),
    outreach: (data: { lead_id: string; channel?: string; tone?: string; context?: string }) =>
      request<Record<string, any>>("/api/leads/outreach", { method: "POST", body: JSON.stringify(data) }),
    convert: (data: { lead_id: string; deal_value?: number; pipeline_stage?: string }) =>
      request<{ contact_id: string; pipeline_id: string; name: string; company?: string }>("/api/leads/convert", { method: "POST", body: JSON.stringify(data) }),
    bulkStatus: (data: { lead_ids: string[]; status: string }) =>
      request<{ success: boolean; updated: number; total: number }>("/api/leads/bulk-status", { method: "POST", body: JSON.stringify(data) }),
  },
  agent: {
    stats: () =>
      request<{ agent_enabled: boolean; model: string; total_leads: number; qualified: number; contacted: number; dismissed: number; pending_analysis: number }>("/api/leads/agent/stats"),
    run: () =>
      request<{ pipeline_id: string; step_1_eyes: any; step_2_brain: any; step_3_mouth: any; step_4_hands: any; status: string }>("/api/leads/agent/run", { method: "POST" }),
    eyes: (data: { keywords?: string; region?: string; count?: number }) =>
      request<{ discovered: number; leads: any[] }>("/api/leads/agent/eyes?" + new URLSearchParams(data as any).toString(), { method: "POST" }),
    brain: (limit = 10) =>
      request<{ analyzed: number; results: any[] }>("/api/leads/agent/brain?limit=" + limit, { method: "POST" }),
    mouth: (params?: { lead_ids?: string[]; channel?: string; tone?: string }) => {
      const qs = new URLSearchParams()
      if (params?.channel) qs.set("channel", params.channel)
      if (params?.tone) qs.set("tone", params.tone)
      if (params?.lead_ids) params.lead_ids.forEach(id => qs.append("lead_ids", id))
      return request<any>("/api/leads/agent/mouth?" + qs.toString(), { method: "POST" })
    },
    hands: (params?: { lead_ids?: string[]; channel?: string }) => {
      const qs = new URLSearchParams()
      if (params?.channel) qs.set("channel", params.channel)
      if (params?.lead_ids) params.lead_ids.forEach(id => qs.append("lead_ids", id))
      return request<any>("/api/leads/agent/hands?" + qs.toString(), { method: "POST" })
    },
  },
  request: request,
}

export interface AuthState {
  token: string | null
  username: string | null
  isAuthenticated: boolean
}

export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, username: null, isAuthenticated: false }
  }
  const token = localStorage.getItem("token")
  const username = localStorage.getItem("username")
  return {
    token,
    username,
    isAuthenticated: !!token,
  }
}

export function storeAuth(token: string, username: string) {
  localStorage.setItem("token", token)
  localStorage.setItem("username", username)
}

export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
}

export async function login(username: string, password: string) {
  const res = await api.auth.login({ username, password })
  storeAuth(res.access_token, username)
  return res
}

export async function register(username: string, password: string) {
  const res = await api.auth.register({ username, password })
  storeAuth(res.access_token, username)
  return res
}
