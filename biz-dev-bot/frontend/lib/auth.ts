import { api } from "./api"

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
