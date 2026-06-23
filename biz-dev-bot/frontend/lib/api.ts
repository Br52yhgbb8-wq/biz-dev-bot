const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
    register: (data: { username: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { username: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
    create: (data: any) =>
      request<any>("/api/activities", { method: "POST", body: JSON.stringify(data) }),
    getTypes: () => request<{ key: string; label: string }[]>("/api/activities/types"),
    update: (id: string, data: any) =>
      request<any>(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/activities/${id}`, { method: "DELETE" }),
  },
  request: request,
}
